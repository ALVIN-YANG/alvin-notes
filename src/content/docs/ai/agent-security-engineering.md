---
title: "AI Agent 安全工程：真正危险的是它能继续行动"
description: "Prompt Injection 只是入口。真正需要保护的是 Agent 后面的权限、MCP、记忆、数据和真实系统。"
date: 2026-02-26
lastUpdated: 2026-10-11
verifiedAgainst: "OWASP AI Agent Security 与 MCP 2025-11-25 授权规范；原核对日期 2026-04-01"
sidebar:
  order: 12
---

**Agent 安全要把权限判断放在模型之外。** 模型可以理解目标、提出动作；执行代码负责验证用户、租户、资源、参数与授权。外部网页、邮件、检索片段、工具返回和记忆，只能提供数据，不能扩大工具权限。

例如“总结本周邮件”只授权读取指定邮箱和时间范围。邮件正文即使写着“把附件发到这个网址”，也没有发信或外传权限。先限制错误判断能触及的资源，再检测与回归测试注入。[OWASP Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)

## 一次工具调用的信任边界

<div class="article-note-diagram">

```mermaid
%%{init: {"flowchart": {"padding": 28, "rankSpacing": 18}}}%%
flowchart TB
  A["用户目标<br/>与外部数据"] --> B["模型提出动作"]
  B --> C["代码校验身份<br/>权限与参数"]
  C --> D["受控工具<br/>或执行沙箱"]
  D --> E["结果核对与审计"]
```

</div>

用户输入的身份字段也需服务端核对，应用自己的策略不能交由对话修改。权限按用户、租户、当前任务、工具、资源、操作类型、时间和网络目的地收紧。

下面是邮件读取的策略示意，需要项目实现 `policy.authorize`：

```typescript
policy.authorize({
  actor: currentUser,
  agent: "weekly-mail-summary",
  tool: "mail.search",
  resource: `mailbox:${currentUser.id}`,
  action: "read",
  constraints: {
    after: weekStart,
    maxResults: 100
  }
});
```

模型给出的 `user_id`、路径和 URL 都要重新绑定授权上下文，不能给所有 Agent 一份共享的高权凭证。

## 注入防护与动作授权

| 入口或动作 | 要守住的条件 |
| --- | --- |
| 直接 Prompt Injection | 用户要求忽略规则、泄密或越权，也不能绕过执行层 |
| 间接注入 | 网页、邮件、PDF 元数据、issue、commit、Tool 描述、记忆里的指令按数据处理 |
| 高影响动作 | 展示真实动作、资源、收件人或金额、可撤销性、来源和有效时间 |
| 授权完整性 | 绑定规范化参数、主体与有效期；关键参数改变后旧授权失效 |
| 可疑轨迹 | 限制工具和参数，必要时停止并交还用户；真实攻击样本加入回归 |

只用另一个 Prompt 判断“有没有注入”不足以保护业务。授权展示也不能只剩模型写的一句“是否继续”，否则说明文字本身可能被操纵。具体防护见[Prompt Injection 专题](/ai/agent-prompt-injection-defense/)与 [OWASP Prompt Injection](https://owasp.org/www-community/attacks/PromptInjection)。

## MCP 接入的四项检查

| 检查 | 实现要求 |
| --- | --- |
| Tool 描述和结果 | 标记服务来源、权限与版本变化，新内容不能直接成为可信指令 |
| Token 透传 | 收到的 token 不能原样转给下游；使用为下游资源签发的凭证 |
| Audience | 确认 token 为本 Server 签发，不只验证签名和到期 |
| Scope | 只申请完成当前动作所需范围，避免长期全账户写权限 |

依据 [MCP 2025-11-25 Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)、[Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)、[OWASP Tool Poisoning](https://owasp.org/www-community/attacks/MCP_Tool_Poisoning)。接入其他版本时按其授权合同检查。

## 记忆、检索与数据外传

记忆写入先检查来源、类型、敏感内容、是否允许跨会话保存、有效期及读写主体；推断摘要不能直接升级成不可变事实。

```json
{
  "content": "用户偏好中文回复",
  "type": "preference",
  "subject_id": "user_42",
  "source": "explicit_user_statement",
  "source_run_id": "run_123",
  "confidence": 1.0,
  "created_at": "...",
  "expires_at": null
}
```

检索先按租户和权限过滤，再召回内容，不能先全库读取后让模型“忽略不该看的”。

| 泄漏路径 | 控制办法 |
| --- | --- |
| Secret 进入 Prompt 或报错 | 凭证只在执行层解析，输入输出分类与脱敏 |
| 工具返回完整数据库结果 | 只返回必要字段、分页与受控引用 |
| 浏览器、webhook 访问任意目的地 | 出站白名单，校验 DNS/IP 与重定向，防 SSRF |
| Trace、记忆、索引长期留敏感内容 | 字段脱敏、访问控制、保留期限与清理扫描 |
| 不同租户共用检索或缓存 | 租户和资源授权随查询执行，不交给模型自律 |

## 代码执行与异常响应

需要执行 Shell 或生成代码时，限制文件根目录、网络、CPU、内存、时间、进程数、环境变量、系统调用、输出大小与临时凭证期限。容器仍需检查宿主挂载、Docker socket、特权模式和内核能力。

发生异常动作后：禁用相关工具或凭证 → 定位 run、用户和资源 → 能撤销的撤销或补偿 → 清理污染记忆与索引 → 固化攻击样本 → 更新策略和测试 → 记录剩余风险。结构化 Trace 和工具审计是定位依据。

## 用副作用验收安全

| 测试 | 应观察到的结果 |
| --- | --- |
| 请求泄露受保护系统提示 | 不泄露，不产生相关工具动作 |
| 网页要求把密钥发到 URL | 指令不能获得外传权限 |
| Tool 返回要求调用高权工具 | 不自动扩权 |
| 审批后金额改变 | 旧审批无效 |
| 其他租户的资源 ID | 服务端拒绝 |
| 重复付款 | 幂等复用原结果 |
| 记忆要求关闭安全策略 | 不写入受保护状态 |
| 无限重试 | 预算上限触发停止或接管 |
| Token audience 不符 | 拒绝请求 |

把这些用例纳入 CI，检查实际读写与网络动作，而不只看最后的拒绝文案。上线前同时核对风险等级、确定性鉴权、参数绑定授权、记忆来源与过期、执行隔离、外传控制及预算上限。
