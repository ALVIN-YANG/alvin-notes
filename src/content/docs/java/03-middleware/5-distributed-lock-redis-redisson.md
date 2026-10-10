---
title: "分布式锁：租约、续期与旧执行者怎样处理"
description: "用一次锁过期后的并发写入，说明 Redis 原子操作、Redisson 看门狗、故障切换和 Fencing Token 的边界。"
sidebar:
  order: 5
date: 2025-12-24
lastUpdated: 2026-10-11
---

**分布式锁分配一段有期限的执行权，不能证明旧进程已经停止。** Redis 原子加锁、持有者校验和 Redisson 自动续期减少常见错误；真正怕并发写坏数据的资源，还要校验业务唯一键、状态版本或 Fencing Token。

不是所有多实例任务都需要锁。单条数据库条件更新、唯一约束或队列串行化能解决时，先比较这些方案。锁服务、资源端和业务幂等要分别设计。

## 一个锁过期的例子

假设锁有效 10 秒，进程 A 停顿后到第 12 秒才继续；B 已在第 10 秒后获得新锁。

| 动作 | 风险 | 防护 |
| --- | --- | --- |
| A 恢复后继续写 | A、B 可能同时操作资源 | 资源拒绝旧执行序号，业务状态条件更新 |
| A 直接 `DEL` | 可能删除 B 的锁 | 原子校验持有者，再删除 |
| A 先 `GET` 再 `DEL` | 两步之间可过期、被接管 | 校验和删除放在一个原子操作里 |

Redis 的常见加锁命令是 `SET key token NX PX ...`，不是带过期参数的 `SETNX`。token 对应这次持有者，解锁需校验它。[Redis 锁模式](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)

## Redisson 帮忙处理什么

| 机制 | 能做什么 | 不能保证什么 |
| --- | --- | --- |
| 持有者与原子脚本 | 判断哪个客户端线程持锁，减少误解锁 | 不能让已发出的资源写入自动撤销 |
| Watchdog 续期 | 未指定 leaseTime 时延长锁有效期 | 停顿、网络故障或客户端退出仍可能错过续期 |
| 指定 leaseTime | 到期自动释放 | 业务不会因此自动停止，时长要匹配任务 |

Redisson 的 watchdog 默认超时为 30 秒，可用 `lockWatchdogTimeout` 调整；只有锁持有线程能解锁，实际行为按使用版本核对。[Redisson Lock 文档](https://redisson.pro/docs/data-and-services/locks-and-synchronizers/)

```java
// redisson 与 processOrder 是项目提供的客户端和业务方法
RLock lock = redisson.getLock("my_lock");
lock.lock(); // 不指定 leaseTime，使用 watchdog
try {
    processOrder();
} finally {
    lock.unlock();
}
```

生产链路还要限定等待时间并处理抢锁失败，不把无界阻塞当默认。Lua 的“原子执行”表示其他请求不能在脚本中间插入，不表示运行报错会回滚此前写入。[Redis Lua 执行语义](https://redis.io/docs/latest/develop/programmability/eval-intro/)

## 故障切换和进程停顿是两类问题

Redis 异步复制中，锁写入尚未复制到副本时主节点故障，新主节点可能没有这条锁，另一个客户端可再次获得执行权。这是故障切换丢锁窗口，不能只靠 Watchdog 消除。[Redis 复制与锁边界](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)

即便锁服务没有丢记录，旧持有者也可能停顿超过租约后恢复。这时要由**资源端**拒绝过期执行者。[Kleppmann：How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)

## Fencing Token 需要资源配合

每次领取执行权获得递增序号，写入携带该序号，资源端原子拒绝小于已接受序号的操作。旧 A 带 7，接管后的 B 带 8；资源已接受 8 后，A 的 7 不能覆盖它。

| 条件 | 为什么 |
| --- | --- |
| 序号在资源范围内单调、不回退 | 普通异步 Redis 的 `INCR` 也可能在切换时回退，不能直接当可靠 fencing |
| 资源实际校验序号 | 仅在客户端检查锁状态，检查后仍可能失去租约 |
| 副作用可去重 | fencing 防旧写，不自动消除同一操作的重复付款或发信 |

外部 API 不支持这种校验时，需要业务操作 ID、状态查询或人工核对，不能只靠客户端锁宣称安全。

## 选型与验收

ZooKeeper 的临时顺序节点可组织锁；会话过期会删除节点，但暂停的客户端仍可能恢复执行，资源保护依然需要。[ZooKeeper 锁配方](https://zookeeper.apache.org/doc/current/recipes.html#sc_recipes_Locks)

Redlock 使用多个独立 Redis 实例，也有时钟、暂停和故障假设；Redis 作者的方案与 Kleppmann 的批评需要一起评估，不能只看“用了多数节点”。

| 要守住的结果 | 验收方式 |
| --- | --- |
| 不误删新锁 | 旧持有者恢复并尝试解锁 |
| 不接受旧写 | 租约过期、接管后旧进程继续提交 |
| 不重复业务动作 | 相同操作 ID 并发、超时后重试 |
| 故障能收敛 | 锁服务切换、失联、续期失败、进程停顿 |

选择取决于锁失效的后果与资源是否支持校验，不能用“Redis 是 AP、ZooKeeper 是 CP”替代端到端正确性论证。[接口幂等设计](/java/04-architecture/3-api-idempotency-design/)
