---
title: "Spring Boot 3 与 GraalVM：什么时候值得用 Native Image"
description: "Native Image 把编译和部分初始化工作提前到构建期。用启动、内存、吞吐和兼容性四项指标判断是否值得切换。"
sidebar:
  order: 1
date: 2025-09-26
lastUpdated: 2026-10-11
---

Native Image 把 Java 应用提前编译为本地可执行文件，通常适合需要快速拉起、控制内存的服务和 CLI。它可能缩短启动时间、降低内存占用，但收益要在自己的应用上测，不能直接套用“毫秒启动”或“省 90% 内存”。

代价主要在构建和兼容性：编译需要更多时间与资源，动态加载、反射和代理也受到限制。**先比较启动、内存、吞吐和依赖兼容性，再决定是否切换。**

## 两条执行路径

| 部署方式 | 构建时做什么 | 运行时做什么 |
| --- | --- | --- |
| JVM + JIT | 编译为字节码 | 加载类、初始化应用，按运行热点编译优化 |
| Native Image + AOT | 分析可达代码，生成本地机器码；Spring 提前处理 Bean 定义 | 启动本地程序，执行应用逻辑与必要的运行期初始化 |

Spring AOT 提前处理的是 Bean 定义和创建逻辑，不能理解为“整个容器和所有 Bean 都在构建机上初始化好了”。Classpath 和决定 Bean 是否存在的条件需要在构建时确定；运行时配置的边界也随之变化。[Spring Boot 官方说明](https://docs.spring.io/spring-boot/3.5/reference/packaging/native-image/introducing-graalvm-native-images.html)

## 一个常见问题：JVM 正常，Native 反射报错

例如，订单对象通过反射参与序列化。静态分析没有覆盖这条路径时，需要补充元数据。Spring 和兼容依赖已生成的 hints 可以直接使用，**缺什么再补什么**。

单个绑定类型可以使用注解（以下为项目片段）：

```java
@RegisterReflectionForBinding(Order.class)
@Service
public class OrderService { ... }
```

复杂场景可以注册反射、资源和 JDK 代理，再挂到配置类上：

```java
public class MyRuntimeHints implements RuntimeHintsRegistrar {
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        // 示例：按实际调用补充成员范围，避免无差别注册所有成员
        hints.reflection().registerType(Order.class,
                MemberCategory.INVOKE_DECLARED_CONSTRUCTORS,
                MemberCategory.INVOKE_PUBLIC_METHODS);
        hints.resources().registerPattern("mapper/*.xml");
        hints.proxies().registerJdkProxy(OrderRepository.class);
    }
}

@Configuration
@ImportRuntimeHints(MyRuntimeHints.class)
public class NativeConfig { }
```

这段 registrar 演示注册入口，不是所有序列化库的完整配置。字段访问、JNI 等需求要按实际依赖检查。可以先查 [GraalVM Reachability Metadata](https://github.com/oracle/graalvm-reachability-metadata)，再参考 [Spring Runtime Hints](https://docs.spring.io/spring-framework/reference/core/aot.html#aot-hints) 和 [Boot 构建指南](https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html)。

## 切换前测这四项

使用同一套硬件、配置、数据和请求负载；长期吞吐比较要让 JVM 充分预热。

| 指标 | 怎么测 | 容易误判的地方 |
| --- | --- | --- |
| 冷启动 | 从创建进程到 readiness 就绪，或首个业务请求成功 | `time ./your-app` 测的是进程寿命；`Started` 日志也不等于业务已经可服务 |
| 内存 | 记录相同负载下的 RSS、容器 working set 和峰值 | 只看 Java 堆会漏掉其他内存；空闲值不能代表工作时峰值 |
| 吞吐与延迟 | 比较目标 QPS 下的 P99、错误率和资源消耗 | 启动快不等于持续处理请求更快 |
| 兼容性与构建 | 实测反射、代理、资源、目标平台和构建资源 | 编译通过不能代替 Native 业务测试 |

AOT 并非完全无法利用运行数据：部分 GraalVM 版本和发行版支持 PGO，用代表性负载采样后重新构建；当前 Community Edition 不支持这项功能。比较时应写清发行版和优化配置。[GraalVM PGO 文档](https://www.graalvm.org/latest/reference-manual/native-image/optimizations-and-performance/PGO/)

## 按约束选

| 你的主要约束 | 建议 |
| --- | --- |
| 频繁冷启动、内存配额小 | 优先试 Native，检查收益是否覆盖构建与适配成本 |
| 分发 CLI，不希望要求用户安装 JRE | Native 是候选；仍需按目标系统和架构构建 |
| 长期运行，主要瓶颈在吞吐或数据库 | 先优化真实瓶颈，再比较 Native 与 JVM |
| 动态加载或依赖适配困难 | 先保留 JVM，算清迁移成本 |

本地开发可以继续使用 JVM，把较重的 Native 构建放到资源合适的构建机或 CI。是否采用，以目标环境的结果和维护成本为准。
