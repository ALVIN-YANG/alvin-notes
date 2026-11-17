---
title: "Agent 记忆方案全景：六种产品方向与主流实现"
description: "先分清工作、经历、事实、技能四种记忆，再按编码助手、自托管 Agent、商业个人助手、记忆服务与行业场景看工程问题、授权边界和验收方法。"
date: 2026-11-17
lastUpdated: 2026-11-17
verifiedAgainst: "Claude Code、Codex、Cursor、Cline、Gemini CLI、Honcho、LangMem、Supermemory、ChatGPT、Replika、AgentRun 官方文档，Meta Muse 官方发布，Personal Agent 公开技术解读与 Agent 记忆综述，2026-11-17"
---

记忆选型的混乱大多来自两件事：把"怎么做"当成"事实"来管，以及把检索准确率当成记忆系统的全部。其实**记忆先按内容分成四种，选型再按场景要解决的工程问题来定**。这篇文章先给这个框架，再把主流产品方向和行业场景放进去。

![四种记忆内容：工作记忆、经历、事实、技能，各有不同的写入与召回方式](/images/ai/agent-memory-landscape/06-memory-types.svg)

## 1. 先分清四种记忆内容

| 类型 | 记的是什么 | 典型实现 | 写入与召回 |
| --- | --- | --- | --- |
| **Working（工作记忆）** | 当前这一次请求在想什么 | 上下文窗口、当前会话状态 | 每次请求重新组装，会话结束即消失 |
| **Episodic（经历）** | 具体发生过什么 | 对话记录、工具结果、任务日志 | 全量保存做证据，按需检索 |
| **Semantic（事实）** | 从经历整理出的偏好与结论 | 事实条目、用户画像、知识图谱 | 提取或整理而来，会被修订和替代 |
| **Procedural（技能）** | 怎么做一件事 | skills 文件、SOP、工作流模板 | 版本化文件，按描述匹配后加载 |

两个直接推论：**经历是证据，事实是派生数据**，事实错了可以靠经历重建；**技能不该塞进向量库**，它是可审查、可版本管理的文件，Hermes 的 skills、Claude Code 的 skills、企业 SOP 都属于这一类。

另一个容易混淆的维度：检索准确率衡量的是"问到能不能找对"，而长期 Agent 还需要**身份连续性**——明天醒来还是同一个它。前者靠检索系统，后者靠人格、共同经历和第一人称的持续记录，是两笔不同的预算。

## 2. 编码助手：文件就是记忆

### 2.1 真实工作流：纠正一次，下次会话生效

Claude Code 里有两条写入路径（[官方文档](https://code.claude.com/docs/en/memory)）：

- **你写 CLAUDE.md**：编码规范、项目约定，分组织策略、用户（`~/.claude/CLAUDE.md`）、项目三级，`.claude/rules/` 按文件路径限定，`AGENTS.md` 可直接替代。根文件在 `/compact` 压缩后从磁盘重读。
- **Claude 写 Auto memory**：你纠正"别再这样改测试"之后，它自己记成笔记，按仓库存放、跨 worktree 共享，每次会话加载前 200 行或 25KB。

![Claude Code 的双记忆机制：你写的 CLAUDE.md 与 Claude 自己记的 Auto memory](/images/ai/agent-memory-landscape/02-claude-code.svg)

[Codex](https://developers.openai.com/codex/guides/agents-md) 和 [Gemini CLI](https://geminicli.com/docs/cli/gemini-md/) 同构：`AGENTS.md` / `GEMINI.md` 从全局到项目、子目录逐级合并，越靠近当前目录优先级越高；Codex 合并上限默认 32KiB，Gemini CLI 用 `/memory show` 查看实际注入内容。

### 2.2 工程判断：全量注入，所以容量和写作质量就是检索质量

文件记忆没有检索环节，启动时全部读进去。因此文件越长，每轮成本越高，模型还越容易漏掉中间条目——各家设上限都是在强制克制。Auto memory 自动学习方便，但**记错的一条会持续出现在每次会话里**，不像聊天记录会自然淡出。

还要记住：这些都是提示，不是强制配置。要禁止动作，用 PreToolUse hook 这类程序拦截，不靠记忆里写"不许做"。

### 2.3 同方向的其他选择

- **Cursor**：`.cursor/rules/` 用 `alwaysApply`、`globs`、`description` 控制加载时机，团队规则优先，适合把团队规范做成强制下发的上下文（[官方文档](https://cursor.com/docs/context/memories)）。
- **Cline Memory Bank**：不是自动系统，是文档方法论——`activeContext.md`、`progress.md` 记录进展，新会话说"follow your custom instructions"续接，**换任何能读文档的 Agent 都能用**（[官方指南](https://docs.cline.bot/prompting/cline-memory-bank)）。
- **Windsurf（现 Devin 体系）**：`AGENTS.md` 加 `.devin/rules/`，旧 `.windsurf/rules` 仍导入（[官方文档](https://docs.windsurf.com/windsurf/cascade/memories)）。

## 3. 自托管个人 Agent：差别在写入纪律

数据在本地、机制可审查是这个方向的共同点，真正的差别在写入：

- **OpenClaw**：全量原始会话做证据，Dreaming 按"后来被召回过几次"把候选提升成长期记忆；召回分固定加载、trigger 快速通道、混合检索三层。适合要自动整理又要审计的人（[完整拆解](/claw/openclaw/9-memory-system-deep-dive/)）。
- **Hermes**：`MEMORY.md`（约 2200 字符）和 `USER.md`（约 1375 字符）作为**冻结快照**注入，会话中途写入只落盘、下次会话生效，提示词前缀不变所以 prompt 缓存一直有效；容量上限迫使 Agent 只留最重要的。适合成本敏感的人（[源码解读](https://baoyu.io/blog/2026-04-29/manthanguptaa-2034849672985288957)）。
- **DeepSeek Harness（DSH）**：记忆靠插件。[DeepSeekBot](https://github.com/BotHarness/BotHarness) 提供一组各有身份和记忆的 Bot；ds bot 用 Main Bot 主管调度省 token（[报道](https://www.oschina.net/news/502968)）；[Engramory](https://github.com/tinqiao-oss/engramory) 这类插件用"一条事实一个 Markdown 文件 + 每会话加载的索引"做无数据库记忆。**选插件就是选写入规则**，要看仓库当前 README。

一句话选择：要自动整理选 OpenClaw，要成本稳定选 Hermes，要多 Bot 玩法选 DSH。

## 4. 商业个人助手：四个工程问题

2026 年下半年，记忆从"你提问才检索"变成**云端常驻 Agent 的主动能力**。这类产品要同时解决四个工程问题（框架参考[《从 Muse、dots 和 Grok Bot 看 Personal Agent》](https://developer.aliyun.com/article/1771609)）。

### 4.1 状态跨任务：下一次该取回哪些

长期记忆和当前上下文是两件事：长期记忆负责跨请求保存，上下文是某一次调用实际装载的工作集。Dots 的机制很典型：dot 继承你的 ChatGPT 记忆，从连接的应用学习，再保存自己的偏好和工作笔记；但**每个任务有自己的对话，不会自动获得你和 dot 的全部历史**（[官方文档转述](https://developer.aliyun.com/article/1771609)）。

所有权的边界更要注意：关闭共享、断开应用都**不会清空 dot 已学到的内容**；dot 的单个记忆不能逐条编辑，**删除等于重置整个 dot**（[机制分析](https://www.memorylake.ai/zh/blogs/chatgpt-dots-own-memory)）。实用结论：连应用之前先审查你的 ChatGPT 记忆。

### 4.2 授权与凭证：长期有效还是一次有效

[Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/) 把这部分拆得很细：核心 Agent 跑在隔离的 Secure VM 里，`hatch-authd` 保管真实 OAuth token，Agent 只拿代理凭证；访问外部服务要过 Sentinel，由它判断允许、拒绝还是要求用户确认；授权分一次性、会话级、任务级、限时和长期。Dots 也允许给不同操作设规则，但自定义规则不能突破内置安全限制。

**昨天授的权今天能不能用、读邮箱包不包括发邮件，都是记忆系统之外但必须回答的问题。**

### 4.3 后台触发：触发不等于授权

Grok Bot 的 Routine 可以由时间表或外部事件触发（PR 打开、CI 失败、Slack 新消息）；dots 也能定时检查日历或主动整理记忆。关键原则是：**事件只负责创建一次执行，不增加这次执行的权限**。Dots 的主动研究只能读取已允许的信息源并保存私有笔记，不能主动发消息、改插件或控制浏览器。

### 4.4 跨系统身份与陪伴型记忆

当 Agent 代表你访问别的公司的服务，对方需要知道"这是谁的 Agent、授了什么权、只读还是可写"——Meta、Sierra 等在推进的 Personal Agent Protocol 就是 OAuth 之上的这层约定。

陪伴型产品以 [Replika](https://help.replika.com/hc/en-us/articles/37208679176077-How-does-Replika-s-memory-work) 为代表：Memory 标签页条目可看可改，深层系统根据整体对话模式逐渐个性化，点赞能强化正确记忆。这里最重要的指标不是检索分数，而是**人格和共同经历的连续性**。

## 5. 记忆服务：接入快，但各组留了不同的活给你

![记忆服务四组：提取型、图谱型、画像型、框架与自管型](/images/ai/agent-memory-landscape/03-memory-services.svg)

| 分组 | 代表 | 它帮你做了什么 | 接入后你自己还要补什么 |
| --- | --- | --- | --- |
| 提取型 | Mem0、Hindsight、Supermemory | 对话提取成事实，检索返回 | **当前偏好判断**：新旧并存听哪条；用户隔离 |
| 图谱型 | Zep、Cognee | 实体关系与时效 | 构图成本与错误链接纠正；图谱不等于事实为真 |
| 画像型 | Memobase、Honcho | 持续的用户模型 | 推断过度的审计；画像不能替代业务当前状态 |
| 框架与自管型 | LangMem、Letta | 记忆工具与存储约定 | 自己定义"什么值得写"的写入规则 |

成本不看产出形态，看写入时做多少计算：单次提取最省，实体关系构建更贵，Honcho 这类持续后台推理最高；Memobase 这类按配置字段更新的画像，成本接近提取型，并不天然更贵。

官方来源：[Mem0](https://github.com/mem0ai/mem0)（[本站拆解](/memory-projects/mem0/)）、[Hindsight](https://hindsight.vectorize.io/)、[Supermemory](https://docs.supermemory.ai/)、[Zep](https://help.getzep.com/)、[Cognee](https://docs.cognee.ai/)、[Memobase](https://github.com/memodb-io/memobase)、[Honcho](https://docs.honcho.dev/)、[LangMem](https://langchain-ai.github.io/langmem/)、[Letta](https://docs.letta.com/)。

## 6. 框架运行时与托管产品：两个容易被误认的方向

**框架运行时记忆解决执行状态，不是长期偏好。**LangGraph 的 checkpointer 让任务断点恢复，store 存跨线程数据；CrewAI 区分短期、长期与实体记忆。用户改口这类偏好冲突，框架不会替你处理。详见 [LangGraph](/agent-frameworks/langgraph/)、[CrewAI](/agent-frameworks/crewai/)、[OpenAI Agents SDK](/agent-frameworks/openai-agents-sdk/)、[Google ADK](/agent-frameworks/google-adk/)。

**托管产品的记忆要按"两层删除"理解。**[ChatGPT 官方 FAQ](https://help.openai.com/en/articles/8590148-memory-faq)：saved memories 独立于聊天存储，删原聊天不删记忆；删干净要同时处理记忆和原始聊天，日志可能保留至多 30 天。Claude.ai 以主题形式综合记忆，支持管理、无痕聊天，2026 年扩展到聊天与 Cowork 共享（[报道](https://www.engadget.com/2243753/claude-memory-now-works-across-both-chats-and-cowork-sessions/)）。个人使用没问题，但**不能当产品的记忆底座**：不可导出、不可移植、规则平台定。

## 7. 行业场景：记忆深度由场景决定

行业判断比产品选型更优先，看三个约束：**关系深度**（一次性服务还是长期关系）、**数据敏感性**（医疗、政务、金融合规）、**事实来源**（业务事实必须实时查业务系统）。

![行业场景矩阵：关系深度与数据敏感性决定记忆策略](/images/ai/agent-memory-landscape/05-industry-matrix.svg)

- **游戏 NPC 与角色**：记忆就是产品本体，而且重点是**身份连续性**而非检索准确率。经典范式是 Generative Agents 论文（[arXiv 2304.03442](https://arxiv.org/abs/2304.03442)）的记忆流 + 定期反思：全量经历入库，按相关性、新近性、重要性召回，定期整理成高层认识。OpenClaw 的 Dreaming、Hindsight 的 Observation 都继承了这个思路。记错共同经历比少记更糟，人格一致性优先于召回数量。
- **企业 AI 员工**：归属、审计、权限优先。以[阿里云 AgentRun](https://help.aliyun.com/zh/agentrun/long-term-memory-1) 为例：记忆关联 User/Agent/Run ID，检索必须带归属过滤；每条记忆有版本历史，新增、更新、删除带时间戳和操作者；支持 MCP 和 mem0 兼容接口。团队共享 SOP 和员工的个人客户上下文分开，记忆不能成为越权执行的依据。
- **导游、医院、政务指引**：记忆要克制。主体是业务知识库 RAG 加实时接口（号源、窗口、政策）；长期记忆只放语言、无障碍需求这类低风险偏好，敏感信息最小化、可删除。**这类场景上重型记忆系统通常是负收益**：泄露面和合规成本上升，个性化收益有限。

## 8. 场景决策与验收

![十个典型场景对应的记忆方案选择](/images/ai/agent-memory-landscape/04-selection.svg)

先做三道判断题，比读产品榜单有用：

1. **要记的是"怎么做"吗？** 是就写成 skills 或规则文件，别进向量库。
2. **是一次性服务吗？** 是就不建长期记忆，知识库加实时接口足够。
3. **是长期关系且数据敏感吗？** 是就把归属、审计、可删除放在检索分数之前。

然后按场景定方向：

| 场景 | 推荐方向 | 决定性理由 |
| --- | --- | --- |
| 团队协作写代码 | 文件记忆（CLAUDE.md / AGENTS.md） | Git 审查、项目共享、子目录覆盖 |
| 自托管个人助理 | OpenClaw / Hermes / DSH 插件 | 数据在本地，机制可审查 |
| 个人生活助理与陪伴 | Muse / Dots / Grok Bot / Replika | 主动记忆、云端常驻，接受平台边界 |
| 做自己的产品，要跨会话个性化 | Mem0 / Hindsight / Zep 等记忆服务 | 接入快，归属与隔离自己控制 |
| 重点是用户画像与推理 | Honcho / Memobase | 持续用户模型，而非事实清单 |
| 只要任务断点恢复 | 框架运行时状态（checkpointer 等） | 不需要引入长期记忆系统 |
| 游戏 NPC / 角色陪伴 | 记忆流 + 反思（Generative Agents 范式） | 人格与共同经历是产品本体 |
| 企业 AI 员工 | 企业平台记忆（AgentRun 等） | 租户隔离、审计、权限 |
| 导游 / 医院 / 政务指引 | 知识库 RAG + 实时接口，克制记忆 | 业务事实必须实时，敏感数据最小化 |
| 个人日常聊天，不做产品 | ChatGPT / Claude.ai 内置记忆 | 零接入成本，接受平台边界 |

最后，每个场景都有自己的验收问题，别只问"它还记得吗"：

| 场景 | 验收时要确认的事 |
| --- | --- |
| 编码助手 | 记错的条目不持续污染会话；规则文件能 Git 审查；硬约束走 hook |
| 自托管 Agent | 原始会话可重建索引；写入失败不影响主流程 |
| 商业个人助手 | 关闭共享后已学内容去哪了；后台任务的权限范围；能否导出 |
| 记忆服务 | 新旧偏好冲突谁判断；跨用户检索隔离；删除是否含派生数据 |
| 游戏与角色 | 人格在模型更新后是否稳定；共同经历是否被正确回忆 |
| 企业 AI 员工 | 租户间不串记忆；每次变更有操作者；记忆不构成越权依据 |
| 指引类服务 | 业务答案来自实时接口；敏感信息可最小化删除 |

## 深入阅读

- 原理框架：[Agent 记忆系统原理](/ai/agent-memory-principles/)（六环节）、[混合检索原理](/ai/hybrid-retrieval-principles/)（检索算法手算）。
- 参考文章：[《从 Muse、dots 和 Grok Bot 看 Personal Agent》](https://developer.aliyun.com/article/1771609)（状态、授权、触发、跨系统身份）、[《Memory Systems for Autonomous Agents — The 2026 Landscape》](https://therealcat.ai/memory-systems-for-autonomous-agents-the-2026-landscape/)（四分型与身份连续性，含厂商自身观点，基准数字以原出处为准）、[arXiv 综述《Memory for Autonomous LLM Agents》](https://arxiv.org/abs/2603.07670)。
- 权威原文：[Claude Code Memory](https://code.claude.com/docs/en/memory)、[Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)、[Cline Memory Bank](https://docs.cline.bot/prompting/cline-memory-bank)、[Honcho](https://docs.honcho.dev/)、[ChatGPT Memory FAQ](https://help.openai.com/en/articles/8590148-memory-faq)、[Meta Muse 发布](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)、[Replika Memory](https://help.replika.com/hc/en-us/articles/37208679176077-How-does-Replika-s-memory-work)、[DeepSeekBot 仓库](https://github.com/BotHarness/BotHarness)、[AgentRun 长期记忆](https://help.aliyun.com/zh/agentrun/long-term-memory-1)、[Generative Agents 论文](https://arxiv.org/abs/2304.03442)。

---

本文的版本范围以 2026-11-17 上述官方文档与发布为准。OpenAI Dots、Grok Bot、蚂蚁灵光类产品的部分机制来自官方文档的公开转述与媒体报道，已注明；Meta 的评测数字为厂商自报。Cursor、Windsurf 与 DSH 插件生态变化较快，具体能力以你使用时的官方页面为准。
