import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { domainSources, groupSources } from './agent-knowledge-content.mjs';

const sourcePath = resolve('src/data/agent-knowledge-source.md');
const outputPath = resolve('src/data/agent-knowledge.json');

const domainMeta = [
  { id: 'foundations', code: '1', short: '判断与边界', summary: '先决定要不要用 Agent，再把目标、责任和控制权写清。' },
  { id: 'model-context', code: '2', short: '模型与上下文', summary: '选对模型，只把当前步骤真正需要的信息交给它。' },
  { id: 'knowledge-state', code: '3', short: '知识与状态', summary: '让知识有来源，让记忆可纠正，让运行能够恢复。' },
  { id: 'tools-environment', code: '4', short: '工具与环境', summary: '用清楚的契约连接外部能力，并管住真实副作用。' },
  { id: 'runtime-orchestration', code: '5', short: '运行与编排', summary: '把模型循环变成可以暂停、恢复和长期执行的系统。' },
  { id: 'evaluation-evolution', code: '6', short: '评测与 Trace', summary: '用数据和运行轨迹证明改动真的让系统变好了。' },
  { id: 'safety-governance', code: '7', short: '安全与授权', summary: '把权限、审批、隐私和防护放在模型之外。' },
  { id: 'production-platform', code: '8', short: '生产与运维', summary: '把 Agent 部署成能扩展、能回滚、有人值守的服务。' },
  { id: 'interaction-collaboration', code: '9', short: '交互与进阶', summary: '设计人能理解的界面，再按需要加入实时、多 Agent 和后训练。' },
];

const articleIndex = {
  foundations: [
    { title: '什么时候不该用 AI Agent', href: '/ai/when-not-to-use-ai-agent/' },
    { title: 'Function Call、Agent、MCP 与 Skill', href: '/ai/function-call-agent/' },
  ],
  'model-context': [
    { title: 'Context Engineering 怎么做', href: '/ai/context-engineering-guide/' },
    { title: 'Prompt 怎样写成可执行任务', href: '/ai-workflow/chapters/16-prompt-task-contract-practice/' },
  ],
  'knowledge-state': [
    { title: 'RAG 技术全景与选型', href: '/rag/chapters/rag-primer/' },
    { title: 'AI Agent 记忆系统设计', href: '/ai/agent-memory-system-design/' },
  ],
  'tools-environment': [
    { title: '生产级 Agent Tool 怎么设计', href: '/ai/production-agent-tool-design/' },
    { title: 'Function Call、Agent、MCP 与 Skill', href: '/ai/function-call-agent/' },
  ],
  'runtime-orchestration': [
    { title: 'Agent 状态保存与恢复', href: '/ai/agent-context-persistence-recovery/' },
    { title: '虚拟角色任务系统', href: '/architecture/virtual-character-workflow-task-system/' },
  ],
  'evaluation-evolution': [
    { title: 'AI Agent 怎么做评测', href: '/ai/agent-evaluation-observability/' },
    { title: 'RAG 元数据过滤与验证', href: '/rag/chapters/rag-metadata-filtering/' },
  ],
  'safety-governance': [
    { title: 'AI Agent 安全工程', href: '/ai/agent-security-engineering/' },
    { title: 'Agent 怎样防 Prompt Injection', href: '/ai/agent-prompt-injection-defense/' },
  ],
  'production-platform': [
    { title: '事件驱动架构怎么落地', href: '/architecture/event-driven-architecture-outbox-idempotency/' },
    { title: 'Agent 状态保存与恢复', href: '/ai/agent-context-persistence-recovery/' },
  ],
  'interaction-collaboration': [
    { title: '实时语音 Agent 怎么做', href: '/ai/realtime-voice-agent-engineering/' },
    { title: '多智能体架构选型', href: '/ai/multi-agent-architecture-selection/' },
  ],
};

const relationsByTitle = [
  ['Agent 适合什么任务', '什么时候停止 Agent Loop', '边界'],
  ['Harness 负责做什么', '观察、判断、行动和验证', '运行'],
  ['上下文预算怎么分', 'Token 和上下文窗口', '预算'],
  ['工具结果怎样进入上下文', '直接和间接 Prompt Injection', '安全'],
  ['JSON Schema', '输入和输出 Schema', '契约'],
  ['记忆污染', '从生产 Trace 到训练数据', '演进'],
  ['幂等键', 'Webhook、队列和定时器', '恢复'],
  ['超时后的状态确认', '超时和重试预算', '可靠性'],
  ['Checkpoint 和 Snapshot', 'Checkpoint 和 Durable Execution', '恢复'],
  ['首错归因', '生产失败回流', '改进'],
  ['哪些动作必须审批', '人工审批和恢复', '控制'],
  ['为什么默认从单 Agent 开始', '多 Agent 的启用条件', '选型'],
];

const markdown = await readFile(sourcePath, 'utf8');
const domains = [];
let domain = null;
let group = null;
let pendingPoint = null;

const flushPoint = () => {
  if (!pendingPoint || !group) return;
  const content = parseBlocks(pendingPoint.lines);
  if (!content.length) throw new Error(`Missing explanation for point: ${pendingPoint.title}`);
  const pointNumber = group.points.length + 1;
  group.points.push({
    id: `${group.id}-p${pointNumber}`,
    code: `${group.code}.${pointNumber}`,
    title: pendingPoint.title,
    content,
  });
  pendingPoint = null;
};

for (const line of markdown.split(/\r?\n/)) {
  const domainMatch = line.match(/^##\s+(\d{2})\s+(.+)$/);
  if (domainMatch && Number(domainMatch[1]) >= 1 && Number(domainMatch[1]) <= domainMeta.length) {
    flushPoint();
    const meta = domainMeta[Number(domainMatch[1]) - 1];
    domain = { ...meta, title: normalize(domainMatch[2]), groups: [] };
    domains.push(domain);
    group = null;
    continue;
  }

  const groupMatch = line.match(/^###\s+(.+?)[\s　]+(核心|场景|进阶)$/);
  if (groupMatch && domain) {
    flushPoint();
    const title = normalize(groupMatch[1]);
    const references = groupSources[title];
    if (!references) throw new Error(`Missing book references for group: ${title}`);
    group = {
      id: `${domain.id}-g${domain.groups.length + 1}`,
      code: `${domain.code}.${domain.groups.length + 1}`,
      title,
      level: groupMatch[2] === '核心' ? 'core' : groupMatch[2] === '场景' ? 'scenario' : 'advanced',
      references,
      points: [],
    };
    domain.groups.push(group);
    continue;
  }

  const pointMatch = line.match(/^-\s+(.+)$/);
  if (pointMatch && group) {
    flushPoint();
    pendingPoint = { title: normalize(pointMatch[1]), lines: [] };
    continue;
  }

  if (pendingPoint && (line.startsWith('  ') || line.trim() === '')) {
    pendingPoint.lines.push(line.startsWith('  ') ? line.slice(2) : '');
  }
}

flushPoint();

if (domains.length !== domainMeta.length) {
  throw new Error(`Expected ${domainMeta.length} domains, found ${domains.length}`);
}

const points = domains.flatMap((item) => item.groups.flatMap((entry) => entry.points));
const pointByTitle = new Map(points.map((point) => [point.title, point]));
if (pointByTitle.size !== points.length) throw new Error('Point titles must be unique');

const relations = relationsByTitle.flatMap(([fromTitle, toTitle, type]) => {
  const from = pointByTitle.get(fromTitle);
  const to = pointByTitle.get(toTitle);
  if (!from || !to) {
    console.warn(`Skipped missing relation: ${fromTitle} -> ${toTitle}`);
    return [];
  }
  return [{ from: from.id, to: to.id, type }];
});

const output = {
  meta: {
    version: 3,
    updatedAt: '2026-08-21',
    domainCount: domains.length,
    groupCount: domains.reduce((total, item) => total + item.groups.length, 0),
    pointCount: points.length,
    sources: [
      { title: '《智能体 AI 漫游指南》', href: 'https://github.com/Chasing1020/agentic-ai-guide-zh' },
      { title: '《深入理解 AI Agent》', href: null },
    ],
  },
  domains: domains.map((item) => ({
    ...item,
    references: domainSources[item.id] ?? [],
    articles: articleIndex[item.id] ?? [],
  })),
  relations,
};

await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Wrote ${output.meta.domainCount} domains, ${output.meta.groupCount} groups and ${output.meta.pointCount} points to ${outputPath}`);

function parseBlocks(lines) {
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    const text = normalize(paragraph.join(' '));
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: list.map(normalize).filter(Boolean) });
    list = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^####\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: normalize(heading[1]) });
      continue;
    }
    const listItem = line.match(/^-\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  if (
    blocks.length === 2
    && blocks.every((block) => block.type === 'paragraph')
    && blocks.reduce((total, block) => total + block.text.length, 0) <= 140
  ) {
    return [{ type: 'paragraph', text: `${blocks[0].text}${blocks[1].text}` }];
  }
  return blocks;
}

function normalize(value) {
  return String(value ?? '')
    .replace(/([\u3400-\u9fff])\s+([\u3400-\u9fff])/g, '$1$2')
    .replace(/\s+([，。；])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
