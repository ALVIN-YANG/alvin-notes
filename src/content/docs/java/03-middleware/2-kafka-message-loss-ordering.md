---
title: "Kafka 消息可靠性与顺序消费实践"
description: "按生产者确认、副本门槛、消费位点和业务 Key 检查消息可靠性，说明幂等与顺序的范围。"
sidebar:
  order: 2
date: 2025-12-04
lastUpdated: 2026-10-11
---

**Kafka 可靠性要同时检查生产者确认、副本配置和消费者提交位点。** `send()` 返回不代表 Broker 已确认，提交 Offset 也不代表数据库写入已经完成。按业务 Key 分区保证的是同一实体的顺序，不能据此宣称全局有序。

下面以 Kafka 4.1 的普通生产者与消费者为配置参考。现代生产者在没有冲突配置时默认开启幂等、`acks=all`，仍需核对实际配置；不能笼统说“默认只顾吞吐”。端到端数据库或外部操作另需幂等与恢复。[Kafka 参数入口](https://kafka.apache.org/documentation/#producerconfigs)

## 生产者：检查确认与失败

```properties
acks=all
enable.idempotence=true
max.in.flight.requests.per.connection=5
# retries 可保留默认值；用 delivery.timeout.ms 限定投递等待
# 旧式非幂等配置若需保守保序，可评估 max.in.flight=1 的吞吐代价
```

幂等要求 `acks=all`、`retries>0`、`max.in.flight<=5`；显式配置冲突会报错。默认的很大 retries 仍受 `delivery.timeout.ms` 和不可重试错误限制，并非无限重试。[Kafka 4.1 Producer Configs](https://kafka.apache.org/41/configuration/producer-configs/)

代码要检查 Callback 或 Future 的成功与异常，并给无法确认的发送定义持久化补救。进程内缓冲里的消息会随进程退出丢失；业务提交和消息发送之间的窗口可用[同事务 Outbox](/architecture/event-driven-architecture-outbox-idempotency/)处理。

## 副本：明确拒绝写入的底线

| 配置 | 示例 | 含义 |
| --- | --- | --- |
| Topic 副本数 | 3 | 创建 Topic 时分配 3 个副本，需要足够 Broker |
| `min.insync.replicas` | 2 | 配合 `acks=all`，同步副本不足时拒绝写入 |
| `acks=all` | 生产者参数 | 等待当前 ISR 确认，不能代替副本门槛 |

示例创建命令（地址替换为实际集群）：

```bash
kafka-topics.sh --bootstrap-server localhost:9092 --create   --topic order_topic --partitions 3 --replication-factor 3   --config min.insync.replicas=2
```

`replication.factor` 不是一项可随意写入 Topic 配置的属性名；用创建命令或管理 API 指定副本数。ISR 不足时牺牲部分写可用性，是这项策略的代价。[Kafka Topic Configs](https://kafka.apache.org/41/configuration/topic-configs/)

## 消费者：完成业务后再提交

```properties
enable.auto.commit=false
```

业务事务成功后，提交相应已完成位点。数据库已提交、Offset 提交失败时消息会重放，因此消费者仍需唯一键或状态机去重。异步处理一批消息时，不能提前提交覆盖尚未完成消息的位置。[Kafka Consumer Configs](https://kafka.apache.org/41/configuration/consumer-configs/)

Spring Kafka 的 `acknowledge()` 是否立即提交，还受 AckMode 和容器配置影响。Plain Kafka 的自动提交也不能简单描述成“另一个线程每五秒替业务提交”。

## 顺序：限定到订单或账户

假设同一订单的“创建”和“支付”必须依次处理。发送时使用稳定业务 Key：

```java
kafkaTemplate.send("order_topic", String.valueOf(orderId), orderJsonMsg);
```

相同 Key 在稳定分区映射下进入同一 Partition。变更分区数量、分区器或生产者并发发送顺序时，另做迁移与顺序验证。

| 并发方案 | 顺序范围 | 需要处理 |
| --- | --- | --- |
| 分区内串行处理 | 当前分区 | 慢消息会阻塞后续消息 |
| 单线程 poll，按 Key 分到本地队列 | 同 Key 串行，不同队列并行 | 有界队列、背压、失败与连续完成位点 |

本地分发可按 `orderId` 再 Hash，进入固定工作线程的队列。只提交每个分区**连续已完成**的 Offset；前面一条失败时，后面完成也不能跳过去。重平衡时协调在途任务，避免旧、新消费者同时产生副作用。

验收用“发送后退出、业务落库后提交失败、重复消息、慢 Key、队列满、分区或分配变化”逐段检查。生产者幂等只处理 Kafka 写入重试，不替代业务操作幂等。
