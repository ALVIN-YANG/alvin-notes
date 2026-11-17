---
title: "Agent 记忆系统原理：六个环节看懂主流方案"
description: "用同一组水果记忆走完存储、写入、召回、冲突、遗忘与上下文组装，把 Mem0、Hindsight、OpenClaw、Hermes 对号入座。"
date: 2026-11-17
lastUpdated: 2026-11-17
verifiedAgainst: "OpenClaw 2026.10.10 固定提交、Mem0 官方 README（2026-11）、Hindsight v0.10.2 官方文档、Hermes 官方 Persistent Memory 文档的公开转述与源码解读，2026-11-17"
---

Mem0、Hindsight、OpenClaw、Hermes 看起来是四种完全不同的东西：记忆层、记忆服务、文件工作区、个人 Agent。但把它们拆开，**每个系统都在回答同样六个问题：存哪里、写什么、怎么找、冲突怎么办、怎么忘、放多少进上下文。**看懂这六个环节，就看懂了主流方案的全貌。

继续用这组例子：

```text
M1（周一）：我喜欢蓝莓，芒果吃了不舒服。
M2（周二）：Agent 下单买了蓝莓（blueberry）。
M3（周三）：以后只想买苹果。
周五，你问：“现在该给我推荐什么水果？”
```

![记忆系统的六个环节：写入、存储、召回、冲突与遗忘、上下文组装、主模型回答](/images/ai/agent-memory-principles/01-overview.svg)

本文先讲通用框架，再把四个系统对号入座。检索内部的算法细节（语义、BM25、融合评分等）见[混合检索原理](/ai/hybrid-retrieval-principles/)，各产品的完整拆解见文末链接。

## 1. 存储：四种数据不要混为一谈

一个完整的记忆系统里，其实有四种数据：

- **原始记录**：对话和工具结果，全量保存，是证据。OpenClaw 的会话 SQLite、Hermes 的会话库都在这一层。
- **长期记忆**：从原始记录提取或整理出的偏好、决定、经验。`MEMORY.md`、Mem0 的事实条目、Hindsight 的 world fact 都在这一层。
- **索引**：切片、向量、关键词表，是查找用的**派生物**，丢了可以重建，不是另一份记忆。
- **业务状态**：当前生效的设置、订单、设备在线状态。它不属于记忆系统，查询它要走业务数据库。

![原始记录、长期记忆、索引、业务状态的分层关系](/images/ai/agent-memory-principles/02-storage-layers.svg)

很多"记忆出错"其实是层搞错了：把索引当记忆备份，把历史偏好当当前状态，或者只删长期记忆却留着原始记录，下次整理又被恢复。

## 2. 写入：全量、提取、整理，三种策略可以共存

写入不是一条流水线，而是三种策略的组合：

- **全量记录**：每条消息都存，不判断重要性。证据完整，噪声也完整，靠后面的检索兜底。
- **提取筛选**：模型从对话里抽出值得保存的事实。Mem0 的 `add` 单次提取、Hindsight 的 `retain` 都在这一层，质量取决于模型判断。
- **整理与策展**：后台或定期把积累的内容压缩成更好的长期记忆。OpenClaw 的 Dreaming 按召回信号提升候选，Hindsight 的 Observation 归纳相关事实，Hermes 则要求 Agent 在极小容量内主动决定留什么。

![全量记录、提取筛选、整理策展三种写入策略，以及触发时机与来源信任](/images/ai/agent-memory-principles/03-write-strategies.svg)

写入前还要回答两个问题：**什么时候触发**（每条消息、会话结束、压缩前、后台定时），以及**来源可信吗**。用户原话、Agent 确认的动作、网页文本的信任等级完全不同；低信任来源不该直接变成长期偏好。

**写入规则决定记忆质量的上限，检索只能在这个上限内发挥。**

## 3. 召回：固定加载与按需检索，两条腿走路

新会话不会把旧内容全读一遍。主流方案都是两条腿的某种配比：

- **固定加载**：少量核心记忆每次启动就注入。OpenClaw 启动读 `USER.md` 和 `MEMORY.md`；Hermes 把两个小文件作为**冻结快照**注入系统提示，会话中途写入只落盘、下次会话才可见——这样提示词前缀不变，prompt 缓存不会失效。
- **按需检索**：需要时才查大库。OpenClaw 的 `memory_search`、Hermes 的 `session_search`（SQLite FTS5 关键词检索）、Mem0 的 `search`、Hindsight 的 `recall` 都在这一层。

![固定加载与按需检索的分工，以及各自的代表实现](/images/ai/agent-memory-principles/04-recall-two-legs.svg)

固定加载零检索成本，但容量必须小；按需检索库可以很大，但有延迟和调用成本。**常见搭配是：小文件放"总要记住的"，大库放"可能用得着的"，先读固定文件，不够再检索。**

## 4. 冲突与遗忘：四种策略，四种取舍

M1 说喜欢蓝莓，M3 说只想买苹果。冲突怎么处理，是各系统差异最大的地方：

- **覆盖更新**：同一来源修订就替换旧版本。Hindsight 对同一 `document_id` 默认 replace，简洁但变化历史被抹掉。
- **只新增**：Mem0 的 ADD-only 保留全部记录，历史完整，但"现在听哪条"交给应用判断。
- **标记替代**：OpenClaw 把旧条目标为 `superseded`、新条目标为 `active`，保留来源链，可以审计哪条失效。
- **容量挤出**：Hermes 的 2200 / 1375 字符上限迫使 Agent 合并或丢弃，用空间约束保证只留最重要的。

![覆盖更新、只新增、标记替代、容量挤出四种冲突策略，以及遗忘要删派生数据](/images/ai/agent-memory-principles/05-conflict-strategies.svg)

遗忘同样是一套动作而不是一个删除按钮：删掉来源后，**索引切片、归纳摘要、检索缓存、备份里的旧内容都要处理**，否则它还会被召回。Hindsight 还要求检查由来源生成的 Observation 是否继续暴露旧内容。

## 5. 上下文组装：记忆不等于省 Token

记忆系统常被宣传成"省上下文"，实际要看组装方式：

- 固定加载每次都占 token；冻结快照能让 prompt 缓存命中，是 Hermes 控制成本的核心理由。
- 提取、后台归纳、检索、rerank 都是额外的模型或计算调用，Mem0 一次 `add` 就有提取和 embedding 成本，Hindsight 的 `reflect` 内部还有完整的模型循环。
- 检索回来的片段同样占上下文，top_k 不是越大越好。

所以正确的预期是：**记忆系统的主要收益是旧信息以后还能找到，成本控制要靠小容量固定加载、缓存友好的稳定前缀和按需检索的组合。**

## 6. 四个系统对号入座

![OpenClaw、Mem0、Hindsight、Hermes 的设计选择与适用场景](/images/ai/agent-memory-principles/06-four-systems.svg)

**OpenClaw：文件工作区 + 后台整理。**Markdown 加 SQLite，全量记录做证据，Dreaming 按召回信号提升长期记忆，固定加载、trigger 快速通道和混合检索分级召回，冲突用 `superseded` 标记。适合自托管、重视可解释和可审计的场景。详见[OpenClaw 记忆系统拆解](/claw/openclaw/9-memory-system-deep-dive/)。

**Mem0：现成的记忆层。**`add` 和 `search` 两个动作接入现有 Agent，ADD-only 加多信号融合，时间推理辅助排序，冲突判断留给应用。适合快速接入，但要自己设计当前偏好和隔离规则。详见[Mem0 记忆层拆解](/memory-projects/mem0/)。

**Hindsight：带解释能力的记忆服务。**`retain`、`recall`、`reflect` 三个 API，实体、时间和来源追溯完整，Observation 后台归纳，同一来源修订可覆盖。适合需要回答"偏好为什么变了"的场景；`reflect` 不是免费检索，只要事实时先用 `recall`。详见[Hindsight 长期记忆](/ai/hindsight-agent-memory/)。

**Hermes：冷热分离的个人 Agent。**两个有字符上限的小文件常驻提示词，冻结快照保住 prompt 缓存；会话历史进 SQLite，`session_search` 按需冷检索；更深用户建模交给可选外部服务。适合成本敏感、希望常驻提示词稳定的小而精方案。机制见[Hermes 记忆系统源码解读](https://baoyu.io/blog/2026-04-29/manthanguptaa-2034849672985288957)与[官方文档的学习机制说明](https://developer.aliyun.com/article/1777065)。

## 7. 验收清单：评估任何记忆系统的十二个问题

拿到任何一个记忆系统（包括自己写的），按六个环节各问两个问题：

| 环节 | 要回答的问题 |
| --- | --- |
| 存储 | 原始记录还在吗？索引删掉能重建吗？ |
| 写入 | 什么内容、什么时机触发？低信任来源会被写成偏好吗？ |
| 召回 | 固定加载多少？检索不到时系统怎么说？ |
| 冲突 | 新旧偏好并存时听哪条，谁来决定？ |
| 遗忘 | 删除来源后，索引、摘要、缓存、备份都清了吗？ |
| 成本 | 每次请求的固定开销多少？提取和检索的额外调用多少？ |

这十二个问题答不上来的部分，就是这个系统未来出事的地方。

## 进阶附录

### A. 四个系统六环节对照总表

| 环节 | OpenClaw | Mem0 | Hindsight | Hermes |
| --- | --- | --- | --- | --- |
| 长期存储 | Markdown + SQLite | 记忆库存储（可配置后端） | 记忆服务（bank） | 两个小文件 + 会话 SQLite |
| 写入 | 全量 + Dreaming 整理 | `add` 单次提取，ADD-only | `retain` 提取 + Observation 归纳 | Agent 主动策展，容量上限 |
| 固定加载 | 启动读 USER/MEMORY | 无（全靠检索） | 无（Knowledge page 可选） | 冻结快照每次注入 |
| 按需检索 | 混合检索 + trigger | 多信号融合 + 时间推理 | `recall` 融合 + 重排 | `session_search` FTS5 |
| 冲突 | `superseded` 标记 | 应用判断 | 同来源 replace + 历史保留 | 容量挤出 |
| 遗忘 | 按来源链删派生数据 | 应用调用删除并处理缓存 | 删来源后查 Observation | 改写小文件；会话仍在库中 |
| 成本特点 | 整理与子代理有额外调用 | 每次 add 有提取成本 | reflect 是完整模型循环 | 缓存友好，检索无模型调用 |

### B. 深入阅读

- [混合检索原理](/ai/hybrid-retrieval-principles/)：语义、BM25、实体、时间、融合评分、MMR、评估指标的手算拆解。
- [OpenClaw 记忆系统拆解](/claw/openclaw/9-memory-system-deep-dive/)、[Mem0 记忆层拆解](/memory-projects/mem0/)、[Hindsight 长期记忆](/ai/hindsight-agent-memory/)。
- [Hermes 记忆系统源码解读](https://baoyu.io/blog/2026-04-29/manthanguptaa-2034849672985288957)：冻结快照与冷热分离的设计动机。

---

本文的版本范围：OpenClaw 2026.10.10 固定提交、Mem0 官方 README（2026 年 11 月）、Hindsight v0.10.2、Hermes 官方 Persistent Memory 文档的公开转述与源码解读（默认上限 2200 / 1375 字符为版本事实，配置可覆盖）。各产品未公开的内部参数不作推测。
