import { createKnowledgeMap, type KnowledgeContentBlock, type KnowledgeReference } from './create-knowledge-map';

const sources = {
  torch: { title: 'PyTorch · CUDA semantics', href: 'https://docs.pytorch.org/docs/main/notes/cuda.html' },
  cache: { title: 'Transformers · How caching works', href: 'https://huggingface.co/docs/transformers/cache_explanation' },
  serving: { title: 'vLLM · Quickstart', href: 'https://docs.vllm.ai/en/latest/getting_started/quickstart/' },
  metrics: { title: 'vLLM · Production Metrics', href: 'https://docs.vllm.ai/en/latest/usage/metrics/' },
  bench: { title: 'vLLM · Benchmark serving', href: 'https://docs.vllm.ai/en/latest/cli/bench/serve/' },
  tuning: { title: 'vLLM · Optimization and Tuning', href: 'https://docs.vllm.ai/en/latest/configuration/optimization/' },
  k8s: { title: 'Kubernetes · Schedule GPUs', href: 'https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/' },
  registry: { title: 'MLflow · Model Registry Workflows', href: 'https://mlflow.org/docs/latest/ml/model-registry/workflow/' },
  mlops: { title: 'Google Cloud · MLOps', href: 'https://docs.cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning' },
  jobs: { title: 'Anthropic · Engineering jobs', href: 'https://www.anthropic.com/careers/jobs' },
};

interface LearningPoint {
  title: string;
  explain: string;
  example: string;
  exercise: string[];
  check: [question: string, answer: string];
  source: keyof typeof sources;
  blocks?: KnowledgeContentBlock[];
}

function learningPoint(point: LearningPoint) {
  const source = sources[point.source];
  return {
    title: point.title,
    content: [
      { type: 'paragraph', text: point.explain },
      { type: 'paragraph', text: point.example },
      ...(point.blocks ?? []),
      { type: 'heading', text: '动手验证' },
      { type: 'list', items: point.exercise },
      { type: 'checkpoint', label: '先回答，再展开', prompt: point.check[0], answer: point.check[1] },
      { type: 'link', label: '学习路线与实验记录', href: '/ai-infra/learning-path/', detail: '查看学习顺序、vLLM 实验与验收标准' },
    ] as KnowledgeContentBlock[],
    references: [{ ...source, location: '官方文档；实验参数以所用版本为准' }] as KnowledgeReference[],
  };
}

export default createKnowledgeMap({
  slug: 'ai-infra',
  updatedAt: '2026-10-12',
  sources: Object.values(sources),
  domains: [
    {
      title: '系统与计算基础', short: '先找执行位置',
      summary: '沿请求找到 CPU、GPU、队列和数据；补齐 Python 与张量基础。',
      articles: [{ title: '学习路线与实验记录', href: '/ai-infra/learning-path/' }],
      groups: [
        { title: '从 Agent 走到推理服务', level: 'core', points: [
          learningPoint({ title: '一次请求经过哪些程序', source: 'serving',
            explain: 'Agent 决定下一步做什么；推理服务把输入转换成 token，再在计算设备上执行模型并生成输出。网关、调度器、模型执行与客户端各有等待时间，排障先定位耗时在哪一段。',
            example: '假设 Agent 调用模型耗时两秒：可能是网关排队，也可能是长输入的计算，不能只看 HTTP 总耗时就判断 GPU 慢。',
            exercise: ['画出客户端、网关、推理引擎、GPU 的请求路径，标出每处的队列与超时。', '先用模拟后端分别制造排队和生成延迟；确认日志能区分两者。模拟结果不能当成 GPU 性能。'],
            check: ['Agent Infra、推理 Infra 和 MLOps 分别负责什么？', 'Agent Infra 管任务执行、状态、工具与权限；推理 Infra 管模型服务、计算资源、调度与性能；MLOps 管数据、实验、模型验证与发布。三者有交集，学习范围由具体岗位决定。'] }),
          learningPoint({ title: 'Python 异步、并发与背压', source: 'serving',
            explain: '异步 I/O 让程序在等待网络时处理别的请求；它不让 CPU 密集任务自动变快。背压指处理能力不足时限制接入或排队，防止请求、内存和超时不断堆积。',
            example: '假设后端最多处理四个请求，网关可以限制同时执行的请求数，并给等待队列设长度和截止时间。无限创建协程只会把拥堵藏进内存。',
            exercise: ['写一个有并发上限的异步客户端；用可控慢响应测量运行数、排队数和超时数。', '取消等待中的请求，确认排队记录被移除；取消运行中的请求，确认许可被释放。'],
            check: ['把并发从 4 改为 40，一定提高吞吐吗？', '不一定。后端算力不变时，更多请求可能只增加排队时间和显存压力。需要同时比较成功吞吐、尾延迟和错误率。'] }),
        ] },
        { title: '最小计算基础', level: 'scenario', points: [
          learningPoint({ title: '张量形状、精度与推理模式', source: 'torch',
            explain: '张量是带形状和数据类型的数组。先掌握矩阵乘法、batch 维度、设备搬运和自动求导。推理时 model.eval() 改变部分层的行为，inference_mode() 关闭求导相关开销，两者用途不同。',
            example: '形状为 [B, S, H] 的张量中，B 表示批量，S 表示序列长度，H 表示隐藏维度。只知道“用了 PyTorch”，还不足以解释批量和上下文为什么消耗显存。',
            exercise: ['在 CPU 上建立两个小矩阵，验证乘法形状、dtype 与元素数量。', '在可用设备上运行同一小模型，记录输入输出形状及推理模式；保存环境版本。'],
            check: ['FP16 权重能否与任意类型的输入直接相乘？', '不能据此保证兼容。算子、设备和混合精度规则都会影响类型要求；先检查输入与权重类型，以及所用算子的支持情况。'] }),
          learningPoint({ title: '区分 CPU、GPU 与网络瓶颈', source: 'tuning',
            explain: '模型服务还需要 CPU 做分词、序列化和请求处理。GPU 利用率低可能是输入没及时到达，也可能是小批量或同步等待；高利用率也不能直接证明用户延迟达标。',
            example: '长文本分词占满一个 CPU 核时，GPU 可能在等待。此时增加 GPU 副本未必改善端到端体验。',
            exercise: ['同时记录 CPU、GPU、网络、队列和请求时间，保留同一时间窗口的数据。', '分别改变输入长度与到达速率，提出一个瓶颈假设，再用时间线验证。'],
            check: ['GPU 利用率达到 95% 能证明服务优化完成吗？', '不能。还要看成功吞吐、尾延迟、错误、显存与业务质量。利用率是定位线索，不是单独的验收条件。'] }),
        ] },
      ],
    },
    {
      title: '模型执行与显存', short: '解释算力与内存',
      summary: '理解 Prefill、Decode、KV cache，估算容量并正确测量 CUDA。',
      groups: [
        { title: '生成时发生什么', level: 'core', points: [
          learningPoint({ title: 'Prefill 与 Decode', source: 'tuning',
            explain: 'Prefill 处理已有输入，建立生成所需的状态；Decode 继续逐步产生 token。长输入会增加首段处理的工作量，长输出会占用更多生成步骤。两类负载应分开观察。',
            example: '假设两个请求都输出 128 个 token，一个输入 256 个 token，另一个输入 4096 个 token；它们的首 token 延迟可能不同，不能只比较输出长度。',
            exercise: ['固定输出长度，只改变输入长度，比较首 token 延迟。', '固定输入长度，只改变输出长度，比较完成时间；保留实际生成长度。'],
            check: ['首 token 很慢，但后续输出流畅，先检查什么？', '先检查排队、输入预处理和 Prefill 时间。后续 Decode 快不能排除这些阶段的等待。'] }),
          learningPoint({ title: 'KV cache 为什么随上下文增长', source: 'cache',
            explain: '自回归模型生成下一 token 时，需要关注此前的 token。KV cache 保存各注意力层已经算出的 key 和 value，避免重复计算；它占用内存，通常随保存的 token 数与并发请求数增长。',
            example: '传统全注意力、同一 KV 精度下，单请求缓存可粗估为 2 × 层数 × KV heads × head dimension × token 数 × 每元素字节数。滑动窗口、混合架构、压缩及分片会改变实际占用。',
            exercise: ['从一个模型的配置读取层数、KV heads 和 head dimension，估算两个上下文长度的缓存。', '在 GPU 上观察并发与实际 token 数变化后的缓存指标，解释估算与实际值的差别。'],
            check: ['KV heads 与 attention heads 可以总写成同一个数吗？', '不能。使用 GQA 或 MQA 的模型可能有更少的 KV heads；照搬 attention heads 会高估缓存。'] }),
        ] },
        { title: '容量与测量', level: 'scenario', points: [
          learningPoint({ title: '权重能放下，服务为何仍 OOM', source: 'torch',
            explain: '显存不仅存权重，还存 KV cache、激活、临时工作区及运行时资源。PyTorch 的 allocated 是张量占用，reserved 是缓存分配器管理的内存；它们不等于整个进程的 GPU 占用。',
            example: '示例：7B 参数按每参数两字节估算，权重约 14 GB，约 13 GiB。这只是权重下界；16 GiB 显卡能否运行指定并发和上下文，需要实测。量化还可能有缩放信息等额外开销。',
            exercise: ['分别记录加载前、加载后与处理长输入时的显存，标明 GB 与 GiB。', '在受控实验中逐步增加上下文或并发，保存 OOM 条件并验证限制是否生效。'],
            check: ['调用 empty_cache() 能释放仍被张量引用的显存吗？', '不能。它处理未使用的缓存块；仍在使用的张量和服务保留的 KV cache 需要各自的生命周期管理。'] }),
          learningPoint({ title: 'CUDA 异步与计时', source: 'torch',
            explain: 'CUDA 操作通常异步提交。CPU 计时只包住提交动作，可能没等 GPU 执行完。测量设备耗时可使用 CUDA Events，测量完成耗时需要在合适的位置等待设备完成。',
            example: '示例代码第一次运行还可能含初始化和编译开销。先预热，再重复采样；不要用一次计时给优化下结论。',
            exercise: ['用 CPU 时钟和 CUDA Events 测量同一矩阵乘法，解释边界为何不同。', '记录形状、精度、预热和重复次数；同步只放在测量边界，避免改变正常调度。'],
            check: ['CPU 计时显示 1 ms，可以直接写成 GPU 计算耗时吗？', '只有确认计时边界覆盖设备完成才可以。否则它可能主要测到操作提交时间。'] }),
        ] },
      ],
    },
    {
      title: '单机推理服务', short: '先交付一个服务',
      summary: '从 vLLM 启动走到流式响应、请求取消与容量限制。',
      groups: [
        { title: '最小服务', level: 'core', points: [
          learningPoint({ title: '用 vLLM 托管模型', source: 'serving',
            explain: '先在匹配版本要求的 Linux GPU 环境中，托管一个显存可容纳的小模型。记录模型 revision、引擎、驱动、CUDA 与硬件；端口监听成功之后，还要验证实际生成。',
            example: '官方 Quickstart 使用 Qwen/Qwen2.5-1.5B-Instruct。以下是命令模板，须先检查模型许可、依赖及容量；启动后继续验证真实生成请求。',
            blocks: [{ type: 'code', language: 'bash', text: 'vllm serve Qwen/Qwen2.5-1.5B-Instruct --host 127.0.0.1 --port 8000\ncurl http://127.0.0.1:8000/v1/models' }],
            exercise: ['保存启动配置、版本、显存与模型加载日志；确认实际推理得到输出。', '区分进程存活、模型就绪与生成成功；本地端口只用于实验访问。'],
            check: ['/v1/models 返回成功，就能证明推理正常吗？', '不能。它证明模型列表接口可用；还需要实际生成请求验证引擎、设备与输出链路。'] }),
          learningPoint({ title: '流式响应与 token 边界', source: 'serving',
            explain: '流式响应让客户端边生成边显示。网络数据块、SSE 事件与 token 是不同边界；解析程序需处理半个事件、一次收到多个事件，以及正常结束和断开。',
            example: '同一个 SSE 事件可以被网络拆成两次到达。如果把每个网络块直接当成一条 JSON，客户端会偶发解析失败。',
            exercise: ['把同一组模拟 SSE 数据切成不同大小的块，验证解析结果一致。', '在真实服务上记录请求发出、第一段内容和结束时间；明确首内容与首 token 的统计口径。'],
            check: ['每收到一个网络块，就增加一次 token 计数可以吗？', '不可以。网络切块由传输决定；token 数应使用可信的 token 统计或明确的分词规则。'] }),
        ] },
        { title: '请求生命周期', level: 'scenario', points: [
          learningPoint({ title: '超时与取消怎样传到后端', source: 'serving',
            explain: '客户端超时不代表后端已停止生成。网关需要追踪请求生命周期，把断开和取消传给推理后端，并验证计算或缓存资源被回收；各框架的取消语义需要单独确认。',
            example: '用户关闭页面后，如果后端仍生成很长的答案，GPU 时间与缓存仍被占用。客户端界面消失不能作为取消成功的证据。',
            exercise: ['分别取消排队中的请求和正在生成的请求，观察队列、活动数与缓存变化。', '制造客户端断开，检查是否继续计费或占用资源；保留服务端证据。'],
            check: ['断开 HTTP 连接就一定中止 GPU 任务吗？', '不能保证。需要确认网关、服务器与引擎之间的取消链路，并检查服务端请求状态。'] }),
          learningPoint({ title: '限制上下文、输出和并发', source: 'tuning',
            explain: '容量限制应同时覆盖输入、最大输出、运行请求和等待队列。它们决定显存、GPU 时间及等待时间；只限制请求数，无法阻止少数超长请求占满资源。',
            example: '同样十个请求，短问答与长文生成的负载可能相差很大。限制策略应结合 token 长度和已测得的服务容量。',
            exercise: ['建立短输入、长输入、长输出三组请求，检查接入限制和错误响应。', '超过容量时给出可识别的拒绝或限流结果，确认客户端不会无限重试。'],
            check: ['将排队时间延长就能解决容量不足吗？', '不能。持续到达量超过处理能力时，队列会继续增长；需要限制接入、扩容或减少工作量。'] }),
        ] },
      ],
    },
    {
      title: '负载与性能优化', short: '用同一负载比较',
      summary: '先建立可重复的指标基线，再解释调度、缓存和计算瓶颈。',
      groups: [
        { title: '建立基线', level: 'core', points: [
          learningPoint({ title: 'TTFT、ITL、TPOT 与成功吞吐', source: 'metrics',
            explain: 'TTFT 是请求开始到首 token 的时间；ITL 描述相邻输出 token 的间隔。TPOT 常用于表示请求内平均后续 token 时间，聚合规则须说明。端到端时间、错误率和成功吞吐补足整体体验。',
            example: '示例：请求在 1 秒后开始输出，之后平稳生成；TTFT 较大，后续间隔却可能较小。不能用一个平均 token/s 覆盖这两种体验。',
            exercise: ['分别记录客户端和服务端的时间边界，保留 P50、P95、失败与实际输出长度。', '定义“成功”：响应结束、状态正确且满足输出要求；失败请求单列，不能从报表静默删除。'],
            check: ['输出 token/s 更高，但 P95 TTFT 变差，算优化成功吗？', '需按目标判断。交互业务若要求首 token 快，这可能不达标；离线任务可能更关注总完成时间。先定义目标和失败口径。'] }),
          learningPoint({ title: '并发与到达速率是两个变量', source: 'bench',
            explain: '固定并发通常在一个请求完成后再补一个请求；固定到达速率则按计划继续发请求。服务变慢时，前者会降低实际到达量，后者更容易暴露队列积压。两种负载回答不同问题。',
            example: '示例：固定并发 8 测稳态处理能力；固定每秒到达量逐档增加，测过载开始的位置。比较时必须写清负载模型。',
            exercise: ['固定模型、硬件、输入输出分布、缓存条件和引擎版本，按多个负载档位重复采样。', '保存原始结果、实际到达量与未完成请求，画出成功吞吐及尾延迟随负载的变化。'],
            check: ['两个配置分别用短输入和长输入测出吞吐，可以直接排名吗？', '不可以。输入、输出、到达方式、硬件和缓存条件都改变工作量；需要同一负载基线。'] }),
        ] },
        { title: '按瓶颈优化', level: 'scenario', points: [
          learningPoint({ title: '连续批处理、分块 Prefill 与前缀缓存', source: 'tuning',
            explain: '连续批处理让运行中的请求结束后有机会接入新请求；分块 Prefill 将长输入拆开，调节它与 Decode 的资源竞争。前缀缓存复用相同输入前缀的已有计算，需要分别测冷缓存与可复用场景。',
            example: '共享系统提示词的短问答可能受益于前缀复用；每次前缀都不同的长文请求未必受益。优化结论需保留负载条件。',
            exercise: ['先只改变一个批处理参数，比较成功吞吐、首 token 与后续间隔。', '对缓存分别测冷启动、重复前缀和不同前缀；保留输出质量及实际命中指标。'],
            check: ['缓存热身后的成绩可以当成所有请求的表现吗？', '不能。它只支持对应命中条件下的结论；还要展示冷缓存与不命中的表现。'] }),
          learningPoint({ title: 'Profiler、CUDA 与 Triton 的学习顺序', source: 'torch',
            explain: 'Profiler 用时间线寻找 CPU、设备计算、搬运和同步等待。先能解释一个热点，再学习 CUDA 的线程、内存访问和同步，最后按需要用 Triton 或 CUDA 实现小算子。',
            example: '若时间花在网络等待，改写 GPU kernel 无法解决问题。若确实是计算热点，算子优化还要验证数值误差、不同形状和端到端收益。',
            exercise: ['在 GPU 上保存一次预热后的时间线，圈出一个瓶颈并说明判断依据。', '选小型矩阵或归约算子，先验证结果与误差，再比较设备耗时；不要直接替换整套模型算子。'],
            check: ['一个 kernel 快了两倍，模型服务就快两倍吗？', '不一定。总耗时还包括其余计算、排队和传输；必须测端到端收益，并检查优化是否适用于真实形状。'] }),
        ] },
      ],
    },
    {
      title: 'GPU 与分布式部署', short: '按容量扩大服务',
      summary: '区分模型分片和副本扩容，再学习通信、GPU 调度与故障恢复。',
      groups: [
        { title: '多 GPU 的取舍', level: 'advanced', points: [
          learningPoint({ title: 'Tensor Parallel 与独立副本', source: 'tuning',
            explain: 'Tensor Parallel 把模型层内的计算和权重分到多个设备，设备之间需要通信。独立副本各自持有模型，处理不同请求。前者有助于容纳大模型，后者常用于扩大请求处理能力。',
            example: '模型能放进一张卡时，先比较两个单卡副本与一个双卡分片实例。双卡分片有通信成本，不能只按卡数推断加速。',
            exercise: ['写出模型是否单卡可容纳、缓存需求和互联条件，再选择分片或副本。', '有多 GPU 条件时用同一负载比较两种部署，记录显存、延迟、吞吐和通信条件。'],
            check: ['TP=2 与两个模型副本有什么差别？', 'TP=2 通常是同一次模型执行跨两张卡协作；两个副本各自执行不同请求。容量、通信与故障范围不同。'] }),
          learningPoint({ title: 'NCCL、拓扑与通信故障', source: 'tuning',
            explain: '分布式推理在设备之间交换计算结果。需要理解集合通信、GPU 互联、节点网络和拓扑；通信时间可能抵消分片带来的计算收益。训练中的 DDP、FSDP 也涉及通信，但目标和状态不同。',
            example: '跨节点部署同一个模型，网络带宽与延迟会进入每次协作的成本。单机结果不能直接代表跨节点表现。',
            exercise: ['记录设备互联与节点网络，区分单机和跨节点实验。', '在受控环境中制造一个 Worker 不可用，观察超时、日志和恢复；没有多卡证据时标注未实测。'],
            check: ['多卡服务卡住时，只检查模型代码够吗？', '不够。还应检查参与进程、设备、驱动、通信配置和网络；保存各参与方同一时间段的日志。'] }),
        ] },
        { title: '平台与可靠性', level: 'scenario', points: [
          learningPoint({ title: 'Kubernetes 怎样分配 GPU', source: 'k8s',
            explain: 'Kubernetes 通过厂商驱动和 device plugin 暴露 GPU 资源，Pod 通过资源声明申请设备。调度还要考虑卡型、可用显存、节点位置与模型要求；申请到一张 GPU 不等于适合任意模型。',
            example: '示例：Pod 的资源限制声明 nvidia.com/gpu: 1，节点还需要已经安装兼容的 NVIDIA 驱动与 device plugin。',
            exercise: ['检查节点可分配 GPU 与 Pod 的实际设备，保存调度和启动证据。', '构造资源不足的 Pod，区分 Pending、镜像或模型加载失败，以及推理运行时 OOM。'],
            check: ['GPU 数量申请成功，为什么还可能 OOM？', '调度通常保证设备资源分配，不能直接保证指定模型、上下文与并发的显存需求。服务仍需做容量验证。'] }),
          learningPoint({ title: '冷启动、扩容与平滑发布', source: 'k8s',
            explain: 'GPU 实例启动还包含调度、权重读取、加载和预热。扩容在这些步骤完成前不能立即提供容量。就绪检查需反映模型可服务，发布时要处理长连接和正在生成的请求。',
            example: '队列已经积压时才扩容，新增实例可能仍需很久才能接流量。仅按 CPU 使用率扩容，也可能看不到 GPU 队列压力。',
            exercise: ['测量启动各阶段，再设定排队或并发触发信号；阈值用实验结果确定。', '发布时停止接入旧实例，等待或按约定结束存量请求；测试失败版本能回退并实际生成。'],
            check: ['副本数增加后，如何证明容量已增加？', '确认新副本已就绪并实际处理请求，再用负载验证成功吞吐和尾延迟；期望副本数不是服务能力。'] }),
        ] },
      ],
    },
    {
      title: '可复现交付与求职', short: '留下可核对的成果',
      summary: '用版本、回归、压测和故障记录展示能力；按岗位补 MLOps。',
      groups: [
        { title: '版本与回归', level: 'core', points: [
          learningPoint({ title: '模型、环境与数据版本', source: 'registry',
            explain: '一次服务实验要同时定位模型权重、分词器、配置、引擎环境与测试输入。可变的模型别名便于发布管理，但实验记录还要保存解析后的不可变版本，才能复现和回退。',
            example: '只写“Qwen + vLLM”无法复现。模型 revision、分词器、chat template、精度、采样参数和容器版本都可能改变输出与性能。',
            exercise: ['为每次实验保存版本清单、启动参数、数据摘要和原始结果。', '从清单重建同一环境，验证服务与结果；把未固定的项目列为复现限制。'],
            check: ['记录 production 别名足以复现半年后的实验吗？', '不够。别名可能移到新版本；需要保存当时解析到的模型版本与相关配置。'] }),
          learningPoint({ title: '质量回归与 MLOps 分支', source: 'mlops',
            explain: '推理优化可能改变数值与输出，发布需同时验证质量、性能和服务行为。MLOps 进一步覆盖数据验证、训练与实验、模型登记、部署和持续监测；是否补训练平台能力取决于岗位。',
            example: '量化后吞吐提升，但固定业务样本的正确率下降，不能只拿压测结果验收。服务错误监控也不能代替输出质量评估。',
            exercise: ['建立固定、可授权使用的业务样本，记录期望行为与质量标准。', '比较两个版本的质量和性能，写明发布门槛、回退条件及未覆盖场景。'],
            check: ['服务全是 HTTP 200，能证明模型升级无回归吗？', '不能。还要验证生成结果、业务质量、延迟和成本，必要时检查实际副作用。'] }),
        ] },
        { title: '项目与面试证据', level: 'scenario', points: [
          learningPoint({ title: '把现有 Agent 接到自托管推理服务', source: 'serving',
            explain: '实践项目从一个可控模型服务开始，再接入现有 Agent。先验证协议、chat template、流式响应、工具调用及取消行为；兼容接口格式不代表不同模型的能力与语义完全相同。',
            example: '先测普通生成，再测一轮工具调用，最后用固定任务样本检查整条 Agent 链路。不要把换一个 base URL 当成集成验收。',
            exercise: ['交付单模型服务、受限网关、压测脚本和观测面板，复用成熟引擎。', '保存服务重启、请求取消、超载与模型回退四类实验；实际执行前另行确定环境和预算。'],
            check: ['接口兼容，为何 Agent 仍可能退化？', '模型对工具、结构化输出、长上下文与指令的支持不同，分词器和模板也会改变行为；需要任务级回归验证。'] }),
          learningPoint({ title: '岗位校准与作品集', source: 'jobs',
            explain: '推理服务、GPU 性能、训练平台和 MLOps 岗位的要求不同。先按目标地区收集具体职位描述，再将要求映射到项目证据。能部署 vLLM 是起点，性能岗位还需要计算、通信与源码层面的能力。',
            example: '作品集写清问题、基线、负载、一次改动、结果和代价。收益必须来自同条件实测；模拟服务和未完成的多卡实验要明确标注。',
            exercise: ['选三到五个目标岗位，把重复要求映射到已有能力、缺口与计划实验。', '形成可运行仓库、实验清单、原始数据、性能报告和故障记录；区分 Agent 执行的工作与本人能解释的判断。'],
            check: ['面试前怎样确认自己掌握了项目？', '闭卷解释请求路径与瓶颈，手算显存下界，读一份时间线，说明为何选择当前方案，以及条件改变后怎样调整。仅有代码和测试通过还不足以证明掌握。'] }),
        ] },
      ],
    },
  ],
});
