---
title: OpenClaw 插件：Tool、Hook、Slot 各用在哪
description: 基于 OpenClaw 官方文档，系统拆解插件的能力边界、生命周期钩子、插槽机制、配置方式与开发范式
date: 2026-04-14
lastUpdated: 2026-10-11
---

OpenClaw Plugin 是运行在 Gateway 进程内的扩展代码，可以注册工具、钩子、服务和路由，也可以接管记忆或上下文插槽。需要在运行时事件发生时执行逻辑，或把能力打包分发时，可以用 Plugin。它与 Gateway 共享进程权限，安装前要按引入代码审查。

例如，模型调用前追加团队约定：说明文字靠模型遵循，Hook 则由运行时触发。触发也不等于可靠完成，进程崩溃、钩子报错和落库失败仍需处理。以下按 [v2026.7.1-2 文档](https://github.com/openclaw/openclaw/blob/v2026.7.1-2/docs/tools/plugin.md) 说明，示例需按安装版本的 SDK 编译验证。

![Skill、Tool、Plugin 与 Hook 的落点](/images/ai/openclaw-plugin-spectrum.svg)

*图：Skill 主要影响模型读到的说明；Tool 由模型按需调用；Plugin 跑在 Gateway 进程里，可挂生命周期、路由、插槽等。Hook 是事件系统，可由脚本或插件注册。*

## 一、四种机制的边界：Skill、Tool、Hook、Plugin

| 机制 | 本质 | 谁触发 | 适合什么 |
|------|------|--------|---------|
| `Skill` | 注入给模型的说明与知识 | 系统在构建上下文时加载 | 行为约束、风格指导、知识补充 |
| `Tool` | 一个可被模型调用的函数 | 模型自己决定是否调用 | 搜索、计算、文件处理、外部 API 调用 |
| `Hook` | 事件驱动的脚本 | 命令或生命周期事件发生时 | `/new`、`/reset` 自动化、工作区级小脚本 |
| `Plugin` | 运行在 Gateway 进程内的扩展模块 | OpenClaw 运行时加载 | 生命周期干预、能力注册、打包分发、核心机制替换 |

真正关键的差别不在“功能多少”，而在**控制点**。Plugin 的适用信号有两类：

- **运行时控制类**：每次对话前自动补上下文、每次工具调用前统一做权限校验、每次结束后写审计日志、Gateway 启动时初始化某个能力——动作由程序触发，并为失败定义处理方式；
- **打包分发类**：需要配置 Schema、需要以 npm 包形式安装和复用。哪怕只是注册几个 Tool，Plugin 包也是合法的安装与分发容器，不必为了“够格”硬加生命周期逻辑。

选择标准是“哪一层机制刚好覆盖需求”，不是“插件更高级”。

## 二、插件形态：manifest、入口与身份

按照官方文档，插件本质上是运行时加载的 TypeScript 模块，和 Gateway 运行在同一个进程里。官方列出的可注册能力包括：auto-reply commands、skills 目录、background services、CLI commands、agent tools、Gateway HTTP routes、Gateway RPC methods、context engines、provider auth flows、messaging channels。也就是说，插件不是“某个单点功能”，而是 OpenClaw 的正式扩展面。

### 一个插件最小长什么样

```text
my-plugin/
├── openclaw.plugin.json
├── package.json
└── index.ts
```

- `openclaw.plugin.json` 负责声明插件身份和配置 Schema
- `package.json` 里的 `openclaw.extensions` 负责声明入口
- `index.ts` 负责真正注册工具、钩子、服务等能力

一个极简的 manifest：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string" }
    }
  }
}
```

而 `package.json` 里要告诉 OpenClaw 从哪里加载：

```json
{
  "name": "my-plugin",
  "openclaw": {
    "extensions": ["./index.ts"]
  }
}
```

这里有一个值得注意的设计：**配置校验不需要执行插件代码**，它基于 manifest 和 JSON Schema 完成。这让插件配置检查比很多动态系统更可控。

### 一个包可以导出多个插件

如果 `package.json` 里写的是：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

那么这会变成一个 **plugin pack**：一个 npm 包承载多个扩展入口。适合把同一主题下的多个插件放在一个仓库统一维护，或把“工具插件”“安全插件”“路由插件”拆成多个入口，避免单个入口越来越肿。

### 插件 ID 不是小事

OpenClaw 会基于文件名、包名或导出的 `id` 解析插件身份。多个插件解析到同一个 `id` 时，高优先级的生效，低优先级副本被忽略。这影响三件事：`plugins.entries` 配置到底落到谁身上、`plugins.allow / deny` 到底管的是谁、出现冲突时能不能快速定位。从第一天起就把插件 ID 视为稳定接口，而不是临时命名。

## 三、生命周期钩子：Plugin 与 Hook 的关系

Hook 是事件系统，Plugin 是扩展容器；Plugin 可以注册 Hook，但 Plugin 不等于 Hook。官方支持三类 Hook 来源：bundled hooks、`~/.openclaw/hooks/`、工作区 `hooks/`。

插件侧有两种注册方式，不是同一套接口：

- `api.on(...)`：类型化的 Agent 生命周期钩子（typed hooks），例如 `before_model_resolve`、`before_prompt_build`；
- `api.registerHook(...)`：注册 internal hooks。

针对 `/new`、`/reset` 之类命令做自动化、写工作区级小脚本，Hook 更轻；需要配置 Schema、注册 Tool/Service/Route/Channel、以包形式分发时，应该走 Plugin。

### 三个前置钩子的时序与可用输入

| 钩子 | 时机 | `messages` 可用 | 适合做什么 |
|------|------|----------------|-----------|
| `before_model_resolve` | session load 之前 | 否 | 确定性的模型/Provider 覆盖：某类 Agent 固定走某模型、按规则切换 Provider |
| `before_prompt_build` | session load 之后、模型调用前 | 是 | 基于当前消息内容的动态上下文注入、有顺序要求的 Prompt 拼接 |
| `before_agent_start` | 兼容保留 | — | **legacy compatibility hook**，新逻辑应拆到上面两个 |

`before_prompt_build` 的官方能力包括 `prependSystemContext`、`appendSystemContext`、`systemPrompt`、`prependContext`，并支持按优先级执行（高优先级先运行）。这类“在 Prompt 成型前决定内容”的能力，Tool 和 Skill 都做不到。

一个值得记住的顺序：

```text
before_model_resolve
  → session load
  → before_prompt_build
  → legacy before_agent_start fallback
  → 真正发起模型调用
```

这个顺序决定了哪些逻辑能看到 `messages`、哪些能稳定覆盖模型、哪些 prompt 片段会覆盖谁。把它搞混，插件行为会变得很难解释。

Prompt 注入不是默认无限开放的。运维侧可以限制单个插件的注入能力：

```json5
plugins.entries.<plugin-id>.hooks.allowPromptInjection: false
```

Prompt 构建是高权限扩展点，不应该被当成普通字符串拼接放任使用。

## 四、能力注册：五类 API 与 Slot

### 最常用的五类 API

| API | 注册什么 | 什么时候用 |
|-----|---------|-----------|
| `api.registerTool(...)` | 暴露给模型调用的函数 | 只是新增能力；纯 Tool 插件也是合法的分发容器 |
| `api.on(...)` | 类型化生命周期钩子 | 需要介入模型解析或 Prompt 构建 |
| `api.registerService(...)` | 有生命周期的运行时资源 | 启动时初始化连接池、关闭时释放资源、后台 watcher、长生命周期状态 |
| `api.registerHttpRoute(...)` | HTTP 路由（官方推荐，取代旧的 `registerHttpHandler`） | webhook 接入、插件私有接口；注意显式 `auth`、路由冲突、替换已有路由的约束 |
| `api.registerProvider(...)` / `api.registerChannel(...)` | 模型 Provider 认证登录流 / 消息渠道 | 接入新的模型来源或消息入口 |

### Slot Plugin：替换核心能力

普通插件是在 OpenClaw 旁边加能力，`Slot Plugin` 做的是**替换 OpenClaw 的核心能力**。官方文档给出 `plugins.slots`：

```json5
{
  "plugins": {
    "slots": {
      "memory": "memory-core",
      "contextEngine": "legacy"
    }
  }
}
```

目前最关键的两个插槽：

- **`memory`**：长期记忆插件插槽。`memory-core` 是默认内置实现，可以切换到其他 memory plugin，设置成 `"none"` 则直接禁用。
- **`contextEngine`**：负责 session context orchestration、ingest、assembly、compaction。想接管上下文管线本身，就要走 context engine plugin。

记忆系统在 OpenClaw 里不是写死的，而是可替换组件。这是插件体系和普通工具体系最明显的层级差异。

## 五、工具、钩子与服务的组合示例

下面的例子把三种最常见的职责放在同一个文件里：注册 Tool、注入生命周期逻辑、管理运行时资源。它是基于固定版本文档的说明性组合，用于说明用法结构；实际插件请按所安装版本的 SDK 编译验证。

```ts
import { Type } from "@sinclair/typebox";

export default function register(api) {
  api.registerTool(
    {
      name: "say_hello",
      label: "Say Hello",
      description: "Return a greeting",
      parameters: Type.Object({
        name: Type.String(),
      }),
      async execute(_toolCallId, params) {
        const { name } = params as { name: string };
        return {
          content: [{ type: "text", text: `Hello, ${name}!` }],
        };
      },
    },
    { name: "say_hello" },
  );

  api.on("before_prompt_build", async () => {
    return {
      prependSystemContext: "Be concise and technical.",
    };
  });

  api.registerService({
    id: "my-plugin-service",
    start: (ctx) => ctx.logger.info("plugin started"),
    stop: async (ctx) => ctx.logger.info("plugin stopped"),
  });
}
```

## 六、加载、配置与验证

### 插件发现的关键规则

- 每个插件根目录必须有 `openclaw.plugin.json`
- `openclaw.extensions` 里的入口必须留在插件目录内部
- 多个插件解析到同一个 `id`，按优先级第一个生效

这几条规则分别解决身份确定性、路径安全和冲突可预期。官方文档还强调：发现非 bundled 插件而 `plugins.allow` 为空时，OpenClaw 会给出启动告警——插件不是“随便装个扩展”，而是“把一段代码引进主进程”。

### 配置结构

```json5
{
  "plugins": {
    "enabled": true,
    "allow": ["voice-call"],
    "deny": ["untrusted-plugin"],
    "load": {
      "paths": ["~/Projects/oss/voice-call-extension"]
    },
    "entries": {
      "voice-call": {
        "enabled": true,
        "config": {
          "provider": "twilio"
        }
      }
    }
  }
}
```

这套结构把“发现、启用、配置、替换”四件事拆开了：`entries` 是每个插件自己的配置空间，`allow / deny` 管加载控制，`load.paths` 用于开发期本地路径加载，`slots` 选择独占型插件。

### 开发与运行配置

| | 开发期 | 运行期 |
|---|--------|--------|
| 加载方式 | `plugins.load.paths` 指向本地目录 | 明确的包版本安装 |
| 访问控制 | 最小权限，使用测试凭证 | 配好 `allow / deny`，明确 `entries` 和 `slots` |
| 迭代方式 | 频繁重启 Gateway 验证 | 变更走发布流程 |

不要把开发期“本地直连目录”的习惯带进长期运行环境。

### 验证：冷态检查不等于运行时已加载

| 目的 | 方式 | 能证明什么 |
|------|------|-----------|
| 看磁盘与配置层面发现了哪些插件 | 冷态的 list / inspect | 只证明“被发现”，不证明运行中的 Gateway 已加载 |
| 查运行中 Gateway 实际注册了什么 | 带 `--runtime` 的 inspect | 正在运行的实例实际加载和注册的插件 |

排障时如果只看冷态输出，会出现“明明在列表里却不生效”的假判断。

### 最容易踩的五个坑

| 坑 | 要点 |
|----|------|
| 把 Plugin 只当 Tool 打包器 | 不一定错——分发容器本身有价值——但要知道自己没用到生命周期能力 |
| 把 `before_agent_start` 当万能入口 | 它是 legacy compatibility hook，新逻辑拆到 `before_model_resolve` 和 `before_prompt_build`，否则边界不清、行为难解释 |
| 忽略插件是受信任代码 | 插件跑在 Gateway 进程内：依赖树要克制，路径和来源要可控，`allow / deny` 要真的用起来，外部插件按“代码引入”而不是“配置项”审视 |
| 把配置 Schema 当摆设 | 不认真写 `configSchema`、`additionalProperties`、必填项和敏感字段的 UI hints，等于放弃插件体系里最有价值的可验证性 |
| 一上来就替换核心 Slot | `memory` 和 `contextEngine` 很强也最容易把问题做大；先写顺普通插件，确认默认实现哪里不够、并准备接管整条链路时再替换 |

参考：[OpenClaw 插件官方文档](https://docs.openclaw.ai/tools/plugin)（`/plugins` 是旧入口的重定向）、[工具能力概览](https://docs.openclaw.ai/tools)。
