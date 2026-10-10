---
title: "AI Coding 工具速查：RTK、Navi、Kiro 与 CC Switch"
description: "四个工具分别解决终端输出噪音、代码库导航、规格驱动开发和多 CLI 配置管理。按问题选用，附官方入口、最短示例和各自限制。"
date: 2026-10-11
lastUpdated: 2026-10-11
sidebar:
  order: 7
---

**按遇到的问题选工具：输出噪音用 RTK，代码导航用 Navi，规格与验收用 Kiro，多 CLI 配置用 CC Switch。** 它们处理不同环节，不必全部安装。以下是用法速查，命令依据官方文档；没有把项目自述当作作者实测收益。

| 问题 | 工具 | 得到什么 | 主要限制 |
| --- | --- | --- | --- |
| test、build 输出挤占上下文 | RTK | 过滤、聚合、截断、去重后的命令输出 | 可能丢细节，排错仍需完整输出 |
| 找一个函数却读进整份文件 | Navi | 符号骨架、定义、引用与行范围 | 结构不能代替实现，支持语言与命令见仓库 |
| 功能需求难追踪、难验收 | Kiro | 需求、设计、任务和检查点 | 编写与维护规格有成本，小改动可直接执行 |
| 多个 CLI 配置分散 | CC Switch | Provider、MCP、Skills 等管理入口 | 各工具支持范围、切换方式和生效时机不同 |

## RTK：先少读命令输出

RTK 在命令结果进入模型上下文前压缩输出。接入 Hook 后可自动改写命令，也能手动使用：

```bash
brew install rtk
rtk init -g              # 默认接入 Claude Code / Copilot
# Codex 使用 rtk init -g --codex；其他工具按各自接入说明
rtk git status
rtk gain                 # 本机输出压缩统计
rtk proxy git diff       # 保留原始输出并统计
```

`gain` 的 token 数是估算，统计的是命令输出压缩量，不等于整段会话或账单节省。Claude Code 的内置 Read、Grep、Glob 不经过 Bash Hook，也不会因此自动压缩。[RTK 官方 README](https://github.com/rtk-ai/rtk)、[项目网站](https://rtk-ai.app)

## Navi：先看骨架，再读实现

Navi 用 tree-sitter / ast-grep 提取代码结构。先定位符号，再读取相关函数，比一开始加载完整代码库更容易控制范围。

```bash
cargo install --git https://github.com/keanji-x/Navi.git
cargo install ast-grep       # navi sg 需要
navi init .                 # 生成 .agent/skills/navi/SKILL.md
navi list src/main.ts        # 示例路径，替换成项目实际文件
navi jump processOrder      # 示例符号
navi refs processOrder
navi read src/main.ts 20-60
```

Agent 还需要支持并加载生成的 Skill 目录。符号骨架不是完整实现；排错时继续读取具体代码。上述命令来自仓库文档，接入后的语言支持和输出格式要在自己的项目确认。[Navi 官方 README](https://github.com/keanji-x/Navi)

## Kiro：把需求落成可检查的规格

Spec 至少把需求、验收条件和执行任务连起来。例如登录功能：

```markdown
# 邮箱登录
- 邮箱和密码登录，失败不区分“用户不存在”和“密码错误”
- 成功进入 /dashboard，JWT 通过 HttpOnly cookie 保存

## 验收条件
- 正确密码：200，进入 /dashboard
- 错误密码或无此用户：401，相同提示
- JWT 7 天过期；过期后要求重新登录
```

这是规格示例，认证方案和期限由项目决定。[Kiro 文档](https://kiro.dev/docs/)

IDE 1.x 的 Hook 放在 `.kiro/hooks/*.json`，格式是 `version: "v1"` 与 `hooks` 数组。保存测试文件后注入检查要求：

```json
{
  "version": "v1",
  "hooks": [{
    "name": "check-test-on-save",
    "trigger": "PostFileSave",
    "matcher": "\\.test\\.ts$",
    "action": {
      "type": "agent",
      "prompt": "测试文件已修改。判断受影响测试，运行并报告结果。"
    }
  }]
}
```

`agent` 动作注入提示，不能阻止触发事件，也不能单凭 Hook 触发就认定测试已执行；`command` 动作用于直接运行命令。旧 `when/then` 格式需按版本迁移。[Kiro 1.x Hooks](https://kiro.dev/docs/ide/whats-new-v1/hooks/)

终端入口使用 `kiro-cli`。安装后进入项目目录启动即可，非交互自动化按当前 CLI 文档配置。[Kiro CLI](https://kiro.dev/docs/cli/)

```bash
curl -fsSL https://cli.kiro.dev/install | bash
kiro-cli
```

## CC Switch：集中管理配置

CC Switch 是桌面应用，可以管理多个 AI CLI 的连接配置，并按支持范围同步 MCP、Skills 等内容。先导入现有配置，再添加 Provider；切换前检查实际写入的 endpoint、key 和 model。[官方 README 与功能矩阵](https://github.com/farion1231/cc-switch)

```bash
# macOS
brew install --cask cc-switch
brew upgrade --cask cc-switch
```

Windows、Linux 使用[官方发布包](https://github.com/farion1231/cc-switch/releases)。Claude Code 在常规切换后无须重启；Codex 等工具可能需要重启，具体按 README 的工具与模式说明。OpenCode、OpenClaw 等采用配置共存，添加 Provider 后仍需在工具内选择。

| 接入后检查 | 为什么 |
| --- | --- |
| 配置差异与备份 | 避免手工编辑和配置管理相互覆盖 |
| 实际请求走向 | 切换界面成功不代表新进程已使用新配置 |
| 第三方中转与订阅用法 | 配置预设不等于服务背书；项目提示某些订阅反代用法可能违反提供商条款 |

先用一个小任务验证接入、输出和恢复方式，再决定是否纳入日常工作流。
