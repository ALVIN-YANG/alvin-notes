---
title: AI Infra：模型执行与推理性能笔记
description: 模型执行、KV cache、批处理调度与性能分析的技术笔记，附推导、算例和实验。
date: 2026-10-12
lastUpdated: 2026-10-12
sidebar:
  order: 1
  label: 技术笔记与实验
---

LLM 推理服务把 token 送入模型，用 KV cache 保留旧状态，由调度器安排每轮计算，再通过延迟、吞吐和设备时间判断瓶颈。把这条链路连起来，才能解释长输入为什么影响首输出、并发为什么消耗显存，以及批处理为何会改变其他请求的等待。

这组笔记集中讲模型执行、KV cache、批处理调度和性能分析。每篇都有推导、完整算例、可下载代码、实验步骤和结果解读；地图中的多卡部署与 MLOps 条目仍作为其他专题的入门索引。

## 按计算依赖阅读

| 笔记 | 核心问题 | 算例与实验 |
| --- | --- | --- |
| [1. 模型执行](/ai-infra/model-execution/) | token 怎样经过 Attention 和前馈网络，Prefill 与 Decode 怎样生成输出 | 两层因果 Decoder；逐层张量形状；缓存与完整上下文重算的 logits 对照 |
| [2. KV cache](/ai-infra/kv-cache/) | 缓存怎样算容量、分块、共享和回收 | 单请求 512 MiB；MHA/GQA/MQA；块表、引用计数与写时复制 |
| [3. 批处理调度](/ai-infra/batching-scheduling/) | 每轮选择什么工作，长输入怎样影响已有输出 | 四条请求的静态、连续与分块调度；逐轮时间线和 token 预算 |
| [4. 性能分析](/ai-infra/performance-analysis/) | 指标怎样计算，时间花在哪里，什么条件下算优化 | TTFT/TPOT/ITL 手算；Roofline；vLLM 控制变量压测；CUDA Events 与 Profiler |

[打开学习地图](/ai-infra-knowledge/)。相关知识点详情内可直接进入对应笔记。

## 代码怎样运行

前四份文件使用 Python 标准库，在 Python 3.10 或更新版本中运行，无需模型权重或第三方包。下载到同一个实验目录即可。

| 文件 | 运行命令 | 结果重点 |
| --- | --- | --- |
| [decoder.py](/ai-infra-labs/decoder.py) | `python3 decoder.py` | 两种生成路径输出一致；投影位置数 44 与 14 |
| [kv_cache.py](/ai-infra-labs/kv_cache.py) | `python3 kv_cache.py` | GQA 单请求 512 MiB；分叉共享、尾块复制和释放 |
| [scheduler.py](/ai-infra-labs/scheduler.py) | `python3 scheduler.py --mode all` | 每轮的选择、请求首输出与相邻输出间隔 |
| [metrics.py](/ai-infra-labs/metrics.py) | `python3 metrics.py` | 固定示例数据的分位数、Goodput 与理论下界 |

正文显示的完整代码直接引用这些文件。修改实验时，先预测输出会怎样变化，再运行并对照各轮状态，避免只看程序是否结束。

## 区分三种结果

| 数据 | 能说明什么 | 不能据此推断什么 |
| --- | --- | --- |
| CPU 参考实现的对照 | 因果限制、缓存等价性、块表与回收是否符合定义 | 生产模型质量、GPU 加速倍数 |
| 固定数据与调度模拟 | 指标算法、给定调度规则怎样影响请求时间 | 真实 GPU 延迟或吞吐收益 |
| 真实设备测量 | 指定硬件、版本和负载下的实际表现 | 换模型、硬件或缓存条件后的通用结论 |

[profile_gpu.py](/ai-infra-labs/profile_gpu.py) 需要已有兼容 CUDA 的 PyTorch 环境。vLLM 压测也需要相应的模型与 GPU 服务。两类设备实验的步骤、观测项和结果读法见[性能分析笔记](/ai-infra/performance-analysis/)；这里尚无 GPU 实测数据。

每次设备实验固定模型 revision、引擎、驱动、精度、输入输出分布和缓存条件，并保存原始结果。比较配置时一次改变一个变量，同时保留失败、质量与尾延迟，才能解释取舍。
