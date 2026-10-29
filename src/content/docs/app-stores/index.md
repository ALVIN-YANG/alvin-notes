---
title: 产品交付：内购、测试与上架
description: 汇总 iOS 与 Google Play 内购、测试、上架准备和审核相关资料。
sidebar:
  order: 0
prev: false
next: false
---

这本手册按“接入内购 → 完成测试 → 准备上架与审核”组织现有文章。当前已覆盖 iOS 订阅实现、权益与额度交付、Google Play 沙箱测试，以及 iOS 内购上线前检查。

## iOS 内购与订阅

1. [交易、权益和额度怎样衔接](/app-stores/ios/subscription-overview/)：理解业务订单、Apple 交易、订阅权益和 Credits 的边界。
2. [StoreKit、验签、通知与恢复](/app-stores/ios/subscription-implementation/)：接入购买、服务端验签、通知处理、套餐切换和恢复购买。
3. [Sandbox 端到端验收](/app-stores/ios/subscription-implementation/#sandbox-端到端验收)：验证购买、续费、取消和退款等链路。

## Google Play 内购测试

[Google Play 沙箱内购测试步骤](/app-stores/google-play/sandbox-testing/)保留测试账号配置、测试包安装、购买和订阅验收的操作步骤与截图。示例系统的业务沙箱白名单及 Credits 规则，需要按自己的项目调整。

## 权益与业务额度

[Credits 发放、扣减与恢复](/app-stores/billing/credits-metering/)说明额度账本、续费发放、实时计量、幂等和恢复验证。业务额度交付和商店交易验证需要分别验收。

## 上架与审核准备

[iOS 内购上线前检查](/app-stores/ios/subscription-implementation/#上线前检查)包括 App Store Connect 商品与审核材料、客户端、后端及发布顺序的检查项。

当前尚未整理成独立章节的内容：App Store 完整提审流程、审核拒绝处理、Google Play 正式上架与审核。这里先保留手册范围说明，不把内购测试文章当作完整上架指南。现有文章中的平台规则以各篇标明的核对日期为准。

[返回职业手册书架](/career/)
