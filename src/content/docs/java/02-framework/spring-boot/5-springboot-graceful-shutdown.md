---
title: "微服务无损发布：Spring Boot 优雅停机与 K8s 探针联动"
description: "发版时出现 502 的两个根因：在途请求被掐断、K8s 摘除 Endpoint 是异步的。用 server.shutdown=graceful、preStop sleep、Readiness 探针三件事配合解决，并注意宽限期与 SIGKILL 的边界。"
sidebar:
  order: 5
date: 2025-10-24
lastUpdated: 2026-10-11
---

发版时出现 502/超时，根因通常有两个：处理到一半的请求被进程退出直接掐断；以及 Kubernetes 摘除 Endpoint 是异步的，网关还在往已开始停机的 Pod 送新流量。对应的解法是三件事配合：Spring Boot 开启 `server.shutdown=graceful` 保护在途请求、K8s 用 `preStop` 等待覆盖路由刷新时间差、Readiness 探针保证启动完成前不接流量。

边界也要先说清：优雅停机不是无损的绝对保证——超过 `timeout-per-shutdown-phase` 宽限期的请求仍会被掐断，`kill -9`（SIGKILL）更是直接绕过整个机制。宽限期要按系统最慢接口的实际耗时来评估。

## 1. 什么是优雅停机？

优雅停机的逻辑是：停止接收新流量，把手里的请求处理完，再退出。

当应用收到关闭信号（通常是 K8s 发出的 `SIGTERM`）时：
1. 底层的 Tomcat/Undertow web 容器立即**拒绝接收任何新的网络连接**。
2. 通知网关或注册中心：该节点准备下线。
3. 给当前正在处理的 HTTP 请求一个**宽限期（Grace Period）**，比如 30 秒，让它们执行完并返回响应。
4. 宽限期结束后，无论是否处理完，强制关闭连接并退出 JVM。

## 2. Spring Boot 侧的配置

在 Spring Boot 2.3+ 以及后续的 3.x 版本中，官方原生内置了这套机制（[Spring Boot 文档：Graceful Shutdown](https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html)），只需要在 `application.yml` 里开启它：

```yaml
server:
  # 将停机模式从默认的 IMMEDIATE 切换为 GRACEFUL
  shutdown: graceful

spring:
  lifecycle:
    # 设定给正在处理的请求多少宽限期，默认是 30s。根据你系统最慢的接口来评估。
    timeout-per-shutdown-phase: 30s
```

就这么简单。只要你在 Linux 中用 `kill -15 <PID>`（千万不要用 `kill -9`）通知进程，Spring Boot 控制台就会优雅地打印出：
`Commencing graceful shutdown. Waiting for active requests to complete...`

## 3. Kubernetes 下的关键盲区

只加上面的配置就部署到 K8s，502 依然可能出现。

**K8s 的路由刷新是异步的。**
当 K8s 决定停掉一个 Pod 时，它会**同时**做两件事：
1. 发送 `SIGTERM` 给你的 Spring Boot 容器。
2. 通知网络组件（kube-proxy / Ingress）把这个 Pod 从可用 Endpoint 列表里摘除。

但网络组件更新 iptables 或网关配置需要时间（通常是秒级）。于是会出现这样的窗口：Spring Boot 收到 `SIGTERM` 已开始优雅停机、**不再接收新连接**，而网关还没完成摘除，继续把流量送进这个 Pod，得到的是 `Connection Refused`（表现为 502）。

### 解法：K8s PreStop Hook

用一个 PreStop Hook 把这个时间差覆盖掉：K8s 在发送 `SIGTERM` 之前先执行 `sleep`，这期间 Pod 仍正常处理请求，同时网关完成摘除广播。

**修改你的 Deployment.yaml 配置：**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
      - name: user-service
        image: company/user-service:1.0.0
        lifecycle:
          preStop:
            exec:
              # 收到停止指令后先等待 10 秒：
              # 这期间 Pod 仍正常处理请求，同时 K8s 正在把摘除消息同步到网关
              command: ["/bin/sh", "-c", "sleep 10"]
```

## 4. 就绪探针与活性探针 (Readiness & Liveness)

除了优雅停机，要做到平滑的启动（无损上线），你必须配置 K8s 探针。
Spring Boot Actuator 原生提供了针对 K8s 容器的探测接口：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

开启 K8s 探针感知：
```yaml
management:
  endpoint:
    health:
      probes:
        enabled: true
```

在 K8s yaml 中配置：
```yaml
        readinessProbe:
          # K8s 会不断访问这个接口，只有返回 200 OK，K8s 网关才会把真实流量放进来
          # 这样就避免了 Spring 刚启动一半，流量打进来报错的问题
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          # K8s 会用这个接口检测你的服务是不是死锁或 OOM 假死了，如果挂了就自动重启你
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

## 总结

三个配置分别对应三个失效点：`server.shutdown=graceful` 保护在途请求，`preStop sleep` 覆盖网关路由刷新的时间差，Readiness 探针防止未就绪的实例提前接流量。配置时的两个注意点：`timeout-per-shutdown-phase` 要大于系统最慢接口的耗时；`preStop` 的等待时长要大于所在集群 Endpoint 摘除的实际传播耗时，这两个值都需要在自己的环境验证。
