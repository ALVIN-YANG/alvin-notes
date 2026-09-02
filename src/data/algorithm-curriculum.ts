import type { KnowledgeContentBlock, KnowledgePointSeed } from './create-knowledge-map';
import { getAlgorithmVisual } from './algorithm-visuals';

export interface AlgorithmTemplateDefinition {
  id: string;
  title: string;
  signal: string;
  invariant: string;
  skeleton: string;
  workedExample: string;
  completionPrompt: string;
  completionAnswer: string;
  mastery: string;
  visualId: string;
  problemRanks: readonly number[];
}

export interface AlgorithmTop30Problem {
  rank: number;
  id: string;
  title: string;
  templateId: string;
  why: string;
  change: string;
}

export const algorithmTop30Problems: readonly AlgorithmTop30Problem[] = [
  { rank: 1, id: '3', title: '无重复字符的最长子串', templateId: 'sliding-window', why: '题目要求连续区间，右端加入字符以后，左端可以通过删除字符恢复合法状态。', change: '窗口遇到重复字符时，左边界直接跳到旧位置之后，而且不能后退。' },
  { rank: 2, id: '146', title: 'LRU 缓存', templateId: 'hash-index', why: '每次操作都要求常数时间定位 key，哈希表必须承担随机访问。', change: '除了定位，还要用双向链表维护最近使用顺序，并让两套结构同步更新。' },
  { rank: 3, id: '206', title: '反转链表', templateId: 'linked-relink', why: '题目只改变节点连接关系，不需要创建新的数据结构。', change: '改写 curr.next 前必须保存原后继，并让 prev、curr、next 同步前进。' },
  { rank: 4, id: '215', title: '数组中的第 K 个最大元素', templateId: 'ordered-boundary', why: '只需要找到一个最终位置，不需要把整个数组排好。', change: '把第 K 大换算成升序下标，每次分区后只保留目标所在的一侧。' },
  { rank: 5, id: '25', title: 'K 个一组翻转链表', templateId: 'linked-relink', why: '核心动作仍然是局部反转和链表重连。', change: '每组反转前先确认节点数量足够，并保存下一组入口与前一组尾部。' },
  { rank: 6, id: '15', title: '三数之和', templateId: 'ordered-scan', why: '排序后，左右指针的移动方向能由当前和与目标的大小关系决定。', change: '固定一个数后转成两数之和，同时处理固定值和左右指针的重复值。' },
  { rank: 7, id: '53', title: '最大子数组和', templateId: 'dp-state', why: '当前位置的答案只依赖前一个位置的最优状态。', change: '状态必须限定为以当前位置结尾，才能决定继续前段还是从当前值重启。' },
  { rank: 8, id: '补充题 4', title: '手写快速排序', templateId: 'ordered-boundary', why: '排序过程可以用一个基准值把问题递归地缩小。', change: '一次分区只保证基准值就位，左右区间仍需继续处理。' },
  { rank: 9, id: '5', title: '最长回文子串', templateId: 'boundary-simulation', why: '回文由中心和左右边界共同定义，边界可以同步向外扩张。', change: '奇数中心和字符间的偶数中心都要枚举，退出时指针已经多走一步。' },
  { rank: 10, id: '21', title: '合并两个有序链表', templateId: 'linked-relink', why: '每次只需比较两个链表当前节点，再把较小节点接到结果尾部。', change: '使用虚拟头节点统一第一次连接与后续连接，一条链表耗尽后整段接上另一条。' },
  { rank: 11, id: '200', title: '岛屿数量', templateId: 'graph-traversal', why: '网格可以看成图，问题要求统计互相连通的陆地块。', change: '外层扫描负责发现新连通块，DFS 或 BFS 只负责标记当前整座岛。' },
  { rank: 12, id: '102', title: '二叉树的层序遍历', templateId: 'graph-traversal', why: '输出按距离根节点的层次分组，适合使用队列逐层扩展。', change: '每层开始时冻结队列长度，避免把新加入的下一层混入当前层。' },
  { rank: 13, id: '33', title: '搜索旋转排序数组', templateId: 'ordered-boundary', why: '数组虽然被旋转，但每次二分仍至少有一侧保持有序。', change: '先判断哪一侧有序，再判断目标是否落在该侧的闭区间内。' },
  { rank: 14, id: '1', title: '两数之和', templateId: 'hash-index', why: '处理当前数字时，只需要知道它的补数此前是否出现。', change: '先查询补数再记录当前值，避免同一个元素与自己配对。' },
  { rank: 15, id: '88', title: '合并两个有序数组', templateId: 'ordered-scan', why: '两个输入都已经有序，只需维护各自尚未处理的边界。', change: '从尾部写入较大值，避免覆盖 nums1 前部尚未比较的元素。' },
  { rank: 16, id: '46', title: '全排列', templateId: 'backtracking', why: '每个位置都有多个候选，需要枚举一棵选择树并恢复现场。', change: '用 used 标记当前路径已经选择的位置，记录答案时复制路径。' },
  { rank: 17, id: '20', title: '有效的括号', templateId: 'stack', why: '后出现的左括号必须最先闭合，顺序满足后进先出。', change: '压入期待出现的右括号，关闭时只需与栈顶比较。' },
  { rank: 18, id: '121', title: '买卖股票的最佳时机', templateId: 'dp-state', why: '把今天固定成卖出日，答案只依赖此前最低买入价。', change: '扫描时只维护最低价格和最大收益，不需要保存完整状态数组。' },
  { rank: 19, id: '300', title: '最长递增子序列', templateId: 'dp-state', why: '新元素要接在一个更短序列之后，状态描述序列长度或结尾值。', change: '用 tails 保存每种长度的最小结尾，再二分替换第一个不小于当前值的位置。' },
  { rank: 20, id: '92', title: '反转链表 II', templateId: 'linked-relink', why: '问题仍然只改变一段链表内部的 next 指向。', change: '先走到区间前驱，再用头插法把区间节点逐个移到前面。' },
  { rank: 21, id: '103', title: '二叉树的锯齿形层序遍历', templateId: 'graph-traversal', why: '遍历骨架与普通层序相同，仍按队列中的固定层大小处理。', change: '只改变每层结果的写入方向，不要改变孩子节点的入队顺序。' },
  { rank: 22, id: '236', title: '二叉树的最近公共祖先', templateId: 'graph-traversal', why: '答案取决于目标节点分别出现在左右子树还是同一侧，适合用递归返回搜索结果。', change: '递归返回值表示当前子树找到的目标或公共祖先，左右都非空时当前节点就是答案。' },
  { rank: 23, id: '23', title: '合并 K 个有序链表', templateId: 'heap', why: '每一步只需要从 K 个当前头节点中取最小值。', change: '最小堆只保存每条链表当前可选的头节点，弹出后再加入它的后继。' },
  { rank: 24, id: '54', title: '螺旋矩阵', templateId: 'boundary-simulation', why: '过程由上、下、左、右四条边界控制，适合直接模拟。', change: '每走完一条边立即收缩对应边界，走下边和左边前重新检查边界是否交错。' },
  { rank: 25, id: '143', title: '重排链表', templateId: 'linked-relink', why: '最终顺序可以拆成找中点、反转后半段和交替连接三个链表动作。', change: '合并前必须断开前半段，交替连接时先保存两边后继。' },
  { rank: 26, id: '141', title: '环形链表', templateId: 'pointer-alignment', why: '两个指针以不同速度移动时，环会让它们再次相遇。', change: '快指针每次走两步，循环条件必须先保证 fast 和 fast.next 都非空。' },
  { rank: 27, id: '56', title: '合并区间', templateId: 'ordered-scan', why: '按起点排序后，只需把当前区间与结果中的最后一个区间比较。', change: '重叠时更新右端点，不重叠时才开启新的结果区间。' },
  { rank: 28, id: '415', title: '字符串相加', templateId: 'boundary-simulation', why: '题目要求把纸面竖式逐位翻译成索引和进位变化。', change: '两个指针独立向前移动，数字处理完后仍要检查最高位进位。' },
  { rank: 29, id: '72', title: '编辑距离', templateId: 'dp-state', why: '两个字符串前缀之间的答案可以由更短前缀转移得到。', change: '左、上、左上分别对应插入、删除和替换，空前缀构成第一行和第一列。' },
  { rank: 30, id: '160', title: '相交链表', templateId: 'pointer-alignment', why: '两条链表尾段相同，难点只是两个指针到交点前的路程不同。', change: '两个指针走到链尾后切换到另一条链表，第二轮自然抵消长度差。' },
];

export const algorithmTemplates: readonly AlgorithmTemplateDefinition[] = [
  {
    id: 'hash-index',
    title: '哈希定位',
    signal: '题目反复询问某个值、补数或 key 是否已经出现，并且希望把查找从线性扫描降到常数时间。',
    invariant: '哈希表只保存已经处理过、并且后续查询真正需要的信息。读取与写入的先后顺序必须对应题意。',
    skeleton: `Map<Integer, Integer> indexByValue = new HashMap<>();
for (int i = 0; i < nums.length; i++) {
    int need = target - nums[i];
    if (indexByValue.containsKey(need)) return new int[]{indexByValue.get(need), i};
    indexByValue.put(nums[i], i);
}`,
    workedExample: '用两数之和观察最小骨架。读到当前值时先查询补数，再记录当前值。LRU 仍沿用哈希定位，但额外增加一条链表顺序。',
    completionPrompt: '如果 target 等于两倍当前值，为什么不能先 put 再查询补数？',
    completionAnswer: '先写入会让当前元素与自己配对。先查询再写入，才能保证命中的下标来自此前位置。',
    mastery: '看到补数、重复值或 key 定位时，能在一分钟内说清 Map 的 key、value 和写入时机。',
    visualId: '1',
    problemRanks: [14, 2],
  },
  {
    id: 'sliding-window',
    title: '滑动窗口',
    signal: '目标是连续子数组或子串，右端加入元素后，左端可以通过移除元素让区间重新满足条件。',
    invariant: '窗口始终表示当前被讨论的连续区间。右端负责扩张，左端只向右移动并负责恢复合法状态。',
    skeleton: `int left = 0;
for (int right = 0; right < values.length; right++) {
    add(values[right]);
    while (!valid()) remove(values[left++]);
    updateAnswer(left, right);
}`,
    workedExample: '用 abba 手算无重复字符窗口。第二个 b 进入后，left 跳到旧 b 后面；最后一个 a 的旧位置已经在窗口外，left 不能回退。',
    completionPrompt: '什么时候使用 while 收缩，什么时候只需要把 left 一次跳到新位置？',
    completionAnswer: '频次或总量需要逐步恢复合法时使用 while。若哈希表已经给出冲突元素的精确位置，可以直接跳到该位置之后。',
    mastery: '能先说出窗口合法条件，再闭卷写出 add、shrink、update 三段，并用反例检查 left 不回退。',
    visualId: '3',
    problemRanks: [1],
  },
  {
    id: 'linked-relink',
    title: '链表重连',
    signal: '题目要求反转、合并或重排链表，核心变化发生在 next 指针而非节点值。',
    invariant: '每次改写 next 前先保存仍未处理部分的入口。已经处理、正在处理和尚未处理三段必须始终可达。',
    skeleton: `ListNode prev = null, curr = head;
while (curr != null) {
    ListNode next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
}`,
    workedExample: '反转 1→2→3 时，先保存 2，再让 1 指向 prev。后续区间反转、K 组反转和重排链表都在这个动作外增加边界管理。',
    completionPrompt: '区间反转比整链表反转多保存哪两个连接点？',
    completionAnswer: '需要保存区间前驱和区间之后的节点。反转完成后，用这两个位置把局部结果接回原链表。',
    mastery: '不用背完整题解，也能画出指针变化，并在修改 next 前指出哪条链可能丢失。',
    visualId: '206',
    problemRanks: [3, 10, 20, 5, 25],
  },
  {
    id: 'pointer-alignment',
    title: '快慢指针与路程对齐',
    signal: '问题与环、链表长度差或两个移动对象的相遇有关，而且不允许额外记录所有节点。',
    invariant: '指针每走一步，都在有意消除速度差或路程差。循环结束条件必须覆盖无环、无交点和空链表。',
    skeleton: `ListNode a = headA, b = headB;
while (a != b) {
    a = a == null ? headB : a.next;
    b = b == null ? headA : b.next;
}
return a;`,
    workedExample: '相交链表让两个指针各走 A+B，总路程相同。环形链表则让快指针持续追赶慢指针，两者都把结构差异转成路程关系。',
    completionPrompt: '相交链表不存在交点时，两个指针为什么仍能退出？',
    completionAnswer: '两者各走完 A+B 后会同时到达 null，此时 a 等于 b，循环正常结束。',
    mastery: '能画出两个指针各自走过的路程，并解释相遇或同时为 null 为什么必然发生。',
    visualId: '141',
    problemRanks: [26, 30],
  },
  {
    id: 'ordered-boundary',
    title: '分区与二分边界',
    signal: '问题包含有序性、目标位置或可以排除一半搜索空间的单调条件。',
    invariant: '每轮结束后，被排除的区间都不可能包含答案。区间采用何种开闭定义必须从循环条件一直保持到更新语句。',
    skeleton: `int left = 0, right = nums.length - 1;
while (left <= right) {
    int mid = left + (right - left) / 2;
    if (isAnswer(mid)) return mid;
    if (goRight(mid)) left = mid + 1;
    else right = mid - 1;
}`,
    workedExample: '普通二分根据目标大小排除一半。旋转数组先判断哪一半有序，Quickselect 则根据 pivot 最终位置排除一侧。',
    completionPrompt: '使用闭区间 [left, right] 时，为什么更新必须写成 mid + 1 或 mid - 1？',
    completionAnswer: 'mid 已经验证不是答案，下一轮必须把它排除。继续保留 mid 可能让区间不再缩小并形成死循环。',
    mastery: '先写区间定义，再写循环条件和更新；能用单元素输入证明循环会结束。',
    visualId: '补充题 4',
    problemRanks: [8, 4, 13],
  },
  {
    id: 'ordered-scan',
    title: '排序后的双指针与区间扫描',
    signal: '输入已经有序，或排序后能够让移动方向、去重和区间合并变得确定。',
    invariant: '指针之外的区域已经完成处理。每次移动都基于有序性排除一批不可能答案，而非只试探一个组合。',
    skeleton: `Arrays.sort(nums);
int left = 0, right = nums.length - 1;
while (left < right) {
    long value = evaluate(nums[left], nums[right]);
    if (value < target) left++;
    else if (value > target) right--;
    else recordAndSkipDuplicates();
}`,
    workedExample: '三数之和固定一个数后，用左右指针逼近目标。合并数组从尾部写入，合并区间则只比较最后一个结果区间。',
    completionPrompt: '为什么三数之和命中答案后，左右指针都要移动并跳过重复值？',
    completionAnswer: '当前组合已经记录。任一侧停留在相同值都会生成同一组答案，左右同时越过重复值才能进入新组合。',
    mastery: '能说明排序付出的代价换来了什么，并证明每次移动排除了哪些组合。',
    visualId: '15',
    problemRanks: [15, 6, 27],
  },
  {
    id: 'stack',
    title: '栈与最近未完成状态',
    signal: '后出现的任务要先完成，或当前元素需要与最近一个尚未匹配的元素配对。',
    invariant: '栈中只保存仍未完成、并且必须按逆序处理的状态。栈顶永远是下一个需要核对的对象。',
    skeleton: `Deque<Character> stack = new ArrayDeque<>();
for (char c : input.toCharArray()) {
    if (isOpening(c)) stack.push(expectedClosing(c));
    else if (stack.isEmpty() || stack.pop() != c) return false;
}
return stack.isEmpty();`,
    workedExample: '处理括号时直接压入期待的右括号。遇到关闭字符，只比较栈顶，输入结束后还要确认没有未闭合状态。',
    completionPrompt: '为什么遍历成功结束仍不能直接返回 true？',
    completionAnswer: '栈中可能还留有未闭合的左括号。输入耗尽与栈为空必须同时满足。',
    mastery: '看到嵌套、撤销或最近匹配时，能先说清栈里保存什么以及何时弹出。',
    visualId: '20',
    problemRanks: [17],
  },
  {
    id: 'heap',
    title: '堆与动态候选集',
    signal: '每一步只关心当前最小或最大的候选，但候选会随着处理过程不断加入和淘汰。',
    invariant: '堆中只保存下一步仍可能被选择的候选，堆顶始终是当前全局最优项。',
    skeleton: `PriorityQueue<Node> heap = new PriorityQueue<>(Comparator.comparingInt(node -> node.value));
for (Node head : heads) if (head != null) heap.offer(head);
while (!heap.isEmpty()) {
    Node node = heap.poll();
    append(node);
    if (node.next != null) heap.offer(node.next);
}`,
    workedExample: '合并 K 个有序链表时，堆里无需放入所有节点，只保存每条链表当前暴露的头节点。',
    completionPrompt: '弹出一个节点以后，为什么只加入它的 next？',
    completionAnswer: '同一条链表后面的节点不可能越过当前节点成为候选。当前节点弹出后，它的 next 才首次具备竞争资格。',
    mastery: '能区分候选全集和当前边界，并推导每个元素只进出堆一次。',
    visualId: '23',
    problemRanks: [23],
  },
  {
    id: 'graph-traversal',
    title: 'BFS 与 DFS 遍历',
    signal: '问题需要访问树、图或网格中的相邻节点，并按层次、连通块或子树结果组织答案。',
    invariant: '每个待访问对象都有明确含义，并且不会被无意重复处理。BFS 的队列表示下一批边界，DFS 的返回值表示当前子问题答案。',
    skeleton: `void dfs(Node node) {
    if (node == null || visited(node)) return;
    markVisited(node);
    for (Node next : neighbors(node)) dfs(next);
}

Queue<Node> queue = new ArrayDeque<>();
queue.offer(start);
while (!queue.isEmpty()) visitOneLayer(queue);`,
    workedExample: '岛屿数量在发现新陆地时计数，再用 DFS 吃掉整块陆地。层序遍历则在每轮开始前冻结队列长度。',
    completionPrompt: '统计连通块时，计数应该发生在外层扫描还是 DFS 的每个节点里？',
    completionAnswer: '计数发生在外层首次发现未访问节点时。DFS 只负责标记这一整个连通块。',
    mastery: '编码前先说清 visited、队列元素或递归返回值分别代表什么，再选择 BFS 或 DFS。',
    visualId: '200',
    problemRanks: [12, 11, 21, 22],
  },
  {
    id: 'backtracking',
    title: '回溯与恢复现场',
    signal: '答案是所有组合、排列或路径，每个位置都有多个候选，选择会影响后续可选集合。',
    invariant: '递归入口处的路径状态属于当前层。每次选择、递归和撤销必须成对出现，返回后恢复到进入分支前。',
    skeleton: `void search(List<Integer> path) {
    if (complete(path)) {
        answer.add(new ArrayList<>(path));
        return;
    }
    for (int choice : choices()) {
        choose(choice);
        search(path);
        undo(choice);
    }
}`,
    workedExample: '全排列每层决定下一个位置。记录完整路径时复制列表，返回上一层前同时撤销 path 和 used。',
    completionPrompt: '为什么答案里必须加入 path 的副本？',
    completionAnswer: 'path 会在后续撤销和选择中持续变化。若保存同一个引用，最终所有答案都会变成同一份状态。',
    mastery: '能画出前两层决策树，并检查每个可变状态都存在对称的撤销动作。',
    visualId: '46',
    problemRanks: [16],
  },
  {
    id: 'dp-state',
    title: '动态规划状态',
    signal: '大问题可以由更小输入的答案组成，并且相同子问题会被反复计算。',
    invariant: '每个 dp 状态必须能用一句完整中文说明对象和限制。转移只能读取已经计算且语义匹配的状态。',
    skeleton: `int[] dp = new int[n];
dp[0] = baseCase;
for (int i = 1; i < n; i++) {
    dp[i] = transition(dp, i);
}
return collectAnswer(dp);`,
    workedExample: '最大子数组把 dp[i] 定义为必须以 i 结尾的最大和。编辑距离把状态扩展成两个字符串前缀，但定义状态再写转移的顺序不变。',
    completionPrompt: '为什么“dp[i] 是最大值”还不算一个合格的状态定义？',
    completionAnswer: '它没有说明在哪个范围、是否必须选择当前位置以及受什么条件限制，无法据此判断前驱和转移。',
    mastery: '不看代码先写出状态中文定义、初值、转移顺序和最终答案位置，再用最小输入验证。',
    visualId: '53',
    problemRanks: [18, 7, 19, 29],
  },
  {
    id: 'boundary-simulation',
    title: '边界与字符串模拟',
    signal: '题目已经给出明确的纸面过程、方向或边界变化，难点集中在把规则准确翻译成索引。',
    invariant: '每个指针和边界都只表示一件事。访问数据前先检查范围，完成一步后立刻更新对应状态。',
    skeleton: `while (hasWork(left, right, carry)) {
    int a = readOrZero(left--);
    int b = readOrZero(right--);
    int sum = a + b + carry;
    append(sum % 10);
    carry = sum / 10;
}`,
    workedExample: '字符串相加把竖式拆成两个索引和一个进位。螺旋矩阵维护四条边界，中心扩展维护左右两个回文边界。',
    completionPrompt: '模拟题最有效的验收方式是什么？',
    completionAnswer: '选择会同时触发边界相遇、空输入或最高位进位的最小用例，逐步记录每个索引和状态变化。',
    mastery: '能给每个边界写出准确含义，并用单元素、空区间和刚好相遇的输入手算。',
    visualId: '415',
    problemRanks: [28, 24, 9],
  },
];

const problemById = new Map(algorithmTop30Problems.map((problem) => [problem.id, problem]));
const problemByRank = new Map(algorithmTop30Problems.map((problem) => [problem.rank, problem]));
const templateById = new Map(algorithmTemplates.map((template) => [template.id, template]));

export function getTop30ProblemById(id: string) {
  return problemById.get(id);
}

export function getTop30ProblemByRank(rank: number) {
  const problem = problemByRank.get(rank);
  if (!problem) throw new Error(`Missing CodeTop Top 30 problem at rank ${rank}`);
  return problem;
}

export function getAlgorithmTemplate(id: string) {
  const template = templateById.get(id);
  if (!template) throw new Error(`Missing algorithm template ${id}`);
  return template;
}

export function createAlgorithmTemplatePoint(template: AlgorithmTemplateDefinition): KnowledgePointSeed {
  const relatedProblems = template.problemRanks.map((rank) => getTop30ProblemByRank(rank));
  const content: readonly KnowledgeContentBlock[] = [
    { type: 'heading', text: '看到这些信号就想到它' },
    { type: 'paragraph', text: template.signal },
    { type: 'heading', text: '先守住这一条不变量' },
    { type: 'paragraph', text: template.invariant },
    { type: 'heading', text: '从完整示例观察骨架' },
    { type: 'paragraph', text: template.workedExample },
    getAlgorithmVisual(template.visualId),
    { type: 'heading', text: '最小 Java 骨架' },
    { type: 'code', language: 'java', text: template.skeleton },
    {
      type: 'checkpoint',
      label: '补全练习',
      prompt: template.completionPrompt,
      answer: template.completionAnswer,
    },
    {
      type: 'checkpoint',
      label: '闭卷验收',
      prompt: '怎样才算这个模板已经掌握？',
      answer: template.mastery,
    },
    {
      type: 'related',
      label: '马上用这个模板解题',
      items: relatedProblems.map((problem) => ({
        label: `#${problem.rank} ${problem.title}`,
        target: `codetop-${problem.rank}`,
        note: problem.change,
      })),
    },
  ];

  return {
    key: `template-${template.id}`,
    title: template.title,
    aliases: relatedProblems.map((problem) => problem.title),
    content,
  };
}

const coveredRanks = algorithmTemplates.flatMap((template) => template.problemRanks).sort((a, b) => a - b);
if (coveredRanks.length !== 30 || coveredRanks.some((rank, index) => rank !== index + 1)) {
  throw new Error('Algorithm templates must cover every CodeTop Top 30 problem exactly once');
}
