---
title: "现代 Java 并发锁选择：ReentrantLock、StampedLock 与分布式锁"
description: "synchronized 并没有过时，但在需要公平性、超时控制和虚拟线程兼容（Java 21）的场景下，ReentrantLock、StampedLock 和分布式锁各有明确的适用边界，按场景给出选择依据。"
sidebar:
  order: 5
date: 2025-09-13
lastUpdated: 2026-10-11
---

选择锁先看需要的能力：普通临界区用 `synchronized`；需要超时、可中断或公平策略，选 `ReentrantLock`；短小的只读快照可以评估 `StampedLock`。跨 JVM 的业务冲突则需要数据库约束或分布式协调，单机锁拦不住。

| 需求 | 候选 | 边界 |
| --- | --- | --- |
| 简单状态互斥 | `synchronized` | 不提供超时获取 |
| 超时、可中断、公平策略 | `ReentrantLock` | 自己保证释放；公平策略不是线程调度保证 |
| 读多写少的短快照 | `StampedLock` | 乐观读必须校验，不可重入 |
| 多节点修改同一业务对象 | 数据库条件更新、唯一约束；必要时加分布式锁 | 锁不代替幂等，过期后旧执行者仍可能继续 |

## 1. 需要超时与公平：ReentrantLock

`ReentrantLock`（可重入锁）相比 `synchronized` 多出的能力主要有三个：

1. **公平锁**：`new ReentrantLock(true)` 在竞争时倾向于等待最久的线程，可能降低吞吐；不保证线程调度公平，且无参 `tryLock()` 不遵守公平策略。[JDK 文档](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html)
2. **尝试获取与超时**：`tryLock(5, TimeUnit.SECONDS)` 拿不到锁可以直接向调用方返回"系统繁忙"，而不是无限期死等。
3. **Java 21 上规避 Pinning**：在 Java 21 上，虚拟线程于 `synchronized` 块内阻塞会被钉在载体线程上，而 `ReentrantLock.lock()` 阻塞时可以正常卸载。这个差异适用于 JDK 21–23；JDK 24 的 [JEP 491](https://openjdk.org/jeps/491) 消除了由 monitor 引起的主要 Pinning（详见本专栏[虚拟线程一文](/java/01-core/1-java21-virtual-threads/)）。

**标准模板：**

```java
Lock lock = new ReentrantLock();
// 注意：不要把 lock() 写在 try 块里面
lock.lock();
try {
    // 保护临界区资源
    inventory.decrement();
} finally {
    // 确保任何异常发生都能释放锁
    lock.unlock();
}
```

如果只是普通的对象内状态保护、临界区内没有阻塞 I/O，`synchronized` 完全够用，代码还更简洁，不必为了用 `ReentrantLock` 而用。

## 2. 读多写少：StampedLock

例如，坐标快照读多写少，可以先读取再校验 stamp。校验前可能读到不一致的组合，因此这段读取不能执行不可撤销的业务动作。

JDK 8 引入的 **StampedLock（邮戳锁）** 针对这个场景提供了**乐观读（Optimistic Read）**：读之前只取一个"邮戳（版本号）"，读完校验邮戳是否被写线程改过；没改过就直接用读到的数据，全程不加悲观锁。

```java
public class Point {
    private double x, y;
    private final StampedLock sl = new StampedLock();

    // 只读方法
    public double distanceFromOrigin() {
        // 1. 获取乐观读邮戳（开销极低）
        long stamp = sl.tryOptimisticRead();
        double currentX = x, currentY = y;

        // 2. 校验期间是否有写入发生
        if (!sl.validate(stamp)) {
            // 校验失败说明数据被改过，升级为悲观读锁重新获取
            stamp = sl.readLock();
            try {
                currentX = x;
                currentY = y;
            } finally {
                sl.unlockRead(stamp);
            }
        }
        return Math.hypot(currentX, currentY);
    }
}
```

StampedLock 的代价是 API 更容易用错：它**不可重入**，乐观读校验失败后的升级路径必须写对。读远多于写、且临界区很短的场景才值得引入。

## 3. 跨 JVM 互斥：分布式锁

`ReentrantLock` 和 `StampedLock` 都是 **JVM 级别的内存锁**。服务部署多个节点后，同一个订单的退款请求可能落到不同节点上，JVM 内的锁完全拦不住跨节点的并发。

### 常用方案：Redis + Redisson

不要手写 `setnx` + `expire`（过期时间与误删问题在[分布式锁原理一文](/java/03-middleware/5-distributed-lock-redis-redisson/)中有详细分析）。Redisson 用 Lua 处理锁操作，并提供看门狗续期；它不能保证网络故障或长时间暂停后仍持有锁。以下是项目片段：

```java
@Autowired
private RedissonClient redisson;

public void refund(String orderId) {
    RLock lock = redisson.getLock("refund_lock:" + orderId);

    // 最多等待 3 秒；不传 leaseTime，由看门狗自动续期
    boolean isLocked = false;
    try {
        isLocked = lock.tryLock(3, -1, TimeUnit.SECONDS);
        if (isLocked) {
            // 执行退款逻辑
        } else {
            throw new BusinessException("系统正在处理中，请勿重复点击");
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
    } finally {
        if (isLocked && lock.isHeldByCurrentThread()) {
            lock.unlock();
        }
    }
}
```

### 两个必须知道的边界

1. **分布式锁不等于幂等**。锁在其租约和故障假设成立时提供互斥，挡不住释放后的重复请求，也不能阻止过期持有者继续执行。退款这类资金操作，除了锁，还必须有幂等兜底：唯一流水号索引、状态机条件更新（`WHERE status = 'UNPAID'`）等，具体见[接口幂等性设计](/java/04-architecture/3-api-idempotency-design/)。
2. **Redisson 不是万能的**。Redis 异步复制与故障切换可能使已取得的锁丢失。换 ZooKeeper 也不能自动阻止会话过期后恢复的旧执行者；强互斥需要资源端校验 fencing，资金操作还要有持久化幂等约束。分析见[分布式锁的深水区](/java/03-middleware/5-distributed-lock-redis-redisson/)。
