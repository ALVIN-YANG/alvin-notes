---
title: "Java 高频算法怎么练：15 道题背后的 8 个模式"
description: "不再逐题背答案。用哈希、滑动窗口、链表、树、图、区间和堆，建立一套能迁移到新题的判断框架。"
date: 2026-02-07
lastUpdated: 2026-06-12
verifiedAgainst: "Java 21；LeetCode 经典题型，2026-06-12"
sidebar:
  order: 1
---

刷题最挫败的时刻，不是某道题不会，而是昨天刚看懂，换个题面又像第一次见。原因通常不是代码记得不牢，而是只记住了答案，没有记住它在维护什么状态。

这篇把原来的 15 道零散题解重新收成 8 个模式。题目只是样本，真正要练的是：看到输入结构之后，能不能判断该维护什么不变量，以及用什么数据结构更新最便宜。

## 先说结论

- 先识别“连续区间、配对、连通块、动态 Top K”这类信号，再决定写哪种模板。
- 模板只负责起步，边界条件和不变量才决定代码是否稳定。
- 面试表达顺序比一上来默写最优解更重要：先基线，再优化，再验证。
- 同一模式连续练两三题，比按题号收藏几十份答案更容易形成迁移能力。

## 先看题型地图

| 模式 | 识别信号 | 代表题 |
|---|---|---|
| 哈希表 / 集合 | 查找配对、去重、频次 | 两数之和、最长连续序列 |
| 滑动窗口 | 连续子数组或子串、最长或最短 | 无重复最长子串、最小覆盖子串 |
| 栈 | 配对、嵌套、最近未匹配元素 | 有效括号 |
| 链表指针 | 原地反转、环、分段操作 | 反转链表、环形链表、K 个一组翻转 |
| 树的 BFS / DFS | 分层、递归关系、祖先 | 层序遍历、最近公共祖先 |
| 图与网格搜索 | 连通块、可达性 | 岛屿数量 |
| 排序与区间 | 重叠、合并、调度 | 合并区间 |
| 堆与组合数据结构 | 动态 Top K、流式中位数、O(1) 淘汰 | 高频元素、数据流中位数、LRU |

识别模式后，再决定实现细节。不要反过来看到题目就硬套模板。

## 模式一：哈希表把“反复查找”变成一次扫描

### 两数之和

遍历当前数字 `x` 时，只需要知道 `target - x` 是否已经出现：

```java
static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> indexByValue = new HashMap<>();

    for (int i = 0; i < nums.length; i++) {
        int expected = target - nums[i];
        Integer matchedIndex = indexByValue.get(expected);
        if (matchedIndex != null) {
            return new int[]{matchedIndex, i};
        }
        indexByValue.put(nums[i], i);
    }

    throw new IllegalArgumentException("No solution");
}
```

复杂度是时间 `O(n)`、空间 `O(n)`。关键不是会用 `HashMap`，而是理解“用空间保存已经计算过的信息”。

### 最长连续序列

把数字放入集合后，只从“序列起点”向后扩展：

```java
static int longestConsecutive(int[] nums) {
    Set<Integer> values = new HashSet<>();
    for (int num : nums) values.add(num);

    int best = 0;
    for (int value : values) {
        if (values.contains(value - 1)) continue;

        int length = 1;
        while (values.contains(value + length)) length++;
        best = Math.max(best, length);
    }
    return best;
}
```

如果每个数字都向两边扫描，最坏情况会退化。只从起点出发，才能把总扫描量控制在 `O(n)`。

## 模式二：滑动窗口维护连续区间的不变量

滑动窗口适合同时满足三个条件的问题：

1. 答案来自连续区间；
2. 右边界扩张会改变合法性；
3. 左边界前移能恢复合法性。

### 无重复字符的最长子串

```java
static int longestUniqueSubstring(String text) {
    Map<Character, Integer> latest = new HashMap<>();
    int left = 0;
    int best = 0;

    for (int right = 0; right < text.length(); right++) {
        char current = text.charAt(right);
        Integer previous = latest.put(current, right);
        if (previous != null) {
            left = Math.max(left, previous + 1);
        }
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

`left` 不能后退，这是最常见的错误。

### 最小覆盖子串

这类题的骨架是：

```text
右边界扩张，直到窗口满足条件
记录当前答案
左边界收缩，直到窗口不再满足条件
继续扩张右边界
```

实现时建议显式维护：

- `need`：目标字符频次；
- `window`：窗口内频次；
- `valid`：已经满足频次要求的字符种类数。

不要每次移动边界后重新扫描整个频次数组。

## 模式三：栈处理“最近一个尚未完成的对象”

有效括号的本质不是字符匹配，而是后进先出的约束：

```java
static boolean isValidParentheses(String input) {
    Deque<Character> stack = new ArrayDeque<>();

    for (char ch : input.toCharArray()) {
        if (ch == '(') stack.push(')');
        else if (ch == '[') stack.push(']');
        else if (ch == '{') stack.push('}');
        else if (stack.isEmpty() || stack.pop() != ch) return false;
    }

    return stack.isEmpty();
}
```

在 Java 中优先使用 `ArrayDeque`，不要再使用历史遗留的 `Stack`。

## 模式四：链表题先画指针，再写代码

### 反转链表

每一轮只维护三个对象：前驱、当前节点、下一个节点。

```java
static ListNode reverse(ListNode head) {
    ListNode previous = null;
    ListNode current = head;

    while (current != null) {
        ListNode next = current.next;
        current.next = previous;
        previous = current;
        current = next;
    }
    return previous;
}
```

### 环形链表

快指针每次走两步，慢指针每次走一步。如果存在环，它们一定会相遇。

```java
static boolean hasCycle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;

    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```

### K 个一组翻转

不要试图一次写完整段逻辑。拆成四步：

1. 找到当前组的第 `k` 个节点；
2. 保存下一组起点；
3. 在 `[groupStart, nextGroupStart)` 内执行普通反转；
4. 连接上一组尾部和当前组的新头尾。

真正的难点是组与组之间的连接，而不是反转本身。

## 模式五：树的 BFS 负责层级，DFS 负责关系

### 层序遍历

每轮先读取当前队列长度，它就是这一层的节点数：

```java
static List<List<Integer>> levelOrder(TreeNode root) {
    if (root == null) return List.of();

    List<List<Integer>> result = new ArrayList<>();
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.add(root);

    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>(size);

        for (int i = 0; i < size; i++) {
            TreeNode node = queue.remove();
            level.add(node.val);
            if (node.left != null) queue.add(node.left);
            if (node.right != null) queue.add(node.right);
        }
        result.add(level);
    }
    return result;
}
```

### 最近公共祖先

递归返回值代表：“当前子树是否找到了 `p` 或 `q`，如果两边都找到，当前节点就是答案。”

```java
static TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;

    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);

    if (left != null && right != null) return root;
    return left != null ? left : right;
}
```

## 模式六：网格搜索就是隐式图遍历

岛屿数量中，每个格子是一个节点，上下左右是边。遍历到陆地后，把整个连通块标记为已访问：

```java
static void flood(char[][] grid, int row, int col) {
    if (row < 0 || row >= grid.length
            || col < 0 || col >= grid[0].length
            || grid[row][col] != '1') {
        return;
    }

    grid[row][col] = '0';
    flood(grid, row - 1, col);
    flood(grid, row + 1, col);
    flood(grid, row, col - 1);
    flood(grid, row, col + 1);
}
```

数据规模大时，递归可能造成栈溢出，可以改用显式队列做 BFS。

## 模式七：区间题先排序，再只和最后一个答案比较

合并区间先按起点排序。新区间只可能和结果列表末尾的区间重叠：

```java
static int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
    List<int[]> result = new ArrayList<>();

    for (int[] current : intervals) {
        if (result.isEmpty() || result.get(result.size() - 1)[1] < current[0]) {
            result.add(current.clone());
        } else {
            int[] last = result.get(result.size() - 1);
            last[1] = Math.max(last[1], current[1]);
        }
    }
    return result.toArray(int[][]::new);
}
```

排序是 `O(n log n)`，合并扫描是 `O(n)`。

## 模式八：堆和组合数据结构处理动态查询

### 前 K 个高频元素

流程是“哈希统计频次 + 小顶堆保留 K 个候选”。当 `k` 接近 `n` 时，也可以使用桶排序。

### 数据流中位数

维护两个堆：

- 大顶堆保存较小的一半；
- 小顶堆保存较大的一半；
- 两个堆大小差不超过 1。

插入是 `O(log n)`，查询中位数是 `O(1)`。

### LRU 缓存

LRU 要同时满足：

- `get` / `put` 为 `O(1)`；
- 能快速找到 key；
- 能快速移动和淘汰节点。

因此使用 `HashMap + 双向链表`。`HashMap` 负责定位节点，双向链表负责维护访问顺序。面试中如果允许使用标准库，`LinkedHashMap` 可以实现同样语义；如果考察数据结构设计，应手写节点移动逻辑。

## 面试时怎么讲

拿到题后按这个顺序表达：

1. 先确认输入规模、空值、重复值和返回要求；
2. 说出暴力解法和复杂度；
3. 找出重复计算或需要维护的不变量；
4. 选择数据结构；
5. 写完后用最小输入、典型输入和边界输入走一遍；
6. 最后再给时间和空间复杂度。

真正稳定的算法能力，不是背下 15 份代码，而是看到新问题时能迅速回答：**我需要维护什么状态，这个状态用什么数据结构更新最便宜。**

继续练习：

- [Java 进阶算法模式：前缀和、单调栈、二分答案与并查集](/algorithm-knowledge/chapters/java-advanced-algorithm-patterns/)
