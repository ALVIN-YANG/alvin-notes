import {
  algorithmTemplates,
  createAlgorithmTemplatePoint,
  getTop30ProblemByRank,
} from './algorithm-curriculum';
import algorithmProblemKnowledge, { CODETOP_UPDATED_AT } from './algorithm-knowledge';
import { createKnowledgeMap, type KnowledgePointSeed } from './create-knowledge-map';

const sourcePoints = algorithmProblemKnowledge.domains.flatMap((domain) => (
  domain.groups.flatMap((group) => group.points)
));
const sourcePointByKey = new Map(sourcePoints.map((point) => [point.key, point]));
const templatePointById = new Map(
  algorithmTemplates.map((template) => [template.id, createAlgorithmTemplatePoint(template)]),
);

const pointSeed = (key: string): KnowledgePointSeed => {
  const point = sourcePointByKey.get(key);
  if (!point) throw new Error(`Missing algorithm learning point ${key}`);
  return point;
};

const templatePoint = (id: string): KnowledgePointSeed => {
  const point = templatePointById.get(id);
  if (!point) throw new Error(`Missing algorithm template point ${id}`);
  return point;
};

const practicePoints = (...ranks: number[]): KnowledgePointSeed[] => ranks.map((rank) => {
  getTop30ProblemByRank(rank);
  return pointSeed(`codetop-${rank}`);
});

const algorithmLearningMap = createKnowledgeMap({
  slug: 'algorithm',
  updatedAt: CODETOP_UPDATED_AT,
  sources: [
    { title: 'CodeTop 高频面试题榜', href: 'https://codetop.cc/home' },
    { title: 'Cognitive Load During Problem Solving', href: 'https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1202_4' },
    { title: 'From example study to problem solving', href: 'https://asu.elsevierpure.com/en/publications/from-example-study-to-problem-solving-smooth-transitions-help-lea/' },
  ],
  domains: [
    {
      module: 'templates',
      title: '从查询与窗口开始',
      short: '定位、窗口与训练规则',
      summary: '先学会识别问题，再决定保存什么状态。',
      groups: [
        { title: '训练规则', level: 'core', points: [pointSeed('training-protocol')] },
        { title: '快速定位', level: 'core', points: [templatePoint('hash-index')] },
        { title: '连续区间', level: 'core', points: [templatePoint('sliding-window')] },
      ],
    },
    {
      module: 'templates',
      title: '让指针有明确分工',
      short: '连接关系与路程关系',
      summary: '画清已经处理、正在处理和尚未处理的部分。',
      groups: [
        { title: '改变连接关系', level: 'core', points: [templatePoint('linked-relink')] },
        { title: '消除路程差', level: 'core', points: [templatePoint('pointer-alignment')] },
      ],
    },
    {
      module: 'templates',
      title: '利用有序性排除答案',
      short: '边界、分区与单调移动',
      summary: '每次移动都要能说明排除了哪些不可能答案。',
      groups: [
        { title: '搜索边界', level: 'core', points: [templatePoint('ordered-boundary')] },
        { title: '有序扫描', level: 'core', points: [templatePoint('ordered-scan')] },
      ],
    },
    {
      module: 'templates',
      title: '只保留仍有价值的候选',
      short: '最近状态与动态最优项',
      summary: '栈顶和堆顶都必须有清楚、可验证的含义。',
      groups: [
        { title: '最近未完成状态', level: 'core', points: [templatePoint('stack')] },
        { title: '当前最优候选', level: 'core', points: [templatePoint('heap')] },
      ],
    },
    {
      module: 'templates',
      title: '展开搜索空间',
      short: '遍历、连通与选择树',
      summary: '先定义访问状态，再选择 BFS、DFS 或回溯。',
      groups: [
        { title: '树图遍历', level: 'core', points: [templatePoint('graph-traversal')] },
        { title: '选择与撤销', level: 'core', points: [templatePoint('backtracking')] },
      ],
    },
    {
      module: 'templates',
      title: '把过程压缩成状态',
      short: '状态转移与边界模拟',
      summary: '用一句话定义状态，用最小输入检查边界。',
      groups: [
        { title: '复用子问题', level: 'core', points: [templatePoint('dp-state')] },
        { title: '翻译明确过程', level: 'core', points: [templatePoint('boundary-simulation')] },
      ],
    },
    {
      module: 'practice',
      title: '查询与窗口实战',
      short: '查询与窗口',
      summary: '先判断保存什么，再处理写入时机和窗口边界。',
      groups: [
        { title: '哈希定位', level: 'scenario', points: practicePoints(14, 2) },
        { title: '滑动窗口', level: 'scenario', points: practicePoints(1) },
      ],
    },
    {
      module: 'practice',
      title: '链表指针实战',
      short: '链表指针',
      summary: '所有修改都先确认后继仍然可达。',
      groups: [
        { title: '链表重连', level: 'scenario', points: practicePoints(3, 10, 20, 5, 25) },
        { title: '路程对齐', level: 'scenario', points: practicePoints(26, 30) },
      ],
    },
    {
      module: 'practice',
      title: '有序性实战',
      short: '有序性',
      summary: '用边界、分区和单调指针缩小搜索空间。',
      groups: [
        { title: '分区与二分', level: 'scenario', points: practicePoints(8, 4, 13) },
        { title: '有序扫描', level: 'scenario', points: practicePoints(15, 6, 27) },
      ],
    },
    {
      module: 'practice',
      title: '候选集合实战',
      short: '候选集合',
      summary: '只保留下一步仍可能被选中的对象。',
      groups: [
        { title: '栈', level: 'scenario', points: practicePoints(17) },
        { title: '最小堆', level: 'scenario', points: practicePoints(23) },
      ],
    },
    {
      module: 'practice',
      title: '搜索空间实战',
      short: '搜索空间',
      summary: '写清访问状态、递归返回值和恢复现场。',
      groups: [
        { title: 'BFS 与 DFS', level: 'scenario', points: practicePoints(12, 11, 21, 22) },
        { title: '回溯', level: 'scenario', points: practicePoints(16) },
      ],
    },
    {
      module: 'practice',
      title: '状态与模拟实战',
      short: '状态与模拟',
      summary: '先定义状态或边界，再把规则翻译成代码。',
      groups: [
        { title: '动态规划', level: 'scenario', points: practicePoints(18, 7, 19, 29) },
        { title: '边界模拟', level: 'scenario', points: practicePoints(28, 24, 9) },
      ],
    },
  ],
});

export default algorithmLearningMap;
