---
{
  "title": "可用性与一致性",
  "sidebar": {
    "order": 27
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/latency-throughput/",
    "label": "延迟与吞吐量"
  },
  "next": {
    "link": "/system-design/consistency-patterns/",
    "label": "一致性模式"
  }
}
---
### CAP 理论

<p align="center">
  <img src="images/bgLMI2u.png">
  <br/>
  <strong><a href="https://robertgreiner.com/cap-theorem-revisited">来源：再看 CAP 理论</a></strong>
</p>

在一个分布式计算系统中，只能同时满足下列的两点:

* **一致性** ─ 每次读取返回最近一次写入的数据，或返回错误
* **可用性** ─ 每次访问都能收到非错响应，但不保证获取到最新数据
* **分区容错性** ─ 在任意分区网络故障的情况下系统仍能继续运行

**网络并不可靠，所以你应要支持分区容错性，并需要在软件可用性和一致性间做出取舍。**

#### CP ─ 一致性和分区容错性

等待分区节点的响应可能会导致延时错误。如果你的业务需求需要原子读写，CP 是一个不错的选择。

#### AP ─ 可用性与分区容错性

响应节点上可用数据的最近版本可能并不是最新的。当网络分区恢复后，写入（操作）可能需要一些时间来传播。

如果业务需求允许[最终一致性](#最终一致性)，或当有外部故障时要求系统继续运行，AP 是一个不错的选择。

### 来源及延伸阅读

* [再看 CAP 理论](https://robertgreiner.com/cap-theorem-revisited/)
* [通俗易懂地介绍 CAP 理论](http://ksat.me/a-plain-english-introduction-to-cap-theorem)
* [CAP FAQ](https://github.com/henryr/cap-faq)
* [CAP 定理视频](https://www.youtube.com/watch?v=k-Yaq8AHlFA)

