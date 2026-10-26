---
{
  "title": "系统设计主题：从这里开始",
  "sidebar": {
    "order": 24
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/object-oriented-design/circular-array/",
    "label": "设计环形数组"
  },
  "next": {
    "link": "/system-design/performance-scalability/",
    "label": "性能与可扩展性"
  }
}
---
不熟悉系统设计？

首先，你需要对一般性原则有一个基本的认识，知道它们是什么，怎样使用以及利弊。

### 第一步：回顾可扩展性（scalability）的视频讲座

[哈佛大学可扩展性讲座](https://www.youtube.com/watch?v=-W9F__D3oY4)

* 主题涵盖
    * 垂直扩展（Vertical scaling）
    * 水平扩展（Horizontal scaling）
    * 缓存
    * 负载均衡
    * 数据库复制
    * 数据库分区

### 第二步：回顾可扩展性文章

[可扩展性](https://web.archive.org/web/20221030091841/http://www.lecloud.net/tagged/scalability/chrono)

* 主题涵盖：
    * [Clones](https://web.archive.org/web/20220530193911/https://www.lecloud.net/post/7295452622/scalability-for-dummies-part-1-clones)
    * [数据库](https://web.archive.org/web/20220602114024/https://www.lecloud.net/post/7994751381/scalability-for-dummies-part-2-database)
    * [缓存](https://web.archive.org/web/20230126233752/https://www.lecloud.net/post/9246290032/scalability-for-dummies-part-3-cache)
    * [异步](https://web.archive.org/web/20220926171507/https://www.lecloud.net/post/9699762917/scalability-for-dummies-part-4-asynchronism)

### 接下来的步骤

接下来，我们将看看高阶的权衡和取舍:

* **性能**与**可扩展性**
* **延迟**与**吞吐量**
* **可用性**与**一致性**

记住**每个方面都面临取舍和权衡**。

然后，我们将深入更具体的主题，如 DNS、CDN 和负载均衡器。

