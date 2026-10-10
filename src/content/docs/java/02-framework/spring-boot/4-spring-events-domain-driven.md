---
title: "用 Spring Event 解耦业务：从贫血模型到 DDD 的第一步"
description: "用订单事件解耦单体模块，分清同步、异步、提交后监听与可靠交付的边界。"
sidebar:
  order: 4
date: 2025-10-17
lastUpdated: 2026-10-11
---

**Spring Event 把“订单已创建”发布给关心它的模块，减少订单服务对通知等模块的直接依赖。** 默认监听同步执行，并不自动变成后台消息。需要提交后触发时，用 `@TransactionalEventListener`；不能丢的交付要另加持久化与重试。

先区分业务主干与通知。订单、库存、优惠券若必须一起成功，就不能仅为解耦把后两者改成异步事件；邮件等提交后动作可以独立处理。以下是模块结构片段，实体、DTO、依赖注入和异步配置由项目提供。

## 一个订单事件的最小链路

定义事实：

```java
public record OrderCreatedEvent(String orderId, Long userId, BigDecimal amount) {
}
```

订单服务保存后发布：

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void createOrder(OrderDTO dto) {
        // 1. 业务主干：仅仅保存订单，干净利落
        Order order = orderRepository.save(new Order(dto));
        
        // 2. 发布领域事件
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId(), order.getUserId(), order.getAmount()));
    }
}
```

事件发布发生在事务方法内，不能将它理解成“数据库已经提交”。监听器采用哪种方式决定了执行时机。[Spring 事件机制](https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html#context-functionality-events)

## 同步、异步和提交后有什么差别

| 监听方式 | 时机与影响 | 注意什么 |
| --- | --- | --- |
| `@EventListener` 默认 | 同步调用，通常在发布者线程与事务内 | 阻塞会拖慢主流程；同一事务通常可读自己的未提交写入 |
| `@Async + @EventListener` | 交给执行器，新线程可能早于提交运行 | 不继承发布者线程事务，查库可能看不到订单 |
| `@TransactionalEventListener(AFTER_COMMIT)` | 成功提交后触发 | 主事务不能被后来异常回滚；没有自动持久化重发 |
| 提交后监听再加 `@Async` | 提交后交给后台线程 | 配置 `@EnableAsync` 和执行器，定义失败记录与处理 |

需要邮件不早于提交时：

```java
@Service
@Slf4j
public class NotificationService {

    // 重点：只有当发布者的事务成功 Commit 之后，才会触发这个监听器！
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void sendEmailAfterCommit(OrderCreatedEvent event) {
        log.info("订单事务已落盘，安全地发送通知邮件给用户 {}", event.userId());
        // 发送邮件...
    }
}
```

发布时没有事务，事务事件监听默认不执行；只有明确启用 `fallbackExecution` 才处理该情况。[Spring 事务事件](https://docs.spring.io/spring-framework/reference/data-access/transaction/event.html)

## AFTER_COMMIT 不能代替可靠交付

| 故障 | 结果与处理 |
| --- | --- |
| 数据库提交后，进程在监听前退出 | 内存事件可能丢失；重要交付用同事务 Outbox |
| 监听器发信失败 | 订单已提交，另行记录失败并重试或人工补发 |
| 同步提交后监听继续写库 | 原资源可能仍可访问，但新修改不再随原事务提交；需要独立事务，例如单独 Bean 的 `REQUIRES_NEW` |
| 异步监听写库 | 新线程自己建立所需事务，不能假定继承原事务 |

提交后的数据访问限制见 [TransactionalEventListener Javadoc](https://docs.spring.io/spring-framework/docs/6.2.0/javadoc-api/org/springframework/transaction/event/TransactionalEventListener.html)。

## 从单体到跨服务

单体内用 ApplicationEvent 组织模块依赖；跨服务时把事件合同、持久化、投递、消费者幂等与恢复一起设计。Spring 事件不会自动变成 Kafka 或 RabbitMQ，也不保证发送与业务提交原子完成。

完整 SQL 与恢复链路见[Outbox、幂等与重放](/architecture/event-driven-architecture-outbox-idempotency/)和[分布式事务选型](/architecture/distributed-transaction/)。验收时分别测试提交、回滚、监听失败、重复消费和进程中断，而不只检查收到日志。
