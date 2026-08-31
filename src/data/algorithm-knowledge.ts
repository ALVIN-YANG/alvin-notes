import { createKnowledgeMap, type KnowledgeReference } from './create-knowledge-map';

const highFrequencyArticle = {
  title: 'CodeTop 高频面试题榜',
  href: 'https://codetop.cc/home',
};

const advancedArticle = {
  title: 'Princeton Algorithms',
  href: 'https://algs4.cs.princeton.edu/home/',
};

const coreReferences: KnowledgeReference[] = [
  { title: highFrequencyArticle.title, location: '按真实面试记录统计的题目频率', href: highFrequencyArticle.href },
  { title: 'Introduction to Algorithms, Fourth Edition', location: 'MIT Press 教材', href: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/' },
];

const advancedReferences: KnowledgeReference[] = [
  { title: advancedArticle.title, location: 'Princeton University 配套教材与代码', href: advancedArticle.href },
  { title: 'Introduction to Algorithms, Fourth Edition', location: 'MIT Press 教材', href: 'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/' },
];

const algorithmKnowledge = createKnowledgeMap({
  slug: 'algorithm',
  updatedAt: '2026-08-31',
  sources: [highFrequencyArticle, advancedArticle],
  domains: [
    {
      title: '先建立解题基本功',
      short: '复杂度与正确性',
      summary: '先能评估代价、说清不变量，再追求最优解。',
      articles: [highFrequencyArticle],
      groups: [
        {
          title: '时间与空间复杂度',
          level: 'core',
          references: coreReferences,
          points: [
            ['Big O 上界', '用输入规模描述增长趋势，忽略常数和低阶项时仍要保留主导成本。'],
            ['均摊复杂度', '数组扩容和动态表等操作会偶尔很贵，但一组操作的平均代价仍可以很低。'],
            ['递归时间树', '将每层子问题数量和单次工作量相乘，再累加各层成本。'],
            ['额外空间', '区分输出本身、辅助容器和调用栈，原地修改也可能使用线性递归栈。'],
          ],
        },
        {
          title: '不变量与正确性',
          level: 'core',
          references: coreReferences,
          points: [
            ['循环不变量', '说清每轮开始前始终成立的性质，可以解释指针为何能移动。'],
            ['归纳证明', '用初始成立、单步保持和终止结果三段检查递推与动态规划。'],
            ['反证与交换论证', '贪心策略需要说明局部选择能被交换到某个最优解中。'],
            ['边界与终止', '空输入、单元素、全部相同和无解情况应在算法设计时一起考虑。'],
          ],
        },
        {
          title: '输入规模与可行解',
          level: 'core',
          references: coreReferences,
          points: [
            ['从数据范围反推', '输入上限会筛掉不可行的复杂度，十万级数据通常无法接受平方级遍历。'],
            ['先写基线解', '暴力解能澄清枚举对象和正确性，也能作为小数据对拍基准。'],
            ['用空间换时间', '哈希表、前缀结果和预处理可以避免重复计算，代价是额外内存和一致性管理。'],
            ['利用数据性质', '有序、单调、非负、值域小和元素唯一都可以改变可用算法。'],
          ],
        },
        {
          title: '面试表达与验证',
          level: 'scenario',
          references: coreReferences,
          points: [
            ['澄清输入输出', '先确认重复值、空值、顺序、取值范围和无解时的返回约定。'],
            ['先基线再优化', '从能解决问题的方案出发，点出重复工作，再引入更合适的数据结构。'],
            ['手工跟踪状态', '选择能触发边界的小样例，逐步说明指针、容器和返回值的变化。'],
            ['主动报出复杂度', '结束前给出时间和额外空间复杂度，同时说明它们依赖的输入性质。'],
          ],
        },
      ],
    },
    {
      title: '熟练线性数据结构',
      short: '数组、链表与哈希',
      summary: '掌握访问、更新和维护顺序的基本代价。',
      articles: [highFrequencyArticle],
      groups: [
        {
          title: '数组与字符串', level: 'core', references: coreReferences,
          points: [
            ['原地读写', '用下标保存写入边界，将删除、去重和移动元素结合成一次遍历。'],
            ['前缀和', '将区间求和转成两个前缀值之差，需要严格统一左闭右开等边界定义。'],
            ['差分数组', '对区间加减只记录起点和终点之后的变化，最后用前缀累加还原。'],
            ['字符计数与编码', '字母表较小时用数组代替哈希表，处理 Unicode 时要区分代码单元和字符。'],
          ],
        },
        {
          title: '链表', level: 'core', references: coreReferences,
          points: [
            ['虚拟头节点', '用 dummy 节点统一头节点删除、合并和分割时的边界逻辑。'],
            ['快慢指针', '快指针每次多走一步，可用于找中点、检测环和定位环入口。'],
            {
              title: '反转链表',
              content: [
                { type: 'paragraph', text: 'CodeTop 全站高频榜中，这道题长期位于前列。面试官通常用它检查指针操作、循环不变量和边界处理，后面的 K 个一组翻转、反转区间、回文链表都会复用这段基本功。' },
                { type: 'visual', kind: 'reverse-list', label: '反转链表的四步指针变化动画', caption: '先保存 next，再反转当前指针', sourceHref: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0206-Reverse-Linked-List', sourceLabel: '原题动画' },
                { type: 'heading', text: '核心不变量' },
                { type: 'paragraph', text: '进入每轮循环时，prev 指向已经反转好的前半段，curr 指向尚未处理部分的第一个节点。先保存 curr.next，再把 curr.next 指向 prev，随后让 prev 和 curr 各前进一步。顺序不能换，否则未处理链表会丢失。' },
                { type: 'code', language: 'java', text: `ListNode prev = null;
ListNode curr = head;
while (curr != null) {
    ListNode next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
}
return prev;` },
                { type: 'heading', text: '复杂度与边界' },
                { type: 'paragraph', text: '迭代解访问每个节点一次，时间复杂度为 O(n)，额外空间为 O(1)。空链表直接返回 null，单节点会执行一次循环并返回自身。递归写法时间仍为 O(n)，调用栈需要 O(n) 空间，链表过长时还可能触发栈溢出。' },
                { type: 'heading', text: '面试容易错在哪里' },
                { type: 'list', items: ['没有提前保存 next，改完指针后找不到剩余节点。', '循环结束后返回 curr，此时 curr 已经是 null，正确的新头节点在 prev。', '只交换节点值，没有真正改变链接关系，无法迁移到区间翻转等题型。'] },
                { type: 'heading', text: '继续追问' },
                { type: 'paragraph', text: '如果要求反转区间 [left, right]，应先用虚拟头节点找到区间前驱，再复用局部反转。若要求 K 个一组，必须先确认剩余节点够一组，随后连接上一组尾部、当前组新头和下一段。' },
              ],
              references: [
                { title: 'CodeTop 高频面试题榜', location: '2026-08-31 查询时位列全站第 3', href: 'https://codetop.cc/home' },
                { title: 'LeetCode 206 Reverse Linked List', location: '题目定义、约束与迭代或递归要求', href: 'https://leetcode.cn/problems/reverse-linked-list/' },
                { title: 'LeetCodeAnimation 206', location: '高 Star 图解项目中的原题动画，仅作延伸阅读', href: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0206-Reverse-Linked-List' },
              ],
            },
            ['链表重排', '找中点、反转后半段、交替合并是回文检查和重排题的常见组合。'],
          ],
        },
        {
          title: '哈希表与集合', level: 'core', references: coreReferences,
          points: [
            ['存在性查询', '遍历时将已见元素放入集合，把之后的查找从线性降到期望常数。'],
            ['值到位置的映射', '两数之和、最早或最近位置等问题要先定义重复键的更新规则。'],
            ['频次统计', '计数表可以比较多重集、找多数元素和维护窗口内缺口。'],
            ['自定义键', 'Java 中将复合对象作为键时，`equals` 与 `hashCode` 必须保持一致且键不应在入表后变化。'],
          ],
        },
        {
          title: '栈、队列与双端队列', level: 'core', references: coreReferences,
          points: [
            ['栈与配对关系', '括号、表达式和路径简化依赖后进先出来保存尚未闭合的状态。'],
            ['队列与层序', '队列保证先发现的状态先扩展，是 BFS 和按层处理的基础。'],
            ['双端队列', '两端都能常数进出，可实现滑动窗口最值和 0-1 BFS。'],
            ['循环队列', '用固定数组和取模运算复用空间，需要区分空、满与元素个数。'],
          ],
        },
      ],
    },
    {
      title: '掌握区间与指针模式',
      short: '双指针与窗口',
      summary: '通过有序性和可单调维护的状态减少重复枚举。',
      articles: [highFrequencyArticle],
      groups: [
        {
          title: '左右指针', level: 'core', references: coreReferences,
          points: [
            ['有序两数之和', '比较当前和与目标，只移动能让结果向目标靠近的一侧。'],
            ['原地去重', '读指针遍历原数组，写指针始终指向下一个可写位置。'],
            ['盛水与边界收缩', '容量受较短边限制，保留短边无法通过收缩宽度得到更优解。'],
            ['回文双向扫描', '从两端比较并向中间收缩，需提前定义是否忽略空格、标点和大小写。'],
          ],
        },
        {
          title: '快慢指针', level: 'core', references: coreReferences,
          points: [
            ['判断数字循环', '将状态转移当成隐式链表，用快慢指针判断是否进入环。'],
            ['找链表中点', '快指针到尾时慢指针到中点，偶数长度时要明确取左中还是右中。'],
            ['原地移除元素', '快指针读取所有元素，慢指针只在保留元素时前进。'],
            ['并行转移状态', '两个指针按不同速度或规则转移，关键是证明相遇或错开的含义。'],
          ],
        },
        {
          title: '滑动窗口', level: 'core', references: coreReferences,
          points: [
            ['固定长度窗口', '每次加入一个右端元素并移除一个左端元素，窗口状态用常数时间更新。'],
            ['最小可行窗口', '右端扩张直到条件成立，左端持续收缩并更新最短结果。'],
            {
              title: '无重复字符的最长子串',
              content: [
                { type: 'paragraph', text: '这是 CodeTop 当前全站频率最高的题。看到连续子串、最长、窗口内不能重复这三个条件，就应想到维护一个始终合法的滑动窗口。窗口使用左闭右闭区间 [left, right]，并记录每个字符最近一次出现的位置。' },
                { type: 'visual', kind: 'sliding-window', label: '字符串 abba 的滑动窗口状态动画', caption: '重复字符出现后，left 只能向右跳', sourceHref: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0003-Longest-Substring-Without-Repeating-Characters', sourceLabel: '原题动画' },
                { type: 'heading', text: '状态怎样移动' },
                { type: 'paragraph', text: 'right 每次向右读入一个字符 c。若 c 上次出现在位置 p，并且 p 仍在当前窗口内，就把 left 跳到 p + 1。随后更新 c 的最近位置，再用 right - left + 1 更新答案。left 只能前进，因此处理 abba 时必须写 max(left, p + 1)，否则读到最后一个 a 会让 left 倒退。' },
                { type: 'code', language: 'java', text: `Map<Character, Integer> last = new HashMap<>();
int left = 0, answer = 0;
for (int right = 0; right < s.length(); right++) {
    char c = s.charAt(right);
    if (last.containsKey(c)) {
        left = Math.max(left, last.get(c) + 1);
    }
    last.put(c, right);
    answer = Math.max(answer, right - left + 1);
}
return answer;` },
                { type: 'heading', text: '为什么是线性复杂度' },
                { type: 'paragraph', text: 'right 扫描 n 个字符，left 在整个过程中最多从 0 走到 n。哈希查询的期望成本为 O(1)，总时间为 O(n)，空间为 O(min(n, 字符集大小))。如果题目明确只有 ASCII，可以用定长 int 数组保存最近位置，并用 0 表示未出现、位置加一表示已出现。' },
                { type: 'heading', text: '常见变体' },
                { type: 'list', items: ['至多包含 K 种字符时，窗口中维护频次和不同字符数量。', '允许替换 K 个字符时，维护窗口长度减去最高字符频次不超过 K。', '求最小覆盖子串时，右侧负责满足条件，左侧在条件成立后尽量收缩。'] },
                { type: 'heading', text: '面试要讲清楚' },
                { type: 'paragraph', text: '先说窗口始终没有重复字符，再解释 left 为什么不会后退。若面试官要求返回子串，额外保存最佳窗口的起点和长度即可，算法复杂度不变。' },
              ],
              references: [
                { title: 'CodeTop 高频面试题榜', location: '2026-08-31 查询时位列全站第 1', href: 'https://codetop.cc/home' },
                { title: 'LeetCode 3 Longest Substring Without Repeating Characters', location: '题目定义、示例与输入约束', href: 'https://leetcode.cn/problems/longest-substring-without-repeating-characters/' },
                { title: 'LeetCodeAnimation 3', location: '高 Star 图解项目中的原题动画，仅作延伸阅读', href: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0003-Longest-Substring-Without-Repeating-Characters' },
              ],
            },
            ['窗口频次与缺口', '维护当前计数、需求计数和未满足种类数，避免每轮比较整张表。'],
          ],
        },
        {
          title: '区间与扫描线', level: 'scenario', references: coreReferences,
          points: [
            ['区间合并', '先按起点排序，当新区间与当前结果重叠时扩展右端。'],
            ['区间交集', '比较两个已排序区间序列，记录交集后移动结束更早的一侧。'],
            ['差分事件扫描', '将区间开始和结束转成事件，按时间累加活跃数量以求并发峰值。'],
            ['线段边界语义', '闭区间、左闭右开和相邻是否视为重叠会直接改变排序和合并条件。'],
          ],
        },
      ],
    },
    {
      title: '学会排序、查找与选择',
      short: '二分、排序与堆',
      summary: '用有序性定位边界，用堆维护动态的最值集合。',
      articles: [highFrequencyArticle, advancedArticle],
      groups: [
        {
          title: '二分查找', level: 'core', references: coreReferences,
          points: [
            ['精确匹配', '在有序数组中比较中点后排除一半区间，循环区间的闭开定义要一致。'],
            ['第一个满足条件的位置', '将谓词看成从 false 切换到 true 的单调序列，最后返回切换边界。'],
            ['旋转数组', '每轮判断哪一半有序，再根据目标是否落在该区间缩小范围。'],
            ['答案二分', '当答案范围有序且可以用可行性函数验证时，对答案值而非数组下标做二分。'],
          ],
        },
        {
          title: '排序与比较器', level: 'core', references: coreReferences,
          points: [
            ['稳定性', '相等键的原始顺序是否保留，会影响多字段排序和事件扫描。'],
            ['比较器契约', '比较结果应反对称、可传递并与相等语义相容，不要用减法冒整数溢出风险。'],
            ['归并排序', '分治后合并两个有序段，稳定且最坏为对数线性复杂度，但需要辅助空间。'],
            {
              title: '数组中的第 K 个最大元素',
              content: [
                { type: 'paragraph', text: '这道题在 CodeTop 当前全站榜中排第 4。题目允许重复值，第 K 大表示数组完全降序排列后的第 K 个位置。把它换成升序下标 target = n - k 后，就能使用 Quickselect，只定位目标位置，无须把整个数组排好。' },
                { type: 'visual', kind: 'quickselect', label: 'Quickselect 寻找数组第 K 大元素的分区动画', caption: '比较 pivot 下标与 target，只保留目标所在区间', sourceHref: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0215-Kth-Largest-Element-in-an-Array', sourceLabel: '原题动画' },
                { type: 'heading', text: 'Quickselect 怎样收缩区间' },
                { type: 'paragraph', text: 'partition 把一个 pivot 放到最终位置 p，并保证左侧元素不大于它、右侧元素不小于它。p 等于 target 时直接返回。p 小于 target 就只处理右半段，反之只处理左半段。每轮随机选择 pivot 可以避免输入顺序稳定地触发坏分割。' },
                { type: 'code', language: 'java', text: `int target = nums.length - k;
int left = 0, right = nums.length - 1;
while (left <= right) {
    int pivot = partitionWithRandomPivot(nums, left, right);
    if (pivot == target) return nums[pivot];
    if (pivot < target) left = pivot + 1;
    else right = pivot - 1;
}
throw new IllegalStateException();` },
                { type: 'heading', text: '三种方案怎么选' },
                { type: 'list', items: ['Quickselect 平均时间为 O(n)，原地处理只需 O(1) 额外空间，最坏情况会退化到 O(n²)。', '容量为 K 的最小堆时间为 O(n log k)，空间为 O(k)，适合数据流或不允许改原数组的场景。', '完整排序时间为 O(n log n)，代码最短，面试官要求利用选择算法时通常不够。'] },
                { type: 'heading', text: 'Java 实现细节' },
                { type: 'paragraph', text: '堆方案使用 PriorityQueue<Integer> 的自然顺序即可，每加入一个数后如果 size 大于 k 就弹出堆顶。Quickselect 要统一 partition 的区间语义，并确认返回的是 pivot 最终下标。若使用递归，还要把最坏情况下的递归栈算进空间复杂度。' },
                { type: 'heading', text: '面试追问' },
                { type: 'paragraph', text: '数据持续到来时应使用最小堆。K 接近 n 时仍可维护 n - k + 1 个最小值的最大堆，减少空间。若值域很小，也可以计数后从大到小累加频次。' },
              ],
              references: [
                { title: 'CodeTop 高频面试题榜', location: '2026-08-31 查询时位列全站第 4', href: 'https://codetop.cc/home' },
                { title: 'LeetCode 215 Kth Largest Element in an Array', location: '题目定义与重复元素语义', href: 'https://leetcode.cn/problems/kth-largest-element-in-an-array/' },
                { title: 'Princeton Algorithms, Quicksort', location: 'Quickselect 与随机化分割', href: 'https://algs4.cs.princeton.edu/23quicksort/' },
                { title: 'Oracle PriorityQueue API', location: 'Java 最小堆行为与复杂度', href: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html' },
                { title: 'LeetCodeAnimation 215', location: '高 Star 图解项目中的原题动画，仅作延伸阅读', href: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0215-Kth-Largest-Element-in-an-Array' },
              ],
            },
          ],
        },
        {
          title: '堆与 Top K', level: 'core', references: coreReferences,
          points: [
            ['最小堆与最大堆', '堆只保证根是全局最值，不保证内部元素全序。'],
            ['Top K 维护', '求最大的 k 个元素时维护容量为 k 的最小堆，堆顶是当前入选门槛。'],
            ['多路归并', '将每个有序流的当前最小元素放入堆，弹出后只推进它所属的流。'],
            ['动态中位数', '用一个最大堆保存较小一半，一个最小堆保存较大一半，并维持规模差不超过一。'],
          ],
        },
        {
          title: '单调栈与单调队列', level: 'scenario', references: advancedReferences,
          points: [
            ['下一个更大元素', '栈中保留尚未找到答案的下标，当前元素一次解决所有被它超过的栈顶。'],
            ['柱状图最大矩形', '维护递增高度下标，出栈时当前位置确定右边界，新栈顶确定左边界。'],
            ['接雨水', '可用单调栈在出栈时计算横向水层，也可用双指针维护两侧最高值。'],
            ['滑动窗口最值', '双端队列中保留值单调且仍在窗口内的下标，队首始终是当前最值。'],
          ],
        },
      ],
    },
    {
      title: '读懂树与递归结构',
      short: '树、Trie 与分治',
      summary: '先定义递归函数的返回值，再组合子树结果。',
      articles: [highFrequencyArticle],
      groups: [
        {
          title: '树的遍历', level: 'core', references: coreReferences,
          points: [
            ['前序遍历', '先处理当前节点再访问子树，适合复制结构、构建路径和自顶向下传递状态。'],
            ['中序遍历', '对二叉搜索树会产生有序序列，也可用于找第 k 小元素。'],
            ['后序遍历', '先得到子树结果再计算当前节点，适合高度、直径、删除和树形 DP。'],
            ['层序遍历', '用队列按层访问，每轮先固定当前层大小，可计算层号、右视图和层平均值。'],
          ],
        },
        {
          title: '递归返回值设计', level: 'core', references: coreReferences,
          points: [
            ['子树高度', '定义函数返回当前节点为根的高度，直径则在合并左右高度时更新。'],
            ['路径状态', '路径和可以作为参数自顶向下传递，回溯时要恢复共享列表。'],
            ['最优值与可行性', '递归结果可以同时携带是否合法、边界值和最优值，避免重复遍历子树。'],
            ['全局变量与返回值', '优先让递归函数返回子问题信息，只在答案跨越两棵子树时维护外部最优值。'],
          ],
        },
        {
          title: '二叉搜索树', level: 'core', references: coreReferences,
          points: [
            ['有序性与边界', '每个节点必须满足来自所有祖先的上下界，只比较父子不足以验证整棵树。'],
            ['查找、插入与删除', '操作成本取决于树高，删除两个子节点的节点时可用后继值替换。'],
            ['第 k 小', '中序遍历可按升序计数，如果节点保存子树大小还能实现对数级选择。'],
            ['最近公共祖先', '在 BST 中可根据两个目标值与当前节点的大小关系直接选择子树。'],
          ],
        },
        {
          title: 'Trie 与分治', level: 'scenario', references: advancedReferences,
          points: [
            ['Trie 前缀树', '按字符路径共享前缀，节点需要区分前缀存在和完整单词结束。'],
            ['序列化与反序列化', '序列化必须保留空子节点或结构分隔信息，否则无法唯一恢复树形。'],
            ['通过遍历序列构树', '前序与中序、中序与后序可定位根并递归切分左右子树。'],
            ['分治合并答案', '将问题分成相互独立的子区间，分别解决后在线性或更低代价内合并。'],
          ],
        },
      ],
    },
    {
      title: '把问题转成图',
      short: '图遍历与连通性',
      summary: '先说清节点、边和状态，再选遍历或最短路径。',
      articles: [advancedArticle],
      groups: [
        {
          title: '图的建模与存储', level: 'core', references: advancedReferences,
          points: [
            ['邻接表', '稀疏图通常用邻接表，空间与节点数和边数之和成正比。'],
            ['邻接矩阵', '稠密图或需要常数查边时可用矩阵，代价是平方级空间。'],
            ['有向、无向与权重', '无向边需加入两个方向，权重可表示距离、代价或容量。'],
            ['隐式图', '单词转换、棋盘和数字状态不必预先建边，可在遍历时动态生成邻居。'],
          ],
        },
        {
          title: 'DFS 与 BFS', level: 'core', references: advancedReferences,
          points: [
            ['DFS 连通块', '从每个未访问节点深度遍历，启动次数就是连通分量数量。'],
            ['BFS 无权最短路', '队列按距离分层，节点第一次被访问时已经得到最少边数的路径。'],
            ['多源 BFS', '将所有起点在距离为零时一起入队，可计算每个节点到最近源点的距离。'],
            ['访问标记时机', '队列问题应在入队时标记已访问，避免同一状态被多次加入。'],
          ],
        },
        {
          title: '拓扑排序与并查集', level: 'scenario', references: advancedReferences,
          points: [
            ['入度拓扑排序', '将入度为零的节点入队，移除它的出边后继续加入新的零入度节点。'],
            ['有向图环检测', '拓扑结果节点数少于图中节点数时存在环，DFS 也可用三色状态检测回边。'],
            ['并查集', '用代表元素管理不相交集合，路径压缩和按大小合并让操作接近常数。'],
            ['冗余连接与动态连通', '加边前两个节点已属于同一集合就会形成环，可用于判断冗余边。'],
          ],
        },
        {
          title: '最短路径与最小生成树', level: 'advanced', references: advancedReferences,
          points: [
            ['Dijkstra', '适用于非负权图，用优先队列每次确认当前最小距离节点并松弛出边。'],
            ['Bellman-Ford', '可处理负权边并检测可达负环，代价是节点数与边数之积的时间。'],
            ['Floyd-Warshall', '用动态规划逐步允许更多中间节点，求所有点对最短路径。'],
            ['Kruskal 与 Prim', 'Kruskal 按边权从小到大并用并查集避环，Prim 从已选节点集向外扩展最小边。'],
          ],
        },
      ],
    },
    {
      title: '掌握状态搜索',
      short: '回溯与剪枝',
      summary: '把选择、约束和恢复状态写清，再减少无效分支。',
      articles: [highFrequencyArticle, advancedArticle],
      groups: [
        {
          title: '回溯框架', level: 'core', references: coreReferences,
          points: [
            ['路径、选择和结束条件', '每层递归表示一个决策位置，依次选择、进入下一层、撤销选择。'],
            ['恢复共享状态', '将元素加入路径或修改访问标记后，返回前要做对称的删除和恢复。'],
            ['结果快照', '将当前路径加入答案时必须复制，否则后续回溯会改掉已保存结果。'],
            ['枚举顺序', '排序后枚举可以让重复跳过和上界剪枝更容易实现。'],
          ],
        },
        {
          title: '子集、组合与排列', level: 'core', references: coreReferences,
          points: [
            ['子集', '每到达一个递归节点就保存当前路径，之后只从更大下标继续选择。'],
            ['组合', '只在路径长度达标时收集结果，剩余元素不足时可提前停止。'],
            ['排列', '每层可以选任何未使用元素，因此需要独立的访问标记。'],
            ['重复元素去重', '同一决策层中跳过和前一个值相同且前一个未被当前路径使用的元素。'],
          ],
        },
        {
          title: '棋盘与字符串搜索', level: 'scenario', references: advancedReferences,
          points: [
            ['网格路径搜索', '状态包括当前坐标和已访问单元格，离开分支时恢复访问标记。'],
            ['N 皇后', '按行放置皇后，分别维护列、主对角线和副对角线的占用集合。'],
            ['单词拆分', '递归位置表示已处理前缀，用字典验证下一段，可以用记忆化避免重复后缀。'],
            ['分割回文', '预处理回文区间可避免每个分支重复扫描子串。'],
          ],
        },
        {
          title: '剪枝与记忆化', level: 'advanced', references: advancedReferences,
          points: [
            ['可行性剪枝', '当前状态已违反约束或剩余选择无法完成目标时立即返回。'],
            ['上下界剪枝', '估计当前分支能达到的最优上界，如果仍不如已知答案就停止扩展。'],
            ['重复状态记忆化', '当不同路径会到达同一个剩余问题时，用状态键缓存成败或最优结果。'],
            ['选择顺序启发', '先尝试更可能成功或更容易触发冲突的选项，可以更早得到答案或剪枝。'],
          ],
        },
      ],
    },
    {
      title: '建立动态规划直觉',
      short: '状态、转移与优化',
      summary: '定义一个可重复使用的子问题，把选择写成转移。',
      articles: [highFrequencyArticle, advancedArticle],
      groups: [
        {
          title: '状态设计', level: 'core', references: coreReferences,
          points: [
            ['状态的完整含义', '`dp[i]` 或 `dp[i][j]` 必须说清处理范围、当前位置和保存的答案类型。'],
            ['转移来自最后一步', '枚举最后一个决策，删掉它后剩余部分应是已定义的更小状态。'],
            ['初始值与不可达', '求最小值时不可达状态用无穷大，求计数时空集合通常有一种方案。'],
            ['计算顺序', '每个状态在使用依赖前必须等依赖已计算，这决定循环方向和维度顺序。'],
          ],
        },
        {
          title: '一维与序列 DP', level: 'core', references: coreReferences,
          points: [
            ['爬楼梯与房屋偷盗', '当前状态只依赖前一两个位置，可以用滚动变量把空间降到常数。'],
            ['最长递增子序列', '以某位置结尾的最优长度是基本 DP，维护各长度最小尾值可进一步优化。'],
            ['最大子数组和', '以当前位置结尾的最大和只需在独立开始和接上前缀之间取大值。'],
            ['字符串分割', '状态表示某个前缀是否可拆分，转移枚举最后一段并查字典。'],
          ],
        },
        {
          title: '二维与区间 DP', level: 'scenario', references: advancedReferences,
          points: [
            ['网格路径', '状态表示到达某个单元格的方案数或最小代价，转移来自允许的前驱方向。'],
            ['最长公共子序列', '两个前缀的答案在尾字符相等时同时缩短，否则舍弃任意一侧尾字符取最优。'],
            ['编辑距离', '状态表示将一个前缀转成另一个前缀的最少操作数，转移枚举插入、删除和替换。'],
            ['区间 DP', '按区间长度从小到大计算，转移通常枚举分割点或最后被处理的元素。'],
          ],
        },
        {
          title: '背包与状态优化', level: 'advanced', references: advancedReferences,
          points: [
            ['0-1 背包', '每个物品最多用一次，压缩成一维后容量必须从大到小遍历。'],
            ['完全背包', '物品可重复使用，一维转移时容量从小到大遍历，使当轮结果可被再次使用。'],
            ['方案数与排列数', '外层遍历物品会去掉顺序，外层遍历容量会将不同选择顺序计为不同方案。'],
            ['滚动数组与单调优化', '当转移只依赖上一层或有固定窗口最值时，可以降维或用单调队列减少转移成本。'],
          ],
        },
      ],
    },
    {
      title: '补齐贪心、位运算与数学',
      short: '局部选择与数学',
      summary: '识别可证明的局部最优选择，掌握常用整数工具。',
      articles: [advancedArticle],
      groups: [
        {
          title: '贪心策略', level: 'scenario', references: advancedReferences,
          points: [
            ['区间调度', '按结束时间最早的可选区间继续选择，为后续区间留下最大空间。'],
            ['跳跃与覆盖', '遍历到当前可达边界时维护下一段能到的最远位置。'],
            ['按贡献排序', '当交换两个相邻选择可以比较总代价时，可推出应该使用的排序键。'],
            ['贪心失效识别', '局部选择会影响后续可行集且无法用交换保持最优时，需要考虑 DP 或搜索。'],
          ],
        },
        {
          title: '位运算', level: 'scenario', references: advancedReferences,
          points: [
            ['位掩码表示集合', '第 i 位表示元素 i 是否被选中，并、交、差可分别用按位或、与和与反码实现。'],
            ['异或消去成对元素', '相同数异或为零，异或又满足交换律和结合律，可找只出现一次的数。'],
            ['低位 1', '`x & -x` 取出最低的一个 1，`x & (x - 1)` 每次清除最低位 1。'],
            ['位状压 DP', '元素数较少时用整数表示已选集合，转移枚举尚未选择的元素。'],
          ],
        },
        {
          title: '基础数学', level: 'scenario', references: advancedReferences,
          points: [
            ['最大公约数', '欧几里得算法反复用余数替换较大数，可用于约分和周期问题。'],
            ['快速幂', '将指数按二进制拆分，每轮平方底数并按当前位决定是否乘入答案。'],
            ['质数与筛法', '试除只需到平方根，批量求质数可用埃氏筛标记合数。'],
            ['组合数与取模', '连乘可以逐步约分避免溢出，模质数下可用快速幂求乘法逆元。'],
          ],
        },
        {
          title: '随机与概率', level: 'advanced', references: advancedReferences,
          points: [
            ['Fisher-Yates 洗牌', '从未确定区间均匀选一个元素与当前边界交换，保证所有排列等概率。'],
            ['蓄水池抽样', '数据流长度未知时用固定空间保留均匀样本，第 i 个元素以指定概率替换样本。'],
            ['加权随机', '将权重累加成前缀区间，随机数落入的区间决定选中元素。'],
            ['随机化避免最坏输入', '随机选 pivot 可以让快排和快速选择的期望性能不依赖原始顺序。'],
          ],
        },
      ],
    },
    {
      title: '能设计数据结构并收尾',
      short: '设计题与工程细节',
      summary: '组合多种结构满足操作复杂度，用测试完成验收。',
      articles: [highFrequencyArticle, advancedArticle],
      groups: [
        {
          title: '组合数据结构', level: 'scenario', references: coreReferences,
          points: [
            {
              title: 'LRU Cache',
              content: [
                { type: 'paragraph', text: 'LRU Cache 在 CodeTop 当前全站榜中排第 2，也是典型的数据结构设计题。题目要求 get 和 put 都达到 O(1)。哈希表负责通过 key 找到节点，双向链表负责维护使用顺序，两种结构共同满足这个约束。' },
                { type: 'visual', kind: 'lru-cache', label: '容量为三的 LRU Cache 访问与淘汰动画', caption: '每次访问移到表头，容量溢出时淘汰表尾', sourceHref: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0146-LRU-Cache', sourceLabel: '原题动画' },
                { type: 'heading', text: '链表保存什么顺序' },
                { type: 'paragraph', text: '使用两个哨兵节点 head 和 tail。head 后面放最近使用的节点，tail 前面放最久未使用的节点。get 命中和 put 更新都会把节点移到 head 后面。插入新节点后若超过容量，就删除 tail.prev，并同步从哈希表移除它的 key。读操作也会改变顺序，这是最容易漏掉的语义。' },
                { type: 'code', language: 'java', text: `int get(int key) {
    Node node = cache.get(key);
    if (node == null) return -1;
    moveToFront(node);
    return node.value;
}

void moveToFront(Node node) {
    remove(node);
    addAfterHead(node);
}` },
                { type: 'heading', text: '必须保持的不变量' },
                { type: 'list', items: ['哈希表中的每个 key 恰好对应链表中的一个真实节点。', '真实节点始终位于两个哨兵之间，链表首尾操作不需要单独判断空节点。', '缓存大小超过 capacity 后，淘汰与哈希删除必须在同一次 put 中完成。'] },
                { type: 'heading', text: '复杂度与工程边界' },
                { type: 'paragraph', text: '哈希查找、摘除节点、插入表头和删除表尾都是 O(1)，整体空间为 O(capacity)。Java 的 LinkedHashMap 支持 accessOrder，可通过 removeEldestEntry 快速实现同样语义。面试手写仍应展示哈希表与双向链表，因为它能证明你理解常数复杂度来自哪里。多线程环境还要增加锁或使用分段结构，算法题版本本身不保证并发安全。' },
                { type: 'heading', text: '面试追问' },
                { type: 'paragraph', text: '如果换成 LFU，需要同时按访问频次分桶，并在同频次内维持 LRU 顺序。若缓存对象带过期时间，还要定义过期检查、容量淘汰和后台清理的优先级。' },
              ],
              references: [
                { title: 'CodeTop 高频面试题榜', location: '2026-08-31 查询时位列全站第 2', href: 'https://codetop.cc/home' },
                { title: 'LeetCode 146 LRU Cache', location: 'O(1) 操作要求与容量语义', href: 'https://leetcode.cn/problems/lru-cache/' },
                { title: 'Oracle LinkedHashMap API', location: 'access-order 与 LRU 用法说明', href: 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashMap.html' },
                { title: 'LeetCodeAnimation 146', location: '高 Star 图解项目中的原题动画，仅作延伸阅读', href: 'https://github.com/MisterBooo/LeetCodeAnimation/tree/master/problems/0146-LRU-Cache' },
              ],
            },
            ['常数时间随机集合', '数组保存紧凑元素，哈希表保存位置，删除时用末尾元素补空位。'],
            ['最小栈', '普通栈与同步最小值栈一起入栈出栈，使查最小值保持常数时间。'],
            ['前缀统计结构', 'Trie、Fenwick Tree 或 Segment Tree 分别适合字符前缀、单点更新前缀查询和通用区间合并。'],
          ],
        },
        {
          title: '高级数据结构', level: 'advanced', references: advancedReferences,
          points: [
            ['Fenwick Tree', '用 lowbit 跳转维护前缀和，支持对数时间单点更新和前缀查询。'],
            ['Segment Tree', '每个节点保存一段区间的可合并信息，支持对数更新和区间查询。'],
            ['延迟标记', '区间更新时先把变化记在覆盖节点，只在访问子树前向下传播。'],
            ['稀疏表', '对不变数组预处理长度为二的幂的区间结果，可快速回答幂等性查询。'],
          ],
        },
        {
          title: 'Java 实现细节', level: 'scenario', references: coreReferences,
          points: [
            ['整数溢出', '计算中点、距离、和与乘积时要评估 `int` 上限，必要时提前转为 `long`。'],
            ['容器选型', '队列和栈优先用 `ArrayDeque`，需要排序最值时用 `PriorityQueue`，避免不必要的装箱和链表节点。'],
            ['比较器与 lambda', '用 `Integer.compare` 或 `Comparator.comparingInt` 避免减法溢出，多键排序用 `thenComparing`。'],
            ['递归深度', 'Java 调用栈对深链和大图不安全，输入可达十万级时考虑显式栈或队列。'],
          ],
        },
        {
          title: '测试与复盘', level: 'core', references: coreReferences,
          points: [
            ['边界用例', '至少覆盖空、单元素、最小合法规模、全部相同、严格有序和无解。'],
            ['对拍', '用小规模随机数据比较优化解与简单暴力解，能快速暴露隐蔽边界错误。'],
            ['不变量断言', '在开发和调试时检查窗口、堆、单调栈和并查集应保持的性质。'],
            ['按模式复盘', '记录题目中哪个信号导向某种状态和数据结构，比背一份完整代码更容易迁移。'],
          ],
        },
      ],
    },
  ],
});

export default algorithmKnowledge;
