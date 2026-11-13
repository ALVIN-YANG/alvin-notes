---
title: "宿主机内的独立进程间通信"
description: "用机制图理解管道、Unix 套接字、消息队列、共享内存与通知机制，并通过决策树完成本机 IPC 选型。"
sidebar:
  label: 宿主机内的独立进程间通信
date: 2026-11-11
lastUpdated: 2026-11-13
verifiedAgainst: "Linux man-pages 6.19；核对于 2026-11-13"
---

独立进程无法直接访问彼此内存。IPC 要么由内核转发，要么映射同一批物理页；信号和 eventfd 只负责通知。

![IPC 的三条基本通路：内核转发、共享物理页和事件通知。](/images/architecture/ipc-overview.svg)

## [管道与 FIFO](https://man7.org/linux/man-pages/man7/pipe.7.html)

![ps 与 grep 通过匿名管道连接；无亲缘进程通过 FIFO 路径连接。](/images/architecture/ipc-pipe.svg)

## [Unix 套接字](https://man7.org/linux/man-pages/man7/unix.7.html)

![多个客户端通过 Unix 套接字与服务进程双向通信，并可传递文件描述符。](/images/architecture/ipc-unix-socket.svg)

## [消息队列](https://man7.org/linux/man-pages/man7/mq_overview.7.html)

![生产者把离散消息写入内核队列，消费者逐条取出；队列容量有限且不落盘。](/images/architecture/ipc-message-queue.svg)

## [共享内存](https://man7.org/linux/man-pages/man7/shm_overview.7.html)

![两个进程把各自虚拟地址映射到同一批物理页，另配同步与唤醒机制。](/images/architecture/ipc-shared-memory.svg)

## [信号与 eventfd](https://man7.org/linux/man-pages/man2/eventfd.2.html)

![信号用于控制事件，eventfd 用内核计数器完成通知；二者不传业务数据。](/images/architecture/ipc-notification.svg)

## 选型

![IPC 选型决策树：依次判断业务数据、持久化、跨机器、大数据、双向通信、消息边界和进程关系。](/images/architecture/ipc-decision-tree.svg)
