---
title: "Matt Pocock Skills：让 AI 编程回归工程本质的组合技"
description: "基于 v1.2.3 拆解 Matt Pocock Skills：从 grilling、spec、TDD 到 Codex 元数据、上下文边界与人工操作 wizard，理解一套可组合的 AI 工程工作流。"
sidebar:
  order: 11
date: 2026-02-10
lastUpdated: 2026-10-11
---

> - 仓库地址：[mattpocock/skills](https://github.com/mattpocock/skills)
> - 本文核对基线：[v1.2.3](https://github.com/mattpocock/skills/releases/tag/v1.2.3)（2026-08-06） · [CHANGELOG](https://github.com/mattpocock/skills/blob/main/CHANGELOG.md)
> - 订阅更新：[Skills Newsletter](https://www.aihero.dev/s/skills-newsletter)

先说结论：**这不是又一个 prompt 集合，也不是 vibe coding 的加速器。Matt Pocock 的 skills 是一套用工程纪律对抗 AI 编程熵增的组合拳。**

它的核心假设很简单：AI 没有消灭软件工程的复杂性，只是把它转移了——从"写代码"转移到了"对齐需求、控制质量、维护架构"。如果你不做任何改变，AI 加速的不是你的产出，而是你的技术债务。

这套 skills 的设计初衷，就是把《程序员修炼之道》和《软件设计哲学》里沉淀了几十年的原则，压缩成 agent 能直接执行的工作流。调用模型仍然按**谁来调用**分成 **User-invoked**（用户显式触发，负责编排）和 **Model-invoked**（agent 自动选用，负责具体纪律）两类，主线是一条清晰的 **Idea → Ship** 流程。

`v1.2.x` 的重点不是继续堆 prompt，而是补齐跨 agent 的工程基础设施：每个 promoted skill 都带 `agents/openai.yaml`，Codex 能正确显示并遵守显式/隐式调用策略；Claude Code 有官方 marketplace plugin；同时新增 `/to-questionnaire`、`/wait-what`、`/wizard`，并把 `/writing-great-skills` 重构为适用范围更广的 `/writing-for-agents`。

---

## 一、四个失败模式：AI 编程的真正瓶颈

Matt 在 README 里开宗明义地列出了四个失败模式。理解它们是使用这套 skills 的前提，因为**每个 skill 都是针对特定失败模式的解药**。

```mermaid
flowchart LR
    subgraph Problems["AI 编程的四个失败模式"]
        P1["🎯 不对齐<br/>Agent 做了你想不到的"]
        P2["🗣️ 太啰嗦<br/>20 个词说 1 个词的事"]
        P3["💥 跑不通<br/>没有反馈循环，盲飞"]
        P4["🧱 泥球<br/>加速写代码 = 加速熵增"]
    end

    subgraph Skills["对应 Skills"]
        S1["/grill-me<br/>/grill-with-docs"]
        S2["CONTEXT.md<br/>/domain-modeling"]
        S3["/tdd<br/>/diagnosing-bugs"]
        S4["/improve-codebase-architecture<br/>/to-spec /codebase-design"]
    end

    P1 --> S1
    P2 --> S2
    P3 --> S3
    P4 --> S4
```

### 1. 不对齐（The Agent Didn't Do What I Want）

> "No-one knows exactly what they want"
> —— David Thomas & Andrew Hunt, 《程序员修炼之道》

这是软件工程最古老的问题，AI 时代没有自动消失。你对着 agent 描述需求，它点头称是，写完一看——完全不是你想要的。

**解法不是把 prompt 写得更长，而是先做一场 grilling session。** `/grill-me` 和 `/grill-with-docs` 的作用，就是逼 agent 在写第一行代码之前，把每个决策分支都问清楚。

### 2. 太啰嗦（The Agent Is Way Too Verbose）

Agent 被丢进项目时，它不懂你的业务术语。它不知道你管这叫 "materialization cascade"，于是每次都要说"当课程里的一个 lesson 在 section 中被赋予文件系统位置时的问题"。20 个词，本来 1 个词就能搞定。

**解法是建立共享语言。** `/grill-with-docs` 会边 grilling 边维护 `CONTEXT.md`——一个项目术语表；`/domain-modeling` 则把维护这套语言变成一种主动纪律。一旦定义清楚，agent 和你用同一套语言说话，token 消耗下降，命名一致性上升。

### 3. 跑不通（The Code Doesn't Work）

Agent 没有眼睛。它看不到浏览器报错，跑不了测试，给不了反馈。它生成代码，然后"希望它能跑"。

**解法是给它反馈循环。** `/tdd` 强制 red-green-refactor 循环，`/diagnosing-bugs`（注意不是旧的 `/diagnose`）把 debug 变成结构化流程。Agent 不再盲飞，而是有明确的 pass/fail 信号指引每一步。

### 4. 泥球（We Built A Ball Of Mud）

AI 写代码的速度是人类的几倍，于是代码腐烂的速度也是几倍。三个月后，你面对的是一个 agent 也改不动的泥球。

**解法是持续投资设计。** `/improve-codebase-architecture` 每几天跑一次，像请了一个常驻架构师。`/to-spec` 在动手前先问你会碰哪些模块，`/codebase-design` 提供 deep module、seam、adapter 等统一词汇，让设计讨论不再含糊。

---

## 二、30 秒安装：先选管理方式

### Codex 与其他 agent：复制一份可编辑的 skills

```bash
npx skills@latest add mattpocock/skills
```

这种方式把文件复制进你的环境或项目，适合 Codex，也允许你直接修改。之后需要主动拉取上游更新：

```bash
npx skills update
```

### Claude Code：订阅只读 plugin

```bash
claude plugins install mattpocock-skills
```

Claude Code plugin 来自官方 marketplace，是受管理、只读且随上游更新的整套 bundle。不要同时再用 `skills.sh` 安装一份，否则同一个 skill 会出现两份。

使用 `skills.sh` 时，安装器会引导你做两件事：

1. **挑选你想要的 skills**，以及要安装到哪些 coding agent（Claude Code、Codex 等）上。务必勾选 `/setup-matt-pocock-skills`。
2. 在你的仓库里运行 `/setup-matt-pocock-skills`，它会进一步问你：
   - **Issue tracker** —— GitHub Issues / Linear / 本地 markdown（`.scratch/`）
   - **Triage label** —— 仅在安装了 `/triage` 时询问，默认沿用推荐标签
   - **Domain docs 布局** —— 普通仓库默认单上下文；检测到 monorepo 信号才询问多上下文布局

安装完成后，仓库里会多出：

```
AGENTS.md（或 CLAUDE.md）
├── ## Agent skills
│   ├── Issue tracker
│   ├── Triage labels
│   └── Domain docs
docs/agents/
├── issue-tracker.md
├── triage-labels.md
└── domain.md
```

**这是基础设施，每个仓库跑一遍即可。** 之后 engineering skills 会读取这些配置，知道 issue 存在哪、标签怎么叫、上下文文档在哪。`v1.2` 还为每个 skill 增加了 `agents/openai.yaml`：user-invoked skill 在 Codex 中设置 `policy.allow_implicit_invocation: false`，只能显式 `$skill` 调用；model-invoked skill 则能根据描述自动触发。

### 从 v1.1 升级到 v1.2.x

升级后至少检查四件事：

1. 重新运行 `npx skills update`，确认安装到 Codex 的 skill 旁边存在 `agents/openai.yaml`。
2. 用 `/writing-for-agents` 替换 `/writing-great-skills`；这是 breaking rename，没有旧名称 alias。
3. 本地 tracker 把合并的 `tickets.md` 迁移为 `.scratch/<feature>/spec.md` 与 `issues/<NN>-<slug>.md`。
4. 如果 Claude Code 已安装官方 plugin，删除通过 `skills.sh` 复制的重复版本，只保留一种来源。

同时，`ubiquitous-language`、`design-an-interface`、`qa`、`request-refactor-plan` 等旧 skill 已退出仓库；相应能力分别并入 `/domain-modeling`、`/codebase-design`、`/triage`、`/to-tickets`、`/to-spec` 与 `/improve-codebase-architecture`。

---

## 三、技能全景图：User-invoked vs Model-invoked

现在整套 skills 按**调用者**分成两类，而不是按功能领域分。这个划分很关键：

- **User-invoked**：只能你手动触发，职责是**编排**——决定下一步走哪个 skill。
- **Model-invoked**：可以由你触发，也可以由 agent 在合适时自动调用，职责是**具体纪律**——执行某个可复用的工程原则。

一条规则：user-invoked skill 可以调用 model-invoked skill，但不会调用另一个 user-invoked skill。

```mermaid
flowchart TB
  Root([Matt Pocock Skills]) --> User[User-invoked]
  Root --> Model[Model-invoked]

  User --> UserEngineering[Engineering]
  User --> UserProductivity[Productivity]
  UserEngineering --> UserEngineeringSkills["/ask-matt · /grill-with-docs · /to-spec<br/>/to-tickets · /implement · /wayfinder · /triage<br/>/improve-codebase-architecture · /setup-matt-pocock-skills"]
  UserProductivity --> UserProductivitySkills["/grill-me · /handoff · /teach<br/>/to-questionnaire · /wait-what"]

  Model --> ModelEngineering[Engineering]
  Model --> ModelProductivity[Productivity]
  ModelEngineering --> ModelEngineeringSkills["/prototype · /tdd · /diagnosing-bugs · /code-review<br/>/research · /domain-modeling · /codebase-design<br/>/resolving-merge-conflicts · /wizard"]
  ModelProductivity --> ModelProductivitySkills["/grilling · /writing-for-agents"]
```

注意一个关键设计：**这些 skill 是组合用的，不是单独用的。** 就像你不会只用锤子盖房子，你也不会只靠 `/tdd` 做工程。

---

## 四、核心工作流：Idea → Ship 的主流程

更新后的 Matt Pocock Skills 有一条最常用主线，它把几乎所有 engineering skill 串了起来：

```mermaid
sequenceDiagram
    actor U as You
    participant A as /ask-matt
    participant G as /grill-with-docs
    participant C as CONTEXT.md
    participant P as /prototype
    participant H as /handoff
    participant S as /to-spec
    participant T as /to-tickets
    participant I as /implement
    participant D as /diagnosing-bugs
    participant R as /code-review

    U->>A: 我想做 X，该走哪个 skill？
    A-->>U: 推荐从 /grill-with-docs 开始
    U->>G: "我想做 X"
    G->>U: grilling（按 frontier 分轮确认）
    G->>C: 更新术语表 + ADR

    alt 有需要验证的问题
        U->>P: /prototype 验证方案
        P-->>U: 可运行原型 / 多版 UI 对比
    end

    opt 上下文必须跨工具、目录或人员移动
        U->>H: 生成可移植上下文
        H-->>U: handoff 文档
    end

    alt 多会话才能做完
        U->>S: 方案确定，生成 spec
        S->>T: 拆成带 blocking edges 的 tickets
        loop 每个 ticket
            U->>I: /implement（内部驱动 /tdd + /code-review）
            I-->>U: 行为级测试通过 + 代码审阅
        end
    else 一个会话能做完
        U->>I: /implement（内部驱动 /tdd + /code-review）
        I-->>U: 行为级测试通过 + 代码审阅
    end

    opt 遇到 bug
        U->>D: reproduce → minimise → fix
        D-->>U: 回归测试通过
    end
```

### 阶段 1：入口 —— `/ask-matt`

如果你忘了该用哪个 skill，先问 `/ask-matt`。它相当于整个仓库的路由器，会根据你的情况推荐下一步：

- 有代码库、想加功能 → `/grill-with-docs`
- 没有代码库、先梳理想法 → `/grill-me`
- 一堆 bug/需求要分类 → `/triage`
- 碰到棘手 bug → `/diagnosing-bugs`
- 项目太大、方向不清 → `/wayfinder`
- 需要别人补齐你不知道的信息 → `/to-questionnaire`
- 卡在必须人工操作的控制台或凭证步骤 → `/wizard`

`v1.2` 还补上了**阶段边界**判断。对话进入新阶段时，顺序不是无脑 `/handoff` 或 `/compact`，而是先问：能否直接继续？是否应 `/clear` 丢掉不再需要的上下文？能否把独立任务交给 subagent？只有上下文要跨工具、目录、人员或旁支移动时才用 `/handoff`；`/compact` 是前面都不合适时的最后选择。

### 阶段 2：对齐 —— `/grill-with-docs`

这是整个工作流里最重要的一步，也是大多数人跳过的那步。

当你说"我想加个搜索功能"，agent 直接开写是灾难。`/grill-with-docs` 会把它变成一场结构化面试：

- Agent 先复述它理解的需求，标出所有假设
- 先画出 decision tree，再把当前 prerequisites 已满足的整组 **frontier** 问题放在同一轮
- 环境能够查明的事实交给 subagent，不把可检索问题反问给用户
- 遇到模糊术语，立刻要求精确定义
- 精确定义的术语实时写入 `CONTEXT.md`
- 重大且不可逆的决策，提议写入 `docs/adr/`

**示例对话片段：**

> **你**："用户搜索需要支持拼音和模糊匹配。"
>
> **Agent**："你用了'用户'这个词。在 CONTEXT.md 里，'用户'对应的是 `Customer`（下单的人）还是 `User`（系统账号）？拼音匹配是指商品标题的拼音，还是用户输入的拼音？"
>
> **你**："是 `Customer` 搜索商品标题的拼音。"
>
> **Agent**："[实时写入 CONTEXT.md] `Customer`: 在本系统中指下单的终端消费者，区别于后台 `User`..."

这个环节的价值在第三、第四次对话时开始复利：agent 不再重复解释基本概念，代码命名自动对齐业务语言，新加入的 agent 读一遍 `CONTEXT.md` 就能跟上节奏。

### 阶段 3：验证 —— `/prototype`

如果方案涉及不确定的技术选型或交互设计，不要直接开写生产代码。`v1.2` 的 `/prototype` 会做两件事之一：

- **逻辑原型**：一个无需构建、双击即可打开的自包含 HTML；包含状态面板、自由操作按钮和按场景组织的 guided walkthrough
- **UI 变体**：在同一个路由下挂载多个完全不同的 UI 方案，你可以 toggle 对比

**关键原则仍然是 throwaway code，但不再等于删掉证据。** 验证完成后，把结论并入正式实现；原型本身提交到独立的 `prototype/<name>` throwaway branch，并在 implementation issue 中留下 context pointer。这样 `main` 只保留经过验证的决定，探索过程仍可追溯。

### 阶段 4：规划 —— `/to-spec` + `/to-tickets`

对齐完成、方案验证后，用 `/to-spec` 把对话上下文合成为一份 spec。它不会重新采访你，而是基于已经讨论过的内容生成：

- Problem Statement
- Solution
- 大量细化的 User Stories
- Implementation Decisions（模块边界、接口设计、测试 seam）
- Testing Decisions
- Out of Scope

`/to-tickets` 再把 spec 拆成**垂直切片**（tracer-bullet vertical slices），并且明确标出每个 ticket 的 **blocking edges**——哪些 ticket 必须先完成。在真实 tracker 上这些会映射成阻塞链接；本地 markdown tracker 则使用 `.scratch/<feature>/spec.md`，每个 ticket 单独保存为 `.scratch/<feature>/issues/<NN>-<slug>.md`，不再生成一个合并的 `tickets.md`。

### 阶段 5：实现 —— `/implement`

`/implement` 是新版 workflow 里变化最大的一个 skill。它不再让你手动按 `/tdd` 一步步来，而是作为 orchestrator：

1. 读取 spec 或 tickets
2. 在预定义好的 seam 上驱动 `/tdd`：red → green → refactor
3. 跑类型检查和单测，最后跑完整测试套件
4. 用 `/code-review` 做两轴审阅（Standards + Spec）
5. 提交到当前分支

**核心纪律：垂直切片，不是水平切片。**

```
❌ 水平切片（错误）：
   RED:   写完全部测试
   GREEN: 写完全部实现
   REFACTOR: 一起重构

✅ 垂直切片（正确）：
   RED→GREEN→REFACTOR: 测试 1 + 实现 1
   RED→GREEN→REFACTOR: 测试 2 + 实现 2
   RED→GREEN→REFACTOR: 测试 3 + 实现 3
```

`/tdd` 要求 agent：

1. **先确认接口** —— public API 长什么样，行为是什么
2. **写一个测试** —— 只测试一个行为，通过 public interface
3. **写最小实现** —— 刚好让测试通过
4. **重构** —— 提取 deep module，消除重复

**什么是 deep module？** 小接口，大实现。调用者知道得少，模块内部处理得多。这是 John Ousterhout 在《A Philosophy of Software Design》里的核心概念，被 `/tdd`、 `/improve-codebase-architecture` 和 `/codebase-design` 反复强化。

### 阶段 6：审阅 —— `/code-review`

`/code-review` 是新增的重要模型调用 skill。它从某个固定点（commit、branch、tag）开始 review diff，沿两个轴并行进行：

- **Standards**：是否符合仓库的编码标准，并叠加 Fowler 的 smell baseline（如 Mysterious Name、Duplicated Code、Feature Envy 等）
- **Spec**：是否忠实实现了原始 issue / spec

两个轴各开一个 sub-agent 并行跑，避免互相污染上下文，最后汇总结果。

### 阶段 7：排障 —— `/diagnosing-bugs`

遇到 hard bug 时，不要随机改代码碰运气。`/diagnosing-bugs` 强制执行六阶段循环：

| 阶段 | 核心动作 | 纪律 |
|------|---------|------|
| 1. 建立反馈环 | 构造可自动运行的 repro | 没有 loop 就不进入下一阶段 |
| 2. 复现 | 确认 loop 输出的是用户描述的问题 | 不是"类似"的问题 |
| 3. 假设 | 生成 3-5 个可证伪的假设 | 不能陈述预测的假设 = vibe |
| 4. 仪器 | 一次只改一个变量 | 优先 debugger，拒绝"log everything" |
| 5. 修复 + 回归测试 | 先写回归测试，再修 | 没有 correct seam 是架构发现 |
| 6. 清理 + 复盘 | 删除所有 `[DEBUG-...]` 标记 | 追问：什么能预防这个 bug？ |

最被低估的是 Phase 1：**构造反馈环**。`/diagnosing-bugs` 列出了 10 种构造 loop 的方式，从 failing test 到 HITL bash script。有了一个能在几秒内给出确定 pass/fail 的 loop，bug 往往已经解决了一大半。

`v1.2.3` 还加了一条必须前置的安全纪律：命令、日志、HAR 和其他捕获产物在展示前先把 secret 替换为 `<REDACTED>`；反馈循环通过环境变量读取凭证，只引用能承载诊断信号的行。需要原始凭证才能继续时，应停下来向用户说明，而不是把敏感信息贴进上下文。

### 阶段 8：维护 —— `/improve-codebase-architecture`

建议每两三天在活跃项目上运行一次。它会：

1. 读取 `CONTEXT.md` 和 `docs/adr/`
2. 读取最近约 20 条 commit，把扫描范围偏向仍在活跃变化的代码
3. 用 Explore agent 遍历目标范围
4. 寻找**浅模块**（interface 和 implementation 复杂度接近）
5. 生成一份带 Before/After 图表的 HTML 报告
6. 对每个候选重构给出 `Strong` / `Worth exploring` / `Speculative` 评级

**关键概念：deletion test。** 想象删掉这个模块，复杂度是消失了（说明它是 pass-through），还是分散到了 N 个调用方（说明它确实在承担职责）？后者才是 deep module。

---

## 五、新加入的核心技能

除了主线里的技能，还有几个值得单独拎出来：

### `/wayfinder`：大雾中的地图

当你面对一个"太大了，一个会话装不下"的需求——比如全新项目、大型重构——`/grill-with-docs` 已经不够用了。`/wayfinder` 会先在 issue tracker 上画一张**共享地图**（shared map），把大雾切成一个个 **decision ticket**：每个 ticket 的产物是一个决定，而不是一段代码。

其中 research ticket 会由 `/research` subagent 并行消解，并把证据保存在 `research/<name>` throwaway branch。地图清晰后，默认并入 `/to-spec`，由 spec 把关联决定压缩成可实施计划；只有工作最终小到不需要 spec 时才直接 `/implement`。

### `/research`：把调研交给后台 agent

需要查官方文档、API 行为、源码实现？`/research` 会启动一个后台 sub-agent，让它去读一手资料，并把结论写成带引用的 Markdown 文件。你可以继续做别的事，等它汇报。

### `/domain-modeling` 与 `/codebase-design`：词汇层

这两个是 model-invoked 的**词汇层** skill：

- `/domain-modeling` 维护领域语言：挑战模糊术语、消解一词多义、把不可逆决策写入 ADR。
- `/codebase-design` 提供 deep-module 词汇：module、interface、depth、seam、adapter、leverage、locality。

它们通常被 `/grill-with-docs`、`/tdd`、`/improve-codebase-architecture` 自动调用；你也可以在"词不对"或"接口设计拿不准"时直接触发。

### `/to-questionnaire`：向真正知道答案的人提问

当关键决定依赖产品、法务、客户或运维，而你自己不知道答案时，用 `/to-questionnaire`。它不会假装替对方回答，也不会 grill 你不掌握的业务事实；它只询问这份问卷**发给谁**、**你需要拿回什么**，然后生成一份可异步填写或会议共创的 Markdown 问卷。

### `/wizard`：把人工步骤变成可重复脚本

`/wizard` 是 model-invoked engineering skill。遇到 agent 无法代做的第三方控制台、基础设施开通、凭证或 CI secret 配置、一次性迁移时，它生成交互式 Bash wizard：逐阶段打开 URL、说明点击路径、隐藏输入 secret，并把值幂等写入 `.env` 或 GitHub Actions。它只服务于**必须由人完成**的步骤；agent 能直接完成的工作不应转嫁给 wizard。

### `/wait-what` 与 `/writing-for-agents`：修复沟通层

- `/teach`：把当前目录当作一个有状态的教学生工作区，分多次会话教用户一个新概念或技能。
- `/wait-what`：当 agent 上一句没讲明白时，用一个极短的显式指令要求它补足上下文、使用 ASD-STE100 简化英语，并复用 `CONTEXT.md` 术语。它修复当前消息，不替代前期领域建模。
- `/writing-for-agents`：`/writing-great-skills` 的 breaking rename。适用范围从 skill 扩展到所有 agent 会读取的文档，包括 `AGENTS.md`、`CLAUDE.md` 和通过 context pointer 引用的说明。它现在是 model-invoked，强调 leading word、progressive disclosure、completion criterion，以及不要把环境中一条命令就能查到的信息重复缓存进文档。

### `/resolving-merge-conflicts`：按意图解决冲突

这个 model-invoked skill 处理正在进行的 merge 或 rebase。它逐 hunk 回到两边的 primary source 判断意图并完成操作，而不是看到冲突就 `--abort`，也不是机械选择 ours/theirs。

---

## 六、三个高价值使用场景

### 场景 A：从零开始一个新功能（完整闭环）

```
你：/ask-matt "我要加一个订单导出功能，支持 CSV 和 Excel，
              数据量可能到 50 万行，不能卡死前端。"

→ /ask-matt 推荐：/grill-with-docs

你：/grill-with-docs
     "我要加一个订单导出功能，支持 CSV 和 Excel，
      数据量可能到 50 万行，不能卡死前端。"

→ agent grilling，确认：
  - "导出"是异步还是同步？→ 异步
  - "不卡死前端"具体指标？→ 点击后 100ms 内响应，后台生成
  - 文件存储？→ 临时 S3，24h 过期
  - CSV/Excel 库已有？→ 无，需要引入

→ 术语写入 CONTEXT.md：
  **ExportJob**: 异步生成订单导出文件的后台任务
  _Avoid_: batch download, export task

→ /prototype（验证 Excel 生成性能）
→ /to-spec（生成 spec，发布到 GitHub Issues）
→ /to-tickets（拆成 4 个垂直切片，标 blocking edges）
→ /implement（逐个切片：/tdd + /code-review）
→ /improve-codebase-architecture（周五下午跑一遍）
```

### 场景 B：接手 legacy 代码改 bug

```
你：/diagnosing-bugs
     "这个接口偶发 500，大约 1% 概率，
      错误是 KeyError: 'user_id'，
      只在生产环境出现，本地复现不了。"

→ Phase 1：构造反馈环
  - 捕获生产环境的 HAR / 日志
  - 写一个 replay harness，用真实 payload 跑隔离代码
  - 把 1% 的 flake 提升到 50%（加并发、减延迟）

→ Phase 3：3 个假设
  1. Nginx 头转换偶尔失败 → 预测：直接访问会 100% 复现
  2. 上游服务偶尔不传头 → 预测：日志里会有特定 trace
  3. 大小写敏感问题 → 预测：小写头有时不存在

→ Phase 5：修复 + 回归测试
  - 先写测试：mock 无头请求 → 应 401
  - 修复：兼容 user_id / X-User-Id / 缺失
  - 跑回归 loop，确认 1% 不再出现

→ /improve-codebase-architecture
  - 发现：auth 中间件没有统一 seam
  - 建议：提取 AuthAdapter，已有 2 处调用 → 值得做
```

### 场景 C：跨越阶段边界，不要先 `/compact`

当 grilling 结束、准备进入实现，或长对话开始变重时，按这个顺序判断：

```
1. Continue：当前上下文仍准确且有用，直接继续
2. /clear：下一阶段不需要前面的对话，清空更干净
3. Subagent：任务独立、范围清楚，可以后台完成
4. /handoff：上下文必须移动到新工具、新目录、同事或旁支任务
5. /compact：以上都不合适，才压缩当前会话
```

`/handoff` 的价值是**可移植性**，不是“上下文快满了”的通用答案；`/compact` 会把一手对话变成摘要，太早使用可能把关键权衡压平。

---

## 七、隐藏杀手：CONTEXT.md 的飞轮效应

很多人把 mattpocock/skills 当成功能清单来用，却忽略了它最深的设计——**共享语言**。

```mermaid
flowchart TD
    A["开始项目<br/>术语混乱"] --> B["使用 /grill-with-docs<br/>逐个定义术语"]
    B --> C["写入 CONTEXT.md<br/>建立术语表"]
    C --> D["Agent 使用统一术语<br/>代码命名一致"]
    D --> E["代码更易导航<br/>Agent 更快理解"]
    E --> F["新 Agent 读 CONTEXT.md<br/>30 秒上手"]
    F --> G["更多术语被精确定义<br/>CONTEXT.md 增厚"]
    G --> C

    style C fill:#2563eb,color:#fff
    style D fill:#2563eb,color:#fff
```

**CONTEXT.md 的规则：**

- 只包含项目**特有**的业务术语，不包含通用编程概念
- 每个术语：一句话定义 + `_Avoid_` 列表（禁用同义词）
- 要 opinionated：同一概念多个词时，选一个最好的，其他的列为 avoid

**ADR（Architecture Decision Record）的规则：**

只有当三个条件同时满足时才写：

1. **难以逆转** —— 改主意成本很高
2. **没有上下文会令人困惑** —— 未来读者会问"为什么这样"
3. **真实权衡的结果** —— 有其他可行方案，你选了其中一个

这意味着 ADR 不是日记，不是文档，而是**防止未来重复讨论同一问题的 lock file**。

---

## 八、如何组合出你自己的工作流

Matt 的设计哲学是：**小、可组合、可 hack。** 你不需要用全部 skills，也不需要按固定顺序。但建议遵循以下原则：

| 原则 | 说明 |
|------|------|
| **Always grill first** | 任何超过 20 行代码的改动，先用 `/grill-me` 或 `/grill-with-docs` |
| **One vertical slice at a time** | 用 `/implement` / `/tdd` 时，拒绝"先写所有测试"的诱惑 |
| **Feedback loop before hypothesis** | 用 `/diagnosing-bugs` 时，没有 repro 就不猜测 |
| **Invest in design every few days** | 活跃项目每 2-3 天跑一遍 `/improve-codebase-architecture` |
| **Context is code** | 把 `CONTEXT.md` 和 `docs/adr/` 当成代码一样维护，review 时过一遍 |
| **Use `/code-review` before merge** | 让两个 sub-agent 并行审 Standards 和 Spec，避免视角污染 |

**最小可用工作流（如果你只想试一个）：**

```
1. /setup-matt-pocock-skills（一次）
2. /grill-with-docs（每次新功能）
3. /implement（编码时）
```

这三步已经能覆盖大部分“AI 写的东西没法用”的场景，剩下的再按需加 `/to-spec`、`/diagnosing-bugs` 等技能。

---

## 九、总结

Matt Pocock 的 skills 之所以有价值，不是因为它让 AI 写得更快，而是因为它让 AI 写得更对。

| vibe coding | mattpocock/skills |
|-------------|-------------------|
| 说完需求就转身 | 先 grilling 对齐 |
| Agent 猜你的术语 | 共建 CONTEXT.md |
| 写完再测试 | red-green-refactor + /code-review |
| 碰到 bug 随机改 | 结构化 diagnosing-bugs |
| 代码自然腐烂 | 主动 improve architecture |
| 一次性的魔法 | 可复利的工程纪律 |

如果你已经在用 Claude Code、Codex 或其他 agent 做实际开发，花一个下午配置这套 skills，然后坚持用一个星期。最大的变化可能不是代码质量本身，而是你和 agent 之间的**对话质量**——从"你猜我要什么"变成"我们一起把问题想清楚"。

那才是 senior engineer 的工作方式，不管写代码的是人还是 AI。
