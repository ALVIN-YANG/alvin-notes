---
{
  "title": "应用层",
  "sidebar": {
    "order": 33
  },
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "editUrl": false,
  "comments": false,
  "prev": {
    "link": "/system-design/reverse-proxy/",
    "label": "反向代理（web 服务器）"
  },
  "next": {
    "link": "/system-design/database/",
    "label": "数据库"
  }
}
---
<p align="center">
  <img src="images/yB5SYwm.png">
  <br/>
  <strong><a href="http://lethain.com/introduction-to-architecting-systems-for-scale/#platform_layer">资料来源：可缩放系统构架介绍</a></strong>
</p>

将 Web 服务层与应用层（也被称作平台层）分离，可以独立缩放和配置这两层。添加新的 API 只需要添加应用服务器，而不必添加额外的 web 服务器。

**单一职责原则**提倡小型的，自治的服务共同合作。小团队通过提供小型的服务，可以更激进地计划增长。

应用层中的工作进程也有可以实现[异步化](#异步)。

### 微服务

与此讨论相关的话题是 [微服务](https://en.wikipedia.org/wiki/Microservices)，可以被描述为一系列可以独立部署的小型的，模块化服务。每个服务运行在一个独立的线程中，通过明确定义的轻量级机制通讯，共同实现业务目标。<sup><a href="https://smartbear.com/learn/api-design/what-are-microservices">1</a></sup>

例如，Pinterest 可能有这些微服务： 用户资料、关注者、Feed 流、搜索、照片上传等。

### 服务发现

像 [Consul](https://www.consul.io/docs/index.html)，[Etcd](https://coreos.com/etcd/docs/latest) 和 [Zookeeper](http://www.slideshare.net/sauravhaloi/introduction-to-apache-zookeeper) 这样的系统可以通过追踪注册名、地址、端口等信息来帮助服务互相发现对方。[Health checks](https://www.consul.io/intro/getting-started/checks.html) 可以帮助确认服务的完整性和是否经常使用一个 [HTTP](#超文本传输协议http) 路径。Consul 和 Etcd 都有一个内建的 [key-value 存储](#键-值存储) 用来存储配置信息和其他的共享信息。

### 不利之处：应用层

- 添加由多个松耦合服务组成的应用层，从架构、运营、流程等层面来讲将非常不同（相对于单体系统）。
- 微服务会增加部署和运营的复杂度。


### 来源及延伸阅读

- [可缩放系统构架介绍](http://lethain.com/introduction-to-architecting-systems-for-scale)
- [破解系统设计面试](http://www.puncsky.com/blog/2016-02-13-crack-the-system-design-interview)
- [面向服务架构](https://en.wikipedia.org/wiki/Service-oriented_architecture)
- [Zookeeper 介绍](http://www.slideshare.net/sauravhaloi/introduction-to-apache-zookeeper)
- [构建微服务，你所需要知道的一切](https://cloudncode.wordpress.com/2016/07/22/msa-getting-started/)

