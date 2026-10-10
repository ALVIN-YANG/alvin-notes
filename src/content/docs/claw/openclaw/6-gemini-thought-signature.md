---
title: "[协议与排障] Gemini 双端点与 thought_signature：一次工具调用 400 的完整排障"
description: "OpenClaw 接入 Gemini 3 后，一旦触发工具调用就静默失败。根因藏在 Vertex AI OpenAI 兼容端点对 thought_signature 的校验里。本文从协议差异讲起，复盘排查过程，并给出经过生产验证的中转修复方案。"
sidebar:
  order: 6
date: 2026-03-01
lastUpdated: 2026-10-11
---

问题现象很简单：把 OpenClaw 的模型切到 Gemini 3 之后，普通聊天完全正常，但只要问题触发工具调用（比如问一句“天气怎么样”，Agent 需要调 web_search），回复就永远等不来了。没有报错弹窗，没有崩溃日志，就是安静地断掉。

最后查下来，根因不在 OpenClaw，也不在网络，而在 **Vertex AI 的 OpenAI 兼容端点对 thought_signature 的校验逻辑**里。要理解它，得先把“Gemini 到底有几种调用协议”这件事讲清楚。

## 1. 先对齐认知：Vertex AI 不止一种协议入口

很多人以为调 Gemini 就是"Google 的 API"，实际上 Vertex AI 同时暴露了**三种**协议入口，共用同一套 OAuth2 认证，区别只在 URL 路径和请求体格式：

![Vertex AI 暴露的三种模型调用协议](/images/claw/vertex-ai-protocols.svg)

| 协议 | 端点形式 | 适用模型 | SDK |
|---|---|---|---|
| Gemini 原生 | `publishers/google/models/{m}:generateContent` / `:streamGenerateContent` | Gemini 全系 | Google Gen AI SDK |
| OpenAI 兼容 | `endpoints/openapi/chat/completions` | Gemini + 部分 Model Garden 模型 | OpenAI SDK 改 base_url |
| Anthropic Messages | `publishers/anthropic/models/{m}:rawPredict` / `:streamRawPredict` | Claude 伙伴模型 | AnthropicVertex 客户端 |

几个容易搞混的点，全部有权威出处：

- **OpenAI 兼容端点只实现了 Chat Completions API**。Google 官方文档的标题就是 "Chat Completions API"，通篇没有 Responses API。官方论坛有人直接问过，回答是 ["Responses API has not yet been implemented in the OpenAI compatible endpoint for Gemini"](https://discuss.ai.google.dev/t/openai-responses-api-compatibility/90136)。所以拿着 OpenAI Responses 协议的客户端（比如某些新版 Agent 框架）接 Gemini 兼容端点，是走不通的。
- **Claude 在 Vertex 上说的是 Anthropic  Messages 协议**，但 URL 是 Vertex 风格的 `:rawPredict` / `:streamRawPredict`，且 body 里必须带 `anthropic_version: "vertex-2023-10-16"`。这一点 [Claude Code 的网关协议文档](https://code.claude.com/docs/en/llm-gateway-protocol)和 Google 的 REST 参考里都有明确说明。
- AI Studio（`generativelanguage.googleapis.com`）侧也有一个 OpenAI 兼容入口 `v1beta/openai/chat/completions`，行为与 Vertex 侧基本一致，本文的坑在两边都能复现。

OpenClaw 这边，配置里的 `api` 字段原生支持 `google-generative-ai`（原生协议）和 `openai-completions`（兼容协议）等类型。我们生产环境走的是 **`openai-completions` + 自建后端中转**，原因很现实：真实的 Vertex 服务账号凭据只能放在后端，设备端只做转发。

## 2. thought_signature 是什么

Gemini 3 系列引入了 [thought signatures](https://ai.google.dev/gemini-api/docs/thought-signatures) 机制：

> 签名是模型"思考状态"的加密表示。多轮对话中，如果把模型上一轮产生的 functionCall 或文本回放进历史，**必须把它当时携带的签名原样带回去**，否则服务端直接 400：`function call ... is missing a thought_signature`。

它解决的是思考链（chain-of-thought）的连续性问题：模型看到带签名的历史，知道"这是我自己的思考产出"，可以接着想；没有签名，它就得从零开始，轻则退化复读，重则请求被拒。

关键区别在于签名**挂载的位置**：

- **原生端点**：签名是 part 的一等字段，文本 part、functionCall part、thinking part 都可以携带 `thoughtSignature`；
- **OpenAI 兼容端点**：OpenAI 的消息结构里没有这个字段，Google 用扩展字段承载——`extra_content.google.thought_signature`（[官方文档](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library)明确列出），请求和响应都走这里。

## 3. 原生端点的闭环：干净、客户端自治

先看"理想情况"。原生协议下，一次多轮工具调用的数据流是这样的：

![原生端点：签名按 part 闭环，中转零改写](/images/claw/gemini-native-signature-flow.svg)

1. 客户端发出 `contents: [user: 文本]`；
2. 模型返回 `parts: [text + sigA, functionCall + sigB]`——**注意文本 part 也带签名**，这是原生端点的行为；
3. 客户端本地执行工具，把带签名的 parts 原样存进本地 transcript；
4. 下一轮请求，签名随历史**原样挂回对应的 part**，再加上 `functionResponse`（工具结果）；
5. 模型返回最终回答，签名挂在最后一个 part 上，供再下一轮回放。

OpenClaw 源码里这套闭环是显式实现的（`packages/ai/src/providers/google-shared.ts`）：流式解析时按块留存签名（text 块存 `textSignature`、toolCall 块存 `thoughtSignature`），序列化历史时再逐个 part 挂回去。整条链路上中转层**什么都不用做**，只换个认证头。

## 4. OpenAI 兼容端点：两个叠加的坑

现在回到出事的兼容路径。我们用脚本对本机直连 Vertex 做了完整的对照实验，实测矩阵如下：

| 请求中 assistant 消息的形态 | 结果 |
|---|---|
| 带 tool_calls + 非空文本（无论带不带签名） | **400** |
| 带 tool_calls + content 置空 `""` + 有效签名 | 200 |
| 带 tool_calls + content 置空 `""` + 无签名 | 200 |
| 带 tool_calls + content 置空 `""` + 损坏的签名 | 400 "corrupt" |
| 文本拆成独立 assistant 消息，移到 tool 结果之后 | 200 |

这张表信息量很大，它揭示了两个**叠加**的坑：

**坑一：客户端丢签名。** OpenClaw 走 `openai-completions` 协议时，模型下发的 `extra_content.google.thought_signature` 在它的历史序列化链路里会被静默丢弃（它自己的 transcript 里签名以裸 base64 存放，重新组装 OpenAI 消息时解析失败，字段就没了）。于是下一轮请求里所有 tool_call 都没有签名。

**坑二：端点从不下发文本签名，却要求文本带签名。** 这是更深的一层——兼容端点在响应里**只在 tool_calls 上下发签名，从来不在 assistant 文本上下发签名**；但它的校验逻辑却是：带 tool_calls 的 assistant 消息如果还有非空文本，**那个文本部分必须有签名**。客户端无论如何都拿不到文本签名，所以只要历史里存在"文本 + tool_calls"的 assistant 消息，就必然 400。这是兼容层 bug 级别的行为，你在官方文档里找不到任何说明，只能实测出来。

这也解释了为什么"普通聊天正常、工具调用必挂"：只有工具调用才会在历史里留下带 tool_calls 的 assistant 消息。

## 5. 我们的修复：中转层三层修补

约束很明确：OpenClaw 和它的协议栈不能动（它是上游开源项目），真实凭据必须在后端，工具调用能力必须完整保留。所以修复只能落在**自建中转服务**上，一共三层：

![OpenAI 兼容路径：中转层签名缓存 + 请求规整](/images/claw/gemini-openai-relay-cache-flow.svg)

**第一层：响应侧签名缓存。** 中转在转发 SSE 流时逐 chunk 解析，从 `choices[].delta.tool_calls[].extra_content.google.thought_signature` 提取签名，以 `tool_call id` 为 key 写入 Redis（TTL 7 天）。流本身原样转发，不做任何改写。

**第二层：请求侧签名注入。** 下一轮请求到来时，对历史里每条带 tool_calls 的 assistant 消息，按 tool_call id 查缓存，命中就注入 `extra_content.google.thought_signature`；未命中则原样放行——实测证明 content 为空时无签名也能通过（上表第三行），这是兜底路径。

**第三层：assistant 文本规整。** 针对坑二：把带 tool_calls 的 assistant 消息的文本置空为 `""`，原文本**不丢**——作为一条独立的 assistant 消息，插入到连续 tool 结果之后。实测这一形态返回 200，且模型的"我说了要去查天气"这段叙述依然保留在上下文里。

三层做完，多轮工具调用全链路 200，生产环境实测通过。

### 为什么不用 Google 官方的 dummy 签名

Google 在 [thought signatures FAQ](https://ai.google.dev/gemini-api/docs/thought-signatures) 里给过一个"跳过校验"的占位签名：`base64("skip_thought_signature_validator")`，历史上确实能绕过 400。我们没有把它当主方案，原因有二：一是它**跳过的是校验而不是恢复思考链**，模型拿不到真实签名仍然会退化；二是它和"文本必须有签名"的坑二不兼容——文本部分你依然拿不出合法签名。dummy 签名更适合作为缓存未命中时的备选，而不是主力。

### 业界对照：LiteLLM 的做法

排障过程中我们调研了 [LiteLLM](https://github.com/BerriAI/litellm)（3 万+ star 的 LLM 中转标杆），它的方案值得参考：

- **无状态**：响应侧把签名直接编码进 tool_call id——`call_xxx__thought__<base64签名>`，客户端原样回传时拆出来注入，完全不需要外部缓存；
- **三级查找**：`provider_specific_fields` → id 内嵌签名 → gemini-3 模型兜底 dummy 签名。

我们的 Redis 缓存方案和它在语义上等效，换来的是不改动客户端可见的 id（某些客户端对超长 id 敏感，我们实测见过 4KB+ 的签名）。两种方案没有本质优劣，id 内嵌更优雅，缓存更保守，按你的客户端生态选。

## 6. 下一步：原生透传

兼容路径修好了，但它本质上是"给兼容层打补丁"。更干净的方向是让 Agent 直接走**原生协议**：

- OpenClaw 配置 `api: google-generative-ai`，baseUrl 指向中转；
- 中转暴露 `/v1beta/models/{model}:streamGenerateContent`，只做认证替换，body 原样转发到 Vertex 原生端点；
- 签名闭环完全由客户端自治（前面第 3 节），中转的三层修补全部退役，Redis 依赖也省掉。

需要验证的点是 OpenClaw 所用版本的原生传输层质量（它历史上丢过签名，新版本已在源码里按块留存，但要实测部署版本），以及 Vertex 原生端点对 functionCall `id` 字段的拒收行为（LiteLLM 也踩过）。

## 7. 总结

1. Vertex AI 有三种协议入口：Gemini 原生、OpenAI Chat Completions 兼容、Anthropic Messages（Claude）；**Responses API 目前不支持**，别浪费时间。
2. thought_signature 是 Gemini 3 思考链连续性的核心，多轮工具调用必须回放；原生端点按 part 下发，兼容端点走 `extra_content.google.thought_signature`。
3. 兼容端点有个文档没写的坑：从不下发文本签名，却要求"带 tool_calls 的 assistant 文本"必须有签名——**文本置空 + 移位**是可靠解法。
4. 客户端丢签名是普遍现象（OpenClaw、LiteLLM 都踩过），中转层做签名缓存/注入是最小侵入的修复。
5. 排障方法论：别猜，写脚本直连端点做对照实验，一张实测矩阵胜过十篇文档。

## 参考链接

- [Call Gemini using the OpenAI library（Vertex AI 官方文档）](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/call-vertex-using-openai-library)
- [Thought signatures（Gemini API 官方文档）](https://ai.google.dev/gemini-api/docs/thought-signatures)
- [OpenAI Responses API Compatibility（Google 官方论坛）](https://discuss.ai.google.dev/t/openai-responses-api-compatibility/90136)
- [Claude on Vertex AI：rawPredict REST 参考](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.endpoints/rawPredict)
- [LiteLLM 源码：签名编解码与注入逻辑](https://github.com/BerriAI/litellm/blob/main/litellm/litellm_core_utils/prompt_templates/factory.py)
