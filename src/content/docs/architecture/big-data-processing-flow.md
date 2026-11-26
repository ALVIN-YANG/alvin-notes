---
title: "从一笔订单到一次推荐：图解大数据处理全流程"
description: "用电商订单和行为日志串起采集、存储、计算、治理与数据服务，并讲清 Hadoop、数仓、数据湖和数据中台的分工。"
date: 2026-11-25
lastUpdated: 2026-11-26
verifiedAgainst: "Apache Hadoop 3.3.5、Spark 4.3.0、Flink 2.3 文档及两条指定参考视频，2026-11-26"
sidebar:
  label: 大数据处理全流程图解
---

当单机的容量、吞吐、延迟或可靠性无法满足需求时，大数据系统通过分布式存储与计算扩展处理能力，再通过治理和服务化把结果可靠地交给业务。因此，数据库、数据仓库、数据湖、Hadoop、Spark、Flink 和数据中台并不是同一层面的替代关系，而是在不同位置解决不同问题。

可以用一家电商的三个日常场景理解这条链路：

```text
白天：用户下单写入业务数据库，点击、停留和滑动形成持续事件流。
凌晨：ETL 同步数据，批量任务生成用户标签、销售指标和订单宽表。
再次打开 App：推荐 API 读取在线画像，BI 调用指标服务，营销系统筛选目标用户。
```

<div class="article-diagram-scroll" role="region" aria-label="大数据处理总览，窄屏可横向滚动" tabindex="0">

![大数据从产生到业务价值的完整流程，以及离线和实时两条链路](/images/architecture/big-data-processing-flow/01-overview.svg)

</div>

本文参考两条指定视频：[Hadoop、HDFS、Spark、Flink、Hive、HBase 的关系](https://www.bilibili.com/video/BV14CTLz9EEj)和[数据库、数仓、数据湖、数据中台的底层原理](https://www.bilibili.com/video/BV12qKq6PETb)。商城数字均为故事设定；涉及默认值、性能和适用边界时，以官方文档作校正。

## 1. 为什么有了 MySQL，还需要大数据体系

故事从一家线上水果店开始。每天只有几十笔订单时，Excel 能记录、求和和排序；订单增长后，多人同时编辑、可靠备份和随时查询都成了问题。数据库把数据组织成表，用行表示一条完整记录、用列表示一个属性，并通过 SQL、并发控制和备份机制支撑多人使用。MySQL、Oracle、PostgreSQL 都承担这类数据管理职责。

用户下单、修改地址、更新库存，通常只操作少量完整记录。**行式存储**把一条记录的字段相邻保存，适合这种在线增删改查。反过来，统计每天销售额要扫描大量订单，却只关心金额等少数列。若直接在业务数据库执行重型统计，CPU、内存和 I/O 被分析任务占用，正常下单也可能变慢。

数据仓库由此独立出来。它面向分析主题组织经过清洗的数据，常采用**列式存储**：把同一列的数据放在一起，聚合时减少无关字段读取。业务库与数仓的首要区别是工作负载、数据组织方式和服务目标；列式存储只是很多分析型系统采用的优化方式，不是数据仓库的定义条件。交易要求快、准、稳，分析要求扫描广、聚合清楚；把两者拆开，不是淘汰数据库，而是让它们各司其职。

<div class="article-diagram-scroll" role="region" aria-label="业务数据库与数据仓库对比，窄屏可横向滚动" tabindex="0">

![从 Excel 到数据库和数据仓库，以及行式与列式存储的区别](/images/architecture/big-data-processing-flow/02-database-to-warehouse.svg)

</div>

当数据继续增长到 TB、PB 级，并且快速产生大量日志、图片、评论和录音时，仅靠一台机器保存或计算会变得困难。Hadoop 的切入点是把应用与海量数据之间的复杂细节封装起来：应用通过 API 读写，底层由分布式组件完成存储、计算与资源协调。

不能把“几百 GB”“TB 或 PB”当成所有系统的固定分界线，真正的边界取决于硬件、数据模型、查询方式、并发和服务目标。如果只读副本、物化视图或现有数据库已经能满足报表需求，就没有必要提前引入完整的大数据平台。

## 2. 数据怎样进入平台：采集、ETL 与主题宽表

数据来源至少有两类节奏。订单、用户和支付记录已经在业务数据库中，可以按计划批量同步；点击、停留和滑动则持续发生，更适合通过消息队列或事件日志接入。评论、图片和音频也应按保留策略保存下来，因为它们可能在未来的推荐或模型训练中产生价值。

经典批量流程叫 **ETL**，即抽取、转换、加载：

1. **抽取 Extract**：通过数据库标准查询接口全量或增量取数，也可以通过 CDC 捕获变更，或接入其他数据来源。
2. **转换 Transform**：统一日期格式，删除重复订单，按业务语义处理缺失值。只有含义明确的字段才补默认值；手机号等身份字段应标记缺失、进入质量队列或等待补全，不能随意编造。
3. **加载 Load**：写入数据湖或数据仓库，按分析主题和层次组织。可以直接转换后入仓，也可以先加载原始区再转换，即 ELT；不必原样复制业务库的所有表。

数仓底层仍可保留订单、商品等规范维度表；面向日常分析时，再提前加工成主题宽表。销售宽表可以把订单、支付、商品和物流数据拼在一起，包含订单号、商品名、单价、数量、支付金额、发货时间等常用字段。这样统计商品销售额时，不必每次临时完成多表关联。

<div class="article-diagram-scroll" role="region" aria-label="ETL 与主题宽表，窄屏可横向滚动" tabindex="0">

![ETL 的抽取、转换、加载流程，以及销售主题宽表](/images/architecture/big-data-processing-flow/03-etl.svg)

</div>

## 3. 数据存在哪里：数据库、数仓、数据湖与湖仓一体

数据库保存当前业务状态，数据仓库保存规范化、面向分析的数据，并不适合原样承载各种非结构化数据。数据湖则解决另一类问题：大量原始数据暂时没有明确用途，若必须先建模才能入库，评论等历史数据可能因“当下没用”而被丢弃。数据湖允许结构化、半结构化和非结构化数据先原样保存，需要分析时再解析，常被称为“先存储、后处理”或读取时解析。

低成本保存不等于可以放任不管。若运营和市场各自留下同名文件，半年后没人知道内容、来源和负责人，空间会被无人敢删的数据占据，数据湖就会变成**数据沼泽**。因此，数据湖还需要数据接入、元数据管理、数据目录、分类标签和细粒度权限。原始数据也不等于必须永久保存，保留周期、脱敏和删除规则都应纳入治理。

**湖仓一体**尝试把数据湖的灵活性与数仓的分析能力打通，强调统一的开放表格式、元数据和计算访问方式。原始数据可以统一入湖再清洗，冷热分层可以只改变存储策略，不一定要把热数据复制到另一套数仓。故事里的近三个月订单可以提高存储与查询等级，更久的历史数据则低成本归档；如果采用湖仓分设的组合架构，也可以通过联合计算减少重复搬运。[Delta Lake](https://docs.delta.io/latest/delta-intro.html)、[Apache Iceberg](https://iceberg.apache.org/docs/latest/) 是常见的开放表格式实现，不应简单称为计算引擎。

<div class="article-diagram-scroll" role="region" aria-label="数据库、数仓、数据湖与湖仓一体，窄屏可横向滚动" tabindex="0">

![数据库、数据仓库、数据湖、湖仓一体的分工与冷热分层](/images/architecture/big-data-processing-flow/04-storage.svg)

</div>

HDFS 是数据湖早期常见的底层存储之一。如今云对象存储也很常见，因为它提供弹性扩容并减少自建集群运维。但“上云一定更便宜”仍然不是普遍结论，需要结合访问量、出口流量、合规与已有设施计算。

## 4. HDFS 怎样把大文件存到许多机器上

HDFS 的全名是 Hadoop Distributed File System。它把大文件切成数据块 Block，分散保存到多台 DataNode，并用副本应对机器故障。以常见的 128 MiB 块和 3 副本为例；[HDFS 官方架构文档](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html)明确说明，块大小和副本数都可以配置，不能把它们当成不可变的规则。

NameNode 管理文件系统命名空间，记录文件的块位于哪些 DataNode。客户端读写时先向 NameNode 查询位置，再直接与相应 DataNode 传输数据，文件内容不经过 NameNode。DataNode 失效时，客户端可以读取其他副本，NameNode 也会根据心跳和块报告安排再复制。NameNode 自身故障则属于另一个问题，需要专门配置 [HA 与故障转移](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HDFSHighAvailabilityWithQJM.html)，不是数据副本机制自动解决的。

<div class="article-diagram-scroll" role="region" aria-label="HDFS 分布式存储，窄屏可横向滚动" tabindex="0">

![HDFS 的 Block、副本、NameNode、DataNode 与读取流程](/images/architecture/big-data-processing-flow/05-hdfs.svg)

</div>

HDFS 本质仍是分布式文件系统。它有文件系统权限，但文件权限不等于完整的数据目录、业务元数据和质量治理。数据湖需要在存储底座上补足这些能力。

## 5. 数据怎样计算：从 MapReduce 到 Spark 与 Flink

### 先把大任务拆成可以并行的小任务

假设订单文件有 1.28 TB，把它全部拉进一台机器的内存并不现实。MapReduce 将输入切成分片 Split，让多台机器并行处理。用户通过 Map 函数说明每条记录怎样提取和局部计算，再通过 Reduce 函数说明局部结果怎样汇总。分片、任务执行和结果聚合具有通用性，于是被抽象为通用计算框架。

例如按商品统计销售额，Map 输出“商品—金额”，Shuffle 将相同商品归到一起，Reduce 求和得到最终结果。同样的方法也能按用户性别等维度统计消费金额。经典 MapReduce 的中间结果频繁写磁盘，I/O 开销使其更适合不强调秒级延迟的离线任务。

<div class="article-diagram-scroll" role="region" aria-label="MapReduce 销售统计，窄屏可横向滚动" tabindex="0">

![用商品销售额演示 Map、Shuffle 和 Reduce 的完整计算过程](/images/architecture/big-data-processing-flow/06-mapreduce.svg)

</div>

### Hive 让分析人员写 SQL，YARN 负责集群资源

如果每次统计都要求产品、运营或 BI 人员手写 Map 和 Reduce，使用门槛会很高。[Hive](https://cwiki.apache.org/confluence/display/Hive/Tutorial) 在 SQL 与底层计算之间增加工具层，把类似 SQL 的查询解析成 MapReduce 等任务。通过 Hive on Spark，也可以让 Hive 查询转为 Spark 任务；Spark SQL 则提供与 Spark 原生集成的 SQL 入口。

任务拆出来以后，还要回答“在哪台机器运行、能使用多少 CPU 和内存”。[YARN](https://hadoop.apache.org/docs/stable/hadoop-yarn/hadoop-yarn-site/YARN.html) 的全名是 Yet Another Resource Negotiator，负责集群资源管理与协调。Container 是包含 CPU、内存等资源的抽象和运行单元，不应简单等同 JVM，更不是 Docker 容器。YARN 与 Kubernetes 都涉及资源管理，但面向的抽象与生态不同。

至此，HDFS 解决存储、MapReduce 解决计算、YARN 解决资源管理，三者共同构成 Hadoop 的核心处理框架。

<div class="article-diagram-scroll" role="region" aria-label="Hive 与 YARN 分层关系，窄屏可横向滚动" tabindex="0">

![Hive SQL、计算框架与 YARN 资源管理的分层关系](/images/architecture/big-data-processing-flow/07-hive-yarn.svg)

</div>

### Spark 优化批量计算，Flink 处理持续事件，HBase 服务在线读写

[Spark](https://spark.apache.org/docs/latest/) 的重要优化是更充分地利用内存保存和复用中间结果，内存不足时仍会溢写磁盘。它常见于离线批量计算，也提供 Structured Streaming 等流处理能力，因此不能简单概括为“只能离线”。下面重点比较经典 MapReduce 批处理与 Spark 的批量计算优化。

[Flink](https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/) 面向有状态、及时的流处理。点击流和交易流持续到达时，它可以持续更新实时画像与销售指标，服务实时大屏等场景。可以把它理解为事件持续到达、持续处理；实际系统还会结合窗口、状态、检查点和背压等机制。

实时计算不等于在线查询。Flink 负责处理数据，[HBase](https://hbase.apache.org/book.html) 则面向海量数据上的高并发随机读写，可支撑低延迟在线查询。Hive 面向分析任务，不适合作为高并发毫秒级点查服务。MongoDB 则是文档数据库，解决数据模型与访问模式问题，不是这条链路中必须替换 MySQL 的一环。

<div class="article-diagram-scroll" role="region" aria-label="批处理、流处理与在线读写，窄屏可横向滚动" tabindex="0">

![MapReduce、Spark、Flink 和 HBase 分别适合的处理路径](/images/architecture/big-data-processing-flow/08-compute-serving.svg)

</div>

## 6. “管”到底管什么：按时运行，更要可信可用

完整平台需要两类调度协同。[Airflow](https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html) 等任务调度工具负责时间触发和任务依赖，例如原始数据尚未同步成功时，不应直接生成销售指标；YARN 等资源管理层负责给任务分配 CPU、内存等运行资源。一个回答“何时运行、谁先谁后”，另一个回答“用什么资源运行”。

数据治理则覆盖更广：元数据回答“有什么、在哪里、什么意思”，数据目录负责分类和查找，质量管理统一指标口径并监控重复、缺失和异常值，权限管理控制访问范围。缺少这些能力，技术任务即使都能运行，也可能出现数据孤岛、同名文件难辨、垃圾数据不敢删、同一指标在不同部门结果不同等问题。

生产链路还需要幂等、检查点和可重放能力。任务重跑应按数据分区和业务日期确定影响范围，避免全量覆盖；迟到和重复事件要有明确处理规则，否则“任务成功”也不等于结果正确。历史口径变化后的回填同样需要版本和依赖管理。

<div class="article-diagram-scroll" role="region" aria-label="任务调度与数据治理，窄屏可横向滚动" tabindex="0">

![任务调度、YARN 资源管理、元数据、质量和权限的分工](/images/architecture/big-data-processing-flow/09-governance.svg)

</div>

## 7. “用”如何落地：从业务应用到数据中台

基础应用包括 BI 报表和经营大屏，帮助管理者理解销售、留存等经营情况；高级应用包括推荐系统和风控系统，分别用于匹配用户可能喜欢的商品、识别欺诈交易。数据只有进入这些业务动作，才算完成从保存到价值输出的路径。

企业规模扩大后，问题常常不再是“有没有 Spark”，而是各部门重复拉数、重复清洗、重复开发用户标签。数据中台是一种应对方式。**它不是某一项技术，而是一套数据资产化和服务化的管理体系**：把常用用户标签、商品指标、订单模型加工成标准资产，再封装成 API，让业务系统直接调用。

数据中台也不是企业发展的必经阶段。只有当指标分歧、重复开发和跨部门复用的成本已经高于标准治理与平台维护成本时，才值得投入。需求较少时，统一指标文档、共享数据集或语义层可能已经足够。

在这个营销示例中，市场部不再自行拉数并计算标签，而是调用用户标签 API，筛选近 30 天浏览过运动鞋但未下单的用户，定向推送优惠券。“原本一周的需求一小时完成”“转化率提升 30%”用于说明复用价值，不是所有项目都能承诺的效果。

<div class="article-diagram-scroll" role="region" aria-label="数据中台与业务应用，窄屏可横向滚动" tabindex="0">

![数据中台如何把部门重复建设变成标准资产和可复用 API](/images/architecture/big-data-processing-flow/10-data-platform.svg)

</div>

## 8. 把全部概念串起来：一家电商的八个场景

下面用一个电商案例串起全部概念。凌晨两点、三点、48 个任务、三年历史数据等都是故事设定，用来帮助记住处理顺序，不是实施标准。

1. **用户下单**：订单写入 MySQL，在线交易以毫秒级响应为目标。
2. **离线数据同步**：凌晨两点，ETL 工具批量抽取当天订单、用户和支付数据，写入数据湖保存原始与历史数据。
3. **数据中台离线加工**：凌晨三点，调度平台编排故事中的 48 个任务，从湖中读取原始数据，更新全量用户标签、计算商品销售指标、生成订单宽表，并将分析结果写入数仓。
4. **离线分析**：早上八点，BI 工具调用数据中台的销售指标 API，生成前一天的销售和用户留存报表，推送给管理者。
5. **实时计算**：用户点击、停留和滑动先进入消息队列或事件日志，Flink 消费事件流并更新实时画像与销售数据；原始事件和计算结果再按需要写入湖仓。
6. **在线推荐**：实时画像写入 HBase、Redis 等在线服务存储。用户再次打开 App 时，推荐 API 读取在线画像并结合最近浏览行为推荐商品。
7. **精准营销**：营销系统调用用户标签 API，筛选近 30 天浏览过运动鞋但未下单的人，定向发放优惠券。
8. **长期挖掘**：数据科学家读取过去三年的交易与行为数据，结合中台标准资产，训练新的推荐算法和销售预测模型，服务转化与库存周转目标。

<div class="article-diagram-scroll" role="region" aria-label="电商完整数据链路，窄屏可横向滚动" tabindex="0">

![在线交易、离线加工、实时计算、推荐、营销和长期模型训练组成的完整闭环](/images/architecture/big-data-processing-flow/11-end-to-end.svg)

</div>

这条链路上，数据库负责当下在线交易，数据湖保留原始和历史数据，数据仓库支撑规范分析，大数据技术体系负责从海量数据中提炼价值，数据中台再把价值封装成可复用的服务。理解这一层分工，比背下任何一张“全家桶”名单都更重要。
