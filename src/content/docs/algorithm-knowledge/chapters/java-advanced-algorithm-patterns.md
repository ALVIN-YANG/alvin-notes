---
title: "Java 进阶算法模式：前缀和、单调栈、二分答案与并查集"
description: "当哈希、滑动窗口和普通 DFS 不够用时，用四个进阶模式处理区间统计、最近更值、最小可行解和动态连通性。"
date: 2025-10-18
lastUpdated: 2026-01-08
verifiedAgainst: "Java 21；经典算法模型，2026-01-08"
sidebar:
  order: 2
---

学完常见数组、链表和树题之后，下一道坎通常不是代码更长，而是问题多了一层转换：区间和要改写成两个前缀的差，最优化问题要转成“某个答案是否可行”，动态连通性也不适合每次重新 DFS。

这篇不追求再收集几十道题，而是补上四个迁移性很强的模式。

## 先说结论

- 区间统计先想前缀和，核心是把一段区间改写成两个历史状态的差。
- 遇到“左边或右边第一个更大、更小”时，优先考虑单调栈。
- 答案有单调性、验证比直接求解容易时，可以二分答案。
- 只关心元素是否连通、集合如何合并时，并查集通常比反复搜索更合适。

## 前缀和：把区间问题改写成历史状态

对于数组 `nums`，定义：

```text
prefix[i] = nums[0] + ... + nums[i - 1]
```

那么半开区间 `[left, right)` 的和就是：

```text
prefix[right] - prefix[left]
```

### 和为 K 的子数组

遍历到当前位置时，如果当前前缀和为 `sum`，只要此前出现过 `sum - k`，中间那段子数组的和就是 `k`。

```java
static int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> countByPrefix = new HashMap<>();
    countByPrefix.put(0, 1);

    int sum = 0;
    int answer = 0;

    for (int value : nums) {
        sum += value;
        answer += countByPrefix.getOrDefault(sum - k, 0);
        countByPrefix.merge(sum, 1, Integer::sum);
    }
    return answer;
}
```

容易漏掉的是 `prefix = 0` 的初始状态。没有它，从数组开头开始的合法区间不会被统计。

## 单调栈：维护还没有找到答案的候选

单调栈适合：

- 下一个更大元素；
- 下一个更小元素；
- 左右第一个更高或更低的位置；
- 柱状图最大矩形；
- 每日温度。

以每日温度为例，栈里保存尚未遇到更高温度的下标，并保持对应温度单调递减：

```java
static int[] dailyTemperatures(int[] temperatures) {
    int[] answer = new int[temperatures.length];
    Deque<Integer> stack = new ArrayDeque<>();

    for (int i = 0; i < temperatures.length; i++) {
        while (!stack.isEmpty()
                && temperatures[i] > temperatures[stack.peek()]) {
            int previous = stack.pop();
            answer[previous] = i - previous;
        }
        stack.push(i);
    }
    return answer;
}
```

不要死记“递增栈还是递减栈”。先问：栈里保存的候选，遇到什么条件时可以确定答案并出栈。

## 二分答案：不直接求最优值，先判断是否可行

普通二分查找是在有序数组里找位置；二分答案是在一个有序答案空间里找边界。

它通常长这样：

```java
static int firstFeasible(int low, int high) {
    while (low < high) {
        int mid = low + (high - low) / 2;
        if (feasible(mid)) {
            high = mid;
        } else {
            low = mid + 1;
        }
    }
    return low;
}
```

识别信号：

- 求最小的最大值；
- 求最大的最小值；
- 给定容量、速度或天数，能否完成；
- `x` 可行后，比 `x` 更宽松的答案也一定可行。

真正困难的部分不是二分模板，而是证明 `feasible(x)` 具有单调性。

## 并查集：动态维护连通分量

并查集支持两个核心操作：

- `find(x)`：找到元素所属集合的代表；
- `union(a, b)`：合并两个集合。

```java
final class UnionFind {
    private final int[] parent;
    private final int[] size;

    UnionFind(int n) {
        parent = new int[n];
        size = new int[n];
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }

    int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    boolean union(int a, int b) {
        int rootA = find(a);
        int rootB = find(b);
        if (rootA == rootB) return false;

        if (size[rootA] < size[rootB]) {
            int temp = rootA;
            rootA = rootB;
            rootB = temp;
        }
        parent[rootB] = rootA;
        size[rootA] += size[rootB];
        return true;
    }
}
```

路径压缩与按大小合并同时使用后，单次操作的均摊复杂度非常接近常数。

## 怎么选择

| 题目结构 | 优先模式 |
|---|---|
| 多次查询区间和、区间计数 | 前缀和 |
| 找最近一个更大或更小元素 | 单调栈 |
| 最优值难求，但给定答案容易验证 | 二分答案 |
| 动态合并集合、判断连通 | 并查集 |

练习时不要把四套模板混在一天背。每个模式连续做两三道变体，并在纸上写出它维护的不变量。能把不变量说清楚，模板才真正属于你。
