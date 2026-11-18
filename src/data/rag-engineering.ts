export const ragEngineering = {
  fit: {
    title: '先判断：这个问题该不该用 RAG',
    intro: '看答案依据在哪里。依据在多份外部资料里，资料会更新，还要控制谁能看，RAG 才有价值。几十页固定材料可以直接放进模型输入；订单、库存和余额应该查业务数据库或 API，不能让向量检索猜实时数值。',
    rows: [
      { task: '几十页固定材料上的问答', choice: '先直接提供全文，必要时加 Prompt Cache', reason: '省去解析、索引和召回；材料增长或需要按人隔离时再引入 RAG' },
      { task: '订单、库存、账户余额', choice: 'SQL、API 或 Function Calling', reason: '数值来自实时业务系统；RAG 只补充字段含义和操作说明' },
      { task: '制度、手册、合同和技术文档', choice: 'RAG', reason: '需要找到适用版本，保留引用，并处理权限和更新' },
      { task: '翻译、润色、固定格式输出', choice: 'Prompt 或 Fine-tuning', reason: '任务主要依赖当前输入和输出规则，不缺外部事实' },
      { task: '跨多份资料归纳关系和趋势', choice: '先建立 RAG 基线，再评估分层检索、GraphRAG 或 Agentic RAG', reason: '单次 Top-K 容易漏掉分散证据，但高级方案也增加构建和运行成本' },
    ],
    boundary: '长上下文和 RAG 不是互斥选项。命中一个小片段后，仍可以取回完整父章节交给长上下文模型。比较时要固定资料、问题和权限，分别记录答案质量、延迟与费用。',
  },
  architecture: {
    title: '把检索流程做成可靠的知识库',
    intro: '演示只要求“能回答”，内部知识库还必须回答四个问题：依据能否定位、资料不足能否停答、用户能否越权、索引失败能否恢复。这四条决定数据模型和服务边界，应该在选框架之前确定。',
    gates: [
      { name: '有据可查', text: '关键结论绑定文件 ID、不可变版本、章节、页码和片段 ID。只显示文件名，无法区分同名文件和新旧版本。' },
      { name: '无据停答', text: '材料不足时返回 insufficient_evidence，说明缺少哪类依据；模型不能用通用常识补公司内部规定。' },
      { name: '权限进入查询', text: '用户身份来自服务端认证，可读知识库由权限服务计算。客户端选择的范围只能缩小，不能扩大授权结果。' },
      { name: '更新可以恢复', text: '新版本完成解析、切块和索引后再生效。任务可以重试，重复执行不会写出重复片段，服务重启也不会丢任务。' },
    ],
    servicesIntro: '中小规模的内部知识库，可以复用 PostgreSQL 保存业务记录，用 pgvector 保存向量，用对象存储保存原文件。API 负责认证和查询，独立 Worker 负责解析与索引。Worker 是处理耗时任务的后台进程。',
    services: [
      { name: 'API 服务', text: '认证调用者，计算授权范围，执行检索，组装上下文、引用和响应。不要在查询接口里接收一个可直接信任的 user_id。' },
      { name: 'PostgreSQL 与 pgvector', text: '保存文档版本、权限、任务和片段；在相同租户、知识库、版本和向量空间内搜索。' },
      { name: '对象存储', text: '保存不可变原文件、解析产物和可选的页面快照。旧回答引用旧版本时，仍要能打开当时的依据。' },
      { name: '索引 Worker', text: '领取持久任务，解析文件、切块、调用 Embedding、校验结果并切换版本。耗时工作不能依赖 API 进程里的内存任务。' },
    ],
    codeNote: '以下表结构、接口和查询是设计示例，本次合并文章时没有运行。它们用来明确字段和约束，不是可以直接复制上线的完整项目。',
    tables: [
      { name: 'knowledge_bases', text: '知识库配置、所属租户和当前 Embedding 配置' },
      { name: 'documents', text: '逻辑文件、标题、业务分类和稳定 ID' },
      { name: 'document_versions', text: '每次上传产生的不可变版本' },
      { name: 'chunks', text: '片段正文、向量、来源位置、权限和生效状态' },
      { name: 'index_jobs', text: '索引任务、租约、重试次数和最后错误' },
      { name: 'kb_permissions', text: '用户或用户组对知识库的访问关系' },
      { name: 'query_logs', text: '查询、候选片段、最终上下文、模型版本和结果状态' },
    ],
    schema: `CREATE TABLE chunks (
    id                  uuid PRIMARY KEY,
    tenant_id           uuid NOT NULL,
    kb_id               uuid NOT NULL,
    document_id         uuid NOT NULL,
    document_version_id uuid NOT NULL,
    chunk_no            integer NOT NULL,
    section_path        text[],
    page_from           integer,
    page_to             integer,
    content             text NOT NULL,
    content_hash        text NOT NULL,
    embedding_model     text NOT NULL,
    embedding_version   text NOT NULL,
    embedding           vector(1024) NOT NULL,
    is_active           boolean NOT NULL DEFAULT false,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_version_id, chunk_no, embedding_version)
);`,
    schemaNote: '唯一约束让 Worker 重跑时可以 UPSERT，也就是“已存在则更新，不存在再插入”。document_version_id 和 is_active 让新旧版本短暂共存。vector(1024) 只是示例；维度由所选 Embedding 模型决定。换模型时先建新向量空间，回填并评测后再切流量，不能只因为维度相同就混用旧向量。',
    tableDesign: '同一套 Embedding 配置可以先共用 chunks 表，用 tenant_id、kb_id 和 is_active 限制范围。不要默认每个知识库动态建一张表，否则迁移、监控和模型升级会随表数量增加。强隔离场景仍可选择独立表、分区或数据库；这是合规和运维取舍，不是唯一的标准答案。',
  },
  ingestion: {
    title: '文件上传后，怎样保证新版本完整生效',
    intro: '上传成功只说明原文件已保存，不代表它已经能被搜索。上传接口保存原件、创建版本并登记任务，返回 202 Accepted 和任务 ID；解析和索引由 Worker 异步完成。',
    upload: `@router.post("/knowledge-bases/{kb_id}/documents", status_code=202)
async def upload_document(
    kb_id: UUID,
    file: UploadFile,
    principal: Principal = Depends(current_principal),
    session: AsyncSession = Depends(db_session),
):
    await require_kb_write_access(session, principal, kb_id)
    version = await save_new_version(
        session=session,
        tenant_id=principal.tenant_id,
        kb_id=kb_id,
        file=file,
    )
    job = await enqueue_index_job(session, version.id)
    await session.commit()
    return {
        "document_version_id": str(version.id),
        "job_id": str(job.id),
        "status": "queued",
    }`,
    uploadNote: 'principal 是认证中间件确认的调用者身份。接口先检查写权限，再保存文件。这里没有接收客户端传入的 user_id，因为调用者可以伪造它。',
    states: 'uploaded → queued → parsing → embedding → indexed；失败进入 failed，按重试策略重新回到 queued。',
    jobs: 'index_jobs 至少记录 status、attempts、available_at、leased_until、worker_id 和 last_error。小团队可以使用数据库任务表配合 FOR UPDATE SKIP LOCKED 领取任务；已有 Redis 或 RabbitMQ 时，也可以接现有任务队列。关键不在队列名字，而在任务状态持久化、租约超时、重试上限和幂等写入。',
    versionSteps: [
      '保存原文件并计算内容哈希，创建暂不生效的 document_versions 记录。',
      '解析、切块并写入新片段，保留文件版本、章节、页码和权限。',
      '校验片段数量、向量维度、必填字段和抽样原文；任何一步失败都保留旧版服务。',
      '在一个事务里停用旧版本、启用新版本，让一次查询始终看到同一个版本。',
      '保留期结束后再清理旧向量和解析产物；删除与撤权则先阻断读取，再清理索引和缓存。',
    ],
  },
  metadata: {
    title: '元数据过滤：先限定适用范围，再比较相关性',
    intro: '元数据是资料附带的结构化字段，例如产品、版本、语言、发布状态和权限。向量分数只能表示文本接近程度，不能保证资料适用于当前用户。过滤负责删掉不适用或不可见的记录，检索再在剩余范围内排序。',
    example: '用户问“网关产品的 Java SDK 3.x，断线后怎样自动重连？” Java 2.x、Python 3.x 和未发布草稿即使都包含“重连”，也不该进入答案。Java 3.x 正式说明和经确认的同产品通用协议可以保留，之后再比较谁更相关。',
    conditions: [
      { name: '权限与租户', text: '来自服务端认证和授权结果。模型或客户端传来的租户 ID 不能直接扩大范围；授权结果为空就返回无可访问资料。' },
      { name: '产品、语言和版本', text: '用户明确给出或从可信项目配置确认后再过滤。用户只说“断线怎么办”，不能擅自补成 Java 3.x。' },
      { name: '发布状态与生效时间', text: '来自文档管理系统或经过确认的业务状态。文件修改时间不能代替软件适用版本。' },
      { name: '模型推断的主题标签', text: '可以帮助排序，默认不做硬过滤。文档写“连接管理”，问题说“自动重连”，强行按模型生成的主题词过滤可能删掉正确答案。' },
    ],
    fields: `{
  "chunk_id": "java3-reconnect-01",
  "product_id": "gateway",
  "sdk_language": "java",
  "major_versions": [3],
  "all_versions": false,
  "status": "published",
  "topic_tags": ["连接管理"]
}`,
    fieldsNote: '每个片段都要继承原文件的适用范围和权限，不能只给原文件打标签。[3] 表示资料声明适用于整个 3.x；只适用于 3.2 以后就需要更细的规则。通用资料应显式标记 all_versions = true 等字段，缺失字段代表“不知道”，不能自动当成“通用”。',
    filterOrder: '过滤条件要交给检索引擎，不要先全局取 Top-3，再在应用里删条件不符的记录。后一种做法可能让正确资料根本没进入候选，最后误报“知识库里没有”。关键词与向量两路要携带相同权限约束，重排、补读父段和打开引用时也不能绕过授权。',
    query: `SELECT chunk_id, content
FROM chunks
WHERE tenant_id = $1
  AND kb_id = ANY($2::uuid[])
  AND product_id = $3
  AND (sdk_language = $4 OR sdk_language = 'all')
  AND (all_versions = true OR $5::int = ANY(major_versions))
  AND status = 'published'
  AND is_active = true
ORDER BY embedding <=> $6::vector
LIMIT $7;`,
    queryNote: '$1、$2 来自服务端身份和授权；$3 到 $5 是已确认的业务条件；$6 是问题向量；$7 是候选数量。SQL 写了 WHERE，不代表近似索引一定先完成过滤再搜索。pgvector 可能扫描候选后再应用条件，严格过滤时仍可能不足 K 条，处理方法见前面的向量索引章节。',
    rls: 'PostgreSQL 的 Row-Level Security（RLS，行级安全）可以再做一道租户隔离：数据库策略只允许当前事务的租户读取对应行。应用层权限过滤负责表达用户组和知识库授权，RLS 负责限制租户越界。表所有者、超级用户和带 BYPASSRLS 的角色可能绕过策略，所以线上应用不能使用这些高权限账号；连接池复用和事务内租户上下文也必须测试。',
    evaluation: '过滤不是条件越多越好。固定同一批问题，对比过滤前后的错误版本数和必要依据召回率。评测集必须包含“用户没说版本”“资料缺字段”“通用资料没有具体版本”“主题名称与问题不同”等难例，才能发现过度过滤。',
  },
  query: {
    title: '问题进入检索前，哪些处理值得做',
    intro: '先保留原问题。工单号、错误码、人名和产品型号可以直接检索；只有多轮省略、多意图或召回不足时，再增加改写和扩展。每次调用模型改写都会增加延迟，也可能补入用户没说的条件。',
    rows: [
      { name: '规范化', how: '统一拼写、时间、单位和已知产品别名', risk: '规则错误会改变原意；精确编号要保留原样' },
      { name: '查询改写', how: '结合已确认的对话历史，把“那超出的呢？”补成独立问题', risk: '不能猜测地区、日期、版本或权限' },
      { name: '多查询', how: '生成少量不同措辞，分别检索后去重合并', risk: '增加调用量；必须比较是否找回了新的必要证据' },
      { name: '查询分解', how: '把比较、多跳问题拆成有依赖关系的子问题', risk: '子问题遗漏条件会让后面整条链路失效' },
      { name: '路由', how: '选择文档、SQL、Web、图或指定知识库', risk: '权限范围由服务端决定，不能让模型自选授权范围' },
      { name: 'HyDE', how: '先生成假想答案，再用其向量查找真实资料', risk: '假想内容可能带偏检索；只在基线召回不足时实验' },
    ],
  },
  selection: {
    title: '技术选型：先按文档和故障选，不按名词数量选',
    chunkingIntro: '切块先服从文档结构，再用 token 数检查模型容量。下面的方案解决不同问题，不需要全部堆进第一版。',
    chunkingRows: [
      { name: '标题与条款切块', use: '制度、合同、手册', limit: '保留金额、条件和例外；超长条款再按句拆分' },
      { name: '递归切块', use: '结构较弱的通用文本', limit: '按标题、段落、句子逐级寻找边界，不保证业务条件完整' },
      { name: '父子片段', use: '长章节、说明书', limit: '小块负责搜索，命中后取同版本父段；增加回表和去重' },
      { name: 'Sentence Window', use: '事实粒度细、前后句重要', limit: '句子负责搜索，再扩展相邻窗口；窗口不是越大越好' },
      { name: 'Contextual Retrieval', use: '片段离开全文后指代不清', limit: '为片段补充原文已有的位置和背景，增加索引时的模型调用' },
      { name: '表格与页面解析', use: '财报、扫描 PDF、复杂版面', limit: '保留表头、行标题、单位和页码；视觉检索仍需文字定位时保留 OCR' },
      { name: 'RAPTOR', use: '长文档的全局总结和多跳问题', limit: '递归聚类并生成多层摘要；摘要错误会向上累积' },
    ],
    storageIntro: '存储选型先看已有系统和过滤需求。产品名只能缩小候选范围，最终要用真实权限条件测试 P95 延迟、召回、写入、重建和恢复。',
    storageRows: [
      { situation: '已经使用 PostgreSQL，中小规模', start: 'pgvector', check: '业务记录与向量放在一起；重点测过滤后的近似搜索和版本更新' },
      { situation: '已有 Elasticsearch 或 OpenSearch', start: '在原搜索系统加入向量和混合检索', check: '少维护一套同步；核对分析器、RRF 和过滤行为' },
      { situation: '向量规模大，需要分布式或多向量', start: '评估 Milvus、Qdrant、Weaviate 等专用系统', check: '分片、副本、过滤、备份和索引重建都属于成本' },
      { situation: '单机实验或离线算法比较', start: 'FAISS', check: '它提供索引算法，不替应用管理原文、权限和版本' },
    ],
    advancedIntro: '高级 RAG 的名称描述的是额外能力，不是质量等级。只有失败样本证明基础链路不够时，才加入相应模块。',
    advancedRows: [
      { name: 'Hybrid Search + Rerank', solve: '精确词和语义问法都要覆盖，候选排序不稳定', cost: '两路索引、融合和逐候选评分的延迟' },
      { name: 'Agentic RAG', solve: '需要动态选择数据源、多步取证', cost: '限制检索轮数、总 token、工具白名单和停止条件' },
      { name: 'GraphRAG', solve: '跨文档实体关系和全局主题', cost: '实体消歧、图构建、社区摘要和持续更新' },
      { name: 'Multimodal RAG', solve: '答案依赖页面版式、图表或图片', cost: '视觉编码、存储、引用定位和文字核验' },
      { name: 'Self-RAG / CRAG', solve: '研究检索时机、反思或召回纠正', cost: '原论文包含专门训练或评估器；普通 Prompt 自检不等于实现原方法' },
    ],
    scenarioRows: [
      { scene: '企业制度与内部知识库', start: '结构化切块、混合检索、权限过滤、版本和引用', metric: '必要证据 Recall@K、引用支持、越权命中为零' },
      { scene: '客服与售后助手', start: '产品版本过滤、错误码关键词、语义召回、转人工', metric: '错误回答率、解决率、转人工准确性' },
      { scene: '技术文档和代码库', start: '按符号与章节切块、关键词、代码 Embedding、父子片段', metric: '符号命中率、版本正确率、示例可运行性' },
      { scene: '合同与长报告', start: '版面解析、表格结构、父子片段、重排', metric: '页级召回、字段准确率、引用定位' },
      { scene: '研究归纳与多跳问题', start: '查询分解；按证据再评估图或 Agentic RAG', metric: '证据覆盖率、多跳完整率、单题成本' },
      { scene: '实时业务查询', start: 'SQL 或 API 取数，RAG 补充业务说明', metric: '数据时效、字段正确率、权限测试' },
    ],
  },
  release: {
    title: '上线门槛：质量分不能抵消越权',
    intro: '检索、回答和系统指标分别验收。平均答案质量再高，只要出现跨租户资料泄漏，就不能发布。每次改动固定同一评测集，只改变一个主要变量，才能知道效果来自哪里。',
    checks: [
      '正常用户、空权限用户、跨部门用户和刚被撤销权限的旧会话，都检查候选、上下文、引用与缓存。',
      '新版本解析失败、Worker 重启、任务重复领取和模型接口超时，都验证旧版可用且不会产生重复片段。',
      '精确词、同义改写、多证据、无答案、冲突资料和新旧版本分别统计，不用一个总分掩盖失败类型。',
      '日志串起原问题、改写、过滤条件、候选 ID、最终上下文 ID、模型与 Prompt 版本、答案和引用；敏感正文按权限、脱敏和保留周期处理。',
      '生产环境关闭开发 reload，API 与 Worker 独立运行，配置健康检查、优雅退出、迁移、备份恢复和密钥管理。',
    ],
    boundary: '本地 Docker 启动成功，只能证明进程能运行；它不能证明权限隔离、故障恢复、容量和答案质量已经通过验收。',
  },
  sources: [
    { title: 'FastAPI：后台任务与重计算任务边界', href: 'https://fastapi.tiangolo.com/tutorial/background-tasks/' },
    { title: 'FastAPI：容器部署', href: 'https://fastapi.tiangolo.com/deployment/docker/' },
    { title: 'PostgreSQL：Row Security Policies', href: 'https://www.postgresql.org/docs/current/ddl-rowsecurity.html' },
    { title: 'Microsoft GraphRAG 文档', href: 'https://microsoft.github.io/graphrag/' },
    { title: 'Anthropic：Contextual Retrieval', href: 'https://www.anthropic.com/engineering/contextual-retrieval' },
    { title: 'RAPTOR 论文', href: 'https://proceedings.iclr.cc/paper_files/paper/2024/hash/8a2acd174940dbca361a6398a4f9df91-Abstract-Conference.html' },
    { title: 'Self-RAG 论文', href: 'https://proceedings.iclr.cc/paper_files/paper/2024/hash/25f7be9694d7b32d5cc670927b8091e1-Abstract-Conference.html' },
    { title: 'Corrective RAG 论文', href: 'https://arxiv.org/abs/2401.15884' },
    { title: 'ARES 论文', href: 'https://aclanthology.org/2024.naacl-long.20/' },
    { title: 'Lost in the Middle 论文', href: 'https://aclanthology.org/2024.tacl-1.9/' },
  ],
};

export function ragFitMarkdown(): string {
  const fit = ragEngineering.fit;
  return [
    `## ${fit.title}`,
    fit.intro,
    ...fit.rows.map((row) => `- **${row.task}**：${row.choice}。${row.reason}`),
    fit.boundary,
  ].join('\n\n');
}

export function ragEngineeringMarkdown(): string {
  const guide = ragEngineering;
  const table = (headers: string[], rows: string[][]) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
  return [
    `## ${guide.architecture.title}`,
    guide.architecture.intro,
    ...guide.architecture.gates.map((gate) => `- **${gate.name}**：${gate.text}`),
    guide.architecture.servicesIntro,
    '![知识库生产架构：API 处理认证与查询，Worker 处理持久索引任务，PostgreSQL 和对象存储分别管理记录与原文件](https://blog.mlxb.cc/images/rag/rag-production-architecture.svg)',
    ...guide.architecture.services.map((service) => `- **${service.name}**：${service.text}`),
    guide.architecture.codeNote,
    table(['表', '职责'], guide.architecture.tables.map((row) => [row.name, row.text])),
    `\`\`\`sql\n${guide.architecture.schema}\n\`\`\``,
    guide.architecture.schemaNote,
    guide.architecture.tableDesign,
    `### ${guide.ingestion.title}`,
    guide.ingestion.intro,
    `\`\`\`python\n${guide.ingestion.upload}\n\`\`\``,
    guide.ingestion.uploadNote,
    guide.ingestion.states,
    guide.ingestion.jobs,
    guide.ingestion.versionSteps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    `### ${guide.metadata.title}`,
    guide.metadata.intro,
    guide.metadata.example,
    ...guide.metadata.conditions.map((condition) => `- **${condition.name}**：${condition.text}`),
    `\`\`\`json\n${guide.metadata.fields}\n\`\`\``,
    guide.metadata.fieldsNote,
    guide.metadata.filterOrder,
    `\`\`\`sql\n${guide.metadata.query}\n\`\`\``,
    guide.metadata.queryNote,
    guide.metadata.rls,
    guide.metadata.evaluation,
    `### ${guide.query.title}`,
    guide.query.intro,
    table(['方法', '怎样做', '主要风险'], guide.query.rows.map((row) => [row.name, row.how, row.risk])),
    `## ${guide.selection.title}`,
    guide.selection.chunkingIntro,
    table(['方案', '适用资料', '作用与限制'], guide.selection.chunkingRows.map((row) => [row.name, row.use, row.limit])),
    guide.selection.storageIntro,
    table(['现状', '起步选择', '重点检查'], guide.selection.storageRows.map((row) => [row.situation, row.start, row.check])),
    guide.selection.advancedIntro,
    table(['方案', '解决什么', '新增成本与边界'], guide.selection.advancedRows.map((row) => [row.name, row.solve, row.cost])),
    table(['场景', '建议起点', '首要验收'], guide.selection.scenarioRows.map((row) => [row.scene, row.start, row.metric])),
    `## ${guide.release.title}`,
    guide.release.intro,
    guide.release.checks.map((check, index) => `${index + 1}. ${check}`).join('\n'),
    guide.release.boundary,
  ].join('\n\n');
}
