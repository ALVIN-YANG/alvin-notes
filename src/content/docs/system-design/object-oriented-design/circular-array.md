---
{
  "title": "设计环形数组",
  "sidebar": {
    "order": 23
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/object-oriented-design/online-chat/",
    "label": "设计在线聊天服务"
  },
  "next": {
    "link": "/system-design/getting-started/",
    "label": "系统设计主题：从这里开始"
  }
}
---
> **本站补充**：原仓库只列出了这道题，没有提供解答。以下设计、说明和代码由本站补充，不属于 System Design Primer 原文。

环形数组可以用一个普通数组加一个起点偏移量实现。旋转时只修改起点，不搬动元素；读取逻辑位置 `i` 时，访问物理位置 `(head + i) % n`。这样，索引读写和旋转都只需要常数次操作。

本解答设计的是**固定长度、可旋转、可索引和可遍历的数组**。不提供入队、出队、自动扩容或覆盖旧元素功能；这些属于环形队列或环形缓冲区的另一组接口。实现不提供并发访问保证。

## 约束与接口

先约定旋转方向和边界，避免实现与调用方理解不同。

| 接口 | 行为 |
| --- | --- |
| `CircularArray(items)` | 复制输入序列，固定元素数量；允许空序列 |
| `len(array)` | 返回元素数量 |
| `array[i]` | 按当前逻辑顺序读取元素 |
| `array[i] = value` | 按当前逻辑顺序修改元素 |
| `array.rotate(k)` | 正数向左旋转，负数向右旋转；返回 `None` |
| `iter(array)` | 返回当前逻辑顺序的浅快照迭代器 |

索引支持 Python 的负索引：`-1` 表示逻辑上的最后一个元素。越界索引抛出 `IndexError`，不把越界访问自动绕回数组。索引和旋转量必须支持 Python 的整数索引协议，否则抛出 `TypeError`；不支持切片。

空数组可以旋转和遍历，但不能读取或写入任何位置。快照迭代器创建后，数组再旋转或替换元素，不影响该迭代器；快照不复制元素对象本身。

## 索引如何映射

设底层数组为 `[A, B, C, D]`，初始 `head = 0`。向左旋转一次后，`head = 1`，底层数组仍然保持原状，逻辑顺序变成 `[B, C, D, A]`。

| 逻辑索引 | 物理索引 `(1 + i) % 4` | 读取值 |
| --- | --- | --- |
| 0 | 1 | B |
| 1 | 2 | C |
| 2 | 3 | D |
| 3 | 0 | A |

此时写入 `array[0] = X`，修改的是底层索引 1，逻辑顺序变为 `[X, C, D, A]`。读取 `array[-1]` 时，先把负索引转换成逻辑索引 3，再映射到物理索引 0。

旋转量可以超过数组长度。长度为 4 时，向左旋转 5 次与旋转 1 次等价；向左旋转 `-1` 次等价于向右旋转 1 次。Python 的取模运算使非空数组的 `head` 始终落在 `[0, n)` 中。

## Python 实现

以下代码可在 Python 3 中直接运行。`operator.index` 检查整数索引协议；读写共用同一个位置映射，避免旋转后读写落在不同位置。

```python
from operator import index


class CircularArray:
    def __init__(self, items):
        self._data = list(items)
        self._head = 0

    def __len__(self):
        return len(self._data)

    def _physical_index(self, i):
        i = index(i)
        n = len(self)
        if i < 0:
            i += n
        if not 0 <= i < n:
            raise IndexError("circular array index out of range")
        return (self._head + i) % n

    def __getitem__(self, i):
        return self._data[self._physical_index(i)]

    def __setitem__(self, i, value):
        self._data[self._physical_index(i)] = value

    def rotate(self, steps):
        steps = index(steps)
        if self._data:
            self._head = (self._head + steps) % len(self)

    def __iter__(self):
        snapshot = self._data[self._head:] + self._data[:self._head]
        return iter(snapshot)
```

类只保存 `_data` 和 `_head`。旋转不会改变底层元素排列；`_physical_index` 在取模之前完成空数组与越界检查，因此不会发生除零，也不会把错误索引悄悄映射到合法元素。

## 运行示例

将这段代码接在类定义后运行：

```python
array = CircularArray(["A", "B", "C", "D"])
array.rotate(1)
assert list(array) == ["B", "C", "D", "A"]
assert array[-1] == "A"

array[0] = "X"
snapshot = iter(array)
array.rotate(-1)
assert list(array) == ["A", "X", "C", "D"]
assert list(snapshot) == ["X", "C", "D", "A"]

array.rotate(5)
assert list(array) == ["X", "C", "D", "A"]

empty = CircularArray([])
empty.rotate(100)
assert list(empty) == []
print("检查通过")
```

## 复杂度与取舍

设数组长度为 `n`，按通常的固定宽度整数运算模型分析：

| 操作 | 时间 | 额外空间 |
| --- | --- | --- |
| 初始化 | O(n) | O(n)，保存元素引用 |
| 查询长度、索引读写 | O(1) | O(1) |
| 旋转 | O(1) | O(1) |
| 创建快照迭代器 | O(n) | O(n) |
| 遍历快照全部元素 | O(n) | O(1)，不计已创建的快照 |

快照换来了明确的遍历语义，代价是每次创建迭代器都复制 `n` 个引用。若要求迭代器额外空间为 O(1)，可以逐项映射索引，但需要另行规定遍历期间是否允许修改，例如修改后立即报错。这里选择快照，保持接口简单。

Python 支持任意精度整数。若旋转量非常大，整数加法和取模的成本会随整数位数增长；O(1) 的旋转结论指不随数组长度增长，且把整数运算视为常数成本。

## 检查重点

- **方向**：`rotate(1)` 必须得到左移一位的逻辑顺序，`rotate(-1)` 则右移。
- **读写一致**：旋转后通过逻辑索引写入，读出和遍历都应看到同一个新值。
- **边界**：空数组、单元素数组、负索引、超过长度的旋转量，以及越界读写。
- **类型**：小数、字符串和切片不能悄悄转成整数索引。
- **快照**：创建迭代器后再旋转或替换元素，旧迭代器仍按创建时的顺序返回原引用。

[返回面向对象设计题目总览](/system-design/object-oriented-design/)
