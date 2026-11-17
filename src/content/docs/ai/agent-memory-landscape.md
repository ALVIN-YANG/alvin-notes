---
title: "Agent 记忆方案全景：六种产品方向与主流实现"
description: "收集编码助手、自托管个人 Agent、商业个人助手、记忆服务、框架运行时与托管产品的代表记忆方案，附官方来源、设计取舍与场景选型。"
date: 2026-11-17
lastUpdated: 2026-11-17
verifiedAgainst: "Claude Code、Codex、Cursor、Cline、Gemini CLI、Honcho、LangMem、Supermemory、ChatGPT、Replika 官方文档，Meta Muse 官方发布，以及 OpenAI Dots、Grok Bot、DeepSeek Harness 插件的官方仓库与文档转述，2026-11-17"
---

主流记忆方案远不止"向量数据库外挂"一种。Claude Code、Codex 这类编码助手用**人可读写、Git 可审查的 Markdown 文件**做记忆；OpenClaw、Hermes、DeepSeek Harness 走自托管分层；Meta Muse、OpenAI Dots、Grok Bot 把记忆做成**云端常驻个人 Agent 的主动能力**；Mem0、Hindsight、Honcho 把记忆做成可接入的服务；LangGraph 等框架把记忆绑在运行时状态上；ChatGPT、Claude.ai 则是聊天产品的平台记忆功能。

**选型要先选产品方向，再选具体实现。**不同方向解决不同场景的问题，直接比较"哪个记忆系统最好"没有意义。

![六种产品方向：编码助手、自托管个人 Agent、商业个人助手、记忆服务、框架运行时、托管产品](/images/ai/agent-memory-landscape/01-landscape.svg)

六环节的通用原理见[Agent 记忆系统原理](/ai/agent-memory-principles/)，检索算法见[混合检索原理](/ai/hybrid-retrieval-principles/)。本文负责把最有代表性的方案收全，并给出各自的来源。

## 1. 编码助手：文件就是记忆

编码助手的记忆大多是 Markdown 文件：启动时加载进上下文，人可以直接读写，团队可以通过 Git 共享和审查。差别在于**谁来写**和**作用域怎么分**。

### 1.1 Claude Code：CLAUDE.md 与 Auto memory 双机制

[官方文档](https://code.claude.com/docs/en/memory)明确有两套互补的记忆：

- **CLAUDE.md**：你写的持久指令，分组织策略（managed policy）、用户（`~/.claude/CLAUDE.md`）、项目三级；项目也可以直接用 `AGENTS.md`，`.claude/rules/` 还能按文件路径限定规则。根 `CLAUDE.md` 在 `/compact` 压缩后会从磁盘重新读入。
- **Auto memory**：Claude 根据你的纠正和偏好自己写笔记，按仓库存放、跨 worktree 共享，每次会话加载前 200 行或 25KB。

![Claude Code 的双记忆机制：你写的 CLAUDE.md 与 Claude 自己记的 Auto memory](/images/ai/agent-memory-landscape/02-claude-code.svg)

两者都是"加载进上下文的提示"，不是强制配置。要硬性阻止某个动作，官方建议用 PreToolUse hook，而不是指望记忆里写一条"不许做"。

### 1.2 Codex 与 Gemini CLI：分层的指令文件链

[Codex](https://developers.openai.com/codex/guides/agents-md) 启动时构建 `AGENTS.md` 指令链：先读 `~/.codex` 全局文件，再从项目根向当前目录逐级合并，越靠近当前目录优先级越高；`AGENTS.override.md` 优先于 `AGENTS.md`，合并大小默认上限 32KiB。

[Gemini CLI](https://geminicli.com/docs/cli/gemini-md/) 用同样的思路：`~/.gemini/GEMINI.md` 全局加项目、子目录的 `GEMINI.md`，`/memory show` 可以查看实际注入的合并文本，也可以通过配置兼容 `AGENTS.md` 文件名。

### 1.3 Cursor、Cline、Windsurf：规则文件与文档方法论

- **Cursor**：`.cursor/rules/` 里的 `.mdc` 规则文件，用 `alwaysApply`、`globs`、`description` 控制"总是生效 / 按文件匹配 / 按相关性 / 手动 @提及"四种加载方式；同时支持 `AGENTS.md` 和用户、团队规则，团队 > 项目 > 用户。见[官方规则文档](https://cursor.com/docs/context/memories)。
- **Cline**：Memory Bank 是一套**文档方法论**而不是自动系统——用 `projectbrief.md`、`activeContext.md`、`progress.md` 等结构化文件记录项目状态，靠"update memory bank"和"follow your custom instructions"这样的指令在新会话续接。人和 Agent 共同维护，换任何能读文档的工具都能用。见[官方 Memory Bank 指南](https://docs.cline.bot/prompting/cline-memory-bank)。
- **Windsurf（现 Devin 体系）**：`AGENTS.md` 加 `.devin/rules/` 规则文件（`always_on`、`glob`、`model_decision`、`manual` 触发），旧 `.windsurf/rules` 仍会导入。见[官方文档](https://docs.windsurf.com/windsurf/cascade/memories)。

**这个方向的共同取舍：可审查、可共享、零检索成本，但"不写就没有"，也没有自动整理。**Auto memory 是 Claude Code 对"不写就没有"的回答，代价是写错的内容也会持续被加载。

## 2. 自托管个人 Agent：冷热分层与插件生态

**OpenClaw** 把记忆放在工作区文件和 SQLite 里：全量原始会话做证据，Dreaming 后台整理出长期记忆，启动固定加载加 trigger、混合检索分级召回。适合要自托管、要审计的个人助理。见[OpenClaw 记忆系统拆解](/claw/openclaw/9-memory-system-deep-dive/)。

**Hermes** 更激进地控制成本：`MEMORY.md`（约 2200 字符）和 `USER.md`（约 1375 字符）作为冻结快照常驻系统提示，保住 prompt 缓存；全部会话进 SQLite，`session_search` 按需冷检索，更深的用户建模交给 Honcho 等可选服务。适合成本敏感的个人 Agent。机制见[源码解读](https://baoyu.io/blog/2026-04-29/manthanguptaa-2034849672985288957)。

**DeepSeek Harness（DSH）** 走"一切皆插件"的开源路线，记忆能力由社区插件补齐，两个代表：

- **DeepSeekBot（DSB）**：开源的 GrokBot 平替插件，创建一组各有身份、人格和记忆的 Bot 一起做事，支持定时任务和 Slack、飞书等渠道，MIT 协议。见[官方仓库](https://github.com/BotHarness/BotHarness)。同方向的 **ds bot** 用 Main Bot 主管统一调度多 Bot 团队来降低 token 消耗，记忆用 Markdown 本地共享（见[报道](https://www.oschina.net/news/502968)）。
- **记忆插件**：例如 [Engramory](https://github.com/tinqiao-oss/engramory) 用"一条事实一个 Markdown 文件 + 每会话加载的 `MEMORY.md` 索引"做无数据库的长期记忆；`dsh-memory-palace` 每轮注入画像与项目台账并做本地语义检索。这个生态更新很快，选择时以各插件仓库的当前 README 为准。

**这个方向的共同点是数据在本地、机制可审查，代价是运维和插件质量要自己负责。**

## 3. 商业个人助手：云端常驻与主动记忆

2026 年下半年最有代表性的变化，是大厂把记忆做成**个人 Agent 的主动能力**：Agent 在云端常驻，自己决定记什么、什么时候主动用，而不是等你提问才检索。

### 3.1 Meta Muse：主动记忆 + 专属云端 VM

[Meta 官方发布](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)把 Muse 定义为个人 AI Agent："不只回答问题，还真正做事"。每个用户有一台 Muse Secure VM（云端 Linux，含浏览器、存储、定时任务），在 App 和 WhatsApp 里用一条长对话持续工作；记忆支持下载和遗忘，发邮件、购买前会先征求同意。

随后的 [Muse Wonder 模型](https://about.fb.com/news/2026/10/introducing-muse-wonder-models/)进一步强调**主动记忆（proactive memory）与主动专注**：不用你反复交代，Agent 自己记住上下文并在长任务里不跑偏。Meta 自报的"个人超级智能指数"从 38% 提升到 47%，这是厂商自测数据，尚无第三方复现。

### 3.2 OpenAI Dots：继承 ChatGPT 记忆，再形成自己的笔记

Dots 是 OpenAI 2026 年 9 月发布的个人 Agent：每个 dot 有一台云端电脑和浏览器，连接器覆盖数千个应用。记忆分三层：继承你的 ChatGPT 记忆、从连接的应用里学习、保存自己的偏好和工作笔记（见[官方文档的机制转述](https://developer.aliyun.com/article/1771609)）。

边界同样值得注意：**关闭 ChatGPT 记忆共享、断开应用，都不会清空 dot 已经学到的内容**；目前 dot 的单个记忆不能逐条查看或编辑，删除意味着重置这个 dot（见[记忆机制分析](https://www.memorylake.ai/zh/blogs/chatgpt-dots-own-memory)）。

### 3.3 Grok Bot：记忆跟着 Bot 走，不跟着账户走

xAI 的 Grok Bot 走多 Bot 路线：你可以拥有多个不同角色、不同人格的 Bot，**每个 Bot 有自己的记忆，而不是整个账户共享一份**。这正好对应 DeepSeekBot 等开源平替的产品形态（见[设计分析](https://www.memorylake.ai/en/blogs/grok-bot-per-bot-memory)）。

国内同方向的代表是蚂蚁"灵光"：从聊天助手转向有长期记忆、能主动推进任务的个人智能体，新增"我的生活"板块对标 Muse（见[钛媒体报道](https://www.tmtpost.com/8167729.html)）。

### 3.4 Replika：陪伴型产品的分层记忆

陪伴型产品的代表 [Replika 官方说明](https://help.replika.com/hc/en-us/articles/37208679176077-How-does-Replika-s-memory-work)是分层记忆：Memory 标签页里的条目可以查看、手动添加和删除；更深层是一套根据整体对话模式逐渐形成的个性化系统，点赞正确的记忆可以强化它。官方同时建议以自动机制为主，谨慎删除。

**这个方向的共同点是记忆为"长期关系"服务：主动、连续、有状态。代价是黑盒程度更高——你能控制输入和大致开关，但很难逐条审计 Agent 到底记住了什么。**

## 4. 记忆服务：接入自己应用的外挂

这是数量最多的一类，按"主要产出什么"可以分成四组：

![记忆服务四组：提取型、图谱型、画像型、框架与自管型](/images/ai/agent-memory-landscape/03-memory-services.svg)

| 分组 | 方案 | 主要产出与特点 | 官方来源 |
| --- | --- | --- | --- |
| 提取型 | Mem0 | 对话提取成事实条目，ADD-only，多信号融合 | [README](https://github.com/mem0ai/mem0)，[本站拆解](/memory-projects/mem0/) |
| 提取型 | Hindsight | 事实 + 来源追溯，`reflect` 解释变化原因 | [官方文档](https://hindsight.vectorize.io/)，[本站拆解](/ai/hindsight-agent-memory/) |
| 提取型 | Supermemory | 托管 Memory API、用户 profile、MCP 接入，也可自托管 | [官方文档](https://docs.supermemory.ai/) |
| 图谱型 | Zep | 时序知识图谱，事实随时间失效与更新 | [官方文档](https://help.getzep.com/)，[本站拆解](/memory-projects/zep/) |
| 图谱型 | Cognee | `remember` / `recall`，构建实体关系图 | [官方文档](https://docs.cognee.ai/)，[本站拆解](/memory-projects/cognee/) |
| 画像型 | Memobase | 按业务配置生成用户 profile，控制画像结构 | [官方仓库](https://github.com/memodb-io/memobase)，[本站拆解](/memory-projects/memobase/) |
| 画像型 | Honcho | 后台形式逻辑推理，持续维护每个 peer 的用户模型 | [官方文档](https://docs.honcho.dev/) |
| 框架型 | LangMem | 热路径记忆工具 + 后台管理器，原生接 LangGraph store | [官方文档](https://langchain-ai.github.io/langmem/) |
| 自管型 | Letta | Agent 自己管理记忆文件（MemFS），`system/` 每轮注入 | [官方文档](https://docs.letta.com/)，[本站拆解](/memory-projects/letta/) |

**选择先看你要的是事实、关系还是画像**：要分散的偏好和经历，提取型够用；要"谁和谁什么关系、什么时候变的"，看图谱型；要持续的用户模型和推理，看画像型。成本不看产出形态，看写入时做多少计算：单次提取最省，实体关系构建更贵，Honcho 这类持续后台推理最高；Memobase 这类按配置字段更新的画像，成本接近提取型，并不天然更贵。

## 5. 框架运行时与托管产品：两个容易被误认的方向

**框架运行时记忆**绑定的是执行状态。LangGraph 的 checkpointer 保存任务断点，store 另存跨线程长期数据；OpenAI Agents SDK 用会话延续历史；CrewAI 区分短期、长期与实体记忆。它们解决"任务接着跑"和"同框架内共享"，不等于替你做长期用户偏好。详见各框架拆解：[LangGraph](/agent-frameworks/langgraph/)、[CrewAI](/agent-frameworks/crewai/)、[OpenAI Agents SDK](/agent-frameworks/openai-agents-sdk/)、[Google ADK](/agent-frameworks/google-adk/)。

**托管产品记忆**是聊天产品的平台功能。[ChatGPT 官方 FAQ](https://help.openai.com/en/articles/8590148-memory-faq) 把机制讲得很清楚：saved memories **独立于聊天存储**，删掉原聊天不会删掉已保存的记忆；引用历史聊天、记忆摘要、来源（Sources）各有开关；删除要分别处理记忆和原始聊天，日志还可能保留至多 30 天。Claude.ai 的记忆以主题（topics）形式从聊天中综合，支持查看、管理和无痕聊天，并在 2026 年扩展到聊天与 Cowork 共享（见[更新报道](https://www.engadget.com/2243753/claude-memory-now-works-across-both-chats-and-cowork-sessions/)）。

**这个方向适合个人消费者，不适合做产品底座**：数据归属、导出和删除规则都由平台决定，你也无法把它迁移到自己的 Agent 里。

## 6. 行业应用：记忆深度由场景决定

产品方向之外，还要看行业场景。判断一个行业 Agent 该配多重记忆，先看三个约束：**关系深度**（一次性服务还是长期关系）、**数据敏感性**（医疗、政务、金融有合规要求）、**事实来源**（业务事实必须实时查业务系统，记忆不能替代）。

![行业场景矩阵：关系深度与数据敏感性决定记忆策略](/images/ai/agent-memory-landscape/05-industry-matrix.svg)

### 6.1 游戏与角色：记忆就是产品本体

游戏 NPC、虚拟角色这类产品，用户要的是"它记得和我一起经历过什么"，长期记忆不是加分项而是核心玩法。最有代表性的范式来自斯坦福 Generative Agents 论文（[arXiv 2304.03442](https://arxiv.org/abs/2304.03442)）：

- **记忆流（memory stream）**：全量保存角色的经历。
- **召回**：按相关性、新近性、重要性取出相关片段。
- **反思（reflection）**：定期把经历整理成高层认识，再用于后续行为。

这套"全量记忆流 + 定期反思"的结构，后来也被 OpenClaw 的 Dreaming、Hindsight 的 Observation 等工程系统继承。角色场景的特殊要求是**人格一致性**：记错共同经历、用错性格，用户立刻"出戏"，所以记忆质量比召回数量更重要。

### 6.2 企业 AI 员工：归属、审计与权限优先

企业数字员工的记忆不只是"记住客户偏好"，还要回答"这条记忆属于哪个租户、谁改的、能不能删"。以[阿里云 AgentRun 长期记忆](https://help.aliyun.com/zh/agentrun/long-term-memory-1)为例的企业平台机制：

- 每条记忆关联 **User ID / Agent ID / Run ID**，向量语义检索必须带归属过滤。
- 记忆条目有**版本历史**：新增、更新、删除都带时间戳和操作者，可对比新旧值。
- 支持 MCP 接入，并兼容 mem0 客户端接口，方便迁移。

企业场景还要区分**团队共享记忆**（岗位 SOP、服务规范）和**个人记忆**（某个员工的客户上下文），两者权限不同。记忆内容同样不能越权：客服 Agent 不能因为"记得"就绕过审批执行退款。

### 6.3 导游、医院、政务指引：记忆要克制

智慧导游、医院指引、政务指引这类服务，用户要的是**当前准确的业务答案**，不是"它记得我"。主体应该是：

- **业务知识库 RAG**：景点介绍、科室分布、办事流程，靠检索而非记忆。
- **实时接口**：号源、窗口时间、政策变动，必须实时查，历史记忆里的答案可能已过期。
- **克制的长期记忆**：只放低风险偏好，比如语言、无障碍需求、常用院区；身份、病历、证件信息最小化保存、可删除，并满足当地合规要求。

这类场景引入重型记忆系统通常是负收益：增加泄露面和合规成本，换来的个性化却很有限。

## 7. 场景选型：先看约束，再看实现

![十个典型场景对应的记忆方案选择](/images/ai/agent-memory-landscape/04-selection.svg)

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

同一个应用可以组合多个方向：编码助手用文件记忆管项目约定，同时用记忆服务管终端用户偏好，两者不冲突。

## 进阶附录

### A. 全景对照表

| 方向 | 代表方案 | 谁写记忆 | 召回方式 | 主要边界 |
| --- | --- | --- | --- | --- |
| 编码助手 | Claude Code | 你 + Claude（auto memory） | 启动加载 | 非强制配置，无自动整理（CLAUDE.md） |
| 编码助手 | Codex / Gemini CLI | 你 | 分层合并注入 | 32KiB 等容量限制 |
| 编码助手 | Cursor / Windsurf | 你 + 团队 | 按规则条件加载 | 规则需要维护 |
| 编码助手 | Cline Memory Bank | 你 + Agent | 新会话读文档 | 靠指令纪律，非自动系统 |
| 自托管 | OpenClaw | 全量 + Dreaming | 固定 + trigger + 混合检索 | 自托管运维 |
| 自托管 | Hermes | Agent 策展 | 冻结快照 + FTS5 冷检索 | 小容量，中途写入下次可见 |
| 自托管 | DSH 插件（DSB、Engramory 等） | 插件与模型 | 注入 + 本地检索 | 插件质量参差，生态变化快 |
| 商业个人助手 | Meta Muse | Agent 主动记忆 | 云端常驻主动使用 | 厂商自测数据，平台边界 |
| 商业个人助手 | OpenAI Dots | 继承 + 应用 + 自有笔记 | 任务中主动使用 | 不可逐条编辑，删除即重置 |
| 商业个人助手 | Grok Bot | 每个 Bot 各自记忆 | 按 Bot 隔离召回 | 黑盒程度高 |
| 商业个人助手 | Replika | 自动分层 + 手动条目 | 个性化持续生效 | 陪伴定位，不适合任务型产品 |
| 记忆服务 | Mem0 / Hindsight / Supermemory | 模型提取 | 多信号融合 | 提取成本与错误 |
| 记忆服务 | Zep / Cognee | 模型构图 | 图谱 + 语义 | 构建成本更高 |
| 记忆服务 | Honcho / Memobase | 后台推理 | 画像查询 | 推理成本，画像可能推断过度 |
| 框架运行时 | LangGraph / ADK / CrewAI | 运行时 | 状态读取 | 不等于长期用户偏好 |
| 托管产品 | ChatGPT / Claude.ai | 平台 | 平台决定 | 不可移植，删除规则平台定 |
| 行业应用 | 游戏 NPC（Generative Agents 范式） | 全量记忆流 + 反思 | 相关性 / 新近性 / 重要性召回 | 人格一致性要求高 |
| 行业应用 | 企业 AI 员工（AgentRun 等） | 平台与模型 | 归属过滤 + 向量检索 | 租户隔离、审计、权限 |
| 行业应用 | 导游 / 医院 / 政务指引 | 克制的偏好记录 | 知识库 RAG + 实时接口 | 敏感数据最小化，事实实时查 |

### B. 深入阅读

- 原理框架：[Agent 记忆系统原理](/ai/agent-memory-principles/)、[混合检索原理](/ai/hybrid-retrieval-principles/)。
- 产品拆解：[OpenClaw](/claw/openclaw/9-memory-system-deep-dive/)、[Mem0](/memory-projects/mem0/)、[Hindsight](/ai/hindsight-agent-memory/)、[Zep](/memory-projects/zep/)、[Letta](/memory-projects/letta/)、[Memobase](/memory-projects/memobase/)、[Cognee](/memory-projects/cognee/)。
- 权威原文：[Claude Code Memory](https://code.claude.com/docs/en/memory)、[Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md)、[Cline Memory Bank](https://docs.cline.bot/prompting/cline-memory-bank)、[Honcho](https://docs.honcho.dev/)、[ChatGPT Memory FAQ](https://help.openai.com/en/articles/8590148-memory-faq)、[Meta Muse 发布](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/)、[Replika Memory](https://help.replika.com/hc/en-us/articles/37208679176077-How-does-Replika-s-memory-work)、[DeepSeekBot 仓库](https://github.com/BotHarness/BotHarness)、[AgentRun 长期记忆](https://help.aliyun.com/zh/agentrun/long-term-memory-1)、[Generative Agents 论文](https://arxiv.org/abs/2304.03442)。

---

本文的版本范围以 2026-11-17 上述官方文档与发布为准。OpenAI Dots、Grok Bot、蚂蚁灵光的部分机制来自官方文档的公开转述与媒体报道，已注明；Meta 的评测数字为厂商自报。Cursor、Windsurf 与 DSH 插件生态变化较快，具体能力以你使用时的官方页面为准。
