---
title: "输入网址后，数据包经历了什么：网络基础与完整链路"
description: "从分层模型、DHCP 入网、DNS 与 ARP、路由与 NAT，到无线接入、安全加速，最后把输入网址到页面显示的完整链路串成一条线。"
date: 2026-11-26
lastUpdated: 2026-11-26
verifiedAgainst: "RFC 791、RFC 8200、RFC 1918、RFC 2131、RFC 1034、RFC 8446 与 IEEE 802.11 公开规范，2026-11-26"
sidebar:
  label: 数据包完整链路
---

输入网址到页面显示，网络做的事是一条链：域名翻译成 IP，局域网里找到下一跳，逐跳路由到服务器，响应沿路返回。看懂它只需三对概念：IP 管"去哪"、MAC 管"到了找谁"；同网段靠交换机、跨网段靠路由器；每层只加自己的头部、只拆自己的头部。

## 1. 分层模型与术语：一份数据，四层名字

### 分层与封装：报文、段、包、帧

真实设备跑的是 TCP/IP 四层模型：应用层、传输层、网际层、网络接口层，应用层合并了 OSI 的应用、表示、会话三层。报文、段、包、帧不是四种东西，而是同一份数据在每层换的名字——每下一层多包一层头部，接收端按相反顺序拆开。

<div class="article-diagram-scroll" role="region" aria-label="分层模型与数据封装，窄屏可横向滚动" tabindex="0">

![OSI 与 TCP/IP 分层对应关系，以及报文、段、包、帧随层封装](/images/network/packet-journey/01-layers.svg)

</div>

## 2. 设备入网：DHCP、IP 地址与子网

### DHCP：四步拿到地址

设备入网的第一件事是拿到 IP 地址，通常由 [DHCP](https://www.rfc-editor.org/rfc/rfc2131) 自动完成。客户端还没有地址时只能广播寻找服务器，四步交互后租约生效；之后按租期续约，续约失败就停用地址、重新申请。

<div class="article-diagram-scroll" role="region" aria-label="DHCP 四步分配地址与租约续约，窄屏可横向滚动" tabindex="0">

![DHCP 四步交互：Discover、Offer、Request、ACK 与租期续约](/images/network/packet-journey/02-dhcp.svg)

</div>

### IP、子网掩码与私有地址

IPv4 地址是 32 位二进制数，点分十进制书写，同时携带网络号与主机号，子网掩码就是切分这两段的尺子。公网地址全球唯一，[RFC 1918](https://www.rfc-editor.org/rfc/rfc1918) 划了三段私网地址供内部自由使用；虚拟机网络也是同一套概念的四种模式。

<div class="article-diagram-scroll" role="region" aria-label="IPv4 地址结构、子网掩码与私有地址段，窄屏可横向滚动" tabindex="0">

![IPv4 地址结构、子网掩码切分、RFC 1918 私网地址与虚拟机网络模式](/images/network/packet-journey/03-ip-subnet.svg)

</div>

## 3. 名字与邻居：DNS、ARP 与局域网交付

### DNS：递归查询与迭代查询

网络只认 IP，域名要先翻译成地址。客户端把查询交给本地 DNS（LocalDNS），只要结果，这一步叫递归查询；LocalDNS 没缓存时依次问根、顶级域、权威服务器，每层只指出下一个该问谁，这一步叫迭代查询。

<div class="article-diagram-scroll" role="region" aria-label="DNS 层级解析与根服务器任播，窄屏可横向滚动" tabindex="0">

![DNS 层级解析：递归查询、迭代查询与 13 个根地址的任播镜像](/images/network/packet-journey/04-dns.svg)

</div>

### ARP 与三张表

拿到 IP 后还要回答"这个 IP 对应哪块网卡"，这由 ARP 完成。局域网交付靠 ARP 表、MAC 表、路由表三张表接力，依据是包上的四个地址：源/目的 IP 与源/目的 MAC。VLAN 把一台物理交换机划成多个广播域，跨 VLAN 互访要三层设备转发，大流量场景用三层交换机做到"一次路由、多次转发"。交付方式则分单播、广播、组播三种。

<div class="article-diagram-scroll" role="region" aria-label="ARP 解析、三张表分工与三种交付方式，窄屏可横向滚动" tabindex="0">

![ARP 地址解析、ARP/MAC/路由三张表分工与单播广播组播交付方式](/images/network/packet-journey/05-arp-tables.svg)

</div>

## 4. 跨网段：路由、网关、NAT、IPv6 与 MTU

### 网关与最长匹配

目的地不在本子网，包就交给网关——网关不是具体设备而是逻辑角色，默认网关就是默认路由的下一跳。路由器逐跳转发，查路由表时用最长匹配原则：多条网段都匹配时，选前缀最长、范围最精确的那条。

<div class="article-diagram-scroll" role="region" aria-label="路由器逐跳转发与最长匹配，窄屏可横向滚动" tabindex="0">

![路由器转发四件事、最长匹配原则与每跳地址变化](/images/network/packet-journey/06-routing.svg)

</div>

### NAT、MTU 与 IPv6

NAT 解决私网地址如何上公网：出方向改写源地址和端口，入方向按映射表对号入座，代价是外网无法主动连入。包的尺寸受 MTU 与 MSS 约束，超 MTU 的 IPv4 包会分片，工程上用 PMTUD 规避；IPv6 是地址枯竭的最终解法，但迁移仍在路上。

<div class="article-diagram-scroll" role="region" aria-label="NAT 地址端口改写与 MTU、MSS 约束，窄屏可横向滚动" tabindex="0">

![NAT 地址端口改写、MTU 与 MSS 约束及 IPv6 过渡](/images/network/packet-journey/07-nat-mtu.svg)

</div>

## 5. 无线接入：WiFi 与蜂窝

### 频段取舍与物理层三件套

WiFi 信号进家主要靠反射和绕射，而不是硬穿墙体：2.4GHz 覆盖大但拥挤，5GHz 快但衰减大，6GHz 干净但覆盖最小。速率靠 QAM、OFDM、MIMO 三项物理层技术堆出来；代际上 Wi-Fi 4 引入 MIMO，Wi-Fi 6 转向多设备并发，Wi-Fi 7 峰值约 46Gbps，Wi-Fi 8 转向可靠性。

<div class="article-diagram-scroll" role="region" aria-label="WiFi 频段取舍与物理层三件套，窄屏可横向滚动" tabindex="0">

![WiFi 三个频段传播特性与 QAM、OFDM、MIMO 物理层技术](/images/network/packet-journey/08-wireless.svg)

</div>

### WiFi 与蜂窝：分工而非替代

蜂窝覆盖主力用低频，宏基站功率比家用路由器高数百倍，频谱是运营商花钱买的授权频段，干扰可控，加上统一建设的小区切换漫游，才撑得起高铁和旷野。5G 中高频单站半径只有数百米，低频段仍可覆盖公里级，6G 预计 2030 年前后商用。分工由此清晰：WiFi 用免费频谱在局部提供大带宽，蜂窝用授权频谱换无处不在。

<div class="article-diagram-scroll" role="region" aria-label="WiFi 与蜂窝的功率、频谱与覆盖分工，窄屏可横向滚动" tabindex="0">

![WiFi 与蜂窝基站在功率、频谱、覆盖上的分工](/images/network/packet-journey/09-wifi-cellular.svg)

</div>

## 6. 安全、加速与排障

### 防火墙、DDoS 与 VPN

防火墙管"怎么防"，按端口、IP、连接状态、协议等规则放行或拦截。攻击面不止链路层：社会工程、密码攻击、中间人、漏洞利用和恶意软件同样高发；链路上最典型的是 ARP 欺骗和 DDoS，DDoS 不入侵只淹没，缓解靠 CDN 稀释、流量清洗和入口源地址过滤。VPN 用隧道封装加加密，在公共网络上建一条私有通道。

<div class="article-diagram-scroll" role="region" aria-label="防火墙规则、DDoS 攻击与缓解、VPN 隧道，窄屏可横向滚动" tabindex="0">

![防火墙规则、DDoS 三层攻击与缓解、VPN 隧道](/images/network/packet-journey/10-security.svg)

</div>

### CDN 与性能优化

CDN 把内容复制到离用户近的边缘节点：静态资源按缓存策略就近返回，动态内容靠边缘函数就近执行。性能优化是"测、析、改、验"的流程而非调参玄学，手段归为三个杠杆：减少传输量、提升通路效率、绕开瓶颈。

<div class="article-diagram-scroll" role="region" aria-label="CDN 边缘分发与性能优化三杠杆，窄屏可横向滚动" tabindex="0">

![CDN 边缘分发流程与性能优化三杠杆](/images/network/packet-journey/11-cdn-optimization.svg)

</div>

## 7. 完整旅程：一个数据包的一生

### 从 URL 到页面显示

把零件装回主线：浏览器解析 URL 后先查 DNS；操作系统逐层封装，按路由表选出口、按 ARP 找下一跳 MAC；帧经交换机与路由器逐跳转发，出私网时 NAT 改写地址端口；TCP 三次握手（HTTPS 再加 TLS 1.3）之后，HTTP 请求与响应才真正上路。

<div class="article-diagram-scroll" role="region" aria-label="输入网址后的完整链路与排障定位，窄屏可横向滚动" tabindex="0">

![从 DNS 解析、逐层封装、逐跳转发到响应返回的完整数据包旅程与排障方法](/images/network/packet-journey/12-full-journey.svg)

</div>

这条链上每一跳只做一件事，排障的本质就是在链上定位断点：ping 按回环 127.0.0.1 → 内网 IP → 网关 → 目标 IP → 域名的顺序由近及远定界，抓包看在哪一跳丢了头、改了地址或被重置。链路的确定性来自分层——每层契约稳定，上下层才能各自演进。
