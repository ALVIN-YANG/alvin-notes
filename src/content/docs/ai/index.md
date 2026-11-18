---
title: AI Agent 开发
slug: agent-knowledge
prev: false
next: false
---

Agent 开发需要处理三件事：为模型提供适用的信息，让工具和执行循环可靠地推进任务，再用实际结果验证系统。导航按阅读顺序排列，每篇主文解决一个完整工程问题，不再按短文章拆分。

## 从架构到上线

- [Agent 架构与执行循环](/ai/agent-architecture-execution-loop/)：Workflow、单 Agent、目标控制和多 Agent 的选择。
- [Agent 工具与运行环境](/ai/agent-tools-runtime/)：Schema、权限、幂等、沙箱与局部决策模型。
- [Agent 框架选型](/agent-frameworks/)：LangGraph、AutoGen、CrewAI 与三套 SDK 的执行结构对照。
- [Agent 状态持久化与恢复](/ai/agent-context-persistence-recovery/)：检查点、恢复调度、租约与副作用未知。
- [Agent 评测、安全与发布](/ai/agent-evaluation-security-release/)：真实结果、Trace、Prompt Injection 和发布门槛。
- [实时语音 Agent 工程](/ai/realtime-voice-agent-engineering/)：首句延迟、打断、字幕与断线恢复。
- [OpenClaw 生产实践](/claw/openclaw/)：插件、消息队列、部署与回滚。

## 上下文与记忆

[上下文工程](/ai/context-engineering-guide/)负责当前输入，[RAG 知识库工程](/rag/)从外部资料中检索依据，[Agent 记忆系统](/ai/agent-memory-principles/)保存可复用的信息。[混合检索算法](/ai/hybrid-retrieval-principles/)解释共用的搜索与排序方法，[环境感知与缓存](/ai/agent-environment-awareness-llm-cache/)处理外部状态变化后的失效问题。

具体系统拆解：[OpenClaw 记忆](/claw/openclaw/9-memory-system-deep-dive/)、[Mem0 记忆层](/memory-projects/mem0/)、[Gemini 协议排障](/claw/openclaw/6-gemini-thought-signature/)。

## 精选参考

- [AI Agent 教材（外部原站）](https://bojieli.github.io/ai-agent-book/astro/book/chapter1/)：按作者章节阅读完整教材。
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：理解上下文选择与长任务的信息管理。

常用术语见 [AI 概念速查](/ai-concepts/)。如果要管理 AI 编码、审查方案和验收交付，进入[管理 AI 开发](/ai-workflow/)。
