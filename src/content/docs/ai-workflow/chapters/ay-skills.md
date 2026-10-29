---
title: AY Skills：执行边界与完成证据
sidebar:
  hidden: true
date: 2026-10-30
lastUpdated: 2026-10-30
---

[AY Skills](https://github.com/ALVIN-YANG/ay-skills) 是一组可单独使用的 coding-agent 工作说明。每个 Skill 约定什么时候直接推进、什么决定需要确认，以及哪些证据能支持完成判断。它用来落实开发约定，不能代替工具权限、运行环境或实际验收。

## 按任务选择

| 当前工作 | Skill | 要检查的结果 |
| --- | --- | --- |
| 审核技术方案 | `ay-architecture` | 系统边界、取舍、故障行为 |
| 实现已确定的变更 | `ay-implement` | 范围内的实现与验证结果 |
| 排查故障 | `ay-fix` | 根因证据、修复与回归 |
| 审查方案或代码 | `ay-review` | 具体问题、影响和证据；默认只读 |
| 迭代 Agent 行为 | `ay-agent-eval` | 可信评测、版本对比与授权范围内的修复 |

完整列表与安装方式以[仓库说明](https://github.com/ALVIN-YANG/ay-skills/blob/main/README.zh-CN.md)为准。不必为了一个任务安装所有 Skill。

## 开始使用

先查看可选项，再选择需要的 Skill：

```bash
npx skills@latest add ALVIN-YANG/ay-skills -l
npx skills@latest add ALVIN-YANG/ay-skills
```

安装完成后正常描述任务；需要明确指定工作方式时，可以写 `$ay-implement` 或 `$ay-review`。不同 Agent 的发现与加载机制不同，要确认当前环境已识别所选 Skill。

## 给执行循环一个明确目标

下面是示例任务约定，可以连同现状、相关文件和验收入口交给 Agent：

```text
目标：清空订单搜索词后恢复完整列表。
范围：只修改搜索和列表刷新逻辑，保留其他未提交改动。
上下文：提供复现步骤、相关文件和可用测试环境。
执行：在确认范围内实现 → 验证 → 根据失败证据修复。
完成：清空后恢复列表，原有筛选仍正常，附验证结果。
停止：需要修改接口契约、缺少必要环境，或达到约定预算时报告。
```

Loop 是带反馈的执行循环，不等于无限重试。Skill 可以约束行为，但时间、费用和停止条件仍需由任务约定及运行工具落实。审查结论也不能代替业务验收。

## 精选参考

- [AY Skills 中文说明](https://github.com/ALVIN-YANG/ay-skills/blob/main/README.zh-CN.md)：职责、使用方式与验证边界。
- [如何选择 Skill](https://github.com/ALVIN-YANG/ay-skills/blob/main/docs/choosing-a-skill.zh-CN.md)：处理职责重叠与任务交接。
- [Agent 目标模式与执行循环](/ai/harness-goal-controller/)：理解持续执行背后的运行机制。
