---
title: 获取用户真实 IP
description: 反向代理与负载均衡下如何正确获取客户端真实 IP，以及 X-Forwarded-For 的信任边界
slug: network/client-real-ip
date: 2025-10-12
lastUpdated: 2026-10-11
---

**获取客户端 IP，先确认请求是从哪台可信代理来的，再读取它重写的转发头。** `X-Forwarded-For`（XFF）可以被客户端伪造，不能直接取最左边一项。代理之后的应用，默认看到的是代理的 TCP 地址。

最容易混淆的是两层配置：Nginx 的 realip 模块只改变 Nginx 看到的地址；Java 应用还需要可信转发头解析，`request.getRemoteAddr()` 才会返回经过转换的客户端地址。[Nginx realip](https://nginx.org/en/docs/http/ngx_http_realip_module.html)、[Tomcat Remote IP Valve](https://tomcat.apache.org/tomcat-10.1-doc/config/valve.html#Remote_IP_Valve)

## 先看一个伪造请求

```bash
curl -H 'X-Forwarded-For: 8.8.8.8' https://example.test/
```

假设实际客户端是 `198.51.100.20`，入口代理追加自己的对端地址，应用收到：

```text
X-Forwarded-For: 8.8.8.8, 198.51.100.20
```

| 取法 | 得到什么 |
| --- | --- |
| 无条件取第一项 | 攻击者填写的 `8.8.8.8` |
| 从右往左，跳过已知可信代理 | 信任边界外的第一个地址 |
| 可信入口重写为已确认地址 | 应用只收到入口确认的一项 |

XFF 通常是 `client, proxy1, proxy2`。每个追加式代理加的是自己的对端地址；最右边并不一定是最后一台代理，最后一跳还要从实际 TCP 对端开始判断。

## 一层 Nginx：重写后再转发

拓扑是“公网客户端 → Nginx → Tomcat”。Nginx 直接面对公网，不信任客户端提交的 XFF：

```nginx
location / {
    proxy_pass http://app:8080;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

这会丢弃客户端伪造的值。`$proxy_add_x_forwarded_for` 则保留旧 XFF，再追加 `$remote_addr`，适合已经建立可信链的场景，不能与“无条件取第一项”一起使用。[proxy_set_header 与变量](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)

Tomcat 10.1 在 `server.xml` 的 `Host` 内配置 RemoteIpValve。下面只信任示例 Nginx 地址 `10.0.0.10`，部署时换成实际地址：

```xml
<Valve className="org.apache.catalina.valves.RemoteIpValve"
       internalProxies="10\.0\.0\.10"
       remoteIpHeader="X-Real-IP"
       protocolHeader="X-Forwarded-Proto" />
```

完成这层解析后，Servlet 读取：

```java
String clientIp = request.getRemoteAddr();
```

未配置 Valve、框架等可信解析时，这行仍返回代理地址。应用端口也要限制为只接受代理访问，避免绕过入口；不要为方便把所有内网或所有来源都设成可信代理。[RemoteIpValve 的信任配置](https://tomcat.apache.org/tomcat-10.1-doc/config/valve.html#Remote_IP_Valve)

## 前面还有 CDN 或负载均衡

此时 Nginx 的 TCP 对端是 CDN/LB。先用 realip 模块，只信任它们已确认的回源地址，再用上一节的配置把解析结果转给应用：

```nginx
# 地址仅作示意，替换为服务商实际、持续维护的可信回源段
set_real_ip_from 203.0.113.10;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

`real_ip_recursive on` 会在原对端可信时，从链尾找最后一个不可信地址。若服务商使用专用头，则按其合同配置相应头，不能把公网任意提交的 `CF-Connecting-IP` 等头直接当真。

模块并非 Nginx 默认编译项，用 `nginx -V` 检查 `--with-http_realip_module`。原始对端可以通过 `$realip_remote_addr` 留在日志里，便于追查代理链。[realip 指令与版本](https://nginx.org/en/docs/http/ngx_http_realip_module.html)

## 上线前验证三个请求

| 请求 | 应观察到的结果 |
| --- | --- |
| 正常经过代理 | 应用读到实际客户端地址 |
| 伪造 XFF、X-Real-IP | 入口重写后，伪造值不影响应用判断 |
| 尝试直连应用 | 被网络规则阻断，或按明确的直连策略处理；不信任转发头 |

客户端 IP 只是连接来源线索，还可能代表 NAT、VPN 或代理出口，不能代替用户身份和权限校验。自己实现解析时，还要处理多值头、IPv6、地址合法性与可信 CIDR；优先复用服务器或框架已有机制。
