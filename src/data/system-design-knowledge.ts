import { createKnowledgeMap, type KnowledgeReference } from './create-knowledge-map';

const primerUrl = 'https://github.com/donnemartin/system-design-primer/blob/master/README-zh-Hans.md';
const primerLicenseUrl = 'https://github.com/donnemartin/system-design-primer/blob/master/LICENSE.txt';

function primerReference(section: string, hash: string): KnowledgeReference {
  return {
    title: 'System Design Primer · CC BY 4.0',
    location: `改编自 ${section}`,
    href: `${primerUrl}${hash}`,
  };
}

const systemDesignKnowledge = createKnowledgeMap({
  slug: 'system',
  updatedAt: '2026-08-31',
  sources: [
    { title: 'Google Site Reliability Engineering', href: 'https://sre.google/books/' },
    { title: 'AWS Well-Architected Framework', href: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' },
    { title: 'Azure Architecture Center', href: 'https://learn.microsoft.com/en-us/azure/architecture/' },
    { title: 'System Design Primer 中文版', href: primerUrl },
    { title: 'CC BY 4.0 许可', href: primerLicenseUrl },
  ],
  domains: [
    {
      title: '先主导面试对话',
      short: '需求、估算与方案',
      summary: '从业务场景和量级出发，让每个组件都有选择依据。',
      groups: [
        {
          title: '澄清需求与边界',
          level: 'core',
          references: [primerReference('如何处理系统设计面试题', '#如何处理一个系统设计的面试题')],
          points: [
            ['核心用户流', '先选定面试时间内要支持的一两条主流程，其他能力列为扩展项。'],
            ['功能需求', '用输入、业务动作和输出描述系统行为，确认是否需要搜索、推送或实时更新。'],
            ['非功能需求', '明确延迟、可用性、一致性、持久性、安全和成本中哪些需要优先保证。'],
            ['范围与假设', '对用户区域、设备、数据保留、多租户和合规做出明确假设并记录。'],
          ],
        },
        {
          title: '容量估算',
          level: 'core',
          references: [primerReference('预估计算量与延迟数', '#预估计算量')],
          points: [
            ['DAU 与峰值 QPS', '从日活、每用户操作数和读写比估算平均 QPS，再用业务峰谷系数得到峰值。'],
            ['带宽估算', '用请求或响应平均大小乘以峰值 QPS，分开入站、出站和内部复制流量。'],
            ['存储估算', '用每日新增数量、单条数据大小和保留期计算原始量，再加索引、副本和冷热分层。'],
            ['内存与缓存估算', '根据热点数据比例、单条大小和过期时间估算缓存工作集，保留容量余量。'],
          ],
        },
        {
          title: '高层设计',
          level: 'core',
          references: [primerReference('创建高层设计', '#第二步创造一个高层级的设计')],
          points: [
            ['客户端与边缘入口', '先画出客户端、DNS、CDN、负载均衡和 API 入口，说明静态与动态请求的分流。'],
            ['服务边界', '按业务能力划分服务，优先让数据所有权和强一致边界清晰，不为拆分数量而拆分。'],
            ['主数据流', '用箭头画出一次关键请求的读、写、缓存、消息和异步处理顺序。'],
            ['可观测与管理面', '业务流程之外还要交代配置、密钥、发布、监控、日志和审计数据如何进入系统。'],
          ],
        },
        {
          title: '深入瓶颈与取舍',
          level: 'scenario',
          references: [primerReference('设计核心组件并扩展', '#第三步设计核心组件')],
          points: [
            ['选择最风险的深挖点', '优先讨论容量、一致性或延迟最难的组件，避免按架构图顺序平均用力。'],
            ['用数据支持选型', '数据库、分片键、缓存和队列的选择应回应前面的读写比、热点和一致性要求。'],
            ['提前说失败模式', '每个关键组件至少要说明超时、重试、重复、局部失败和依赖不可用时的行为。'],
            ['用取舍收尾', '结束时回到需求，说明当前方案优先保证什么，牺牲什么，下一个扩展点在哪里。'],
          ],
        },
      ],
    },
    {
      title: '理解质量属性与取舍',
      short: '性能、可用性与一致性',
      summary: '把“高并发”拆成可量化的延迟、吞吐、可用和数据目标。',
      groups: [
        {
          title: '性能与可扩展性', level: 'core',
          references: [primerReference('性能、可扩展性、延迟与吞吐量', '#性能与可扩展性')],
          points: [
            ['延迟分布', '同时观察平均值、P95、P99，以及最慢依赖对用户请求的放大。'],
            ['吞吐量', '吞吐量是单位时间完成的工作量，应在可接受延迟和错误率下评估。'],
            ['纵向与水平扩展', '纵向扩展简单但有单机上限，水平扩展要处理无状态、路由、数据分布和协调。'],
            ['排队论直觉', '当资源利用率逼近上限，等待时间会非线性上升，预留余量比压满机器更稳定。'],
          ],
        },
        {
          title: '可用性与容错', level: 'core',
          references: [primerReference('可用性模式', '#可用性模式')],
          points: [
            ['SLA、SLO 与错误预算', 'SLO 定义内部可用性目标，SLA 是对外承诺，错误预算将剩余不可用时间转成发布约束。'],
            ['冗余与故障域', '副本需要跨进程、机器、机架或地域分布，才能避免同一故障同时摧毁全部实例。'],
            ['故障切换', '主备切换要处理故障检测、脑裂、旧主恢复、连接重建和数据落后。'],
            ['降级与部分可用', '依赖失败时保留读取、旧数据或核心交易，同时关闭推荐、统计等次要功能。'],
          ],
        },
        {
          title: '一致性与 CAP', level: 'core',
          references: [primerReference('可用性与一致性', '#可用性与一致性')],
          points: [
            ['线性一致', '所有操作像按某个实时顺序在单副本上执行，读会立即看到已完成写入。'],
            ['最终一致', '副本允许在一段时间内不同，如果没有新写入则最终会收敛。'],
            {
              title: 'CAP 与 PACELC',
              content: [
                { type: 'paragraph', text: 'CAP 讨论的是发生网络分区时，一个分布式读写系统能否同时保证线性一致和可用。Gilbert 与 Lynch 对可用的定义很强，每个发给未故障节点的请求最终都要得到响应。分区意味着节点之间的消息可能无限延迟或丢失。' },
                { type: 'heading', text: '分区发生时怎样取舍' },
                { type: 'paragraph', text: '如果两个副本失去联系，仍允许两边接受写入，系统保持响应能力，却无法保证所有客户端看到同一条最新历史。若要保持线性一致，无法确认最新状态的一侧就要拒绝或等待部分请求。这个选择可以按数据、操作和故障范围分别制定，不能简单给整个系统贴 CP 或 AP 标签。' },
                { type: 'heading', text: 'PACELC 补上正常时期' },
                { type: 'paragraph', text: 'PACELC 的表达是，出现分区 P 时在可用 A 与一致 C 之间取舍；没有分区 E 时，仍要在延迟 L 与一致 C 之间取舍。跨地域同步复制要等待远端确认，读到的数据更接近单一顺序，写延迟也会增加。异步复制延迟更低，但读副本可能落后。' },
                { type: 'heading', text: '放到场景里判断' },
                { type: 'list', items: ['账户扣款和唯一库存通常宁可拒绝一部分写入，也要守住余额或库存不变量。', '动态流和点赞数可以接受短暂陈旧，用版本、合并或补偿换取持续服务。', '同一系统中，登录会话、订单和推荐可以采用不同策略。'] },
                { type: 'heading', text: '面试容易混淆的地方' },
                { type: 'paragraph', text: 'CAP 里的 Consistency 指线性一致，和数据库 ACID 中约束始终成立的 Consistency 含义不同。Partition tolerance 也不是一个随意关闭的功能。只要系统跨节点通信，就要定义消息丢失或长时间延迟时怎样处理。回答时应先说明业务不变量，再说明哪些请求可拒绝、哪些读可以陈旧。' },
              ],
              references: [
                { title: 'Gilbert and Lynch, Brewer’s Conjecture', location: 'CAP 的形式化定义与不可能性证明', href: 'https://www.cs.princeton.edu/courses/archive/spr22/cos418/papers/cap.pdf' },
                { title: 'Daniel Abadi, Consistency Tradeoffs in Modern Distributed Database System Design', location: 'PACELC 原始论文', href: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf' },
              ],
            },
          ],
        },
        {
          title: '持久性与恢复目标', level: 'scenario',
          references: [primerReference('复制与真实架构', '#真实的架构')],
          points: [
            ['RPO', '可恢复点目标表示可接受丢失多少时间内的数据，决定备份和复制频率。'],
            ['RTO', '可恢复时间目标表示故障后必须在多久内恢复服务，决定热备、自动化和预演程度。'],
            ['日志、快照与备份', '交易日志用于近期重放，快照缩短恢复时间，独立备份用来抵御删除、损坏和勒索软件。'],
            ['恢复演练', '备份成功不等于可恢复，需要定期在隔离环境验证数据完整性和实际恢复时间。'],
          ],
        },
      ],
    },
    {
      title: '设计边缘与通信路径',
      short: 'DNS、CDN、负载均衡与协议',
      summary: '知道一个请求怎样到达服务，也知道各层能解决什么问题。',
      groups: [
        {
          title: 'DNS 与流量调度', level: 'core',
          references: [primerReference('DNS', '#域名系统')],
          points: [
            ['递归与迭代查询', '客户端通常把递归查询交给本地解析器，解析器再迭代访问根、顶级域和权威服务器。'],
            ['TTL 与缓存', '较长 TTL 减少解析压力但会拖慢切流，较短 TTL 提高调度灵活性也增加查询量。'],
            ['地理与延迟路由', '权威 DNS 可根据地域、运营商和健康状态返回不同入口，但客户端位置判断并不精确。'],
            ['故障切流', 'DNS 切流受缓存和 TTL 影响，不适合毫秒级故障转移，需与负载均衡和客户端重试配合。'],
          ],
        },
        {
          title: 'CDN 与边缘缓存', level: 'core',
          references: [primerReference('CDN', '#内容分发网络')],
          points: [
            ['Push CDN', '发布时主动把对象分发到边缘，适合更新可控且必然被访问的静态内容。'],
            ['Pull CDN', '边缘第一次缺失时回源并缓存，适合内容多但访问热度难预测的场景。'],
            ['缓存键与回源', '缓存键应明确包含路径、查询参数、压缩格式和必要请求头，避免不同内容互相污染。'],
            ['失效与版本化 URL', '精确刷新分布式缓存有传播延迟，不变资源用内容哈希或版本号换 URL 更可靠。'],
          ],
        },
        {
          title: '负载均衡与反向代理', level: 'core',
          references: [primerReference('负载均衡和反向代理', '#负载均衡器')],
          points: [
            ['L4 与 L7', 'L4 根据 IP 和端口转发连接，L7 理解 HTTP 路径、请求头和 Cookie，能做更细的路由。'],
            ['轮询、最少连接与加权', '算法应匹配请求时长差异、实例容量和长连接比例，不能只按请求个数均分。'],
            ['健康检查与摘除', '区分进程存活、服务就绪和深层依赖健康，过度敏感的检查会放大故障。'],
            ['会话亲和与无状态', '会话亲和能减少迁移但会破坏均衡和故障切换，优先把状态放到共享存储。'],
          ],
        },
        {
          title: '通信模式与协议', level: 'scenario',
          references: [primerReference('通信、TCP、UDP、RPC 与 REST', '#通讯')],
          points: [
            ['TCP 与 UDP', 'TCP 提供有序可靠字节流，UDP 保留报文边界且开销更低，丢包、重传和顺序需由应用决定。'],
            ['HTTP、REST 与 RPC', 'REST 面向资源和标准语义，RPC 面向操作和强类型契约，两者都要将超时和远程失败当成常态。'],
            ['WebSocket 与 SSE', 'WebSocket 适合双向持久通信，SSE 适合服务端向浏览器单向推送并可复用 HTTP 语义。'],
            ['长连接容量', '长连接占用文件描述符、内存和心跳流量，需要连接网关、会话路由和离线消息。'],
          ],
        },
      ],
    },
    {
      title: '组织应用与服务边界',
      short: 'API、服务与流量保护',
      summary: '用稳定契约连接服务，把限流、重试和降级放在正确边界。',
      groups: [
        {
          title: 'API 与契约', level: 'core',
          references: [primerReference('应用层与通信', '#应用层')],
          points: [
            ['资源与命令建模', '查询接口围绕资源读取，有副作用操作要明确命令语义、权限和重放行为。'],
            ['幂等性', '幂等键绑定请求身份和结果，让客户端在超时后安全重试而不重复扣款或创建资源。'],
            ['版本与向后兼容', '先使用可选字段、宽松读取和双写迁移，只在语义无法兼容时切新版本。'],
            ['分页与一致视图', '大数据集优先使用基于稳定排序键的游标分页，同时定义数据变化时的重复和跳过语义。'],
          ],
        },
        {
          title: '单体与微服务', level: 'core',
          references: [primerReference('应用层与微服务', '#微服务')],
          points: [
            ['模块化单体', '同一进程内用清晰模块和数据边界组织业务，可以减少网络和分布式协调成本。'],
            ['服务拆分依据', '团队自主、独立扩展、故障隔离和数据所有权可以支持拆分，单看代码行数没有意义。'],
            ['同步调用链', '多层同步调用会累加延迟和失败率，要限制深度并在合适位置改用异步事件。'],
            ['数据所有权', '每个服务拥有自己的业务数据并通过 API 或事件共享，避免跨服务直接改表。'],
          ],
        },
        {
          title: '服务发现与配置', level: 'scenario',
          references: [primerReference('服务发现', '#服务发现')],
          points: [
            ['客户端发现', '客户端查注册表并自行负载均衡，路由灵活但把发现和重试逻辑带到每个客户端。'],
            ['服务端发现', '客户端只访问路由器或负载均衡，中间层查注册表并选择实例。'],
            ['注册、心跳与租约', '实例启动时注册并定期续租，租约到期后摘除，需要处理短暂网络故障导致的误判。'],
            ['动态配置与密钥', '配置变更要版本化、可审计和可回滚，密钥不应作为普通配置写入代码仓库。'],
          ],
        },
        {
          title: '流量保护', level: 'scenario',
          references: [
            { title: 'Google SRE, Handling Overload', location: '过载、准入控制与负载舍弃', href: 'https://sre.google/sre-book/handling-overload/' },
          ],
          points: [
            ['限流', '令牌桶允许一定突发，漏桶强调稳定出流，限额要按用户、租户、接口和全局分层。'],
            ['超时与重试预算', '每层超时必须小于上层剩余预算，重试只用于短暂且幂等失败，并加退避和随机抖动。'],
            ['熔断', '依赖持续失败时快速拒绝新请求，窗口后允许少量试探请求判断是否恢复。'],
            ['舱壁与负载舍弃', '为不同依赖和优先级分配独立线程、连接或配额，队列过长时主动拒绝低价值工作。'],
          ],
        },
      ],
    },
    {
      title: '选择数据存储与索引',
      short: 'SQL、NoSQL、复制与分片',
      summary: '从查询模式、事务边界和容量选择存储，再考虑水平扩展。',
      groups: [
        {
          title: '关系数据库与事务', level: 'core',
          references: [primerReference('关系数据库', '#关系型数据库管理系统rdbms')],
          points: [
            ['表、约束与范式', '主键、唯一约束、外键和检查约束保存业务不变量，范式化减少重复和更新异常。'],
            ['ACID', '原子性、一致性、隔离性和持久性描述事务语义，并不保证业务操作自动正确。'],
            ['隔离级别与并发异常', '脏读、不可重复读、幻读和写偏差需要根据业务不变量选择锁、版本或更强隔离。'],
            ['查询模式驱动索引', '索引字段顺序应匹配过滤、范围、排序和覆盖需求，每个索引都会增加写入成本。'],
          ],
        },
        {
          title: '复制与故障切换', level: 'core',
          references: [primerReference('数据库复制', '#复制')],
          points: [
            ['同步与异步复制', '同步复制降低已确认数据丢失风险但增加写延迟，异步复制更快但会读到落后副本。'],
            ['主从与多主', '单主使写顺序清晰，多主支持多地写入但必须解决冲突、因果顺序和合并语义。'],
            ['读副本一致性', '写后立即读可路由到主库或记录复制位点，用户会话可通过粘性路由避免时间倒退。'],
            ['选主与防脑裂', '故障切换要依靠多数派和任期或 fencing token，阻止旧主继续写入共享资源。'],
          ],
        },
        {
          title: '分片与数据布局', level: 'scenario',
          references: [primerReference('分片、联合与非规范化', '#分片')],
          points: [
            ['范围分片', '范围查询便利但容易因时间或地区热点造成负载不均。'],
            ['哈希分片', '哈希能更均匀分布数据，但打散范围查询，扩容时需要一致性哈希或虚拟节点。'],
            {
              title: '分片键设计',
              content: [
                { type: 'paragraph', text: '分片键同时决定数据放在哪里、请求会打到哪些节点。面试里只说高基数和均匀分布还不够，还要把写入分布、查询路由、单租户上限和后续迁移放在一起评估。' },
                { type: 'heading', text: '先用真实访问模式筛选' },
                { type: 'paragraph', text: '列出最高频的读写请求，检查请求是否携带候选键。请求带完整分片键时，路由层可以定向访问少数分片。缺少分片键时通常要 scatter-gather，也就是向多个分片广播，再合并结果。分片越多，这类查询的尾延迟和资源开销越明显。' },
                { type: 'heading', text: '四个检查项' },
                { type: 'list', items: ['基数是否足够高，低基数会限制可拆出的数据范围。', '值的频率是否均匀，超级租户会把一个分片压成热点。', '值是否单调增长，时间戳和自增 ID 做范围分片时会把新写入集中到末端。', '键是否稳定，频繁修改跨分片键会带来数据迁移和并发处理成本。'] },
                { type: 'heading', text: '范围与哈希怎样选' },
                { type: 'paragraph', text: '范围分片支持按时间、地域或业务区间查询，也容易产生末端写热点。哈希分片通常能摊平写入，却会打散范围查询。常见折中是复合键，例如 tenantId 加 hash(objectId)，先保留租户路由能力，再拆散大租户内部热点。具体前缀顺序要由最常见查询决定。' },
                { type: 'heading', text: '落地前怎样验证' },
                { type: 'paragraph', text: '用生产采样或压测数据计算候选键的基数、最高频值占比、各分片 QPS 和数据量偏斜。再模拟节点扩容与大租户增长，确认迁移期间的双写、校验、切读和回滚方案。选择完成后还要监控热点键与 scatter-gather 比例，分片键不会自动保证负载均衡。' },
                { type: 'heading', text: '面试追问' },
                { type: 'paragraph', text: '如果某个租户远大于其他租户，可以为它增加二级桶或单独迁移。若业务必须同时支持按用户和按时间查询，主存储围绕核心写路径分片，另一种访问路径可以通过二级索引、搜索系统或派生表提供。' },
              ],
              references: [
                { title: 'MongoDB Manual, Choose a Shard Key', location: '基数、频率、单调性与查询路由', href: 'https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/' },
                { title: 'Amazon DynamoDB Developer Guide', location: '分区键设计与均匀负载原则', href: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html' },
              ],
            },
            ['重分片与迁移', '扩容时用双写、后台搬迁、校验和切读逐步完成，需要处理迁移中的并发更新。'],
          ],
        },
        {
          title: 'NoSQL 与专用索引', level: 'scenario',
          references: [primerReference('NoSQL 与 SQL 选择', '#nosql')],
          points: [
            ['Key-value 存储', '适合通过主键高速读写的会话、配置和缓存，不擅长复杂条件和关联查询。'],
            ['文档与宽列存储', '文档库适合聚合根整体读写，宽列库适合已知分区键下的大规模稀疏数据。'],
            ['图数据库', '关系和多跳遍历是一等查询时可用图模型，但需要控制超级节点和跨分区遍历。'],
            ['搜索索引', '倒排索引将词项映射到文档列表，搜索引擎通常是主数据的可重建派生视图。'],
          ],
        },
      ],
    },
    {
      title: '用缓存与异步削峰',
      short: '缓存、队列与背压',
      summary: '让热数据靠近读者，让可延后工作离开同步请求。',
      groups: [
        {
          title: '缓存分层与模式', level: 'core',
          references: [primerReference('缓存分层', '#缓存')],
          points: [
            ['客户端、CDN 与服务端缓存', '缓存越靠近用户延迟越低，但权限、个性化和精确失效越难。'],
            ['Cache-aside', '应用先读缓存，缺失后读数据库并回填，写入后删除或更新缓存。'],
            ['Read-through 与 Write-through', '缓存层统一负责回源和同步写底层存储，应用契约更简单但缓存层更复杂。'],
            ['Write-back', '先确认缓存写入再异步刷入底层，写延迟低但需要持久日志、顺序和故障恢复。'],
          ],
        },
        {
          title: '缓存一致性与故障', level: 'scenario',
          references: [
            { title: 'Redis cache-aside', location: '官方用例与有界陈旧说明', href: 'https://redis.io/docs/latest/develop/use-cases/cache-aside/' },
          ],
          points: [
            {
              title: '缓存一致性',
              content: [
                { type: 'paragraph', text: '缓存一致性要先回答业务能容忍多旧的数据。商品详情可以接受几十秒陈旧，余额和库存校验通常要回到权威存储。数据库与缓存是两个独立系统时，普通应用代码很难让两次写入形成同一个原子事务，因此方案应明确陈旧窗口和失败后的收敛路径。' },
                { type: 'heading', text: 'Cache-aside 的基本路径' },
                { type: 'paragraph', text: '读取时先查缓存，未命中再读数据库并回填。写入时先提交数据库，再删除缓存。删除比直接更新更容易保持统一，因为下次读取会按权威数据重建。每个缓存项仍应设置 TTL，把漏删、消息丢失和人工修改造成的陈旧限制在可计算范围内。' },
                { type: 'heading', text: '并发窗口仍然存在' },
                { type: 'paragraph', text: '一次慢读可能先读到旧数据库值，随后写请求更新数据库并删除缓存，最后慢读又把旧值回填。TTL 只能让它最终过期。要求更严时，可以给数据带单调版本，回填前校验版本；也可以从数据库变更日志发出失效事件，并让消费者幂等重试。涉及余额扣减等强不变量的读写，应绕过普通缓存或在权威存储内完成校验。' },
                { type: 'heading', text: '方案选择' },
                { type: 'list', items: ['读多写少且允许短暂陈旧时，Cache-aside 加 TTL 通常已经足够。', '本地多级缓存需要失效通知，断线后应清空本地副本，防止长期读取旧值。', '派生数据很多时，可以用 CDC 驱动缓存与索引更新，同时保留重放和版本校验。'] },
                { type: 'heading', text: '怎样评测' },
                { type: 'paragraph', text: '压测不能只看命中率。还要记录失效传播延迟、陈旧读取比例、缓存未命中时数据库 P99、热点键并发和故障恢复时间。测试中主动制造删除失败、消息重复、失效通道断线和缓存整体重启，确认系统会回源、限流并最终收敛。' },
                { type: 'heading', text: '面试追问' },
                { type: 'paragraph', text: '缓存击穿要对单个热键合并回源，缓存雪崩要打散 TTL 并保护数据库总并发。若面试官问先删缓存还是先写库，应说明两种顺序各自的并发窗口，再回到业务允许的陈旧时间和补偿机制。' },
              ],
              references: [
                { title: 'Redis cache-aside', location: '官方读写路径、TTL 与显式失效', href: 'https://redis.io/docs/latest/develop/use-cases/cache-aside/' },
                { title: 'Redis client-side caching reference', location: '失效通知、断线清理与竞态处理', href: 'https://redis.io/docs/latest/develop/reference/client-side-caching/' },
              ],
            },
            ['缓存穿透、击穿与雪崩', '穿透要防无效键，击穿要保护单个热键，雪崩要打散到期并保护数据库总负载。'],
            ['热键与大键', '热键需要本地缓存、副本或拆分读流量，大键要拆成可分页和独立过期的单元。'],
            ['双写与 CDC', '业务写库后通过事务日志或 CDC 驱动缓存、搜索和派生视图，需要幂等消费。'],
          ],
        },
        {
          title: '消息队列与事件流', level: 'core',
          references: [primerReference('异步与消息队列', '#异步')],
          points: [
            ['队列与发布订阅', '队列通常将一份工作交给一个消费者，发布订阅让多个独立订阅方收到同一事件。'],
            {
              title: '消息投递语义',
              content: [
                { type: 'paragraph', text: '投递语义描述消息在生产、代理、消费和结果落库的整个过程中可能丢失或重复。先问清保证覆盖到哪里。消息进了 Broker 一次，不代表业务结果只发生一次。网络超时后，生产者和消费者都可能无法判断上一次操作究竟成功没有。' },
                { type: 'heading', text: '三种语义' },
                { type: 'list', items: ['At-most-once 允许丢失，不会重投。消费者可以先提交位点再处理，进程在两步之间崩溃就会漏消息。', 'At-least-once 尽量避免丢失，允许重复。消费者处理完成后再提交位点，若处理成功但提交失败，恢复后会再次处理。', 'Exactly-once 要限定事务边界。Kafka 可以把读取位点和写回 Kafka 的结果放进同一事务，写到外部数据库仍需要外部系统配合。'] },
                { type: 'heading', text: '工程上常选至少一次' },
                { type: 'paragraph', text: '给每个业务动作一个稳定幂等键，例如 orderId 加 eventType。消费者在同一个数据库事务中检查或写入幂等记录，并更新业务数据。重复消息看到已完成记录后直接返回已有结果。若业务更新本身是按主键覆盖且版本不倒退，也可以利用存储语义实现幂等。' },
                { type: 'heading', text: '失败与重试' },
                { type: 'paragraph', text: '瞬时错误使用有限次数的指数退避重试，参数错误和业务拒绝不应无限重试。超过上限的消息进入死信队列，同时保留原消息、失败阶段和代码版本。重放前要确认消费者仍然幂等，否则一次修复可能制造第二次事故。' },
                { type: 'heading', text: '顺序的边界' },
                { type: 'paragraph', text: '多数消息系统只在同一分区内保证顺序。需要同一订单事件有序时，用 orderId 作为分区键，并在消费者检查业务版本。跨订单的全局顺序代价很高，通常也没有业务必要。' },
                { type: 'heading', text: '面试要给出的验证方法' },
                { type: 'paragraph', text: '测试应覆盖处理前崩溃、业务提交后确认前崩溃、重复投递、乱序和死信重放。验收指标包含重复业务结果数、消息最老年龄、重试分布、死信数量，以及从消息产生到业务结果可见的端到端延迟。' },
              ],
              references: [
                { title: 'Apache Kafka Design', location: 'Message Delivery Semantics 与事务边界', href: 'https://kafka.apache.org/41/design/design/#message-delivery-semantics' },
              ],
            },
            ['顺序与分区', '只能在同一分区或同一键内保证顺序，需按业务实体选分区键并接受跨键并行。'],
            ['死信队列与重放', '超过重试次数的消息进入死信队列，修复后重放要保留原始事件和失败原因。'],
          ],
        },
        {
          title: '背压与异步任务', level: 'scenario',
          references: [primerReference('任务队列与背压', '#任务队列')],
          points: [
            ['有界队列', '队列必须有容量和过载策略，否则它只是将上游压力变成内存耗尽和更长延迟。'],
            ['消费落后', '用堆积消息数、最老消息年龄和处理速率判断系统是短暂峰值还是持续容量不足。'],
            ['批处理与合并', '小任务可批量读写以提高吞吐，同一键的可覆盖更新可在队列中合并。'],
            ['任务状态与可取消', '长任务要保存排队、运行、成功、失败和取消状态，并在步骤边界检查取消。'],
          ],
        },
      ],
    },
    {
      title: '保证分布式正确性',
      short: '共识、事务、幂等与顺序',
      summary: '把重复、并发、部分失败和消息乱序当成常态设计。',
      groups: [
        {
          title: '复制、Quorum 与共识', level: 'advanced',
          references: [primerReference('一致性和可用性模式', '#一致性模式')],
          points: [
            ['Quorum 读写', '在 N 个副本中选择写确认数 W 和读取数 R，`R + W > N` 能让读写集合有交集，仍需要版本和冲突解决。'],
            ['Leader 与日志顺序', '单 Leader 将并发写入排成一条日志，跟随者复制并按提交位点应用。'],
            ['Raft 的任期与多数派', '任期用来识别旧 Leader，日志条目被多数派保存后才能提交，少数分区无法继续提交。'],
            ['共识的使用边界', '共识适合元数据、选主、锁服务和小量强一致状态，不应让所有业务大数据都经过同一共识组。'],
          ],
        },
        {
          title: '跨服务事务', level: 'scenario',
          references: [
            { title: 'AWS Saga pattern', location: '分布式事务的补偿与协调模式', href: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga.html' },
            { title: 'AWS Transactional outbox pattern', location: '业务数据与消息可靠发布', href: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html' },
          ],
          points: [
            ['2PC', '协调者先让所有参与者准备，再统一提交或回滚，可提供强原子性但容易阻塞并放大故障。'],
            ['Saga', '将长事务拆成已提交的本地步骤，失败时执行补偿动作，需要接受中间状态和补偿不完美。'],
            ['Transactional Outbox', '业务数据和待发事件在同一本地事务中写入，后台发布器重试投递，消费端必须幂等。'],
            ['编排与协调', '中央编排器保存步骤和补偿顺序，事件协调让服务自主反应，但全局流程更难观察。'],
          ],
        },
        {
          title: '幂等、去重与分布式锁', level: 'scenario',
          references: [
            { title: 'AWS Builders Library', location: 'Making retries safe with idempotent APIs', href: 'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/' },
            { title: 'Redis distributed locks', location: '官方分布式锁模式与安全属性', href: 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/' },
          ],
          points: [
            ['业务唯一键', '用订单号、请求号或事件 ID 作为唯一约束，数据库的原子写入是最后防线。'],
            ['Inbox 去重', '消费者在本地事务中记录已处理事件 ID 并更新业务数据，重复事件直接返回原结果。'],
            ['锁的租约与续期', '分布式锁需要到期防死锁，任务超过租约时必须安全续期或停止副作用。'],
            ['Fencing Token', '每次获锁取得递增令牌，下游拒绝比已见令牌更旧的写入，才能防止过期持有者误写。'],
          ],
        },
        {
          title: '时间、顺序与冲突', level: 'advanced',
          references: [primerReference('弱一致性和最终一致性', '#一致性模式')],
          points: [
            ['物理时钟不可靠', '机器时钟会漂移、回拨和跳跃，不能只用客户端时间判断全局操作顺序。'],
            ['Lamport Clock', '逻辑时钟可保证因果发生在前的事件数值更小，却不能单独判断两个事件是否并发。'],
            ['Vector Clock', '每个节点记录各参与方的逻辑进度，可判断因果顺序与并发冲突，元数据会随参与方增长。'],
            ['冲突解决', '可根据业务使用最后写入胜出、字段合并、用户选择或 CRDT，不存在通用无损策略。'],
          ],
        },
      ],
    },
    {
      title: '让系统可运行、可诊断、可恢复',
      short: '可靠性、安全与可观测性',
      summary: '设计故障时的行为，留下定位证据，也把权限和发布风险管住。',
      groups: [
        {
          title: '可靠性模式', level: 'core',
          references: [primerReference('可用性模式与故障切换', '#故障切换')],
          points: [
            ['健康检查与就绪门禁', '存活检查只判断进程是否需要重启，就绪检查决定是否接收新流量，两者不应混用。'],
            ['超时、重试与随机抖动', '重试会放大下游压力，只在有剩余预算、操作幂等且错误可恢复时执行。'],
            ['优雅关停与连接排空', '先停止接新请求，等待在途请求和消息到达安全点，超时后才强制终止。'],
            ['混沌实验', '在可控范围内注入进程退出、网络延迟、丢包和依赖错误，验证容错方案和监控是否真的有效。'],
          ],
        },
        {
          title: '日志、指标与 Trace', level: 'core',
          references: [
            { title: 'OpenTelemetry 概念', location: '可观测信号与跨服务上下文', href: 'https://opentelemetry.io/docs/concepts/' },
          ],
          points: [
            ['结构化日志', '日志应包含时间、级别、服务、环境、请求标识和必要业务键，同时脱敏密钥与个人数据。'],
            ['RED 与 USE 指标', 'RED 关注请求率、错误和延迟，USE 关注资源利用率、饱和度和错误，两者分别从服务与资源观察。'],
            ['分布式 Trace', 'Trace ID 连接一次请求，Span 记录服务或步骤的时间、属性和错误，异步消息也要传播上下文。'],
            ['告警与 SLO', '告警应面向用户可见错误或错误预算消耗，资源指标作为诊断信号，避免每次短暂抖动都叫醒值班人。'],
          ],
        },
        {
          title: '安全与滥用防护', level: 'core',
          references: [primerReference('安全', '#安全')],
          points: [
            ['身份认证与授权', '认证确认请求者身份，授权在每个资源和动作边界检查权限，服务间也不能默认互信。'],
            ['加密与密钥管理', '传输使用 TLS，静态数据根据敏感度加密，密钥由专门系统生成、授权、轮换和撤销。'],
            ['输入校验与输出编码', '在信任边界校验类型、长度和允许值，输出时按 HTML、SQL、Shell 等不同下游做正确编码或参数化。'],
            ['防流量滥用', '限流、配额、风险识别和审计日志需要结合，单一 IP 不能代表用户且可能被 NAT 共享。'],
          ],
        },
        {
          title: '发布、容量与成本', level: 'scenario',
          references: [primerReference('真实架构和公司工程博客', '#真实的架构')],
          points: [
            ['滚动、蓝绿与金丝雀发布', '滚动替换资源效率高，蓝绿便于快速切换，金丝雀先将少量真实流量交给新版本验证。'],
            ['数据库无停机迁移', '先增加兼容结构，再双读写或回填，切换代码后等旧版本退出，最后删除旧字段。'],
            ['容量规划与自动扩缩', '根据峰值、增长、故障域和扩容时间预留余量，扩缩指标要比 CPU 更接近实际瓶颈。'],
            ['单位成本', '将计算、存储、带宽、第三方 API 和人工运维转成每用户或每请求成本，才能比较方案。'],
          ],
        },
      ],
    },
    {
      title: '用典型题训练完整设计',
      short: '面试题与复盘',
      summary: '同一套方法覆盖读多写少、实时交互、搜索、异步任务和交易。',
      groups: [
        {
          title: '短链接与 Pastebin', level: 'scenario',
          references: [primerReference('设计 Pastebin 或 Bitly', '#设计-pastebincom-或者-bitly')],
          points: [
            ['ID 与 Base62', '可将全局唯一整数编码为 Base62 短码，也可使用随机码并通过唯一约束重试冲突。'],
            ['读多写少', '重定向读流量远大于创建，可用 CDN、分布式缓存和读副本承担热点。'],
            ['过期、删除与滥用', '短链接要定义过期和删除后的缓存行为，同时防钓鱼、恶意跳转和枚举私密链接。'],
            ['热点与统计异步化', '重定向主路径只做快速查找和响应，点击统计通过事件流异步聚合。'],
          ],
        },
        {
          title: '动态 Feed 与聊天', level: 'scenario',
          references: [primerReference('设计 Twitter 时间线和搜索', '#设计-twitter-时间线和搜索-或者-facebook-feed-和搜索')],
          points: [
            ['Feed 推模式', '发布时将内容 ID 写入关注者收件箱，读取快但大 V 会造成巨大写扩散。'],
            ['Feed 拉模式', '读取时合并所有关注对象的最新内容，写入轻但读取和多路归并成本高。'],
            ['聊天连接与会话路由', '连接网关维护长连接，会话目录将用户路由到当前网关，离线时改为持久消息和推送。'],
            ['消息顺序与已读回执', '会话内用服务端序列号保存顺序，已发送、已送达和已读是不同状态。'],
          ],
        },
        {
          title: '爬虫、搜索与排名', level: 'advanced',
          references: [primerReference('网页爬虫、搜索 Key-value 和销售排名', '#设计一个网页爬虫')],
          points: [
            ['URL Frontier', '待抓取 URL 需要去重、优先级和按主机限速，保证礼貌抓取并防止某个站点占满队列。'],
            ['内容指纹与去重', '对规范化内容计算哈希去精确重复，近似重复可用 SimHash 等局部敏感方法。'],
            ['倒排索引与分片', '词典指向文档及词频位置，可按文档或词项分片，查询时召回并合并排名。'],
            ['近实时排名', '原始事件进入流处理，按时间窗口和类别维护部分聚合，最终写入面向查询的排行榜视图。'],
          ],
        },
        {
          title: '交易、库存与任务系统', level: 'advanced',
          references: [
            { title: 'Temporal durable execution', location: '长任务状态、恢复与重放', href: 'https://docs.temporal.io/temporal' },
          ],
          points: [
            ['下单幂等与状态机', '客户端请求号保证重试不重复建单，订单状态只能沿允许的转移前进。'],
            ['库存预留', '用原子条件更新或版本号扣减可用库存，超时未支付的预留要通过可重试任务释放。'],
            ['支付回调与对账', '回调按交易号幂等处理，主动查询和定期对账用来修复丢回调和第三方结果差异。'],
            ['长任务检查点', '每个步骤在执行副作用前后写持久状态，进程重启后从检查点判断重试、跳过或补偿。'],
          ],
        },
      ],
    },
  ],
});

export default systemDesignKnowledge;
