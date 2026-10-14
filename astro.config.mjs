// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import remarkStaticMermaid from './src/plugins/remark-static-mermaid.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.mlxb.cc',
  prefetch: true,
  markdown: {
    remarkPlugins: [remarkStaticMermaid],
  },
  redirects: {
    '/ai/prompt-engineering': '/ai-workflow/16-prompt-task-contract-practice/',
    '/ai/1-prompt-engineering': '/ai-workflow/16-prompt-task-contract-practice/',
    '/ai-workflow/10-vibe-coding-prompt-engineering': '/ai-workflow/16-prompt-task-contract-practice/',
    '/ai/production-ai-agent-engineering': '/agent-knowledge/',
    '/ai/durable-agent-task-runtime': '/ai/agent-context-persistence-recovery/',
    '/java/01-core/2-concurrent-programming-guide': '/java/01-core/1-java21-virtual-threads/',
    '/java/02-framework/spring-boot/2-mybatis-vs-jpa-2026': '/java/02-framework/mybatis/',
    '/java/04-architecture/2-distributed-transaction-seata': '/architecture/distributed-transaction/',
    '/java/02-framework/spring-boot/relaxed-binding': '/java/02-framework/mybatis/#%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E4%B8%8E%E9%85%8D%E7%BD%AE%E6%98%A0%E5%B0%84%E9%80%9F%E6%9F%A5',
    '/ai-workflow/7-terminal-token-compression-tools': '/ai-workflow/ai-coding-toolbox/',
    '/ai-workflow/8-kiro-spec-driven-development': '/ai-workflow/ai-coding-toolbox/',
    '/ai-workflow/9-cc-switch-unified-manager': '/ai-workflow/ai-coding-toolbox/',
    '/ai/1-提示词工程': '/ai-workflow/16-prompt-task-contract-practice/',
    '/ai/2-RAG原理与实践': '/ai/rag-primer/',
    '/ai/3-Function-Call与Agent': '/ai/function-call-agent/',
    '/network/1-IPv4地址范围与作用': '/network/ipv4-address-ranges/',
    '/network/2-获取用户真实IP': '/network/client-real-ip/',
    '/network/3-Git 22端口被网络代理禁用': '/network/git-ssh-over-https/',
    '/java/04-architecture/5-ddd-tactical-design-落地': '/java/04-architecture/5-ddd-tactical-design/',
  },
  integrations: [
    sitemap(),
    starlight({
      title: 'Alvin Yang',
      favicon: '/favicon.png',
      description: '关于 AI Agent、软件架构与工程实践的技术文章',
      locales: {
        root: { label: '简体中文', lang: 'zh-CN' },
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 2,
      },
      head: [
        {
          tag: 'link',
          attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        },
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#f5f4ed' },
        },
      ],
      customCss: [
        // Path to your custom CSS file
        './src/styles/custom.css',
      ],
      social: [
        {
          label: 'GitHub',
          href: 'https://github.com/ALVIN-YANG/alvin-notes',
          icon: 'github'
        }
      ],
      components: {
        Head: './src/components/Head.astro',
        Header: './src/components/CustomHeader.astro',
        Footer: './src/components/Footer.astro',
        Sidebar: './src/components/Sidebar.astro',
        Hero: './src/components/Hero.astro',
        PageTitle: './src/components/PageTitle.astro',
        ThemeSelect: './src/components/ThemeToggle.astro',
      },
      sidebar: [
        {
          label: 'AI 工程问答',
          items: [
            { label: '全部题目', link: '/interview/' },
            { label: '学习路线与公开资料', link: '/interview/infra-roadmap/' },
            { label: '面经来源与热度口径', link: '/interview/agent-sources/' },
            { label: 'AI Agent 开发', autogenerate: { directory: 'interview/agent' } },
            { label: 'AI Infra', autogenerate: { directory: 'interview/infra' } },
          ],
        },
        {
          label: '作品',
          autogenerate: { directory: 'projects' },
        },
        {
          label: '工具箱',
          autogenerate: { directory: 'tools' },
        },
        {
          label: 'AI Agent',
          items: [
            { label: 'AI 概念卡片', link: '/ai-concepts/' },
            { label: 'RAG 实战速查', link: '/rag/' },
            {
              label: 'AI Agent',
              autogenerate: { directory: 'ai' },
            },
            {
              label: 'OpenClaw',
              autogenerate: { directory: 'claw/openclaw' },
            },
          ],
        },
        {
          label: 'AI Infra',
          items: [
            { label: 'AI Infra 学习地图', link: '/ai-infra-knowledge/' },
            { label: '学习与实践', autogenerate: { directory: 'ai-infra' } },
          ],
        },
        {
          label: 'AI 工作流',
          autogenerate: { directory: 'ai-workflow' }
        },
        {
          label: 'Architecture',
          autogenerate: { directory: 'architecture' },
        },
        {
          label: 'AI News',
          autogenerate: { directory: 'ai-news' },
        },
        {
          label: 'AI 公司观察',
          items: [
            { label: '公司目录', link: '/companies/' },
            { label: '历史动态', link: '/companies/changes/' },
            { label: '收录规则与来源', link: '/companies/methodology/' },
          ],
        },
        {
          label: '算法',
          items: [
            {
              label: 'Java',
              autogenerate: { directory: 'java' },
            },
            {
              label: '算法题解',
              autogenerate: { directory: 'algorithms' },
            }
          ],
          collapsed: true,
        },
        {
          label: '网络',
          autogenerate: { directory: 'network' },
        },
        {
          label: '安全',
          autogenerate: { directory: 'security' },
        },
        {
          label: 'Ops',
          items: [
            {
              label: '运维与基础设施',
              autogenerate: { directory: 'ops' },
            }
          ],
          collapsed: true,
        },
      ],
    }),
  ],
});
