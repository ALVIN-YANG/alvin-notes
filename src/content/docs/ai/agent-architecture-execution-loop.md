---
title: "Agent 架构与执行循环：Workflow、单 Agent 与多 Agent"
description: "先选确定性最高的实现，再理解 Function Call、MCP、Skill、目标控制和多 Agent 的边界。"
date: 2026-11-18
lastUpdated: 2026-11-18
verifiedAgainst: "OpenAI 与 Anthropic Agent 架构建议、MCP 2025-11-25 与 2026-07-28、Codex rust-v0.135.0、Claude Code Goal、Towards a Science of Scaling Agent Systems v3，沿用原文核对日期"
---

**步骤固定时，先用普通代码或 Workflow；下一步取决于不确定输入和中间反馈时，才引入 Agent。** 单 Agent 已经能可靠完成任务，就不要继续加角色。架构升级的理由必须是解决了可观察的问题，而不是名词更高级。

可以用四项检查做第一轮判断：

| 任务特征 | 优先选择 |
| --- | --- |
| 输入结构化、规则明确、结果可用代码验证 | 普通代码 |
| 步骤基本固定，只有提取、分类或写作需要模型 | Workflow |
| 下一步要根据工具结果动态决定，目标和工具边界清楚 | 单 Agent |
| 子任务真正独立，需要不同上下文、工具或权限，或必须执行中协调 | 再比较多 Agent |

例如报销审核，模型只需提取发票字段和生成异常说明，金额、预算、重复报销与权限都由代码校验。流程已知，不需要让 Agent 自由决定全部步骤。反之，调查数据库迁移时，发现一种查询不兼容会改变后续测试方法，这才需要执行循环。

还要算完整成本，而不是只比较模型单价：

```text
实际收益 = 每任务价值
         − 模型与工具成本
         − 基础设施成本
         − 人工接管成本
         − 错误补偿成本
         − 评测与维护成本
```

## 1. 先分清四个概念：它们不是四个升级阶段

**Function Call 声明一次工具调用，Agent 推进多步任务，MCP 统一工具接入，Skill 提供可复用的任务说明。** 它们可以组合，也可以单独使用。

| 概念 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| Function Call | 用结构化参数描述“调用哪个函数、传什么” | 模型不会亲自执行函数；不保证参数正确或已授权 |
| Agent | 根据观察和目标决定下一步，直到结束 | 不保证任务完成，也不自动拥有业务权限 |
| MCP | 用标准协议连接 Host 与工具、资源和提示模板 | 不替代业务实现、权限、幂等与结果核对 |
| Skill | 保存某类任务的流程、约束和领域写法 | 不是可执行函数，也不能代替程序检查 |

![Function Call、Agent、MCP、Skill 各自的职责](/images/ai/function-call-agent-stack.svg)

### 一次 Function Call 到底谁执行

以“读取当前数据库支持的查询类型”为例，开发者先声明工具：

```json
{
  "type": "function",
  "function": {
    "name": "get_query_capabilities",
    "description": "只读查询当前数据库版本支持的查询能力",
    "parameters": {
      "type": "object",
      "properties": {
        "database_id": { "type": "string" }
      },
      "required": ["database_id"],
      "additionalProperties": false
    }
  }
}
```

模型只返回 `get_query_capabilities(database_id=...)` 的调用请求。Host 是运行 Agent 的应用，它必须再次检查数据库归属和只读权限，然后才真正执行并把结果交回模型。`strict: true` 或 JSON Schema 只能约束输出形状，不能证明这个 ID 可以访问，也不能证明业务判断正确。

MCP 解决的是接入方式：Host 内的 Client 连接 MCP Server，Server 暴露 Tools、Resources 和 Prompts。它减少每个应用分别写适配器的成本，但 Server 返回的内容和动作仍要经过业务校验。MCP 的协议版本差异见[2026-07-28 核心变化](/network/mcp-2026-07-28-core-changes/)，不要把不同版本的连接生命周期混写。

Skill 则是另一层：它告诉 Agent 做迁移评估时先查版本、再核对查询能力、最后评估成本。即使不使用 MCP，也可以用本地函数执行工具；即使没有 Skill，Agent 仍能运行。

## 2. 单 Agent 的核心是行动与观察，不是反复生成文本

一个最小执行循环如下：

```text
读取目标与约束
  → 模型决定下一步
  → Host 校验并执行工具
  → 把结果交给模型
  → 模型根据新观察继续，或提出结束
```

这种组织方式常叫 ReAct（Reasoning + Acting）。产品不必展示完整内部推理，但必须保存足够验证下一步的工具结果和任务状态。

![Agent 内部：规划循环、多次工具调用、记忆与上下文预算](/images/ai/fc-agent-react-loop.svg)

迁移评估可能这样推进：

1. 读取数据库版本和查询清单。
2. 调用兼容性工具，发现一种查询不支持。
3. 根据发现改写测试方案，而不是继续测原始查询。
4. 在隔离环境运行测试。
5. 把兼容性问题、测试前提和新增改造成本一起写入报告。

这里的价值来自“新观察改变下一步”。如果只是按照固定清单依次调用三个 API，普通 Workflow 更直接。

单 Agent 合适的前提是：目标明确、工具集合有限、每步有结果反馈、副作用受控，并且可以限制步数、时间和费用。没有行动工具或结果反馈时，反复要求模型“再想想”不会形成执行闭环。

## 3. 目标控制是在一轮结束后验收，不是另一套 Agent

普通 Agent 的循环负责执行，目标控制程序（Harness）再多做一次判断：**这轮结束后，应该结束、继续，还是等待外部结果？**

假设任务是把首页和关于页的页脚年份都改成 2026，正文不能动。Agent 改了首页就宣布完成，文件检查器发现关于页仍是旧年份，就把具体失败项送回下一轮。

```text
Agent 做一轮工作
  → 程序读取实际文件并验收
  → 未通过且还有额度：带着失败项再做一轮
  → 通过：记录成功并停止
  → 等待审批或外部事件：保存进度，事件到达后再验收
  → 达到上限：明确未完成，不能报喜
```

自动续跑和结果验收是两件事。程序可以不断催 Agent 工作，却仍然相信它自己报告的“已经完成”。真正有用的是检查器、继续条件、等待状态和预算上限。

不同产品的 Goal 实现并不相同。固定到 Codex `rust-v0.135.0`，续跑最终启动的是普通任务，主 Agent 自查并报告完成，没有另外启动独立验收模型。Claude Code `/goal` 的评估器只能依据对话中已有的证据判断，不能自己读文件或运行测试。Ralph 的完成标记同样不能替代外部结果。

[演示脚本](/examples/harness-goal-loop.mjs)不调用付费模型，也不访问真实网站。它故意让模拟 Agent 每轮只改一页，却每次宣布完成：

```bash
curl -fsSLo harness-goal-loop.mjs https://blog.mlxb.cc/examples/harness-goal-loop.mjs
goal_demo_dir=$(mktemp -d)
node harness-goal-loop.mjs init "$goal_demo_dir/goal.sqlite"
node harness-goal-loop.mjs run "$goal_demo_dir/goal.sqlite"
node harness-goal-loop.mjs status "$goal_demo_dir/goal.sqlite"
```

脚本需要 Node.js 24+。第一轮的外部检查失败，第二轮修改另一页后才进入 `SUCCEEDED`。这只能证明控制程序能拦下过早的完成声明，不能证明真实模型两轮就能完成任务。

实际项目还要补三条规则：

- 验收记录绑定目标版本和被检查结果的内容哈希；文件再次变化后，旧验收结果失效。
- 连续多轮没有文件变化、同一检查持续失败时，换方案或请求人工，不把轮数当进度。
- 达到预算、用户取消或目标改变时停止调度；迟到的成功结果不能让已取消任务重新成功。

需要等待部署、审批或跨进程恢复时，再引入持久化状态、租约和事件回执，见[Agent 状态持久化与恢复](/ai/agent-context-persistence-recovery/)。

## 4. 多 Agent 的区别是通信和最终责任，不是角色数量

继续用迁移评估：A 查兼容性，B 测性能，C 算改造成本。A 发现查询必须改写，B 原来的测试因此作废，C 也要把改写和补测计入成本。这条发现怎样传递，决定了架构。

| 架构 | 信息怎样流动 | 适合什么 | 这个例子里怎么判断 |
| --- | --- | --- | --- |
| SAS 单 Agent | 同一个上下文连续推进 | 前后发现会改变后续步骤 | 留作基线；可靠且成本可接受就不必拆 |
| Independent 独立并行 | 各自完成，最后拼接 | 子任务互不相干 | 不适合只有末尾拼接的配置，B 会在旧前提上白跑 |
| Centralized 中心化 | 总管分工、转达发现、重新安排工作 | 需要统一目标和执行中协调 | 第一个值得验证的多 Agent 候选 |
| Decentralized 去中心化 | 执行者直接讨论，按规则结束 | 局部发现需要互相追问 | 当前只需落实新前提，不必全体讨论 |
| Hybrid 混合 | 总管管全局，局部直接通信 | 整体统一，局部频繁对齐 | A、B 需要反复对齐时再选 |

中心化并不意味着更聪明。总管一旦误解 A 的报告，B、C 会一起收到错误指令。去中心化也不等于互相验证，多数 Agent 同意仍不能代替证据。

《Towards a Science of Scaling Agent Systems》v3 也支持“按任务结构选”，而不是给架构排固定名次：

| 实验任务 | SAS 基线 | 多 Agent 结果 | 能说明什么 |
| --- | --- | --- | --- |
| PlanCraft，步骤会改变后续材料 | 56.8% | Hybrid 34.6%，已是多 Agent 中较高 | 多 Agent 都退化，Hybrid 退化较少仍不如 SAS |
| Finance-Agent | 34.9% | Centralized 63.1% | 在另一任务和配置下，中心化可能有益 |
| BrowseComp-Plus | 31.8% | Decentralized 34.7% | 结论依赖任务、模型、工具和预算，不能泛化排名 |

先实现 SAS 和 Centralized 的同任务对照即可，不必一次做五套。所有方案使用相同任务、资料版本、工具、验收标准和总预算，并把协调、汇总和重试全部计入成本。

## 5. 拆分之前，先写清任务、消息和权限

一次子任务至少要约定：目标、已有资料、可用工具、禁止动作、完成条件，以及时间和费用上限。只写“你是性能专家”没有可执行边界。

每条结果至少包含：

```text
结论
证据位置
测试前提与资料版本
未确认事项
下一步需要谁处理
```

收到建立在旧前提上的结果，要标为待更新，不能覆盖新结论。子 Agent 结束也不代表总任务完成，最终责任人必须检查所有必要条件。

写操作还要指定唯一责任方。独立上下文不会自动带来权限隔离；多个 Agent 同时修改同一资源会产生冲突。工具超时后先查外部状态，不能因为另一个角色不知情就再执行一次。

当多 Agent 只是让报告更长，关键遗漏、测试前提、成本完整性和人工补查次数都没有改善，就不构成替换 SAS 的理由。

## 主要资料

- [Anthropic：Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI：A practical guide to building AI agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling)
- [MCP 2025-11-25 规范](https://modelcontextprotocol.io/specification/2025-11-25)与[本站 2026-07-28 协议变化](/network/mcp-2026-07-28-core-changes/)
- [ReAct 论文](https://arxiv.org/abs/2210.03629)
- [Codex 目标运行时，固定提交](https://github.com/openai/codex/blob/4daceea869704f9f35e0a3949fc34711ef978a4e/codex-rs/core/src/goals.rs)、[Claude Code Goal 评估](https://code.claude.com/docs/en/goal#how-evaluation-works)
- [Towards a Science of Scaling Agent Systems v3](https://arxiv.org/html/2512.08296v3)
- [Anthropic 多 Agent 研究实践](https://www.anthropic.com/engineering/multi-agent-research-system)
