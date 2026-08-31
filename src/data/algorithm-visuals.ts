import type {
  KnowledgeContentBlock,
  KnowledgeVisualFrame,
  KnowledgeVisualRow,
} from './create-knowledge-map';

type AlgorithmVisual = Extract<KnowledgeContentBlock, { type: 'visual' }>;
type VisualKind = AlgorithmVisual['kind'];

const frame = (
  step: string,
  items: KnowledgeVisualRow['items'],
  note: string,
  label?: string,
): KnowledgeVisualFrame => ({
  step,
  rows: [{ ...(label ? { label } : {}), items }],
  note,
});

const layeredFrame = (
  step: string,
  rows: readonly KnowledgeVisualRow[],
  note: string,
): KnowledgeVisualFrame => ({ step, rows, note });

const visual = (
  kind: VisualKind,
  label: string,
  caption: string,
  frames: readonly KnowledgeVisualFrame[],
  sourceHref?: string,
): AlgorithmVisual => ({
  type: 'visual',
  kind,
  label,
  caption,
  frames,
  ...(sourceHref ? { sourceHref, sourceLabel: '原题动画' } : {}),
});

export const interviewProtocolVisual = visual(
  'flow',
  '一轮算法面试的完整作答流程',
  '把分析、编码和验收连成一个可观察的过程',
  [
    frame('澄清问题', [['输入', 'active'], ['→', 'arrow'], ['输出', 'focus'], ['→', 'arrow'], ['边界', 'target']], '先统一题意和无解约定'),
    frame('推导方案', [['基线', 'plain'], ['→', 'arrow'], ['重复计算', 'evicted'], ['→', 'arrow'], ['状态', 'active']], '从能工作的方案推到更优解'),
    frame('编码', [['不变量', 'target'], ['→', 'arrow'], ['Java', 'active'], ['→', 'arrow'], ['复杂度', 'focus']], '边写边保持区间和状态语义'),
    frame('验收', [['最小用例', 'plain'], ['→', 'arrow'], ['关键分支', 'active'], ['→', 'arrow'], ['修错', 'result']], '找到被破坏的不变量再修改'),
  ],
);

const algorithmVisuals: Record<string, AlgorithmVisual> = {
  '3': visual(
    'sequence',
    '字符串 abba 的滑动窗口演算',
    '重复字符出现后，left 只能向右跳',
    [
      frame('right 读入 a', [['a', 'active'], ['b', 'muted'], ['b', 'muted'], ['a', 'muted']], '窗口 [0, 0] · 最长 1'),
      frame('right 读入 b', [['a', 'active'], ['b', 'active'], ['b', 'muted'], ['a', 'muted']], '窗口 [0, 1] · 最长 2'),
      frame('b 重复，left 跳到 2', [['a', 'muted'], ['b', 'duplicate'], ['b', 'active'], ['a', 'muted']], '旧 b 移出窗口，left 不回退'),
      frame('right 读入 a', [['a', 'muted'], ['b', 'muted'], ['b', 'active'], ['a', 'active']], '窗口 [2, 3] · 最长仍为 2'),
    ],
    'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0003-Longest-Substring-Without-Repeating-Characters',
  ),
  '146': visual(
    'linked-list',
    '容量为三的 LRU 访问与淘汰演算',
    '每次访问移到表头，容量溢出时淘汰表尾',
    [
      frame('put(1), put(2), put(3)', [['MRU', 'muted'], ['→', 'arrow'], ['3', 'active'], ['2', 'plain'], ['1', 'plain'], ['→', 'arrow'], ['LRU', 'muted']], '链表顺序为 3 · 2 · 1'),
      frame('get(1) 命中', [['MRU', 'muted'], ['→', 'arrow'], ['1', 'active'], ['3', 'plain'], ['2', 'plain'], ['→', 'arrow'], ['LRU', 'muted']], '节点 1 被移到表头'),
      frame('put(4) 容量溢出', [['4', 'active'], ['1', 'plain'], ['3', 'plain'], ['2', 'evicted']], '表尾节点 2 成为淘汰对象'),
      frame('同步删除映射', [['MRU', 'muted'], ['→', 'arrow'], ['4', 'active'], ['1', 'plain'], ['3', 'plain'], ['→', 'arrow'], ['LRU', 'muted']], '链表与 Map 都只保留 4、1、3'),
    ],
    'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0146-LRU-Cache',
  ),
  '206': visual(
    'linked-list',
    '反转链表的指针变化演算',
    '先保存 next，再反转当前指针',
    [
      frame('初始状态', [['1', 'active'], ['→', 'arrow'], ['2', 'plain'], ['→', 'arrow'], ['3', 'plain'], ['→', 'arrow'], ['∅', 'muted']], 'prev = null · curr = 1'),
      frame('反转节点 1', [['∅', 'muted'], ['←', 'arrow'], ['1', 'active'], [' ', 'gap'], ['2', 'focus'], ['→', 'arrow'], ['3', 'plain']], 'prev = 1 · curr = 2'),
      frame('反转节点 2', [['∅', 'muted'], ['←', 'arrow'], ['1', 'plain'], ['←', 'arrow'], ['2', 'active'], [' ', 'gap'], ['3', 'focus']], 'prev = 2 · curr = 3'),
      frame('curr 到达 null', [['3', 'result'], ['→', 'arrow'], ['2', 'plain'], ['→', 'arrow'], ['1', 'plain'], ['→', 'arrow'], ['∅', 'muted']], '返回新头节点 3'),
    ],
    'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0206-Reverse-Linked-List',
  ),
  '215': visual(
    'sequence',
    'Quickselect 寻找第 K 大元素的分区演算',
    '比较 pivot 下标与 target，只保留目标所在区间',
    [
      frame('k = 2，target = 4', [['3', 'plain'], ['2', 'plain'], ['1', 'plain'], ['5', 'plain'], ['6', 'target'], ['4', 'focus']], '只需找到升序下标 4'),
      frame('选择 pivot = 4 并分区', [['3', 'plain'], ['2', 'plain'], ['1', 'plain'], ['4', 'active'], ['6', 'focus'], ['5', 'focus']], 'pivot 下标 3 小于 target，丢弃左半段'),
      frame('在右半段继续分区', [['3', 'muted'], ['2', 'muted'], ['1', 'muted'], ['4', 'muted'], ['5', 'active'], ['6', 'focus']], 'pivot 下标 4 等于 target'),
      frame('命中目标', [['3', 'muted'], ['2', 'muted'], ['1', 'muted'], ['4', 'muted'], ['5', 'result'], ['6', 'plain']], '第 2 大元素是 5，无需完成全排序'),
    ],
    'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0215-Kth-Largest-Element-in-an-Array',
  ),
  '25': visual(
    'linked-list',
    'K 个一组翻转链表的分组连接',
    '先确认一组够 K 个节点，再反转并接回',
    [
      frame('找到第一组边界', [['D', 'muted'], ['→', 'arrow'], ['1', 'active'], ['→', 'arrow'], ['2', 'target'], ['→', 'arrow'], ['3', 'plain'], ['→', 'arrow'], ['4', 'plain']], 'k = 2，groupNext = 3'),
      frame('反转第一组', [['D', 'muted'], ['→', 'arrow'], ['2', 'active'], ['→', 'arrow'], ['1', 'focus'], ['→', 'arrow'], ['3', 'plain'], ['→', 'arrow'], ['4', 'plain']], '旧组头 1 变成新组尾'),
      frame('反转第二组', [['2', 'plain'], ['→', 'arrow'], ['1', 'plain'], ['→', 'arrow'], ['4', 'active'], ['→', 'arrow'], ['3', 'focus']], '每轮都重新确认组边界'),
      frame('完成连接', [['2', 'result'], ['→', 'arrow'], ['1', 'plain'], ['→', 'arrow'], ['4', 'result'], ['→', 'arrow'], ['3', 'plain']], '不足 K 个的尾段保持原顺序'),
    ],
  ),
  '15': visual(
    'sequence',
    '三数之和的排序与双指针',
    '固定一个数，另外两个指针根据和向内移动',
    [
      frame('排序后固定 -1', [['-4', 'muted'], ['-1', 'active'], ['-1', 'focus'], ['0', 'plain'], ['1', 'plain'], ['2', 'target']], 'left = 2 · right = 5'),
      frame('当前和为 0', [['-4', 'muted'], ['-1', 'active'], ['-1', 'result'], ['0', 'plain'], ['1', 'plain'], ['2', 'result']], '得到 [-1, -1, 2]'),
      frame('跳过重复值', [['-4', 'muted'], ['-1', 'active'], ['-1', 'muted'], ['0', 'focus'], ['1', 'target'], ['2', 'muted']], '移动左右指针并去重'),
      frame('找到另一组', [['-4', 'muted'], ['-1', 'active'], ['-1', 'muted'], ['0', 'result'], ['1', 'result'], ['2', 'muted']], '得到 [-1, 0, 1]'),
    ],
  ),
  '53': visual(
    'sequence',
    '最大子数组的局部选择',
    '当历史和已经为负，从当前元素重新开始',
    [
      frame('负和无法带来收益', [['-2', 'evicted'], ['1', 'active'], ['-3', 'plain'], ['4', 'plain'], ['-1', 'plain'], ['2', 'plain'], ['1', 'plain']], 'current = 1 · best = 1'),
      frame('遇到 4 重新开始', [['-2', 'muted'], ['1', 'muted'], ['-3', 'evicted'], ['4', 'active'], ['-1', 'plain'], ['2', 'plain'], ['1', 'plain']], 'current = 4 · best = 4'),
      frame('继续向右扩展', [['-2', 'muted'], ['1', 'muted'], ['-3', 'muted'], ['4', 'active'], ['-1', 'active'], ['2', 'active'], ['1', 'active']], 'current = 6 · best = 6'),
      frame('最优区间确定', [['-2', 'muted'], ['1', 'muted'], ['-3', 'muted'], ['4', 'result'], ['-1', 'result'], ['2', 'result'], ['1', 'result']], '最大子数组和为 6'),
    ],
  ),
  '补充题 4': visual(
    'sequence',
    '快速排序的分区过程',
    'pivot 就位后，左右区间再独立处理',
    [
      frame('选择 pivot = 4', [['6', 'plain'], ['3', 'plain'], ['8', 'plain'], ['2', 'plain'], ['5', 'plain'], ['4', 'target']], 'write 指向左边界'),
      frame('扫描并交换小元素', [['3', 'focus'], ['2', 'focus'], ['8', 'plain'], ['6', 'plain'], ['5', 'plain'], ['4', 'target']], '[left, write) 都不大于 pivot'),
      frame('pivot 放入最终位置', [['3', 'plain'], ['2', 'plain'], ['4', 'active'], ['6', 'plain'], ['5', 'plain'], ['8', 'plain']], '4 的排序位置已确定'),
      frame('递归处理两侧', [['2', 'result'], ['3', 'result'], ['4', 'active'], ['5', 'result'], ['6', 'result'], ['8', 'result']], '每次递归都排除已就位的 pivot'),
    ],
  ),
  '5': visual(
    'sequence',
    '最长回文子串的中心扩展',
    '同时检查单字符中心和字符间中心',
    [
      frame('选择字符 a 为中心', [['b', 'focus'], ['a', 'active'], ['b', 'focus'], ['a', 'plain'], ['d', 'plain']], '左右都是 b，可以扩展'),
      frame('扩展到 bab', [['b', 'active'], ['a', 'active'], ['b', 'active'], ['a', 'plain'], ['d', 'plain']], '再向外已经到达左边界，停止'),
      frame('枚举下一个中心', [['b', 'plain'], ['a', 'plain'], ['b', 'focus'], ['a', 'active'], ['d', 'focus']], '该中心最长长度为 1'),
      frame('保留最长区间', [['b', 'result'], ['a', 'result'], ['b', 'result'], ['a', 'muted'], ['d', 'muted']], '返回 bab'),
    ],
  ),
  '21': visual(
    'linked-list',
    '合并两个有序链表',
    '每次接入两个当前节点中的较小者',
    [
      layeredFrame('比较两个头节点', [
        { label: 'A', items: [['1', 'active'], ['→', 'arrow'], ['3', 'plain'], ['→', 'arrow'], ['5', 'plain']] },
        { label: 'B', items: [['2', 'focus'], ['→', 'arrow'], ['4', 'plain'], ['→', 'arrow'], ['6', 'plain']] },
      ], '1 更小，接入结果链表'),
      layeredFrame('移动 A 的指针', [
        { label: '结果', items: [['1', 'result']] },
        { label: '候选', items: [['3', 'focus'], ['2', 'active']] },
      ], '2 更小，继续接入'),
      layeredFrame('交替选择小节点', [
        { label: '结果', items: [['1', 'result'], ['→', 'arrow'], ['2', 'result'], ['→', 'arrow'], ['3', 'result'], ['→', 'arrow'], ['4', 'result']] },
        { label: '剩余', items: [['5', 'active'], ['6', 'focus']] },
      ], '已接入部分始终有序'),
      frame('直接接上剩余链表', [['1', 'result'], ['2', 'result'], ['3', 'result'], ['4', 'result'], ['5', 'result'], ['6', 'result']], '一条链表耗尽后，另一条整段已经有序'),
    ],
  ),
  '200': visual(
    'grid',
    '岛屿数量的洪泛标记',
    '从一块未访问陆地出发，标记完整连通块',
    [
      layeredFrame('发现第一块陆地', [
        { items: [['1', 'active'], ['1', 'plain'], ['0', 'muted'], ['0', 'muted']] },
        { items: [['1', 'plain'], ['0', 'muted'], ['0', 'muted'], ['1', 'plain']] },
        { items: [['0', 'muted'], ['0', 'muted'], ['1', 'plain'], ['1', 'plain']] },
      ], '计数加一，从左上角开始 DFS'),
      layeredFrame('标记第一个连通块', [
        { items: [['已', 'result'], ['已', 'result'], ['0', 'muted'], ['0', 'muted']] },
        { items: [['已', 'result'], ['0', 'muted'], ['0', 'muted'], ['1', 'plain']] },
        { items: [['0', 'muted'], ['0', 'muted'], ['1', 'plain'], ['1', 'plain']] },
      ], '同一块岛屿内的陆地不再重复计数'),
      layeredFrame('发现第二块陆地', [
        { items: [['已', 'muted'], ['已', 'muted'], ['0', 'muted'], ['0', 'muted']] },
        { items: [['已', 'muted'], ['0', 'muted'], ['0', 'muted'], ['1', 'active']] },
        { items: [['0', 'muted'], ['0', 'muted'], ['1', 'focus'], ['1', 'focus']] },
      ], '计数再加一'),
      layeredFrame('所有陆地处理完成', [
        { items: [['已', 'result'], ['已', 'result'], ['0', 'muted'], ['0', 'muted']] },
        { items: [['已', 'result'], ['0', 'muted'], ['0', 'muted'], ['已', 'result']] },
        { items: [['0', 'muted'], ['0', 'muted'], ['已', 'result'], ['已', 'result']] },
      ], '共有两个连通块'),
    ],
  ),
  '102': visual(
    'tree',
    '二叉树层序遍历的队列变化',
    '每轮先固定队列长度，这个长度就是当前层节点数',
    [
      layeredFrame('处理根节点', [
        { label: 'L0', items: [['3', 'active']] },
        { label: 'L1', items: [['9', 'plain'], ['20', 'plain']] },
        { label: 'L2', items: [['15', 'plain'], ['7', 'plain']] },
      ], '队列 [3]，本层 size = 1'),
      layeredFrame('处理第一层', [
        { label: '结果', items: [['3', 'result']] },
        { label: '队列', items: [['9', 'active'], ['20', 'active']] },
      ], '本层 size = 2，新入队节点留给下一轮'),
      layeredFrame('处理第二层', [
        { label: '结果', items: [['3', 'result'], ['9,20', 'result']] },
        { label: '队列', items: [['15', 'active'], ['7', 'active']] },
      ], '队列中只剩最后一层'),
      layeredFrame('遍历完成', [
        { label: 'L0', items: [['3', 'result']] },
        { label: 'L1', items: [['9', 'result'], ['20', 'result']] },
        { label: 'L2', items: [['15', 'result'], ['7', 'result']] },
      ], '结果按层分组'),
    ],
  ),
  '33': visual(
    'sequence',
    '搜索旋转排序数组',
    '每轮先找到有序的一半，再判断 target 是否在其中',
    [
      frame('初始区间', [['4', 'plain'], ['5', 'plain'], ['6', 'plain'], ['7', 'active'], ['0', 'target'], ['1', 'plain'], ['2', 'plain']], 'mid = 7，左半段 [4,7] 有序'),
      frame('target 不在左半段', [['4', 'muted'], ['5', 'muted'], ['6', 'muted'], ['7', 'muted'], ['0', 'target'], ['1', 'active'], ['2', 'plain']], '丢弃左半段，进入 [0,1,2]'),
      frame('右半段继续二分', [['4', 'muted'], ['5', 'muted'], ['6', 'muted'], ['7', 'muted'], ['0', 'target'], ['1', 'active'], ['2', 'muted']], 'target 在 mid 左侧'),
      frame('命中 target', [['4', 'muted'], ['5', 'muted'], ['6', 'muted'], ['7', 'muted'], ['0', 'result'], ['1', 'muted'], ['2', 'muted']], '返回下标 4'),
    ],
  ),
  '1': visual(
    'sequence',
    '两数之和的哈希表查找',
    '每读入一个数，先查它的补数是否已经出现',
    [
      frame('读入 2', [['2', 'active'], ['7', 'plain'], ['11', 'plain'], ['15', 'plain']], '需要补数 7，Map 中暂时没有'),
      layeredFrame('记录 2 的下标', [
        { label: '数组', items: [['2', 'plain'], ['7', 'active'], ['11', 'plain'], ['15', 'plain']] },
        { label: 'Map', items: [['2→0', 'focus']] },
      ], '读入 7，它的补数是 2'),
      layeredFrame('在 Map 中命中 2', [
        { label: '数组', items: [['2', 'result'], ['7', 'result'], ['11', 'muted'], ['15', 'muted']] },
        { label: '下标', items: [['0', 'result'], ['1', 'result']] },
      ], '返回 [0, 1]'),
    ],
  ),
  '88': visual(
    'sequence',
    '从尾部合并两个有序数组',
    '先写入较大值，避免覆盖 nums1 中尚未处理的元素',
    [
      layeredFrame('三个指针从尾部开始', [
        { label: 'nums1', items: [['1', 'plain'], ['2', 'plain'], ['3', 'active'], ['_', 'target'], ['_', 'plain'], ['_', 'plain']] },
        { label: 'nums2', items: [['2', 'plain'], ['5', 'plain'], ['6', 'focus']] },
      ], '比较 3 和 6，先写 6'),
      layeredFrame('继续从后向前写', [
        { label: 'nums1', items: [['1', 'plain'], ['2', 'plain'], ['3', 'active'], ['_', 'target'], ['5', 'result'], ['6', 'result']] },
        { label: 'nums2', items: [['2', 'plain'], ['5', 'muted'], ['6', 'muted']] },
      ], '下一步比较 3 和 2'),
      frame('写完剩余元素', [['1', 'result'], ['2', 'result'], ['2', 'result'], ['3', 'result'], ['5', 'result'], ['6', 'result']], '结果区间始终保持有序'),
    ],
  ),
  '46': visual(
    'tree',
    '全排列的回溯决策树',
    '路径中不能重复选择已使用的数',
    [
      layeredFrame('从空路径开始', [
        { label: '路径', items: [['_', 'active']] },
        { label: '候选', items: [['1', 'focus'], ['2', 'plain'], ['3', 'plain']] },
      ], '第一层可选 1、2、3'),
      layeredFrame('选择 1，继续向下', [
        { label: '路径', items: [['1', 'active'], ['_', 'target']] },
        { label: '候选', items: [['1', 'muted'], ['2', 'focus'], ['3', 'plain']] },
      ], 'used[1] 为 true，本路径不再选 1'),
      layeredFrame('得到一个完整排列', [
        { label: '路径', items: [['1', 'result'], ['2', 'result'], ['3', 'result']] },
        { label: '回退', items: [['3', 'evicted'], ['→', 'arrow'], ['2', 'active']] },
      ], '记录 [1,2,3]，撤销最后一步'),
      layeredFrame('换一条分支', [
        { label: '路径', items: [['1', 'active'], ['3', 'active'], ['2', 'result']] },
        { label: '结果', items: [['123', 'plain'], ['132', 'result'], ['…', 'muted']] },
      ], '回溯保证所有合法路径都被访问'),
    ],
  ),
  '20': visual(
    'stack',
    '有效括号的期望栈',
    '读入左括号时压入它对应的右括号',
    [
      layeredFrame('读入 ( 和 {', [
        { label: '输入', items: [['(', 'muted'], ['{', 'active'], ['[', 'plain'], [']', 'plain'], ['}', 'plain'], [')', 'plain']] },
        { label: '栈', items: [[')', 'plain'], ['}', 'active']] },
      ], '栈顶始终是下一个期望出现的右括号'),
      layeredFrame('读入 [', [
        { label: '输入', items: [['(', 'muted'], ['{', 'muted'], ['[', 'active'], [']', 'plain'], ['}', 'plain'], [')', 'plain']] },
        { label: '栈', items: [[')', 'plain'], ['}', 'plain'], [']', 'active']] },
      ], '压入期望字符 ]'),
      layeredFrame('右括号逐个匹配', [
        { label: '输入', items: [[']', 'result'], ['}', 'result'], [')', 'result']] },
        { label: '栈', items: [['_', 'muted']] },
      ], '每次必须与栈顶相同'),
      frame('遍历结束', [['(', 'result'], ['{', 'result'], ['[', 'result'], [']', 'result'], ['}', 'result'], [')', 'result']], '栈为空，括号序列有效'),
    ],
  ),
  '121': visual(
    'sequence',
    '一次股票交易的历史最低价',
    '当天作为卖出日，只需要知道此前最低价',
    [
      frame('价格 7 是当前最低价', [['7', 'active'], ['1', 'plain'], ['5', 'plain'], ['3', 'plain'], ['6', 'plain'], ['4', 'plain']], 'min = 7 · best = 0'),
      frame('价格 1 刷新最低价', [['7', 'muted'], ['1', 'target'], ['5', 'plain'], ['3', 'plain'], ['6', 'plain'], ['4', 'plain']], 'min = 1 · best = 0'),
      frame('尝试在 5 卖出', [['7', 'muted'], ['1', 'active'], ['5', 'focus'], ['3', 'plain'], ['6', 'plain'], ['4', 'plain']], '收益 4，best = 4'),
      frame('在 6 卖出得到最优收益', [['7', 'muted'], ['1', 'result'], ['5', 'muted'], ['3', 'muted'], ['6', 'result'], ['4', 'muted']], 'best = 6 - 1 = 5'),
    ],
  ),
  '300': visual(
    'sequence',
    '最长递增子序列的 tails 数组',
    'tails[i] 保存长度 i + 1 的递增子序列最小结尾',
    [
      layeredFrame('先处理 10 和 9', [
        { label: '输入', items: [['10', 'muted'], ['9', 'active'], ['2', 'plain'], ['5', 'plain'], ['3', 'plain'], ['7', 'plain']] },
        { label: 'tails', items: [['9', 'result']] },
      ], '9 替换 10，长度不变'),
      layeredFrame('读入 2 后替换第一个位置', [
        { label: '输入', items: [['10', 'muted'], ['9', 'muted'], ['2', 'active'], ['5', 'plain'], ['3', 'plain'], ['7', 'plain']] },
        { label: 'tails', items: [['2', 'result']] },
      ], '二分找到第一个大于等于 2 的位置'),
      layeredFrame('读入 5 和 3', [
        { label: '输入', items: [['5', 'muted'], ['3', 'active'], ['7', 'plain']] },
        { label: 'tails', items: [['2', 'plain'], ['3', 'result']] },
      ], '3 替换 5，为后续留出更多空间'),
      layeredFrame('读入 7', [
        { label: '输入', items: [['7', 'active']] },
        { label: 'tails', items: [['2', 'result'], ['3', 'result'], ['7', 'result']] },
      ], 'tails 长度为 3，就是 LIS 长度'),
    ],
  ),
  '92': visual(
    'linked-list',
    '反转链表的指定区间',
    '固定区间前驱，把后续节点逐个前插',
    [
      frame('找到 left 的前驱', [['D', 'muted'], ['→', 'arrow'], ['1', 'target'], ['→', 'arrow'], ['2', 'active'], ['→', 'arrow'], ['3', 'plain'], ['→', 'arrow'], ['4', 'plain'], ['→', 'arrow'], ['5', 'plain']], 'left = 2 · right = 4 · prev = 1'),
      frame('把 3 移到 prev 之后', [['1', 'target'], ['→', 'arrow'], ['3', 'active'], ['→', 'arrow'], ['2', 'focus'], ['→', 'arrow'], ['4', 'plain'], ['→', 'arrow'], ['5', 'plain']], 'curr 仍指向区间尾节点 2'),
      frame('把 4 移到 prev 之后', [['1', 'target'], ['→', 'arrow'], ['4', 'active'], ['→', 'arrow'], ['3', 'plain'], ['→', 'arrow'], ['2', 'focus'], ['→', 'arrow'], ['5', 'plain']], '区间反转完成'),
      frame('前后链表保持连接', [['1', 'plain'], ['→', 'arrow'], ['4', 'result'], ['→', 'arrow'], ['3', 'result'], ['→', 'arrow'], ['2', 'result'], ['→', 'arrow'], ['5', 'plain']], '返回 dummy.next'),
    ],
  ),
  '103': visual(
    'tree',
    '二叉树的锯齿形层序遍历',
    '队列始终按正常层序扩展，只改变每层的写入位置',
    [
      layeredFrame('第零层从左向右', [
        { label: 'L0', items: [['3', 'active']] },
        { label: 'L1', items: [['9', 'plain'], ['20', 'plain']] },
        { label: 'L2', items: [['15', 'plain'], ['7', 'plain']] },
      ], '输出 [3]'),
      layeredFrame('第一层从右向左写入', [
        { label: '遍历', items: [['9', 'focus'], ['20', 'active']] },
        { label: '输出', items: [['20', 'result'], ['9', 'result']] },
      ], '队列仍然先取 9，但写到右侧'),
      layeredFrame('第二层恢复左到右', [
        { label: '遍历', items: [['15', 'active'], ['7', 'active']] },
        { label: '输出', items: [['15', 'result'], ['7', 'result']] },
      ], '方向每层翻转一次'),
      layeredFrame('结果按层分组', [
        { label: 'L0', items: [['3', 'result']] },
        { label: 'L1', items: [['20', 'result'], ['9', 'result']] },
        { label: 'L2', items: [['15', 'result'], ['7', 'result']] },
      ], '输出顺序与节点扩展顺序分离'),
    ],
  ),
  '236': visual(
    'tree',
    '二叉树最近公共祖先的递归回传',
    '左右子树分别找到目标时，当前节点就是分叉点',
    [
      layeredFrame('从根节点向下查找', [
        { label: 'L0', items: [['3', 'active']] },
        { label: 'L1', items: [['5', 'target'], ['1', 'target']] },
        { label: 'L2', items: [['6', 'plain'], ['2', 'plain'], ['0', 'plain'], ['8', 'plain']] },
      ], 'p = 5 · q = 1'),
      layeredFrame('左右分支分别命中', [
        { label: '左返回', items: [['5', 'result']] },
        { label: '右返回', items: [['1', 'result']] },
      ], '两侧返回值都非 null'),
      layeredFrame('在节点 3 汇合', [
        { label: '左', items: [['5', 'focus'], ['→', 'arrow']] },
        { label: '当前', items: [['3', 'active']] },
        { label: '右', items: [['←', 'arrow'], ['1', 'focus']] },
      ], '当前节点是最低的分叉点'),
      frame('向上返回答案', [['5', 'plain'], ['→', 'arrow'], ['3', 'result'], ['←', 'arrow'], ['1', 'plain']], '最近公共祖先为 3'),
    ],
  ),
  '23': visual(
    'linked-list',
    '小根堆合并 K 个有序链表',
    '堆中只保留每条尚未耗尽链表的当前头节点',
    [
      layeredFrame('把非空头节点入堆', [
        { label: 'A', items: [['1', 'active'], ['4', 'plain'], ['5', 'plain']] },
        { label: 'B', items: [['1', 'active'], ['3', 'plain'], ['4', 'plain']] },
        { label: 'C', items: [['2', 'active'], ['6', 'plain']] },
      ], '堆中当前有 1、1、2'),
      layeredFrame('弹出最小节点 1', [
        { label: '结果', items: [['1', 'result']] },
        { label: '堆', items: [['1', 'active'], ['2', 'focus'], ['4', 'plain']] },
      ], '弹出 A 的 1 后，把 A 的 4 入堆'),
      layeredFrame('继续弹出堆顶', [
        { label: '结果', items: [['1', 'result'], ['1', 'result'], ['2', 'result'], ['3', 'result']] },
        { label: '堆', items: [['4', 'active'], ['4', 'focus'], ['5', 'plain'], ['6', 'plain']] },
      ], '堆顶始终是所有未处理节点的最小值'),
      frame('所有链表耗尽', [['1', 'result'], ['1', 'result'], ['2', 'result'], ['3', 'result'], ['4', 'result'], ['4', 'result'], ['5', 'result'], ['6', 'result']], '获得完整有序链表'),
    ],
  ),
  '54': visual(
    'grid',
    '螺旋矩阵的四条边界',
    '每走完一条边就向内收缩，进入下边和左边前重新检查边界',
    [
      layeredFrame('读取上边', [
        { items: [['1', 'active'], ['2', 'active'], ['3', 'active']] },
        { items: [['4', 'plain'], ['5', 'plain'], ['6', 'plain']] },
        { items: [['7', 'plain'], ['8', 'plain'], ['9', 'plain']] },
      ], 'top 向下移动'),
      layeredFrame('读取右边和下边', [
        { items: [['1', 'muted'], ['2', 'muted'], ['3', 'result']] },
        { items: [['4', 'plain'], ['5', 'plain'], ['6', 'active']] },
        { items: [['7', 'active'], ['8', 'active'], ['9', 'active']] },
      ], 'right 向左、bottom 向上移动'),
      layeredFrame('读取左边', [
        { items: [['1', 'muted'], ['2', 'muted'], ['3', 'muted']] },
        { items: [['4', 'active'], ['5', 'plain'], ['6', 'muted']] },
        { items: [['7', 'muted'], ['8', 'muted'], ['9', 'muted']] },
      ], 'left 向右移动，只剩中心'),
      layeredFrame('读取中心', [
        { items: [['1', 'muted'], ['2', 'muted'], ['3', 'muted']] },
        { items: [['4', 'muted'], ['5', 'result'], ['6', 'muted']] },
        { items: [['7', 'muted'], ['8', 'muted'], ['9', 'muted']] },
      ], '顺序为 1,2,3,6,9,8,7,4,5'),
    ],
  ),
  '143': visual(
    'linked-list',
    '重排链表的拆分、反转和交替合并',
    '先找中点，反转后半段，再从两端交替取节点',
    [
      frame('快慢指针找中点', [['1', 'plain'], ['→', 'arrow'], ['2', 'plain'], ['→', 'arrow'], ['3', 'active'], ['→', 'arrow'], ['4', 'plain'], ['→', 'arrow'], ['5', 'target']], '慢指针停在 3'),
      layeredFrame('拆成两段并反转后半段', [
        { label: '前半', items: [['1', 'plain'], ['→', 'arrow'], ['2', 'plain'], ['→', 'arrow'], ['3', 'plain']] },
        { label: '后半', items: [['5', 'active'], ['→', 'arrow'], ['4', 'active']] },
      ], '后半段从 4→5 变为 5→4'),
      frame('交替合并两段', [['1', 'result'], ['→', 'arrow'], ['5', 'result'], ['→', 'arrow'], ['2', 'result'], ['→', 'arrow'], ['4', 'result'], ['→', 'arrow'], ['3', 'focus']], '每轮各取一个节点'),
      frame('重排完成', [['1', 'result'], ['5', 'result'], ['2', 'result'], ['4', 'result'], ['3', 'result']], '结果为 1→5→2→4→3'),
    ],
  ),
  '141': visual(
    'linked-list',
    '环形链表的快慢指针',
    '若链表有环，快指针终会在环内追上慢指针',
    [
      frame('快慢指针从头节点出发', [['3', 'active'], ['→', 'arrow'], ['2', 'plain'], ['→', 'arrow'], ['0', 'plain'], ['→', 'arrow'], ['-4', 'plain'], ['环', 'target']], 'slow 走一步，fast 走两步'),
      frame('第一轮移动', [['3', 'muted'], ['→', 'arrow'], ['2', 'active'], ['→', 'arrow'], ['0', 'focus'], ['→', 'arrow'], ['-4', 'plain'], ['环', 'target']], 'slow = 2 · fast = 0'),
      frame('两个指针都进入环', [['3', 'muted'], ['→', 'arrow'], ['2', 'focus'], ['→', 'arrow'], ['0', 'active'], ['→', 'arrow'], ['-4', 'plain'], ['环', 'target']], 'slow = 0 · fast = 2'),
      frame('快慢指针相遇', [['3', 'muted'], ['→', 'arrow'], ['2', 'plain'], ['→', 'arrow'], ['0', 'plain'], ['→', 'arrow'], ['-4', 'result'], ['环', 'target']], 'slow = fast = -4，确认存在环'),
    ],
  ),
  '56': visual(
    'sequence',
    '合并区间的排序扫描',
    '按起点排序后，只需要与结果中最后一个区间比较',
    [
      frame('按起点排序', [['[1,3]', 'active'], ['[2,6]', 'focus'], ['[8,10]', 'plain'], ['[15,18]', 'plain']], '结果先放入 [1,3]'),
      frame('发现 [2,6] 与末尾重叠', [['[1,3]', 'active'], ['+', 'arrow'], ['[2,6]', 'focus'], ['→', 'arrow'], ['[1,6]', 'result']], '更新右端点为 6'),
      frame('[8,10] 不重叠', [['[1,6]', 'result'], ['[8,10]', 'active'], ['[15,18]', 'plain']], '把 [8,10] 追加到结果'),
      frame('扫描完成', [['[1,6]', 'result'], ['[8,10]', 'result'], ['[15,18]', 'result']], '结果始终有序且互不重叠'),
    ],
  ),
  '415': visual(
    'table',
    '字符串相加的竖式进位',
    '从最低位开始，每轮写入当前位并保留进位',
    [
      layeredFrame('个位相加', [
        { label: 'A', items: [['4', 'plain'], ['5', 'plain'], ['6', 'active']] },
        { label: 'B', items: [['_', 'muted'], ['7', 'plain'], ['7', 'focus']] },
        { label: '结果', items: [['_', 'muted'], ['_', 'muted'], ['3', 'result']] },
      ], '6 + 7 = 13，写 3，carry = 1'),
      layeredFrame('十位相加', [
        { label: 'A', items: [['4', 'plain'], ['5', 'active'], ['6', 'muted']] },
        { label: 'B', items: [['_', 'muted'], ['7', 'focus'], ['7', 'muted']] },
        { label: '结果', items: [['_', 'muted'], ['3', 'result'], ['3', 'result']] },
      ], '5 + 7 + 1 = 13，写 3，carry = 1'),
      layeredFrame('百位相加', [
        { label: 'A', items: [['4', 'active'], ['5', 'muted'], ['6', 'muted']] },
        { label: 'B', items: [['_', 'muted'], ['7', 'muted'], ['7', 'muted']] },
        { label: '结果', items: [['5', 'result'], ['3', 'result'], ['3', 'result']] },
      ], '4 + 0 + 1 = 5'),
      frame('反转缓冲区', [['4', 'plain'], ['5', 'plain'], ['6', 'plain'], ['+', 'arrow'], ['7', 'plain'], ['7', 'plain'], ['=', 'arrow'], ['5', 'result'], ['3', 'result'], ['3', 'result']], '456 + 77 = 533'),
    ],
  ),
  '72': visual(
    'table',
    '编辑距离的二维状态表',
    'dp[i][j] 表示两个前缀之间的最小编辑次数',
    [
      layeredFrame('初始化空前缀', [
        { label: ' ', items: [['∅', 'muted'], ['r', 'plain'], ['o', 'plain'], ['s', 'plain']] },
        { label: '∅', items: [['0', 'result'], ['1', 'plain'], ['2', 'plain'], ['3', 'plain']] },
        { label: 'h', items: [['1', 'plain'], ['_', 'target'], ['_', 'plain'], ['_', 'plain']] },
      ], '与空串之间只能逐个插入或删除'),
      layeredFrame('比较 h 和 r', [
        { label: '来源', items: [['删', 'plain'], ['插', 'plain'], ['换', 'active']] },
        { label: 'dp', items: [['1', 'result']] },
      ], '字符不同，取三个来源的最小值加一'),
      layeredFrame('字符相同时沿用左上角', [
        { label: '字符', items: [['o', 'active'], ['=', 'arrow'], ['o', 'active']] },
        { label: '状态', items: [['1', 'focus'], ['→', 'arrow'], ['1', 'result']] },
      ], '本次不需要新的编辑操作'),
      layeredFrame('表格填充完成', [
        { label: 'horse', items: [['h', 'plain'], ['o', 'plain'], ['r', 'plain'], ['s', 'plain'], ['e', 'plain']] },
        { label: 'ros', items: [['r', 'plain'], ['o', 'plain'], ['s', 'plain'], ['=', 'arrow'], ['3', 'result']] },
      ], 'horse 到 ros 的最小编辑距离为 3'),
    ],
  ),
  '160': visual(
    'linked-list',
    '相交链表的路径交换',
    '两个指针分别走完 A+B 和 B+A，自然抵消长度差',
    [
      layeredFrame('两个指针各自出发', [
        { label: 'A', items: [['4', 'active'], ['1', 'plain'], ['8', 'target'], ['4', 'plain'], ['5', 'plain']] },
        { label: 'B', items: [['5', 'focus'], ['6', 'plain'], ['1', 'plain'], ['8', 'target'], ['4', 'plain'], ['5', 'plain']] },
      ], '指针步数相同，起点深度不同'),
      layeredFrame('到达末尾后换到另一条链表', [
        { label: 'pA', items: [['B头', 'active'], ['→', 'arrow'], ['6', 'plain'], ['→', 'arrow'], ['1', 'plain']] },
        { label: 'pB', items: [['A头', 'focus'], ['→', 'arrow'], ['1', 'plain']] },
      ], '两条总路径长度都是 lenA + lenB'),
      frame('指针同步进入公共部分', [['pA', 'muted'], ['→', 'arrow'], ['8', 'result'], ['←', 'arrow'], ['pB', 'muted']], '两个指针在节点 8 相遇'),
      frame('返回相交节点', [['8', 'result'], ['→', 'arrow'], ['4', 'plain'], ['→', 'arrow'], ['5', 'plain']], '比较的是节点引用，不是节点值'),
    ],
  ),
  '42': visual(
    'sequence',
    '接雨水的双指针水位',
    '较低一侧的历史最高值能确定当前位置水量',
    [
      frame('从两端开始', [['0', 'active'], ['1', 'plain'], ['0', 'plain'], ['2', 'plain'], ['1', 'plain'], ['0', 'plain'], ['1', 'plain'], ['3', 'target']], 'leftMax = 0 · rightMax = 3'),
      frame('左侧高度 1 刷新上界', [['0', 'muted'], ['1', 'active'], ['0', 'focus'], ['2', 'plain'], ['1', 'plain'], ['0', 'plain'], ['1', 'plain'], ['3', 'target']], '下一个高度 0 可接 1 单位水'),
      frame('左侧遇到更高柱子', [['0', 'muted'], ['1', 'plain'], ['0', 'result'], ['2', 'active'], ['1', 'focus'], ['0', 'plain'], ['1', 'plain'], ['3', 'target']], 'leftMax = 2，继续向内移动'),
      frame('所有低谷结算完成', [['0', 'muted'], ['1', 'plain'], ['+1', 'result'], ['2', 'plain'], ['+1', 'result'], ['+2', 'result'], ['+1', 'result'], ['3', 'plain']], '双指针相遇后得到总水量'),
    ],
  ),
  '704': visual(
    'sequence',
    '二分查找的闭区间收缩',
    '始终把候选答案保留在 [left, right] 中',
    [
      frame('初始候选区间', [['1', 'plain'], ['3', 'plain'], ['5', 'active'], ['7', 'plain'], ['9', 'target']], 'target = 9 · mid = 5'),
      frame('target 大于 mid', [['1', 'muted'], ['3', 'muted'], ['5', 'muted'], ['7', 'active'], ['9', 'target']], 'left = mid + 1，丢弃左半段和 mid'),
      frame('继续二分右半段', [['1', 'muted'], ['3', 'muted'], ['5', 'muted'], ['7', 'muted'], ['9', 'active']], 'left = right = 4'),
      frame('命中目标', [['1', 'muted'], ['3', 'muted'], ['5', 'muted'], ['7', 'muted'], ['9', 'result']], '返回下标 4'),
    ],
  ),
  '239': visual(
    'sequence',
    '滑动窗口最大值的单调队列',
    '队列中保留还在窗口内且可能成为最大值的下标',
    [
      layeredFrame('读入前三个数', [
        { label: '窗口', items: [['1', 'plain'], ['3', 'active'], ['-1', 'plain'], ['-3', 'muted'], ['5', 'muted']] },
        { label: '队列', items: [['3', 'result'], ['-1', 'plain']] },
      ], '3 比 1 大，1 不再可能成为窗口最大值'),
      layeredFrame('窗口右移一格', [
        { label: '窗口', items: [['1', 'muted'], ['3', 'active'], ['-1', 'plain'], ['-3', 'plain'], ['5', 'muted']] },
        { label: '队列', items: [['3', 'result'], ['-1', 'plain'], ['-3', 'plain']] },
      ], '队首 3 就是当前窗口最大值'),
      layeredFrame('读入 5，清除队尾小元素', [
        { label: '窗口', items: [['3', 'muted'], ['-1', 'plain'], ['-3', 'plain'], ['5', 'active']] },
        { label: '队列', items: [['3', 'evicted'], ['-1', 'evicted'], ['-3', 'evicted'], ['5', 'result']] },
      ], '5 入队后成为新队首'),
      frame('持续输出队首', [['3', 'result'], ['3', 'result'], ['5', 'result'], ['5', 'result'], ['6', 'result'], ['7', 'result']], '每个下标最多入队和出队一次'),
    ],
  ),
  '76': visual(
    'sequence',
    '最小覆盖子串的窗口扩张与收缩',
    '先扩张到满足需求，再从左侧移除冗余字符',
    [
      frame('需求字符为 A、B、C', [['A', 'target'], ['D', 'plain'], ['O', 'plain'], ['B', 'target'], ['E', 'plain'], ['C', 'target'], ['O', 'muted'], ['D', 'muted'], ['E', 'muted'], ['B', 'muted'], ['A', 'muted'], ['N', 'muted'], ['C', 'muted']], '窗口 ADOBEC 首次覆盖全部需求'),
      frame('收缩左边界', [['A', 'evicted'], ['D', 'muted'], ['O', 'muted'], ['B', 'active'], ['E', 'plain'], ['C', 'active'], ['O', 'plain'], ['D', 'plain'], ['E', 'plain'], ['B', 'plain'], ['A', 'focus'], ['N', 'plain'], ['C', 'plain']], '移除 A 后窗口不再满足，右边界继续前进'),
      frame('右边界遇到新的 A 和 C', [['A', 'muted'], ['D', 'muted'], ['O', 'muted'], ['B', 'plain'], ['E', 'plain'], ['C', 'plain'], ['O', 'plain'], ['D', 'plain'], ['E', 'plain'], ['B', 'active'], ['A', 'active'], ['N', 'plain'], ['C', 'active']], '窗口再次满足需求'),
      frame('继续收缩得到最小窗口', [['A', 'muted'], ['D', 'muted'], ['O', 'muted'], ['B', 'muted'], ['E', 'muted'], ['C', 'muted'], ['O', 'muted'], ['D', 'muted'], ['E', 'muted'], ['B', 'result'], ['A', 'result'], ['N', 'result'], ['C', 'result']], '最小覆盖子串为 BANC'),
    ],
  ),
  '322': visual(
    'table',
    '零钱兑换的完全背包状态',
    'dp[x] 表示凑出金额 x 需要的最少硬币数',
    [
      layeredFrame('只有金额 0 已知', [
        { label: '金额', items: [['0', 'plain'], ['1', 'plain'], ['2', 'plain'], ['3', 'plain'], ['4', 'plain'], ['5', 'plain']] },
        { label: 'dp', items: [['0', 'result'], ['INF', 'muted'], ['INF', 'muted'], ['INF', 'muted'], ['INF', 'muted'], ['INF', 'muted']] },
      ], 'dp[0] = 0'),
      layeredFrame('使用面额 1', [
        { label: '金额', items: [['0', 'plain'], ['1', 'active'], ['2', 'plain'], ['3', 'plain'], ['4', 'plain'], ['5', 'plain']] },
        { label: 'dp', items: [['0', 'result'], ['1', 'result'], ['2', 'plain'], ['3', 'plain'], ['4', 'plain'], ['5', 'plain']] },
      ], '从小到大遍历，同一枚面额可重复使用'),
      layeredFrame('加入面额 2', [
        { label: '金额', items: [['0', 'plain'], ['1', 'plain'], ['2', 'active'], ['3', 'plain'], ['4', 'plain'], ['5', 'plain']] },
        { label: 'dp', items: [['0', 'result'], ['1', 'plain'], ['1', 'result'], ['2', 'result'], ['2', 'result'], ['3', 'plain']] },
      ], 'dp[4] 由 4 枚 1 更新为 2 枚 2'),
      layeredFrame('加入面额 5', [
        { label: '金额', items: [['0', 'plain'], ['1', 'plain'], ['2', 'plain'], ['3', 'plain'], ['4', 'plain'], ['5', 'active']] },
        { label: 'dp', items: [['0', 'result'], ['1', 'plain'], ['1', 'plain'], ['2', 'plain'], ['2', 'plain'], ['1', 'result']] },
      ], '凑出 5 只需要一枚硬币'),
    ],
  ),
  '105': visual(
    'tree',
    '由前序与中序遍历构造二叉树',
    '前序的第一个值是根，它在中序中把区间切成左右子树',
    [
      layeredFrame('从前序取出根节点 3', [
        { label: '前序', items: [['3', 'active'], ['9', 'plain'], ['20', 'plain'], ['15', 'plain'], ['7', 'plain']] },
        { label: '中序', items: [['9', 'plain'], ['3', 'target'], ['15', 'plain'], ['20', 'plain'], ['7', 'plain']] },
      ], '根 3 左侧有一个节点，右侧有三个节点'),
      layeredFrame('递归构造左子树', [
        { label: '根', items: [['3', 'plain']] },
        { label: '左', items: [['9', 'active']] },
        { label: '右', items: [['20', 'plain'], ['15', 'plain'], ['7', 'plain']] },
      ], '前序中根节点后的一个值属于左子树'),
      layeredFrame('递归构造右子树', [
        { label: '根', items: [['3', 'plain']] },
        { label: '右根', items: [['20', 'active']] },
        { label: '左右', items: [['15', 'focus'], ['7', 'focus']] },
      ], '中序区间确定 20 的左右子树'),
      layeredFrame('整棵树构造完成', [
        { label: 'L0', items: [['3', 'result']] },
        { label: 'L1', items: [['9', 'result'], ['20', 'result']] },
        { label: 'L2', items: [['15', 'result'], ['7', 'result']] },
      ], '每个节点只创建一次'),
    ],
  ),
};

export function getAlgorithmVisual(id: string): AlgorithmVisual {
  const result = algorithmVisuals[id];
  if (!result) throw new Error(`Missing algorithm visual for LeetCode ${id}`);
  return result;
}
