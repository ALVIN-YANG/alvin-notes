#!/usr/bin/env python3
"""LangGraph + PostgreSQL 进程恢复演示。只读模拟温度，不调用模型或真实设备。

Dependencies: langgraph==1.2.11, langgraph-checkpoint-postgres==3.1.2,
              psycopg[binary,pool]==3.3.5
Database: AGENT_DEMO_DATABASE_URL（必须使用独立的演示数据库）
"""

import argparse
import json
import os

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import END, START, MessagesState, StateGraph


def build_graph(saver, crash_before_reply=False):
    def plan(state):
        print("ENTER plan", flush=True)
        return {"messages": [AIMessage(
            content="",
            tool_calls=[{
                "name": "read_temperature",
                "args": {"room": "living_room"},
                "id": "call_temperature_1",
            }],
        )]}

    def read_temperature(state):
        print("ENTER tool (simulated read)", flush=True)
        call = state["messages"][-1].tool_calls[0]
        # 固定读数只用于观察恢复行为，不能当作真实设备状态。
        return {"messages": [ToolMessage(
            content=json.dumps({"room": call["args"]["room"], "celsius": 23.5}),
            tool_call_id=call["id"],
            name=call["name"],
        )]}

    def reply(state):
        print("ENTER reply", flush=True)
        if crash_before_reply:
            print("CRASH before reply, exit=75 (no cleanup)", flush=True)
            os._exit(75)  # 有意终止本演示进程，跳过正常清理。
        result = json.loads(state["messages"][-1].content)
        message = AIMessage(content=f"模拟读数：客厅 {result['celsius']}°C。")
        return {"messages": [message]}

    builder = StateGraph(MessagesState)
    builder.add_node("plan", plan)
    builder.add_node("read_temperature", read_temperature)
    builder.add_node("reply", reply)
    builder.add_edge(START, "plan")
    builder.add_edge("plan", "read_temperature")
    builder.add_edge("read_temperature", "reply")
    builder.add_edge("reply", END)
    return builder.compile(checkpointer=saver)


def show_state(graph, config):
    snapshot = graph.get_state(config)
    messages = snapshot.values.get("messages", [])
    print(json.dumps({
        "thread_id": config["configurable"]["thread_id"],
        "next": list(snapshot.next),
        "messages": [message.model_dump(mode="json") for message in messages],
    }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["setup", "start", "resume", "status"])
    parser.add_argument("--thread", help="除 setup 外必须指定，同一会话恢复时保持不变")
    parser.add_argument("--crash-before-reply", action="store_true")
    args = parser.parse_args()
    if args.command != "setup" and not args.thread:
        parser.error("必须提供 --thread")
    if args.crash_before_reply and args.command not in {"start", "resume"}:
        parser.error("故障注入只适用于 start 或 resume")
    db_url = os.environ.get("AGENT_DEMO_DATABASE_URL")
    if not db_url:
        parser.error("请为独立演示数据库设置 AGENT_DEMO_DATABASE_URL")

    # 示例按顺序调用。生产入口还需要鉴权、单会话执行互斥、连接池和恢复调度。
    with PostgresSaver.from_conn_string(db_url) as saver:
        if args.command == "setup":
            saver.setup()
            print("演示数据库已初始化")
            return
        graph = build_graph(saver, args.crash_before_reply)
        config = {"configurable": {"thread_id": args.thread}}
        snapshot = graph.get_state(config)
        if args.command == "start":
            if snapshot.values:
                parser.error("会话已经存在，请使用 resume 或新的 --thread，拒绝重复输入")
            graph.invoke({"messages": [HumanMessage(content="客厅现在多少度？")]},
                         config, durability="sync")
        elif args.command == "resume":
            if not snapshot.values:
                parser.error("没有找到会话状态，请检查数据库和 --thread")
            if snapshot.next:
                graph.invoke(None, config, durability="sync")
            else:
                print("会话本轮已经完成，不重复执行")
        show_state(graph, config)


if __name__ == "__main__":
    main()
