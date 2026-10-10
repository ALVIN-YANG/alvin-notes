---
title: "Kubernetes 生产排障：从 Pending 到 Service 5xx"
description: "按事件、状态、日志和网络证据逐层定位 Pending、CrashLoopBackOff、OOMKilled、镜像拉取失败和 Service 无流量。"
date: 2026-03-05
lastUpdated: 2026-10-11
verifiedAgainst: "Kubernetes 官方排障文档，2026-06-20"
sidebar:
  order: 2
---

**Kubernetes 排障先保存状态、事件和上一轮日志，再按失败层定位。** 先查调度与镜像，再查进程和探针，最后查 Service、网络和入口。直接重启可能丢掉现场；Pod `Running` 也不能证明请求可达。

例如 Pod 已经 Running，访问 Service 仍然失败。先看它是否 Ready、EndpointSlice 是否选中它，再查端口和网络策略；此时反复改镜像通常没有帮助。

| 现象 | 第一份证据 | 继续检查 |
| --- | --- | --- |
| Pending | `PodScheduled`、`FailedScheduling` 事件 | 未调度查资源与约束；已调度查镜像、卷和启动 |
| ImagePullBackOff | 拉取失败事件 | 镜像身份、凭证、节点到仓库的连接 |
| CrashLoopBackOff | `Last State`、`logs --previous` | 应用退出还是探针触发重启 |
| OOMKilled | 终止原因与历史内存指标 | 容器上限、节点压力、运行时与泄漏 |
| Running 无流量 | Ready、EndpointSlice | selector、targetPort、监听地址与网络 |

## 先保存一份最小现场

```bash
kubectl -n demo get pod -o wide
kubectl -n demo get event --sort-by=.lastTimestamp
kubectl -n demo describe pod <pod-name>
kubectl -n demo logs <pod-name> --all-containers --tail=200
kubectl -n demo logs <pod-name> --all-containers --previous --tail=200
```

同时记录：

- 集群与 `kubectl` 版本；
- Namespace、Deployment、ReplicaSet 和 Pod 名称；
- 镜像 digest；
- 最近一次发布或配置变更；
- 问题开始时间；
- 是否只影响部分节点或可用区。

## Pending：先确认是否已经调度

Pending 包括等待调度，也可能包括镜像下载等启动准备。`PodScheduled=False` 和 `FailedScheduling` 才指向调度阶段；已经分配节点时，继续看镜像、卷挂载和容器事件。[Pod 生命周期](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)

常见原因：

- CPU、内存或 GPU request 无法满足；
- `nodeSelector`、Affinity 没有匹配节点；
- Taint 存在，但 Pod 没有对应 Toleration；
- PVC 尚未绑定；
- Namespace ResourceQuota 已耗尽；
- 拓扑约束无法满足。

```bash
kubectl -n demo describe pod <pod-name>
kubectl get node
kubectl describe node <node-name>
kubectl -n demo get resourcequota
kubectl -n demo get pvc
```

不要通过删除 request 让 Pod “先跑起来”。这会把调度失败变成节点资源争抢，问题只是换了一种表现。

## ImagePullBackOff：先确认镜像身份

按顺序检查：

1. 仓库、镜像名和 tag 是否存在；
2. Pod 使用的 ServiceAccount；
3. `imagePullSecrets` 是否在同一 Namespace；
4. Secret 类型和凭证是否有效；
5. 节点到镜像仓库的 DNS、网络和证书。

生产环境优先使用不可变 digest：

```yaml
image: registry.example.com/demo-api@sha256:<digest>
```

## CrashLoopBackOff：区分应用退出和探针杀死

```bash
kubectl -n demo logs <pod-name> -c <container> --previous
kubectl -n demo describe pod <pod-name>
```

检查容器的：

- `Last State`；
- `Reason` 和退出码；
- 启动命令；
- 环境变量和挂载；
- Startup、Liveness Probe 失败事件。

启动慢的应用应该使用 Startup Probe 给初始化留时间，而不是把 Liveness Probe 的阈值无限放宽。

## OOMKilled：限制只是结果，不一定是根因

确认：

```bash
kubectl -n demo get pod <pod-name> \
  -o jsonpath='{.status.containerStatuses[*].lastState.terminated.reason}'
kubectl top pod -n demo
kubectl top node
```

继续区分：

- 容器超过 memory limit；
- 节点出现 MemoryPressure；
- JVM、Node.js 等运行时没有感知容器限制；
- 短时峰值、缓存或内存泄漏；
- request 过低导致 Pod 被调度到拥挤节点。

不要只提高 limit。先用指标、Heap Dump 或 Profile 证明内存去了哪里。

## Running 但没有流量

检查 Service 是否真的选择到 Ready Pod：

```bash
kubectl -n demo get service demo-api -o yaml
kubectl -n demo get pod -l app=demo-api --show-labels
kubectl -n demo get endpointslice \
  -l kubernetes.io/service-name=demo-api -o yaml
```

常见问题：

- Service selector 与 Pod label 不一致；
- Readiness Probe 失败；
- `targetPort` 与容器监听端口不一致；
- 应用只监听 `127.0.0.1`；
- NetworkPolicy 拒绝流量；
- Ingress 指向错误 Service 或端口。

从集群内发起临时请求，先区分 Service 路径与 Ingress 路径。下面假设服务端口为 8080、健康路径为 `/health`；接入上一篇 Nginx 示例时改为 80 和 `/`：

```bash
kubectl -n demo run curl-debug --rm -it \
  --image=curlimages/curl --restart=Never -- \
  curl -sv http://demo-api:8080/health
```

## Distroless 镜像怎么排

业务容器里没有 shell 时，可用 Ephemeral Container（临时调试容器），无需永久扩充业务镜像：

```bash
kubectl debug -n demo -it <pod-name> \
  --image=busybox:1.36 \
  --target=<container-name>
```

调试容器会扩大当次会话的观察能力，仍然要遵循生产审批和审计要求。

## 最后形成证据链

一次有效排障记录至少包含：

```text
用户现象
→ 受影响资源
→ Kubernetes Condition / Event
→ 容器或网络证据
→ 根因
→ 修复
→ 回归与监控
```

延伸阅读：

- [Kubernetes：Troubleshooting Applications](https://kubernetes.io/docs/tasks/debug/debug-application/)
- [Kubernetes：Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes：kubectl debug](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
