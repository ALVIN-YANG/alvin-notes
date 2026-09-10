---
title: '[Git] 22 端口被网络代理禁用'
description: Git 走 SSH 时 22 端口被代理拦截的报错原因，以及改用 HTTPS 端口（443）的规避方式
slug: network/git-ssh-over-https
date: 2025-11-16
lastUpdated: 2026-01-06
---

## 报错信息

```powershell
Connection closed by 20.205.243.166 port 22
kex exchange identification: Connection closed by remote host
```

官方解决文档：

[https://docs.github.com/zh/authentication/troubleshooting-ssh/using-ssh-over-the-https-port](https://docs.github.com/zh/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)

## 报错原因

22 端口被网络代理服务器禁用，导致 SSH 方式与 Github 交互报错，可以改为在 HTTPS 端口使用 SSH 来规避。

## 解决方法

你在 ~/.ssh 目录下创建一个名为 config 的文件，没有文件后缀，输入 ：

- 要保证 IdentityFile 路径正确，并且公钥已添加在对应的 github 账号
- 一个密钥只能支持一个账号，所以这里配置了多个账号

```powershell
# GitHub self
Host github.com
HostName ssh.github.com
User git
Port 443
IdentityFile ~/.ssh/id_ed25519

# GitHub
Host github.rd
HostName ssh.github.com
User git
Port 443
IdentityFile ~/.ssh/id_ed25519_hoorii_rd
```

## 测试命令

```powershell

ssh -T git@github.com

ssh -vvvT git@github.rd
```
