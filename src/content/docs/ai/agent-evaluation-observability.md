---
title: "AI Agent 怎么做评测：别只看最后一句回答"
description: "一次任务成功，不代表系统可靠。从结果、轨迹、副作用和线上回放出发，建立真正能阻止回归的 Agent 评测。"
date: 2026-01-27
lastUpdated: 2026-10-11
verifiedAgainst: "OpenAI 与 Anthropic Agent eval 官方资料，2026-03-03"
sidebar:
  order: 10
---

**Agent 评测先验证真实结果，再看回答。** 数据库有没有多写、工具有没有越权、超时后能不能恢复，都不能由一句“已完成”证明。结果、轨迹、系统表现和安全分别设门槛，避免一个平均分掩盖关键失败。

例如用户重复提交同一订单的退款申请，正确结果是复用已有申请，没有新退款。模型怎样走到这个结果可以不同，不能要求每次工具顺序完全一致。[Anthropic Agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## 先把一个任务写成可验证样本

下面的任务和成本阈值是说明性示例，需接入项目的测试数据与断言接口。

```yaml
id: refund-duplicate-request
goal: 用户对同一订单重复发起退款
initial_state:
  order_status: paid
  existing_refund: pending
expected:
  outcome: no_new_refund_created
  user_message_contains:
    - 已存在退款申请
  max_tool_calls: 3
forbidden:
  tools:
    - create_refund
  side_effects:
    - duplicate_refund
```

```typescript
expect(database.refunds.countFor(orderId)).toBe(1);
expect(trace.toolCalls("create_refund")).toHaveLength(0);
expect(trace.totalCostUsd).toBeLessThan(0.05);
```

样本优先来自脱敏的线上失败，再补产品验收、历史 bug、权限威胁、人工边界条件。模型生成的扩展样本也要经过审核。只有一段自然语言参考答案，无法检查数据库和副作用。

## 四层分别检查什么

| 层 | 看什么 | 退款示例 |
| --- | --- | --- |
| 结果 | 用户目标与实际状态 | 订单、金额正确，申请存在且没有重复 |
| 轨迹 | 工具、参数、失败恢复与预算 | ID 来自授权上下文；无循环；需要审批时已满足条件 |
| 系统 | 成本、延迟、稳定性 | 不因 Prompt 变化多调十轮；中断后可恢复 |
| 安全 | 权限与禁止副作用 | 无越权、重复付款、敏感日志或记忆污染 |

轨迹可以有多条有效路径。评测应检查不必要调用、参数来源、重复循环、失败降级、审批和预算，避免把某一条实现路径当成唯一正确答案。

| 系统指标 | 用途 |
| --- | --- |
| 端到端、首次成功率 | 区分最终完成与无需人工修正的完成 |
| P50 / P95 延迟 | 观察常见体验和尾部体验 |
| 模型、工具调用次数 | 定位多余步骤或错误选择 |
| 输入、输出 token 与单任务成本 | 检查上下文和费用是否超预算 |
| 人工接管、恢复成功率 | 确认自动化边界和中断处理 |

安全用例另覆盖间接注入、越权读取、未授权写入、异常工具输出、记忆污染、超长循环和敏感日志。不能只看模型最后有没有拒绝。

## 评分器按能否验证来选

| 方法 | 适合 | 条件 |
| --- | --- | --- |
| 代码断言 | 数据库、文件、API、副作用、Schema、成本 | 能精确判断时优先使用 |
| LLM Judge | 开放式回答的完整性、解释与语义质量 | 输出结构化理由；用人工标注校准，不能是唯一裁判 |
| 人工审查 | 高风险、新能力、Judge 分歧、体验 | 把发现的问题变成自动断言或失败类别 |

## 固定环境，保存版本与 Trace

固定时钟、隔离数据库、模拟外部 API，并保存可重放的网页和文档快照。模型、Prompt、工具 Schema、检索配置都记录版本。真实模型有波动，应多次运行比较通过率和方差。

```json
{
  "run_id": "run_123",
  "agent_version": "2026-07-31",
  "model": "provider/model-version",
  "prompt_version": "sha256:...",
  "tool_policy_version": "sha256:...",
  "steps": [],
  "outcome": "success",
  "latency_ms": 8420,
  "input_tokens": 18420,
  "output_tokens": 2130,
  "cost_usd": 0.031
}
```

Trace 是一次执行记录。上面的数值是字段示例；实际记录需脱敏、限权并设置保留期限，不默认保存完整敏感输入和工具结果。

## 评测怎样进入发布流程

| 阶段 | 检查范围 |
| --- | --- |
| PR | 小型确定性用例、Schema、权限与安全回归，避免昂贵外部调用 |
| 候选版本或每日 | 完整任务集、多次采样、Judge、成本与延迟，和当前基线比较 |
| 上线后 | 小流量 canary、轨迹抽样、人工接管与用户纠正，新失败回到测试集 |

假设整体成功率提高 2%，付款场景却下降 8%，不能只看总分发布。关键场景需要独立门槛。

从核心真实任务开始，例如先整理 20 个，分别定义结果与禁止副作用，保存 Trace，再按需添加 Judge。每次 Prompt、模型、工具或检索变化后重跑。[OpenAI Agent 实践指南](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/)
