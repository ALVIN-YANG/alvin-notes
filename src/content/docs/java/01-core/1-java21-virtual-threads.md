---
title: "Java 虚拟线程落地指南：适用边界与 Pinning 避坑"
description: "按 I/O 等待、下游容量和 JDK 版本选择虚拟线程，保留创建 API、Pinning 排查与 ScopedValue 示例。"
sidebar:
  order: 1
date: 2025-08-10
lastUpdated: 2026-10-11
---

**虚拟线程适合大量等待 I/O 的并发任务，让同步写法不必长期占住操作系统线程。** 它不增加 CPU 算力，也不保证单个请求更快；数据库连接、供应商限流和内存仍需单独限制。[JEP 444](https://openjdk.org/jeps/444)

采用前先看 JDK 版本。Java 21 的 `synchronized` 与本地调用会影响载体释放；JDK 24 的 JEP 491 消除了几乎全部监视器相关 Pinning。无需为短小、无阻塞的临界区统一换锁。[Oracle Java 21 指南](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)、[JDK 24 说明](https://www.oracle.com/java/technologies/javase/24-relnote-issues.html)

## 创建与使用

一个线程的创建片段：

```java
// 创建并启动一个虚拟线程
Thread vThread = Thread.ofVirtual().start(() -> {
    System.out.println("虚拟线程执行中: " + Thread.currentThread());
});
vThread.join();
```

每任务一个虚拟线程的执行器：

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 100_000; i++) {
        final int taskId = i;
        executor.submit(() -> {
            // 模拟阻塞 I/O，虚拟线程阻塞时会让出底层平台线程
            Thread.sleep(1000);
            return taskId;
        });
    }
} // try-with-resources 会等待所有虚拟线程执行完毕
```

这是 API 演示，不是 10 万并发的容量证明。不要为了限制下游并发而池化虚拟线程；用连接池、Semaphore 等限制稀缺资源，超额任务也要有队列、超时或拒绝策略。

Spring Boot 3.2+ 可开启支持的虚拟线程集成，先核对 Java、Boot 与 Web 容器版本：

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

## Pinning：按版本处理

载体线程（Carrier）是真正运行虚拟线程的平台线程。虚拟线程无法卸载时，阻塞会同时占住载体。

| 阻塞路径 | Java 21 | JDK 24+ |
| --- | --- | --- |
| 支持卸载的普通 I/O | 可释放载体 | 可释放载体 |
| 持有或竞争 `synchronized` 监视器 | 存在占住载体的风险 | JEP 491 消除几乎全部监视器相关 Pinning |
| JNI / Foreign Function 路径 | 仍需检查 | 仍需检查，不能只因升级就排除 |
| 等待 `ReentrantLock` | 可卸载 | 可卸载 |

只有一个锁持有者，不等于只有一个载体可能被阻塞；竞争监视器也要考虑。不要从请求数直接推导“几百个载体全部耗尽”，应看实际调用与等待路径。[JEP 491 实现说明](https://mail.openjdk.org/pipermail/nio-dev/2024-November/018122.html)、[JEP 491](https://openjdk.org/jeps/491)

下面是说明性业务片段，`httpClient` 和 `updateDB` 是项目封装：

```java
public synchronized void processPayment() {
    // Java 21 上：synchronized 内阻塞，虚拟线程被钉在载体线程上
    String response = httpClient.send("http://api.payment.com");
    updateDB(response);
}
```

Java 21 上，频繁且长时间的阻塞临界区可以改成：

```java
private final ReentrantLock lock = new ReentrantLock();

public void processPayment() {
    lock.lock();
    try {
        String response = httpClient.send("http://api.payment.com");
        updateDB(response);
    } finally {
        lock.unlock();
    }
}
```

换锁有助于释放载体，却不会让同一临界区内的操作并行。更先检查能否缩短持锁时间；JDK 24+ 不再仅为监视器 Pinning 强制改锁。

## 用诊断工具找实际阻塞

Java 21 可用 `-Djdk.tracePinnedThreads=full` 或 JFR 的 `jdk.VirtualThreadPinned` 事件。线程快照可包含平台与虚拟线程：

```bash
jcmd <PID> Thread.dump_to_file -format=json <file>
```

这些入口在 Java 21 已提供，并非从 23 才有；诊断行为按所用 JDK 核对。[Oracle 排查说明](https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html)

## ThreadLocal 与 ScopedValue

内存看“同时存活的请求数 × 每个请求独占的数据”。假设每个请求各新增 1MB，上限同时 10 万个，仅这一项约需 100GB；共享同一个对象引用不能按此重复计数。线程池复用时要清理请求数据，虚拟线程结束时关联数据可释放，仍不要给每个请求挂大对象。

向下游传递只读绑定，可考虑 `ScopedValue`：

```java
// 声明一个作用域值
public final static ScopedValue<User> CURRENT_USER = ScopedValue.newInstance();

// 在入口层绑定
ScopedValue.where(CURRENT_USER, user).run(() -> {
    orderService.createOrder(); // 闭包内所有深层调用都能取到 user
});

// 在深层业务中获取
User user = CURRENT_USER.get();
```

这是项目类型与方法的片段。绑定不可重新赋值，不代表 `User` 对象本身不可变，也不自动复制它。Java 21 是预览 API，需要 `--enable-preview`；JDK 25 才正式化。[JEP 446](https://openjdk.org/jeps/446)、[JEP 506](https://openjdk.org/jeps/506)

| 工作负载 | 起点 |
| --- | --- |
| 网络、数据库等长 I/O 等待 | 评估虚拟线程，保留下游并发上限 |
| 长时间 CPU 计算 | 有界平台线程池或 ForkJoinPool，按 CPU 和压测调整 |
| 现有响应式链路 | 不必为了虚拟线程重写；先证明收益与兼容性 |

配置依据：[Spring Boot 虚拟线程](https://docs.spring.io/spring-boot/reference/features/spring-application.html#features.spring-application.virtual-threads)。
