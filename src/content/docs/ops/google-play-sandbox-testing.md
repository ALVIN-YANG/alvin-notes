---
title: "Google Play 沙箱内购测试步骤"
description: "原测试手册脱敏版，保留完整步骤和真实操作截图。"
date: 2026-10-28
lastUpdated: 2026-10-29
---

> 原测试手册脱敏版：保留原有步骤、验收标准和真实截图，应用名称、账号及内部地址已替换或遮盖。业务沙箱白名单及 Credits 规则属于本示例系统，其他项目按自身规则验收。

## 1\. 开通测试账号

准备两个账号，可以使用不同邮箱：

- Google 账号：登录手机 Play 商店和 Play Billing Lab。

- 业务账号：自行注册专用测试账号，登录 示例 App，接收订阅和 Credits。

把 Google 邮箱和 业务注册邮箱 / 用户 ID 发给管理员，请管理员完成三项配置：

1. Play Console → Settings → License testing：加入 Google 邮箱。

2. Play Console → 示例 App → Internal testing → Testers：加入同一 Google 邮箱。

3. 业务管理后台 → 计费中心 → Sandbox 白名单：加入 业务账号并启用。

三项配置必须分别确认：

- 许可测试名单：让 Google 账号获得测试卡，可进行不扣真钱的测试付款。

- 内部测试名单：允许 Google 账号下载 示例 App 内测版；仅加入这份名单，内购仍可能扣真钱。

- 业务沙箱白名单：允许 App 账号接收沙箱订阅和 Credits。

> **必做：三项资格全部开通后，再接受内测邀请。**

> **加入名单 ≠ 接受邀请。** 测试人员必须亲自完成下面的“加入测试”。

## 2\. 安装内测版

1. 手机打开 Play 商店，点击右上角头像，切换到已登记的 Google 账号。

2. 用同一 Google 账号打开内测链接：【管理员提供的内测邀请链接】

**3\. 接受内测邀请【必做】**

**核对账号**：邀请网页右上角账号必须与手机 Play 商店账号一致。

**接受邀请【必做】**：点击“加入测试 / Become a tester”。

**确认成功**：必须看到“You’re a tester”。

**下载应用**：点击 Download test app，进入 Play 商店。

> **无需邀请码，无需等待邀请邮件。** 如果提示没有资格，先检查网页账号，再联系管理员核对名单。

4. 跳转 Play 商店，安装或更新 示例 App。应用可能显示为 com\.example\.app \(unreviewed\)。使用 管理员指定的测试版本或更新版本。

5. 打开 App，点击 Log in，登录已开通沙箱权限的 业务账号。

如果提示无法安装且原先装过调试 APK，联系开发人员确认签名冲突，备份后再决定是否卸载；不要直接清除数据。[内测安装说明](https://support.google.com/googleplay/android-developer/answer/9845334)

## 3\. 必要时设置测试地区

商品正常显示时可直接进入第 4 步。如果商品为空或提示不可购买，先用 Billing Lab 检查地区：

1. 从 Play 商店安装 Google 官方 Play Billing Lab：[Play Billing Lab](https://play.google.com/store/apps/details?id=com.google.android.apps.play.billingtestcompanion)

2. 登录同一个已加入许可测试的 Google 账号。

3. 打开配置设置，将国家/地区设为美国，点击保存或应用。

4. 确认信息中心显示“国家/地区：美国”和未过期的失效时间。关闭响应模拟器，不开启真实付款测试。

5. 返回 示例 App，重新打开套餐页。配置过期后需重新应用。

保存失败时退出 Billing Lab 后重新登录。不要为测试永久更改 Google 付款地区或添加真实银行卡。[Billing Lab 官方说明](https://developer.android.com/google/play/billing/test#play-billing-lab)

## 4\. 购买 Starter 月付

1. App → 左上角 Menu → Plan \& Credits → Credits，截图记录购买前 Monthly、Daily、Free 和 Total。

2. 切换到 Plan → UPGRADE。

3. 选择 STARTER · MONTHLY，点击价格。

4. Google 付款页弹出后，核对商品为 示例 App Starter，购买账号为自己的 Google 许可测试账号。

**5\. 付款前检查【两项都必须符合】**

- **付款方式：测试卡，一律批准。**

- **页面提示：这是一项测试订阅；我们不会向您收费。**

6. 以上全部符合后，点击“订阅”，等待结果。

**没有测试提示或只显示真实银行卡：立即返回，不付款。** 内测版、美元价格、业务 白名单都不能单独证明这笔购买免费。[测试付款官方说明](https://developer.android.com/google/play/billing/test)

如果提示启用购物身份验证，建议启用；不影响沙箱性质。

## 5\. 检查购买结果

1. Google 提示成功后返回 示例 App。

2. 进入 Plan \& Credits → Plan，确认套餐变为 STARTER\_MONTHLY。

3. 切换到 Credits。没有旧订阅、同期消费或续订的首购，Monthly 应增加 10,000；原有 Free 余额应保留。

4. 切到其他 App 再返回 示例 App，检查同一笔购买不会重复发 10,000。

5. 把账号、购买时间、套餐和截图发给管理员，请其核对：SANDBOX 环境、付款成功、履约成功、Credits 流水、Google 确认购买及通知处理结果。

本版套餐卡可能仍显示 $0/月和免费说明，这是已知显示缺陷；判断支付结果看套餐、Credits 与后台交易，不看这两处文案。

测试使用生产服务，不需要选择“测试环境”；务必使用专用 业务测试账号。

## 6\. 测试场景与验收标准

先完成首购，再逐项测试并记录结果。首购使用无有效订阅的账号；套餐变更保留原订阅。需要后台配合的项目，不只凭 App 页面判定通过。

### Google 沙箱续订时间【测试前必读】

|正式订阅周期|沙箱续订间隔|
|---|---|
|1 周|约 5 分钟|
|1 个月|约 5 分钟|
|3 个月|约 10 分钟|
|6 个月|约 15 分钟|
|1 年|**约 30 分钟**|

> **不是按固定倍数压缩时间。年付不能用 5 × 12 推算为 60 分钟。** Google 为不同套餐周期分别规定测试时长。

- **月付测试**：约每 5 分钟续订一次，不是所有业务里的“一个月”都等于 5 分钟。

- **续订上限**：通常最多自动续订 6 次。无试用、无异常、未手动加速时，月付首购加 6 次续订约 35 分钟后结束。

- **判断依据**：时间是近似值；以 Google 返回的实际交易、到期时间和状态为准。Billing Lab 手动加速会改变观察节奏。

- **Credits 验收**：核对实际成功的续订交易与对应发放流水；不能仅按每过 5 分钟判断应该发放。年付分批发放另按 业务计划核对。

[Google 官方续订时间表](https://developer.android.com/google/play/billing/test#renewal-periods)

### 测试用例

|测试项|操作|预期结果|
|---|---|---|
|取消购买|打开 Google 付款页后返回，不点击订阅；再选择同套餐|不发额度，仍可继续购买|
|拒付|付款方式改为“一律拒绝”测试卡后提交|不激活订阅、不发 Credits；随后可用批准测试卡再测|
|重复恢复|购买成功后切后台、重开 App|同一笔交易不重复发 Credits|
|自动续订|保留测试订阅，按 Google 页面显示的加速周期等待|新付款周期按规则发额度；同一续订重复通知不重复发|
|取消续订|Play 商店 → 头像 → 付款和订阅 → 订阅 → 示例 App → 取消订阅|已付周期内保留权益，到期后结束订阅；Free 余额不被误清|
|待付款|在可用时选择延迟批准/拒绝测试方式，与管理员确认 PENDING 后再等待结果|付款未成功不发额度；批准后只发一次；失败后可重新购买|
|宽限期|Billing Lab → 订阅设置/管理 → 选择 示例 App 订阅，模拟宽限期；让管理员核对实际状态|不发新一期 Credits，也不误清原有余额|
|挂起与恢复|Billing Lab 中对同一订阅模拟账号挂起，再按界面恢复付款；管理员核对 Google 状态|挂起时无订阅权益；恢复后按验单结果恢复，不重复履约|
|升档|已有 Starter，在 App 选 Standard 或 Pro；确认测试付款，再核对生效时间和额度流水|按档位补差，不重复发完整一期；旧款折算的额外时间由后端安排额度，不与宽限期混同|
|降档|已有 Pro，在 App 选 Starter；记录预定生效时间，等实际生效并核对后台|当前已付周期保留旧档；新方案实际生效、成功付款后再处理新周期额度|
|同档月付/年付切换|在 App 选择同档另一付费周期；分别记录变更时和原续费日的结果|不因切换立即重复发额度；成功付款开启新周期后按后端规则发放|
|年付分批|用独立样本购买年付；由管理员核对发放计划和后续批次|不一次发 12 倍月度额度；到期批次只发一次，不用 Google 加速续订时间替代业务分批规则|
|退款/撤销|提供指定沙箱订单给管理员，由管理员执行约定的退款或撤销，再回 App 同步|按实际退款/撤销类型核对权益及流水；不误处理其他订单，普通退款与撤销分别记录|
|换 业务账号|同一 Google 购买后退出 App，登录另一个专用 业务账号并同步|不把原购买重复绑定到另一账号，不给第二个账号重复发额度|

测试月付可能显示 US$10\.00/5 min，这是加速测试时间；以 Google 当前页面为准。续订会影响余额，记录时区分“同一笔重复恢复”和“新一期续订”。[官方订阅测试](https://developer.android.com/google/play/billing/test#test-subscriptions) [取消订阅操作](https://support.google.com/googleplay/answer/7018481)

升降档、月年切换及 Credits 规则以 当前业务约定验收；Google 平台状态参考[订阅生命周期](https://developer.android.com/google/play/billing/lifecycle/subscriptions)。

测试结束后，若不再观察续订，到 Play 订阅页取消测试订阅。卸载 App 不会取消订阅。

## 7\. 遇到问题怎么办

|提示|下一步|
|---|---|
|找不到商品|核对 Google 账号、两项 Play 测试资格、内测安装版本及 Billing Lab 地区|
|未连接互联网|关闭错误页，检查访问 Google 的网络；查询是否已购买，再重试，不连续点击|
|有未付款订单|选择原套餐继续；不要反复换套餐建单|
|一直显示 payment processing|回 App 同步购买；仍阻塞则把账号、时间和截图交管理员查订单|
|Google 成功但 App 未更新|切后台再回来；仍无权益则请管理员查履约和流水，不重新购买“补额度”|
|没有测试卡或不收费提示|退出付款，让管理员检查许可测试资格和实际购买账号|

报问题时附：Google 测试邮箱、业务账号、App 版本、手机型号、北京时间、套餐、步骤、错误截图、购买前后 Credits。不要发密码、验证码或 token。[Google 错误说明](https://developer.android.com/google/play/billing/errors)

## 操作截图

### 安装：接受邀请后点击 Download test app

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/accept-invitation.png)

### 地区：保存成功后核对美国及有效期

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/billing-lab-country.png)

### 付款：确认测试卡与“不收费”提示后再订阅

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/test-payment.png)

## 8\. 管理员：开通三项测试资格

**先收集两项信息：Google Play 登录邮箱、业务注册邮箱或用户 ID。** 两者可以不同，不收集密码和验证码。

### 8\.1 Google 许可测试：开通测试付款方式

1. 管理员登录 [Google Play Console](https://play.google.com/console/)，选择 对应开发者账号。

2. 进入 **Manage account → Play apps settings → License testing**。旧版导航可能显示 Settings → License testing。

3. 在 **License testers** 选择 **Email lists**。

4. 找到 **示例 App internal testers**，点击右侧箭头 **Edit email list**。

5. 在 **Add email addresses** 输入测试人员的 Google 邮箱，**按 Enter 加入列表**。多个邮箱用逗号分隔。

6. 确认邮箱出现在 **Email addresses added** 后，点击 **Save changes**；确认弹窗中再点击 **Save**。

7. 返回许可测试页，确认 **示例 App internal testers 前的复选框已勾选**。如果修改了勾选状态，再点击页面底部 **Save changes**。

8. **License response 保持 RESPOND\_NORMALLY**，无需修改其他设置。

> **成功标准：重新打开名单仍能看到新邮箱，且许可测试页已勾选该名单。仅保存邮箱、未选中名单，不算完成。**

当前配置截图：Email lists、示例 App internal testers 已勾选，名单共 4 人。

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/license-testing.png)

**邮箱编辑示例：** 测试人员邮箱（已脱敏） 已加入名单并保存。后续新增人员填写其自己的 Google 邮箱，不替换或删除现有成员。

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/edit-test-email-list.png)

### 8\.2 示例 App 内部测试：开通下载安装资格

1. Play Console 选择 **示例 App**。

2. 进入 **Test and release → Testing → Internal testing → Testers**。也可打开对应应用的内部测试人员页面。

3. 确认 **示例 App internal testers 已勾选**。当前与许可测试共用同一份邮箱名单；在 8\.1 已保存的邮箱无需重复添加，但这里的勾选必须单独检查。

4. 若使用其他名单，点击对应 **Edit email list** 添加同一个 Google 邮箱，按 Enter，再 Save changes → Save。

5. 修改名单勾选后，点击页面底部 **Save**。重新进入页面，确认勾选仍保留。

6. 切到 **Releases**，确认已有 **Available to internal testers** 的发布版本；只有名单、没有发布版本，不能完成商店安装。

7. 在 **How testers join your test → Join on the web** 点击 **Copy link**，将链接交给测试人员。

> **管理员配置完成后，测试人员仍须亲自接受邀请。** 用名单中的 Google 账号打开链接 → 点击“加入测试 / Become a tester” → 看到“You’re a tester” → Download test app。无需邀请码。

内测邀请链接：【管理员提供的内测邀请链接】

**成功标准：测试名单已勾选、有可下载版本、测试人员已接受邀请。**

真实截图：同一名单已勾选，当前 4 人，下方为 Copy link 入口。

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/internal-testing.png)

### 8\.3 业务 Sandbox 白名单：开通 App 账号沙箱权益

**填写 业务注册账号，不是直接填写 Google 邮箱。** 两个邮箱不同时，以 App 注册邮箱或用户 ID 为准。

1. 确认测试人员已经注册 业务 App。未注册时先注册，不能只用一个 Google 邮箱创建白名单。

2. 管理员进入 **Studio 管理后台 → 计费中心 → Sandbox 白名单**。

3. 在 **关键词** 输入 业务 用户 ID、名称或邮箱并查询。

4. 已有记录且状态为 **已启用**：无需重复新增。状态为 **已停用**：点击 **启用**，在确认框中再次确认启用。

5. 没有记录：点击 **新增用户**，打开 **新增 Sandbox 用户** 表单。

6. 在 **用户** 输入注册邮箱或用户 ID，等待候选项出现，**选中正确的“名称 · 邮箱 · UID”**。仅输入文字、未选中用户，不能提交。

7. 在 **备注** 填写用途，例如“示例 App Android Google Play 沙箱测试”。

8. 点击 **新增并启用**。出现“Sandbox 白名单已更新”后，重新查询该账号。

9. 核对 **邮箱、UID、状态已启用** 三项，再通知测试人员登录这个 业务账号进行测试。

> **搜不到用户：先核对是否已注册、是否用了另一个 业务 邮箱。不要将 Google 邮箱当成 业务账号直接添加。**

**成功标准：白名单记录对应正确的 业务 UID，状态为“已启用”。** 该白名单用于 Apple / Google Play 沙箱交易，不会赋予 Google 许可测试或内测下载资格。

**后台入口：** Studio 管理后台 → Sandbox 白名单（内部地址已隐藏）

**图 A：查询并确认“已启用”**

使用已有测试账号演示。核对注册邮箱、UID 和“已启用”；截图中的示例用户 不是要求测试人员共用的账号。

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/sandbox-enabled.png)


**图 B：点击“新增用户”后的表单**

“用户”为必填项，“备注”说明测试用途，提交按钮为“新增并启用”。

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/sandbox-form.png)

**图 C：按 业务注册邮箱搜索并选择用户**

必须点击候选项，核对“名称 · 邮箱 · UID”，不能只输入邮箱。此截图仅演示搜索，未重复提交已有账号。

![原始操作截图，敏感信息已遮盖](/images/ops/google-play-sandbox/sandbox-user-search.png)

### 8\.4 配置完成后发给测试人员

请逐项确认后再发送：

- **Google 许可测试：** Google 邮箱已保存，名单已勾选。

- **示例 App 内部测试：** 同一 Google 邮箱在已勾选的名单中，已有可下载版本。

- **业务 Sandbox：** App 注册账号的 UID 已启用。

- **测试人员必做：** 接受内测邀请后安装；付款前核对测试卡和“不收费”提示。

[Google 许可测试官方说明](https://developer.android.com/google/play/billing/test#license-testers) · [Google 内部测试官方说明](https://support.google.com/googleplay/android-developer/answer/9845334)
