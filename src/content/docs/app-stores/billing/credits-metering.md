---
title: "Credits 发放与计量：幂等、实时扣减与日终结算"
description: "额度实现参考：账户与账单字段、唯一发放键、年付月发、用量与费率版本、整数扣减、UTC 日终封账及异常恢复。"
date: 2026-08-15
lastUpdated: 2026-10-11
verifiedAgainst: "Apple StoreKit 2、App Store Server API、App Store Server Notifications V2、App Store Connect 与 App Review Guidelines 官方文档，2026-08-15"
sidebar:
  label: Credits 发放与计量
  order: 6
---

**额度发放和额度扣减使用两套幂等依据。** 发放绑定交易或业务权益周期，扣减绑定业务请求或流式序号。余额保存整数，计量保存小数；调用期间按整数部分扣减，UTC 日结束时幂等补齐尾数。

这份参考沿用[订阅总览](/app-stores/ios/subscription-overview/)中的示例业务规则。套餐额度、到期处理、账户优先级和固定价任务收费时机必须由产品明确约定；它们不是 Apple 统一规定的计费公式。交易验签、账号归属和通知恢复由[订阅实现](/app-stores/ios/subscription-implementation/)负责。

## Credits 账户与账单

<code>credit_account</code> 保存整数余额，常见账户池有 <code>daily</code>、<code>subscription</code>、<code>bonus</code> 和 <code>paid</code>。每个账户带 <code>version</code>，扣减时用条件更新或行锁。

<code>credit_grant</code> 只记录发放、清理、人工调整和退款调整。消费不按每次调用写流水，避免高频对话把流水表撑大。

<code>credit_daily_bill_item</code> 按用户、UTC 日期、模块、计量项和费率版本累计。

| 字段 | 用途 |
| --- | --- |
| user_id | 业务用户 |
| usage_date_utc | UTC 账单日期 |
| module_code | LLM、ASR、TTS、AGORA 或其他模块 |
| metric_code | INPUT_TOKEN、OUTPUT_TOKEN、SECOND、CHARACTER、IMAGE |
| rate_version | 本次累计使用的费率版本 |
| raw_usage | 原始用量 |
| raw_credits | 尚未取整的 Credits |
| charged_credits | 已实时扣除的整数 Credits |
| finalized | 前一日账单是否已封账 |
| version | 乐观锁 |

<code>raw_usage</code> 和 <code>raw_credits</code> 使用 <code>DECIMAL(24,8)</code>，余额和最终扣减使用 <code>BIGINT</code>。原始费率经常按百万 token、千字符或秒换算，计算过程会产生小数。小数只存在于计量过程，用户余额始终是整数。

<code>credit_rate</code> 保存后台可修改的费率。每次用量进入时读取已经生效的最新版本，费率切换后新建一条账单项，旧数据保留旧版本，避免同一行里混用两种价格。

## 自动续费订单和发放

自动续费没有客户端创建订单这一步。Apple 产生新的 <code>transactionId</code> 后，通知或客户端交易监听把它送到后端。后端按 <code>transactionReason = RENEWAL</code> 创建续费订单，再执行订阅和 Credits 事务。

每个 Apple 扣款周期对应一个业务订单，这样后台能回答每次扣款发了什么。所有订单通过 <code>originalTransactionId</code> 连接成订阅链。

月付商品每次成功续费直接发放一次。年付商品若一次付款覆盖一年，却按月发 Credits，Apple 不会每月再产生交易。后端要生成自己的月度发放计划。

一套安全的年付月度发放算法如下。

1. 首次年付交易验证通过后立即发第一期。
2. 用 Apple <code>purchaseDate</code> 生成 UTC 订阅锚点。
3. 后续每个月到锚点日期的 UTC 零点检查订阅仍有权益。
4. 月末没有对应日期时取当月最后一天。
5. 发放键使用 <code>originalTransactionId, benefitPeriod</code>。
6. 服务重启后扫描未发的已到期 benefit period，幂等补发。
7. 年付到期或被撤销后不再生成新一期。

关闭自动续费不影响已经付费的年周期。用户依然拥有权益直到 Apple 到期时间，月度额度也继续按计划发放。

## Credits 发放

每次发放都有一个唯一 <code>grantKey</code>。

```text
apple:production:transaction:2000000123456789:subscription
apple:production:original:2000000123456789:2026-09:monthly-benefit
welcome:user:123
admin:adjustment:ADJ202608150001
```

发放事务锁定用户 Credits 账户，插入 <code>credit_grant</code>，增加对应账户池，再提交。唯一键冲突说明已经发过，直接返回原结果。

初次购买、续费和立即升级只能在 Apple 交易验证通过后发放。订单创建、客户端显示支付成功、收到未验签通知都不能触发发放。

欢迎 Credits 独立处理。后台配置数量，用户登录时检查 <code>welcome_userId</code> 是否已存在。新旧账号使用同一规则，不需要启动时扫描所有用户。

订阅额度在订阅有效期间持续累加。用户关闭自动续费时仍处于已付周期，不清理。订阅到期、宽限期结束或权益被撤销后，清理任务在下一次 UTC 零点把 <code>subscription</code> 账户池归零，并写一条原因明确的 <code>credit_grant</code> 调整记录。永久购买的 Credits 不参与清理。

退款处理需要产品给出明确合同。生产系统至少要保存 <code>REFUND</code>、<code>revocationType</code>、撤销比例和对应交易。推荐做法是重新计算当前订阅权益，清掉尚未使用的订阅配额，不把已经消费的额度追成负数。若收到 <code>REFUND_REVERSED</code>，按当前 Apple 状态幂等恢复可用权益。

## Credits 实时扣减

用量完全由后端产生。客户端只展示余额和账单，不上报 token、时长、字符数或图片数。能决定真实用量的服务在每次调用结束或流式检查点把数据交给计量模块。

费率配置至少包含这些字段。

| 字段 | 示例 |
| --- | --- |
| moduleCode | LLM |
| metricCode | INPUT_TOKEN |
| unitSize | 1000000 |
| creditsPerUnit | 2300 |
| settleThreshold | 1 |
| chargeTrigger | AFTER_USAGE |
| effectiveAt | UTC 时间 |
| version | 12 |

实时计算使用当前已经生效的最新费率。

```text
rawDelta = usageDelta * creditsPerUnit / unitSize
rawCreditsTotal = previousRawCredits + rawDelta
targetCharged = floor(rawCreditsTotal)
deltaToCharge = targetCharged - chargedCredits
```

当 <code>deltaToCharge</code> 大于零时，计量模块立即扣除整数 Credits。UTC 日期结束时，把当日 <code>rawCreditsTotal</code> 向上取整，再补扣最后不足 1 Credit 的小数部分。

```text
finalTarget = ceil(rawCreditsTotal)
finalDelta = finalTarget - chargedCredits
```

逻辑账单日以 UTC 零点切换。定时任务每分钟扫描已经结束但尚未封账的 UTC 日期，错过零点或服务重启也能补做。封账操作幂等。

固定整数价格的调用不经过小数累计。图片生成一次 54 Credits，就在规定的触发点扣 54。异步任务若产品规则规定“创建即计费，失败不退”，就在任务成功入队前完成扣减，后续失败只记录任务结果。

### 不同模块的计量时机

| 模块 | 原始计量 | 推荐触发 |
| --- | --- | --- |
| LLM | 输入和输出 token | 每轮结束后累计并扣到整数 |
| ASR | 识别音频秒数或供应商返回用量 | 一次识别结果结束后累计 |
| TTS | 字符数或音频秒数 | 一次合成请求结束后累计 |
| Agora | 通话秒数 | 每次对话事件后检查，累计满一分钟扣减，通话结束再结尾 |
| 图片和视频 | 次数或 Clip | 创建异步任务时按固定整数扣减 |

Agora 不需要每秒定时扣。会话表保存 <code>providerTotalSeconds</code> 和 <code>chargedSeconds</code>。每次对话事件结束后读取最新时长，若未扣区间达到一分钟就结算一次，通话结束再结算剩余部分。

### 扣减账户顺序

账户顺序由产品固定并由后端执行。一个参考顺序是 <code>daily</code>、<code>subscription</code>、<code>bonus</code>、<code>paid</code>。一次扣减可以跨多个账户池。

```text
remaining = deltaToCharge
for pool in configuredOrder
  take = min(pool.balance, remaining)
  pool.balance = pool.balance - take
  remaining = remaining - take
  stop when remaining equals zero
```

数据库事务锁定相关账户行，或者使用带 <code>version</code> 的条件更新。余额不能被并发请求扣成负数。扣减后余额小于或等于零时，当前对话在下一个安全检查点停止后续 LLM、ASR 或 TTS 调用，立即返回 <code>CREDITS_EXHAUSTED</code> 多语言错误键。新的业务请求在调用供应商以前先检查可用余额。

固定价格任务在调用供应商以前要求总余额足以覆盖完整费用，余额不够就不创建外部任务。流式调用已经产生的用量可能大于剩余余额，此时扣到零并记录 <code>insufficientCredits</code>，剩余差额不写成负数，随后立刻停止新的流式片段。

高频消费不单独写流水。业务请求本身已经有消息 ID、任务 ID 或通话 ID，用这些现有 ID 做扣费幂等。流式分片可以使用 Redis <code>SET NX</code> 保存 <code>sessionId, sequence</code>，设置 24 到 48 小时过期时间。每日账单项通过乐观锁累计。Redis 丢失时，服务使用供应商累计值减去已经计费值，不重复计算整段用量。

管理后台修改费率后，新调用立即使用新版本。正在进行的一个原子调用用它开始时读取的版本结算，下一次调用再用新版本。费率变更要保存操作人、旧值、新值和 UTC 生效时间。

## 客户端查询接口

```http
GET /api/v1/credits/balance
GET /api/v1/credits/grants?cursor=...
GET /api/v1/credits/daily-bills?cursor=...
```

客户端只显示结果，真实用量由后端生成。历史查询使用服务端限制页大小的游标分页，客户端只回传不透明 `nextCursor`，不解析或修改它。余额不足使用 `CREDITS_EXHAUSTED` 错误键，不让客户端根据异常文字决定下一步。

## 恢复与验证

| 检查项 | 必须能观察到的结果 |
| --- | --- |
| 相同发放键并发提交 | 只新增一次发放与余额 |
| 订单和通知同时到达 | 返回同一业务结果，不多发 |
| 年付计划中途重启 | 扫描未完成周期，幂等补发 |
| 分片重复或计量存储丢失 | 复用请求标识或核对累计用量，不重算整段 |
| 费率变更 | 原子调用沿用开始时的版本，新调用使用新版本 |
| 日终任务错过零点 | 补扫已结束的 UTC 日期，封账只执行一次 |
| 多请求争用余额 | 使用事务或条件更新，余额不为负 |
| 余额耗尽 | 当前流在安全检查点结束，新的调用先被拦住 |

订阅发放失败时，订单保留 `VERIFIED`，直到可恢复处理完成后才改为 `FULFILLED`。退款、到期与退款撤回需要记录调整原因和幂等键；永久购买余额不参加订阅配额清理。Apple 的购买 Credits 不可到期要求见[App Review Guidelines 3.1.1](https://developer.apple.com/app-store/review/guidelines/)，不能只改名称绕过实际权益规则。

日志沿用[订阅实现的字段与脱敏规则](/app-stores/ios/subscription-implementation/#日志怎样记)，同时能定位费率版本、UTC 账单日、发放键、已累计用量和已扣金额。监控发放失败、负余额、未封账日期以及 `VERIFIED` 长时间未交付订单。人工调整使用唯一调整单号，保存操作人、原因、前后值和时间。

实际验收时，核对账户、发放记录和账单项；数学公式正确不代表并发、重启和退款路径已经验证。完整[自动化测试](/app-stores/ios/subscription-implementation/#自动化测试)与[Sandbox 验收场景](/app-stores/ios/subscription-implementation/#sandbox-端到端验收)保留在订阅实现中。

[返回 App 商店实战手册](/app-stores/)
