---
{
  "title": "设计 hash map",
  "sidebar": {
    "order": 17
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/object-oriented-design/",
    "label": "面向对象设计的面试问题及解答"
  },
  "next": {
    "link": "/system-design/object-oriented-design/lru-cache/",
    "label": "设计 LRU 缓存"
  }
}
---
本 Notebook 由 [Donne Martin](https://github.com/donnemartin) 编写。源码和许可信息见 [GitHub](https://github.com/donnemartin/system-design-primer)。

## 约束与假设

* 为了简化，键是否只包含整数？
    * 是
* 发生哈希冲突时，是否可以使用链地址法？
    * 可以
* 是否需要考虑负载因子？
    * 不需要
* 是否可以假设输入有效，还是必须进行校验？
    * 假设输入有效
* 是否可以假设所有数据都能放入内存？
    * 可以

## 解答

```python
%%writefile hash_map.py
class Item(object):

    def __init__(self, key, value):
        self.key = key
        self.value = value


class HashTable(object):

    def __init__(self, size):
        self.size = size
        self.table = [[] for _ in range(self.size)]

    def _hash_function(self, key):
        return key % self.size

    def set(self, key, value):
        hash_index = self._hash_function(key)
        for item in self.table[hash_index]:
            if item.key == key:
                item.value = value
                return
        self.table[hash_index].append(Item(key, value))

    def get(self, key):
        hash_index = self._hash_function(key)
        for item in self.table[hash_index]:
            if item.key == key:
                return item.value
        raise KeyError('Key not found')

    def remove(self, key):
        hash_index = self._hash_function(key)
        for index, item in enumerate(self.table[hash_index]):
            if item.key == key:
                del self.table[hash_index][index]
                return
        raise KeyError('Key not found')
```

### 原 Notebook 输出

```text
Overwriting hash_map.py

```
