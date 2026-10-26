---
{
  "title": "一致性哈希：让扩缩容只影响部分键",
  "sidebar": {
    "order": 43
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/work-in-progress/mapreduce/",
    "label": "MapReduce：按键组织分布式批处理"
  },
  "next": {
    "link": "/system-design/work-in-progress/scatter-gather/",
    "label": "Scatter-gather：并行请求，再按规则汇总"
  }
}
---
> **本站补充**：原仓库将本主题列为待完善。本节的说明、示例和取舍由本站整理，不属于原仓库译文。

一致性哈希用来决定“一个键应该由哪个节点负责”，并尽量减少节点增减时的重新映射。常见做法是把键和节点映射到同一个哈希环上，让键归属于顺时针遇到的第一个节点。新增节点只接管环上的部分区间，不必改变所有键的归属。

这里的“一致性”指映射在成员变化时保持稳定，**不代表副本数据具有强一致性**。数据迁移、复制、冲突处理和故障恢复仍需另外设计。这个区分可以从 [Karger 等人的一致性哈希论文](https://www.cs.princeton.edu/courses/archive/fall07/cos518/papers/chash.pdf) 与 [Dynamo 的分区和复制设计](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) 中看到。

## 例子：新增一个缓存节点

先看普通取模：节点数为 `N` 时，使用 `hash(key) % N`。节点数从 3 变成 4，即使键和哈希函数不变，许多余数也会改变，因此大量缓存请求会被送到尚未持有数据的节点。

为便于手算，下面假设哈希环只有 `0～99` 共 100 个位置。真实系统使用更大的哈希空间；这些坐标是教学设定，并非测量结果。

初始节点位置：A 在 10，B 在 40，C 在 80。规则是寻找位置大于或等于键位置的第一个节点；超过 80 后绕回 A。

| 键的哈希位置 | 初始归属 | 增加 D@60 后 | 是否改变 |
| --- | --- | --- | --- |
| 5 | A | A | 否 |
| 25 | B | B | 否 |
| 50 | C | D | 是 |
| 75 | C | C | 否 |
| 95 | A | A | 否 |

D 加入后只接管 `(40, 60]`，这段原来由 C 负责。C 仍然负责 `(60, 80]`；其他节点的区间不变。删除 D 时，它负责的区间交回顺时针下一个节点 C。

这个固定示例中 D 接管 20% 的哈希空间，并非 25%。常说的“加入第 `N+1` 个等容量节点，平均约迁移 `1/(N+1)` 的键”需要均匀哈希和足够均衡的分区等条件；少量节点的随机位置不保证每次都接近平均值。

## 用代码验证边界与绕回

以下 Python 3 示例使用人为指定的坐标，只演示节点选择，不实现哈希函数、存储或数据迁移。

```python
from bisect import bisect_left


def owner(position, ring):
    if not ring:
        raise ValueError("ring must not be empty")
    tokens = sorted(ring)
    i = bisect_left(tokens, position)
    return ring[tokens[i % len(tokens)]]


before = {10: "A", 40: "B", 80: "C"}
after = {**before, 60: "D"}
assert [owner(p, before) for p in [5, 25, 50, 75, 95]] == ["A", "B", "C", "C", "A"]
assert [owner(p, after) for p in [5, 25, 50, 75, 95]] == ["A", "B", "D", "C", "A"]
assert {p for p in range(100) if owner(p, before) != owner(p, after)} == set(range(41, 61))
```

节点恰好在位置 60 时，键 60 归 D；键 40 仍归 B。这就是区间左开右闭的含义。

示例每次调用都排序，成本为 O(V log V)，V 为环上的位置数。服务实现通常在成员表更新时生成有序位置表，请求查询再用 O(log V) 的二分搜索。不能把这段教学代码的完整成本写成 O(log V)。

## 为什么需要虚拟节点

每台机器只有一个位置时，区间大小可能差异很大。可以让同一物理节点拥有多个 token，例如 A#0、A#1、A#2，各占环上不同位置。这样，一台机器负责多个分散区间，通常更容易平衡；节点能力不同，也可以分配不同数量的 token。Dynamo 论文使用虚拟节点处理负载分布与节点能力差异。[Dynamo §4.2–4.3](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)

虚拟节点带来更大的成员表和更多迁移片段。它们改善的是分区粒度，无法自动解决“一个热门键占了大部分请求”。单键热点仍需要缓存副本、请求合并或业务拆分。

如果沿环选择三个副本，必须选三个不同的物理节点，并考虑机架或可用区。顺时针连续遇到的三个 token 可能都属于同一台机器，不能把它们当成三个独立副本。

## 节点归属改变后，数据不会自动出现

以持久化数据为例，D 接管 `(40, 60]` 只改变路由规则，不代表它已经拿到旧数据。下面是一种迁移过程示例，具体协议取决于系统的一致性要求：

1. 发布带版本号的新分区计划，但不要立即把所有请求切到空节点。
2. 从旧归属节点复制快照，并追赶复制期间的增量写入。
3. 在确认目标可服务后切换归属；处理仍持有旧成员表的客户端，例如旧节点转发或拒绝旧版本路由。
4. 等待旧请求与迁移校验结束，再清理旧数据。

对可丢弃缓存，可以选择不搬旧数据，让新节点从后端重新填充。代价是短时间大量未命中，因此仍要做预热、限速和后端保护。不要直接把缓存的扩容策略用于唯一一份持久化数据。

## 故障、成员表与权衡

所有参与路由的客户端需要一致的键编码、哈希算法、token 列表和规则版本。Python 的字符串和字节对象默认采用进程间不可预测的哈希随机化，因此内置 `hash()` 不适合直接作为跨进程持久路由协议的一部分；应明确选定稳定算法和字节编码，并让各语言实现对同一测试向量给出相同结果。[Python 数据模型说明](https://docs.python.org/3/reference/datamodel.html#object.__hash__)

| 问题 | 一致性哈希能做什么 | 仍需设计什么 |
| --- | --- | --- |
| 扩缩容 | 限制归属发生变化的键集合 | 快照、增量、切换和回滚 |
| 节点失效 | 计算新的候选归属 | 健康检测、复制、故障域与恢复 |
| 数据不均 | 用虚拟节点改善区间粒度 | 大对象、热点键与按负载调度 |
| 成员表不一致 | 不会自动修复视图差异 | 版本传播、旧路由兼容与冲突处理 |
| 范围查询 | 通常不保留业务键顺序 | 使用范围分区或其他索引 |

节点稳定、扩容很少时，普通分片可能更简单。经常增减节点的缓存集群、对象放置等场景更容易从一致性哈希获益，但需要把路由稳定性与真实的数据可用性分开验收。

延伸阅读：[Karger 的一致性哈希讲义](https://people.csail.mit.edu/karger/Talks/Hash/index.htm)、[Dynamo 论文](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)。相关站内章节：[数据库分片](/system-design/database/#分片)、[一致性模式](/system-design/consistency-patterns/)。
