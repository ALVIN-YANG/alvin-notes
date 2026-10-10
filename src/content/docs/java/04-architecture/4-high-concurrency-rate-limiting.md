---
title: "限流与熔断：Guava、Sentinel 怎么用"
description: "限流与熔断在流量超载时主动拒绝部分请求、保住核心链路。对比四种限流算法，介绍单机 Guava RateLimiter 与集群级 Alibaba Sentinel 的限流、熔断、自适应保护用法。"
sidebar:
  order: 4
date: 2026-01-21
lastUpdated: 2026-10-11
---

限流（Rate Limiting）和熔断（Circuit Breaking）解决的是同一个问题：**当流量或下游故障超出系统承载能力时，主动拒绝一部分请求，保住核心链路**。超载可能耗尽线程、连接或 CPU，故障顺序取决于瓶颈。限流控制进入量，熔断减少对故障依赖的调用，通常需要配合超时和并发上限。

两个工具的采用边界：Guava RateLimiter 只保护单机内的方法级入口，实现简单；Sentinel 提供单机规则，也支持集群限流；集群总额度需要配置 token server、客户端和降级策略，不能只启动控制台就得到全局限流。[集群配置](https://sentinelguard.io/en-us/docs/cluster-flow-control.html)

## 1. 四种限流算法

| 算法 | 适合的控制 | 边界 |
| --- | --- | --- |
| 固定窗口 | 每个时间段的配额 | 相邻窗口交界可能出现短时突刺 |
| 滑动窗口 | 最近一段时间的用量 | 分桶统计是近似；逐请求记录更精确但成本更高 |
| 漏桶 | 按固定速率出队 | 要定义排队容量与等待时间，满了就拒绝 |
| 令牌桶 | 平均速率，允许有限突发 | 突发上限由桶容量决定，不代表下游能承受 |

## 2. 单机限流：Guava RateLimiter

例如报表导出，可以先对单实例的入口限制许可发放速率。

直接使用 Google 的 **Guava RateLimiter**，它按速率发放 permits，允许一定突发；限制速率不等于限制同时执行数量。[Guava API](https://guava.dev/releases/33.4.8-jre/api/docs/com/google/common/util/concurrent/RateLimiter.html)

```java
// 创建一个限流器，每秒生成 5 个令牌（限制 QPS 为 5）
private final RateLimiter rateLimiter = RateLimiter.create(5.0);

public void exportData() {
    // tryAcquire 尝试获取令牌，最多等 0.5 秒。等待期间会阻塞线程；不愿等待时用无参 tryAcquire()
    if (rateLimiter.tryAcquire(500, TimeUnit.MILLISECONDS)) {
        // 拿到令牌，执行耗时的报表导出
        database.heavyQuery();
    } else {
        // 没拿到令牌，直接抛异常或返回提示
        throw new RuntimeException("当前导出人数过多，请稍后再试！");
    }
}
```

## 3. 集群限流与熔断：Alibaba Sentinel

在微服务网关集群里，单机限流不够用：10 台网关节点、总 QPS 限制 10,000，需要全局视角的防护。Netflix Hystrix 已停止维护，国内微服务体系中常用的是 **[Alibaba Sentinel](https://sentinelguard.io/zh-cn/docs/introduction.html)**。

Sentinel 除集群限流外，还提供**熔断降级**和**系统自适应保护**。

### 场景一：接口限流保护 (Flow Control)
完成集群配置后，可以定义全局规则。例如：`/api/order/create` 这个接口，整个集群每秒最多放行 2000 个请求。多出来的请求直接触发 `BlockException` 返回给前端“活动太火爆”。

### 场景二：熔断降级 (Circuit Breaking) - 防止被慢依赖拖垮
微服务最怕的是“雪崩效应”。你的服务 A 调用了服务 B。某天服务 B 的数据库卡了，原本 10ms 的接口变成了 10s 才返回。
此时服务 A 所有的线程都会因为等待 B 而被卡死，最终导致 A 也崩溃。

熔断规则按配置统计：
例如，按配置的统计窗口和最小请求数，慢调用比例或异常比例达到阈值。50% 和 20% 只能是自定义示例，不是默认值。
Sentinel 会直接**“熔断（断路器打开）”**。此后 A 调用 B 的请求，根本不会发出去网络包，而是抛出阻断信号；应用需明确配置 block handler 或合适的降级响应，不会自动产生正确的业务默认值。
等 B 恢复健康了，Sentinel 还会半开（Half-Open）去试探一下，确认没问题了再恢复流量。

### 场景三：系统自适应保护 (System Load Protection)
有时候很难事先确定接口该限多少 QPS（随着新代码上线，处理能力一直在变）。
可以开启系统自适应保护：**按配置的 CPU、Load、并发数或响应时间等规则保护入口；它不能代替业务级配额和下游容量控制。** 这是一种基于机器物理指标的兜底防线。

## 总结

- 保护单机内的耗时方法（如报表导出）：用轻量的 **Guava RateLimiter**。
- 集群级限流、防止慢依赖引发雪崩、需要可视化规则管理：评估 **Sentinel**。

限流阈值不是拍出来的：按压测得到的系统容量设定，并随容量变化定期复核。
