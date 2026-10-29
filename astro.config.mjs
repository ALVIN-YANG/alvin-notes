// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import remarkStaticMermaid from './src/plugins/remark-static-mermaid.mjs';
import remarkPhoenix from './src/plugins/remark-phoenix.mjs';
import { buildPhoenixSidebar } from './src/lib/phoenix-sidebar.mjs';
import remarkSystemDesign from './src/plugins/remark-system-design.mjs';
import { buildInterviewSidebar } from './src/lib/interview-sidebar.mjs';
import { buildSystemDesignSidebar } from './src/lib/system-design-sidebar.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.mlxb.cc',
  prefetch: true,
  markdown: {
    remarkPlugins: [remarkPhoenix, remarkSystemDesign, remarkStaticMermaid],
  },
  redirects: {
    '/ai-workflow/11-mattpocock-skills-deep-dive': '/ai-workflow/chapters/11-mattpocock-skills-deep-dive/',
    '/ai-workflow/12-vibe-coding-software-engineering-notes': '/ai-workflow/chapters/12-vibe-coding-software-engineering-notes/',
    '/ai-workflow/13-context-engineering-effect-cost-notes': '/ai-workflow/chapters/13-context-engineering-effect-cost-notes/',
    '/ai-workflow/14-codex-skill-creator-deep-dive': '/ai-workflow/chapters/14-codex-skill-creator-deep-dive/',
    '/ai-workflow/15-codex-async-wait-token-cost': '/ai-workflow/chapters/15-codex-async-wait-token-cost/',
    '/ai-workflow/16-prompt-task-contract-practice': '/ai-workflow/chapters/16-prompt-task-contract-practice/',
    '/ai-workflow/4-ai-coding-remote-workstation-macos-tailscale-ssh-termux': '/ai-workflow/chapters/4-ai-coding-remote-workstation-macos-tailscale-ssh-termux/',
    '/ai-workflow/ai-coding-skills-selection-guide': '/ai-workflow/chapters/ai-coding-skills-selection-guide/',
    '/ai-workflow/ai-coding-toolbox': '/ai-workflow/chapters/ai-coding-toolbox/',
    '/ai-workflow/ai-engineering-glossary': '/ai-workflow/chapters/ai-engineering-glossary/',
    '/ai/rag-primer': '/rag/chapters/rag-primer/',
    '/ai/rag-knowledge-base-component': '/rag/chapters/rag-knowledge-base-component/',
    '/ai/rag-metadata-filtering': '/rag/chapters/rag-metadata-filtering/',
    '/algorithms/java-advanced-algorithm-patterns': '/algorithm-knowledge/chapters/java-advanced-algorithm-patterns/',
    '/algorithms/java-high-frequency-algorithm-patterns': '/algorithm-knowledge/chapters/java-high-frequency-algorithm-patterns/',

    '/architecture/ios-subscription-payment-backend-practice': '/app-stores/ios/subscription-overview/',
    '/architecture/ios-subscription-implementation': '/app-stores/ios/subscription-implementation/',
    '/architecture/credits-metering-implementation': '/app-stores/billing/credits-metering/',
    '/ops/google-play-sandbox-testing': '/app-stores/google-play/sandbox-testing/',

    '/skills': '/ai-workflow/chapters/ay-skills/',
    '/system-design-knowledge': '/system-design/',
    '/interview/infra-roadmap': '/interview/',
    '/ai/prompt-engineering': '/ai-workflow/chapters/16-prompt-task-contract-practice/',
    '/ai/1-prompt-engineering': '/ai-workflow/chapters/16-prompt-task-contract-practice/',
    '/ai-workflow/10-vibe-coding-prompt-engineering': '/ai-workflow/chapters/16-prompt-task-contract-practice/',
    '/ai/production-ai-agent-engineering': '/agent-knowledge/',
    '/ai/durable-agent-task-runtime': '/ai/agent-context-persistence-recovery/',
    '/java/01-core/2-concurrent-programming-guide': '/java/01-core/1-java21-virtual-threads/',
    '/java/02-framework/spring-boot/2-mybatis-vs-jpa-2026': '/java/02-framework/mybatis/',
    '/java/04-architecture/2-distributed-transaction-seata': '/architecture/distributed-transaction/',
    '/java/02-framework/spring-boot/relaxed-binding': '/java/02-framework/mybatis/#%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E4%B8%8E%E9%85%8D%E7%BD%AE%E6%98%A0%E5%B0%84%E9%80%9F%E6%9F%A5',
    '/ai-workflow/7-terminal-token-compression-tools': '/ai-workflow/chapters/ai-coding-toolbox/',
    '/ai-workflow/8-kiro-spec-driven-development': '/ai-workflow/chapters/ai-coding-toolbox/',
    '/ai-workflow/9-cc-switch-unified-manager': '/ai-workflow/chapters/ai-coding-toolbox/',
    '/ai/1-提示词工程': '/ai-workflow/chapters/16-prompt-task-contract-practice/',
    '/ai/2-RAG原理与实践': '/rag/chapters/rag-primer/',
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
        { label: '产品交付', items: [
          { label: '手册目录', link: '/app-stores/' },
          { label: 'iOS 订阅与额度', link: '/app-stores/ios/subscription-overview/' },
          { label: 'iOS 订阅实现', link: '/app-stores/ios/subscription-implementation/' },
          { label: 'Google Play 沙箱测试', link: '/app-stores/google-play/sandbox-testing/' },
          { label: 'Credits 实现', link: '/app-stores/billing/credits-metering/' },
        ] },
        { label: '系统设计', items: [
          { label: '凤凰架构（完整手册）', link: '/phoenix/' },
          { label: '架构实践', collapsed: true, autogenerate: { directory: 'architecture' } },
          ...buildSystemDesignSidebar(),
        ] },
        { label: '凤凰架构', items: buildPhoenixSidebar() },
        {
          label: 'AI 工程问答',
          items: [
            { label: '全部题目', link: '/interview/' },
            { label: '面经来源与热度口径', link: '/interview/agent-sources/' },
            ...buildInterviewSidebar(),
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
            { label: 'Agent 开发概览', link: '/agent-knowledge/' },
            { label: 'AI 概念速查', link: '/ai-concepts/' },
            { label: '上下文与记忆', collapsed: true, items: [
              { label: '上下文工程', link: '/ai/context-engineering-guide/' },
              { label: '长上下文失效', link: '/ai/long-context-reliability-notes/' },
              { label: 'RAG 实战速查', link: '/rag/' },
              { label: 'RAG 原理与选型', link: '/rag/chapters/rag-primer/' },
              { label: 'RAG 元数据过滤', link: '/rag/chapters/rag-metadata-filtering/' },
              { label: 'RAG 知识库实战', link: '/rag/chapters/rag-knowledge-base-component/' },
              { label: '记忆系统设计', link: '/ai/agent-memory-system-design/' },
              { label: 'Hindsight 长期记忆', link: '/ai/hindsight-agent-memory/' },
              { label: '环境感知与缓存', link: '/ai/agent-environment-awareness-llm-cache/' },
            ] },
            { label: '架构与执行', collapsed: true, items: [
              { label: 'Agent 与 Workflow 选型', link: '/ai/when-not-to-use-ai-agent/' },
              { label: 'Function Call、MCP 与 Skill', link: '/ai/function-call-agent/' },
              { label: '工具设计', link: '/ai/production-agent-tool-design/' },
              { label: '多 Agent 架构', link: '/ai/multi-agent-architecture-selection/' },
              { label: '目标模式与执行循环', link: '/ai/harness-goal-controller/' },
              { label: '运行环境选型', link: '/ai/agent-runtime-environments/' },
              { label: '状态持久化与恢复', link: '/ai/agent-context-persistence-recovery/' },
              { label: '实时语音 Agent', link: '/ai/realtime-voice-agent-engineering/' },
              { label: '决策模型选型', link: '/ai/jev-decision-models/' },
              { label: 'OpenClaw 插件', link: '/ai/openclaw-plugin-primer/' },
              { label: 'OpenClaw 实践', collapsed: true, autogenerate: { directory: 'claw/openclaw' } },
            ] },
            { label: '评测与可靠性', collapsed: true, items: [
              { label: 'Agent 评测', link: '/ai/agent-evaluation-observability/' },
              { label: 'Langfuse 可观测性', link: '/ai/langfuse-overview/' },
              { label: '安全与权限', link: '/ai/agent-security-engineering/' },
              { label: 'Prompt Injection 防护', link: '/ai/agent-prompt-injection-defense/' },
              { label: '流式语音延迟优化', link: '/ai/openclaw-streaming-voice-latency/' },
              { label: '可靠项目的面试表达', link: '/ai/ai-engineering-interview-reliable-projects/' },
            ] },
          ],
        },
        { label: '编程与算法', items: [
          { label: '编程与算法概览', link: '/programming/' },
          { label: 'Java', collapsed: true, autogenerate: { directory: 'java' } },
          { label: '模板与高频题', link: '/algorithm-knowledge/' },
          { label: '配套章节', autogenerate: { directory: 'algorithm-knowledge/chapters' } },
        ] },
        {
          label: 'AI Infra',
          items: [
            { label: 'AI Infra 学习地图', link: '/ai-infra-knowledge/' },
            { label: '学习与实践', autogenerate: { directory: 'ai-infra' } },
          ],
        },
        {
          label: '管理 AI 开发',
          items: [
            { label: '目标、上下文与验收', link: '/ai-workflow/' },
            { label: 'AY Skills 使用参考', link: '/ai-workflow/chapters/ay-skills/' },
            { label: '任务目标与验收标准', link: '/ai-workflow/chapters/16-prompt-task-contract-practice/' },
            { label: '上下文与成本控制', link: '/ai-workflow/chapters/13-context-engineering-effect-cost-notes/' },
            { label: '工程流程选择', link: '/ai-workflow/chapters/11-mattpocock-skills-deep-dive/' },
            { label: 'AI 开发中的人机分工', link: '/ai-workflow/chapters/12-vibe-coding-software-engineering-notes/' },
            { label: 'Skill 编写', link: '/ai-workflow/chapters/14-codex-skill-creator-deep-dive/' },
            { label: 'Skill 选择', link: '/ai-workflow/chapters/ai-coding-skills-selection-guide/' },
            { label: '长任务等待与 Token 成本', link: '/ai-workflow/chapters/15-codex-async-wait-token-cost/' },
            { label: '远程开发环境', link: '/ai-workflow/chapters/4-ai-coding-remote-workstation-macos-tailscale-ssh-termux/' },
            { label: '开发工具速查', link: '/ai-workflow/chapters/ai-coding-toolbox/' },
            { label: 'AI 工程术语', link: '/ai-workflow/chapters/ai-engineering-glossary/' },
            { label: '实践文章总览', link: '/ai-workflow/chapters/' },
          ]
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
          label: '网络',
          autogenerate: { directory: 'network' },
        },
        {
          label: '安全',
          autogenerate: { directory: 'security' },
        },
        {
          label: '运维',
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
