---
title: MyBatis
description: MyBatis 持久层框架全面指南：SpringBoot 集成、XML Mapper、动态 SQL、缓存、TypeHandler、连接池选型
sidebar:
  label: MyBatis
date: 2025-09-20
lastUpdated: 2026-10-11
---

**MyBatis 让开发者写 SQL，再把参数和结果映射成 Java 对象。** 复杂联查、统计和动态条件较多时，SQL 控制权很有用；代价是自己维护语句与映射。下面保留 Spring Boot 接入、XML、缓存和 TypeHandler 的完整实操参考。[MyBatis 官方文档](https://mybatis.org/mybatis-3/zh_CN/index.html)

MyBatis 与 JPA 按项目需求选，不能用地区、年份或框架流行度代替判断。JPA 也能写 JPQL 和原生 SQL，MyBatis 也能承载复杂业务；先看主要维护成本在哪里。

## MyBatis 与 JPA 按什么条件选

| 主要需求 | 可考虑的起点 | 要承担什么 |
| --- | --- | --- |
| SQL、报表、复杂联查由团队直接控制 | MyBatis | SQL 与 ResultMap 维护，单表 CRUD 可用扩展简化 |
| 实体关系与持久化生命周期占主导 | JPA / Hibernate | 抓取计划、生成 SQL、事务与 N+1 查询控制 |
| 简单 CRUD | 已有持久化方案 | Spring Data、MyBatis-Plus 等都可减少样板，不必另换框架 |
| 写模型与复杂读模型差异明显 | 先分清职责，再评估是否混用 | 两套框架增加事务、缓存和维护边界，并非默认最优 |

JPA 的关联抓取并不自动免除查询优化。一次查出 N 个对象、随后逐个加载关联，可能增加 N 次查询；按需要使用 join fetch、EntityGraph 或 DTO。复杂 SQL 并非“不可控”，可以显式编写和验证。[Spring Data JPA](https://docs.spring.io/spring-data/jpa/reference/)、[Hibernate 抓取策略](https://docs.jboss.org/hibernate/orm/6.5/userguide/html_single/Hibernate_User_Guide.html#fetching)

SQL 需求明确时，MyBatis 的扁平 DTO 可以直接承载列表和报表。简单单表映射中，类、属性、对象常分别对应表、字段、记录；复杂查询不必强行维持一表一对象。

## SpringBoot 使用 MyBatis

- 与 Spring 一起使用 MyBatis，你至少需要一个 SqlSessionFactory 和一个 mapper 接口
- 在 SpringBoot 中可以直接引用 mybatis-spring-boot-starter 简化使用

引入依赖，版本需匹配当前 Spring Boot；占位变量由项目管理。MySQL 驱动坐标见[Connector/J Maven 安装](https://dev.mysql.com/doc/connector-j/en/connector-j-installing-maven.html)。

```xml
<dependencies>
  <!-- MySQL 驱动 -->
  <dependency>
      <groupId>com.mysql</groupId>
      <artifactId>mysql-connector-j</artifactId>
      <version>${mysql-connector.version}</version>
  </dependency>
  <!-- 引入 starter 更快使用 MyBatis -->
  <dependency>
    <groupId>org.mybatis.spring.boot</groupId>
    <artifactId>mybatis-spring-boot-starter</artifactId>
    <version>${mybatis-starter.version}</version>
</dependency>
</dependencies>
```

- [mybatis-spring-boot-starter 官方文档](https://github.com/mybatis/spring-boot-starter/blob/master/mybatis-spring-boot-autoconfigure/src/site/zh_CN/markdown/index.md)
- MyBatis-Spring-Boot-Starter 将会：
  - 默认搜寻带有 @Mapper 注解的 mapper 接口。（不过还是 [@MapperScan](https://mybatis.org/spring/zh_CN/mappers.html#mapperscan) 更方便）
  - 将使用 SqlSessionFactoryBean 创建并注册一个 SqlSessionFactory 的实例，并将探测到的 DataSource 作为数据源
  - 将创建并注册一个从 SqlSessionFactory 中得到的 SqlSessionTemplate 的实例
  - 自动扫描你的 mapper，将它们与 SqlSessionTemplate 相关联，并将它们注册到 Spring 的环境（context）中去，这样它们就可以被注入到你的 bean 中

```properties
# 数据库连接配置
spring.datasource.url=jdbc:mysql://localhost:3306/your_database_name?useUnicode=true&characterEncoding=utf-8&useSSL=false
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

### 环境变量与配置映射速查

Spring Boot 的松散绑定（Relaxed Binding）允许环境变量、命令行参数、配置文件使用不同命名风格，框架统一映射到同一个属性。环境变量优先级高于 `application.properties`/`application.yml` 中的同名配置，适合在容器和 CI 环境里覆盖配置。

规范配置名 → 环境变量的转换规则（[Spring Boot 官方文档：Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)）：

1. 把点 `.` 替换为下划线 `_`；
2. **删除**所有中划线 `-`；
3. 全部转为大写。

以数据源为例：

| 规范配置名 | 环境变量 |
| ---- | ---- |
| `spring.datasource.url` | `SPRING_DATASOURCE_URL` |
| `spring.datasource.username` | `SPRING_DATASOURCE_USERNAME` |
| `spring.datasource.driver-class-name` | `SPRING_DATASOURCE_DRIVERCLASSNAME` |

注意第三条：`driver-class-name` 的中划线是**删除**而不是转成下划线，所以是 `DRIVERCLASSNAME` 而不是 `DRIVER_CLASS_NAME`。

反方向也成立：同一个环境变量 `SPRING_DATASOURCE_URL` 可以覆盖 properties/yml 里的 `spring.datasource.url`，也能绑定到 `@ConfigurationProperties` 里的驼峰字段。另外命令行参数、properties 文件、yml 中的 `spring.datasource.url`、`spring.datasource.driver-class-name` 等不同写法，最终也都会被松散绑定到同一个属性。

创建 Mapper 接口

1、注解方式

直接在 mapper 接口的函数上使用 @Select @Insert @Update @Delete 注解

```java
@Mapper
public interface CityMapper {

  @Select("select id, name, state, country from city where state = #{state}")
  City findByState(@Param("state") String state);

}
```

2、xml 方式

在 `resources/mapper` 目录下创建与 Mapper 接口同名的 xml 文件

- `<mapper namespace="io.apache.dao.CityMapper">` 指向绑定的 Mapper 接口位置
- `<insert id="insertBatch">` 这里的 id 与 Mapper 中定义的接口要一致

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="io.apache.dao.CityMapper">

  <insert id="insertBatch">
    INSERT INTO city (country_id, name)
    VALUES
    <foreach collection="list" item="item" separator=",">
      (#{item.countryId}, #{item.name})
    </foreach>
  </insert>

</mapper>
```

## XML 方式实现 Mapper

### 参数关联

- 在 MyBatis 的 XML 映射文件中，可以通过 ${} 或 #{} 来引用参数。其中，${} 是直接替换的方式，而 #{} 是预编译处理，更安全（可以有效防止 SQL 注入）。

#### 单个参数

- Mapper 接口方法

```java
User getUserById(int id);

void insertUser(User user);
```

- XML 映射

```xml
<select id="getUserById" parameterType="int" resultType="User">
  SELECT * FROM user WHERE id = #{id}
</select>

<insert id="insertUser">
    INSERT INTO user (id, name, age)
    VALUES (#{id}, #{name}, #{age})
</insert>
```

#### 多个参数

- Mapper 接口方法

```java
void insertUserAndAddress(
    @Param("user") User user,
    @Param("address") Address address
);
List<User> getUsersByNameAndAge(@Param("name") String name, @Param("age") int age);
```

- XML 映射

```xml
<insert id="insertUserAndAddress">
    INSERT INTO user (id, name, age, city, street)
    VALUES (
        #{user.id},
        #{user.name},
        #{user.age},
        #{address.city},
        #{address.street}
    )
</insert>

<select id="getUsersByNameAndAge" parameterType="map" resultType="User">
SELECT * FROM user WHERE name = #{name} AND age = #{age}
</select>
```

### xml 结果映射

#### 单层结果

- 简单类型，或者返回值与结果完全匹配 ，直接写 `resultType`
- 属性无法匹配，通过 `resultMap` 定制匹配

```java
int selectUserCount();
User selectUserById(int id);
UserDTO selectUserById(int id);
```

```java
<select id="selectUserCount" resultType="int">
    SELECT COUNT(*) FROM users
</select>

<select id="selectUserById" parameterType="int" resultType="com.example.model.User">
    SELECT * FROM users WHERE id = #{id}
</select>

<resultMap id="userResultMap" type="com.example.dto.UserDto">
    <id property="id" column="user_id"/>
    <result property="name" column="user_name"/>
</resultMap>

<select id="selectUserById" resultMap="userResultMap">
    SELECT user_id AS id, user_name AS name FROM user WHERE user_id = #{id}
</select>
```

#### 一对一嵌套

- 常用于两个表有直接对应关系
- 使用 `<association>` 进行一对一映射

```java
public interface OrderMapper {
    Order selectOrderWithUser(Long id);
}
```

- `<association>` 内联 result

```xml
<resultMap id="OrderResultMap" type="io.apache.core.entity.Order">
    <id property="id" column="order_id"/>
    <result property="item" column="order_item"/>
    <!-- 内联  result -->
    <association property="user" javaType="io.apache.core.entity.User">
        <id property="id" column="user_id"/>
        <result property="name" column="user_name"/>
    </association>
</resultMap>

<select id="selectOrderWithUser" resultMap="OrderResultMap">
    SELECT o.id AS order_id, o.item AS order_item,
           u.id AS user_id, u.name AS user_name
    FROM Order o
    LEFT JOIN User u ON o.user_id = u.id
    WHERE o.id = #{id}
</select>
```

- `<association>` 继续引用 `resultMap`

```xml
<resultMap id="userMap" type="io.apache.core.entity.User">
  <id column="user_id" property="id" />
  <result property="name" column="user_name"/>
</resultMap>

<resultMap id="OrderResultMap" type="Order">
  <id property="id" column="order_id"/>
  <result property="item" column="order_item"/>
  <!-- 再次引用 resultMap -->
  <association property="user" resultMap="userMap" />
</resultMap>

<select id="selectOrderWithUser" resultMap="OrderResultMap">
  SELECT o.id AS order_id, o.item AS order_item,
  u.id AS user_id, u.name AS user_name
  FROM Order o
  LEFT JOIN User u ON o.user_id = u.id
  WHERE o.id = #{id}
</select>

```

#### 一对多嵌套

- 例如用户和该用户的订单
- `<collection>` 标签用于定义一对多的关系，其中 property 是 UserDO 类中的属性名，表示一个订单列表， ofType 指定了列表中元素的类型。

```xml
<resultMap id="userWithOrdersResultMap" type="ordersBO">
    <id property="id" column="id"/>
    <result property="username" column="username"/>
    <!--    一对多查询，嵌套结果映射-->
    <collection property="orders" ofType="orderDO">
        <id property="id" column="order_id"/>
        <result property="userId" column="id"/>
        <result property="goodsName" column="goods_name"/>
    </collection>
</resultMap>

<select id="selectUserWithOrders" resultMap="userWithOrdersResultMap">
    SELECT u.id, u.username, o.id as order_id, o.goods_name
    FROM user u
             LEFT JOIN `order` o ON u.id = o.user_id
    WHERE u.id = #{id}
</select>

```

### 模糊查询

`CONCAT('%', #{name}, '%')`

```xml
<select id="selectUsersByName" parameterType="String" resultType="User">
    SELECT * FROM users
    WHERE name LIKE CONCAT('%', #{name}, '%')
</select>
```

### 手动分页查询

```xml
<select id="selectUsersByPage" resultType="User">
    SELECT * FROM users
    LIMIT #{offset}, #{limit}
</select>
```

```java
List<User> selectUsersByPage(
    @Param("offset") int offset,
    @Param("limit") int limit
);
```

### 使用 PageHelper 分页查询

文档： [PageHelper](https://github.com/pagehelper/Mybatis-PageHelper)

- [使用方法](https://github.com/pagehelper/Mybatis-PageHelper/blob/master/wikis/zh/HowToUse.md)

SpringBoot 集成使用示例

- 引入依赖

```xml
<dependency>
  <groupId>com.github.pagehelper</groupId>
  <artifactId>pagehelper-spring-boot-starter</artifactId>
</dependency>
```

- 配置文件示例
  - [详细配置](https://github.com/pagehelper/Mybatis-PageHelper/blob/master/wikis/zh/HowToUse.md#5-%E5%88%86%E9%A1%B5%E6%8F%92%E4%BB%B6%E5%8F%82%E6%95%B0%E4%BB%8B%E7%BB%8D)
  - `reasonable`：默认 false，当该参数设置为 true 时，`pageNum<=0` 时会查询第一页， `pageNum>pages`（超过总数时），会查询最后一页。默认 false 时页码不对会抛异常
  - `support-methods-arguments`: 默认 false，可以使用方法的参数来传递页码和页面大小等分页信息

```yaml
# 分页配置
pagehelper:
  helper-dialect: mysql
  reasonable: true
  support-methods-arguments: true
```

- [在代码中使用](https://github.com/pagehelper/Mybatis-PageHelper/blob/master/wikis/zh/HowToUse.md#3-%E5%A6%82%E4%BD%95%E5%9C%A8%E4%BB%A3%E7%A0%81%E4%B8%AD%E4%BD%BF%E7%94%A8)

### 动态 SQL

`<where>`条件判断

- 如果 `<where>` 标签中的内容不为空，则会在内容前面添加 `WHERE` 关键字。
- 如果 `<where>` 标签中的内容以 `AND` 或` OR` 开头，会自动去掉前面多余的 `AND` 或 `OR`。

```xml
<select id="findUsers" parameterType="map" resultType="User">
  SELECT * FROM users
  <where>
    <if test="name != null">
      name = #{name}
    </if>
    <if test="age != null">
      AND age = #{age}
    </if>
  </where>
</select>


```

`<choose> ` 多分支选择

- 类似于 Java 中的 `switch` 语句。它可以根据不同的条件选择性地执行其中的一个分支。
- `when` 相当于 `case`，`otherwise` 相当于 `default`
- `<choose>` 标签中至少要有一个 `<when>` 标签，但 `<otherwise>` 标签是可选的。
- `<choose>` 标签中的条件是按顺序判断的，因此条件的顺序很重要。
- 如果没有匹配的 `<when>` 条件且没有 `<otherwise>` 标签，则不会添加任何条件。

```xml
<select id="findUsersByChoice" parameterType="map" resultType="User">
    SELECT * FROM users
    <where>
        <choose>
            <when test="name != null">
                name = #{name}
            </when>
            <when test="age != null">
                age = #{age}
            </when>
            <otherwise>
                status = 'ACTIVE'
            </otherwise>
        </choose>
    </where>
</select>
```

`<foreach>` 遍历集合（如 IN 查询）

- `collection`：被遍历的集合的名称，必填。可以是方法参数的名称、Map 中的键。
- `item`：每个元素的别名，用于在 SQL 语句中引用元素，必填，数组是元素，Map 是 value。
- `index`：可选，数组是坐标， Map 是 key。
- `open`：可选，生成的 SQL 片段的开头。
- `open`：可选，分隔符，用于分隔生成的 SQL 片段。
- `open`：可选，生成的 SQL 片段的结尾。

```xml
<delete id="deleteBatch" parameterType="array">
    delete from user where id in
    <foreach collection="array" item="id" index="index"
      open="(" close=")" separator=",">
        #{id}
    </foreach>
</delete>


```

```sql
# 生成的语句
delete from user where id in (1,2,3)
```

`<set>` 动态更新字段：

- `<set>` 标签：自动去除末尾多余的逗号，并且会忽略掉不需要更新的字段

```xml
<update id="updateUser" parameterType="map">
    update user
    <set>
        <if test="name != null">
            name = #{name},
        </if>
        <if test="age != null">
            age = #{age},
        </if>
    </set>
    where id = #{id}
</update>
```

```sql
# 生成的语句
update user set name = '张三' where id = 1
```

`<trim>` 去除前缀或者后缀:

- 替代 `<where>` 或 `<set>`，灵活处理前缀/后缀

```xml
<trim prefix="WHERE" prefixOverrides="AND |OR ">
    <!-- 条件内容 -->
</trim>

<trim prefix="SET" suffixOverrides=",">
    <!-- 更新字段 -->
</trim>
```

### #{} 和 ${}

- `#{}` 自动加单引号，防止 SQL 注入
- `${}` 直接拼接，不加单引号，使用 `${}` 的场景，也就是不能加单引号的场景：
  - 当 sql 中表名是从参数中取的情况
  - `order by` 后，因为 `order by` 后边必须跟字段名，这个字段名不能带引号，如果带引号会被识别会字符串，而不是字段。

## Mybatis 缓存

- 一级缓存（SqlSession 级别）：
  - 默认开启，仅在同一个 SqlSession 中生效，唯一标识包括具体参数
  - commit、rollback、update、delete 时会清空
- 二级缓存（Mapper 级别）：
  - 优先级高，开启二级缓存之后，会先从二级缓存查找，找不到再去一级缓存查找，如果一级缓存没有再去数据库查询。
  - 跨 SqlSession 共享缓存，基于 Mapper 的缓存
  - 需要手动开启
  - insert、update、delete 时会清空
  - 支持自定义存储

### 禁用一级缓存

- 缓存策略要设置为 statement，也就是禁用一级缓存
  - 由于默认是会话级别缓存，不同会话之间的修改不影响，会出现脏读
  - 设置为 statement 后，每次查询结束后清空一级缓存

```yaml
mybatis:
  configuration:
    local-cache-scope: statement
```

### 开启 Mybatis 二级缓存

#### 全局配置

```sql
mybatis.configuration.cache-enabled=true
```

#### Mapper 配置

方式一：在需要开启二级缓存的 Mapper 接口上添加 @CacheNamespace 注解

```java
import org.apache.ibatis.annotations.CacheNamespace;
import org.apache.ibatis.annotations.Mapper;

@Mapper
@CacheNamespace
public interface UserMapper {
    //Mapper 接口中的方法
}
```

`@CacheNamespace`注解有多个属性可以配置：

- `implementation`：缓存实现类，默认是 `PerpetualCache`。
- `eviction`：缓存的回收策略，默认是 `LRU`。
- `flushInterval`：缓存刷新的时间间隔，单位毫秒。
- `size`：缓存中可以存储的对象数量。
- `readWrite`：缓存是否为读写类型，默认为 `true`。
- `blocking`：缓存是否为阻塞式，默认为 `false`。

方式二：在 xml 里配置

```xml
<mapper namespace="com.example.mapper.UserMapper">
  <!-- 开启二级缓存 -->
  <cache
    eviction="FIFO"
    flushInterval="60000"
    size="512"
    readOnly="true"/>

  <!-- SQL 映射语句 -->
  <select id="getUserById" >
    SELECT * FROM user WHERE id = #{id}
  </select>
</mapper>
```

#### 实体类要求

使用二级缓存的实体类必须实现 Serializable 接口

```java
import java.io.Serializable;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    // 属性、构造方法、getter 和 setter 省略
}
```

#### 验证二级缓存是否生效

- 通过日志或测试代码来验证二级缓存是否生效。在日志中，MyBatis 会记录缓存的命中率等信息
- 通过比较不同 SqlSession 查询得到的对象是否相同，来判断是否命中二级缓存：

```java
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class MyBatisCacheTest {
    @Autowired
    private SqlSessionFactory sqlSessionFactory;

    @Autowired
    private UserMapper userMapper;

    @Test
    public void testSecondLevelCache() {
        // 第一次查询，从数据库获取数据
        SqlSession sqlSession1 = sqlSessionFactory.openSession();
        try {
            UserMapper userMapper1 = sqlSession1.getMapper(UserMapper.class);
            User user1 = userMapper1.getUserById(1);
            System.out.println("第一次查询：" + user1);
        } finally {
            sqlSession1.close();
        }

        // 第二次查询，从二级缓存获取数据
        SqlSession sqlSession2 = sqlSessionFactory.openSession();
        try {
            UserMapper userMapper2 = sqlSession2.getMapper(UserMapper.class);
            User user2 = userMapper2.getUserById(1);
            System.out.println("第二次查询：" + user2);
        } finally {
            sqlSession2.close();
        }
    }
}
```

## 批量插入、更新

[https://juejin.cn/post/7480529891491020827](https://juejin.cn/post/7480529891491020827)

### 使用 foreach 更新

```xml
<!-- 批量更新用户 -->
<update id="batchUpdateUsers" parameterType="java.util.List">
    <foreach collection="list" item="user" separator=";">
        UPDATE user
        SET name = #{user.name}, age = #{user.age}
        WHERE id = #{user.id}
    </foreach>
</update>
```

## 是否开启延迟加载

Mybatis 配置官方文档：[https://mybatis.org/mybatis-3/zh_CN/configuration.html#properties](https://mybatis.org/mybatis-3/zh_CN/configuration.html#properties)

- MyBatis 懒加载是通过动态代理技术，在访问对象的延迟加载属性时，才发起查询加载对应数据，实现按需延迟加载数据的目的。
- 延迟加载可以显著减少不必要的数据库查询，提高系统性能。然而，不当使用可能导致性能问题和维护难度增加。
- 如果你的每个会话都按需写 sql，就不需要开启懒加载。
- 适合既有项目大包大揽的查，想临时提高下性能，没空写精确 SQL 的场景

两个配置

- lazy-loading-enabled：是否开启延迟加载
- aggressive-lazy-loading：开启时，一旦主对象被加载后，再次访问主对象的任何属性或方法时（包括那些和关联对象无关的属性），会触发所有关联对象的加载。关闭时就是完全懒加载。

## 数据库类型和 Java 类型转换

- 通过 MyBatis 的 类型处理器 TypeHandler 实现
- 原理：在参数映射和结果映射时查找对应的 TypeHandler
- TypeHandler 的作用：
  - SQL 参数设置：Java 类型 ->JDBC 类型
  - 查询结果的映射：JDBC 类型 -> Java 类型

### 默认内置 TypeHandler

官方文档内置 TypeHandler 列表：

[https://mybatis.org/mybatis-3/zh_CN/configuration.html#typeHandlers](https://mybatis.org/mybatis-3/zh_CN/configuration.html#typeHandlers)

MySQL 官网 MySQL 类型名称 对应 Java 类：

[https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html)

- 这些 TypeHandler 在 MyBatis 初始化时会自动被注册到 TypeHandlerRegistry 中
- 当 MyBatis 执行 SQL 语句时，会根据 Java 类型和 JDBC 类型自动匹配最合适的默认 TypeHandler 来完成类型转换，无需用户显式指定

### 自定义 TypeHandler

示例：数据库存储字符串，解析为 java 数组

#### 创建自定义 TypeHandler 类

注解：

- @MappedJdbcTypes(JdbcType.VARCHAR) 表明处理数据库中的 VARCHAR 类型。
- @MappedTypes(int[].class) 表明把数据库中的数据转换为 int 数组。

函数：

- setNonNullParameter 方法：
  - 此方法用于把 int 数组转换为字符串，然后设置到 PreparedStatement 里。
- getNullableResult 方法：
  - 这些方法从 ResultSet 或者 CallableStatement 中获取字符串，再将其转换为 int 数组。
- convertToIntArray 方法：
  - 它会把字符串按逗号分割，去除空格，过滤掉空字符串，最后将每个元素转换为 int 类型并组成数组。

```java
import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedJdbcTypes;
import org.apache.ibatis.type.MappedTypes;

import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.StringJoiner;

@MappedJdbcTypes(JdbcType.VARCHAR)
@MappedTypes(int[].class)
public class StringToIntArrayTypeHandler extends BaseTypeHandler<int[]> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, int[] parameter, JdbcType jdbcType) throws SQLException {
        StringJoiner joiner = new StringJoiner(",");
        for (int num : parameter) {
            joiner.add(String.valueOf(num));
        }
        String str = joiner.toString();
        ps.setString(i, str);
    }

    @Override
    public int[] getNullableResult(ResultSet rs, String columnName) throws SQLException {
        String str = rs.getString(columnName);
        return convertToIntArray(str);
    }

    @Override
    public int[] getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        String str = rs.getString(columnIndex);
        return convertToIntArray(str);
    }

    @Override
    public int[] getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        String str = cs.getString(columnIndex);
        return convertToIntArray(str);
    }

    private int[] convertToIntArray(String str) {
        if (str == null || str.isEmpty()) {
            return new int[0];
        }
        return Arrays.stream(str.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .mapToInt(Integer::parseInt)
                .toArray();
    }
}
```

#### 注册自定义 TypeHandler

方式一：使用 @MapperScan 注解注册

- typeHandlersPackage ：指定包含 `TypeHandler` 类的包，MyBatis 会扫描该包及其子包下的所有 `TypeHandler` 类并自动注册

```java
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan(basePackages = "com.example.mapper", typeHandlersPackage = "com.example.typehandler")
public class YourApplication {
    public static void main(String[] args) {
        SpringApplication.run(YourApplication.class, args);
    }
}
```

方式二：在 application.yml 文件中注册

```yaml
mybatis:
  type-handlers-package: com.example.typehandler
```

方式三：Java 配置类

```java
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import javax.sql.DataSource;

@Configuration
@MapperScan("com.example.mapper")
public class MyBatisConfig {

    @Bean
    public SqlSessionFactoryBean sqlSessionFactory(DataSource dataSource) throws Exception {
        SqlSessionFactoryBean sessionFactory = new SqlSessionFactoryBean();
        sessionFactory.setDataSource(dataSource);

        org.apache.ibatis.session.Configuration configuration = new org.apache.ibatis.session.Configuration();
        configuration.getTypeHandlerRegistry().register(com.example.StringToIntArrayTypeHandler.class);

        sessionFactory.setConfiguration(configuration);
        sessionFactory.setMapperLocations(new PathMatchingResourcePatternResolver().getResources("classpath:mapper/*.xml"));

        return sessionFactory;
    }
}
```

#### 使用自定义 TypeHandler

1、在 Mapper.xml 文件中使用

- resultMap 中的 typeHandler：用于将数据库中的字符串类型字段转换为实体类中的 int[] 类型属性。
- insert 语句中的 typeHandler：在参数中使用 typeHandler 属性，将实体类中的 int[] 类型属性转换为数据库中的字符串类型字段。

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
"http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.example.ExampleMapper">

  <!-- 定义 ResultMap -->
  <resultMap id="ExampleResultMap" type="com.example.ExampleEntity">
    <id property="id" column="id"/>
    <result property="numbers" column="numbers" typeHandler="com.example.StringToIntArrayTypeHandler"/>
  </resultMap>

  <!-- 查询语句 -->
  <select id="selectExampleById" resultMap="ExampleResultMap">
    SELECT id, numbers
    FROM example_table
    WHERE id = #{id}
  </select>

  <!-- 插入语句 -->
  <insert id="insertExample" parameterType="com.example.ExampleEntity">
    INSERT INTO example_table (id, numbers)
    VALUES (#{id}, #{numbers, typeHandler=com.example.StringToIntArrayTypeHandler})
  </insert>
</mapper>
```

2、在注解中使用自定义 TypeHandler

- @Results 和 @Result 注解：在查询方法上使用 @Results 注解，其中的 @Result 注解用于指定 typeHandler，将数据库中的字符串类型字段转换为实体类中的 int[] 类型属性。
- 插入方法：在插入方法中，由于 MyBatis 会自动根据注册的 TypeHandler 进行类型转换，所以不需要额外指定 typeHandler。

```java
import org.apache.ibatis.annotations.*;

import java.util.List;

public interface ExampleMapper {

    @Select("SELECT id, numbers FROM example_table WHERE id = #{id}")
    @Results({
        @Result(property = "id", column = "id"),
        @Result(property = "numbers", column = "numbers", typeHandler = com.example.StringToIntArrayTypeHandler.class)
    })
    ExampleEntity selectExampleById(int id);

    @Insert("INSERT INTO example_table (id, numbers) VALUES (#{id}, #{numbers})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    void insertExample(@Param("id") int id, @Param("numbers") int[] numbers);
}
```

## 数据库连接池

- 概念：数据库连接池是在应用程序启动时创建的一组数据库连接对象的集合。这些连接被存储在一个池中，当应用程序需要与数据库进行交互时，它可以从池中获取一个连接，而不是每次都创建一个新的连接。使用完毕后，连接会被放回池中，以便再次被其他请求使用。
- 作用：减少创建和销毁数据库连接的开销，因为创建和销毁连接是相对耗时的操作。同时，它还可以控制并发访问数据库的连接数量，避免过多的连接对数据库造成压力，提高系统的稳定性和性能。

### HikariCP

Spring Boot 团队从 2.0 版本起将其选为默认连接池，专注性能与低延迟，配置简单，体积小，是高吞吐量场景下最快的 JDBC 连接池之一，内存占用少，适用于微服务架构等对性能要求高的场景。

文档：[https://github.com/brettwooldridge/HikariCP?tab=readme-ov-file#gear-configuration-knobs-baby](https://github.com/brettwooldridge/HikariCP?tab=readme-ov-file#gear-configuration-knobs-baby)

### Druid

由阿里巴巴开源，除连接池功能外，具备强大的监控、统计和 SQL 管理功能，支持全局 SQL 过滤器和连接泄露检测，适用于对可靠性监控要求高以及需要精细化管理的复杂大型系统

文档：

[https://github.com/alibaba/druid/tree/master/druid-spring-boot-starter](https://github.com/alibaba/druid/tree/master/druid-spring-boot-starter)

### 选型建议

- 若追求高性能、高并发，如电商或互联网系统的微服务架构，对监控功能需求低，优先选 HikariCP。
- 若系统需强大的 SQL 监控与统计功能，如企业系统，或对数据库连接池监控管理要求高，以及在国内企业环境中，优先选 Druid。
