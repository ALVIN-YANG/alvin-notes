"""在独立 PostgreSQL 演示库运行跨进程恢复验收，不连接模型或设备。

使用示例文章中的 Python 依赖；需设置 AGENT_DEMO_DATABASE_URL。
python scripts/test-agent-context-recovery.py
"""

import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from uuid import uuid4

SCRIPT = Path(__file__).resolve().parents[1] / "public/examples/agent-context-recovery.py"


@unittest.skipUnless(os.environ.get("AGENT_DEMO_DATABASE_URL"), "需要独立 PostgreSQL 演示数据库")
class RecoveryTest(unittest.TestCase):
    def invoke(self, command, thread=None, *extra):
        args = [sys.executable, str(SCRIPT), command]
        if thread:
            args += ["--thread", thread]
        return subprocess.run(args + list(extra), text=True, capture_output=True,
                              timeout=30, env={**os.environ, "LANGSMITH_TRACING": "false"})

    def setUp(self):
        self.thread = f"recovery-test-{uuid4()}"
        result = self.invoke("setup")
        self.assertEqual(result.returncode, 0, result.stderr)

    def state(self, thread=None):
        result = self.invoke("status", thread or self.thread)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_crash_keeps_messages_tool_pair_and_next_node(self):
        crashed = self.invoke("start", self.thread, "--crash-before-reply")
        self.assertEqual(crashed.returncode, 75, crashed.stderr)
        self.assertEqual(crashed.stdout.count("ENTER tool"), 1)
        before = self.state()
        self.assertEqual(before["next"], ["reply"])
        messages = before["messages"]
        self.assertEqual([message["type"] for message in messages], ["human", "ai", "tool"])
        self.assertEqual(messages[1]["tool_calls"][0]["id"], messages[2]["tool_call_id"])
        self.assertEqual(json.loads(messages[2]["content"])["celsius"], 23.5)

        resumed = self.invoke("resume", self.thread)
        self.assertEqual(resumed.returncode, 0, resumed.stderr)
        self.assertIn("ENTER reply", resumed.stdout)
        self.assertNotIn("ENTER plan", resumed.stdout)
        self.assertNotIn("ENTER tool", resumed.stdout)
        after = self.state()
        self.assertEqual(after["next"], [])
        self.assertEqual(after["messages"][:3], messages)
        self.assertEqual(len(after["messages"]), 4)
        self.assertIn("23.5", after["messages"][-1]["content"])

    def test_completed_run_is_not_reexecuted_and_duplicate_input_is_rejected(self):
        self.assertEqual(self.invoke("start", self.thread).returncode, 0)
        before = self.state()
        resumed = self.invoke("resume", self.thread)
        self.assertEqual(resumed.returncode, 0, resumed.stderr)
        self.assertNotIn("ENTER", resumed.stdout)
        self.assertEqual(self.state(), before)
        self.assertNotEqual(self.invoke("start", self.thread).returncode, 0)
        self.assertEqual(self.state(), before)

    def test_unknown_thread_cannot_resume_another_conversation(self):
        unknown = f"missing-{uuid4()}"
        self.assertNotEqual(self.invoke("resume", unknown).returncode, 0)
        self.assertEqual(self.state(unknown)["messages"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
