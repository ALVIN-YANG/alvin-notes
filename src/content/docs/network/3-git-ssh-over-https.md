---
title: '[Git] 22 端口被网络代理禁用'
description: Git 走 SSH 时 22 端口被代理拦截的报错原因，以及改用 HTTPS 端口（443）的规避方式
slug: network/git-ssh-over-https
date: 2025-11-16
lastUpdated: 2026-11-26
---

Git over SSH 默认走 22 端口，被公司网络代理禁用时，可以改走 443 端口：GitHub 官方在 `ssh.github.com:443` 上提供 SSH 服务，改一下 `~/.ssh/config` 即可。

## 报错信息

```text
Connection closed by 20.205.243.166 port 22
kex exchange identification: Connection closed by remote host
```

这说明 SSH 建连在密钥交换之前就被远端或中间代理断开，不是密钥本身有问题。GitHub 官方解决方案见：[在 HTTPS 端口使用 SSH](https://docs.github.com/zh/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)。

## 配置方法

在 `~/.ssh/config` 中为 GitHub 指定 `ssh.github.com` 和 443 端口。密钥路径必须真实存在，并且对应公钥已经添加到相应 GitHub 账号。使用多个账号时，可以给不同账号配置不同的别名和密钥：

```ini
# 默认 GitHub 账号
Host github.com
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519

# 另一个 GitHub 账号
Host github-work
  HostName ssh.github.com
  User git
  Port 443
  IdentityFile ~/.ssh/id_ed25519_work
```

第一个 `Host` 使用默认地址 `github.com`，第二个使用别名 `github-work`，所以测试时要分别写：

```bash
ssh -T git@github.com
ssh -T git@github-work
```

成功时会看到类似下面的提示，说明 443 端口上的 SSH 认证已经通过：

```text
Hi <你的 GitHub 用户名>! You've successfully authenticated, but GitHub does not provide shell access.
```

这里改的是 Git over SSH 的传输端口，不是改用 HTTPS 克隆地址。`git@github.com:user/repo.git` 与 `https://github.com/user/repo.git` 的凭据和认证方式仍要分开配置。
