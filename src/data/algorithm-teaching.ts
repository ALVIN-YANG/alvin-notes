export interface AlgorithmRecallPrompt {
  prompt: string;
  answer: string;
}

interface AlgorithmTeachingBase {
  example: string;
  ideaHeading: string;
  recall: AlgorithmRecallPrompt;
  codeFocus: readonly string[];
  mastery: string;
}

export interface AlgorithmWorkedGuide extends AlgorithmTeachingBase {
  mode: 'worked';
}

export interface AlgorithmTransferGuide extends AlgorithmTeachingBase {
  mode: 'transfer';
  from: string;
  reuse: string;
  change: string;
}

export interface AlgorithmChallengeGuide extends AlgorithmTeachingBase {
  mode: 'challenge';
  prerequisites: readonly string[];
  hints: readonly string[];
}

export type AlgorithmTeachingGuide =
  | AlgorithmWorkedGuide
  | AlgorithmTransferGuide
  | AlgorithmChallengeGuide;

const worked = (guide: AlgorithmTeachingBase): AlgorithmWorkedGuide => ({
  mode: 'worked',
  ...guide,
});

const transfer = (
  from: string,
  reuse: string,
  change: string,
  guide: AlgorithmTeachingBase,
): AlgorithmTransferGuide => ({
  mode: 'transfer',
  from,
  reuse,
  change,
  ...guide,
});

const challenge = (
  prerequisites: readonly string[],
  hints: readonly string[],
  guide: AlgorithmTeachingBase,
): AlgorithmChallengeGuide => ({
  mode: 'challenge',
  prerequisites,
  hints,
  ...guide,
});

export const algorithmTeachingById: Record<string, AlgorithmTeachingGuide> = {
  '3': worked({
    example: '拿 abba 手算。right 走到第二个 b 时，旧 b 仍在窗口中，left 应跳到下标 2；最后一个 a 出现时，旧 a 已在窗口外，left 保持 2。',
    ideaHeading: '重复字符出现时，左边界只能前进',
    recall: {
      prompt: '处理 abba 的最后一个 a 时，如果直接执行 left = last.get(a) + 1，会发生什么？',
      answer: 'left 会从 2 退回 1，窗口重新包含两个 b。必须取 Math.max，让 left 保持单调向右。',
    },
    codeFocus: [
      'last 保存字符最近一次出现的位置，不负责判断它是否仍在窗口中。',
      'Math.max(left, last.get(c) + 1) 是这道题最容易漏掉的一行。',
      '窗口采用左右都闭合的定义，长度才是 right - left + 1。',
    ],
    mastery: '合上代码，用一句话说出窗口不变量，再在五分钟内闭卷写出 abba 不会让 left 回退的实现。',
  }),
  '5': worked({
    example: '拿 babad 手算。以第一个 a 为字符中心向外扩展得到 bab；以第二个 b 为字符中心还能得到 aba。等长答案无需覆盖已有结果。',
    ideaHeading: '每个中心只保留能扩出的最长回文',
    recall: {
      prompt: '长度为 n 的字符串一共有多少个字符中心和字符间中心？',
      answer: '字符中心有 n 个，字符间中心有 n - 1 个，总共 2n - 1 个。两类中心分别覆盖奇数和偶数长度回文。',
    },
    codeFocus: [
      '每个下标分别尝试 (i,i) 和 (i,i+1) 两种中心。',
      '退出扩展循环时左右指针已经各多走一步，长度是 right - left - 1。',
      '同一组整数公式同时计算奇数和偶数回文的起止下标。',
    ],
    mastery: '用 babad 手算奇偶中心，闭卷写出 expandLength，并解释退出以后为什么返回 right - left - 1。',
  }),
  '146': worked({
    example: '容量为 2 时依次执行 put(1,1)、put(2,2)、get(1)、put(3,3)。访问 1 后顺序变成 1、2，加入 3 时应淘汰 2。',
    ideaHeading: '一次操作要同时维护定位和顺序',
    recall: {
      prompt: '为什么节点里必须保存 key，只有 value 不够吗？',
      answer: '淘汰发生在链表尾部。拿到尾节点后，还要用它的 key 从哈希表删除同一条记录。',
    },
    codeFocus: [
      '两个哨兵节点消除了头尾节点的空值分支。',
      'get 命中与 put 更新都调用 moveToFront，最近使用顺序只在一个入口修改。',
      '容量溢出时先 unlink 尾节点，再删除相同 key 的映射。',
    ],
    mastery: '闭卷画出 Map、head、tail 和三个真实节点，完整走一遍命中、更新、插入与淘汰。',
  }),
  '206': worked({
    example: '链表 1→2→3 反转时，处理节点 1 前先保存节点 2。随后把 1 指向 null，prev 移到 1，curr 再走到 2。',
    ideaHeading: '改指针以前先保住后半段',
    recall: {
      prompt: '执行 curr.next = prev 以后，为什么不能再从 curr.next 找到原来的下一个节点？',
      answer: 'curr.next 已被改成前驱，原来的后继已经丢失，所以 next 必须在改指针前保存。',
    },
    codeFocus: [
      'next 暂存尚未处理部分的入口。',
      'curr.next = prev 完成当前节点的反转。',
      '循环结束时 curr 已经是 null，新头节点保存在 prev。',
    ],
    mastery: '不用背代码，画出 prev、curr、next 三个指针，闭卷完成空链表、单节点和三节点反转。',
  }),
  '215': worked({
    example: '输入 [3,2,1,5,6,4] 且 k 等于 2。升序目标下标是 n-k，也就是 4；每次分区后只保留下标 4 所在的一侧。',
    ideaHeading: '只找一个位置，不必排完整个数组',
    recall: {
      prompt: '一次分区得到 pivotIndex = 3，而 target = 4，下一轮应该保留哪一段？',
      answer: '目标在 pivot 右边，只保留 [4, right]。pivot 已在最终位置，不能继续包含它。',
    },
    codeFocus: [
      '第 K 大换算为升序下标 nums.length - k。',
      'partition 返回的是 pivot 的最终下标。',
      '目标下标每轮都不变，只收缩搜索区间。',
    ],
    mastery: '闭卷解释 Quickselect 为什么平均 O(n)，并用一个有重复值的数组手算两轮分区。',
  }),
  '补充题 4': worked({
    example: '数组 [6,3,8,2,5,4] 选择末尾 4 为 pivot。扫描结束后，小于等于 4 的数在左边，pivot 放到中间的最终位置。',
    ideaHeading: '一次分区只承诺一件事',
    recall: {
      prompt: '分区完成以后，左右两边各自已经有序了吗？',
      answer: '没有。只能确定 pivot 已在最终位置，左边不大于它，右边大于它，两侧还要继续排序。',
    },
    codeFocus: [
      '[left, write) 始终保存已经发现的小元素。',
      '扫描区间不包含 pivot，最后再把 pivot 与 write 交换。',
      '递归边界必须排除已经就位的 pivot。',
    ],
    mastery: '闭卷写出 partition，并说清扫描区间、已处理区间和 pivot 最终位置三个边界。',
  }),
  '21': worked({
    example: '合并 1→3→5 和 2→4→6。每次只比较两个当前节点，先接 1，再接 2；一条链表耗尽后，另一条可以整段接上。',
    ideaHeading: '已经接入的部分始终有序',
    recall: {
      prompt: '为什么循环结束后可以直接执行 tail.next = a 或 b？',
      answer: '两条输入链表各自有序，剩余链表的所有节点都不小于已经接入的尾节点，无需继续逐个比较。',
    },
    codeFocus: [
      'dummy 让第一个节点和后续节点使用同一套连接逻辑。',
      'tail 每次移动到刚接入的节点。',
      '循环条件使用 &&，任一链表耗尽就进入尾段连接。',
    ],
    mastery: '闭卷写出虚拟头节点版本，并用一条空链表和两条含相等值的链表验收。',
  }),
  '200': worked({
    example: '扫描网格时第一次遇到陆地就把岛屿数加一，并从这里把整块相连陆地标记掉。后面再次扫到这些位置时不会重复计数。',
    ideaHeading: '计数发生在搜索连通块之前',
    recall: {
      prompt: '为什么 DFS 每访问一格就加一会得到错误答案？',
      answer: '一座岛可能包含多格陆地。计数单位是连通块，只有外层扫描发现一块尚未访问的陆地时才能加一。',
    },
    codeFocus: [
      '越界、水域和已访问陆地都立即返回。',
      '把陆地原地改成水可以省去 visited 数组。',
      '外层双循环负责发现新岛，DFS 只负责吃掉当前岛。',
    ],
    mastery: '闭卷说清外层扫描与 DFS 的分工，再画一个包含两座岛的最小网格手算。',
  }),
  '102': worked({
    example: '根节点 3 入队后，本层 size 等于 1。处理 3 时加入 9 和 20，但它们属于下一层，不能在当前层继续取出。',
    ideaHeading: '每轮先冻结当前层的节点数',
    recall: {
      prompt: '为什么内层循环不能直接写成 while (!queue.isEmpty())？',
      answer: '处理当前层时会把下一层加入队列。若一直取到队列为空，所有层会被混在同一轮。',
    },
    codeFocus: [
      '进入一层前保存 queue.size()。',
      '内层只弹出固定数量的节点。',
      '孩子入队以后留给下一轮外层循环。',
    ],
    mastery: '闭卷画出每一层开始时的队列，并写出能返回 List<List<Integer>> 的实现。',
  }),
  '1': worked({
    example: '输入 [2,7,11,15]，target 等于 9。读到 2 时先查补数 7，未命中后记录 2；读到 7 时查到 2，返回两个下标。',
    ideaHeading: '先查补数，再记录当前值',
    recall: {
      prompt: '如果先把当前值放进 Map，再查询补数，target 等于两倍当前值时会出现什么问题？',
      answer: '当前元素可能与自己配对，返回同一个下标两次。先查后存可以保证配对元素来自此前位置。',
    },
    codeFocus: [
      '补数是 target - nums[i]。',
      'Map 保存数值到下标，查找与写入都是期望 O(1)。',
      '题目保证唯一答案时命中即可返回。',
    ],
    mastery: '闭卷解释先查后存的原因，并处理包含重复值的 [3,3]。',
  }),
  '46': worked({
    example: '输入 [1,2,3]。路径先选 1，再选 2 和 3；记录 [1,2,3] 后撤销 3，回到上一层尝试另一条分支。',
    ideaHeading: '一次递归只决定路径的下一个位置',
    recall: {
      prompt: '记录一个完整排列以后，为什么必须把最后选择的数字从路径和 used 中同时撤销？',
      answer: '返回上一层后要尝试其他候选。若状态没有恢复，后续分支会继承上一条路径的选择。',
    },
    codeFocus: [
      'path.size() 等于 nums.length 时复制路径，不能保存同一个可变列表引用。',
      'used 阻止同一条路径重复选择相同位置。',
      '选择、递归、撤销必须成对出现。',
    ],
    mastery: '闭卷画出 [1,2,3] 的前两层决策树，并写出选择与撤销严格对称的代码。',
  }),
  '20': worked({
    example: '读入 ({[]}) 时，每遇到左括号就压入对应的右括号。读到 ] 时，栈顶也必须是 ]，随后弹出。',
    ideaHeading: '栈顶保存下一个期待出现的字符',
    recall: {
      prompt: '遍历结束时栈里还剩一个右括号，输入可以算有效吗？',
      answer: '不可以。剩余元素说明存在没有闭合的左括号，最终必须同时满足输入耗尽和栈为空。',
    },
    codeFocus: [
      '压入期望的右括号，可以省去关闭时的映射判断。',
      '遇到右括号时先检查栈是否为空，再弹出比较。',
      '循环结束后的 stack.isEmpty() 不能省。',
    ],
    mastery: '闭卷写出期望栈版本，并用 ]、([)]、({[]}) 三个输入验收。',
  }),
  '53': worked({
    example: '输入 [-2,1,-3,4,-1,2,1,-5,4]。走到 4 时，前面的连续和已经拖累结果，当前最优应从 4 重新开始。',
    ideaHeading: '负的历史和没有继续携带的价值',
    recall: {
      prompt: 'current 表示到当前位置为止的全局最大值吗？',
      answer: '不是。current 只表示必须以当前位置结尾的最大子数组和；全局答案另由 best 保存。',
    },
    codeFocus: [
      'current = max(value, current + value) 决定重新开始还是继续。',
      'best 在每个位置记录所有结尾方案中的最大值。',
      '初值取第一个元素，才能正确处理全负数组。',
    ],
    mastery: '闭卷说出 dp 状态的完整中文含义，再用全负数组验证初值。',
  }),
  '121': worked({
    example: '价格 [7,1,5,3,6,4] 中，走到价格 6 时，此前最低价是 1，当天卖出的收益为 5。',
    ideaHeading: '把今天固定成卖出日',
    recall: {
      prompt: '为什么更新收益时只能使用今天之前的最低价？',
      answer: '买入必须发生在卖出之前。扫描从左到右，minPrice 只保存此前价格，自然满足时间顺序。',
    },
    codeFocus: [
      '先用当前价格计算收益，再更新最低价，语义最清楚。',
      'minPrice 表示此前见过的最低买入价。',
      'best 从 0 开始，覆盖始终无法盈利的情况。',
    ],
    mastery: '闭卷把每一天解释成候选卖出日，并写出只维护最低价和最佳收益的实现。',
  }),
  '415': worked({
    example: '计算字符串 456 加 77。从个位开始得到 6+7=13，写入 3 并保留进位 1；下一位计算 5+7+1。',
    ideaHeading: '把纸面竖式翻译成三个指针',
    recall: {
      prompt: '两个字符串都处理完以后，循环为什么还要检查 carry？',
      answer: '最高位相加仍可能产生进位，例如 9+1。若不检查 carry，结果会少一个最高位。',
    },
    codeFocus: [
      '两个指针分别从字符串末尾向前移动。',
      'sum % 10 写当前位，sum / 10 保存进位。',
      '结果按低位到高位追加，最后统一 reverse。',
    ],
    mastery: '闭卷用 999+1 手算每轮 sum、digit 和 carry，再写出不转换整数的实现。',
  }),
  '704': worked({
    example: '在 [-1,0,3,5,9,12] 中找 9。采用闭区间 [left,right]，mid 命中后返回；目标更大时令 left = mid + 1。',
    ideaHeading: '先决定区间定义，再写更新语句',
    recall: {
      prompt: '闭区间写法里，循环条件为什么是 left <= right？',
      answer: 'left 等于 right 时区间里仍有一个候选值，必须继续检查；left 大于 right 才表示区间为空。',
    },
    codeFocus: [
      'mid 使用 left + (right - left) / 2 避免加法溢出。',
      '闭区间排除 mid 时必须使用 mid + 1 或 mid - 1。',
      '循环结束仍未命中时返回 -1。',
    ],
    mastery: '闭卷写出闭区间版本，并让单元素数组分别命中与不命中。',
  }),
  '92': transfer(
    '反转链表',
    '区间内部仍使用保存 next、修改 curr.next、推进三个指针的原地反转。',
    '反转前要找到区间前驱，结束后还要把旧区间头尾与外部链表重新接好。',
    {
      example: '链表 1→2→3→4→5 反转位置 2 到 4。节点 1 是区间前驱，2 会变成区间尾，4 会变成区间头。',
      ideaHeading: '先固定区间外的两个连接点',
      recall: {
        prompt: '完成 2→3→4 的反转以后，原来的节点 2 应该指向哪里？',
        answer: '节点 2 已成为区间尾，必须指向原区间后的节点 5，否则尾段会丢失。',
      },
      codeFocus: ['dummy 统一 left 等于 1 的情况。', 'pre 始终指向反转区间前一个节点。', '头插法每轮把 next 移到区间前部。'],
      mastery: '不看答案，画出 pre、curr、next 在第一次头插前后的变化。',
    },
  ),
  '141': transfer(
    '反转链表中的指针基本功',
    '仍要画清每个指针下一步到哪里，并在读取 next 前处理 null。',
    '这里不修改链表，通过快慢指针的速度差判断它们是否会在环内相遇。',
    {
      example: '链表 3→2→0→-4，尾节点重新指向节点 2。slow 每次走一步，fast 每次走两步，最终会在环内相遇。',
      ideaHeading: '有环时速度差会不断缩小距离',
      recall: { prompt: 'fast 的循环条件为什么要同时检查 fast 和 fast.next？', answer: 'fast 每轮要走两步。任一为空都说明链表可以走到末尾，也就是没有环。' },
      codeFocus: ['先移动 slow 和 fast，再判断是否引用同一节点。', '比较节点引用，不能比较节点值。'],
      mastery: '闭卷说出无环时怎样退出、有环时为什么一定相遇。',
    },
  ),
  '160': transfer(
    '链表指针基本功',
    '两个指针都只沿 next 前进，判断相交时比较节点引用。',
    '两个指针走到末尾后切换到另一条链表，用交换路径抵消长度差。',
    {
      example: 'A 的独有部分长 2，B 的独有部分长 1。两个指针分别走完 A+B 与 B+A，相交前经过的总路程相同。',
      ideaHeading: '交换路径以后，长度差自动抵消',
      recall: { prompt: '两条链表不相交时，循环会怎样结束？', answer: '两个指针最终都会走到 null，引用相等，循环结束并返回 null。' },
      codeFocus: ['指针到 null 后切到另一条链表头。', '循环条件直接比较 a != b。'],
      mastery: '闭卷解释 A+B 与 B+A 为什么能让两个指针同步到达交点。',
    },
  ),
  '25': transfer(
    '反转链表',
    '组内仍使用三指针原地反转，旧组头在反转后成为新组尾。',
    '每轮必须先确认剩余节点够 K 个，并把当前组接回上一组和下一段。',
    {
      example: '1→2→3→4 且 k 等于 2。第一组边界是节点 2，groupNext 是节点 3；反转后 2→1 再接回 3。',
      ideaHeading: '探测完整一组以后才能动指针',
      recall: { prompt: '组内反转时 prev 为什么从 groupNext 开始？', answer: '这样原组头反转成组尾时会天然指向下一段，少一次尾部补接。' },
      codeFocus: ['kth 探测失败就原样返回剩余尾段。', 'newTail 必须在修改 groupPrev.next 前保存。', 'curr 走到 groupNext 时结束组内反转。'],
      mastery: '闭卷手算节点数不是 k 倍数的情况，并保证尾段不动。',
    },
  ),
  '143': transfer(
    '反转链表与合并链表',
    '中段仍可用快慢指针定位，后半段沿用原地反转，最后按两个链表交替连接。',
    '必须先切断前半段，避免交替合并时形成环。',
    {
      example: '1→2→3→4→5 先拆成 1→2→3 和 4→5，后半段反转为 5→4，再交替得到 1→5→2→4→3。',
      ideaHeading: '拆分、反转、交替合并分三步做',
      recall: { prompt: '找到中点以后，为什么要执行 slow.next = null？', answer: '这一步切断前半段。若保持旧连接，后续交替重连可能产生重复节点或环。' },
      codeFocus: ['快慢指针让 slow 停在前半段尾部。', '后半段先完整反转，再开始交替连接。', '交替时先保存两边 next。'],
      mastery: '闭卷分别手算奇数和偶数长度，确认中点归属与最终尾节点。',
    },
  ),
  '23': transfer(
    '合并两个有序链表',
    '结果链表仍然每次接入当前最小节点，并在接入后推进该链表。',
    '候选从两个扩展到 K 个，需要小根堆维护所有链表的当前头节点。',
    {
      example: '三条链表头分别是 1、1、2。堆先弹出一个 1，再把它的后继放回，堆中始终只保留每条未耗尽链表的头。',
      ideaHeading: '堆里只放每条链表的当前候选',
      recall: { prompt: '弹出一个节点以后，为什么只把它的 next 放回堆？', answer: '同一条链表有序，next 才是这条链表新的最小候选，后面的节点暂时不可能先被选择。' },
      codeFocus: ['初始化时跳过空链表。', '比较器按 node.val 排序。', '每弹出一个节点就把它的后继入堆。'],
      mastery: '闭卷说出堆大小上界为何是 K，并推导 O(N log K)。',
    },
  ),
  '15': transfer(
    '两数之和',
    '仍然把三元组中的一个数固定，再寻找和为相反数的另外两个数。',
    '为了去重并使用双指针，先排序；固定值、left 和 right 都要跳过重复值。',
    {
      example: '排序后的 [-4,-1,-1,0,1,2] 固定第一个 -1，left 和 right 先找到 [-1,-1,2]，移动后再找到 [-1,0,1]。',
      ideaHeading: '排序同时解决移动方向和结果去重',
      recall: { prompt: '固定值大于 0 时为什么可以直接结束？', answer: '数组已经升序，固定值和它右侧的两个数都大于 0，三数之和不可能再等于 0。' },
      codeFocus: ['外层跳过重复固定值。', '命中后左右指针都要移动并继续去重。', '和小于 0 移 left，和大于 0 移 right。'],
      mastery: '闭卷解释三处去重分别防止什么重复结果。',
    },
  ),
  '88': transfer(
    '合并两个有序链表',
    '仍然比较两个当前候选并写入较合适的那个。',
    '数组 nums1 的有效数据和结果共用空间，必须从尾部写较大值，避免覆盖尚未比较的数据。',
    {
      example: 'nums1 为 [1,2,3,0,0,0]，nums2 为 [2,5,6]。先把 6 写到最后，再写 5，nums1 前部的 1、2、3 不会被覆盖。',
      ideaHeading: '写入方向由共享存储空间决定',
      recall: { prompt: '循环结束后，为什么只需要复制 nums2 的剩余部分？', answer: 'nums1 的剩余元素已经在正确位置；nums2 若还有元素，它们必须补到结果最前面。' },
      codeFocus: ['write 从 m+n-1 开始。', '比较 nums1[i] 与 nums2[j] 后从尾部写较大值。', '最后只处理 j 仍未结束的情况。'],
      mastery: '闭卷解释从头写会覆盖哪个值，再写出三个倒序指针。',
    },
  ),
  '33': transfer(
    '二分查找',
    '仍然维护闭区间，每轮排除 mid 和不可能包含 target 的一半。',
    '整个区间不再完全有序，需要先判断左半段或右半段哪一侧有序。',
    {
      example: '在 [4,5,6,7,0,1,2] 中找 0。mid 是 7，左半段有序，但目标不在 [4,7]，所以进入右半段。',
      ideaHeading: '每轮至少有一半保持有序',
      recall: { prompt: '怎样判断 [left, mid] 是有序的一半？', answer: '当 nums[left] <= nums[mid] 时左半段有序；否则右半段有序。题目无重复值，因此判断明确。' },
      codeFocus: ['先判断有序侧，再判断 target 是否落在它的值域。', '值域边界与搜索区间边界必须使用一致的开闭关系。'],
      mastery: '闭卷手算目标分别位于旋转点两侧的情况。',
    },
  ),
  '56': transfer(
    '有序合并',
    '先排序，让可以合并的候选相邻，再从左到右维护一个已经合并好的尾区间。',
    '比较的是区间端点，重叠时更新右端点，不重叠时才把新区间加入结果。',
    {
      example: '区间 [[1,3],[2,6],[8,10]] 排序后，前两个重叠并成 [1,6]，第三个与 6 不重叠，单独加入。',
      ideaHeading: '排序以后只需要盯住最后一个结果区间',
      recall: { prompt: '当前区间左端点等于结果尾区间右端点时要合并吗？', answer: '要。闭区间端点相接仍有公共点，条件应使用 currentStart <= lastEnd。' },
      codeFocus: ['按左端点排序。', '重叠时右端点取两者最大值。', '不重叠才创建新的结果区间。'],
      mastery: '闭卷写出相接、包含和完全分离三种区间的处理。',
    },
  ),
  '54': transfer(
    '数组边界控制',
    '仍然通过收缩边界保证未处理区域定义稳定。',
    '每轮依次走上、右、下、左四条边，并在走下边和左边前重新检查边界。',
    {
      example: '三行四列矩阵先取整条上边，再取右边；收缩后只有两行时，走下边前必须确认 top <= bottom。',
      ideaHeading: '每走完一条边就立即收缩',
      recall: { prompt: '为什么下边和左边需要额外判断，前两条边通常不需要？', answer: '一轮前已确认区域非空，但走完上边和右边后，窄矩阵可能已经耗尽，后两条边会重复访问。' },
      codeFocus: ['四个变量表示尚未访问矩形的闭边界。', '每条边只负责一段方向固定的循环。', '下边与左边前再次检查剩余区域。'],
      mastery: '闭卷手算单行、单列和两行矩阵，确认每个元素只访问一次。',
    },
  ),
  '103': transfer(
    '二叉树的层序遍历',
    '队列和每层固定 size 完全照搬。',
    '只改变一层结果的写入方向，树的访问顺序无需修改。',
    {
      example: '第二层节点从队列取出顺序仍是 9、20，只在结果中按 20、9 保存。下一层孩子仍按正常顺序入队。',
      ideaHeading: '改变输出方向，不改 BFS 本身',
      recall: { prompt: '能否通过反向入队孩子来实现锯齿顺序？', answer: '容易破坏下一层的自然左右关系。保持标准 BFS，只按层号决定头插或尾插更稳定。' },
      codeFocus: ['层号或布尔值控制当前层写入方向。', '队列中的孩子始终按正常左右顺序加入。'],
      mastery: '闭卷指出与普通层序遍历相比唯一需要变化的数据写入位置。',
    },
  ),
  '236': transfer(
    '二叉树递归的返回值设计',
    '递归仍先向左右子树询问结果，再由当前节点合并两个返回值。',
    '返回值含义要固定为当前子树是否找到 p、q 或它们的最近公共祖先。',
    {
      example: '若左子树返回 p，右子树返回 q，当前节点就是最近公共祖先；若只有一侧非空，把那一侧继续向上传。',
      ideaHeading: '左右两侧同时命中时，当前节点才成为答案',
      recall: { prompt: '当前节点等于 p 时，为什么可以直接返回当前节点？', answer: 'p 自己可能就是 q 的祖先。向上返回 p，若 q 在另一侧，祖先会被识别；若 q 在 p 的子树中，p 本身就是答案。' },
      codeFocus: ['null、p、q 是递归出口。', '左右都非空时返回 root。', '只有一侧非空时原样向上传递。'],
      mastery: '闭卷用 p 是 q 祖先的树手算返回值。',
    },
  ),
  '300': transfer(
    '最大子数组和的一维状态',
    '先写出以当前位置结尾的 O(n²) 动态规划含义，再判断怎样压缩状态。',
    'tails 保存各长度的最小结尾值，它的内容不一定是一条真实子序列，并用二分将复杂度降到 O(n log n)。',
    {
      example: '处理 10、9、2、5、3、7 时，tails 先被 9 和 2 反复替换，随后得到 [2,3,7]，长度为 3。',
      ideaHeading: '更小的结尾给后续元素留下更多空间',
      recall: { prompt: '为什么严格递增要替换第一个大于等于 value 的位置？', answer: '相等值不能延长长度。找到第一个不小于 value 的位置并替换，才能保持 tails 严格递增。' },
      codeFocus: ['二分区间使用 [0,size)。', 'left 最终是第一个大于等于 value 的位置。', '只有 left 等于 size 时长度才增加。'],
      mastery: '先闭卷写出 O(n²) 状态，再解释 tails 为什么只能返回长度。',
    },
  ),
  '72': transfer(
    '一维动态规划的状态定义',
    '仍然先用一句完整中文限定每个状态描述的对象。',
    '状态扩展成两个字符串前缀，左、上、左上分别对应插入、删除和替换。',
    {
      example: '把 horse 变成 ros。dp[i][j] 只讨论 horse 的前 i 个字符与 ros 的前 j 个字符，不把后面的字符带进当前决策。',
      ideaHeading: '三种操作都落到已经算好的前缀',
      recall: { prompt: 'dp[i-1][j] 加一对应哪种操作？', answer: '删除 word1 的第 i 个字符。删除后，word1 前 i-1 个字符仍需变成 word2 前 j 个字符。' },
      codeFocus: ['第一行和第一列表示空前缀转换。', '字符相等时直接继承左上状态。', '字符不等时取左、上、左上最小值再加一。'],
      mastery: '闭卷说清三个前驱各自对应的操作，再画出空串边界。',
    },
  ),
  '42': challenge(
    ['理解左右双指针', '能说明一侧最大高度决定什么', '能处理不足三根柱子的输入'],
    ['先别计算每格左右两边的完整最大值，只维护扫描途中已经见过的 leftMax 和 rightMax。', '当 leftMax <= rightMax 时，左侧当前位置的水量已经由 leftMax 确定，可以安全移动 left。'],
    {
      example: '高度 [4,2,0,3,2,5] 中，左侧见过最高 4，右侧见过最高 5。左指针所在位置能接多少水，此时已经不依赖中间尚未扫描的柱子。',
      ideaHeading: '较低一侧的上界已经确定',
      recall: { prompt: '为什么 leftMax <= rightMax 时可以结算 left，而不用知道右侧更精确的最高值？', answer: '水位由较低边界决定。右侧至少已有 rightMax，不低于 leftMax，所以左侧当前位置只能由 leftMax 限制。' },
      codeFocus: ['先更新两侧最大值，再结算当前位置。', '每轮只移动已经可以确定水量的一侧。'],
      mastery: '闭卷证明每个位置只结算一次，并手算一个单调数组得到 0。',
    },
  ),
  '239': challenge(
    ['掌握固定长度滑动窗口', '理解双端队列两端操作', '能区分下标过期与数值失去价值'],
    ['队列里保存下标，队首必须仍在当前窗口内。', '新元素进入时，从队尾删除所有不大于它的元素，因为这些元素更早过期且不可能再成为最大值。'],
    {
      example: '输入 [1,3,-1,-3,5,3,6,7] 且 k 等于 3。读到 3 时，队尾的 1 失去成为最大值的机会，可以直接删除。',
      ideaHeading: '队列只保留仍可能成为窗口最大值的候选',
      recall: { prompt: '为什么队列必须保存下标，不能只保存数值？', answer: '窗口移动时需要判断队首是否已经离开窗口。只有下标能同时表达数值和有效期。' },
      codeFocus: ['入队前先移除过期队首。', '队尾保持对应值严格递减。', '形成第一个完整窗口后才记录队首。'],
      mastery: '闭卷说清队首和队尾各自删除什么，再推导每个下标最多进出队一次。',
    },
  ),
  '76': challenge(
    ['能写无重复字符的滑动窗口', '理解字符频次而非字符种类', '能维护窗口从不可行到可行的转换'],
    ['need 表示当前窗口还欠每个字符多少个，允许某些值变成负数。', 'missing 等于 0 后持续移动 left，直到移走一个必需字符让窗口再次不可行。'],
    {
      example: 's 为 ADOBECODEBANC，t 为 ABC。第一次覆盖得到 ADOBEC，后面右端继续前进，最终收缩出 BANC。',
      ideaHeading: '右端负责达到可行，左端负责压到最短',
      recall: { prompt: '加入字符时 need[added] 已经小于等于 0，为什么不能减少 missing？', answer: '这说明窗口里的该字符已经够用，新加入的是多余字符，没有填补任何欠缺。' },
      codeFocus: ['missing 按总字符数计算，能正确处理 t 中的重复字符。', '更新答案发生在窗口可行的 while 内。', '移出后 need 变为正数时，窗口重新欠缺一个字符。'],
      mastery: '闭卷解释 need 的正数、零和负数分别表示什么。',
    },
  ),
  '105': challenge(
    ['知道前序遍历第一个元素是根', '知道中序遍历按根分开左右子树', '能写清递归区间的开闭定义'],
    ['先用 Map 记录每个值在中序数组中的位置。', '前序区间中根节点后面的 leftSize 个元素属于左子树，其余属于右子树。'],
    {
      example: '前序 [3,9,20,15,7] 与中序 [9,3,15,20,7] 中，根是 3，中序下标把左子树大小确定为 1。',
      ideaHeading: '中序位置决定左右子树大小',
      recall: { prompt: '为什么只靠前序遍历无法唯一构造普通二叉树？', answer: '前序只能确定根先出现，无法知道后续节点怎样分到左右子树。中序中的根位置提供了分界。' },
      codeFocus: ['所有递归区间保持同一种开闭定义。', 'leftSize 来自根在中序区间中的相对位置。', '前序左右区间按 leftSize 切分。'],
      mastery: '闭卷写出四个区间边界，并用只有右子树的输入验收。',
    },
  ),
  '322': challenge(
    ['能定义最少次数的动态规划状态', '理解完全背包中硬币可重复使用', '能安全表示不可达状态'],
    ['令 dp[x] 表示凑出金额 x 的最少硬币数，dp[0] 等于 0。', '遍历每个金额时尝试所有不超过它的硬币，从 dp[x-coin] 转移；不可达状态不能参与加一。'],
    {
      example: '硬币 [1,2,5]，金额 11。dp[5] 可以由 dp[0]+1 得到，dp[11] 最终由 dp[6]+1 得到 3，对应 5+5+1。',
      ideaHeading: '当前金额从一个更小的可达金额走一步过来',
      recall: { prompt: '为什么初始值可以设为 amount + 1？', answer: '任何可达金额最多使用 amount 枚面值 1 的硬币，amount + 1 一定大于合法答案，可作为不会溢出的不可达哨兵。' },
      codeFocus: ['dp[0] 是所有可达状态的起点。', '只有 coin <= current 时才能读取前驱。', '最终值仍大于 amount 时返回 -1。'],
      mastery: '闭卷用没有面值 1 的硬币说明不可达状态怎样保留下来。',
    },
  ),
};

export function getAlgorithmTeaching(id: string): AlgorithmTeachingGuide {
  const guide = algorithmTeachingById[id];
  if (!guide) throw new Error(`Missing algorithm teaching guide for ${id}`);
  return guide;
}
