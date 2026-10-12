<p align="center">
  <img src="./assets/readme/hero.webp" width="100%" alt="alvin-notes — Alvin Yang 的个人技术站，记录 AI Agent、软件架构与工程实践">
</p>

<p align="center">
  <a href="https://blog.mlxb.cc">访问站点</a> ·
  <a href="https://blog.mlxb.cc/model-arena/">实时模型榜</a> ·
  <a href="https://blog.mlxb.cc/skills/">Skills</a>
</p>

## 主要内容

- [AI Agent](https://blog.mlxb.cc/ai/production-ai-agent-engineering/)：从基础概念到生产系统
- [AI 概念卡片](https://blog.mlxb.cc/ai-concepts/)：中英搜索、浏览器朗读与间隔复习
- [Architecture](https://blog.mlxb.cc/architecture/distributed-transaction/)：分布式系统与业务建模
- [AI 工作流](https://blog.mlxb.cc/ai-workflow/ai-coding-skills-selection-guide/)：Coding Agents、Skills 与工具链

## 本地运行

```bash
npm ci
npm run dev
```

基于 [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) 构建，部署于 Vercel。

## AI 概念词库

`.github/workflows/ai-concepts.yml` 每周一北京时间 08:17 同步，也可在 Actions 中手动运行。调度可能延迟；公开仓库连续 60 天没有活动时，GitHub 会停用定时工作流，需要手动重新启用。

Google 官方中英词表是基础库，Hugging Face Transformers 词表补充模型术语，Anthropic Engineering 与最近 14 天的 arXiv 论文提供新词候选。论文中的名字按“论文术语”展示，不视为行业共识。英文释义和新词复用仓库已有的 DeepSeek / OpenAI 兼容服务配置；密钥仅在 Actions 中使用，不进入页面。自动校验能检查结构和原文中的名字，无法证明每条模型释义准确。

```bash
npm run concepts:sync    # 同步来源、整理英文新条目、发现新词
npm run concepts:check   # 只校验已保存的词库
npm test
npm run fonts:update
npm run build
```

核心概念的短释义、例子和区别维护在 `src/data/ai-concepts-curated.json`；`ai-concepts.json` 由同步脚本生成。不要手改生成文件。同步失败不会覆盖已发布词库；词表移除条目时暂时保留原 ID 和内容，以免丢失学习记录。更新词条定义后，该词条会重新进入复习队列。

人工发现的不相关或误收录词条写入 `src/data/ai-concepts-excluded.json`，附排除原因；同步时从历史词库中移除，并阻止再次收录。

复习是用户自评，记录保存在 localStorage，可以导入和导出 JSON。朗读使用 Web Speech API 的默认语音，不需要本站的 TTS 服务。每个词条附具体来源，页面底部保留 Google CC BY 4.0 和 Hugging Face Apache 2.0 的署名与许可。
