---
title: AI Agent 开发
slug: agent-knowledge
prev: false
next: false
---

Agent 开发需要处理三件事：为模型提供适用的信息，让工具和执行循环可靠地推进任务，再用实际结果验证系统。左侧目录按这三类组织文章，展开分组即可直接阅读。

## 上下文与记忆

[上下文工程](/ai/context-engineering-guide/)负责当前输入，[RAG](/rag/)从外部资料中检索依据，[长期记忆](/ai/agent-memory-system-design/)保存可复用的信息。三者有交集，但不能用记忆检索代替真实执行记录。

## 架构与执行

从 [Agent 与 Workflow 选型](/ai/when-not-to-use-ai-agent/)确定任务边界，再处理[工具设计](/ai/production-agent-tool-design/)、[任务循环](/ai/harness-goal-controller/)和[状态恢复](/ai/agent-context-persistence-recovery/)。工具能调用，不代表业务已经完成。

## 评测与可靠性

[评测](/ai/agent-evaluation-observability/)同时检查结果与执行轨迹，[安全工程](/ai/agent-security-engineering/)约束可采取的行动。性能优化也需要在任务效果不退化的前提下验证。

## 精选参考

- [AI Agent 教材（外部原站）](https://bojieli.github.io/ai-agent-book/astro/book/chapter1/)：按作者章节阅读完整教材。
- [Anthropic：上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：理解上下文选择与长任务的信息管理。

常用术语见 [AI 概念速查](/ai-concepts/)。如果要管理 AI 编码、审查方案和验收交付，进入[管理 AI 开发](/ai-workflow/)。
