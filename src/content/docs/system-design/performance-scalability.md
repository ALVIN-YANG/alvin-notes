---
{
  "title": "性能与可扩展性",
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
    "link": "/system-design/getting-started/",
    "label": "系统设计主题：从这里开始"
  },
  "next": {
    "link": "/system-design/latency-throughput/",
    "label": "延迟与吞吐量"
  }
}
---
如果服务**性能**的增长与资源的增加是成比例的，服务就是可扩展的。通常，提高性能意味着服务于更多的工作单元，另一方面，当数据集增长时，同样也可以处理更大的工作单位。<sup><a href="http://www.allthingsdistributed.com/2006/03/a_word_on_scalability.html">1</a></sup>

另一个角度来看待性能与可扩展性:

* 如果你的系统有**性能**问题，对于单个用户来说是缓慢的。
* 如果你的系统有**可扩展性**问题，单个用户较快但在高负载下会变慢。

### 来源及延伸阅读

* [简单谈谈可扩展性](http://www.allthingsdistributed.com/2006/03/a_word_on_scalability.html)
* [可扩展性，可用性，稳定性和模式](http://www.slideshare.net/jboner/scalability-availability-stability-patterns/)

