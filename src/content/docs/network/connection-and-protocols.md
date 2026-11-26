---
title: "从 TCP 到 HTTP/3：连接、加密与应用协议"
description: "讲清 TCP 建连与可靠传输、流控与拥塞控制、TLS 1.3、HTTP 演进与 QUIC，以及 RPC、WebSocket、MQTT、流媒体与负载均衡的分工与选型。"
date: 2026-11-26
lastUpdated: 2026-11-26
verifiedAgainst: "RFC 9293、8446、9110、9113、9114、9000/9001、7519、6455、3550、2326，2026-11-26"
sidebar:
  label: 连接与协议
---

网络调用的可靠性、延迟和安全性，由协议栈的几个选择决定。理解每个协议解决了什么、代价转嫁给了谁，比记住报文格式更有用。

## 1. TCP、UDP、KCP 与 Socket：传输层怎么选

### TCP 与 UDP 的四维对比

TCP 面向连接，确认、重传、排序换来可靠，字节流交付没有消息边界——粘包问题正源于此。UDP 无连接、8 字节头部、数据报保留边界，但大包靠 IP 分片、丢一片重传整包，KCP 用带宽换延迟补上可靠。Socket 是操作系统暴露的编程接口，连接由四元组唯一标识。选型主线：怕错选可靠，怕卡就丢包换实时。

<div class="article-diagram-scroll" role="region" aria-label="TCP 与 UDP 对比及 Socket 抽象，窄屏可横向滚动" tabindex="0">

![TCP 与 UDP 的四维对比、KCP 的位置与 Socket 编程接口](/images/network/connection-and-protocols/01-tcp-udp-socket.svg)

</div>

## 2. TCP 连接生命周期：握手、序号与关闭

### 三次握手、可靠传输与四次挥手

三次握手的本质是双向确认收发能力并同步初始序列号，双方还各自通告 MSS，两个方向可以不同。两次不行：延迟的旧 SYN 会让服务端为早已放弃的连接空等；四次多余：SYN 与 ACK 可合并。可靠性靠序号、累积 ACK、重传计时器、快速重传与 SACK 组合。关闭用四次挥手，主动方在 TIME_WAIT 等 2MSL，保证最后一个 ACK 丢失时能重发 FIN；高频短连接下 TIME_WAIT 堆积是容量问题。

<div class="article-diagram-scroll" role="region" aria-label="TCP 三次握手、可靠传输与四次挥手，窄屏可横向滚动" tabindex="0">

![三次握手与 MSS 通告、序号与 ACK/SACK、四次挥手与 TIME_WAIT](/images/network/connection-and-protocols/02-tcp-lifecycle.svg)

</div>

## 3. 流量控制与拥塞控制：保护接收方，也保护网络

### 流量控制：保护接收方

应用读得慢，内核缓冲区就会溢出丢包。接收方在每个 ACK 携带接收窗口，发送窗口分已确认、已发未确认、可发送、不可发送四区并随 ACK 右滑。缓冲区满时通告零窗口，发送方用持续计时器定期探测，防止窗口更新丢失造成互等死锁。应用每次只读几字节会通告小窗口、让网络塞满小包（糊涂窗口综合症），解法是接收方攒够空间再通告、发送方凑够数据再发。

<div class="article-diagram-scroll" role="region" aria-label="滑动窗口、零窗口与糊涂窗口综合症，窄屏可横向滚动" tabindex="0">

![接收窗口四区滑动、零窗口探测与糊涂窗口综合症的解法](/images/network/connection-and-protocols/03-flow-control.svg)

</div>

### 拥塞控制：保护中间网络

发送方维护拥塞窗口，与接收窗口取小作为实际发送上限。Reno 是丢包驱动：慢启动指数增长、过阈值线性增长，丢包即快重传快恢复、窗口减半，高带宽下随机丢包就减半、浪费严重。CUBIC 是 Linux 默认，用三次函数逼近丢包时的最大窗口，适配高带宽长距离，但无线随机丢包照样误降速。BBR 是模型驱动，采样瓶颈带宽和最小 RTT 建模，在 Wi-Fi 与 4G/5G 上更好；短板是与丢包驱动流共存时的公平性和探测期排队波动。

<div class="article-diagram-scroll" role="region" aria-label="Reno、CUBIC 与 BBR 拥塞控制对比，窄屏可横向滚动" tabindex="0">

![发送上限取小与 Reno、CUBIC、BBR 三种速率决策的对比](/images/network/connection-and-protocols/04-congestion-control.svg)

</div>

## 4. 连接管理的工程现实：长短连接、Keepalive、超时与 RST

### 长短连接与两层 Keepalive

短连接一次请求一条连接、用完四次挥手；长连接建一次复用多次、靠连接池管理，HTTP/1.1 起持久连接就是默认。长连接的坑：NAT 或防火墙清掉会话表后复用收到 RST、连接泄漏耗尽句柄、服务端重启留下死连接、心跳频率难权衡。注意 NAT 会改写地址和端口，响应路径也不保证对称。Keepalive 分两层：TCP Keepalive 是内核级探测，HTTP Keep-Alive 是应用层复用；拔了网线没有报文交互，就没有失败信号。

<div class="article-diagram-scroll" role="region" aria-label="长短连接对比与两层 Keepalive，窄屏可横向滚动" tabindex="0">

![长短连接的收益与坑、TCP 与 HTTP 两层 Keepalive 的分工](/images/network/connection-and-protocols/05-connection-management.svg)

</div>

### 超时、RST 与连接容量

连接超时管建连阶段，读写超时管已建立连接上的单次收发，都应小于中间设备的空闲清理时间，否则永远在复用已被静默回收的连接。RST 三成因：访问未监听端口、空闲连接被中间设备清理后再发数据、服务端重启丢状态；排查先抓包确定谁发的。65535 限制的是单客户端源端口数而非服务器上限，真实瓶颈是文件描述符、每连接内存和 CPU；listen 的 backlog 队列满时新 SYN 被直接丢弃，客户端表现为连接超时而非拒绝。

<div class="article-diagram-scroll" role="region" aria-label="超时分类、RST 排查与连接容量，窄屏可横向滚动" tabindex="0">

![连接与读写超时的分工、RST 三成因排查顺序与连接容量瓶颈](/images/network/connection-and-protocols/06-timeout-rst.svg)

</div>

## 5. HTTPS 与 TLS 1.3：把不可信信道变成可信信道

### 混合加密与证书链

对称加密快，但密钥要经不可信信道分发，形成死结；非对称加密让公钥可以公开，但慢且只能解决单向问题，于是有了混合加密：用非对称手段护送对称会话密钥。公钥仍可能被中间人调包且双方无感，于是引入 CA：用私钥对服务器公钥信息签名形成证书，浏览器用预置根证书沿证书链验签，伪造者盖不出 CA 的章。“用服务器公钥加密预主密钥”的 RSA 密钥交换是演进史上的经典模型，不是现行流程。

<div class="article-diagram-scroll" role="region" aria-label="HTTPS 加密演进与证书链，窄屏可横向滚动" tabindex="0">

![对称、非对称、混合加密与 CA 证书链的演进链条](/images/network/connection-and-protocols/07-tls-evolution.svg)

</div>

### TLS 1.3 的三件事与 0-RTT

瘦身：移除 RC4、DES、CBC、MD5/SHA-1 与 RSA 静态密钥交换，只保留 AEAD 套件。提速：密钥协商材料随 ClientHello 携带，握手压到 1-RTT，ServerHello 之后全部加密；为兼容中间设备，legacy_version 仍写 1.2，真实版本由 supported_versions 扩展协商。安全：密钥交换统一走 ECDHE 临时密钥（推荐 X25519），每次会话独立，拿到长期私钥也解不开历史流量，即前向安全；会话密钥由 HKDF 派生。PSK 恢复会话可 0-RTT——握手同时携带 early data，但可被重放，只应用于幂等请求并配合时间戳或随机数校验。

<div class="article-diagram-scroll" role="region" aria-label="TLS 1.3 握手与 0-RTT，窄屏可横向滚动" tabindex="0">

![TLS 1.3 的 1-RTT 握手、ECDHE 前向安全与 0-RTT 的重放限制](/images/network/connection-and-protocols/08-tls13.svg)

</div>

## 6. HTTP：报文、状态码、身份认证与 HTTP/3

### 报文模型与状态码

HTTP 是一问一答：请求报文由请求行、请求头和可选请求体组成，响应报文由状态行、响应头和响应体组成；方法表动作、路径表对象、状态码表结果，一个网页背后是多次请求响应。状态码五类，排障按 4xx 查请求、5xx 查后端划分责任：记住 500 内部错误、502 网关拿到无效响应、503 过载、504 网关超时；3xx 里 301 可能被缓存、304 是缓存协商而非跳转。

<div class="article-diagram-scroll" role="region" aria-label="HTTP 报文结构与状态码，窄屏可横向滚动" tabindex="0">

![请求响应报文结构与五类状态码速查](/images/network/connection-and-protocols/09-http-basics.svg)

</div>

### Cookie、Session 与 JWT

HTTP 无状态，身份认证是补出来的。Cookie 让浏览器自动保存并携带登录标记，配合签名与 HttpOnly、Secure、SameSite 缓解 XSS 与 CSRF。Session 把数据挪到服务端，但分布式部署下请求被负载均衡打到别的机器就掉登录，常规解法用 Redis 中心化存储。移动端没有自动携带机制，用客户端维护的 Token；JWT 是其标准化：重算签名即可校验、无需查会话存储，但 Payload 只签名不加密，且签发后难吊销，靠短过期加刷新弥补。

<div class="article-diagram-scroll" role="region" aria-label="Cookie、Session 与 JWT 演进，窄屏可横向滚动" tabindex="0">

![身份认证从 Cookie、Session 到 JWT 的演进与各自边界](/images/network/connection-and-protocols/10-authentication.svg)

</div>

### HTTP/1.1 与 HTTP/2

HTTP/1.1 引入持久连接，但请求串行、有应用层队头阻塞，浏览器只好对每个域名并行开多条连接——“每域名约 6 条”是实现策略而非协议规定，pipelining 因响应须按序返回而名存实亡。HTTP/2 改用二进制帧，多个流在同一连接内交错传输，多路复用解决 HTTP 层队头阻塞，配合 HPACK 头部压缩；服务器推送因浪费带宽少有浏览器启用。但 TCP 层队头阻塞仍在：一个丢包卡住所有流，而 TCP 在内核里改不动。

<div class="article-diagram-scroll" role="region" aria-label="HTTP/1.1 与 HTTP/2 连接模型，窄屏可横向滚动" tabindex="0">

![应用层队头阻塞与 HTTP/2 多路复用的帧交错](/images/network/connection-and-protocols/11-http2.svg)

</div>

### QUIC、HTTP/3 与 HTTPDNS

QUIC 在用户态基于 UDP 重写可靠传输：握手与 TLS 1.3 合并为 1-RTT、可 0-RTT 恢复，流之间相互独立、单流丢包不阻塞其他流，连接 ID 让 Wi-Fi 切蜂窝、IP 变了连接也不断。HTTP/3 就是跑在 QUIC 上的 HTTP；工程上不要唯版本论，优先 HTTP/3、链路不通时自动降级到 HTTP/2 或 1.1。HTTPDNS 让 App 通过 HTTP/HTTPS 接口直接解析，防 UDP 53 明文查询被劫持，并按出口 IP 就近返回列表自行择优。

<div class="article-diagram-scroll" role="region" aria-label="QUIC、HTTP/3 与 HTTPDNS，窄屏可横向滚动" tabindex="0">

![QUIC 消除 TCP 层队头阻塞、HTTP/3 降级链与 HTTPDNS](/images/network/connection-and-protocols/12-quic-httpdns.svg)

</div>

## 7. RPC、gRPC、WebSocket 与 MQTT：应用协议的四种分工

### 四种分工怎么选

RPC 是思路而非协议：像调本地函数一样调远端，服务发现走注册中心、序列化用 Protobuf；gRPC 是其中事实标准之一，HTTP/2 承载、支持四种调用模式，对外接口仍普遍用 HTTP。WebSocket 补服务端推送的短板：握手带 Upgrade: websocket、回 101 后同一 TCP 连接切换为全双工帧通道，配 Ping/Pong 心跳防中间设备清空闲连接。MQTT 为物联网而生：发布订阅、固定头部最小 2 字节、QoS 三档、遗嘱消息与持久会话；HTTP 每次带完整头部、下发只能轮询，在弱网低算力海量设备场景结构性吃亏。

<div class="article-diagram-scroll" role="region" aria-label="RPC、gRPC、WebSocket 与 MQTT 的分工，窄屏可横向滚动" tabindex="0">

![四种应用协议的通信模型与适用场景](/images/network/connection-and-protocols/13-application-protocols.svg)

</div>

## 8. 流媒体与实时传输：RTMP、RTP/RTSP、HLS 与 WebRTC

### 推流、拉流与实时通信

推流主流是 RTMP：跑在 TCP 1935 端口，握手、connect、createStream、publish 之后开推，消息切成默认 128 字节 chunk 交错发送，端到端延迟经验量级 1–3 秒。拉流分发两条路：HTTP-FLV 与 RTMP 同量级但依赖播放器；HLS 用 TS 分片加 M3U8 索引，CDN 友好、苹果原生支持，代价是 5–30 秒延迟。监控与 IPTV 用 RTSP 传信令、RTP 传媒体，RTP 通常走 UDP 换低延迟，也有 RTP over TCP 换 NAT 穿透；WebRTC 用 STUN/ICE/TURN 穿透、SRTP 传媒体，延迟可到 1 秒内，大规模分发仍需媒体服务器转发。协议延迟不等于端到端延迟，采集、转码、分发都在叠加。

<div class="article-diagram-scroll" role="region" aria-label="直播与实时通信协议全景，窄屏可横向滚动" tabindex="0">

![推流、拉流、监控与点对点实时通信的协议分工与延迟量级](/images/network/connection-and-protocols/14-streaming.svg)

</div>

## 9. 微服务、容器与负载均衡：把协议跑在生产环境

### 分层配合的入口链路

微服务把单体拆成独立部署、扩容的服务，靠注册中心做服务发现，代价是超时、重试、熔断成了必修课；Docker 抹平环境差异，Kubernetes 负责编排。四层负载均衡只看 IP 和端口，LVS 有 NAT、DR、TUN、FULLNAT 四种模式——DR 只改 MAC、响应由后端直接回客户端，吞吐最高但要求同网段。七层终止 TLS、按路径域名路由、灰度限流。实践分层配合：四层扛连接、七层管路由，健康检查与会话保持要对齐上文的 Keepalive 与超时——中间层清连接而端点不知道，就是线上 RST 的经典来源。

<div class="article-diagram-scroll" role="region" aria-label="微服务、容器与负载均衡分层，窄屏可横向滚动" tabindex="0">

![微服务与容器编排架构、LVS 四种模式与四层七层负载均衡分工](/images/network/connection-and-protocols/15-delivery.svg)

</div>

从 Socket 到负载均衡，每个协议都是取舍：可靠性换延迟、状态换简单、灵活换开销。选型没有越新越好——HTTP/3 要配降级链，长连接要配心跳和超时，0-RTT 要限制幂等。先排定业务对延迟、可靠性和运维成本的优先级，再让协议去匹配。
