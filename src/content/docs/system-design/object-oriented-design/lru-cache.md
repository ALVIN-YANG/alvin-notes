---
{
  "title": "设计 LRU 缓存",
  "sidebar": {
    "order": 18
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/object-oriented-design/hash-table/",
    "label": "设计 hash map"
  },
  "next": {
    "link": "/system-design/object-oriented-design/call-center/",
    "label": "设计呼叫中心"
  }
}
---
本 Notebook 由 [Donne Martin](https://github.com/donnemartin) 编写。源码和许可信息见 [GitHub](https://github.com/donnemartin/system-design-primer)。

## 约束与假设

* 缓存的是什么？
    * Web 查询的结果
* 是否可以假设输入有效，还是必须进行校验？
    * 假设输入有效
* 是否可以假设所有数据都能放入内存？
    * 可以

## 解答

```python
%%writefile lru_cache.py
class Node(object):

    def __init__(self, results):
        self.results = results
        self.prev = None
        self.next = None


class LinkedList(object):

    def __init__(self):
        self.head = None
        self.tail = None

    def move_to_front(self, node):  # ...
    def append_to_front(self, node):  # ...
    def remove_from_tail(self):  # ...


class Cache(object):

    def __init__(self, MAX_SIZE):
        self.MAX_SIZE = MAX_SIZE
        self.size = 0
        self.lookup = {}  # key: query, value: node
        self.linked_list = LinkedList()

    def get(self, query)
        """Get the stored query result from the cache.
        
        Accessing a node updates its position to the front of the LRU list.
        """
        node = self.lookup.get(query)
        if node is None:
            return None
        self.linked_list.move_to_front(node)
        return node.results

    def set(self, results, query):
        """Set the result for the given query key in the cache.
        
        When updating an entry, updates its position to the front of the LRU list.
        If the entry is new and the cache is at capacity, removes the oldest entry
        before the new entry is added.
        """
        node = self.lookup.get(query)
        if node is not None:
            # Key exists in cache, update the value
            node.results = results
            self.linked_list.move_to_front(node)
        else:
            # Key does not exist in cache
            if self.size == self.MAX_SIZE:
                # Remove the oldest entry from the linked list and lookup
                self.lookup.pop(self.linked_list.tail.query, None)
                self.linked_list.remove_from_tail()
            else:
                self.size += 1
            # Add the new key and value
            new_node = Node(results)
            self.linked_list.append_to_front(new_node)
            self.lookup[query] = new_node
```

### 原 Notebook 输出

```text
Overwriting lru_cache.py

```
