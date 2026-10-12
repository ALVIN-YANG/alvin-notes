---
title: "Langfuse 功能全景"
description: "用一张动漫全景图和一个知识库问答案例，理解 Langfuse 的链路追踪、Prompt 管理、Playground、质量评测、数据集实验与成本分析。"
date: 2026-10-12
lastUpdated: 2026-10-12
verifiedAgainst: "Langfuse 官方文档，2026-10-12"
sidebar:
  order: 40
---

Langfuse 是一个开源的大语言模型（LLM）应用工程平台，用来追踪模型与工具调用、管理 Prompt，并通过评测和实验改进 AI 应用。[官方介绍](https://langfuse.com/docs)

[![Langfuse 功能全景：动漫实验室中的六个工作区，分别展示链路追踪、Prompt 管理、Playground、质量评测、数据集与实验、成本与延迟。](/images/ai/langfuse-feature-panorama.webp)](/images/ai/langfuse-feature-panorama.webp)

*图：Langfuse 的主要功能。点击图片查看原图。*

它把一次请求的执行记录、所用 Prompt 和评测结果关联起来，让开发者能回答三个问题：这次回答为什么出错，修改以后是否变好，上线以后质量和成本怎样变化。应用仍要接入追踪代码或已有集成，团队也要定义什么算正确；平台提供记录和比较的工具，结果判断需要有业务依据。[追踪概览](https://langfuse.com/docs/observability/overview)、[评测概览](https://langfuse.com/docs/evaluation/overview)

## 从一次答错的问答开始

假设一个产品知识库助手收到问题：“团队版导出聊天记录支持哪些格式？”它先检索文档，再把资料交给模型，最后回答：“支持 CSV 和 JSON。”但检索到的资料只写了“支持导出”，没有说明格式。这个例子中的正确行为，应是说明资料未给出格式，并提示向产品支持确认。

只保存最后一句回答，很难知道错误发生在哪一步。检索可能拿错资料，Prompt 可能没有要求依据资料回答，模型也可能在资料不足时补出看似合理的细节。Langfuse 的作用，是把这些步骤记录下来，再把失败样本用于后续验证。

围绕这个问题，图中的六个工作区各有一个明确用途：

| 功能 | 要回答的问题 | 在这个例子里看什么 |
| --- | --- | --- |
| 链路追踪 Observability | 这次请求具体发生了什么？ | 检索返回了什么，模型实际收到了什么 |
| Prompt 管理 | 当时使用哪份指令？ | 是否要求资料不足时明确说明 |
| Playground | 改一处指令会怎样？ | 用同一份资料试跑两个 Prompt |
| 质量评测 Evaluation | 回答符合要求吗？ | 格式说明是否有资料支持 |
| 数据集与实验 | 修改能否改善一批问题？ | 新旧版本在同一组样本上的结果 |
| 成本与延迟 Metrics | 改善效果付出了多少代价？ | token、模型费用、响应时间的变化 |

## 链路追踪：还原一次请求

Langfuse 用 **Trace** 表示一次请求或操作，用 **Observation** 表示其中的步骤，例如检索、模型调用和工具执行。步骤可以嵌套；多轮对话的多个 Trace 可以归到同一个 **Session**。[追踪数据模型](https://langfuse.com/docs/observability/data-model)

前面的问答，可以记录成这样的结构。下面是示意记录，并非真实运行结果：

```text
Trace：回答导出格式问题
├─ 检索资料
│  └─ 返回：“团队版支持导出聊天记录”
├─ 模型生成
│  ├─ 输入：问题 + 检索资料 + 当前 Prompt
│  └─ 输出：“支持 CSV 和 JSON”
└─ 返回答案
```

打开这次 Trace，开发者可以核对步骤的输入、输出、时间和错误信息。如果检索资料本身没有格式说明，就应继续查看模型收到的完整输入，以及 Prompt 是否约束了资料不足时的回答。若资料里有格式说明、组装输入时却漏了，就该修正上下文组装。[追踪概览](https://langfuse.com/docs/observability/overview)

记录的完整程度取决于接入方式。只追踪最外层函数，就只能看到粗略过程；要定位检索和工具的问题，还要把这些关键步骤接入追踪。

## Prompt 管理：知道哪一版指令产生了结果

Langfuse 可以集中保存 Prompt 的文本或消息模板，为每次修改生成版本，并用标签指定应用应取哪一版。例如，`production` 指向已验证版本，测试标签指向候选版本；验证通过后再移动标签，需要回退时把标签指回旧版。[Prompt 管理](https://langfuse.com/docs/prompt-management/overview)、[版本与标签](https://langfuse.com/docs/prompt-management/data-model)

在这个例子里，可以把原来的“根据资料回答问题”改为“只回答资料明确支持的内容；资料缺少细节时，指出缺少什么”。应用获取 Prompt 并把它关联到模型调用记录以后，就能按版本查看回答和评分，判断效果变化是否与这次修改有关。

采用这套方式的前提，是应用确实从 Langfuse 获取 Prompt。SDK 还会缓存 Prompt，所以移动标签后，已有缓存可能继续使用旧版一段时间。首次获取需要网络请求；生产应用可以预取 Prompt，并准备可用的 fallback。[缓存机制](https://langfuse.com/docs/prompt-management/features/caching)

## Playground：带着原问题试跑修改

Playground 是试跑 Prompt 的交互界面。开发者可以把一次模型生成记录打开到 Playground，调整指令、变量或模型参数，并排比较不同版本的输出，满意后再保存到 Prompt 管理。[Playground](https://langfuse.com/docs/prompt-management/features/playground)

前面的失败记录很适合这样检查：保留用户问题和检索资料，只修改“资料不足时怎样回答”的指令，观察新版本是否仍然编造格式。先固定输入，可以更清楚地判断是哪项修改影响了结果。

一次试跑只能说明这个输入下的表现。确认修改是否普遍有效，还要把候选版本放进数据集实验。Playground 也需要配置模型连接；试跑会产生实际模型调用。

## 质量评测：把“答得好”写成规则

追踪回答“发生了什么”，评测回答“是否符合要求”。Langfuse 可以记录用户反馈、人工评分和程序提交的自定义评分，也支持用模型按指定标准评价回答，即 **LLM-as-a-Judge**。评测可以用于线上请求，也可以用于发布前的实验。[评测概览](https://langfuse.com/docs/evaluation/overview)、[LLM-as-a-Judge](https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge)

这个知识库助手可以分别检查三个维度：

| 维度 | 检查规则 |
| --- | --- |
| 有资料依据 | 回答中的格式名称能在检索资料里找到 |
| 能承认资料不足 | 资料未说明格式时，明确指出没有找到说明 |
| 回答有用 | 回答当前问题，并给出合理的确认途径 |

格式是否合法等确定性要求，可以交给代码检查。回答是否忠于资料，可以让评审模型同时读取问题、资料和答案，再给出评分与理由。涉及产品规则或容易争议的样本，应有人复核。这里的规则是示例，实际标准要由产品要求决定。

评分只有在标准可靠时才有意义。一个“支持 CSV 和 JSON”的回答可能简洁流畅，却没有依据；用户点赞也不能单独证明事实正确。评审模型的分数需要与人工判断核对，再用于比较和发布决策。

## 数据集与实验：检查修改是否引入新问题

**数据集**保存待测输入，以及可选的预期输出和元数据；**实验**把某个应用版本运行在这些输入上，再记录输出、追踪和评分。Langfuse 支持保存数据集，也支持通过 SDK 在本地数据上运行实验。[数据集](https://langfuse.com/docs/evaluation/experiments/datasets)、[SDK 实验](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)

修好前面的问答后，可以把脱敏样本加入数据集，再补两类问题：资料明确给出格式的问题，以及资料完全无关的问题。这样能检查新 Prompt 是否学会承认资料不足，也能发现它是否变得过于保守，连资料里已有的答案都不肯回答。

比较新旧版本时，要使用同一数据集版本和同一套评测标准，并记录应用、Prompt、模型与评测器的版本。先看整体变化，再检查变差的单个样本及其 Trace，才能知道改善和退步分别来自哪里。[实验比较](https://langfuse.com/docs/evaluation/experiments/compare-experiments)

在 UI 中运行 Prompt 实验，适合比较 Prompt 与模型组合；检索、工具或多步 Agent 的完整行为，可以通过 SDK 调用实际应用逻辑。要让实验结果阻止回归，还需要把实验接入 CI，并明确失败阈值。[UI 实验](https://langfuse.com/docs/evaluation/experiments/experiments-via-ui)、[SDK 实验](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk)、[发布前评测](https://langfuse.com/docs/evaluation/overview)

## 成本与延迟：把效果放回实际运行条件

Langfuse 的指标和仪表盘可以汇总调用量、token、费用、延迟和评测分数，并按用户、模型、Prompt 版本等维度分析。这样可以检查：候选版本提高了有依据的回答比例以后，是否也显著增加了输出长度或响应时间。[Metrics](https://langfuse.com/docs/metrics/overview)

费用可以由应用直接上报，也可以依据用量和匹配的模型价格定义计算；两者都有时，优先使用上报值。实际采用时要核对模型名称、用量字段和价格配置，特别是缓存 token、自定义模型或特殊计费方式。[token 与费用追踪](https://langfuse.com/docs/observability/features/token-and-cost-tracking)

改进知识库助手时，可以把“无依据的回答减少”“响应时间可接受”“单次费用在预算内”分别设为验收要求。平均分提高只是其中一项，失败样本和运行代价也要一起看。

## 怎样开始接入

建议从一个重要接口开始：追踪一次完整请求，包含检索和模型生成；核对记录中的输入、输出与实际调用一致；再把一个确认过的失败样本加入数据集，并给它写清评测规则。等这条流程能稳定工作，再扩展到其他接口。

Langfuse 提供 Python 和 JavaScript / TypeScript SDK，追踪基于 OpenTelemetry，也可以使用兼容的集成。追踪数据通常在后台批量发送；短脚本或短生命周期任务结束前，需要显式刷新待发送数据，避免进程退出时丢失记录。[SDK 概览](https://langfuse.com/docs/observability/sdk/overview)、[追踪数据发送](https://langfuse.com/docs/observability/data-model)

部署可以选择托管的 Langfuse Cloud 或自托管。自托管需要运维 Web、Worker，以及 PostgreSQL、ClickHouse、Redis / Valkey 和对象存储；备份、容量和升级也由使用方负责。[自托管架构](https://langfuse.com/self-hosting)

接入前还要决定哪些内容允许进入追踪记录。用户问题、检索文档、Prompt 和工具返回值都可能包含敏感信息，应在发送前删除或脱敏。Langfuse 提供 masking 能力；使用评审模型时，也要检查评测内容会发往哪个模型服务。[数据脱敏](https://langfuse.com/docs/observability/features/masking)

关于评测目标和验收边界，可继续阅读[《AI Agent 怎么做评测》](/ai/agent-evaluation-observability/)。
