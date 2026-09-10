---
title: "DDD 战术设计落地：在 Java 工程中如何划分防腐层与聚合根"
description: "如果你的 Service 层只有几十行调用 Mapper 的代码，你的 Entity 全是 Getter/Setter。那你写的根本不是面向对象，而是“面向数据库的脚本”。本文带你在 Java 中真正落地 DDD 战术。"
slug: java/04-architecture/5-ddd-tactical-design
sidebar:
  order: 5
date: 2026-01-28
lastUpdated: 2026-03-16
---

在技术圈，**领域驱动设计（Domain-Driven Design, DDD）** 是一个让人又爱又恨的词。
听架构师讲 PPT 时，满屏的“限界上下文”、“聚合根”、“防腐层”，觉得高大上得不行。但到了自己写代码时，默默地建了包名：`controller`、`service`、`entity`、`mapper`，然后继续在 Service 里写着 1000 行面条一样的 CRUD。

在 2026 年，如果微服务的代码依然保持着这种**贫血模型（Anemic Domain Model）**，微服务拆分将毫无意义。今天我们不讲抽象的理论，只讲怎么在 Java 工程里把 DDD 战术落到实处。

## 1. 痛点：贫血模型的恶果

什么是贫血模型？看看你写的 Entity 就知道了：
```java
@Data
public class Order {
    private Long id;
    private BigDecimal totalAmount;
    private Integer status; // 0:新建, 1:已支付, 2:已发货
}
```
它只是一个装载数据的壳子。所有的**业务逻辑（行为）**全被剥离到了 `OrderService` 里：
```java
public void payOrder(Long orderId) {
    Order order = orderMapper.findById(orderId);
    if (order.getStatus() != 0) {
        throw new Exception("订单不能支付");
    }
    order.setStatus(1); // 直接改值
    orderMapper.update(order);
}
```
后果是什么？当有人写了一个定时任务去处理订单异常时，他不知道你定下的 `status` 规则，他可能直接 `order.setStatus(2)` 绕过了所有校验。业务规则散落在系统的各个 Service 甚至各个微服务中，最后谁都不知道一个订单到底经历了怎样的折磨。

## 2. 核心转变：充血模型与聚合根 (Aggregate Root)

在 DDD 中，**行为（方法）必须回归到实体内部。实体不仅要有属性，还要有保护自己属性不被破坏的业务规则。**

这个被选出来的、代表业务核心生命周期的实体，叫做 **聚合根**。

改造后的充血模型 `Order`：
```java
public class Order { // 这是一个聚合根
    private Long id;
    private BigDecimal totalAmount;
    private OrderStatus status; // 强类型的枚举
    private List<OrderItem> items; // 订单明细（聚合内的实体）

    // 状态修改不对外暴露 Setter！严禁外界直接 order.setStatus()
    
    // 业务行为：支付订单
    public void pay() {
        if (this.status != OrderStatus.CREATED) {
            throw new DomainException("仅新建状态的订单允许支付");
        }
        this.status = OrderStatus.PAID;
        // 顺便在此处触发内部明细的更新...
    }
}
```

现在，`OrderService` 变成了纯粹的**应用服务（Application Service）**，它变得极其轻薄，只负责编排（查出数据、调用实体行为、保存数据）：
```java
@Transactional
public void payOrder(Long orderId) {
    // 1. 获取聚合根
    Order order = orderRepository.findById(orderId);
    
    // 2. 执行领域行为（状态校验全在 Order 内部闭环）
    order.pay();
    
    // 3. 落库持久化
    orderRepository.save(order);
}
```
这种代码，哪怕给实习生看，他也绝对不可能把订单状态改乱。

## 3. 防腐层 (ACL) 的落地：隔离肮脏的外部世界

微服务开发中，我们经常要调用其他部门的接口（比如调用微信支付接口，或者调用物流系统）。
最糟糕的做法是，直接把微信的 `WechatPayResponseDTO` 在你的 `OrderService` 里传来传去，甚至直接塞进数据库。一旦微信 API 升级字段名变了，你的整个核心代码库都要被扒一层皮。

**防腐层（Anti-Corruption Layer, ACL）**的出现就是为了解决这个。

**包结构设计：**
1. **领域层 (domain)**：定义我们自己绝对纯洁的接口 `PaymentGateway`。
```java
// 在 domain 层，只定义接口，不依赖任何 Spring 或第三方库
public interface PaymentGateway {
    boolean processPayment(Order order);
}
```

2. **基础设施层 (infrastructure)**：这是用来放脏东西的隔离区。
我们在这里写一个实现类 `WechatPaymentAdapter`。
```java
@Component
public class WechatPaymentAdapter implements PaymentGateway {
    
    @Autowired
    private WechatSdk wechatSdk; // 脏脏的第三方依赖

    @Override
    public boolean processPayment(Order order) {
        // 1. 将我们纯洁的 Order 翻译成微信认识的肮脏 DTO
        WechatRequest req = new WechatRequest(order.getId(), order.getTotalAmount().intValue());
        
        // 2. 调用第三方
        WechatResponse resp = wechatSdk.doPay(req);
        
        // 3. 将肮脏的返回结果，翻译成我们领域认识的布尔值
        return resp.getReturnCode().equals("SUCCESS");
    }
}
```
外界（基础设施）再怎么脏、怎么变，都被死死地拦在了这个 `Adapter` 适配器里。我们核心的业务层永远只和自己定义的纯洁接口打交道。

## 4. 2026 推荐工程目录包结构

最后，给大家一份符合 DDD 战术设计的标准 Java 工程骨架目录：

```text
com.company.project
├── api (或 interfaces)         // 对外的入口：Spring MVC Controllers, MQ 消费者, GraphQL
├── application                 // 应用服务：很薄的一层，负责编排组合，管理事务 (@Transactional)
├── domain                      // 绝对的核心：聚合根(Aggregate), 实体(Entity), 值对象(VO), 仓储接口(Repository Interfaces)
└── infrastructure              // 基础设施防腐层：MyBatis 映射器实现, Redis 操作, 外部 Feign 接口调用实现
```

## 总结

落地 DDD 并不需要引入多么高深的框架。它本质上是一种**对业务规则极度洁癖的代码组织方式**。
- 让失血的实体重新拥有行为。
- 让外挂的仓储接口与外部 API 调用被死死地按在基础设施层。

当你习惯了这种写法，你会发现：哪怕是几年后接手这个项目，业务的核心逻辑依然清清楚楚地写在实体类里，而不是在一堆犹如迷宫般的 Controller 和 Mapper XML 之间反复横跳。
