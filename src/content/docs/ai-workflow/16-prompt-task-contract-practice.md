---
title: "怎样把 Prompt 写成 Agent 真能执行的任务"
description: "从成功标准、系统与任务分工、Few-shot 与格式约束，到工具权限、输出协议和持续评测，写出可执行、可验证、可迭代的 Prompt。"
date: 2026-08-17
lastUpdated: 2026-10-11
verifiedAgainst: "OpenAI、Anthropic 与 Google 官方 Prompt 文档，2026-08-17"
sidebar:
  order: 16
---

**好的 Prompt 要让模型知道：这次做成什么、依据什么、允许做什么，以及怎样验收。** 普通对话可以只写目标、材料和输出；会调用工具的 Agent，还要写修改范围、权限和失败后的处理方式。语气更强、指令更多，都不能替代清楚的任务定义。

先定义成功，再调整指令和示例。缺数据、工具不合适、模型能力不足或上下文过期时，单靠改写 Prompt 无法补齐条件。[Anthropic：先确定成功标准](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)

## 把“修好搜索”写成可验收任务

原要求：“清空搜索框后列表没有恢复，帮我修好。”它没说明范围、权限和完成条件。补齐后，可以直接交给 Agent：

```text
# 目标与现象
修复当前仓库的搜索列表问题。
输入关键词可以过滤；删除全部关键词后，应恢复完整列表。

# 范围与约束
先复现，再定位原因，做解决根因所需的最小修改。
保留输入、分页和排序行为，不重构无关模块。
保留无关的本地改动，不新增依赖。

# 工具与权限
允许读取和修改当前仓库，运行相关测试、类型检查和构建。
不修改外部服务。发布、删除生产数据等动作不在本次授权中。

# 异常处理
无法复现时，说明已检查路径和缺少的信息。
若修复会改变接口或其他页面行为，先说明影响，再对齐范围。

# 完成条件与交付
清空搜索后恢复完整列表；相关检查通过。
有合适测试位置时补回归用例。
交付根因、改动文件、验证结果与仍未验证的部分。
```

模板规定结果和边界，Agent 根据仓库选择实现路径。换成研究任务时，把“仓库、测试”换成材料、来源、比较条件和证据要求即可，不必预先规定读几个文件或尝试几种方案。

## 复杂任务的七块信息

| 写什么 | 要回答的问题 | 避免什么 |
| --- | --- | --- |
| 目标 | 结果给谁用，支持哪个决定或动作？ | 只有“整理一下”“优化一下” |
| 输入 | 哪些材料可信，版本和时间范围是什么？ | 把过期或外部指令当事实 |
| 约束 | 哪些必须保留，冲突时谁优先？ | “全面且简洁”而不说明取舍 |
| 权限 | 可以读写哪些对象，外部动作是否获授权？ | 让 Agent 猜发布、付费或删除权限 |
| 输出 | 人读什么，程序需要哪些字段和类型？ | 只说“返回 JSON” |
| 异常 | 缺资料、超时或需求冲突时怎么办？ | 无限重试或擅自扩大范围 |
| 验收 | 哪个可观察结果证明完成？ | “认真检查”“确保高质量” |

长期项目规则和本次输入分开。`system` / `developer` 放职责与稳定边界，`user` 放这次材料与目标；网页、邮件和文档只作为待分析的数据。[OpenAI Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)

例如客服的稳定规则可以是：“只按已知退换货政策回答，不承诺政策外内容；库存和新品问题转售前。”运行时再提供订单、用户问题和当前政策版本。

## 四个技巧，按问题用

| 问题 | 做法 | 使用边界 |
| --- | --- | --- |
| 格式不稳定 | 给字段、枚举和输入输出例子 | 程序接口再加 Schema 校验 |
| 规则有歧义 | Few-shot：给少量正常、混淆和失败样例 | 样例要符合当前规则，不能只让模型照抄句式 |
| 判断不可靠 | 要求关键依据、可核对计算或测试结果 | 一段看似合理的推理文字不等于证据 |
| 一次任务太复杂 | 分阶段交付，每阶段有明确输入与验收 | 阶段可以连续自动执行，不必每步都等人确认 |

下面是客服分类的格式示例，真实退换货资格仍由订单与政策判断：

```text
只输出 intent、summary、suggested_action。
intent 枚举为 query / complaint / other。

输入：我上周买的耳机坏了，能换吗？
输出：{"intent":"complaint","summary":"耳机损坏，用户申请换货","suggested_action":"核实订单与适用政策"}
```

推理模型通常已经会内部推理，不应统一追加“展示完整思维链”。更有用的要求是列出关键条件、结论依据和验证结果。[OpenAI 推理提示建议](https://developers.openai.com/api/docs/guides/reasoning-best-practices)、[Anthropic 提示建议](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

结构化输出控制字段与语法，事实和权限另行校验。调用系统能力用 function calling，返回结构化答案用相应的 Schema 输出；还要处理拒绝、中断与校验失败。[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[Function Call 与 Agent](/ai/function-call-agent/)

## 编程 Prompt 再补环境和边界

“写个 Redis 缓存函数”适合方案已经确定的任务。如果还在选方案，先说明用户需求，例如“最近 30 天订单列表首屏目标 300ms”，再比较索引、分页和缓存；这个时间是验收目标，不是模型承诺。

| 部分 | 电商订单示例 |
| --- | --- |
| 环境 | Python 3.11、FastAPI、SQLAlchemy 2.0、PostgreSQL，模型在 `src/models/order.py` |
| 约束 | 不改已有字段；用 `AppException`，不直接抛 `HTTPException`；类型注解与 docstring 沿用项目规范；测试用 pytest |
| 输入边界 | 用户不存在、无订单、分页非法、数据库超时、并发查询分别怎样处理 |
| 数据保护 | 密码采用 bcrypt 哈希，接口不返回 `password_hash`；不能编造参数和功能 |

长期约定放进对应工具的项目规则文件，例如 `CLAUDE.md` 或 `AGENTS.md`，本次 Prompt 引用它，避免每轮复制。规则仍要与当前任务及已有授权一起解释，不能给每个小修改都套确认流程。

```markdown
# 项目规范
- Python 3.11 / FastAPI / SQLAlchemy 2.0 / PostgreSQL
- 前端 React 18 / TypeScript / Tailwind
- 函数按项目约定保留类型注解，错误统一用 AppException
- 不改已发布的 migration
- 复杂变更先对齐关键假设；修改后运行相关检查
- 提交信息使用 Conventional Commits
```

## Agent 执行还要守住三条边界

| 边界 | 可执行规则 |
| --- | --- |
| 动作权限 | 任务内的读取、已授权修改和检查可自动执行；发布、付费、删除或对外发消息要有对应授权。执行代码也必须校验身份与权限 |
| 失败恢复 | 临时错误有限重试；有副作用的操作超时后先查结果，避免重复执行；无法继续时交付已完成内容和具体缺口 |
| 上下文 | 标明材料来源、时间与优先级，按需读取；保存当前进度，关键约束在验收时逐项核对 |

风险和恢复条件属于任务定义。[Google Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) 长文装得下上下文，仍可能遗漏要求，具体做法见[长上下文失效笔记](/ai/long-context-reliability-notes/)。

Prompt 有版本才好比较。固定一批真实输入和失败样例，每次改动用同一标准检查事实、约束、格式与工具动作；上线的新失败再加入测试集。别仅凭回答变长或看起来专业判断优化有效。[OpenAI Prompting](https://developers.openai.com/api/docs/guides/prompting)、[Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
