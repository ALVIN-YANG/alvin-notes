---
title: "OOM 内存泄漏：从 Heap Dump 到代码溯源的实战"
description: "OOM 后调大堆内存只能续命；根治靠 Heap Dump 分析：预置 HeapDumpOnOutOfMemoryError 参数，用 MAT 的 Dominator Tree 和 Path to GC Roots 定位泄漏点，附三类现代泄漏场景。"
sidebar:
  order: 4
date: 2025-09-06
lastUpdated: 2026-10-11
---

遇到 `java.lang.OutOfMemoryError: Java heap space`，调大 `-Xmx` 只能续命：如果是**内存泄漏**（对象被无用引用持有、GC 无法回收），给多少内存最终都会耗尽。根治路径是分析内存快照（Heap Dump）：**用 MAT 打开 Dump，看 Dominator Tree 找到占据内存最多的对象，再沿 Path to GC Roots 找到是谁持有它不放。**

有两个前置条件决定了这套方法能不能用上：

1. **启动参数必须预先配好** `-XX:+HeapDumpOnOutOfMemoryError`——OOM 往往发生在无人值守时段，进程被重启后现场就没了。
2. 手动 `jmap -dump` 会触发 Full GC、造成秒级停顿，不能在生产高峰期随意执行。

## 第一步：保护现场

OOM 发生后进程往往已经挂了，或被 K8s 探针重启。要拿到快照，生产环境所有 Java 应用的启动参数中应包含：

```bash
-XX:+HeapDumpOnOutOfMemoryError
-XX:HeapDumpPath=/var/log/java/oom_dump.hprof
```

触发 OOM 时，JVM 会在退出前把当时内存里的全部对象写入 `oom_dump.hprof`。

如果进程还活着、但内存持续走高，也可以用 `jmap` 或 Arthas 手动导出：
```bash
jmap -dump:format=b,file=heap.hprof <PID>
```
*(注意：手动 dump 时会触发 Full GC，可能导致系统明显停顿数秒，请避开高峰期)*

## 第二步：使用 MAT 分析快照

拿到几 GB 甚至十几 GB 的 `.hprof` 文件后，需要用专门的内存分析工具。常用的免费工具是 Eclipse 基金会的 **[MAT (Memory Analyzer Tool)](https://eclipse.dev/mat/)**；有预算的话 JProfiler 或 IDEA 内置 Profiler 也可以。

### 1. 看漏斗图 (Overview)
用 MAT 打开 Dump 文件后，第一眼看到的是一个大饼图。如果某个区域占据了绝大部分空间，优先排查它。

### 2. 核心概念：Dominator Tree（支配树）
不要先看直方图（Histogram）里密密麻麻的 `String` 和 `char[]`——内存泄漏通常是业务对象持有这些底层对象导致的。

打开 **Dominator Tree**：这个视图按 **Retained Heap**（如果回收该对象、能连带释放多少内存）排序，泄漏点通常排在最上面。

### 3. 找引用链 (Path to GC Roots)
在支配树里看到一个 `com.company.export.ExportTask` 对象占了 2GB 内存还不够，还要知道是谁持有它，导致 GC 无法回收。

右键点击这个对象 -> 选择 `Path To GC Roots` -> 选择 `exclude all phantom/weak/soft etc. references`（排除弱引用等）。

MAT 会给出一条引用链，例如：
```text
ArrayList <--- 持有 --- Static Map <--- 持有 --- ReportManager
```
含义：一个单例 `ReportManager` 里的静态 `HashMap` 不停地塞入导出任务对象，且从不清理——这是典型的 Java 内存泄漏形态。

## 第三步：现代应用中常见的内存泄漏场景

除了静态集合不清理，高并发应用中还有几类隐蔽的泄漏：

### 1. 拦截器 / ThreadLocal 泄漏
如果你在过滤器（Filter）的 `doFilter` 前把用户的 Session 放进了 `ThreadLocal`，但忘记在 `finally` 块中调用 `remove()`。
在 Tomcat 的线程池模型下，这个线程会被复用，不仅会导致下一个请求读到上一个用户的数据（越权漏洞），这个巨无霸 Session 对象也会被一直卡在内存里无法回收。

### 2. Unclosed 资源导致底层泄漏
在操作 Excel 导出（如 EasyExcel/POI）、读取大文件、或者操作压缩流时，如果不使用 `try-with-resources`，底层的资源句柄和相关堆外缓冲区（Direct Memory）将无法被回收，甚至可能把系统的堆外内存撑爆，引发 `java.lang.OutOfMemoryError: Direct buffer memory`。

### 3. 危险的 `findAll` 无分页查询
如果有人在管理后台写了一个 `SELECT * FROM user_log`（百万级数据），MyBatis 或 JPA 会直接把这上百万条记录转换为 Java Entity 对象塞进内存。一瞬间 4GB 内存被打满。
**建议：**在架构层面禁止任何未加 `limit` 限制的全表扫描，对于海量导出，强制使用游标流式读取（Cursor Fetch）。

## 总结

排查 OOM 的链路是固定的：`-XX:+HeapDumpOnOutOfMemoryError` 保证拿到现场，MAT 的 Dominator Tree 定位大对象，Path to GC Roots 找出持有方。

不要用调大堆内存来应对泄漏——那只是推迟下一次崩溃。
