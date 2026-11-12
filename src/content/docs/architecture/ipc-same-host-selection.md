---
title: "宿主机内的独立进程间通信"
description: "用两张简洁的 SVG 图理解本机 IPC 的数据通路、常见方案、实际例子和选型取舍。"
sidebar:
  label: 宿主机内的独立进程间通信
date: 2026-11-11
lastUpdated: 2026-11-12
verifiedAgainst: "Linux man-pages 6.19；核对于 2026-11-12"
---

独立进程不能直接读写彼此内存。普通请求响应优先 [Unix Domain Socket](https://man7.org/linux/man-pages/man7/unix.7.html)；Shell 单向流用[管道](https://man7.org/linux/man-pages/man7/pipe.7.html)；大块高频数据用[共享内存](https://man7.org/linux/man-pages/man7/shm_overview.7.html)，并配合同步与通知。需要持久化或跨机器时，再选文件、数据库或 TCP。

![本机 IPC 的两条数据通路：管道、消息队列和 Socket 经内核转发；共享内存直接映射同一批物理页，并需要同步与通知。](/images/architecture/ipc-data-paths.svg)

## 按场景选

![IPC 选型图：Shell 管道、FIFO、Unix Domain Socket、消息队列、共享内存、信号、文件和回环 TCP 的场景与注意点。](/images/architecture/ipc-selection-guide.svg)
