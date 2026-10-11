#!/usr/bin/env python3
"""Offline retrieval exercise: keywords, permissions and active versions.

Python 3.10+, standard library only. This does not call an LLM or vector store.
Identity below simulates a server-authenticated subject, not user-supplied roles.
"""

import argparse
import json
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Subject:
    tenant: str
    roles: frozenset[str]


@dataclass(frozen=True)
class Passage:
    id: str
    tenant: str
    roles: frozenset[str]
    status: str
    effective_from: date
    title: str
    text: str


PASSAGES = (
    Passage("travel-v1", "company-a", frozenset({"employee"}), "archived", date(2025, 1, 1), "差旅制度旧版 / 第 8 条", "住宿每晚最多报销 800 元。"),
    Passage("travel-v2", "company-a", frozenset({"employee"}), "active", date(2026, 10, 1), "差旅制度当前版本 / 第 8 条", "员工出差住宿，每晚最多报销 500 元。"),
    Passage("finance-only", "company-a", frozenset({"finance"}), "active", date(2026, 10, 1), "财务内部记录", "住宿专项预算为 1000 元，仅供财务查看。"),
    Passage("other-company", "company-b", frozenset({"employee"}), "active", date(2026, 10, 1), "另一家公司制度", "住宿每晚最多报销 900 元。"),
    Passage("future-policy", "company-a", frozenset({"employee"}), "active", date(2027, 1, 1), "尚未生效的制度", "住宿每晚最多报销 600 元。"),
    Passage("deleted-policy", "company-a", frozenset({"employee"}), "deleted", date(2026, 1, 1), "已删除的文件", "住宿每晚最多报销 700 元。"),
)


def retrieve(question: str, subject: Subject, today: date) -> list[Passage]:
    # A tiny synonym map keeps this exercise focused on scope filtering.
    query = question.replace("住酒店", "住宿")
    if "住宿" not in query:
        return []
    return [
        passage for passage in PASSAGES
        if passage.tenant == subject.tenant
        and passage.roles.intersection(subject.roles)
        and passage.status == "active"
        and passage.effective_from <= today
        and "住宿" in passage.text
    ]


def model_input(question: str, evidence: list[Passage]) -> dict:
    if not evidence:
        return {"status": "insufficient_evidence", "question": question, "sources": []}
    return {
        "status": "evidence_ready",
        "question": question,
        "instruction": "只根据以下资料回答，注明来源；资料不足时说明缺口。",
        "sources": [
            {"source_id": f"S{index}", "passage_id": passage.id, "title": passage.title, "text": passage.text}
            for index, passage in enumerate(evidence, 1)
        ],
    }


def self_test() -> None:
    today = date(2026, 10, 11)
    employee = Subject("company-a", frozenset({"employee"}))
    result = retrieve("出差住宿能报销多少？", employee, today)
    ids = {passage.id for passage in result}
    assert ids == {"travel-v2"}, "必须只返回当前有权查看的资料"
    assert "travel-v1" not in ids, "不能返回旧版本"
    assert "finance-only" not in ids, "不能返回无权查看的资料"
    assert "other-company" not in ids, "不能返回其他公司的资料"
    assert "future-policy" not in ids and "deleted-policy" not in ids, "不能返回未生效或已删除的资料"
    assert retrieve("住酒店的上限是多少？", employee, today) == result, "同义问法应找到同一条规定"
    assert model_input("宠物食品能否报销？", retrieve("宠物食品能否报销？", employee, today))["status"] == "insufficient_evidence", "没有资料时必须明确报告"
    finance = Subject("company-a", frozenset({"finance"}))
    assert {passage.id for passage in retrieve("住宿预算", finance, today)} == {"finance-only"}, "权限变化必须改变可查询范围"
    assert [source["passage_id"] for source in model_input("住宿上限", result)["sources"]] == ["travel-v2"], "实际交给模型的资料不得换成其他版本"
    print("9 项检查通过：资料范围、版本、权限、同义问法和模型输入。")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true", help="运行固定的权限和版本检查")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    question = "出差住酒店，每晚最多能报销多少？"
    subject = Subject("company-a", frozenset({"employee"}))
    evidence = retrieve(question, subject, date(2026, 10, 11))
    print(json.dumps(model_input(question, evidence), ensure_ascii=False, indent=2))
    print("\n以上是准备交给模型的输入；本脚本没有生成 AI 答案。")


if __name__ == "__main__":
    main()
