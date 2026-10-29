import { bookStartUrl } from './agent-book-links.mjs';

// Explicitly curated collections, not every article in the site.
export const careerLibrary = [
  { title: '凤凰架构', subtitle: '构建可靠的大型分布式系统', author: '周志明', kind: 'resources', topic: 'architecture', cover: 'terra', words: ['凤凰', '架构'], href: '/phoenix/', note: '中文原文 · 站内阅读' },
  { title: '系统设计', subtitle: '从设计原则到场景题与完整解答', author: 'Donne Martin · 本站补充题解', kind: 'resources', topic: 'architecture', cover: 'sage', words: ['系统', '设计'], href: '/system-design/', note: 'System Design Primer · 站内阅读' },
  { title: 'AI Agent 原书', subtitle: '沿原书目录学习 Agent 技术', author: '作者原站', kind: 'resources', topic: 'ai', cover: 'blue', words: ['AI Agent', '原书'], href: bookStartUrl, note: '外部资源 · 原站阅读' },
  { title: 'AI Infra', subtitle: '模型执行、KV cache、调度与性能实验', author: '本站整理', kind: 'handbooks', topic: 'ai', cover: 'ochre', words: ['AI Infra', '技术手册'], href: '/ai-infra-knowledge/', note: '学习地图 · 技术笔记与实验' },
  { title: 'RAG 实战', subtitle: '检索链路、质量评估与故障排查', author: '本站整理', kind: 'handbooks', topic: 'ai', cover: 'blue', words: ['RAG', '实战'], href: '/rag/', note: '知识手册 · 站内阅读' },
  { title: '算法手册', subtitle: '算法模板与高频题的配套练习', author: '本站整理', kind: 'handbooks', topic: 'fundamentals', cover: 'sage', words: ['算法', '手册'], href: '/algorithm-knowledge/', note: '模板 · 题解 · 练习' },
  { title: 'AI 工程问答', subtitle: '围绕岗位能力练习机制、设计与取舍', author: '本站整理', kind: 'handbooks', topic: 'career', cover: 'terra', words: ['AI 工程', '问答'], href: '/interview/', note: '知识手册 · 逐题出处' },
  { title: 'AI 工作流', subtitle: 'AI Coding、任务契约与工程实践', author: '本站整理', kind: 'handbooks', topic: 'ai', cover: 'ochre', words: ['AI', '工作流'], href: '/ai-workflow/', note: '实践文章 · 站内阅读' },
  { title: 'AI 概念', subtitle: '查阅模型、Agent 与工程中的常用概念', author: '本站整理', kind: 'handbooks', topic: 'ai', cover: 'sage', words: ['AI', '概念'], href: '/ai-concepts/', note: '知识索引 · 站内查阅' },
  { title: 'Agent Skills 精选', subtitle: '已收藏和研究的 Skills 与仓库入口', author: '本站精选', kind: 'resources', topic: 'ai', cover: 'blue', words: ['Agent', 'Skills'], href: '/skills/', note: '资源合集 · 保留原仓库链接' },
  { title: '面试资料与出处', subtitle: '公开面经、参考题库与选题依据', author: '本站精选', kind: 'resources', topic: 'career', cover: 'ochre', words: ['面试', '资料集'], href: '/interview/agent-sources/', note: '资源索引 · 原始来源' },
] as const;
export const careerTopics = [
  { key: 'all', label: '全部主题' }, { key: 'ai', label: 'AI 与 Agent' },
  { key: 'architecture', label: '系统架构' }, { key: 'fundamentals', label: '工程基础' },
  { key: 'career', label: '求职准备' },
] as const;
