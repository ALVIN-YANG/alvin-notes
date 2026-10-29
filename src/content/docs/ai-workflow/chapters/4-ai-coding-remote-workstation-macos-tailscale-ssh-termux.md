---
title: "AI Coding 远程开发机：macOS + Tailscale + SSH + Termux"
description: "最稳的 AI Coding 用法不是每台设备都装，而是固定一台 Mac 当远程开发机。本文重点讲连接步骤、使用方式和排错。"
sidebar:
  order: 4
date: 2026-03-09
lastUpdated: 2026-04-06
---

先说结论：**把 AI Coding 环境固定在一台主力 Mac 上，其他电脑和手机通过 Tailscale + SSH 连进去，这是最稳、最省心的长期方案。**

下载链接：

- Tailscale：<https://tailscale.com/>
- Termux（F-Droid）：<https://f-droid.org/packages/com.termux/>

## 1. 最短上手

### Mac 上

```bash
brew install --cask tailscale-app
open -a Tailscale
tailscale ip -4
whoami
```

然后去：

```text
系统设置 -> 通用 -> 共享 -> 远程登录
```

把 `远程登录` 打开。

### 安卓 Termux 上

```bash
pkg update
pkg install openssh
ssh 你的用户名@你的Mac的TailscaleIP
opencode
```

## 2. 为什么要这么搞

因为每台设备都装一套 AI Coding 环境，长期一定会烦：

- 模型登录分散
- 工具和依赖分散
- 仓库环境分散

## 3. 最常见的排错

### `connection refused`

通常是 Mac 端 SSH 没开或者 22 端口没监听。

### `end of file`

这次我实际遇到的根因是手机上的 Tailscale 掉线了，不是密码问题。

### `systemsetup -setremotelogin on` 没权限

最省事的办法通常是直接去系统设置里手动打开 `远程登录`。

## 4. 最后一句话

```text
AI Coding 最稳的用法，不是到处装一套，而是固定一台 Mac，当远程开发机来用。
```
