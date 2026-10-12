---
title: "Agent 状态持久化与恢复：服务重启后怎样继续任务"
description: "用 LangGraph 与 PostgreSQL 示例保存消息、工具结果和检查点，在进程重启后继续任务；再处理租约、幂等、取消与未知结果。"
date: 2026-09-07
lastUpdated: 2026-10-12
verifiedAgainst: "Python 3.13.13、PostgreSQL 16.13、LangGraph 1.2.11、langgraph-checkpoint-postgres 3.1.2，2026-09-07"
sidebar:
  order: 31
---

**服务重启会清空进程内存。要让 Agent 接着工作，需要把消息、工具结果和执行进度保存在数据库等外部存储中。新进程接手后，读取这些记录，重新组织模型输入，并从尚未完成的步骤继续。**

只保存聊天，能找回“说过什么”；保存工具结果和进度，才能判断“已经做过什么”。存好记录后还需要恢复程序接手任务。工具可能已执行、结果却没保存时，必须先核对外部状态，不能直接重试。跨会话的偏好和经验另按需检索，具体分工见 [Agent 记忆系统设计](/ai/agent-memory-system-design/)。

把恢复依据保存在进程之外，就叫“状态外置”。它通常不需要保存整个 Agent 内存对象。任务跨过多个执行进程、队列、审批和取消后，还需要持久化任务机制：状态机守住终态，租约分配带期限的执行权，接管序号拒绝旧进程的结果。Checkpoint 保存恢复所需的状态，有副作用的步骤另用幂等保护。

## 用一次温度查询看懂恢复

假设用户问家庭助手“客厅多少度”，程序分三步处理。

```text
理解问题 → 调用温度工具 → 根据读数回复
```

工具已经返回 23.5°C，程序却在回复前重启了。此时能不能继续，取决于重启前保存了什么。

| 已经保存的数据 | 新进程能做什么 |
| --- | --- |
| 什么都没保存 | 不知道用户刚才问过什么 |
| 只保存用户的问题 | 可以重新查询，但不知道上一次已经查过 |
| 保存问题、工具结果和下一步 | 直接根据这次读数回复 |

恢复的目标，是让新进程知道这轮任务的事实和进度。它不需要找回原来的协程或数据库连接，更不能保证把一段尚未生成完的回答逐字接上。

下文的实验就使用这个流程。温度和模型决策是模拟的，保存与恢复使用真实的 LangGraph 和 PostgreSQL。

## 最小改法，先做好这三步

### 1. 给会话一个固定 ID，把数据放在共享存储

同一个用户的多次交互，通过会话 ID 串起来。在框架里它通常叫 `thread_id`。用户可以有多个会话，一次具体执行还可以有自己的 `run_id`，不要把用户、会话和执行都当成同一个对象。

最小的存储分工可以这样定。

| 保存什么 | 放在哪里 | 恢复时的用途 |
| --- | --- | --- |
| 消息与工具结果 | 数据库 | 找回问题、已经取得的结果及其顺序 |
| 当前进度和下一步 | 数据库 | 决定从哪里继续 |
| 文件、图片、大段原文 | 对象存储，数据库保存引用 | 找回实际内容，而不只剩一个失效链接 |

把“当前做到哪里，接下来做什么”保存下来，这份记录就叫检查点，英文是 Checkpoint。

```json
{
  "thread_id": "room-demo",
  "run_id": "run-42",
  "next_step": "reply",
  "messages_ref": "messages-of-run-42",
  "tool_result_ref": "temperature-result-7"
}
```

这是帮助理解的结构示意，实际项目还要加入所属用户、版本和权限信息。恢复时校验当前身份有权读取该会话，不能只凭拿到了 ID 就放行。

数据库必须独立于应用实例保存。把 SQLite 文件写在会被替换的容器里，仍然可能随容器消失。单机 SQLite 加持久卷可以跨进程恢复，多实例服务则可以优先使用共享数据库。[Kubernetes 卷的生命周期](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)

### 2. 做完一步就保存，不等整轮结束

对于温度查询，保存顺序可以直接写成下面这样。

```text
收到问题    保存用户消息，再确认已经接收
决定调用    保存工具名称、参数和调用 ID
拿到读数    保存工具结果，并记录下一步是回复
回复完成    保存最终消息，记录这轮已经结束
```

保存时只开短事务，调用模型和工具放在事务外。不要让数据库一直等远程请求返回。

工具结果还要能对应到哪次调用。例如请求带 `call-7`，返回结果也保留 `call-7`。同一轮可能调用多个工具，仅保存聊天窗口里的文字，会丢掉这种关联。按 SDK 要求保留结构化消息，恢复时才拼得出有效的模型输入。

### 3. 新进程读取进度，再决定要不要调用模型

启动新的执行进程后，用同一个会话 ID 读取检查点，确认下一步该做什么。如果仍在等待审批，就继续等待，不必调用模型。

如果下一步需要模型生成回复，新进程会准备这一步需要的系统指令，再把已保存的消息按原顺序放进模型请求：用户问“客厅多少度”，助手发起温度查询，工具返回 23.5°C。工具调用和结果仍保留同一个调用 ID，模型才能知道这份读数对应哪次查询。

模型读到这些记录后，再生成回复。不是模型记住了重启前的事情，而是程序重新提供了它需要的信息。

如果历史很长，可以使用“较早历史的摘要 + 最近完整消息 + 本轮工具结果”，不用每次重发全部聊天记录。摘要要注明覆盖到哪一条，避免漏消息或重复拼接。本轮运行期间新来的消息，则按约定排队或打断处理，不要随手混进已经开始的执行。

**存好状态，也需要有人重新接手。** 可以由队列消费者或启动恢复程序领取未完成任务。单独配置一个保存检查点的库，不会自动增加一个常驻执行服务。

<div class="article-note-diagram">

```mermaid
%%{init: {"flowchart": {"padding": 28, "rankSpacing": 18}}}%%
flowchart TB
  A["执行一个步骤"] --> B["保存消息、结果<br/>与进度"]
  B --> C["继续下一步"]
  B -->|服务重启| D["新进程读取<br/>同一会话"]
  D --> C
```

</div>

## 实际跑一次“退出进程，再继续”

[完整示例](/examples/agent-context-recovery.py)需要 Python 3.11 或更新版本，以及独立的 PostgreSQL 演示数据库。它不连接真实设备，也不调用付费模型。

### 准备环境、下载脚本和连接演示数据库

```bash
python3 -m venv .venv-agent-recovery
. .venv-agent-recovery/bin/activate
python -m pip install 'langgraph==1.2.11' \
  'langgraph-checkpoint-postgres==3.1.2' \
  'psycopg[binary,pool]==3.3.5'
curl -fsSLo agent-context-recovery.py \
  https://blog.mlxb.cc/examples/agent-context-recovery.py

# 粘贴独立演示库的连接串并回车，输入不显示在终端。
read -r -s AGENT_DEMO_DATABASE_URL
export AGENT_DEMO_DATABASE_URL
python agent-context-recovery.py setup
```

不要连接生产库，也不要把凭证写进 Git。云端数据库按服务商要求启用 TLS，并使用适当权限的账号。`setup` 负责初始化检查点表，线上应作为受控迁移执行，不要每次请求都建表。

### 制造故障，再用新进程继续

准备好以后，执行这条命令。

```bash
python agent-context-recovery.py start \
  --thread recovery-demo-1 --crash-before-reply
```

程序完成工具查询，保存结果，然后在回复前直接退出。终端会显示下面的内容，退出码为 75，这是安排好的故障点。

```text
ENTER plan
ENTER tool (simulated read)
ENTER reply
CRASH before reply, exit=75 (no cleanup)
```

再启动新进程，读取状态并继续。

```bash
python agent-context-recovery.py status --thread recovery-demo-1
python agent-context-recovery.py resume --thread recovery-demo-1
```

恢复前应看到三条消息，分别是用户问题、工具调用和工具结果。待执行节点是 `reply`。恢复时只进入回复节点，最终根据模拟读数 23.5°C 生成第四条消息，前面的工具不重跑。

实现中有两个配置不能漏掉。一个是使用 PostgreSQL 的检查点，而非内存里的 `InMemorySaver`；另一个是恢复时继续传入相同的 `thread_id`。

```python
# 已完成配置的 graph 使用 PostgreSQL 保存检查点。
config = {"configurable": {"thread_id": "recovery-demo-1"}}
graph.invoke(None, config, durability="sync")
```

传入 `None` 表示继续已有运行，不再追加一次原始问题。`sync` 要求在进入下一步前保存检查点。若改成异步写入，进程退出时就可能还有状态没来得及保存；只在整轮退出时保存，则不能提供相同的中途恢复能力。[LangGraph 的持久化模式](https://docs.langchain.com/oss/python/langgraph/checkpointers#durability-modes)

这个实验覆盖的是**工具结果已经保存后，应用进程退出**。它没有证明任意时刻崩溃都不会重复动作，也没有验证数据库故障切换或多个执行进程同时接手。

## 长任务：记录、状态与执行权

### Run、Step 与 Artifact

温度查询只有三步。深度研究、批量文档、代码修改、跨系统审批这类任务会跨过队列、多个执行进程和人工等待，聊天记录不能代替任务状态。先把三种记录分开保存：

- **Run**：一次用户目标的完整执行实例，例如“生成本周经营分析”。
- **Step**：Run 内一个可重试、可观察的步骤，例如“拉取订单”“生成图表”“发送审批”。
- **Artifact**：步骤产生的持久化成果，例如检索结果、JSON、文件、模型输出或报告。

| 记录 | 例子 | 作用 |
| --- | --- | --- |
| Run | 周报任务、目标与终态 | 判断整项任务是否完成 |
| Step | 检索、分析、发布 | 单独重试和观察 |
| Artifact | `source.json`、`report.md` | 保留结果与引用，供后续步骤读取 |


不要把所有中间结果塞进一条任务记录或模型上下文。每一步都要能重复执行，或者至少能确认上一次到底有没有成功。

### 状态机守住终态

Run 状态可以是：

```text
PENDING
RUNNING
WAITING_APPROVAL
WAITING_EXTERNAL
CANCEL_REQUESTED
SUCCEEDED
FAILED
CANCELLED
```

其中 `SUCCEEDED`、`FAILED`、`CANCELLED` 是终态。允许的迁移必须由代码定义：

```text
PENDING → RUNNING
RUNNING → WAITING_APPROVAL
WAITING_APPROVAL → RUNNING
RUNNING → SUCCEEDED
RUNNING → FAILED
RUNNING → CANCEL_REQUESTED → CANCELLED
```

终态保护意味着：

- 已成功任务不能被迟到的失败消息改回 `FAILED`；
- 已取消任务不能因为 Worker 最后上报成功而复活；
- 每次迁移都使用版本号或条件更新；
- 终态后的重复消息只能被记录或忽略。

示例：

```sql
UPDATE agent_run
SET status = 'SUCCEEDED',
    version = version + 1,
    finished_at = now()
WHERE id = :run_id
  AND status = 'RUNNING'
  AND version = :expected_version;
```

受影响行数为 0 时，说明状态已变化，Worker 不能覆盖它。

### 队列只负责通知，数据库负责真相

消息可能重复投递、延迟、乱序，Worker 也可能在处理后、尚未 ACK 时崩溃。因此消息里只放稳定标识：

```json
{
  "run_id": "run_123",
  "step_id": "step_04",
  "attempt": 2
}
```

Worker 收到后从数据库读取最新状态，再决定是否执行。不要把队列消息当作唯一状态源。

### 多个执行进程：租约与 fencing

Worker 领取 Step 时写入租约（Lease），也就是一段有期限的执行权：

```text
owner        = worker-7
lease_until  = now + 60s
attempt      = attempt + 1
```

执行过程中定期续约。Worker 崩溃后，租约到期，其他 Worker 才能接管。领取必须是原子的。下面是 PostgreSQL 的命名参数模板，由调用层绑定参数，返回的 `attempt` 用作这次接管的序号：

```sql
UPDATE agent_step
SET status = 'RUNNING',
    owner = :worker,
    lease_until = :lease_until,
    attempt = attempt + 1
WHERE id = :step_id
  AND status IN ('PENDING', 'RUNNING')
  AND (lease_until IS NULL OR lease_until < now())
RETURNING attempt;
```

租约过期不等于旧 Worker 真的停了。它可能只是卡住，恢复后仍会提交结果。每次接管时递增的 `attempt` 可以同时充当 fencing token（接管序号）：提交结果时要求序号匹配，旧 Worker 的过期写入就会被拒绝，不能改回已经移交的任务。

Lease 解决的是执行所有权，不自动解决副作用幂等。旧 Worker 在失去租约前已经发出的外部请求，仍然要靠下面的“结果未知”流程处理。

### Checkpoint 应该保存什么

长任务的 Checkpoint 不是完整聊天记录的定时复制，而是“恢复执行所需的最小确定状态”：

- 当前阶段；
- 已确认的输入；
- 已完成 Step；
- Artifact 引用；
- 工具调用结果；
- 剩余预算；
- 模型、Prompt 和工具版本；
- 下一步允许的动作；
- 待审批内容。

```json
{
  "run_id": "run_123",
  "checkpoint_version": 7,
  "phase": "analysis",
  "completed_steps": ["collect_sources", "deduplicate"],
  "artifacts": {
    "sources": "artifact://src_456"
  },
  "budget": {
    "remaining_tool_calls": 8,
    "remaining_cost_usd": 0.42
  }
}
```

恢复时从 Checkpoint 重新构建上下文，不依赖旧进程内对象。只存在进程内存里的状态无法跨进程恢复。

### 恢复调度：谁重新接手

检查点存好了，任务不会自己继续。常见的接手方式有三种，可以组合使用：

- **启动恢复**：服务启动时扫描处于 `RUNNING`、`CANCEL_REQUESTED` 等非终态的 Run，租约已过期的重新排队。
- **队列消费者**：常驻 Worker 按消息领取任务，崩溃后由租约机制移交。
- **看门狗**：对“`RUNNING` 超过阈值但没有新事件”的任务告警或自动回收，不让任务永远卡在半路上。

恢复调度只做“重新派发”，该不该真的再执行一步，仍要由状态机、租约和幂等检查决定。

## 副作用：未知结果、取消与接管

### 结果未知时先核对

假设指令换成“把亮度再降低 10%”。设备已经执行，程序在保存结果之前退出。新进程只看到“准备调用”，不知道设备到底有没有动。

这时直接重试，亮度可能再次降低。

恢复时要把“结果未知”单独处理。已经确认成功的操作复用结果；确认没发出的可以执行；不确定的先查询外部状态。接口支持幂等键时，重试复用同一个标识，让同一业务操作不因重复请求而多执行一次。工具接口怎样定义权限、幂等和重试边界，见 [生产级 Agent Tool 设计](/ai/production-agent-tool-design/)。

框架的检查点和业务工具表也可能分两次提交。可以先保存工具操作结果，节点重试时按操作 ID 找回结果，再让框架补上检查点。不要以为先后调用两个保存函数，就相当于一个数据库事务。

节点内的代码也可能重跑。LangGraph 的 `interrupt()` 恢复时会重新进入所在节点，中断之前的通知、订单创建等动作可能再次执行。因此，重要外部操作要能够去重，或拆成有独立恢复边界的步骤。[中断恢复规则](https://docs.langchain.com/oss/python/langgraph/interrupts#rules-of-interrupts)

#### 投递与业务结果分开

跨网络和外部系统时，严格的 exactly-once 通常不可得。更务实的目标是：

```text
至少一次投递
+ 幂等工具
+ 去重记录
+ 状态查询
+ 必要时补偿
= 业务上只产生一次可见结果
```

有副作用的 Step 要定义幂等或去重契约。外部系统不支持幂等键时，用操作记录、状态查询和必要人工核对，不能凭重试策略承诺只执行一次。

#### 重试要有边界

每个 Step 配置：

- 最大尝试次数；
- 总时间上限；
- 可重试错误集合；
- 退避策略；
- 单次模型和工具预算；
- 失败后的降级或人工接管。

```yaml
retry:
  max_attempts: 4
  initial_delay: 2s
  max_delay: 30s
  retryable:
    - RATE_LIMITED
    - DEPENDENCY_UNAVAILABLE
  non_retryable:
    - INVALID_ARGUMENT
    - PERMISSION_DENIED
```

不要让模型自行决定“再试一次”且没有上限。

#### 补偿不是数据库回滚

跨系统副作用无法放进一个本地事务。例如：

```text
创建文件成功
发送邮件成功
写审计记录失败
```

需要为可补偿动作设计反向操作：

- 创建草稿 → 删除草稿；
- 预占库存 → 释放库存；
- 临时上传 → 删除对象；
- 创建外部任务 → 请求取消。

有些动作无法补偿，例如邮件已经送达。这类动作应尽量放在流程末端，并使用审批和幂等保护。

### 取消是一条业务链路

用户点击取消后，不要只设置前端状态。

取消流程：

1. Run 进入 `CANCEL_REQUESTED`；
2. 不再调度新 Step；
3. 向正在运行的 Worker 发送取消信号；
4. 当前工具在安全点停止；
5. 释放 Lease 和临时资源；
6. 需要时执行补偿；
7. Run 进入 `CANCELLED`；
8. 保留已完成 Artifact 或按策略清理。

对无法中断的外部调用，应明确展示“取消请求已收到，等待当前操作结束”。

### 人工接管

进入人工接管时保存：

- 为什么暂停；
- Agent 已完成什么；
- 失败发生在哪里；
- 建议的人类动作；
- 可继续执行的入口；
- 当前参数和证据。

人工处理后，不应该从头重跑，而是从明确 Checkpoint 继续。

## 上线验收与实现选择

### 前端断线，要能找回输出

服务重启会断开流式连接。数据库恢复和浏览器重连是两件事。

给输出消息固定 ID，客户端重连后查询当前消息或补收后续事件。SSE 是服务端持续向浏览器推送事件的一种方式，它的 `Last-Event-ID` 可以表明客户端收到了哪里，但服务端仍要保存可补发的事件或消息快照。[SSE 事件 ID](https://html.spec.whatwg.org/dev/server-sent-events.html)

还没生成完的半句话按草稿处理。没有保存每个片段时，重启后可以替换草稿，不能把半句当成完整回复接进下一轮。客户端重新发送输入也要按请求 ID 去重，避免创建两份任务。

### 新代码，要读得懂旧进度

给工作流和状态格式保存版本。新版本改了步骤名称、参数或审批顺序，旧任务应交给兼容代码继续，或经迁移后恢复。读不懂就明确暂停，不要静默从头执行。

发布前停止领取新任务、等待当前步骤保存，能减少故障，但强制终止或内存不足时未必有清理机会。状态不能只靠进程退出前的一次保存。

### 外部存储本身，也要有恢复保证

应用进程重启和数据库丢数据属于不同故障。Redis 的持久化策略、PostgreSQL 的提交配置及副本设置，会影响故障时可能损失多少数据，不能只检查代码里有没有调用 `save()`。[Redis 持久化](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)、[PostgreSQL 提交保证](https://www.postgresql.org/docs/current/wal-async-commit.html)

文件通常先上传成功，再把稳定引用和进度一起存库。否则恢复时可能找到一条记录，却读不到它指向的文件。备份与清理也要同时考虑数据库、文件和派生摘要，避免只保住其中一部分。

### 可观测性

至少监控：

- Run 各状态数量和停留时间；
- Step 成功率、重试率和耗时；
- Lease 超时和重复领取；
- 终态冲突；
- 取消完成时间；
- 人工接管率；
- 每个 Run 的模型调用、工具调用和成本；
- 无进展循环。

### 最小数据模型

```text
agent_run
  id, user_id, status, version
  goal, created_at, finished_at
  cancel_requested_at
  budget_json

agent_step
  id, run_id, type, status
  attempt, owner, lease_until
  input_artifact_id, output_artifact_id
  error_code, started_at, finished_at

agent_artifact
  id, run_id, kind, uri
  checksum, metadata_json

agent_event
  id, run_id, step_id, sequence
  type, payload_json, created_at
```

Event 用于审计和重放，Run/Step 表用于高效读取当前状态。

### 上线前故障演练

- 模型调用中途超时；
- Worker 在工具成功后、写结果前崩溃；
- 同一消息重复投递；
- 迟到消息试图覆盖终态；
- 审批等待数小时后恢复；
- 用户在步骤执行中取消；
- 外部系统返回未知状态；
- 数据库短暂不可用；
- Artifact 损坏或丢失；
- 预算耗尽。

如果系统只能在“所有组件都正常”时跑通，它还不是能承担长任务的运行机制。把上述故障点变成可重复的测试，分别断言恢复位置、工具调用次数与业务结果；结果和执行轨迹怎样一起验收，见 [Agent 评测与可观测性](/ai/agent-evaluation-observability/)。

### 已有项目，怎么选实现方式

选择取决于要恢复到什么程度。

| 项目情况 | 建议起点 |
| --- | --- |
| 主要是聊天，每轮很短 | 保存完整消息、附件和请求去重记录 |
| 有多步 Agent，执行中要暂停或恢复 | 使用框架的持久化检查点，例如 LangGraph 加 PostgreSQL |
| 跨多个服务，长时间等待，重试流程复杂 | 评估现有任务系统或 Temporal 等持久化工作流 |

如果 Java 项目已经有任务表、队列和执行进程，可以直接补消息、工具操作记录和恢复入口，无须为了 Agent 重新选择语言。

LangGraph 的数据库检查点适合第二种情况。它保存图的执行状态，业务仍要负责权限、工具去重和恢复调度。[数据库接入示例](https://docs.langchain.com/oss/python/langgraph/add-memory#use-in-production)

Temporal 则记录执行历史，再通过重放工作流恢复。模型调用等结果不固定的操作应放到 Activity 中，也就是由工作流调度的实际工作步骤；重试时仍要防止重复业务动作。[Temporal 的恢复机制](https://docs.temporal.io/workflow-execution#replays)、[AI 工作流约束](https://go.temporal.io/platform-hub/ai-engineering/ai-patterns)

### 记录、派生上下文与模型缓存

Kleppmann 关于日志和数据系统的讨论，将持久化记录与可重建的派生数据分开。本文把这种思路应用到 Agent，保留消息、工具结果和进度，再重建本次需要的输入。它不要求项目立刻引入 Kafka 或完整的 Event Sourcing，也不意味着原文替 Agent 规定了具体方案。[Kleppmann 的原文](https://martin.kleppmann.com/2015/05/27/logs-for-data-infrastructure.html)

模型侧的 KV Cache 缓存推理中已经计算过的结果，主要帮助减少重复计算。它与应用的消息数据库分属不同层。供应商会话 ID 和缓存可以提速，但不应在没有核对保留期限和恢复语义的情况下，替代应用自己的业务记录。[KV Cache 的作用](https://huggingface.co/docs/transformers/cache_explanation)

摘要和向量索引同样可以帮助挑选上下文。已经发生的工具操作却需要确切记录，不能依靠相似度搜索猜它是否成功。

### 验收先看三个结果

- 重启前已经确认接收的输入，重启后仍然能找到。
- 已经保存的工具结果能够复用，执行位置没有回到起点。
- 工具结果未知时，系统会查询或暂停，不会悄悄重复高风险动作。

可以先在温度结果保存后结束进程，确认新进程只继续回复。再把故障点移到工具执行与保存之间，检查未知结果怎样处理。前一项验证能否接着做，后一项验证接着做时会不会做错。多台执行进程接入后，再用故障演练清单核对租约、终态和取消行为。
