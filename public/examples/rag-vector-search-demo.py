#!/usr/bin/env python3
"""RAG 向量检索演练：SQLite 记录、元数据过滤、精确 Top-K、RRF 与指标。

只用 Python 3.10+ 标准库。二维向量及资料是人工教学数据，不是模型输出。
SQLite 用自定义距离函数做全量比较，不具有 HNSW / IVF 近似向量索引。
关键词排名也是设定的示例；本脚本不运行 BM25、reranker 或回答模型。
"""

import argparse
import json
import math
import sqlite3

QUERY = [1.0, 0.0]
QUESTION = "住酒店每晚最多报销多少，超出的部分谁承担？"
ROWS = [
    ("A", "差旅制度第8条", "v2", "demo-company", "employee", 1,
     "员工出差住宿，每晚最多报销500元。", [0.8, 0.6]),
    ("B", "旧版差旅制度第8条", "v1", "demo-company", "employee", 0,
     "员工出差住宿，每晚最多报销800元。", [1.0, 0.0]),
    ("C", "财务专用预算", "v2", "demo-company", "finance", 1,
     "财务专用预算：某专项住宿预算900元。", [0.96, 0.28]),
    ("D", "差旅制度第9条", "v2", "demo-company", "employee", 1,
     "住宿超过报销上限的部分，由员工个人承担。", [0.6, 0.8]),
    ("E", "差旅制度第10条", "v2", "demo-company", "employee", 1,
     "餐费按另行规定的标准报销。", [0.0, 1.0]),
]


def dot(a, b):
    if len(a) != len(b):
        raise ValueError("向量维度必须一致。")
    return sum(x * y for x, y in zip(a, b))


def cosine(a, b):
    denominator = math.sqrt(dot(a, a) * dot(b, b))
    if not denominator:
        raise ValueError("零向量不能计算余弦相似度。")
    return dot(a, b) / denominator


def l2(a, b):
    if len(a) != len(b):
        raise ValueError("向量维度必须一致。")
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def rrf(rankings, constant=60):
    scores = {}
    for ranking in rankings:
        if len(set(ranking)) != len(ranking):
            raise ValueError("每一路排名应先按记录 ID 去重。")
        for rank, chunk_id in enumerate(ranking, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1 / (constant + rank)
    return sorted(scores.items(), key=lambda pair: (-pair[1], pair[0]))


def relevance_metrics(retrieved, required):
    # 示例只使用唯一片段 ID；生产评测须统一片段/文档/证据的标注单位。
    hits = len(set(retrieved) & set(required))
    return {
        "recall": hits / len(required),
        "precision": hits / len(retrieved) if retrieved else 0.0,
    }


def demonstrate(self_test=False):
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute("""CREATE TABLE chunks (
        id TEXT PRIMARY KEY, source TEXT, version TEXT, tenant_id TEXT,
        access_group TEXT, is_current INTEGER, text TEXT, embedding TEXT
    )""")
    connection.executemany(
        "INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [(*row[:-1], json.dumps(row[-1])) for row in ROWS],
    )
    scanned_ids = []

    def distance(chunk_id, stored_vector, query_vector):
        scanned_ids.append(chunk_id)
        return 1.0 - cosine(json.loads(stored_vector), json.loads(query_vector))

    connection.create_function("cosine_distance", 3, distance, deterministic=True)
    query_json = json.dumps(QUERY)
    # 租户与权限组来自服务端认证；这里的常量只属于假设教学账号。
    sql = """SELECT id, source, text,
        cosine_distance(id, embedding, ?) AS distance
      FROM chunks
      WHERE tenant_id = ? AND access_group = ? AND is_current = 1
      ORDER BY distance ASC, id ASC LIMIT ?"""
    filtered = list(connection.execute(sql, (query_json, "demo-company", "employee", 2)))
    filtered_scan = scanned_ids.copy()
    scanned_ids.clear()
    unfiltered = list(connection.execute("""SELECT id, access_group, is_current,
      cosine_distance(id, embedding, ?) AS distance
      FROM chunks ORDER BY distance ASC, id ASC LIMIT 2""", (query_json,)))
    late_filtered = [row["id"] for row in unfiltered
                     if row["access_group"] == "employee" and row["is_current"]]
    all_records = []
    for row in ROWS:
        chunk_id, source, version, tenant, group, current, text, vector = row
        all_records.append({
            "id": chunk_id, "source": source, "version": version,
            "group": group, "current": bool(current), "text": text,
            "vector": vector, "cosine": round(cosine(QUERY, vector), 6),
            "cosineDistance": round(1 - cosine(QUERY, vector), 6),
            "l2": round(l2(QUERY, vector), 6),
            "eligible": group == "employee" and bool(current),
        })
    eligible_ranking = [row["id"] for row in sorted(
        all_records, key=lambda row: (-row["cosine"], row["id"])) if row["eligible"]]
    # 人工给定关键词排名，演示如何与真实算出的向量排名融合。
    keyword_ranking = ["A", "D"]
    fused = rrf([keyword_ranking, eligible_ranking])
    required = ["A", "D"]
    metrics = [
        {"retrieved": ids, **relevance_metrics(ids, required)}
        for ids in (["A"], ["A", "D"], ["A", "D", "E"])
    ]
    if self_test:
        assert [row["id"] for row in filtered] == ["A", "D"]
        assert set(filtered_scan) == {"A", "D", "E"}
        assert [row["id"] for row in unfiltered] == ["B", "C"]
        assert late_filtered == []
        assert not list(connection.execute(sql, (query_json, "other-company", "employee", 2)))
        assert [item[0] for item in fused] == ["A", "D", "E"]
        assert math.isclose(fused[0][1], 2 / 61)
        for row in ROWS:
            assert math.isclose(dot(row[-1], row[-1]), 1.0)
            assert math.isclose(l2(QUERY, row[-1]) ** 2, 2 - 2 * cosine(QUERY, row[-1]))
        assert cosine(QUERY, [3.0, 4.0]) < cosine(QUERY, [0.8, 0.6])
        assert dot(QUERY, [3.0, 4.0]) > dot(QUERY, [0.8, 0.6])
        assert metrics[0]["recall"] == 0.5 and metrics[1]["recall"] == 1.0
        assert math.isclose(metrics[2]["precision"], 2 / 3)
        for invalid in ([0.0, 0.0], [1.0, 0.0, 0.0]):
            try:
                cosine(QUERY, invalid)
            except ValueError:
                pass
            else:
                raise AssertionError("无效向量应明确拒绝。")
        # 用同一稳定 ID upsert，重试不会增加第二条记录。
        connection.execute("INSERT OR REPLACE INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                           (*ROWS[0][:-1], json.dumps(ROWS[0][-1])))
        assert connection.execute("SELECT count(*) FROM chunks WHERE id = 'A'").fetchone()[0] == 1
    result = {
        "question": QUESTION, "queryVector": QUERY,
        "note": "人工二维单位向量；实跑 SQLite 全量比较，不是 Embedding、HNSW 或模型质量测试。",
        "records": all_records,
        "topK": 2, "filteredResult": [row["id"] for row in filtered],
        "filteredScanIds": filtered_scan,
        "unfilteredTopK": [row["id"] for row in unfiltered],
        "filterAfterTopK": late_filtered,
        "rrf": {"constant": 60, "keywordRanking": keyword_ranking,
                "vectorRanking": eligible_ranking,
                "result": [{"id": key, "score": round(score, 6)} for key, score in fused]},
        "requiredEvidence": required, "metrics": metrics,
    }
    connection.close()
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    print(json.dumps(demonstrate(args.self_test), ensure_ascii=False, indent=2))
