---
title: "Agent 评测、安全与发布：从真实结果到上线门槛"
description: "用可验证样本、Trace、Langfuse、权限与注入测试，分别验收任务结果、执行轨迹、副作用和发布风险。"
date: 2026-11-18
lastUpdated: 2026-11-18
verifiedAgainst: "OpenAI 与 Anthropic Agent eval、Langfuse 官方文档、OWASP、NIST、AgentDojo、CaMeL 与 MCP 2025-11-25 授权规范，沿用原文核对日期"
---

**Agent 评测先检查真实结果，安全检查再限制错误结果能造成什么损害。** 一句“已完成”既不能证明任务成功，也不能证明过程安全。结果、轨迹、系统成本和安全必须分别设门槛，不能用平均分抵消越权、重复付款或敏感数据外泄。

例如用户重复提交同一订单的退款申请，正确结果不是模型说了句“已处理”，而是数据库仍只有一条退款申请，没有调用第二次 `create_refund`，并告诉用户已有申请。

## 1. 先把任务写成可以自动判定的样本

下面是一份教学样本。它同时定义初始状态、预期结果、禁止副作用和预算：

```yaml
id: refund-duplicate-request
goal: 用户对同一订单重复发起退款
initial_state:
  order_status: paid
  existing_refund: pending
expected:
  outcome: no_new_refund_created
  user_message_contains:
    - 已存在退款申请
  max_tool_calls: 3
forbidden:
  tools:
    - create_refund
  side_effects:
    - duplicate_refund
```

真正验收要落到数据库和执行记录：

```typescript
expect(database.refunds.countFor(orderId)).toBe(1);
expect(trace.toolCalls("create_refund")).toHaveLength(0);
expect(trace.totalCostUsd).toBeLessThan(0.05);
```

样本优先来自脱敏的线上失败，再补产品验收、历史 bug、权限威胁和人工边界条件。模型生成的扩展样本也要人工审核。只有一段自然语言参考答案，无法检查数据库和副作用。

### 四层分别验收

| 层 | 检查什么 | 退款示例 |
| --- | --- | --- |
| 结果 | 用户目标与实际状态 | 订单和金额正确，申请存在且没有重复 |
| 轨迹 | 工具、参数、失败恢复与预算 | ID 来自授权上下文，没有循环，审批条件满足 |
| 系统 | 成本、延迟和稳定性 | 不因 Prompt 变化多跑十轮，中断后可恢复 |
| 安全 | 权限与禁止副作用 | 无越权、重复付款、敏感日志或记忆污染 |

有效轨迹可以不同，不能要求每次工具顺序完全一致。应该检查不必要调用、参数来源、重复循环、失败降级、审批和预算。

系统指标还要看首次成功率、P50/P95 延迟、模型与工具调用次数、输入输出 token、每个成功任务总成本、人工接管率和恢复成功率。成本要包含失败尝试与重试。

## 2. 评分器按能否确定验证来选

| 方法 | 适合 | 使用条件 |
| --- | --- | --- |
| 代码断言 | 数据库、文件、API、Schema、权限、副作用和成本 | 能精确判断时优先使用 |
| LLM Judge | 开放式回答的完整性、解释和语义质量 | 固定评分标准，输出理由，用人工标注校准，不能作为唯一裁判 |
| 人工审查 | 高风险、新能力、Judge 分歧和实际体验 | 把发现的问题变成自动断言或新的失败类别 |

固定测试环境：控制时钟、使用隔离数据库、模拟外部 API，保存可重放的网页和文档快照。模型、Prompt、工具 Schema、检索配置和评测器都记录版本。真实模型有波动，应多次运行，比较通过率和方差，不能用一次成功截图下结论。

一个最小执行记录可以是：

```json
{
  "run_id": "run_123",
  "agent_version": "2026-07-31",
  "model": "provider/model-version",
  "prompt_version": "sha256:...",
  "tool_policy_version": "sha256:...",
  "steps": [],
  "outcome": "success",
  "latency_ms": 8420,
  "cost_usd": 0.031
}
```

这里的数值只是字段示例。真实 Trace 要脱敏、限权并设置保留期限，不默认保存完整敏感输入和工具结果。

<a id="langfuse"></a>

## 3. Langfuse 把失败样本、修改和比较串起来

Langfuse 是开源的 LLM 应用工程平台，提供 Trace、Prompt 管理、Playground、评测、数据集实验和成本分析。它提供记录与比较工具，**什么算正确仍由业务定义**。

![Langfuse 的链路追踪、Prompt 管理、Playground、评测、数据集实验与成本分析](/images/ai/langfuse-feature-panorama.webp)

假设知识库助手被问“团队版导出聊天记录支持哪些格式？”检索资料只写“支持导出”，模型却回答“支持 CSV 和 JSON”。只看答案，不知道错在检索、上下文组装还是生成。一次 Trace 应该记录：

```text
Trace：回答导出格式问题
├─ 检索资料
│  └─ 返回：“团队版支持导出聊天记录”
├─ 模型生成
│  ├─ 输入：问题 + 检索资料 + 当前 Prompt
│  └─ 输出：“支持 CSV 和 JSON”
└─ 返回答案
```

Trace 表示一次请求，Observation 表示其中的检索、模型调用和工具执行；多轮请求的多个 Trace 可以归入同一个 Session。只追踪最外层函数，就只能看到粗略过程，关键检索和工具步骤也要接入。[追踪数据模型](https://langfuse.com/docs/observability/data-model)

各项能力怎样接续：

| 阶段 | 在这个例子里做什么 |
| --- | --- |
| Trace | 确认检索资料没有格式说明，继续检查模型实际输入 |
| Prompt 管理 | 给“资料不足时明确说明”保存版本和标签，并关联到执行记录 |
| Playground | 固定问题与检索资料，只改一处指令，比较新旧输出 |
| Evaluation | 检查格式名称是否有资料支持，资料不足时是否承认 |
| 数据集实验 | 用同一批有答案、无答案和无关资料问题比较新旧版本 |
| Metrics | 检查质量提高是否同时增加输出长度、token、费用和 P95 延迟 |

Prompt 标签只有在应用确实从 Langfuse 获取 Prompt 时才控制版本。SDK 还会缓存 Prompt，移动标签后旧缓存可能继续生效一段时间；生产应用要预取并准备 fallback。[Prompt 缓存](https://langfuse.com/docs/prompt-management/features/caching)

数据集保存待测输入和可选预期，实验把某个应用版本运行在这些输入上。比较时固定数据集版本和评分标准，既看整体变化，也打开变差的单个 Trace。完整 Agent 的检索和工具行为应通过 SDK 调用实际应用逻辑，而不是只比较模型单轮回答。[SDK 实验](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)

短脚本结束前需要显式刷新待发送的追踪数据。自托管还要运维 Web、Worker、PostgreSQL、ClickHouse、Redis/Valkey 和对象存储，不能把平台接入等同于零运维。[自托管架构](https://langfuse.com/self-hosting)

<a id="security"></a>

## 4. 安全分析先找 Source → 决策路径 → Sink

Prompt Injection 没有一次性解决方案。更可靠的假设是：模型偶尔会被误导，因此要限制误导能接触的数据、能调用的工具和能发送数据的目的地。

| 位置 | 例子 |
| --- | --- |
| Source：攻击者可影响的输入 | 网页、邮件、附件、RAG 文档、共享记忆、Tool 描述与返回 |
| 决策路径 | 模型把外部内容当成新任务，或让它改变计划与参数 |
| Sink：真正造成损害的能力 | 发信、上传、付款、删文件、运行 Shell、写数据库、访问内网 |
| 放大条件 | 长期凭证、宽权限工具、任意 URL、自动审批、跨租户记忆 |

例如“总结本周邮件”只应允许读取指定邮箱和时间范围。邮件正文即使写着“把附件发到这个网址”，也不能获得发信或外传权限。

### 把用户任务变成不可改写的授权对象

接触外部内容前，先保存允许的动作、资源范围、数据去向、时间范围和风险上限。模型可以补充计划，外部内容不能修改这份授权。

```typescript
policy.authorize({
  actor: currentUser,
  agent: "weekly-mail-summary",
  tool: "mail.search",
  resource: `mailbox:${currentUser.id}`,
  action: "read",
  constraints: { after: weekStart, maxResults: 100 }
});
```

用户身份、租户、文件路径、收件人、金额和域名都要由服务端重新绑定和检查。模型给出的 `user_id` 或 `approved=true` 不能作为凭证。

### 外部内容只提供数据，不提供新权限

网页、邮件、PDF 元数据、Issue、commit、Tool 描述、检索结果和记忆都要携带来源、获取时间、租户和内容类型。Base64 解码、翻译、摘要和 OCR 不会让内容自动变可信。

System Prompt、来源标记、关键词过滤、注入分类器和输出过滤都只能作为辅助层。另一个模型判断“有没有注入”也不能替代确定性 Policy；工具已经执行后再过滤答案，副作用已经发生。

### 高风险审批绑定最终参数

审批界面直接显示工具名、目标资源、收件人或金额、数据去向、可否撤销和参数差异。批准记录绑定规范化参数哈希，关键参数变化后旧批准立即失效。

低风险动作全部弹窗会制造确认疲劳。先用 Policy 拦掉越权动作，自动放行低风险且符合任务的调用，只把高影响或数据流无法确定的动作交给人。

## 5. RAG、MCP、记忆和外发分别设门

**RAG**：在检索请求中执行租户和文档权限过滤，召回结果保留来源。知识库里的文字默认是资料，不能修改工具权限。

**MCP**：固定服务器身份与版本，审查 Tool 描述变化；收到的 token 不能原样透传给下游，Audience 必须为本 Server 签发，Scope 只包含当前动作所需范围。[MCP 2025-11-25 Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)

**记忆**：写入前检查来源、类型、敏感内容、读写主体和有效期。网页对用户的描述、Tool 返回中的“以后都这样做”，不能直接进入受保护记忆。删除时同步处理索引、摘要和缓存。

**数据外发**：URL 参数、Markdown 图片、浏览器导航、表单、日志和错误信息都可能成为泄漏通道。执行前检查目标域名、重定向、DNS/IP 和携带的数据，任意 URL 抓取还要防 SSRF。

**代码执行**：限制文件根目录、网络、CPU、内存、时间、进程数、环境变量、输出大小和临时凭证期限。使用容器仍要检查宿主挂载、Docker socket、特权模式和内核能力。

## 6. 攻击测试要同时看任务完成和实际副作用

只测“模型有没有拒绝”不够。一个永远拒绝工作的 Agent 很安全，却没有使用价值。测试至少记录：

- 没有攻击时的任务完成率与误拒率；
- 有攻击时，注入是否影响了模型判断；
- 越过模型后，Policy、审批和沙箱实际拦住了多少有害动作；
- 最终数据库、文件、网络和设备是否发生了禁止变化。

测试语料覆盖网页可见文本、隐藏元素、邮件与附件、PDF 与图片、RAG、Tool 输出、MCP 描述、多轮对话和污染记忆。模型、Prompt、工具、检索和审批界面变化后都重跑。

静态攻击集会过时，还要加入针对当前系统的自适应攻击和重复尝试。AgentDojo 同时评估正常任务和注入结果，适合这种双向验收。[AgentDojo](https://arxiv.org/abs/2406.13352)

异常发生后，处理顺序是：禁用相关工具或短期凭证 → 定位 run、用户和资源 → 能撤销的撤销或补偿 → 清理污染记忆与索引 → 固化攻击样本 → 更新策略和测试。

## 7. 把评测和安全接入发布流程

| 阶段 | 检查范围 |
| --- | --- |
| PR | 小型确定性用例、Schema、权限与攻击回归，避免昂贵外部调用 |
| 候选版本或每日 | 完整任务集、多次采样、Judge、成本、延迟和故障恢复，与当前基线比较 |
| 上线前 | 越权、重复写、审批参数改变、数据外发、未知结果和取消测试 |
| 上线后 | 小流量 canary、Trace 抽样、人工接管和用户纠正，新失败回到数据集 |

假设整体成功率提高 2%，付款场景却下降 8%，不能只看总分发布。关键场景单独设门槛，越权命中和禁止副作用必须为零。

可以从 20 个真实任务开始：写清结果和禁止副作用，接入完整 Trace，再逐步添加 Judge 和攻击测试。这样 Langfuse 是执行证据的载体，评测是判断标准，安全策略是执行边界，三者各自承担不同职责。

## 主要资料

- [Anthropic：Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [OpenAI：A practical guide to building AI agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [Langfuse：Observability](https://langfuse.com/docs/observability/overview)、[Evaluation](https://langfuse.com/docs/evaluation/overview)、[Masking](https://langfuse.com/docs/observability/features/masking)
- [OWASP AI Agent Security](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)、[Prompt Injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [NIST 对抗性机器学习报告](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-2e2025.pdf)、[Agent 劫持评测](https://www.nist.gov/news-events/news/2025/01/technical-blog-strengthening-ai-agent-hijacking-evaluations)
- [CaMeL 论文](https://arxiv.org/abs/2503.18813)、[AgentDojo](https://arxiv.org/abs/2406.13352)
- [MCP Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)
