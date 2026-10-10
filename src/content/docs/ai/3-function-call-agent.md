---
title: Function Call、Agent、MCP 与 Skill：各自负责什么
description: 用查天气的一次工具调用，分清调用格式、任务循环、接入协议和可复用说明，并说明权限与业务结果的边界
slug: ai/function-call-agent
date: 2026-01-11
lastUpdated: 2026-10-11
---

**Function Call 声明一次调用，Agent 组织多步任务，MCP 统一工具接入，Skill 提供可复用说明。** 四者可以按需组合，不是依次升级的必选层级。模型提出调用，宿主代码（Host）校验并执行，结果再交回模型。

调用格式合法，不代表选对工具、填对 ID 或有权操作资源。权限、幂等和实际结果仍由执行代码检查。查天气可以只用一次工具调用；需要根据天气继续规划行程时，再由 Agent 推进下一步。

![Function Call、Agent、MCP、Skill 各自的职责](/images/ai/function-call-agent-stack.svg)

## Function Call（工具调用）

以“上海天气怎么样？”为例，一次调用分四步。下面沿用 Chat Completions 风格，只展示必要字段，省略完整请求与响应封装；天气数值是示例。实际接入按所用 API 和 SDK 的字段定义。

**第 1 步：定义工具（Tool Definition）**

开发者通过 JSON Schema 告诉模型有哪些工具可用：

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "获取指定城市的当前天气",
    "parameters": {
      "type": "object",
      "properties": {
        "location": { "type": "string", "description": "城市名称" }
      },
      "required": ["location"]
    }
  }
}
```

**第 2 步：模型决策调用（Tool Call）**

模型不直接回答，而是返回一个结构化的调用请求：

```json
{
  "tool_calls": [{
    "id": "call_abc123",
    "function": {
      "name": "get_weather",
      "arguments": "{\"location\": \"上海\"}"
    }
  }]
}
```

关键点：**模型自己不执行函数**，它只负责决定调用哪个函数、传什么参数。

**第 3 步：Host 校验并执行（Tool Output）**

你的代码（Host）收到调用请求后，先校验参数和权限，再实际执行 `get_weather("上海")`，把结果返回给模型：

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "{\"temperature\": 26, \"condition\": \"多云\", \"humidity\": 72}"
}
```

**第 4 步：生成最终回答**

模型将工具结果结合上下文，生成自然语言回答：“上海目前 26°C，多云，湿度 72%。”如果这是一个多步任务（比如“根据天气决定要不要调整户外活动方案”），Agent 会拿着这个结果继续下一轮推理，而不是直接收尾。

### 完整数据流

![应用与 LLM 多轮往返：工具定义、tool_call、宿主执行、再生成回答](/images/ai/fc-app-llm-roundtrip.svg)

### 要点

- 模型只做“决策”（调用什么、传什么参数），**不做执行**
- 一次对话中可以调用多个工具，也可以多轮调用
- `strict: true`（OpenAI Structured Outputs）只保证模型输出在其支持的 Schema 子集范围内形状合法。它不保证业务参数正确、不代表有操作权限，也不能承诺所有拒绝或中断场景下输出仍然格式合法
- 业务接口的权限、幂等与结果核对，见[生产级 Agent Tool 设计](/ai/production-agent-tool-design/)

## Agent（智能体）

Function Call 只解决了“一步调用”的问题。真实任务通常需要多步推理：先搜索文件、再读取内容、分析问题、修改代码、最后运行测试。**Agent** 就是让 LLM 能自主规划和多步执行的推理框架。

### ReAct 模式

**ReAct**（Reasoning + Acting）是一种常见的组织方式，核心是行动与观察循环。下表的 Thought 是帮助理解的决策说明，不要求产品展示完整内部推理：

```text
思考(Thought) → 行动(Action) → 观察(Observation) → 思考 → ... → 最终回答
```

以“帮我修复这个 bug”为例：

| 步骤 | 阶段 | 内容 |
|------|------|------|
| 1 | Thought | 用户报告了一个 bug，我需要先定位错误发生在哪个文件 |
| 2 | Action | 调用 `grep` 搜索错误关键字 |
| 3 | Observation | 在 `src/utils.ts` 第 42 行找到了相关代码 |
| 4 | Thought | 找到了，这里的数组越界是因为没有做边界检查 |
| 5 | Action | 调用 `edit_file` 修改代码，添加边界检查 |
| 6 | Observation | 文件已修改 |
| 7 | Thought | 修改完成，应该运行测试确认 |
| 8 | Action | 调用 `run_tests` 执行测试 |
| 9 | Observation | 所有测试通过 |
| 10 | Answer | Bug 已修复，在第 42 行添加了数组边界检查 |

![Agent 内部：规划循环、多次工具调用、记忆与上下文预算](/images/ai/fc-agent-react-loop.svg)

### Agent 与 Function Call 的关系

- **Function Call** 是单次工具调用的声明格式
- **Agent** 在多步任务上增加了**推理循环 + 记忆 + 上下文管理**
- Agent 的 Action 常用 Function Call 格式发起，但这不是唯一选择——Agent 也可以通过其他输出协议执行动作；反过来，只用 Function Call 的单步场景不必引入 Agent 循环

### 典型 Agent 实现

| 产品 | 场景 | 工具集 |
|------|------|------|
| Cursor Agent | 代码编辑 | 读写文件、搜索代码、运行终端、浏览器 |
| Claude Code | CLI 编程 | Shell、文件系统、Git |
| ChatGPT + Code Interpreter | 数据分析 | Python 执行、文件上传下载 |
| AutoGPT / CrewAI | 自动化工作流 | 浏览器、API 调用、多 Agent 协作 |

## MCP（Model Context Protocol）

### 核心问题

Agent 需要接入各种工具和数据源：数据库、文件系统、Sentry、GitHub、Slack……每个 AI 应用都自己写一套接入逻辑？这就是 **N×M 问题**：N 个 AI 应用 × M 个工具 = N×M 个适配器。

MCP 解决的就是这个问题：**定义一个标准协议，让任何 AI 应用都能连接任何工具**。

![N×M 直连 vs 经 MCP 的 N+M 接入](/images/ai/fc-mcp-n-times-m.svg)

### MCP 是什么

MCP（Model Context Protocol）是 Anthropic 发布的开放协议，定位类似于编程语言领域的 **LSP**（Language Server Protocol）：

- LSP 让任何编辑器对接任何语言的智能提示
- MCP 让任何 AI 应用对接任何工具和数据源

### 架构：Host → Client → Server

![Host 内多个 Client，各自 1:1 连到不同 MCP Server](/images/ai/fc-mcp-host-clients.svg)

三个角色：

| 角色 | 职责 | 例子 |
|------|------|------|
| **Host** | AI 应用，管理多个 Client | Cursor、Claude Desktop、VS Code |
| **Client** | Host 内部组件，维护与某个 Server 的连接 | Host 为每个 Server 创建一个 Client |
| **Server** | 提供工具、数据、Prompt 的服务 | 文件系统 Server、数据库 Server、GitHub Server |

### MCP Server 提供的三种能力

MCP Server 通过三种**原语（Primitives）**向 Client 暴露能力：

**1. Tools（工具）**

让 AI 执行操作，如查询数据库、调用 API、操作文件：

```json
{
  "name": "query_database",
  "description": "执行 SQL 查询",
  "inputSchema": {
    "type": "object",
    "properties": {
      "sql": { "type": "string", "description": "SQL 语句" }
    },
    "required": ["sql"]
  }
}
```

**2. Resources（资源）**

向 AI 提供上下文数据，如文件内容、数据库 Schema、配置信息：

```text
resources/list → 列出所有可用资源
resources/read → 读取某个资源的内容
```

**3. Prompts（提示模板）**

预定义的交互模板，如 few-shot 示例、系统提示词：

```text
prompts/list → 列出可用模板
prompts/get  → 获取模板内容
```

### 通信协议

MCP 基于 **JSON-RPC 2.0** 通信，支持两种传输方式：

| 传输方式 | 场景 | 特点 |
|---------|------|------|
| **stdio** | 本地 Server | 通过标准输入输出通信，零网络开销 |
| **Streamable HTTP** | 远程 Server | HTTP POST + SSE 流式响应，支持 OAuth 认证 |

### 连接生命周期

在 `2025-11-25` 及更早版本中，典型顺序是：`initialize` 协商能力 → `initialized` 就绪 → `tools/list` 发现工具 → `tools/call` 执行；部分实现还会推送工具列表变更。

![MCP 会话简化的请求方向（JSON-RPC）](/images/ai/fc-mcp-session-lifecycle.svg)

`2026-07-28` 已移除这一握手和协议级会话，改用 `server/discover`、请求级 `_meta` 与 Multi Round-Trip Requests。完整迁移影响见 [《MCP 2026-07-28：从“有状态会话”走向可横向扩展的 Agent 协议》](/network/mcp-2026-07-28-core-changes/)。

### 配置示例

以 Cursor 中配置 MCP Server 为例（`.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_xxxx" }
    }
  }
}
```

配置后，Cursor 的 Agent 就能通过这些 MCP Server 读写文件、查询 GitHub Issue 等。

## Skill（技能）

### 核心问题

Agent 有了工具，但面对特定领域任务时仍需要“专业知识”。比如：创建 React 组件时应该遵循什么规范？部署到 AWS 时具体步骤是什么？**Skill** 就是将领域专业知识打包成可复用的指令集，让 Agent 在特定场景下表现得像专家。

### 与 Function Call 的区别

| 对比项 | Function Call / Tool | Skill |
|--------|---------------------|-------|
| 本质 | 可执行的函数 | 知识 + 流程指导 |
| 触发方式 | 模型判断需要调用 | 上下文匹配或手动调用 |
| 内容 | 代码实现 | Markdown 指令文档 |
| 例子 | `read_file(path)` | 「如何创建 Cursor Rule」的完整步骤 |

### Cursor Skill 机制

以 Cursor IDE 的 Agent Skill 为例，它的工作方式：

**目录结构**

Skill 可放在 `~/.cursor/skills/`、项目下 `.cursor/skills/` 或 `.agents/skills/` 等路径（以 Cursor 当前文档为准）。单个技能包常见布局如下：

![Skill 目录：SKILL.md 必选，其余可选](/images/ai/fc-skill-folder-layout.svg)

**SKILL.md 格式**

```markdown
---
name: create-react-component
description: 创建符合团队规范的 React 组件。当用户要求创建新组件时使用。
---

## 使用场景
当用户要求创建新的 React 组件时自动激活。

## 步骤
1. 在 src/components/ 下创建组件目录
2. 使用 TypeScript + FC 模式
3. 导出 Props 类型
4. 创建对应的测试文件
...
```

**自动激活 vs 手动调用**

- 默认：Agent 根据上下文自动判断是否使用某个 Skill
- 设置 `disable-model-invocation: true` 后：仅在用户输入 `/skill-name` 时激活

### Cursor Rule 系统

与 Skill 类似，Cursor 还有 **Rule** 系统（`.cursor/rules/` 下的 `.mdc` 文件），用于为 Agent 提供持久化的编码规范和项目约定。Rule 更偏向于“始终遵守的规则”，Skill 更偏向于“特定任务的操作指南”。

## 四者如何组合

把这些概念放在一起，看一次完整交互——以 Cursor Agent 帮你改代码为例：Agent 先加载 Rule、命中 Skill 获得领域写法，再在 ReAct 循环里通过 MCP Server 暴露的工具读文件、改文件、跑命令。四个机制各管一段：缺了 Skill 只是少了领域指导，缺了 MCP 也可以用别的方式把工具接到 Host 上，没有哪个是另一个的前提。

![IDE Agent：规则、技能、ReAct 与 MCP 工具链（示意）](/images/ai/fc-cursor-agent-flow.svg)

## 延伸阅读

- [OpenAI Function Calling 文档](https://developers.openai.com/api/docs/guides/function-calling)
- [MCP 官方规范](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP 2026-07-28 核心变化与迁移解读](/network/mcp-2026-07-28-core-changes/)
- [MCP 架构概览](https://modelcontextprotocol.io/docs/learn/architecture)
- [MCP Server 列表](https://github.com/modelcontextprotocol/servers)
- [Cursor Agent Skills 文档](https://cursor.com/docs/context/skills)
- [Cursor Rules 文档](https://cursor.com/docs/context/rules)
- [ReAct: Synergizing Reasoning and Acting in Language Models（论文）](https://arxiv.org/abs/2210.03629)
