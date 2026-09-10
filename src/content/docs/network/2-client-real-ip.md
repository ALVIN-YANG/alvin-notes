---
title: 获取用户真实 IP
description: 反向代理与负载均衡下如何正确获取客户端真实 IP，以及 X-Forwarded-For 的信任边界
slug: network/client-real-ip
date: 2025-10-12
lastUpdated: 2025-12-04
---

## X-Forwarded-For

X-Forwarded-For 是 HTTP 头的一个字段，最开始是由 Squid 这个缓存代理软件引入，在客户端访问服务器的过程中如果需要经过 HTTP 代理或者负载均衡服务器，可以被用来获取最初发起请求的客户端的 IP 地址，如今它已经成为事实上的标准，被各大 HTTP 代理、负载均衡等转发服务广泛使用。
X-Forwarded-For 格式：

```
X-Forwarded-For: <client>, <proxy1>, <proxy2>
```

- client：客户端的 IP 地址。
- proxy1, proxy2：如果一个请求经过了多个代理服务器，那么每一个代理服务器的 IP 地址都会被依次记录在内。也就是说，最右端的 IP 地址表示最近通过的代理服务器，而最左端的 IP 地址表示最初发起请求的客户端的 IP 地址。

## Nginx 添加 X-Forwarded-For

```
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

$proxy_add_x_forwarded_for 变量的值获取逻辑：

- 如果请求中不带 X-Forwarded-For 头，那么取$remote_addr 的值；
- 如果请求中带 X-Forwarded-For 头，那么在 X-Forwarded-For 后追加$remote_addr，即: X-Forwarded-For,$remote_addr

## X-Forwarded-For 伪造

因为 X-Forwarded-For 只是 http 的请求的一个头，如果请求时带上一个一个伪造的 X-Forwarded-For（使用 curl -H 'X-Forwarded-For: 8.8.8.8' http://www.dianduidian.com 一条命令就能实现），这时 Nginx 如果使用上边的配置的话由于 X-Forwarded-For 不为空，所以 Nginx 只会在现在值的基础上追加，这样后端服务在拿到头后根据约定取最左边 ip 话就会拿到一个伪造的 IP，会有安全风险。

## 解决 X-Forwarded-For 伪造

TCP 不像 UDP 必须经过 3 次握手，客户端的 IP 是无法伪造的，所以最外层的代理一定要取$remote_addr 的值，对应配置：

```
proxy_set_header X-Forwarded-For $remote_addr;
```

## 实际情况

使用云服务的 CDN 作为最外层代理就不用考虑 X-Forwarded-For 伪造问题，CDN 厂商肯定已经考虑到了。
所以
只需要 nginx 配置

```
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

就可以逗号分割获取第一个 ip 即为用户真实 ip, 具体代码：

```
public static String getRequestIp(HttpServletRequest request) {
    String ip = request.getHeader("X-Forwarded-For");
    if (StringUtils.hasText(ip) && ip.contains(",")) {
        ip = ip.split(",")[0];
    }
    return ip;
}
```
