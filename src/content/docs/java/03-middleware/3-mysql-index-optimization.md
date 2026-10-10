---
title: "MySQL 深分页怎么优化：延迟关联与游标分页"
description: "大 offset 仍要跳过前面的记录。用覆盖索引减少回表，用复合游标避开 offset，并用执行计划验证收益。"
sidebar:
  order: 3
date: 2025-12-11
lastUpdated: 2026-10-11
---

`LIMIT 1000000, 10` 需要找到并跳过前面的记录，不能直接按页码跳到第 100 万行。必须跳页时，可以先用覆盖索引找 ID，再取完整数据；连续翻页时，优先用游标。

延迟关联减少回表，**仍然要扫描 offset**；游标避开 offset，却不能直接跳到任意页。实际收益取决于索引和执行计划，没有通用的“秒变毫秒”保证。

## 同一份订单列表，怎么改 SQL

假设按创建时间倒序展示订单，`id` 用于打破时间相同的并列顺序。候选索引是 `(status, create_time, id)`，是否采用要通过执行计划确认。

原查询：

```sql
SELECT * FROM orders
WHERE status = 1
ORDER BY create_time DESC, id DESC
LIMIT 1000000, 10;
```

### 必须跳页：延迟关联

```sql
SELECT t1.*
FROM orders t1
INNER JOIN (
    SELECT id, create_time FROM orders
    WHERE status = 1
    ORDER BY create_time DESC, id DESC
    LIMIT 1000000, 10
) t2 ON t1.id = t2.id
ORDER BY t2.create_time DESC, t2.id DESC;
```

内层只取索引中已有的列，再为这 10 条取完整行。外层仍要显式排序；子查询的顺序不能自动保证最终输出顺序。若内层没走覆盖索引，收益可能很有限。

### 连续翻页：复合游标

把上一页最后一条的时间和 ID 传回来：

```sql
-- 示例游标；实际使用绑定参数
SELECT * FROM orders
WHERE status = 1
  AND (create_time < '2026-01-01 10:00:00'
       OR (create_time = '2026-01-01 10:00:00' AND id < 9527000))
ORDER BY create_time DESC, id DESC
LIMIT 10;
```

若业务本来就按 ID 排序，也可以用原来的简化形式，但它与时间排序不是同一份结果：

```sql
SELECT * FROM orders
WHERE status = 1 AND id < 9527000
ORDER BY id DESC
LIMIT 10;
```

游标必须对应排序字段。列表查询期间数据仍可能新增或修改；需要固定快照的导出，另行定义快照和一致性边界。[MySQL LIMIT 与排序说明](https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html)

## 索引规则，别记成绝对结论

| 常见说法 | 更准确的用法 |
| --- | --- |
| `(a,b,c)` 遵循最左前缀 | 常规索引定位先用连续前缀；跳过 b 后，c 仍可能参与索引过滤 |
| 没有 a 就完全不走索引 | 仍可能有索引扫描或满足条件的 Skip Scan，以执行计划为准 |
| 区分度最高的列永远放第一 | 结合等值过滤、范围、排序和其他查询的前缀复用来设计 |
| 索引下推能减少回表 | 仅在适用条件下，把能由索引判断的部分提前过滤，不是所有条件都支持 |

ICP 的典型例子是 `(zipcode, lastname, firstname)`：先按 `zipcode` 缩小范围，再在索引中判断 `lastname LIKE '%etrunia%'`，减少完整行读取。见 [联合索引](https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html)、[ICP 官方示例](https://dev.mysql.com/doc/refman/8.0/en/index-condition-pushdown-optimization.html)；总览保留在 [索引优化文档](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)。

## 验证只看三件事

| 检查 | 判断依据 |
| --- | --- |
| 执行计划 | 有没有排序、覆盖索引、扫描了多少行；支持的版本可用 `EXPLAIN ANALYZE`，它会实际执行查询 |
| 同条件耗时 | 比较浅页和深页、冷缓存和热缓存，记录数据库资源消耗 |
| 结果正确性 | 并列时间、翻页期间新增或修改、末页，检查重复与遗漏 |

先明确要不要跳页，再选 SQL；索引是否起效由执行计划回答。
