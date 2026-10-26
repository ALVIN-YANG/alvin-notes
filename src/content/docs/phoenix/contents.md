---
{
  "title": "目录",
  "comments": false,
  "editUrl": false,
  "tableOfContents": {
    "minHeadingLevel": 2,
    "maxHeadingLevel": 4
  },
  "prev": {
    "link": "/phoenix/",
    "label": "凤凰架构"
  },
  "next": {
    "link": "/phoenix/introduction/about-me/",
    "label": "关于作者"
  }
}
---

<div class="phoenix-note phoenix-tip">

**数据统计**

列入目录文章 100 篇，实际文章总数 149 篇（含目录外文章），
合计总字数 635330  字，最后更新日期 2026-09-28。

</div>


- [关于本书与许可](/phoenix/)
- [目录](/phoenix/contents/)
- 前言
  - [关于作者](/phoenix/introduction/about-me/)
  - [关于纸质书](/phoenix/introduction/about-book/)
  - [什么是“凤凰架构”](/phoenix/introduction/about-the-fenix-project/)
- 探索起步
  - 阅读指引
    - [更新日志](/phoenix/changelog/)
    - [如何开始](/phoenix/exploration/guide/quick-start/)
  - 技术演示工程
    - [技术演示工程](/phoenix/exploration/projects/)
    - [前端工程](/phoenix/exploration/projects/fenix-bookstore-frontend/)
    - [单体架构：Spring Boot](/phoenix/exploration/projects/monolithic_arch_springboot/)
    - [微服务：Spring Cloud](/phoenix/exploration/projects/microservice_arch_springcloud/)
    - [微服务：Kubernetes](/phoenix/exploration/projects/microservice_arch_kubernetes/)
    - [服务网格：Istio](/phoenix/exploration/projects/servicemesh_arch_istio/)
    - [无服务：AWS Lambda](/phoenix/exploration/projects/serverless_arch/)
- 演进中的架构
  - 服务架构演进史
    - [服务架构演进史](/phoenix/architecture/architect-history/)
    - [原始分布式时代](/phoenix/architecture/architect-history/primitive-distribution/)
    - [单体系统时代](/phoenix/architecture/architect-history/monolithic/)
    - [SOA 时代](/phoenix/architecture/architect-history/soa/)
    - [微服务时代](/phoenix/architecture/architect-history/microservices/)
    - [后微服务时代](/phoenix/architecture/architect-history/post-microservices/)
    - [无服务时代](/phoenix/architecture/architect-history/serverless/)
- 架构师的视角
  - 访问远程服务
    - [访问远程服务](/phoenix/architect-perspective/general-architecture/api-style/)
    - [远程服务调用](/phoenix/architect-perspective/general-architecture/api-style/rpc/)
    - [REST 设计风格](/phoenix/architect-perspective/general-architecture/api-style/rest/)
  - 事务处理
    - [事务处理](/phoenix/architect-perspective/general-architecture/transaction/)
    - [本地事务](/phoenix/architect-perspective/general-architecture/transaction/local/)
    - [全局事务](/phoenix/architect-perspective/general-architecture/transaction/global/)
    - [共享事务](/phoenix/architect-perspective/general-architecture/transaction/share/)
    - [分布式事务](/phoenix/architect-perspective/general-architecture/transaction/distributed/)
  - 透明多级分流系统
    - [透明多级分流系统](/phoenix/architect-perspective/general-architecture/diversion-system/)
    - [客户端缓存](/phoenix/architect-perspective/general-architecture/diversion-system/client-cache/)
    - [域名解析](/phoenix/architect-perspective/general-architecture/diversion-system/dns-lookup/)
    - [传输链路](/phoenix/architect-perspective/general-architecture/diversion-system/transmission-optimization/)
    - [内容分发网络](/phoenix/architect-perspective/general-architecture/diversion-system/cdn/)
    - [负载均衡](/phoenix/architect-perspective/general-architecture/diversion-system/load-balancing/)
    - [服务端缓存](/phoenix/architect-perspective/general-architecture/diversion-system/cache-middleware/)
  - 架构安全性
    - [架构安全性](/phoenix/architect-perspective/general-architecture/system-security/)
    - [认证](/phoenix/architect-perspective/general-architecture/system-security/authentication/)
    - [授权](/phoenix/architect-perspective/general-architecture/system-security/authorization/)
    - [凭证](/phoenix/architect-perspective/general-architecture/system-security/credentials/)
    - [保密](/phoenix/architect-perspective/general-architecture/system-security/confidentiality/)
    - [传输](/phoenix/architect-perspective/general-architecture/system-security/transport-security/)
    - [验证](/phoenix/architect-perspective/general-architecture/system-security/verification/)
- 分布式的基石
  - 分布式共识算法
    - [分布式共识算法](/phoenix/distribution/consensus/)
    - [Paxos](/phoenix/distribution/consensus/paxos/)
    - [Multi Paxos](/phoenix/distribution/consensus/raft/)
    - [Gossip 协议](/phoenix/distribution/consensus/gossip/)
  - 从类库到服务
    - [从类库到服务](/phoenix/distribution/connect/)
    - [服务发现](/phoenix/distribution/connect/service-discovery/)
    - [网关路由](/phoenix/distribution/connect/service-routing/)
    - [客户端负载均衡](/phoenix/distribution/connect/load-balancing/)
  - 流量治理
    - [流量治理](/phoenix/distribution/traffic-management/)
    - [服务容错](/phoenix/distribution/traffic-management/failure/)
    - [流量控制](/phoenix/distribution/traffic-management/traffic-control/)
  - 可靠通讯
    - [可靠通讯](/phoenix/distribution/secure/)
    - [零信任网络](/phoenix/distribution/secure/zero-trust/)
    - [服务安全](/phoenix/distribution/secure/service-security/)
  - 可观测性
    - [可观测性](/phoenix/distribution/observability/)
    - [事件日志](/phoenix/distribution/observability/logging/)
    - [链路追踪](/phoenix/distribution/observability/tracing/)
    - [聚合度量](/phoenix/distribution/observability/metrics/)
- 不可变基础设施
  - [从微服务到云原生](/phoenix/immutable-infrastructure/msa-to-cn/)
  - 虚拟化容器
    - [虚拟化容器](/phoenix/immutable-infrastructure/container/)
    - [容器的崛起](/phoenix/immutable-infrastructure/container/history/)
    - [以容器构建系统](/phoenix/immutable-infrastructure/container/container-build-system/)
    - [以应用为中心的封装](/phoenix/immutable-infrastructure/container/application-centric/)
  - 容器间网络
    - [容器间网络](/phoenix/immutable-infrastructure/network/)
    - [Linux 网络虚拟化](/phoenix/immutable-infrastructure/network/linux-vnet/)
    - [容器网络与生态](/phoenix/immutable-infrastructure/network/cni/)
  - 持久化存储
    - [持久化存储](/phoenix/immutable-infrastructure/storage/)
    - [Kubernetes 存储设计](/phoenix/immutable-infrastructure/storage/storage-evolution/)
    - [容器存储与生态](/phoenix/immutable-infrastructure/storage/csi/)
  - [资源与调度](/phoenix/immutable-infrastructure/schedule/hardware-schedule/)
  - 服务网格
    - [服务网格](/phoenix/immutable-infrastructure/mesh/)
    - [透明通信的涅槃](/phoenix/immutable-infrastructure/mesh/communication/)
    - [服务网格与生态](/phoenix/immutable-infrastructure/mesh/ecosystems/)
- 技术方法论
  - 向微服务迈进
    - [向微服务迈进](/phoenix/methodology/forward-msa/)
    - [目的：微服务的驱动力](/phoenix/methodology/forward-msa/objective/)
    - [前提：微服务需要的条件](/phoenix/methodology/forward-msa/prerequest/)
    - [边界：微服务的粒度](/phoenix/methodology/forward-msa/granularity/)
    - [治理：理解系统复杂性](/phoenix/methodology/forward-msa/governance/)
- 随笔文章
  - 2020年
    - Graal VM
      - [Graal VM](/phoenix/tricks/2020/graalvm/)
      - [新一代即时编译器](/phoenix/tricks/2020/graalvm/graal-compiler/)
      - [向原生迈进](/phoenix/tricks/2020/graalvm/substratevm/)
      - [没有虚拟机的 Java](/phoenix/tricks/2020/graalvm/graalvm-native/)
      - [Spring over Graal](/phoenix/tricks/2020/graalvm/spring-over-graal/)
    - [QCon2020 主题演讲：云原生时代，Java 的危与机](/phoenix/tricks/2020/java-crisis/qcon/)
  - 2021年
    - [OpenJDK with CLion 懒人包](/phoenix/tricks/2021/openjdk-for-dummies/)
    - [程序员之路](/phoenix/tricks/2021/geekbang/)
    - [Fenix-CLI：交互式云原生客户端](/phoenix/tricks/2021/fenix-cli/)
    - [ArchSummit2021主题演讲：从软件的历史看架构的未来](/phoenix/tricks/2021/arch/)
- 附录
  - 部署环境
    - [部署环境](/phoenix/appendix/deployment-env-setup/)
    - [部署 Docker CE 容器环境](/phoenix/appendix/deployment-env-setup/setup-docker/)
    - 部署Kubernetes集群
      - [部署 Kubernetes 集群](/phoenix/appendix/deployment-env-setup/setup-kubernetes/)
      - [使用 Kubeadm 部署](/phoenix/appendix/deployment-env-setup/setup-kubernetes/setup-kubeadm/)
      - [使用 Rancher 部署](/phoenix/appendix/deployment-env-setup/setup-kubernetes/setup-rancher/)
      - [使用 Minikube 部署](/phoenix/appendix/deployment-env-setup/setup-kubernetes/setup-minikube/)
  - [部署 Istio](/phoenix/appendix/istio/)
  - [部署 Elastic Stack](/phoenix/appendix/operation-env-setup/elk-setup/)
  - [部署 Prometheus](/phoenix/appendix/operation-env-setup/prometheus-setup/)
- 目录外文章与占位页
  - [构建发布脚本（原文占位页）](/phoenix/appendix/build-script/)
  - [持续集成（原文占位页）](/phoenix/appendix/continuous-integration/)
  - [运维环境（原文占位页）](/phoenix/appendix/operation-env-setup/)
  - [架构的普适问题](/phoenix/architect-perspective/general-architecture/)
  - [异步服务调用（原文占位页）](/phoenix/architect-perspective/general-architecture/api-style/mq/)
  - [高效并发（原文占位页）](/phoenix/architect-perspective/general-architecture/concurrent/)
  - [硬件并发机制（原文占位页）](/phoenix/architect-perspective/general-architecture/concurrent/hardware-concurrent/)
  - [进程、线程与协程（原文占位页）](/phoenix/architect-perspective/general-architecture/concurrent/process-thread-coroutine/)
  - [同步机制（原文占位页）](/phoenix/architect-perspective/general-architecture/concurrent/synchronization/)
  - [线程安全（原文占位页）](/phoenix/architect-perspective/general-architecture/concurrent/thread-safe/)
  - [可扩缩设计（原文占位页）](/phoenix/architect-perspective/general-architecture/diversion-system/scalability/)
  - [未完成章节](/phoenix/architect-perspective/general-architecture/scalability/)
  - [漏洞利用 （编写中）](/phoenix/architect-perspective/general-architecture/system-security/exploit/)
  - [架构核心框架（原文占位页）](/phoenix/architecture/architect-framework/)
  - [基于J2EE的单体架构（原文占位页）](/phoenix/architecture/architect-framework/j2ee-base-arch/)
  - [基于Kubernetes的微服务架构（原文占位页）](/phoenix/architecture/architect-framework/kubernetes-base-arch/)
  - [基于Knative的无服务架构（原文占位页）](/phoenix/architecture/architect-framework/serverless-arch-knative/)
  - [基于Kubeless的无服务架构（原文占位页）](/phoenix/architecture/architect-framework/serverless-arch-kubeless/)
  - [基于Istio的服务网格架构（原文占位页）](/phoenix/architecture/architect-framework/servicemesh-lstio-arch/)
  - [基于Spring Boot的单体架构（原文占位页）](/phoenix/architecture/architect-framework/springboot-base-arch/)
  - [基于Spring Cloud微服务架构（原文占位页）](/phoenix/architecture/architect-framework/springcloud-base-arch/)
  - [讨论区](/phoenix/board/)
  - [服务编排（原文占位页）](/phoenix/distribution/connect/composer/)
  - [中心化配置（原文占位页）](/phoenix/distribution/connect/configuration/)
  - [异常注入（原文占位页）](/phoenix/distribution/traffic-management/exception-inject/)
  - [服务质量（原文占位页）](/phoenix/distribution/traffic-management/qos/)
  - [降级（原文占位页）](/phoenix/distribution/traffic-management/service-downgrade/)
  - [超时（原文占位页）](/phoenix/distribution/traffic-management/timeout/)
  - [虚拟网络生态（原文占位页）](/phoenix/immutable-infrastructure/network/plugin/)
  - [网络策略（原文占位页）](/phoenix/immutable-infrastructure/network/strategy/)
  - [资源调度（原文占位页）](/phoenix/immutable-infrastructure/schedule/)
  - [共享存储插件（原文占位页）](/phoenix/immutable-infrastructure/storage/storage-plugins/)
  - [度量：以结果驱动开发（原文占位页）](/phoenix/methodology/forward-msa/measurement/)
  - [扩展性立方体](/phoenix/methodology/pattern/afk/)
  - [事件驱动架构](/phoenix/methodology/pattern/events/)
  - [复杂事件处理（原文占位页）](/phoenix/methodology/pattern/events/cep/)
  - [查询职责分离（原文占位页）](/phoenix/methodology/pattern/events/cqrs/)
  - [事件溯源（原文占位页）](/phoenix/methodology/pattern/events/es/)
  - [编排与协同（原文占位页）](/phoenix/methodology/pattern/orchestration/)
  - [视频讲解](/phoenix/tricks/2020/graalvm/video/)
  - [2021年文章集合](/phoenix/tricks/2021/)
  - [在容器中编译OpenJDK](/phoenix/tricks/2021/jdkbuild/)
  - [Into Kubernetes](/phoenix/tricks/2021/k3s/)
  - [kube-apiserver源码解读](/phoenix/tricks/2021/k3s/apiserver/)
  - [K8S-APIServer启动过程](/phoenix/tricks/2021/k3s/apiserver/bootstrap/)
  - [K3S启动APIServer/Agent的环境准备](/phoenix/tricks/2021/k3s/apiserver/env/)
  - [运行、编译与调试环境](/phoenix/tricks/2021/k3s/build/)
  - [Kubectl源码解读](/phoenix/tricks/2021/k3s/kubectl/)
  - [未完成章节（原文占位页）](/phoenix/tricks/2021/k3s/kubelet/bootstrap/)
