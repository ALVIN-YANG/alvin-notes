"""Hindsight 0.10.2 demo: retain two preference events, recall, then reflect.

Run against your own Hindsight server. Calls can incur model-provider charges.
Uses fictional data in a dedicated demo bank; does not control Home Assistant.
"""

import asyncio
import json
import os
from datetime import datetime

from hindsight_client import Hindsight


async def main():
    client = Hindsight(
        base_url=os.environ.get("HINDSIGHT_URL", "http://127.0.0.1:8888"),
        api_key=os.environ.get("HINDSIGHT_SERVICE_KEY"),
        timeout=180,
    )
    bank = "home-demo-lin"
    tags = ["topic:climate-preference"]
    events = [
        (
            "preference-2026-10-01",
            "2026-10-01T12:00:00+00:00",
            "用户小林说：我在家时，客厅空调制冷设为 26°C 比较舒服。",
        ),
        (
            "preference-2026-10-05",
            "2026-10-05T12:00:00+00:00",
            "用户小林明确修改偏好：26°C 太冷了。从今天起，"
            "客厅空调制冷改为 28°C。这是长期偏好，不是只改今天。",
        ),
    ]
    try:
        for document_id, timestamp, content in events:
            result = await client.aretain(
                bank_id=bank,
                content=content,
                timestamp=datetime.fromisoformat(timestamp),
                context="用户小林在描述自己的空调偏好，不是助手的经历。",
                document_id=document_id,
                metadata={"source": "user", "speaker": "小林"},
                tags=tags,
            )
            if not result.success:
                raise RuntimeError(f"Retain failed: {document_id}")
            print(f"Retained source: {document_id}")

        recalled = await client.arecall(
            bank_id=bank,
            query="小林的客厅空调制冷偏好怎样变化，现在偏好多少度？",
            types=["world"],
            tags=tags,
            tags_match="all_strict",
            budget="low",
            max_tokens=600,
            trace=True,
        )
        print("\nRecall facts:")
        for fact in recalled.results:
            print(f"[{fact.id}] {fact.text} (source={fact.document_id})")

        reflected = await client.areflect(
            bank_id=bank,
            query="截至 2026-10-08，小林最新明确的客厅空调制冷偏好是什么？"
            "说明与旧偏好的区别。没有依据就说不知道，不要操作设备。",
            tags=tags,
            tags_match="all_strict",
            budget="low",
            max_tokens=300,
            include_facts=True,
            include_tool_calls=True,
        )
        print("\nReflect answer:")
        print(reflected.text)
        print("\nEvidence:")
        print(json.dumps(reflected.based_on.to_dict() if reflected.based_on else {},
                         ensure_ascii=False, indent=2))
    finally:
        await client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
