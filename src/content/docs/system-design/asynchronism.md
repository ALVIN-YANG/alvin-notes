---
{
  "title": "异步",
  "sidebar": {
    "order": 37
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/cache/",
    "label": "缓存"
  },
  "next": {
    "link": "/system-design/communication/",
    "label": "通讯"
  }
}
---
<p align="center">
  <img src="images/54GYsSx.png">
  <br/>
  <strong><a href="http://lethain.com/introduction-to-architecting-systems-for-scale/#platform_layer">资料来源：可缩放系统构架介绍</a></strong>
</p>

异步工作流有助于减少那些原本顺序执行的请求时间。它们可以通过提前进行一些耗时的工作来帮助减少请求时间，比如定期汇总数据。

### 消息队列

消息队列接收，保留和传递消息。如果按顺序执行操作太慢的话，你可以使用有以下工作流的消息队列：

- 应用程序将作业发布到队列，然后通知用户作业状态
- 一个 worker 从队列中取出该作业，对其进行处理，然后显示该作业完成

不去阻塞用户操作，作业在后台处理。在此期间，客户端可能会进行一些处理使得看上去像是任务已经完成了。例如，如果要发送一条推文，推文可能会马上出现在你的时间线上，但是可能需要一些时间才能将你的推文推送到你的所有关注者那里去。

**Redis** 是一个令人满意的简单的消息代理，但是消息有可能会丢失。

**RabbitMQ** 很受欢迎但是要求你适应「AMQP」协议并且管理你自己的节点。

**Amazon SQS** 是被托管的，但可能具有高延迟，并且消息可能会被传送两次。

### 任务队列

任务队列接收任务及其相关数据，运行它们，然后传递其结果。 它们可以支持调度，并可用于在后台运行计算密集型作业。

**Celery** 支持调度，主要是用 Python 开发的。

### 背压

如果队列开始明显增长，那么队列大小可能会超过内存大小，导致高速缓存未命中，磁盘读取，甚至性能更慢。[背压](http://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html)可以通过限制队列大小来帮助我们，从而为队列中的作业保持高吞吐率和良好的响应时间。一旦队列填满，客户端将得到服务器忙或者 HTTP 503 状态码，以便稍后重试。客户端可以在稍后时间重试该请求，也许是[指数退避](https://en.wikipedia.org/wiki/Exponential_backoff)。

### 异步的缺点：

- 简单的计算和实时工作流等用例可能更适用于同步操作，因为引入队列可能会增加延迟和复杂性。

### 相关资源和延伸阅读

- [这是一个数字游戏](https://www.youtube.com/watch?v=1KRYH75wgy4)
- [超载时应用背压](http://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html)
- [利特尔法则](https://en.wikipedia.org/wiki/Little%27s_law)
- [消息队列与任务队列有什么区别？](https://www.quora.com/What-is-the-difference-between-a-message-queue-and-a-task-queue-Why-would-a-task-queue-require-a-message-broker-like-RabbitMQ-Redis-Celery-or-IronMQ-to-function)

