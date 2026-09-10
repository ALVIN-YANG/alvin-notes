---
title: RAG 技术全景与选型
description: 从数据解析、切块、Embedding、检索和重排讲到引用、评测、权限与高级 RAG，梳理常见技术词汇、方案差异和选型依据
slug: ai/rag-primer
author: Alvin Yang
date: 2025-12-27
lastUpdated: 2026-08-06
tags:
  - RAG
  - 信息检索
  - AI Agent
  - LLM
---

RAG 这三个字已经装进了太多东西。有人把向量检索叫 RAG，有人把知识库问答叫 RAG，接上 GraphRAG 或 Agentic RAG 以后，系统边界又往外扩了一圈。只记住“切块、向量化、检索、生成”，能跑通 Demo，遇到真实数据很快就不够用了。

这篇文章做一件事。把 RAG 链路里的常见技术、方案差异和选型依据放到一张图里。需要看具体落地过程时，可以继续读 [企业内部知识库的 RAG 落地记录](/ai/rag-knowledge-base-component/)。那篇文章以员工制度问答为例，拆开文件入库、权限过滤、检索生成、引用、评测和部署中遇到的问题。

![RAG 流水线](/images/ai/rag-pipeline.svg)

## RAG 到底包含什么

2020 年的 RAG 论文把生成模型的参数记忆和外部非参数记忆接在一起。模型生成答案前，从外部索引取回相关文本，再让生成过程参考这些文本。今天工程里的 RAG 已经扩展为两条链路。

| 链路 | 负责的工作 | 常见产物 |
| --- | --- | --- |
| 离线索引链路 | 采集、解析、清洗、切块、向量化、建索引 | Document、Chunk、Embedding、倒排索引、向量索引 |
| 在线查询链路 | 理解问题、召回、融合、重排、组装上下文、生成答案 | Query、候选文档、Context、Answer、Citation |

这里有几个词容易混在一起。

| 术语 | 它具体指什么 |
| --- | --- |
| Corpus | 允许系统检索的全部资料集合 |
| Document | 一份原始资料或解析后的逻辑文档 |
| Chunk 或 Node | 从文档中拆出的最小索引单元。Node 是 LlamaIndex 等框架常用的叫法 |
| Embedding | 把文本、图片或其他内容编码成向量 |
| Index | 为搜索建立的数据结构，可以是倒排索引、向量索引或图索引 |
| Retriever | 根据问题召回候选内容的组件 |
| Reranker | 对候选内容做第二次精排的模型或规则 |
| Context | 最终交给生成模型的参考内容 |
| Grounding | 让回答受到给定证据约束，并能回到证据核验 |
| Citation | 答案引用的来源位置，至少要能定位到文档版本和页码或段落 |

向量数据库只是 RAG 的一种索引设施。语义搜索只完成“找内容”，RAG 还要处理数据更新、权限、上下文组装、生成和评测。三者不能混用。

## 先判断该不该用 RAG

RAG 适合资料量大、更新频繁、答案需要依据来源的任务。数据类型和问题形态会改变方案。

| 要做的事 | 优先考虑 | RAG 的位置 |
| --- | --- | --- |
| 几十页固定材料上的问答 | Long Context 加 Prompt Cache | 材料持续增长或需要权限过滤时再接 RAG |
| 查订单、库存、账户余额 | SQL、API、Function Calling | 用 RAG 解释字段和业务口径，不让它猜实时数值 |
| 企业文档、制度和产品资料问答 | RAG | 重点处理权限、版本、引用和增量更新 |
| 改写语气、固定输出格式 | Prompt 或 Fine-tuning | RAG 只提供外部事实 |
| 执行多步业务流程 | Agent 加 Tool Calling | Agent 可以把 RAG 当成一个检索工具 |
| 跨很多材料归纳关系和趋势 | 分层检索、GraphRAG 或 Agentic RAG | 普通单次 Top-K 容易漏掉分散证据 |

长上下文能省掉索引和召回，也能保留全文关系。它的代价是输入变长、延迟和费用增加，资料权限与更新也更难管理。研究还发现，相关信息放在长上下文中间时，模型利用它的能力可能下降。这类现象通常叫 **Lost in the Middle**。材料能完整放入上下文时，可以把长上下文作为基线，再用实际问题比较 RAG 的质量和成本。

Fine-tuning 更适合调整行为、格式和领域语言习惯。经常变化的事实放进训练参数后，更新和删除都很麻烦。多数知识问答系统会让 Fine-tuning 管行为，让 RAG 管资料。

## 数据接入决定了后面的上限

检索模型再强，也找不回解析阶段已经丢掉的标题、表格关系和页码。真实项目里，数据接入往往比换 Embedding 模型更先影响结果。

### Loader、Parser、OCR 和 Layout Analysis

| 技术 | 处理什么 | 常见选择 |
| --- | --- | --- |
| Loader 或 Connector | 从文件、网页、对象存储、数据库和 SaaS 拉取数据 | 自写连接器、Airbyte、框架内置 Loader |
| Parser | 把 PDF、DOCX、HTML 等格式转成可处理的结构 | pypdf、Apache Tika、Unstructured、Docling |
| OCR | 从扫描件或图片识别文字 | Tesseract、PaddleOCR、云 OCR、视觉模型 |
| Layout Analysis | 识别标题、段落、栏、表格、页眉和阅读顺序 | Docling、MinerU、Unstructured、版面模型 |
| Table Extraction | 保留行列关系和合并单元格 | Camelot、Tabula、Docling、专用文档模型 |

纯文本 PDF 可以直接提取文字。扫描件需要 OCR，多栏排版还要恢复阅读顺序。财务报告、合同和论文里，表格与正文通常要分别保存。把表格压成一长串文字，行列关系很容易在切块时消失。

视觉信息本身有检索价值时，可以走 **Multimodal RAG**。ColPali 一类方案把文档页面作为图片编码成多向量，能利用版式、图表和视觉区域。它省掉一部分文字解析步骤，也会提高索引体积和推理成本。需要精确引用文字时，通常仍要保留 OCR 或结构化解析结果。

### 文档标准化

解析后的文档最好先收敛到自己的数据结构。框架对象可以替换，业务字段要由系统掌握。

```json
{
  "document_id": "policy-2026",
  "version": "3",
  "source_uri": "s3://docs/policy-2026-v3.pdf",
  "title": "员工休假制度",
  "content": "...",
  "page": 12,
  "section_path": ["休假", "年假"],
  "tenant_id": "company-a",
  "acl": ["hr", "manager"],
  "updated_at": "2026-07-20T10:00:00+08:00",
  "checksum": "..."
}
```

`document_id` 标识逻辑文档，`version` 和 `checksum` 用来判断更新，`source_uri`、页码和章节路径支撑引用。`tenant_id` 与 `acl` 参与检索过滤。权限字段只写进 Prompt 没有隔离作用，检索阶段就要排除无权访问的内容。

### 清洗、去重与版本

页眉页脚、导航栏和版权声明反复出现在每一页，会挤占召回结果。清洗时可以按重复率识别模板内容，也要保留原始文件和解析产物，方便回溯错误。

增量索引通常依赖内容哈希。新增文档进入索引，修改文档创建新版本并替换旧 Chunk，删除文档要同步删除倒排索引、向量和缓存。Embedding 模型、维度或切块规则变化时，旧向量通常不能直接复用，应当保留 `embedding_version` 和 `chunking_version`，再做可回滚的重建。

## Chunking 解决检索粒度问题

Chunk 太大，召回结果会带进很多无关内容。Chunk 太小，代词、标题和上下文会断开。不存在适合所有资料的固定数字，块大小要同时看文档结构、问题粒度、Embedding 上限和最终上下文预算。

![相邻块保留重叠内容](/images/ai/rag-chunk-overlap.svg)

### 常见切块方案

| 方案 | 做法 | 适用情况 | 主要代价 |
| --- | --- | --- | --- |
| Fixed-size Chunking | 按字符或 Token 固定长度切分 | 数据结构混乱，先搭基线 | 容易切断标题、表格和句子 |
| Recursive Chunking | 依次尝试标题、段落、句子和长度边界 | 通用文本和 Markdown | 规则需要按语言调整 |
| Structure-aware Chunking | 按章节、列表、代码函数或表格结构切分 | 手册、代码、合同、报告 | 依赖高质量解析结果 |
| Semantic Chunking | 根据句子向量变化寻找语义边界 | 结构弱但语义段落明显的文本 | 索引更慢，阈值难统一 |
| Sentence Window | 用句子做检索单元，命中后扩展前后窗口 | 事实粒度细、局部上下文重要 | 候选数量和回表次数增加 |
| Parent-Child Retrieval | 小块负责召回，大块负责提供上下文 | 长章节和说明文档 | 要维护父子关系和去重 |
| Contextual Retrieval | 给每个 Chunk 补充它在全文中的位置说明 | Chunk 离开原文后指代不清 | 建索引时增加模型调用 |
| Late Chunking | 长上下文模型先编码全文，再对 Token 表示做分块池化 | 长文档中的上下文依赖 | 依赖支持长输入和 Token 级输出的 Embedding 模型 |
| RAPTOR | 对 Chunk 聚类并递归生成摘要，形成多层树 | 全局总结、多跳问题和长文档 | 索引成本高，摘要错误会向上累积 |

Overlap 只能缓解边界被切断的问题。它会制造重复内容，数值过大还会让 Top-K 被同一段的多个副本占满。结构化切分、Parent-Child 和 Sentence Window 往往比盲目增加重叠更稳定。

一个可用的起点是按标题和段落切分，再把过长段落递归拆开。随后用评测集调整 Chunk 大小和重叠。代码库可以按类、函数和符号切分，合同要保留条款编号，客服知识要保留产品版本和生效时间。

## Embedding 负责把可检索特征编码出来

Embedding 把输入映射到向量空间。语义接近的文本通常距离更近，向量检索便能找到措辞不同但意思接近的内容。

![文本与问题进入同一向量空间](/images/ai/rag-text-to-embedding.svg)

### Dense、Sparse 和 Multi-vector

| 表示方式 | 原理 | 擅长什么 | 常见短板 |
| --- | --- | --- | --- |
| Dense Embedding | 每段内容压成一个稠密向量 | 语义相似、改写和跨语言匹配 | 型号、缩写和精确词可能漏召回 |
| Sparse Vector | 用高维稀疏权重表示词项 | 保留词项匹配，也可学习同义扩展 | 索引和模型支持差异较大 |
| Multi-vector | 一份文档保留多组 Token 或区域向量 | 细粒度匹配和复杂文档 | 索引更大，计算更多 |

**DPR** 是典型双编码器。问题和文档分别编码，在线查询只需计算问题向量，再做近邻搜索。**ColBERT** 保留 Token 级表示，通过 Late Interaction 做匹配。它在表达能力和检索成本之间取了另一种平衡，不能简单看成单向量 Embedding 的升级版。

选 Embedding 模型时，要用自己的语言和数据测。重点检查这些条件。

| 条件 | 要检查的内容 |
| --- | --- |
| 语言 | 中文、英文、混合文本和专业缩写能否稳定召回 |
| 任务 | 模型是否区分 Query 与 Document 指令，是否面向检索训练 |
| 输入长度 | 超长 Chunk 会被拒绝、截断，还是悄悄丢掉后半段 |
| 维度 | 维度影响存储、内存、网络和索引速度，维度更高不保证业务效果更好 |
| 相似度 | Cosine、Inner Product 和 L2 要与模型及索引配置一致 |
| 部署 | API 延迟、限流、数据合规和本地推理成本 |
| 版本 | 换模型后需要重建索引，迁移期间要支持双写或双读 |

问题向量和文档向量应由兼容的模型与配置生成。归一化后的向量上，Cosine Similarity 与 Inner Product 的排序可能等价，工程上仍要统一写清距离函数和归一化方式。

## 索引与向量存储

数据量小时，Exact Search 可以逐个计算距离，召回完整但速度会随数据增长。数据量大后常用 Approximate Nearest Neighbor，也就是 ANN。ANN 用一部分召回率换速度和资源。

### HNSW 与 IVFFlat

| 索引 | 工作方式 | 优点 | 代价 |
| --- | --- | --- | --- |
| HNSW | 构建多层近邻图并沿图搜索 | 速度与召回率通常较均衡，增量插入方便 | 建索引慢，占内存较多 |
| IVFFlat | 先聚类，查询时只搜索部分簇 | 结构直观，内存压力相对低 | 需要训练，数据分布变化会影响效果 |
| Flat | 不建近似索引，精确扫描 | 结果可作为召回率基准 | 大规模查询慢 |

pgvector 同时提供精确搜索、HNSW 和 IVFFlat。它适合已经使用 PostgreSQL、数据量和并发可控、希望把业务字段与向量放在一起的系统。专用向量库通常会提供更完整的分片、量化、多向量和过滤能力。Elasticsearch 或 OpenSearch 已经有成熟全文检索时，可以直接在原搜索系统里加入 Dense Vector 和 Hybrid Search，少维护一套数据同步。

| 现状 | 更容易落地的选择 |
| --- | --- |
| 已有 PostgreSQL，规模中小 | pgvector |
| 已有全文搜索和运维体系 | Elasticsearch 或 OpenSearch |
| 向量规模大，需要分布式和多向量 | Milvus、Qdrant、Weaviate 等专用系统 |
| 单机实验或离线评测 | FAISS |

产品名只能帮你缩小范围。最终还要压测过滤后的 P95 延迟、召回率、写入速度、索引重建时间和故障恢复。只测不带过滤的向量查询，容易高估生产性能。

### Metadata Filter 和多租户

Metadata Filter 用结构化字段缩小搜索范围，例如租户、部门、文档类型、生效日期和产品版本。它也承担权限隔离。

过滤可以发生在向量搜索前、搜索过程中或召回后。召回后再删掉无权内容，会浪费候选名额，还可能造成信息泄露。优先使用支持 Filtered ANN 的索引，在检索时带上权限条件。高频过滤字段需要单独建索引。

多租户常见三种隔离方式。小租户可以共享索引并按 `tenant_id` 过滤，重要租户可以使用独立 Collection 或分片，合规要求高时直接使用独立实例。隔离强度越高，资源和运维成本也越高。

## Query Understanding 先把问题变成可检索请求

用户的问题常常过短、带代词、混有多个子问题。直接拿原句做一次向量搜索，系统很难稳定。

| 技术 | 做法 | 适合什么问题 | 风险 |
| --- | --- | --- | --- |
| Query Normalization | 统一拼写、时间、单位和产品别名 | 型号、工单号和业务简称很多 | 规则错误会改变原意 |
| Query Rewrite | 结合对话和业务字段改写成独立问题 | 多轮对话里的“它”“上一版” | 模型可能补入用户没说的条件 |
| Multi-query | 生成多个不同措辞并合并结果 | 表达方式多、单次召回不稳 | 查询量和去重成本增加 |
| Query Decomposition | 把复杂问题拆成多个子问题 | 比较、因果和多跳问题 | 子问题之间要保留依赖关系 |
| HyDE | 先生成一份假想答案文档，再用它的向量检索真实资料 | 零样本 Dense Retrieval 较弱 | 假想文档可能把检索带偏 |
| Query Routing | 判断问题该走文档、SQL、Web、图或哪个知识库 | 数据源很多 | 路由错误会让后面整条链路失效 |
| Self-query | 从自然语言抽取检索词和 Metadata Filter | 日期、地区、部门等条件明确 | 字段枚举和权限必须受控 |

每个问题都调用大模型改写，会增加延迟，也可能损坏精确关键词。工单号、错误码和人名可以先走原始查询。只有检测到代词、多意图或召回不足时，再触发 Rewrite 或 Multi-query。

## Retrieval 决定证据能否进入候选集

### Sparse Retrieval

BM25 是最常见的稀疏检索方法。它依赖词项匹配，并考虑词频、文档频率与长度归一化。错误码、产品型号、人名和法规编号通常更适合 BM25。中文使用 BM25 时，分词器、同义词和领域词典会直接影响结果。

Learned Sparse Retrieval 会让模型学习稀疏词项权重和扩展词。SPLADE 是常见代表。它保留倒排索引的可解释形式，也能补充同义表达，训练与部署比普通 BM25 更复杂。

### Dense Retrieval

Dense Retrieval 用问题向量寻找语义相近的 Chunk。它能处理改写和同义表达。资料里有大量编号、短代码和专有词时，单独使用 Dense Retrieval 容易漏掉精确匹配。

![问题向量召回 Top-K](/images/ai/rag-topk-retrieval.svg)

### Hybrid Search

Hybrid Search 同时运行 Sparse 和 Dense Retrieval，再把两路结果合并。常见融合方案包括加权分数和 Reciprocal Rank Fusion，也就是 RRF。

两路分数的尺度往往不同。直接相加需要先校准分数，权重还会随数据变化。RRF 根据每份结果中的名次计算融合分，不依赖原始分数尺度，通常更容易建立可靠基线。业务上可以让 BM25 保住编号和关键词，让 Dense Retrieval 找到语义相近的表达。

### 分层、图和外部检索

| 方案 | 适用的问题 | 主要成本 |
| --- | --- | --- |
| Parent-Child Retrieval | 小块命中后需要完整章节 | 回表、扩展和去重 |
| Summary Index | 用户常问整篇文档主题或概览 | 摘要可能丢细节 |
| RAPTOR | 需要跨层级总结和多跳证据 | 递归摘要与树索引成本 |
| Knowledge Graph Retrieval | 实体关系明确，需要沿关系查询 | 实体消歧、图构建和更新 |
| GraphRAG | 需要理解语料中的全局主题、社区和关系 | LLM 抽取与社区摘要成本较高 |
| Web Search | 内部资料缺失，需要公开的最新信息 | 来源质量、合规和结果稳定性 |
| SQL 或 API Retrieval | 答案来自实时结构化数据 | Schema、权限和查询安全 |

GraphRAG 会从文本中抽取实体、关系和声明，再生成社区报告。它的 Global Search 适合回答整个语料的主题和趋势，Local Search 更适合围绕具体实体展开。普通文档问答没有关系推理和全局总结需求时，混合检索通常更便宜。

## Rerank 把粗召回变成可用证据

召回阶段追求别漏，Rerank 负责把最相关的候选排到前面。常见做法是先召回几十条，再精排到几条或十几条。

| Rerank 方案 | 工作方式 | 适用情况 | 代价 |
| --- | --- | --- | --- |
| 规则重排 | 按来源、时间、权限、标题命中等加权 | 业务规则清楚 | 难处理复杂语义 |
| Cross-encoder | 把 Query 与每个候选一起编码并打分 | 通用精排，效果通常稳定 | 候选越多，延迟越高 |
| LLM Rerank | 让生成模型比较候选与问题 | 复杂标准和少量候选 | 成本高，输出要结构化约束 |
| Late Interaction | 保留 Token 级向量后计算细粒度匹配 | 需要更强召回与精排能力 | 存储和计算压力更大 |

Reranker 的分数只在当前模型和查询内有意义，不宜拿一个固定阈值套所有领域。需要拒答时，可以把检索分数、Rerank 分数、证据覆盖度和分类器结果组合起来，再在评测集上校准阈值。

MMR 也常出现在这一层。它在相关性和结果多样性之间取平衡，能减少多个候选都来自同一段。文档级去重、相邻 Chunk 合并和来源配额也有相似作用。

## Context Assembly 控制模型最后看到什么

检索返回的 Chunk 不能直接无脑拼接。Context Assembly 通常要完成去重、扩展、压缩、排序和预算控制。

| 操作 | 目的 |
| --- | --- |
| Neighbor Expansion | 命中小块后补前后段，恢复局部语境 |
| Parent Expansion | 从命中子块回到父章节 |
| Contextual Compression | 只提取和问题相关的句子，减少无关内容 |
| Deduplication | 合并重叠 Chunk 和相同来源 |
| Diversity Control | 避免一个文档占满全部位置 |
| Token Budget | 给系统提示、对话、证据和回答预留固定预算 |
| Evidence Ordering | 把高价值证据放在模型更容易利用的位置 |

上下文越多，包含答案的概率可能上升，无关内容也会干扰生成。Top-K 应当拆成候选数和最终注入数。比如 Sparse 与 Dense 各召回一批，融合后交给 Reranker，最终只注入能覆盖问题的少量证据。具体数字要靠评测确定。

## Generation、Grounding 与 Citation

生成层负责把证据组织成答案。Prompt 至少要说明证据边界、无答案时的处理、引用格式和冲突处理。它无法修复缺失的召回结果，也不能替代权限控制。

可靠的 Citation 需要在索引阶段保留来源定位。答案中的引用应当指向确实支持该句的 Chunk，并能打开原文对应版本。只列一个文件名，读者很难核验。比较稳妥的定位信息包括文档 ID、版本、页码、章节路径、原文片段和可访问链接。

检索到资料也会产生幻觉，常见原因有三种。

| 问题 | 表现 | 处理办法 |
| --- | --- | --- |
| Retrieval Miss | 正确证据没进候选集 | 改解析、Chunk、查询改写、Hybrid Search 或扩大候选 |
| Context Noise | 正确证据被无关内容淹没 | Rerank、去重、压缩和调整上下文预算 |
| Generation Error | 证据正确，模型仍然读错或补写 | 收紧任务、结构化输出、引用校验或换模型 |

拒答也是系统能力。知识库没有答案、证据互相冲突、资料已经过期或用户没有权限时，系统应当给出明确状态。它可以返回“未找到足够证据”，也可以转人工或调用其他数据源。

## 常见高级 RAG 方案

这些名字有些是论文方法，有些已经变成工程模式。理解它们解决的问题，比记住名字更有用。

| 名称 | 解决什么问题 | 核心做法 | 使用前要确认 |
| --- | --- | --- | --- |
| Naive RAG | 建立最小可用链路 | 固定切块、Dense Top-K、拼接生成 | 适合作基线，生产能力不足 |
| Advanced RAG | 提升召回和生成质量 | Hybrid Search、Rewrite、Rerank、Compression | 每个步骤都要通过消融评测证明价值 |
| Modular RAG | 让组件按任务组合 | Router、多个 Retriever、可替换模块 | 编排和可观测性会变复杂 |
| Agentic RAG | 处理多步检索和动态数据源 | Agent 规划查询、选择工具、迭代取证 | 延迟、成本和失败路径要设上限 |
| Self-RAG | 学习何时检索并反思结果 | 用 Reflection Token 训练模型判断检索与生成质量 | 原论文包含训练方法，普通 Prompt 自检不等同于 Self-RAG |
| CRAG | 召回质量差时主动纠正 | 检索评估器判断结果，再触发外部检索和内容过滤 | 评估器也会误判，外部来源需要治理 |
| GraphRAG | 处理跨文档关系和全局问题 | 抽取实体关系、社区检测、社区摘要与图查询 | 索引费用、更新速度和实体消歧 |
| RAPTOR | 兼顾细节和高层摘要 | 递归聚类并生成树状摘要 | 摘要质量和索引重建成本 |
| Contextual Retrieval | 补回 Chunk 离开全文后丢失的信息 | 给 Chunk 生成短上下文，再建 Dense 和 BM25 索引 | 建索引成本与上下文生成质量 |
| Late Chunking | 让 Chunk 向量看到更长的全文语境 | 先编码长文，再按 Chunk 范围池化 | 模型接口和最大输入长度 |
| Multimodal RAG | 检索图表、页面和图片信息 | OCR、视觉 Embedding、多向量或跨模态检索 | 引用定位、存储和视觉模型成本 |

Agentic RAG 很适合“先查制度，再查用户状态，最后计算结果”这类任务。它需要设置最大检索轮数、总 Token、工具白名单和停止条件。循环次数增加不保证答案更好，错误的第一步规划还会一路放大。

## 按场景组合方案

技术索引最终要能帮助选型。下面是常见场景的起始组合，落地时仍要用自己的数据评测。

| 场景 | 建议从哪里开始 | 重点风险 | 首要评测 |
| --- | --- | --- | --- |
| 企业制度与内部知识库 | 结构化切块、BM25 加 Dense、RRF、Rerank、ACL Filter、引用 | 权限泄露、旧版本、同名制度冲突 | Recall@K、引用准确率、越权测试 |
| 客服和售后助手 | 产品与版本过滤、错误码 BM25、Dense 语义召回、拒答和转人工 | 过期话术、把相似产品混在一起 | 问题解决率、错误回答率、转人工准确率 |
| 技术文档和代码库 | 按符号与章节切块、BM25、代码 Embedding、Parent-Child | API 版本错配、调用关系断裂 | 符号命中率、版本正确率、可运行性 |
| 合同和长报告 | Layout Parser、OCR、条款与表格结构、Parent-Child、Rerank | 页码错位、表格丢关系、跨章节证据缺失 | 页级 Recall、字段准确率、引用定位 |
| 研究归纳和多跳问题 | Query Decomposition、分层检索、GraphRAG 或 Agentic RAG | 推理链过长、来源质量不一、成本失控 | 证据覆盖率、多跳完整率、单题成本 |
| 商品和内容搜索 | Hybrid Search、属性过滤、个性化排序 | 库存与价格实时性、排序目标漂移 | nDCG、转化指标、P95 延迟 |
| 实时业务查询 | Router、SQL 或 API Tool、RAG 补业务说明 | 让向量库承担实时事实查询 | 数据正确率、时效、权限测试 |

场景会决定检索目标。企业制度问答关心权威版本，商品搜索可能更关心排序和转化，合同分析需要页码与字段准确。只用一套通用“问答准确率”，看不出系统能不能上线。

## 评测要拆开看

端到端答案错了，可能是解析、召回、重排或生成中的任何一层。评测也要按层拆开。

### 先做评测集

每条样本至少包含用户问题、允许访问的数据范围、相关证据和期望答案。问题要来自真实日志或业务人员，也可以基于文档生成候选题，再由人审核。评测集应当覆盖精确词、语义改写、多跳、无答案、冲突资料、旧版本和越权请求。

随机从知识库生成一批简单问答，通常只能证明系统会找明显答案。生产问题里的简称、错别字、对话省略和错误前提更能暴露问题。

### 检索指标

| 指标 | 怎么理解 | 适合看什么 |
| --- | --- | --- |
| Hit Rate@K | 前 K 个结果里有没有至少一个正确证据 | 单证据问答能否召回 |
| Recall@K | 所有相关证据中有多少进入前 K | 多证据和多跳问题 |
| Precision@K | 前 K 个结果里有多少确实相关 | 候选噪声 |
| MRR | 第一个正确结果排得多靠前 | 需要快速找到单一答案的任务 |
| nDCG | 同时考虑相关程度和排序位置 | 有多级相关性标签的搜索 |

ANN 索引还要测相对 Exact Search 的 Recall。换 HNSW 参数后查询更快，不代表业务检索更准。索引召回率和业务相关性要分开记录。

### 生成与引用指标

| 指标 | 要回答的问题 |
| --- | --- |
| Faithfulness | 回答中的事实能否由给定证据支持 |
| Answer Correctness | 回答是否覆盖标准答案中的关键信息 |
| Answer Relevance | 回答是否回应用户的问题 |
| Citation Precision | 给出的引用中有多少真的支持对应陈述 |
| Citation Recall | 需要引用的陈述中有多少附上了支持来源 |
| Abstention Accuracy | 没有足够证据时，系统能否正确拒答 |

RAGAS、ARES 等框架可以用模型辅助评分。LLM-as-a-Judge 适合提高评测覆盖率，不能完全替代人工抽检。评分 Prompt、Judge 模型和版本都要固定，先用一批人工标注样本校准它的偏差。

### 系统指标

线上还要记录端到端 P50 与 P95 延迟、各阶段耗时、Token、模型费用、缓存命中率、索引新鲜度、失败率和越权拦截。质量提升如果换来不可接受的延迟，方案仍然需要调整。

做优化时一次改一个主要变量。固定评测集，分别比较 Chunk、Embedding、Hybrid Search、Rerank 和 Top-K。多个组件一起换，指标变好以后也不知道是哪一步起作用。

## 生产系统还要补什么

### 可观测性

每次请求最好留下完整 Trace。至少记录原始问题、改写问题、路由结果、过滤条件、候选 Chunk、各阶段分数、最终 Context、模型与 Prompt 版本、答案、引用、延迟和 Token。用户反馈可以关联到 Trace，不能直接当成真值。

日志里可能包含用户问题和内部资料。采集前要做脱敏、权限与保留周期设计。调试便利不能越过数据边界。

### 更新、删除和缓存

文档更新要能触发解析、切块和索引的增量任务。任务应当幂等，失败后能重试，同一版本不能重复写入。删除请求需要清理原文件、解析产物、向量、全文索引和缓存。

查询缓存要把租户、权限、知识库版本和模型版本放进 Cache Key。只按问题文本缓存答案，很容易把旧答案或别人的资料返回给当前用户。

### 安全

RAG 会把外部内容送进模型，文档中的恶意指令可能形成 Indirect Prompt Injection。系统应当把资料当作数据，限制它改变系统规则、调用工具或泄露其他上下文。高风险场景还要做来源白名单、内容扫描、输出校验和工具权限隔离。

权限测试要覆盖正常用户、跨部门用户、管理员、旧会话和权限刚被撤销的用户。检索结果、引用链接和缓存都要遵守同一套授权规则。

## 一条比较稳的演进顺序

第一个版本可以使用结构化切块、BM25 与 Dense Hybrid Search、RRF、基础 Metadata Filter 和来源引用。先做一小批人工审核的评测题，保存每次检索结果。

召回不足时，再按失败类型加 Query Rewrite、Rerank、Parent-Child 或 Contextual Retrieval。长报告的全局问题可以试 RAPTOR，关系密集的跨文档问题再评估 GraphRAG。需要动态选择数据源和多步取证时，才把 Agentic RAG 接进来。

这条顺序有一个好处。每加一层都能看到它解决了哪些失败样本，又增加了多少延迟和维护成本。RAG 系统很容易堆满组件，评测能让它保持可解释。

## 继续看实战

[企业内部知识库的 RAG 落地记录](/ai/rag-knowledge-base-component/) 展开了一条具体落地路线，包括文件版本、权限过滤、混合检索、引用溯源、离线评测、异步索引和生产部署。阅读时可以用本文的选型框架继续追问。

| 实战里的选择 | 可以继续验证的方向 |
| --- | --- |
| pgvector | 数据增长后比较 HNSW 参数、过滤性能和专用向量库 |
| 固定检索加分数截断 | 加入 BM25、RRF 与 Rerank，比较 Recall@K |
| 文件解析 | 补 Layout Parser、OCR、表格和解析质量评测 |
| `asyncio.create_task` | 换成任务队列，补幂等、重试和状态恢复 |
| 权限模型已设计但查询未启用 | 把 ACL Filter 接进检索，并做越权测试 |

## 维护记录

| 时间 | 更新内容 |
| --- | --- |
| 2026-08 | 重写技术全景，补充解析、Chunking、Hybrid Search、Rerank、评测、权限、GraphRAG、RAPTOR、Agentic RAG 与 Multimodal RAG |
| 2026-02 | 初版，介绍切块、Embedding、Top-K 和 Prompt 组装 |

## 主要资料

- [RAG 原始论文](https://papers.nips.cc/paper_files/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html)
- [Dense Passage Retrieval 论文](https://aclanthology.org/2020.emnlp-main.550/)
- [ColBERT 论文](https://arxiv.org/abs/2004.12832)
- [HyDE 论文](https://aclanthology.org/2023.acl-long.99/)
- [RAPTOR 论文](https://proceedings.iclr.cc/paper_files/paper/2024/hash/8a2acd174940dbca361a6398a4f9df91-Abstract-Conference.html)
- [Self-RAG 论文](https://proceedings.iclr.cc/paper_files/paper/2024/hash/25f7be9694d7b32d5cc670927b8091e1-Abstract-Conference.html)
- [Corrective RAG 论文](https://arxiv.org/abs/2401.15884)
- [Late Chunking 论文](https://arxiv.org/abs/2409.04701)
- [ColPali 论文](https://openreview.net/forum?id=ogjBpZ8uSi)
- [Microsoft GraphRAG 文档](https://microsoft.github.io/graphrag/)
- [Contextual Retrieval 说明](https://www.anthropic.com/engineering/contextual-retrieval)
- [Elasticsearch Hybrid Search 文档](https://www.elastic.co/docs/solutions/search/hybrid-search)
- [pgvector 索引文档](https://github.com/pgvector/pgvector#hnsw)
- [Qdrant Filter 文档](https://qdrant.tech/documentation/search/filtering/)
- [Cohere Rerank 文档](https://docs.cohere.com/v2/docs/rerank-overview)
- [RAGAS 论文](https://aclanthology.org/2024.eacl-demo.16/)
- [Lost in the Middle 论文](https://aclanthology.org/2024.tacl-1.9/)
