---
title: "支付级接口幂等性设计：防重放与防抖"
description: "接口被重试是常态：用户连点、网关自动重试都会让同一请求到达多次。用 Redis Token 防抖、状态机条件更新、数据库唯一索引三层手段保证幂等，Stripe 的幂等设计作延伸阅读。"
sidebar:
  order: 3
date: 2026-01-14
lastUpdated: 2026-10-11
---

在微服务环境中，有一个墨菲定律：**只要你的接口允许重试，它就一定会被重试。**

原因有很多：
1. 用户在地铁里网络不好，点击“提交订单”后没反应，于是他疯狂连点了 5 次。
2. 前端的 Nginx 或者是你们自己配置的 Feign/Ribbon 客户端，在遇到网络超时（Read Timeout）时，触发了内部的自动重试机制。

如果你的接口不是**幂等（Idempotent）**的，即“执行一次和执行一百次产生的影响不同”，那么这 5 次请求打过来，用户就会被扣掉 5 笔钱，系统直接面临严重的资损客诉。

## 1. 哪些操作天然幂等？哪些极其危险？

在动手做架构前，先盘点你的 CRUD：
- `SELECT`（读）：天然幂等。查一次和查一万次，数据库没变化。
- `DELETE`（删）：天然幂等（通常情况下）。删一次记录没了，再删一万次还是没有。
- `UPDATE`（改）：
  - **绝对值更新（幂等）**：`UPDATE user SET age = 18 WHERE id = 1`。执行无数次结果一样。
  - **相对值更新（极度危险）**：`UPDATE user SET balance = balance - 100 WHERE id = 1`。重试多少次就扣多少钱！
- `INSERT`（增）：**极度危险**。每次执行都会多出一条数据。

## 2. 方案一：数据库唯一索引（最后兜底）

这是最简单、最粗暴、但也是最可靠的一道物理防线。
特别适合用于防范 `INSERT` 导致的重复数据。

**场景**：用户创建订单。
我们在数据库 `orders` 表中，除了主键 ID，再建一个**唯一约束索引（Unique Index）**，字段比如是 `order_serial_no`（由前端或者上游系统在发起请求前生成并传过来的唯一流水号）。

```sql
ALTER TABLE orders ADD UNIQUE INDEX udx_serial_no (order_serial_no);
```

当并发的 5 个插入请求同时到达时，虽然它们都通过了业务校验，但在落盘的一瞬间，MySQL 会依靠底层的 B+ 树锁机制，让第一个请求成功，让后面 4 个请求直接爆出 `DuplicateKeyException`（主键冲突）。
你在 Java 代码里捕获这个异常，友好地返回：“订单已在处理中，请勿重复提交”。

## 3. 方案二：Token 机制（Redis 防抖）

唯一索引只能保落库，如果你的接口不仅有落库，还要调别人的外部接口（比如发邮件、调银行通道），那你必须在请求刚进系统时就把它们拦住。

这就是经典的 **Token 防重放机制（PRG 模式变种）**。

1. **申请 Token**：用户进入提交页面前（或页面加载时），前端先调用后端 API 获取一个防重 Token（UUID），后端将其存入 Redis（设置 5 分钟过期）。
2. **携带 Token 提交**：用户点击提交按钮，带着业务数据和这个 Token 一起发往后端。
3. **Redis 拦截**：后端收到请求后，立刻去 Redis 里执行一段原子的 Lua 脚本或者利用 Redis 单线程特性执行删除：
   ```java
   // 使用 Redis 的 delete 操作，只有真正删除了存在的 key 才返回 true
   Boolean isSuccess = redisTemplate.delete(token);
   if (!isSuccess) {
       throw new BusinessException("请勿重复点击提交！");
   }
   ```

**解析**：5 个并发请求带着同一个 Token 到来，只有冲在最前面的那个请求能成功把 Token 从 Redis 里删掉并拿到 `true`，后续 4 个请求在删的时候发现 Token 已经没了，直接被拦截在 Controller 门外。

## 4. 方案三：状态机 + 乐观锁（高并发更新）

这招专门用来对付前面提到的极度危险的**相对值 `UPDATE`**。
在电商和支付链路里，订单或账户必定有一个“状态（Status）”或者“版本号（Version）”。

业务场景：我们要把订单状态从 `UNPAID`（未支付）改为 `PAID`（已支付）。

**不安全的写法：**
```sql
-- 没有任何防备，谁来都能改
UPDATE orders SET status = 'PAID' WHERE order_id = 123;
```

**幂等的写法（状态机）：**
我们在 SQL 层面带上它的前置状态，强行做 CAS（Compare And Swap）校验：
```sql
UPDATE orders 
SET status = 'PAID', update_time = NOW()
-- 核心灵魂：必须带上前置状态
WHERE order_id = 123 AND status = 'UNPAID';
```

当 3 个回调请求同时到达时。第一个请求成功将 `UNPAID` 改为了 `PAID`（受影响行数为 1）。
紧接着第二和第三个请求执行同样的 SQL 时，因为此时数据库里该订单的状态已经是 `PAID` 了，不再满足 `status = 'UNPAID'`，SQL 依然会执行成功，但**受影响行数返回为 0**。

你在 MyBatis 层一查，如果是 0，直接忽略或返回“支付已处理”，完美防止了重复修改或状态被逆向倒转。

## 总结

一个高可用交易系统，幂等性不是靠前端写一句 `button.disabled = true` 就能解决的。

- 对于前端的页面重复提交：用 **Token（Redis 删除防抖）** 在 Controller 层拦住。
- 对于底层的数据并发更新：用 **状态机/乐观锁（带条件 UPDATE）** 做并发控制。
- 最终数据的物理落盘兜底：用 **MySQL 唯一索引** 守住最后的底线。

延伸阅读：[Stripe 的幂等 API 设计](https://docs.stripe.com/idempotency)是业界有代表性的幂等实践参考。
