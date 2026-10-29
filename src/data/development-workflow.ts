export const workflowMeta = {
  updatedAt: '2026-10-30',
  summary: '对齐上下文、审核方案、设定 Loop 目标，再按真实结果验收。AI 在已确认的范围内执行。',
  source: { title: '黄同学h：AI 开发心得', href: 'https://x.com/huangtongxueh/status/2108577165306687938' },
  changes: ['明确上下文、方案、Loop 与验收的管理职责', '保留已有任务模板与验证工具', '增加 AY Skills 使用参考'],
};

export const workflowSteps = [
  {
    id: 'align', title: '对齐需求', actor: '你 + Codex', action: '只补会影响实现或验收的缺口，材料足够就继续。',
    inputs: ['目标与现状', '相关代码、文档或反馈', '允许修改的范围'],
    outputs: ['目标、范围与完成条件', '已确认事实与关键取舍'],
    prompt: '结合当前代码和已有材料，整理目标、范围、约束与可观察的验收标准。区分已确认事实、推断和缺失信息。先查能查明的事实，只问会改变实现方向或验收结果的问题；上下文足够时直接推进，不重复访谈。',
    note: '需求材料冲突时，先定位冲突。实现细节可以在读代码后决定。',
    reference: { title: '任务说明模板', href: '/ai-workflow/chapters/16-prompt-task-contract-practice/' },
  },
  {
    id: 'design', title: '方案与审核', actor: 'Codex 提案，你审核关键取舍', action: '从问题和证据出发，选择满足约束的简单方案。',
    inputs: ['确认后的任务', '现有实现与依赖', '影响取舍的证据'],
    outputs: ['推荐方案与关键理由', '需要先验证的假设'],
    prompt: '从目标、约束和当前证据出发，用第一性原理重新检查问题。优先复用现有实现、标准库和平台能力。对候选方案使用奥卡姆剃刀：说明每个新增机制解决什么已知问题，删除不必要的复杂度，但保留正确性、权限与恢复要求。有关键技术疑问时做最小验证，再决定实现。',
    note: '跨模块或跨会话的大任务，再把决定写成规格和可独立验收的小任务。',
    reference: { title: '模块与流程选择', href: '/ai-workflow/chapters/11-mattpocock-skills-deep-dive/' },
  },
  {
    id: 'diagnose', title: '定位问题', actor: 'Codex', action: '先复现并缩小范围，再检验假设。',
    inputs: ['失败现象与复现条件', '相关版本和环境', '必要日志或 Trace'],
    outputs: ['可复现的失败', '支持根因判断的证据'],
    prompt: '先复现我描述的问题，再沿请求、状态和数据变化定位。区分事实与假设，每个假设都给出可证伪的观察，一次改变一个主要变量。不要靠随机改代码碰运气。确认根因后完成必要修复与回归验证；凭证和敏感内容不进入输出。',
    note: '无法复现时，交付已经排除的路径与具体缺口，不编造根因。',
    reference: { title: '自测与证据路径', href: '/ai-workflow/chapters/13-context-engineering-effect-cost-notes/' },
  },
  {
    id: 'implement', title: '实现', actor: 'Codex', action: '一次交付一个可验证的改动，持续做到完成。',
    inputs: ['本轮目标', '修改范围与已有授权', '相关项目约定'],
    outputs: ['解决问题的最小改动', '相关检查结果'],
    prompt: '读取相关实现和项目约定，在已授权范围内完成当前任务。保留无关改动，优先复用现有能力，不为假设中的未来增加抽象、依赖或配置。只使用对这次改动有意义的测试与检查。复杂任务拆成可独立验收的小增量；只有真正独立且允许委派的部分才并行，主 Agent 负责集成和验证。',
    note: 'Loop 按实现 → 验证 → 必要修复推进。满足验收标准即结束；超出范围、达到预算或缺少必要条件时停下，不无休止重试。',
    reference: { title: 'Skills 按需使用', href: '/ai-workflow/chapters/ai-coding-skills-selection-guide/' },
  },
  {
    id: 'verify', title: '验证结果', actor: 'Codex', action: '从真实入口走到预期结果，检查有意义的失败分支。',
    inputs: ['事先确定的验收标准', '可用的测试环境与账号', '业务入口和结果查询方式'],
    outputs: ['输入、预期、实际与证据', '未覆盖的环境或场景'],
    prompt: '按已确定的业务契约验收，不以系统当前返回值反推正确答案。运行与改动相称的检查；需要端到端验证时，从浏览器、API 或 CLI 的真实入口走到用户结果，并按需核对数据库、日志或 Trace。记录版本、输入、预期、实际和证据，覆盖相关失败分支。环境不足时明确缺口，不把模拟、HTTP 200 或单测通过当成完整交付。',
    note: '这些环境能力需要项目提供。没有现成入口时，先补最小可复用能力。',
    reference: { title: '一次实际交付的验收', href: '/ops/spring-boot-vm-graceful-rolling-deployment/' },
  },
  {
    id: 'review', title: '独立审查', actor: '其他 Agent 按需参与', action: '找能推翻方案或实现的反例，统一交回 Codex 修复。',
    inputs: ['原始需求与验收标准', '固定版本的方案或 diff', '必要上下文与已完成验证'],
    outputs: ['具体问题、影响与证据', '应修复项与未验证项'],
    prompt: '独立审查这份方案或改动。优先寻找能推翻核心假设的反例，沿业务路径检查权限、状态变化、并发、重试、数据一致性和恢复。每项问题给出位置、触发条件、影响与证据；检查新增机制是否必要。不要为找问题而制造问题，也不要因为作者给出的测试通过就预设实现正确。把发现交回主 Agent 修复并重新验证。',
    note: '关键方案、高风险改动或复杂问题再加入这一环；审查者不同时修改同一份代码。',
    reference: { title: '多 Agent 怎样分工', href: '/ai/multi-agent-architecture-selection/' },
  },
  {
    id: 'deliver', title: '人工验收', actor: '你', action: '看业务结果、关键逻辑与证据，决定交付。',
    inputs: ['本次 diff 与关键逻辑', '验收结果和失败分支', '仍未验证的部分'],
    outputs: ['可审查的交付说明', '对应授权下的发布结果'],
    prompt: '整理本次交付：解决了什么、改了哪里、哪些验收标准已经满足，分别附证据。突出关键业务逻辑、取舍和未验证项，不用长过程日志代替结论。提交、推送、部署和线上验收分别报告；有对应授权时继续完成，不把其中一步成功当成全部完成。',
    note: '重点看权限、状态与业务约束。需要合并或发布时，检查已有授权与目标环境。',
    reference: { title: '人负责目标与验收', href: '/ai-workflow/chapters/12-vibe-coding-software-engineering-notes/' },
  },
  {
    id: 'handoff', title: '交接任务', actor: 'Codex → 接手 Agent', action: '让接手者能直接继续工作，保留约束和未完成事项。',
    inputs: ['目标与当前进度', '当前版本、相关文件', '执行与验证记录'],
    outputs: ['可执行的交接记录', '下一步与阻塞点'],
    prompt: '生成可移植的交接记录，重点写接下来从哪里继续：目标、范围、权限与约束，当前 commit 和本地改动，相关文件路径，复现或验证命令，已完成结果及证据，未解决的问题和下一步。区分事实、推断与待验证项，保留原始来源；不复制全部聊天，不写入凭证。',
    note: '当前上下文仍准确且任务可继续时，直接继续；跨工具、会话或目录时再交接。',
    reference: { title: '状态保存与恢复', href: '/ai/agent-context-persistence-recovery/' },
  },
] as const;

export const workflowScenarios = [
  { id: 'small', title: '小改动', description: '目标清楚，范围小。', steps: ['implement', 'verify', 'deliver'] },
  { id: 'feature', title: '新功能', description: '先补关键决定，再按增量交付。', steps: ['align', 'design', 'implement', 'verify', 'deliver'] },
  { id: 'bug', title: '排查 Bug', description: '复现 → 根因 → 修复 → 验收。', steps: ['diagnose', 'implement', 'verify', 'deliver'] },
  { id: 'handoff', title: '换 Agent / 会话', description: '保存可直接继续的上下文。', steps: ['handoff'] },
] as const;

export const thinkingPrompts = [
  { id: 'fundamentals', signal: '怀疑解题方向错了', name: '第一性原理', prompt: '从目标、约束和已知事实重新定义问题，先定位真实瓶颈。比较最小必要方案，不沿着既定实现继续堆机制；结论附可核对证据。', result: '问题、瓶颈证据、最小方案' },
  { id: 'adversarial', signal: '想找方案的反例', name: '对抗性审查', prompt: '优先寻找能推翻核心假设的反例。每个发现给出触发条件、具体影响和证据，区分成立的问题与尚未验证的猜测。', result: '反例、影响、验证方式' },
  { id: 'ablation', signal: '不知道优化来自哪里', name: '消融实验', prompt: '设计消融实验：固定任务、数据、环境和质量标准，列出基线、移除或单独启用各机制的对照、指标与重复方式。区分实验计划和已测结果，按收益与成本判断保留项。', result: '对照组合、指标、保留依据' },
  { id: 'simplicity', signal: '设计越来越复杂', name: '奥卡姆剃刀', prompt: '在满足当前需求、约束和可靠性的前提下，检查每个新增机制的必要性。优先复用现有实现和原生能力，删去没有证据支持的复杂度，说明哪些保护仍然保留。', result: '必要机制、可删除项、理由' },
  { id: 'boundaries', signal: '职责和依赖混乱', name: '高内聚、低耦合', prompt: '按职责、信息隐藏和依赖方向检查模块边界。给出具体调用路径与改动理由，不为拆文件而拆；验证新边界是否减少调用方需要知道的细节。', result: '职责边界、依赖、改动依据' },
] as const;

export const testEnvironment = [
  { title: '环境与数据', body: '能启动、准备数据、确认版本与权限，也能清理和重置。' },
  { title: '业务入口', body: '通过浏览器、API 或 CLI 执行用户真正要完成的任务。' },
  { title: '结果查询', body: '按需查落库、日志与 Trace，追到结果或失败原因。' },
  { title: '预期与断言', body: '正确答案来自业务契约；返回成功不能替代结果验证。' },
] as const;
