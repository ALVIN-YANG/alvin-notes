---
{
  "title": "如何处理一个系统设计的面试题",
  "sidebar": {
    "order": 6
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/study-guide/",
    "label": "学习指引"
  },
  "next": {
    "link": "/system-design/system-design-exercises/",
    "label": "系统设计的面试题和解答"
  }
}
---
系统设计面试是一个**开放式的对话**。他们期望你去主导这个对话。

你可以使用下面的步骤来指引讨论。为了巩固这个过程，请使用下面的步骤完成[系统设计的面试题和解答](#系统设计的面试题和解答)这个章节。

### 第一步：描述使用场景，约束和假设

把所有需要的东西聚集在一起，审视问题。不停的提问，以至于我们可以明确使用场景和约束。讨论假设。

* 谁会使用它？
* 他们会怎样使用它？
* 有多少用户？
* 系统的作用是什么？
* 系统的输入输出分别是什么？
* 我们希望处理多少数据？
* 我们希望每秒钟处理多少请求？
* 我们希望的读写比率？

### 第二步：创造一个高层级的设计

使用所有重要的组件来描绘出一个高层级的设计。

* 画出主要的组件和连接
* 证明你的想法

### 第三步：设计核心组件

对每一个核心组件进行详细深入的分析。举例来说，如果你被问到[设计一个 url 缩写服务](solutions/system_design/pastebin/README.md)，开始讨论：

* 生成并储存一个完整 url 的 hash
    * [MD5](solutions/system_design/pastebin/README.md) 和 [Base62](solutions/system_design/pastebin/README.md)
    * Hash 碰撞
    * SQL 还是 NoSQL
    * 数据库模型
* 将一个 hashed url 翻译成完整的 url
    * 数据库查找
* API 和面向对象设计

### 第四步：扩展设计

确认和处理瓶颈以及一些限制。举例来说就是你需要下面的这些来完成扩展性的议题吗？

* 负载均衡
* 水平扩展
* 缓存
* 数据库分片

论述可能的解决办法和代价。每件事情需要取舍。可以使用[可扩展系统的设计原则](#系统设计主题的索引)来处理瓶颈。

### 预估计算量

你或许会被要求通过手算进行一些估算。[附录](#附录)涉及到的是下面的这些资源：

* [使用预估计算量](http://highscalability.com/blog/2011/1/26/google-pro-tip-use-back-of-the-envelope-calculations-to-choo.html)
* [2 的次方表](#2-的次方表)
* [每个程序员都应该知道的延迟数](#每个程序员都应该知道的延迟数)

### 相关资源和延伸阅读

查看下面的链接以获得我们期望的更好的想法：

* [怎样通过一个系统设计的面试](https://web.archive.org/web/20210505130322/https://www.palantir.com/2011/10/how-to-rock-a-systems-design-interview/)
* [系统设计的面试](http://www.hiredintech.com/system-design)
* [系统架构与设计的面试简介](https://www.youtube.com/watch?v=ZgdS0EUmn70)
* [系统设计面试模板](https://leetcode.com/discuss/career/229177/My-System-Design-Template)

