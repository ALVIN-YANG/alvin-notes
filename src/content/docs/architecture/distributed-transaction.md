---
title: 分布式事务方案选型
description: 从一致性模型出发，对比 Outbox Pattern、事务消息、Seata、TCC、SAGA、2PC/XA 及现代工作流引擎的适用场景与工程取舍
sidebar:
  label: 分布式事务选型
date: 2025-10-20
lastUpdated: 2026-10-11
---

## 核心问题

事务解决的是数据一致性问题——要么全成功，要么全失败。当操作跨越多个服务、数据库或第三方系统时，就进入了分布式事务的领域。

分布式事务没有银弹。每种方案都在**一致性强度、性能损耗、实现复杂度、运维成本**之间做取舍。选型的关键不是哪个方案"最好"，而是哪个方案最匹配你的业务约束。

### 第一原则：能避免就避免

分布式事务的最优解是不需要分布式事务：

- 服务拆分时把强相关的数据操作留在同一个服务、同一个数据库，用本地事务保证 ACID
- 评估业务是否真的需要强一致——很多场景下最终一致就够了
- 将原子操作内聚到单个服务中，而不是分散到多个服务再用分布式事务"兜底"

---

## 一致性模型：你的业务需要多"一致"？

### CAP 定理的正确理解

CAP 定理指出，分布式系统在遇到**网络分区**时，必须在一致性和可用性之间选择：

| 特性 | 含义 |
|------|------|
| **一致性（C）** | 所有节点在同一时间看到相同的数据 |
| **可用性（A）** | 每个请求都能在有限时间内得到响应 |
| **分区容错（P）** | 网络分区（节点间通信中断）时系统仍能运行 |

一个常见误解是把"服务宕机"等同于"网络分区"——两者不同。网络分区是指节点都活着但彼此无法通信。在真实的分布式系统中，网络分区虽然不常发生，但必须为它做设计，因此 P 是前提，选择实际上是 CP 还是 AP。

### PACELC：更实用的思考框架

CAP 只描述了分区发生时的选择，但大部分时间系统是正常运行的。PACELC 模型补充了这一点：

> 如果有分区（P），选择 A 还是 C；否则（E），选择低延迟（L）还是一致性（C）。

这意味着即使没有网络故障，你也在**延迟和一致性之间做取舍**。这才是日常开发中更频繁遇到的决策。

### 实践中的选择

| 业务场景 | 一致性要求 | 推荐模型 |
|---------|-----------|---------|
| 资金、支付、账户余额 | 强一致 | CP — 宁可短暂不可用也不能数据错 |
| 订单状态、库存扣减 | 最终一致（秒级） | AP + 补偿 |
| 通知、日志、统计 | 最终一致（分钟级） | AP — 异步即可 |

---

## 方案一：Transactional Outbox Pattern（本地消息表）

这是分布式事务中通用性好、业务侵入低的方案，也是实践中被大量采用的模式。

### 原理

核心思想：将"业务操作"和"发送消息"放在同一个本地事务中，用数据库事务保证两者的原子性。

```
本地事务 {
  1. 执行业务操作（如创建订单）
  2. 写入消息到 outbox 表
}
→ 异步进程读取 outbox 表，投递消息到 MQ
→ 下游消费并处理
```

### 消息投递的两种方式

**轮询（Polling）**

最简单的实现：定时任务扫描 outbox 表，发送未投递的消息。

- 优点：实现简单，无额外基础设施依赖
- 缺点：轮询间隔决定了延迟下限，频繁轮询对数据库有压力

**CDC（Change Data Capture）**

用 Debezium 等工具监听数据库 binlog，实时捕获 outbox 表的变更并投递到 Kafka。

- 优点：近实时、不增加数据库查询压力、与业务代码完全解耦
- 缺点：需要部署和维护 Debezium + Kafka Connect

对于新项目，**推荐 CDC 方案**。轮询在早期够用，但随着消息量增长会成为瓶颈。

### Outbox 表设计

```sql
CREATE TABLE outbox_event (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aggregate_type VARCHAR(64) NOT NULL COMMENT '聚合根类型，如 Order、Inventory',
  aggregate_id VARCHAR(128) NOT NULL COMMENT '聚合根 ID',
  event_type VARCHAR(128) NOT NULL COMMENT '事件类型，如 OrderCreated',
  payload JSON NOT NULL COMMENT '事件内容',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0=待发送 1=已发送',
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 5,
  next_retry_at DATETIME(3) COMMENT '下次重试时间',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_status_retry (status, next_retry_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Outbox 事件表';
```

### 消费端幂等

消息至少投递一次（at-least-once），消费端必须实现幂等：

- 方案一：消费前查幂等表，已处理则跳过
- 方案二：利用数据库唯一约束，重复插入自然失败
- 关键：幂等键的选择比幂等机制本身更重要——用业务 ID + 操作类型，而不是消息 ID

### 适用场景

跨服务的异步协作，是大多数微服务架构的首选方案。尤其适合：
- 大流量场景（异步解耦，削峰填谷）
- 对延迟要求不苛刻（秒级最终一致可接受）
- 团队跨部门协作（无需对方接入特定中间件）

---

## 方案二：事务消息（RocketMQ）

### 原理

RocketMQ 的事务消息与 Outbox Pattern 解决的是同一个问题——"本地事务"与"消息投递"的原子性，但实现机制不同：Outbox 靠业务库里的消息表加轮询/CDC，事务消息靠 MQ 的半消息与回查协议：

```
1. 发送半消息（Half Message）→ MQ 暂存，消费者不可见
2. 执行本地事务
3. 根据本地事务结果，提交或回滚半消息
4. 如果 MQ 未收到确认，主动回查本地事务状态
```

因此不能简单说"事务消息就是 Outbox 的中间件化实现"：Outbox 的消息先落库、投递路径可见可查；事务消息的可靠性依赖 MQ 的回查机制，业务方必须实现回查接口。

### 对比 Outbox

| 维度 | Outbox + CDC | RocketMQ 事务消息 |
|------|-------------|-----------------|
| 基础设施 | DB + Debezium + Kafka | RocketMQ |
| 业务侵入 | 低（只需写 outbox 表） | 中（需实现回查接口） |
| 可靠性 | 依赖 DB 事务 | 依赖 MQ 的半消息机制 |
| 适用 MQ | 任意 | 仅 RocketMQ |

### 适用场景

团队已在使用 RocketMQ 且不想引入 CDC 基础设施时，事务消息是更轻量的选择。但要注意它**锁定了 MQ 选型**——如果未来要迁移到 Kafka，事务消息的实现需要全部重写。

---

## 方案三：Seata

Seata 是一个开源的分布式事务中间件，提供多种模式。适合团队能够承受额外运维一个有状态中间件的成本。

### AT 模式（自动补偿）

原理：通过 SQL 拦截，自动生成 undo log，失败时自动回滚。

```
全局事务开始
  → 分支事务1：执行 SQL，自动生成前后镜像（undo log）
  → 分支事务2：同上
全局事务提交 → 删除 undo log
全局事务回滚 → 根据 undo log 自动恢复
```

**优点**：业务代码零侵入，加个 `@GlobalTransactional` 注解就能用。

**性能来源与代价**：AT 的第一阶段在本地事务提交后**立刻释放本地数据库锁**（undo log 留在各参与方库中），这是它比 XA 全程持锁并发更高的根本原因；代价是每个分支事务都要生成前后镜像，写放大明显。

**缺点与风险**：
- 全局锁机制可能导致热点行竞争和死锁
- 只支持关系型数据库
- undo log 表需要部署到每个参与方的数据库

**AT 的脏写边界（接入时必须评估）**：因为第一阶段就释放了本地锁，全局事务未结束前数据已对外可见。如果此时一个**没有接入 Seata 的系统**（老服务、DBA 手工修数、其他直连数据库的工具）修改了同一行数据，回滚时 Seata 比对 undo log 发现现状与镜像不一致，会拒绝自动回滚并抛出异常，需要人工介入修数据。因此 AT 要求**所有会写相关数据表的链路都接入 Seata 全局锁**，否则一致性承诺不成立。

**适用场景**：内部管理系统、低并发的后台操作，且数据写入方全部接入 Seata。**不建议用在高并发的 C 端核心链路**。

### TCC 模式（Try-Confirm-Cancel）

原理：业务方自行实现三个阶段的逻辑，Seata 负责协调执行。

| 阶段 | 职责 | 示例（库存扣减） |
|------|------|----------------|
| Try | 预留资源 | 冻结库存（available -= 10, frozen += 10） |
| Confirm | 确认提交 | 扣除冻结（frozen -= 10） |
| Cancel | 释放资源 | 解冻库存（available += 10, frozen -= 10） |

**优点**：
- 无全局锁，性能好
- 不限数据库类型
- 资源预留期间不阻塞其他事务

**缺点**：
- 业务侵入性强——每个参与方都要实现三个接口
- 需要新增字段（如冻结数量）来支持资源预留
- 空回滚、悬挂问题需要额外处理

**适用场景**：高并发核心链路（支付、库存），对性能要求高且团队有能力维护补偿逻辑。

### SAGA 模式

原理：将长事务拆分为一系列本地事务，每个本地事务有对应的补偿操作。失败时按逆序执行补偿。

```
T1 → T2 → T3（失败）→ C2 → C1
```

Saga 没有框架层的自动回滚魔术，它是**业务层面的补偿**：必须为每个本地事务**人工编写一个正向操作和一个逆向补偿操作**。例如订单服务执行 `createOrder()`，补偿是 `cancelOrder()`；调用外部航空公司 API `bookTicket()`，补偿是 `refundTicket()`。第三步失败时，状态机按逆序执行补偿。

**优点**：
- 没有全局锁，适合长流程（可能跑几分钟的订票、订酒店类编排）、跨部门的业务编排
- 支持通过状态机定义流程，可视化程度高
- 天然适合有第三方调用的场景（第三方不可能接入你的事务框架，也不可能让你的框架往它的库里写 undo log）

**缺点**：
- 开发成本高：每写一个业务方法都要配对写补偿方法
- 补偿逻辑复杂，每个步骤都需要幂等
- 需要自行处理"空补偿"（补偿请求先于正向请求到达）、"防悬挂"等边界条件
- 没有隔离性——中间状态对外可见
- 状态机本身的学习和维护成本

**适用场景**：跨部门长流程（订单 → 支付 → 库存 → 物流），涉及外部系统调用。

---

## 方案四：2PC / XA

### 原理

协调者（Transaction Manager）分两阶段协调所有参与者：

```
阶段一（Prepare）：协调者问所有参与者"能提交吗？" → 参与者锁定资源并响应
阶段二（Commit/Rollback）：全部同意则提交，任一拒绝则回滚
```

### 经典问题

- **同步阻塞**：Prepare 到 Commit 之间所有参与者持锁等待
- **协调者单点**：协调者宕机，参与者锁定状态无法释放
- **数据不一致**：Commit 阶段部分参与者网络超时，可能出现不一致

### 现代演进

早期 XA 被广泛否定，但现代分布式数据库（如 TiDB、CockroachDB、OceanBase）在内部实现了优化版的 2PC，通过 Raft/Paxos 共识解决了协调者单点和一致性问题。

**如果你的业务确实需要跨库强一致，优先考虑使用原生支持分布式事务的数据库**，而不是在应用层实现 XA。

### 适用场景

应用层的 XA 基本不推荐。但如果选用了 TiDB/OceanBase 等分布式数据库，其内置的事务机制本质上是优化过的 2PC，可以放心使用。

---

## 方案五：工作流引擎（Temporal / Cadence）

这是近年来快速崛起的现代方案，值得重点关注。

### 原理

将分布式事务建模为**持久化的工作流（Durable Workflow）**：

```java
// Temporal Workflow 示例（概念性）
public void orderWorkflow(OrderRequest request) {
    OrderResult order = activities.createOrder(request);     // 自动重试
    InventoryResult inv = activities.deductInventory(order);  // 失败自动补偿
    activities.sendNotification(order);                       // 幂等执行
}
```

工作流引擎保证：
- 每个 Activity 至少执行一次，失败自动重试
- 工作流状态持久化，进程崩溃后从断点恢复
- 支持定义补偿逻辑（类似 SAGA，但编程模型更自然）
- 内置超时、重试策略、可视化监控

### 对比传统方案

| 维度 | Outbox + MQ | Seata | Temporal |
|------|-----------|-------|---------|
| 编程模型 | 事件驱动（异步回调） | 注解/接口 | 顺序代码（像写本地逻辑） |
| 状态管理 | 自行维护 | 中间件管理 | 引擎自动持久化 |
| 可观测性 | 需自建 | 有限 | 内置 Dashboard |
| 学习曲线 | 低 | 中 | 中高 |
| 运维成本 | MQ + DB | Seata Server | Temporal Server + DB |

### 适用场景

- 业务流程复杂、步骤多、涉及多个外部系统
- 需要可视化流程状态和执行历史
- 团队愿意接受新的编程模型

---

## 选型决策路径

```
业务需要分布式事务吗？
├── 能通过服务合并避免 → 合并服务，用本地事务
└── 不能避免
    ├── 需要强一致？
    │   ├── 可以用分布式数据库 → TiDB / OceanBase（内置优化 2PC）
    │   └── 不能换数据库
    │       ├── 低并发内部系统 → Seata AT
    │       └── 高并发核心链路 → TCC
    └── 最终一致可接受？
        ├── 流程简单（2-3 步）→ Outbox Pattern（轮询或 CDC）
        ├── 已用 RocketMQ → 事务消息
        ├── 流程复杂 / 涉及第三方 → SAGA 或 Temporal
        └── 长流程 + 需要可视化 → Temporal
```

---

## 贯穿所有方案的工程要点

### 幂等性

无论选择哪种方案，幂等都是基础要求。每个参与方都必须能够安全地处理重复请求。

### 超时与重试

- 所有远程调用设置合理的超时时间
- 重试使用指数退避 + 抖动（jitter），避免重试风暴
- 区分可重试错误（网络超时）和不可重试错误（参数校验失败）

### 可观测性

分布式事务的调试难度远高于本地事务。从第一天就要建立：

- 全局事务 ID 贯穿所有服务的日志
- 每个分支事务的状态、耗时、重试次数
- 补偿操作的执行情况
- 长时间未完成的事务告警

### 兜底机制

所有自动化方案都需要人工兜底：

- 死信队列处理多次重试失败的消息
- 提供管理后台查看和手动处理异常事务
- 对账机制：定期比对上下游数据，发现不一致及时修复

---

## 延伸阅读

- [事件驱动架构怎么落地：Outbox、幂等、顺序与重放](/architecture/event-driven-architecture-outbox-idempotency/)
- [Seata 官方文档](https://seata.apache.org/zh-cn/docs/user/quickstart/)
- [Temporal 官方文档](https://docs.temporal.io/)
- [Microservices Patterns - Chris Richardson（Transactional Outbox）](https://microservices.io/patterns/data/transactional-outbox.html)
- [Debezium Outbox Event Router](https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html)
