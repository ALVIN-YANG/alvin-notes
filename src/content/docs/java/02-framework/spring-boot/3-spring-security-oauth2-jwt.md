---
title: "Spring Security + JWT：验签、授权与注销边界"
description: "配置 JWT 资源服务器，区分签名与授权，处理 issuer、audience、角色映射、密钥轮换和撤销需求。"
sidebar:
  order: 3
date: 2025-10-10
lastUpdated: 2026-10-11
---

JWT 可以让资源服务器在本地验证签名，减少对集中登录状态的查询。它不会自动解决注销、封禁或权限变更：如果每次只验签，已签发的 Token 通常会有效到过期；需要即时撤销，就要加入状态检查或其他撤销机制。

例如，用户被封禁后，旧 Token 仍能访问接口。缩短有效期只能缩短风险窗口；要求立即失效时，还要检查撤销记录，并阻止继续刷新。

## 一次请求要检查什么

| 检查 | 作用 |
| --- | --- |
| 允许的签名算法与可信公钥 | 防止伪造；不能信任 Token 自己指定的任意密钥来源 |
| `iss`、`aud`、`exp`、`nbf` | 确认签发者、目标服务和有效时间 |
| scope、角色与业务对象权限 | 已认证不等于有权读取任意订单 |
| 撤销或账号状态 | 按业务要求处理注销、封禁和权限变更 |

签名 JWT 的 payload 通常可以直接读，**签名不是加密**，不要放秘密。多服务部署常用非对称签名，让资源服务持有公钥却无法签发 Token；RSA 是一种选择，也可以按体系使用合适的 EC 等算法。HMAC 的验签方同时持有签发能力，需要更严格的信任边界。

## Spring Boot 3 资源服务器示例

引入依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

以下是配置示例，域名和 audience 换成自己的认证体系：

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://auth.example.com
          jwk-set-uri: https://auth.example.com/oauth2/jwks
          audiences: https://api.example.com
```

同时指定 issuer 和 JWK Set URI，既能验证 `iss`，又不必通过发现端点获取 JWK 地址。公钥的获取、缓存和轮换按框架配置处理，不等于每次请求都查认证中心。较早的 Boot 版本若不支持 `audiences` 属性，用自定义 validator 校验 `aud`。[Spring Security 官方文档](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)

```java
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 仅适用于凭证由客户端主动放入 Authorization 头的 API
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
```

这是过滤链片段，省略 imports。默认 scope 映射为 `SCOPE_` 权限；示例中的 `hasRole("ADMIN")` 要有明确的 `ROLE_ADMIN` 映射，不能以为 Token 带了 roles 字段就自动生效。

若浏览器会自动附带 Cookie 等认证凭证，仍需评估 CSRF；把 Refresh Token 放在 HttpOnly Cookie 中，只能减少脚本读取风险，刷新端点仍需保护。[CSRF 官方说明](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)

## 注销与封禁怎么选

| 要求 | 做法 | 代价 |
| --- | --- | --- |
| 允许短暂风险窗口 | 短期 Access Token，刷新时检查账号状态 | 注销后旧 Token 可能仍有效；15 分钟只是示例 |
| 撤销单个 Token | 用 `jti` 记录撤销，保留到其过期 | 请求需查询撤销状态，所有可达入口都要执行 |
| 封禁整个账号 | 校验账号状态或 Token 版本，并撤销刷新凭证 | 不能仅把 userId 按某一个 Token 的剩余寿命过期 |
| 使用本地缓存减少查询 | 明确最大缓存延迟与更新方式 | 缓存会扩大撤销生效窗口，故障时放行还是拒绝也要定义 |

黑名单重新引入集中状态，其体积取决于实际撤销量，不能保证“小几个数量级”。共享 Session、Token introspection 和 JWT 都是可选方案；先确定失效时效与可用性要求，再选状态放在哪里。
