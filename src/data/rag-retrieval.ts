import vectorExample from './rag-vector-example.json';

const diagram = (file: string, title: string, alt: string, caption: string) => ({
  src: `/images/rag/${file}`, title, alt, caption, width: 1536, height: 1024,
});

export const ragRetrieval = {
  example: vectorExample,
  diagrams: {
    vector: diagram('rag-vector-topk-cel.webp', '向量库怎样找出 Top-K',
      '向量记录包含片段 ID、向量、原文位置、出处版本与租户权限。查询问题编码为向量，在允许的版本和权限范围内比较接近程度，排序取前 K 条，再按 ID 取回原文。人工二维示例排除旧版 B 与无权的 C，Top-2 返回 A 的 500 元上限和 D 的超额个人承担条款。0.80 相似度不是 80% 正确率。',
      '本例用人工二维向量做精确演算。权限过滤是查询约束；索引的物理执行顺序另见下一节。'),
    index: diagram('rag-vector-index-cel.webp', '向量索引怎样减少搜索量',
      '精确搜索比较全部候选。HNSW 从稀疏上层图开始，逐层下降，在底层扩展候选；IVFFlat 先把向量分簇，再搜索部分相近的簇。ef_search 与 probes 控制搜索范围，K 控制希望返回的数量。近似搜索可能漏掉真实近邻，要对照精确搜索和过滤后的返回数量。',
      '图中的节点与排序用于说明结构，没有运行 HNSW 或 IVF，也没有给出速度或召回率测量。'),
    ranking: diagram('rag-retrieval-ranking-cel.webp', '检索候选怎样变成回答依据',
      '在同一租户、权限和生效版本内，关键词与向量检索分别产生候选，RRF 按各路名次融合。可选 reranker 读取问题和候选段落判断相关性，再去重、保留适用条件，按 token 预算选取原文和来源。模型据 A 与 D 回答住宿上限 500 元、超额个人承担。候选 K 不等于最终上下文数量，重排不能补出未找到的资料。',
      'RRF 融合、模型重排和上下文选择是三个动作。图中 reranker 与回答是机制示意；演练脚本只计算排名融合。'),
    lifecycle: diagram('rag-version-evaluation-cel.webp', '资料更新与评测',
      '新版本先完成解析、分块、向量化和权限、索引校验，再切换生效版本并使旧引用与缓存失效。撤权或删除先阻断读取。同一次请求记录过滤、检索重排、实际上下文和答案引用。评测分别检查 ANN 对照精确近邻、必要条款召回、回答金额条件和引用。',
      '更新流程是工程建议。索引召回、业务证据召回和回答质量分别验证，不能用一个总分代替。'),
  },
  vector: {
    title: '向量数据库与 Top-K：怎样找到原文',
    definition: '向量数据库保存向量及其关联记录，按距离或相似度找出接近查询的记录。RAG 通常以“资料片段”为记录单位：程序先把问题编码成向量，数据库返回候选 ID，再取回对应原文与出处。',
    storage: [
      { name: '向量与空间版本', text: '保存浮点向量、模型修订、维度及处理配置。文档和问题须在同一配套向量空间；维度一样不代表不同模型的向量能混用。' },
      { name: '原文与定位信息', text: '向量可以与原文存同一记录，也可以只关联原文 ID。保留文件、章节、页码和片段边界，才能回查和引用。原文放在外部存储时，还要处理 ID 对应关系和更新。' },
      { name: '元数据与可见范围', text: '保存租户、权限组、资料版本、生效状态等字段，供程序限制搜索范围。向量分数不能代替这些业务条件。' },
    ],
    boundary: '向量索引只是负责加速找近邻的数据结构，原文、权限和版本还需要管理。pgvector 把向量搜索接入 PostgreSQL；FAISS 主要提供索引算法，不会自动补齐应用的权限和文档管理。起步先复用现有合适的存储。',
    steps: [
      { title: '准备问题向量和范围', text: '用配套 Embedding 模型编码完整问题，确定距离指标；租户和权限来自服务端认证，同时限定生效版本与向量空间。' },
      { title: '找接近的候选', text: '精确搜索逐条比较允许范围内的向量；近似索引先找较小的候选集合，再计算或估计距离，详见下节。' },
      { title: '按距离取前 K 条', text: 'Top-K 表示按所用指标最靠前的 K 条；满足过滤条件的记录不足时可能返回更少。SQL 中通常体现为 ORDER BY 距离、LIMIT K。' },
      { title: '取回原文，再检查能否回答', text: '按候选 ID 取回同版本原文，检查金额、条件与来源。数据库找到了近邻，不等于这条资料回答了用户的问题。' },
    ],
    formula: 'cos(q, x) = 点积(q, x) / (长度(q) × 长度(x))',
    math: '本例 q=[1,0]，A=[0.8,0.6]，二者长度都是 1。点积为 1×0.8+0×0.6=0.8，因此余弦相似度为 0.8，余弦距离为 1−0.8=0.2。先排除旧版 B 和财务专用 C，再从 A、D、E 中取 Top-2，得到 A、D。',
    selection: '精确 Top-K 不必把所有结果完整排序。一个常见做法是维护容量为 K 的堆：只保留当前最接近的 K 条，新记录更近时替换其中最远的一条，最后把保留项排序。它减少排序开销，但仍要计算所有候选的距离；ANN 索引才会进一步减少参与比较的向量。',
    measures: [
      { name: '余弦相似度 / 余弦距离', text: '比较方向，相似度越大越接近；余弦距离通常为 1−相似度，越小越接近。余弦相似度理论范围为 −1 到 1，零向量无法这样计算。' },
      { name: '点积（Inner Product）', text: '直接把对应分量相乘并相加，越大越靠前；向量长度也影响结果。只有双方归一化后，点积才等于余弦相似度。' },
      { name: 'L2 距离', text: '计算各分量差的平方和，再开平方，越小越接近。有的库返回平方距离，例如 FAISS 的 METRIC_L2；排序相同，但数值不能混看。' },
    ],
    normalization: '单位向量满足 L2²=2−2×余弦相似度，三种指标在这种条件下排序一致。本例 [3,4] 与 q 的点积为 3、余弦为 0.6；若直接用点积，它会排在 A 前面。指标与归一化方式应按模型说明选择。',
    limit: '0.8 相似度不是 80% 正确率。若把本例阈值硬设为 0.7，必要的 D 就会被删掉，第二问缺少依据。即使问题没有答案，Top-K 也可能返回相对最近的条款。用有答案和无答案的问题校准阈值，继续检查原文是否真的回答了问题。',
    sql: `SELECT id, doc_version, text,
       1 - (embedding <=> $1::vector) AS similarity
FROM rag_chunks
WHERE tenant_id = $2
  AND access_group = ANY($3::text[])
  AND space_id = $4
  AND is_current = true
ORDER BY embedding <=> $1::vector
LIMIT $5;`,
    sqlNote: 'pgvector 语法示例，未在 PostgreSQL 执行。假设表含上述列，embedding 为匹配模型维度的 vector。$1 为查询向量；$2、$3 来自服务端身份；$4 为向量空间版本；$5 为 K。<=> 是余弦距离，ORDER BY 升序取最近项；索引类型也要匹配距离指标。',
    demoCommands: 'curl -fsSLO https://blog.mlxb.cc/examples/rag-vector-search-demo.py\npython3 rag-vector-search-demo.py --self-test',
    demoNote: 'Python 3.10+，标准库 SQLite，无需安装依赖或下载模型。二维向量是教学设定；脚本实跑记录存储、过滤、余弦排序、Top-K、RRF 计算和证据指标，没有运行 Embedding、HNSW、BM25、reranker 或生成模型。',
  },
  index: {
    title: 'HNSW / IVF：资料多了，怎样少比较一些',
    definition: '精确搜索比较所有候选向量；ANN（Approximate Nearest Neighbor，近似近邻搜索）用索引减少比较量，代价是可能漏掉真实最近项。先用精确搜索建立基线，耗时不满足目标时再评估近似索引。',
    methods: [
      { name: '精确搜索 / Flat', how: '在既定范围内计算距离并取最靠前的结果。比较量随候选数 N 和维度 d 增长，距离计算约为 O(N×d)。', check: '得到近邻基线；它只保证所用向量和指标下的数学近邻，不保证业务答案正确。' },
      { name: 'HNSW', how: '建索引时给点随机分配层高，并连接附近节点。查询从点少的上层出发，沿更近节点移动，再逐层下降。底层维护待探索节点和当前较好的候选，扩展邻居，按搜索预算和停止条件结束，取最靠前的 K 条。', check: '没有访问的节点可能更近。扩大 ef_search 通常提高近邻召回，也增加耗时；M 与 ef_construction 则影响建图质量、内存和构建成本。' },
      { name: 'IVFFlat', how: '常见实现用 k-means 从资料向量建立簇中心，把向量分到相近的中心；查询时找相近的簇，比较其中的原始向量，合并候选结果。', check: '未访问的簇可能含有更近的向量。增加访问簇数有助于找全，但比较量也增加。簇中心训练与 Embedding 模型训练是两件事。' },
    ],
    parameters: [
      { name: 'K / LIMIT', meaning: '希望检索返回几条候选；不是索引内部看过多少向量，也不是最终发给回答模型几段。' },
      { name: 'HNSW ef_search', meaning: '查询时动态搜索候选列表的规模。它不等于最终返回数量；需要对照近邻召回和延迟调节。' },
      { name: 'HNSW M / ef_construction', meaning: 'M 控制图连接规模，ef_construction 控制建图时的候选列表规模。它们影响建图成本、内存和后续召回，属于索引构建配置。' },
      { name: 'IVF probes / nprobe', meaning: '查询访问多少个簇，名称随引擎不同。它与建索引时的簇总数 lists / nlist 分开设置。' },
    ],
    filtering: '过滤条件必须进入服务端查询，但不意味着引擎物理上先筛完再走索引。pgvector 的近似扫描后还会应用过滤，候选中大量记录不满足条件时，返回数量可能少于 K。检查实际执行计划、候选预算和过滤选择性，不要直接去掉权限限制。',
    fixes: '可评估扩大搜索候选、迭代扫描、针对常用过滤字段建索引，或按租户等分区。pgvector 0.8.0 起支持迭代扫描；strict_order 保持返回项按距离排序，仍不保证找到了全局全部近邻。',
    baseline: '先固定问题向量、距离指标、权限过滤、资料和索引版本，保存精确 Top-K；再只改变 ANN 的搜索参数，对照遗漏了哪些近邻、实际返回几条，以及延迟。索引近邻召回与业务证据召回的分母不同，公式见后面的评测小节。',
    capacity: '存储也要算：假设 100 万条、每条 512 维 float32，仅向量数组约为 1000000×512×4=2.048 GB，索引、元数据、原文和副本另算。压缩或量化会改变资源和精度取舍，需要与未压缩基线比较。',
  },
  ranking: {
    title: '混合检索、重排与上下文：分别解决什么问题',
    definition: '混合检索增加找资料的途径，RRF 合并各路排名，reranker 再看问题和段落判断相关性。最后还要选择能回答问题的完整原文，放进模型输入预算；这些阶段可以按需要组合。',
    methods: [
      { name: '关键词 / BM25', text: '用倒排索引找含查询词的记录，再根据词频、词项稀有程度和文长评分。编号和专用词也可参与搜索；要求完整一致的编号，应另存精确匹配字段。' },
      { name: '向量检索', text: '按向量接近程度补充同义问法，例如“住酒店”找“住宿”。文档里的精确编号或否定条件仍可能漏掉，要用自己的问题验证。' },
      { name: 'RRF 排名融合', text: '按各路名次加分，避免直接把不同尺度的 BM25 分数与余弦分数相加。它合并已有结果，不读取条款判断业务规则。' },
      { name: 'Reranker 重新排序', text: '常见 cross-encoder 把问题和一条候选段落一起送进模型，输出该配对的相关性分数。它重排已找到的候选，不能补出前级漏掉的资料。' },
    ],
    keyword: [
      { name: '倒排索引：从词找到记录', text: '入库时，全文分析器把资料处理成词项，建立“词项 → 记录 ID 列表”的映射。查询时用配套分析规则处理问题，读取对应列表并组合候选，不必逐篇扫描正文。中文分词、同义词和编号规则会改变匹配结果；这套分析器与 LLM tokenizer 分开配置。' },
      { name: 'BM25：同样命中，谁更靠前', text: '一个查询词在候选中出现越多，通常贡献越大，但增益会逐渐变小；在资料库里越少见的词，区分作用通常越大。文长归一化减少长段仅凭词多就占优的情况。k1 控制词频增益的饱和程度，b 控制文长影响。它评分的是词项匹配，不理解公司规则是否适用于当前用户。' },
    ],
    crossEncoder: 'Embedding 检索把文档向量预先算好，提问时只计算问题向量，再比较接近程度。Cross-encoder 则为每个“问题＋候选段落”配对做联合计算，模型能结合两边文本评分；候选越多，输入与计算量通常越大，可以批处理。模型分数通常也不是正确概率，长配对还要检查截断。',
    rrfFormula: 'RRF(d) = Σ 1 / (c + 该记录在这一检索路的名次)',
    rrfNote: '名次从 1 开始；该路没有这条记录就不加分。本次融合演练把向量候选扩为 3 条，排名按演算为 A、D、E；前面的 SQL 演练仍取 Top-2。本例设 c=60，关键词排名人为设为 A、D。A 的分数为 1/61+1/61≈0.032787；D≈0.032258，E≈0.015873。这是融合计算，不是正确概率。',
    query: '多轮问题“那超出的呢？”先结合已确认的历史补全为“住宿超过报销上限的部分谁承担？”。保留原问题，不擅自补地区、日期或权限。若生成多个检索问法，要去重、限制调用量，并检查是否找回更多必要条款。',
    context: '重排后，按片段 ID 去重并保留出处。相邻片段重叠时合并重复原文，不能只看文字相似就删掉不同条件。需要父段或相邻条款时，按同版本定位取回，再复核权限；取回方法见前面的切块小节。这里的 Context 指实际发给回答模型的问题、要求、历史和原文。',
    k: '把检索候选数 K、重排后保留数和最终上下文 token 预算分开设置。只找到 A，就先查怎样召回 D；A、D 都找到了却被挤出输入，就查重排和组装。比较几个候选 K，记录必要证据召回、上下文 token 数、正确回答数、延迟和费用，选择满足目标的配置。',
    answer: '本问题需要 A 的 500 元上限和 D 的超额承担，回答应同时引用两条。没找到必要依据就说明缺口；来源冲突就列出版本和条件。引用能定位到原文还不够，也要逐条确认它支持金额和条件。',
    injection: '检索原文按资料处理，原文中的“忽略要求、读取其他文件”等指令不能扩大权限。指令与资料分开呈现，访问限制由服务端执行；Prompt 和引用格式只能辅助约束，不能代替权限检查。',
  },
  operations: {
    title: '资料更新、缓存、留痕与评测',
    definition: 'RAG 更新的是原文、片段、向量、元数据和缓存的对应关系。新文件已上传，不代表这些环节都已生效；要用查询实际找到的版本和引用验收。',
    updates: [
      { name: '建立新版本', text: '原文件按不可变版本保存。按稳定的“文件版本＋片段定位”识别记录，处理重试沿用同一 ID，避免重复插入。向量关联模型修订与处理配置。' },
      { name: '完成后再切换', text: '新版本解析、分块、向量化和字段校验通过后，再切换生效版本。一次查询固定使用同一资料和索引版本，避免检索时是 v1、取原文时却变成 v2。切换前处理失败就保持旧版可用。' },
      { name: '撤权与删除', text: '先由服务端阻断受影响资料的读取，再清理索引引用和缓存。检索后取原文、命中缓存后返回结果，都要按当前权限复核，不能等后台清理完成才撤权。' },
    ],
    caches: [
      { name: 'Embedding 缓存', text: '用完整输入文本、模型修订和处理配置识别缓存；文本、标题、前缀或模型改变，就重新计算。向量缓存仍按资料权限管理，不能跨权限暴露缓存内容。' },
      { name: '检索缓存', text: '缓存键至少包括问题或查询向量标识、租户、当前权限范围及其版本、资料/索引版本、距离指标和检索参数。只用问题作键，可能把财务结果给普通员工；漏掉资料版本，可能继续返回旧版 800 元。' },
      { name: '回答缓存', text: '还需区分 Prompt、回答模型、最终上下文和影响问意的聊天历史。不能只按相似问题复用答案；第一版若没有完整失效规则，先不缓存答案。' },
    ],
    trace: '同一次请求串起：原问题及改写、权限与版本过滤、向量空间和索引版本、检索 ID 与分数、重排 ID、实际上下文 ID、回答与引用、各阶段耗时和 token 用量。日志只保留排错需要的内容，敏感原文按权限与脱敏规则管理。',
    metrics: [
      { name: '索引近邻召回', text: 'ANN 与精确结果的交集数 ÷ 精确结果数。对照时固定同一问题向量、指标、K、权限与资料版本；它检查索引漏没漏数学近邻，不检查业务答案。' },
      { name: '必要证据 Recall@K（召回率）', text: '前 K 条中找回的必要证据数 ÷ 标注的全部必要证据数。先为每个问题标注必需条款，统一片段、文档或证据的单位；不把同一条依据拆成多个命中来刷高分。' },
      { name: '候选 Precision（精确率）', text: '相关结果数 ÷ 实际返回结果数，检查拿到的资料里有多少有用。下面用 A、D、E 展示：召回可以不变，精确率却因无关结果增加而下降。' },
      { name: '答案正确性与引用支持', text: '本题必须同时答对“每晚 500 元”和“超额个人承担”，分别引用 A、D。金额对却漏答第二问，仍不算完整正确；引用存在，也要核对原文是否支持结论。另测无答案拒答和越权泄漏。LLM 评分可辅助筛查，关键用例由人核对。' },
    ],
    performance: '延迟按阶段记录：问题向量化、检索、重排、取原文和生成；并测从提问到最终结果的总延迟。P95 是延迟的第 95 百分位，表示约 95% 的请求不超过该值；不能只看平均值。每次正确回答成本 = 全部请求实际费用 ÷ 正确完成的问题数，费用包含失败、重试及各模型调用；正确数为 0 时该指标无定义，先报告失败和总费用。',
  },
  sources: [
    { id: 'faiss-library', title: 'FAISS：向量相似搜索与聚类算法库', href: 'https://github.com/facebookresearch/faiss', supports: '说明 FAISS 的索引库定位；原文与权限管理仍属于应用的职责。' },
    { id: 'cross-encoder', title: 'Sentence Transformers：Cross-Encoder 配对评分', href: 'https://www.sbert.net/docs/cross_encoder/usage/usage.html', supports: '说明把问题与候选配对输入，输出相关分数或排序；本页没有运行 reranker 模型。' },
    { id: 'vector-records', title: 'Qdrant：向量记录、ID 与 payload', href: 'https://qdrant.tech/documentation/manage-data/points/', supports: '说明向量记录关联唯一 ID 与元数据。原文、版本和权限字段是本页的应用设计建议。' },
    { id: 'vector-metrics', title: 'FAISS：余弦、点积、L2 与归一化', href: 'https://github.com/facebookresearch/faiss/wiki/MetricType-and-distances', supports: '支持距离指标与单位向量的等价关系；本页二维数值由演练计算，不是模型质量结果。' },
    { id: 'ann-hnsw', title: 'HNSW 原始论文：分层近邻图', href: 'https://arxiv.org/abs/1603.09320', supports: '支持多层图结构与近似搜索思路；不把论文中的速度结果套用到本页或具体项目。' },
    { id: 'ann-ivf', title: 'FAISS：IVFFlat 的分簇与 nprobe', href: 'https://github.com/facebookresearch/faiss/wiki/Faster-search', supports: '说明簇总数与查询访问簇数的区别，以及漏搜其他簇的原因。' },
    { id: 'rrf', title: 'Elastic：Reciprocal Rank Fusion', href: 'https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion', supports: '支持 RRF 名次融合公式；本页 c=60 为演练配置。' },
    { id: 'ranking', title: 'Elastic：排序与重新排序', href: 'https://www.elastic.co/docs/solutions/search/ranking', supports: '支持关键词、向量、混合检索及二阶段重排的区别。' },
    { id: 'text-analysis', title: 'Elastic：全文检索的文本分析', href: 'https://www.elastic.co/docs/manage-data/data-store/text-analysis', supports: '说明全文检索将文本分析成词项，与模型 token 编码承担不同工作。' },
    { id: 'inverted-index', title: 'Stanford IR：倒排索引的词典与记录列表', href: 'https://nlp.stanford.edu/IR-book/html/htmledition/a-first-take-at-building-an-inverted-index-1.html', supports: '说明词项到文档 ID 列表的映射和查询基础；实际中文分析器需要按项目配置。' },
    { id: 'bm25', title: 'Lucene：BM25 的词频饱和与文长归一化', href: 'https://lucene.apache.org/core/9_9_1/core/org/apache/lucene/search/similarities/BM25Similarity.html', supports: '支持 k1、b 和 IDF 的作用说明；本页不把默认参数当作所有项目的最佳值。' },
    { id: 'ir-metrics', title: 'Stanford IR：Precision 与 Recall', href: 'https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-unranked-retrieval-sets-1.html', supports: '支持相关结果、实际返回结果和必要证据的分母区别。ANN 近邻基线与业务证据评测分开。' },
    { id: 'rag-security', title: 'OWASP：来自外部资料的间接 Prompt Injection', href: 'https://genai.owasp.org/llmrisk/llm01-prompt-injection/', supports: '支持资料与指令分离、最小权限和程序检查；不能用一条 Prompt 声称完全防住资料内指令。' },
  ],
};

export function ragRetrievalMarkdown(): string {
  const guide = ragRetrieval;
  const table = (headers: string[], rows: string[][]) => [
    `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
  const image = (key: keyof typeof guide.diagrams) => `![${guide.diagrams[key].alt}](https://blog.mlxb.cc${guide.diagrams[key].src})`;
  const items = (values: { name: string; text: string }[]) => values.map((item) => `- **${item.name}**：${item.text}`).join('\n');
  return [
    `## ${guide.vector.title}`, guide.vector.definition, image('vector'),
    items(guide.vector.storage), guide.vector.boundary,
    ...guide.vector.steps.map((step, index) => `${index + 1}. **${step.title}**：${step.text}`),
    `问题：${guide.example.question}\n\n${guide.example.note}`,
    guide.vector.formula, guide.vector.math, guide.vector.selection,
    table(['ID', '条款', '向量', '余弦相似度', '可见状态'], [...guide.example.records].sort((a, b) => b.cosine - a.cosine).map((row) => [row.id, row.text, JSON.stringify(row.vector), String(row.cosine), row.eligible ? '员工可见，当前版本' : row.current ? '无权限' : '旧版'])),
    items(guide.vector.measures.map((item) => ({ name: item.name, text: item.text }))), guide.vector.normalization, guide.vector.limit,
    '### pgvector 查询语法', `\`\`\`sql\n${guide.vector.sql}\n\`\`\``, guide.vector.sqlNote,
    '### 精确 Top-K 演练', guide.vector.demoNote, `\`\`\`sh\n${guide.vector.demoCommands}\n\`\`\``,
    `过滤后 Top-${guide.example.topK}：${guide.example.filteredResult.join('、')}。先从全库取前 ${guide.example.topK} 条得到 ${guide.example.unfilteredTopK.join('、')}，再过滤后为空。`,
    `## ${guide.index.title}`, guide.index.definition, image('index'),
    table(['方法', '怎样搜索', '检查什么'], guide.index.methods.map((item) => [item.name, item.how, item.check])),
    ...guide.index.parameters.map((item) => `- **${item.name}**：${item.meaning}`),
    guide.index.filtering, guide.index.fixes, guide.index.baseline, guide.index.capacity,
    `## ${guide.ranking.title}`, guide.ranking.definition, image('ranking'), items(guide.ranking.methods),
    '### 倒排索引与 BM25 的具体过程', items(guide.ranking.keyword),
    '### Reranker 与 Embedding 的区别', guide.ranking.crossEncoder,
    guide.ranking.rrfFormula, guide.ranking.rrfNote, guide.ranking.query, guide.ranking.context,
    guide.ranking.k, guide.ranking.answer, guide.ranking.injection,
    `## ${guide.operations.title}`, guide.operations.definition, image('lifecycle'),
    items(guide.operations.updates), '### 三类缓存分别怎样识别与失效', items(guide.operations.caches),
    '### 同一次请求要记录哪些信息', guide.operations.trace,
    '### 分别检查索引、证据与回答', items(guide.operations.metrics),
    '### 把 Recall 与 Precision 算一遍',
    `本问题的必要证据为 ${guide.example.requiredEvidence.join('、')}，E 是餐费条款，不属于所需依据。`,
    table(['返回结果', '必要证据 Recall', '候选 Precision'], guide.example.metrics.map((row) => [row.retrieved.join('、'), `${(row.recall * 100).toFixed(0)}%`, `${(row.precision * 100).toFixed(1)}%`])),
    '### 延迟与每次正确回答的成本', guide.operations.performance,
  ].join('\n\n');
}
