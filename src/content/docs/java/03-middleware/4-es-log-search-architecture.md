---
title: "日志与全文搜索怎么选：Elasticsearch、Loki、ClickHouse"
description: "按查询需求选日志存储，再用 Mapping、Filter、生命周期和查询限制控制 Elasticsearch 成本。"
sidebar:
  order: 4
date: 2025-12-17
lastUpdated: 2026-10-11
---

需要任意关键词检索、相关性排序或高亮，可以评估 Elasticsearch；主要按服务、时间查日志，可以评估 Loki；结构化日志的统计聚合，可以评估 ClickHouse。选择依据是查询需求、保留周期和运维成本，不能直接认定换一种引擎就更便宜。

例如这条日志，要先决定以后怎么查它：

```json
{ "timestamp": "2026-03-11", "level": "ERROR", "message": "User 9527 login failed due to timeout." }
```

只查“某服务 10 分钟内的错误”，与搜索所有日志里的任意词，需要的索引不同。给不参与查询的字段少建索引，往往比先换数据库更直接。

## 先选查询能力

| 方案 | 适合优先评估的需求 | 要付出的代价 |
| --- | --- | --- |
| Elasticsearch | 全文搜索、排序、高亮、多字段查询 | Mapping、索引与副本影响存储和写入成本；容量规划和集群维护 |
| Loki | 先按低基数标签缩小范围，再查日志正文 | 正文查询可能扫描大量数据；避免把 userId 等高基数字段随意做标签 |
| ClickHouse | 结构化日志过滤、统计聚合 | 表设计、导入、保留策略和集群维护；按实际版本核对所需搜索能力 |

[Loki](https://grafana.com/docs/loki/latest/) 主要索引标签，正文可保存在对象存储中。它仍能搜索正文，但查询成本受标签范围和扫描量影响。ClickHouse 的日志用法见 [官方可观测性指南](https://clickhouse.com/docs/use-cases/observability/introduction)。

## Elasticsearch 的三个常用调整

### 1. 不算相关性分数的条件放 filter

```json
{
  "query": {
    "bool": {
      "must": [ { "match": { "title": "最新款 手机" } } ],
      "filter": [ { "term": { "status": "UP" } } ]
    }
  }
}
```

示例中 `title` 是 text，`status` 是 keyword。`must` 中的全文条件参与相关性评分，`filter` 只判断匹配。不能承诺每个 filter 都缓存或“速度翻数倍”；例如 term query 不进入 node query cache，缓存还受使用频率、segment 等条件影响。[查询上下文](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-filter-context)、[缓存条件](https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-query-cache-settings)

### 2. 先定保留策略，再考虑 force merge

| 动作 | 何时考虑 | 边界 |
| --- | --- | --- |
| 生命周期策略 | 定期 rollover、迁移或删除时序数据 | 热温冷层按查询需求配置；云与 Serverless 产品支持方式不同 |
| Force merge | 索引已经停止写入，并有明确收益 | 消耗 I/O 与额外磁盘；不要给仍在写入的索引无条件执行 |
| 合并为一个 segment | 只读索引的特定优化场景 | 可需要约三倍分片磁盘空间，也可能造成过大的 segment，先小规模验证 |

`_forcemerge?max_num_segments=1` 是有成本的操作，不是每天必须跑的维护命令。[Force merge 官方限制](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge)

### 3. 给宽泛的通配符查询加边界

`*phone*` 这类前导通配符可能很贵。先限制时间、租户、索引范围和输入长度，再按需求比较合适的 wildcard 字段或 n-gram 方案。n-gram 会增加索引体积，不能一概作为更快的替代。[Wildcard query 文档](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-wildcard-query)

## 上线前比较什么

用相同日志量、保留时间和代表性查询，对比写入吞吐、查询 P95/P99、存储与副本体积、故障恢复和运维费用。日志检索和业务搜索可以分别选型，也可以继续共用；先有测试结果，再决定拆分。
