---
title: 上传项目到 Maven 中心仓
description: 通过 Central Portal 发布开源库到 Maven 中心仓的完整流程：注册 namespace、GPG 签名、Maven 插件配置
sidebar:
  label: 发布到中心仓
date: 2025-11-20
lastUpdated: 2026-10-11
---

现在把开源库发布到 Maven 中心仓，走 Sonatype 的 Central Portal（[https://central.sonatype.com](https://central.sonatype.com)）。完整链路只有五步，本文按顺序展开：

1. 注册 Portal 账号并验证 namespace（命名空间，如 `io.github.你的账户名`）
2. 生成 User Token 配进 `settings.xml`
3. 准备 GPG 密钥并发布公钥
4. pom.xml 配置 source/javadoc/gpg 插件与 `central-publishing-maven-plugin`
5. 执行 `mvn deploy` 上传

> 旧的 Legacy OSSRH 服务（`oss.sonatype.org` / `s01.sonatype.org`）已于 2025 年 6 月 30 日停止接收发布（[官方公告：OSSRH Sunset](https://central.sonatype.org/news/20250326_ossrh_sunset/)）。已有 OSSRH 账号的发布者可按官方迁移指引在 Portal 中认领（claim）原有 namespace，通常不需要从零重建；具体流程见 [Sonatype 迁移文档](https://central.sonatype.org/register/legacy/)。

## Maven 中心仓与 Central Portal

- Maven 中心仓是 Java 开源构件的公共检索与下载仓库，搜索地址是 [https://central.sonatype.com/](https://central.sonatype.com/)（2023 年 2 月起 `search.maven.org` 自动重定向至此，[官方解释](https://central.sonatype.org/faq/what-happened-to-search-maven-org/)）。
- Central Portal 是发布的入口：融合了原 OSSRH 的发布中转与 Maven Search 的检索功能。中心仓没有独立账号体系，发布成功后约 10 分钟即可被搜索到。

## Central Portal 上传步骤

### 注册账号

- 访问 [https://central.sonatype.com](https://central.sonatype.com)
- 点击右上角 Sign In

官方指引：[https://central.sonatype.org/register/central-portal/#create-an-account](https://central.sonatype.org/register/central-portal/#create-an-account)

### 创建 namespace

示例：使用 github 创建 namespace

- 点击右上角头像，选择 View Namespaces
- Add Namespace
  - io.github.账户名
  - 注意如果账户名是大写，要全转为小写
- 复制 验证码
- 在 github 创建名为验证码的仓库： github.com/账号名/验证码
- 回到 sonatype 点击验证
- 验证成功删除 github 验证仓库即可

官方指引：[https://central.sonatype.org/register/namespace/#choosing-a-namespace](https://central.sonatype.org/register/namespace/#choosing-a-namespace)

### 生成 token 也就是账号密码

- 访问 [https://central.sonatype.com/account](https://central.sonatype.com/account)
- 点击 Generate User Token ，将信息复制到剪切板
- 确认生成（注意：这将使现有的令牌失效，也就是覆盖已有令牌）
- 将账号密码配置复制到当前使用的 Maven 的 settings.xml 文件中

### 配置 settings.xml

- 注意这里的 id 和 pom.xml 里的发布插件 publishingServerId 标签一致

```xml
<server>
	<id>central</id>
	<username>xxxxxxx</username>
	<password>xxxxxxxxxxxxxxxxxxxxxxxxxxx</password>
</server>
```

## 使用 GPG/PGP 签名文件

- 用作 Maven 签名插件配置的前置步骤：
  - 1、生成 GPG 密钥对
  - 2、安装 gpg 命令行
  - 3、配置 settings.xml
- 官方文档：[https://central.sonatype.org/publish/requirements/gpg/](https://central.sonatype.org/publish/requirements/gpg/)

### 安装 GnuPG

- 下载地址：[https://gnupg.org/download/](https://gnupg.org/download/)
- mac os 用 Homebrew 安装即可
  - `brew install gnupg`
  - 或者安装图形应用 [https://gpgtools.org/](https://gpgtools.org/)
- linux : `apt install gnupg`

使用 gpg --version 测试安装结果

### 生成密钥

- gpg --gen-key
  - 输入姓名、邮箱
  - 会弹出一个窗口，输入密码
  - 公钥就在输出的 pub 的下一行

```xml
pub   ed25519 2024-05-08 [SC] [有效至：2027-05-07]
      xxxxxxxxxxxxxxxxxxxxxx

```

### 使用 gpg 密钥签署文件

- gpg -ab myfile.java
  - 会生成 myfile.java.asc

### 发布公钥

- `gpg --keyserver keyserver.ubuntu.com --send-keys [你的公钥]`
- 中央服务器当前支持的 GPG 密钥服务器有：
  - keyserver.ubuntu.com
  - keys.openpgp.org
  - pgp.mit.edu
- 示例：--send-keys 发送

```xml
→ gpg --keyserver keyserver.ubuntu.com --send-keys xxxxxxxxxxxx
gpg: 正在发送密钥 xxxxxxxxxxxx 到 hkp://keyserver.ubuntu.com
```

- 示例：--recv-keys 验证

```xml
→ gpg --keyserver keyserver.ubuntu.com --recv-keys xxxxxxxxxxxx
gpg: 密钥 xxxxxx：“名字 <邮箱>” 未改变
gpg: 处理的总数：1
gpg:              未改变：1
```

### 配置 settings.xml

- 注意这里 gpg.executable 是你的可执行命令 gpg，也就是 gpg --version 里的 gpg
- gpg.passphrase 是生成密钥时设置的密码

```xml
<settings>
  <profiles>
    <profile>
      <id>ossrh</id>
      <activation>
        <activeByDefault>true</activeByDefault>
      </activation>
      <properties>
        <gpg.executable>gpg</gpg.executable>
        <gpg.passphrase>the_pass_phrase</gpg.passphrase>
      </properties>
    </profile>
  </profiles>
</settings>
```

（这里的 profile `id` 只是本地配置块的名字，与已停用的 OSSRH 服务无关，改成任意名字都可以。）

## 使用 Maven 插件发布

官方文档：[https://central.sonatype.org/publish/publish-maven/](https://central.sonatype.org/publish/publish-maven/)

### 生成 Javadoc 和 source 包

官方文档：[https://central.sonatype.org/publish/publish-maven/#javadoc-and-sources-attachments](https://central.sonatype.org/publish/publish-maven/#javadoc-and-sources-attachments)

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-source-plugin</artifactId>
      <version>2.2.1</version>
      <executions>
        <execution>
          <id>attach-sources</id>
          <goals>
            <goal>jar-no-fork</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-javadoc-plugin</artifactId>
      <version>2.9.1</version>
      <executions>
        <execution>
          <id>attach-javadocs</id>
          <goals>
            <goal>jar</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

### GPG 签名组件

- pom.xml 配置

```xml
<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-gpg-plugin</artifactId>
      <version>1.6</version>
      <executions>
        <execution>
          <id>sign-artifacts</id>
          <phase>verify</phase>
          <goals>
            <goal>sign</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

- 确保安装了 gpg 命令
- 确保 settings.xml 配置了 gpg 密钥

### 使用 central-publishing-maven-plugin 部署和发布

- pom.xml 配置中央门户部署插件（这是 Sonatype 为 Central Portal 提供的官方插件，与已随 OSSRH 停用的旧 Nexus Staging 插件不是一回事）
  - 注意这里的 publishingServerId 和 settings.xml 里的 server id 配置一致
- 配置好后执行 `mvn deploy`，输入密码即可自动上传，如果有错误会在网页的 Deployments 显示

```xml
<build>
    <plugins>
        <plugin>
          <groupId>org.sonatype.central</groupId>
          <artifactId>central-publishing-maven-plugin</artifactId>
          <version>0.7.0</version>
          <extensions>true</extensions>
          <configuration>
            <publishingServerId>central</publishingServerId>
          </configuration>
        </plugin>
    </plugins>
</build>
```
