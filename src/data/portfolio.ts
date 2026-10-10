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
  links: { label: string; href: string }[];
}

// App Store listings and the projects' public READMEs are the source of truth.
// Keep shipped capabilities separate from newer work in the local checkouts.
export const portfolio: PortfolioProject[] = [
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
    id: 'chrome-translate',
    name: '翻译 · 多语言',
    category: 'Chrome 扩展',
    status: '开源',
    summary: '网页双语、划词和独立文本翻译，支持多种翻译服务。',
    implementation: '保留网页格式，按可见区域逐步翻译，也支持动态页面。处理请求取消、并发与缓存；词义和例句可朗读，Key 留在扩展本地。',
    stack: ['Manifest V3', '多模型接入', '系统 TTS'],
    mark: '译',
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
    mark: 'AY',
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
    mark: 'S',
    featured: true,
    links: [
      { label: 'GitHub', href: 'https://github.com/ALVIN-YANG/senix' },
      { label: '安装与演示', href: 'https://github.com/ALVIN-YANG/senix#快速开始' },
    ],
  },
];
