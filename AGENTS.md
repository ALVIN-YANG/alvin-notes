# alvin-notes — Agent Guide

Personal tech site of Alvin Yang, built with Astro 5 + Starlight, deployed on Vercel (https://blog.mlxb.cc). Repo: https://github.com/ALVIN-YANG/alvin-notes.

## 文章作者视角

- 正文中的第一人称始终指作者 Alvin，不指 Codex、模型或执行任务的 Agent。Alvin 是一名 AI Native 的 AI Agent 开发工程师。
- 作者的工作习惯是，能可靠交给 AI 或 Agent 完成的执行工作就不自己做。Agent 负责检索与整理资料，也负责写代码、运行测试和执行可授权的自动化；作者负责提出问题、定义目标、划定权限、判断取舍并验收结果。
- 不把本次内容生产过程中的 AI 动作写成作者亲历。禁止在正文中出现“我下载了字幕”“我让 Codex 搜索”“我用 AI 整理了资料”等幕后过程，也不能把工具输出包装成作者的第一手经历。
- 文章主题确实涉及 AI Agent 工作流时，可以写作者怎样把任务交给 Agent，但必须来自用户提供的真实习惯、项目证据或已确认的实践，不能临时编造具体经历。
- 公开材料直接写成读者需要的事实、判断和方法，并在相关位置标明来源。除非获取过程本身会改变结论，否则不向正文泄露搜索、转写、生成、检查和构建过程。

## 文章开篇与阅读顺序

- 技术文章开头先用一两段讲明白核心概要，包括要解决什么问题、方案怎样起作用，以及影响采用的重要限制。读者只读开头，也应能抓住结论。
- 概要写实质内容，不写“本文将介绍”等目录预告。不用背景铺陈、专家介绍、术语分类或代码参数开场。
- 概要之后再用具体场景展开。优先展示实际输入、处理过程与前后差别；较长的配置和次要例外放到后面或折叠区，不重复扩写同一个结论。

## Project

- **Framework**: Astro 5.x (`astro`, ESM, `type: "module"`).
- **Theme**: `@astrojs/starlight`.
- **Entry point**: `astro.config.mjs` defines site metadata, integrations, sidebar and Starlight components.
- **Content**: Markdown/MDX in `src/content/docs/` loaded via `src/content.config.ts` (`docsLoader()` + `docsSchema()`).
- **PWA**: Deliberately disabled. `npm run build` verifies that no Service Worker, Workbox or web manifest artifacts are emitted.
- **Static diagrams**: Mermaid fences are rendered to inline SVG during the Astro build by `src/plugins/remark-static-mermaid.mjs`.
- **Notable components**: `CustomHeader.astro`, `Footer.astro`, `Sidebar.astro`, `Hero.astro`, `ThemeToggle.astro`, `RecentNotes.astro`, `WebTerminal.astro`.
- **Notable deps**: `isomorphic-mermaid` + `jsdom` (build-time diagrams), `sharp`.

## Commands

```bash
npm run dev           # astro dev
npm run start         # alias for astro dev
npm run build         # astro build → dist/
npm run preview       # astro preview
npm run astro         # astro CLI passthrough
npm run news:daily    # node scripts/fetch-ai-news.mjs --daily
npm run news:weekly   # node scripts/fetch-ai-news.mjs --weekly
```

## Architecture

1. **Astro config** (`astro.config.mjs`) — site metadata, integrations, Starlight options and sidebar.
2. **Content collection** (`src/content.config.ts`) — `docs` collection via Starlight loader/schema.
3. **Site content** (`src/content/docs/`) — all Markdown/MDX, organized by category.
4. **Starlight overrides** (`src/components/`) — custom Header, Footer, Sidebar, Hero, ThemeSelect.
5. **Styles** (`src/styles/custom.css`) — global theme, CJK typography, Markdown bold overrides.
6. **AI News automation** (`scripts/fetch-ai-news.mjs`) — RSS + GitHub Trending + release watch, writes to `src/content/docs/ai-news/`.
7. **Static assets** (`public/`) — icons and article images (`public/images/<category>/`).

## Conventions

- **Language**: Chinese (Simplified) content; keep technical terms in English (e.g. prompt engineering, inference, orchestration).
- **Lock file**: `package-lock.json` is authoritative; `yarn.lock` is gitignored. Use `npm`.
- **New article**: create `.md` or `.mdx` in the correct `src/content/docs/<category>/`.
- **New category**: create folder, then register `autogenerate: { directory: 'category' }` in `astro.config.mjs` sidebar.
- **Images**: store under `public/images/<category>/`; prefer SVG for diagrams; WebP/PNG for photos.
- **AI News**: do not manually edit `src/content/docs/ai-news/*`; they are overwritten by the script. Fix the script, not the output.
- **Global styles**: only edit `src/styles/custom.css`; avoid inline styles in content.
- **Components**: override Starlight components via `astro.config.mjs` `components` map; custom Astro files live in `src/components/`.
- **Mermaid**: keep authoring fenced `mermaid` blocks, but compile them to static SVG at build time. Do not ship the Mermaid rendering runtime to readers; `scripts/verify-build-output.mjs` enforces this.
- **Gitignore**: never commit `dist/`, `.astro/`, `node_modules/`, `.env*`, `.idea/`, `.opencode/`, `run.log`, `dev.log`, or `/docs/` (root-local docs only; site content is `src/content/docs/`).
- **Deployment**: push to `main` on GitHub; Vercel auto-builds and deploys. `netlify.toml` also exists but is not the primary deploy target.

## Notes
