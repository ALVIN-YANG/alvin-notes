export interface PortfolioProject {
  id: string;
  name: string;
  category: string;
  status: string;
  summary: string;
  implementation: string;
  stack: string[];
  icon?: string;
  mark?: string;
  featured?: boolean;
  preview?: { src: string; alt: string; width: number; height: number };
  evidence?: { value: string; label: string }[];
  links: { label: string; href: string }[];
}

// App Store listings and the projects' public READMEs are the source of truth.
// Keep shipped capabilities separate from newer work in the local checkouts.
export const portfolio: PortfolioProject[] = [
  {
    id: 'queryatlas',
    name: 'QueryAtlas',
    category: '数据工程 · 企业问答',
    status: '公开源码',
    summary: '问订单能看 SQL，查文档能对照原文页码。',
    implementation: 'MySQL 数据可从控制台同步到 StarRocks。工作空间分别管理数据、文档和权限，回答可追溯到实际执行的查询和数据批次。',
    stack: ['Python', 'StarRocks', 'LlamaIndex', 'React'],
    icon: '/images/projects/queryatlas.webp',
    preview: {
      src: '/images/projects/queryatlas-workspace.webp',
      alt: 'QueryAtlas 实测界面，按订单优先级展示柱状图，右侧显示执行的 SQL',
      width: 1360,
      height: 945,
    },
    evidence: [
      { value: '750 万行', label: 'MySQL 全量同步并对账' },
      { value: '22 / 22', label: 'TPC-H 查询通过参考答案校验' },
    ],
    links: [
      { label: '查看源码', href: 'https://github.com/ALVIN-YANG/QueryAtlas-Public' },
      { label: '同步实测', href: 'https://github.com/ALVIN-YANG/QueryAtlas-Public/blob/main/deploy/etl/results/tpch-sf1-console-2026-11-25.json' },
    ],
  },
  {
    id: 'koko',
    name: 'KoKo',
    category: 'iPhone · 语音助手',
    status: '个人项目',
    summary: '在 iPhone 上说出任务，让 Mac 上的 Codex 接手。等结果时，还可以继续聊。',
    implementation: '先说好要做什么，隔几轮再说“交给它”。KoKo 会找回原来的要求，缺资料就追问，收到 Codex 的执行回执后再播报结果。',
    stack: ['SwiftUI', 'Go', 'Codex'],
    icon: '/images/projects/koko.webp',
    links: [],
  },
  {
    id: 'memosphere',
    name: 'MemoSphere',
    category: 'AI 基础设施 · 长期记忆',
    status: '已上线',
    summary: '让多个 AI 助手在授权范围内记住同一件事，也知道你什么时候改了主意。',
    implementation: '一段对话可以成为带出处的记忆。KoKo、Codex 和 Kimi Code 按授权读取；用户可以查看原话、纠正旧结论，或删除一条记忆。',
    stack: ['Go', 'SQLite', 'MCP'],
    mark: 'M',
    links: [
      { label: 'GitHub', href: 'https://github.com/ALVIN-YANG/MemoSphere' },
      { label: '记忆控制台', href: 'https://memosphere.mlxb.cc/' },
    ],
  },
  {
    id: 'drophere',
    name: '丢这儿',
    category: 'iOS · macOS',
    status: '已上架',
    summary: '把证件、合同和附件放在一起，本机优先的私密资料库。',
    implementation: '同一份资料收好文字、图片、录音、视频和文件。支持搜索、到期提醒与用途水印，可按需开启 iCloud 同步。',
    stack: ['SwiftUI', 'CloudKit', 'StoreKit'],
    icon: '/images/projects/drophere.webp',
    featured: true,
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/cn/app/id6797920735' },
      { label: '产品网站', href: 'https://drophere.mlxb.cc/' },
    ],
  },
  {
    id: 'suishen-wuqu',
    name: '随身舞曲',
    category: 'iOS · 视频转音乐',
    status: '已上架',
    summary: '把广场舞视频转成 MP3，存进 U 盘带去跳舞。',
    implementation: '支持试听、改名、裁剪与 U 盘复制，原文件保留；无需注册、无订阅，媒体在本机处理。已在中国大陆以外地区上架，U 盘需被系统识别并授权。',
    stack: ['SwiftUI', 'AVFoundation', 'LAME'],
    icon: '/images/projects/suishen-wuqu.webp',
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/us/app/suishen-wuqu/id6832876354' },
      { label: '产品网站', href: 'https://wuqu.mlxb.cc/' },
    ],
  },
  {
    id: 'secondclick',
    name: 'SecondClick',
    category: 'macOS · Finder 扩展',
    status: '已上架',
    summary: '把复制路径、文件整理和格式转换放进 Finder 右键菜单。',
    implementation: '按文件类型显示动作，支持批量重命名、图片与 PDF 处理，以及复制项目上下文。菜单可定制，文件处理留在本机。',
    stack: ['SwiftUI', 'Finder Sync', 'App Sandbox'],
    icon: '/images/projects/secondclick.webp',
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/cn/app/secondclick/id6801852072' },
      { label: '产品网站', href: 'https://secondclick.mlxb.cc/' },
    ],
  },
  {
    id: 'netocto',
    name: 'NetOcto',
    category: 'macOS · 网络工具',
    status: '已上架',
    summary: '查看网络状态，排查 DNS、证书和连接问题。',
    implementation: '持续检测多个目标，查看延迟、丢包与路由路径。提供 DNS 查询、证书检查和子网计算，诊断历史本地保存，可导出 Markdown。',
    stack: ['网络诊断', 'DNS / TLS', 'SQLite'],
    icon: '/images/projects/netocto.webp',
    links: [
      { label: 'App Store', href: 'https://apps.apple.com/cn/app/netocto/id6801817114' },
      { label: '产品网站', href: 'https://netocto.mlxb.cc/' },
    ],
  },
  {
    id: 'chimebuddy',
    name: 'ChimeBuddy',
    category: 'macOS · Codex 伙伴',
    status: '原型 · 已公证',
    summary: '跟随 Codex 当前会话自动吐槽，也能和你直接聊天的桌面伙伴。',
    implementation: '原生悬浮气泡，支持自定义流式 TTS、按动作标签播放 GIF，以及模型与推理档位选择。会话上下文隔离，共享限长概况；单窗口本机会话原型。',
    stack: ['Swift', 'AppKit', 'Codex CLI'],
    icon: '/images/projects/chimebuddy-v2.webp',
    links: [
      { label: 'GitHub', href: 'https://github.com/ALVIN-YANG/ChimeBuddy' },
      { label: '下载原型', href: 'https://github.com/ALVIN-YANG/ChimeBuddy/releases/tag/v0.2.2' },
    ],
  },
  {
    id: 'chrome-translate',
    name: '翻译 · 多语言',
    category: 'Chrome 扩展',
    status: '开源',
    summary: '网页双语、划词和独立文本翻译，支持多种翻译服务。',
    implementation: '保留网页格式，按可见区域逐步翻译，也支持动态页面。处理请求取消、并发与缓存；词义和例句可朗读，Key 留在扩展本地。',
    stack: ['Manifest V3', '多模型接入', '系统 TTS'],
    icon: '/images/projects/chrome-translate.webp',
    links: [
      { label: 'GitHub', href: 'https://github.com/ALVIN-YANG/chrome-translate' },
      { label: '安装包', href: 'https://github.com/ALVIN-YANG/chrome-translate/releases/latest' },
    ],
  },
  {
    id: 'ay-skills',
    name: 'AY Skills',
    category: 'Agent Skills · 工作流',
    status: '开源',
    summary: '把产品、设计、开发、评审和写作中的工作方法做成独立 Skill。',
    implementation: '明确每个 Skill 的触发条件、职责和验收证据。可按需安装到 Codex、Claude Code 等工具，并用路由测试与工作流场景持续检查。',
    stack: ['Agent Skills', '工作流设计', '行为评测'],
    icon: '/images/projects/ay-skills.webp',
    featured: true,
    links: [
      { label: 'GitHub', href: 'https://github.com/ALVIN-YANG/ay-skills' },
      { label: '中文说明', href: 'https://github.com/ALVIN-YANG/ay-skills/blob/main/README.zh-CN.md' },
    ],
  },
  {
    id: 'senix',
    name: 'Senix',
    category: 'Rust · API 网关',
    status: '开源 · 预览版',
    summary: '一个二进制提供流量代理、管理后台和受限 MCP 工具。',
    implementation: '基于 Pingora，支持实例摘流、回接与诊断。配置变更经过差异检查和批准；MCP 按权限提供工具，调用时再次鉴权。',
    stack: ['Rust', 'Pingora', 'MCP', 'SQLite'],
    icon: '/images/projects/senix.webp',
    featured: true,
    links: [
      { label: 'GitHub', href: 'https://github.com/ALVIN-YANG/senix' },
      { label: '安装与演示', href: 'https://github.com/ALVIN-YANG/senix#快速开始' },
    ],
  },
];
