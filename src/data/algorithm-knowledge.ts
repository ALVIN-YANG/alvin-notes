import {
  createKnowledgeMap,
  type KnowledgePointSeed,
  type KnowledgeReference,
} from './create-knowledge-map';
import { getAlgorithmVisual, interviewProtocolVisual } from './algorithm-visuals';

const CODETOP_UPDATED_AT = '2026-09-02';

const codeTopArticle = {
  title: 'CodeTop 高频面试题榜',
  href: 'https://codetop.cc/home',
};

const interviewArticle = {
  title: 'Gayle Laakmann McDowell 的编码面试评估说明',
  href: 'https://www.gayle.com/blog/2016/3/coding-interviews-and-the-importance-of-perfection',
};

const codeTopReference = (rank: number): KnowledgeReference => ({
  title: codeTopArticle.title,
  location: `${CODETOP_UPDATED_AT} 全站榜第 ${rank} 位`,
  href: codeTopArticle.href,
});

interface InterviewCardSpec {
  rank: number;
  id: string;
  title: string;
  slug: string;
  leetcodeId?: string;
  leetcodeTitle?: string;
  difficulty: '简单' | '中等' | '困难';
  examines: string;
  clarify: string;
  reasoning: string;
  code: string;
  invariant: string;
  complexity: string;
  checks: readonly string[];
  followUp: string;
  references?: readonly KnowledgeReference[];
}

const makeInterviewCard = (spec: InterviewCardSpec): KnowledgePointSeed => ({
  title: spec.title,
  content: [
    {
      type: 'link',
      label: '查看力扣原题',
      detail: `LeetCode ${spec.leetcodeId ?? spec.id} · ${spec.leetcodeTitle ?? spec.title}`,
      href: `https://leetcode.cn/problems/${spec.slug}/`,
    },
    {
      type: 'paragraph',
      text: `CodeTop 全站榜第 ${spec.rank} 位，难度 ${spec.difficulty}。${spec.examines}`,
    },
    getAlgorithmVisual(spec.id),
    { type: 'heading', text: '开口先确认' },
    { type: 'paragraph', text: spec.clarify },
    { type: 'heading', text: '把方案推出来' },
    { type: 'paragraph', text: spec.reasoning },
    { type: 'heading', text: 'Java 实现' },
    { type: 'code', language: 'java', text: spec.code },
    { type: 'heading', text: '不变量与复杂度' },
    { type: 'paragraph', text: `${spec.invariant} ${spec.complexity}` },
    { type: 'heading', text: '测试与修错' },
    { type: 'list', items: spec.checks },
    { type: 'heading', text: '继续追问' },
    { type: 'paragraph', text: spec.followUp },
  ],
  references: [
    codeTopReference(spec.rank),
    ...(spec.references ?? []),
  ],
});

const interviewProtocol: KnowledgePointSeed = {
  title: '一轮算法面试怎样完整作答',
  content: [
    {
      type: 'paragraph',
      text: '一道题的最终答案只提供一个结果。面试官还能从澄清问题、方案演进、代码结构、主动测试和修错方式中判断你能否稳定地解决问题。这张卡用于约束后面每一道题的练习方式。',
    },
    interviewProtocolVisual,
    { type: 'heading', text: '前五分钟做什么' },
    {
      type: 'list',
      items: [
        '复述输入、输出和一个小例子，确认空值、重复值、范围、顺序与无解约定。',
        '给出能工作的基线方案，指出它重复计算了什么，再说明准备维护的状态。',
        '编码前说清核心不变量、选用的数据结构以及预期复杂度。',
      ],
    },
    { type: 'heading', text: '编码时让人看见什么' },
    {
      type: 'paragraph',
      text: '命名要能对应题意，循环区间保持一致，辅助函数只承担一个动作。遇到需要取舍的地方直接说出原因。Java 代码优先使用 ArrayDeque、PriorityQueue 和清晰的比较器，避免依赖含糊的魔法值。',
    },
    { type: 'heading', text: '写完以后怎样验收' },
    {
      type: 'list',
      items: [
        '先跑最小合法输入，再跑会触发关键分支的用例，最后补一个无解或重复值用例。',
        '按变量变化手工执行一遍，不只盯着最终输出。窗口看左右边界，链表看断链位置，递归看返回值含义。',
        '发现错误后先定位被破坏的不变量，再修改根因。给某个样例临时加分支通常会留下第二个错误。',
      ],
    },
    { type: 'heading', text: '达到熟练的标准' },
    {
      type: 'paragraph',
      text: '随机抽题后，应在二十到二十五分钟内完成澄清、分析和可读的 Java 实现。随后主动给出复杂度和三个测试，发现错误时能解释原因。只记住代码顺序，还不能算熟练。',
    },
  ],
  references: [
    {
      title: interviewArticle.title,
      location: '正确性、代码质量、分析能力与修错方式的评估说明',
      href: interviewArticle.href,
    },
    {
      title: 'Developer Interviews are Broken, and You Cannot Fix It',
      location: '算法面试的边界、合理考察范围与多阶段问题',
      href: 'https://www.gayle.com/blog/2015/6/10/developer-interviews-are-broken-and-you-cant-fix-it',
    },
  ],
};

const longestSubstring = makeInterviewCard({
  rank: 1,
  id: '3',
  title: '无重复字符的最长子串',
  slug: 'longest-substring-without-repeating-characters',
  difficulty: '中等',
  examines: '这道题检查滑动窗口、哈希映射和边界单调性。',
  clarify: '确认返回长度还是子串，并问清字符集。Java 的 char 表示 UTF-16 代码单元，题目若限定 ASCII，可以改用定长数组。',
  reasoning: '平方级基线会枚举起点并向右检查重复。重复工作来自反复扫描已经确认无重复的区间。记录字符最近位置后，right 每次只前进一格，left 在重复字符仍位于窗口内时跳到其后一位。',
  code: `int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int left = 0;
    int answer = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (last.containsKey(c)) {
            left = Math.max(left, last.get(c) + 1);
        }
        last.put(c, right);
        answer = Math.max(answer, right - left + 1);
    }
    return answer;
}`,
  invariant: '区间 [left, right] 始终没有重复字符，left 只向右移动。',
  complexity: '时间复杂度 O(n)，空间复杂度 O(min(n, 字符集大小))。',
  checks: [
    '用空串、全部相同和 abba 测试。abba 能暴露 left 被旧位置拉回去的问题。',
    '若结果多一或少一，先检查窗口是否统一使用左右都闭合的定义。',
    '若改成返回子串，额外保存最佳起点和长度，不要在循环中频繁创建 substring。',
  ],
  followUp: '允许最多 K 种字符时维护频次和不同字符数。求最小覆盖子串时，窗口在满足需求后持续收缩。',
});

const lruCache = makeInterviewCard({
  rank: 2,
  id: '146',
  title: 'LRU 缓存',
  slug: 'lru-cache',
  difficulty: '中等',
  examines: '这道设计题检查能否组合哈希表与双向链表，并长期保持两套结构一致。',
  clarify: '确认 get 也会更新最近使用顺序，容量至少为一，并问清 key 不存在时的返回值。算法题版本通常不要求线程安全和过期时间。',
  reasoning: '单独使用链表无法常数定位节点，单独使用哈希表无法常数维护淘汰顺序。哈希表保存 key 到节点的映射，双向链表将最近使用节点放在头部，容量溢出时删除尾部节点。',
  code: `class LRUCache {
    private static class Node {
        int key, value;
        Node prev, next;
        Node(int key, int value) { this.key = key; this.value = value; }
    }

    private final int capacity;
    private final Map<Integer, Node> cache = new HashMap<>();
    private final Node head = new Node(0, 0);
    private final Node tail = new Node(0, 0);

    LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    int get(int key) {
        Node node = cache.get(key);
        if (node == null) return -1;
        moveToFront(node);
        return node.value;
    }

    void put(int key, int value) {
        Node node = cache.get(key);
        if (node != null) {
            node.value = value;
            moveToFront(node);
            return;
        }
        Node added = new Node(key, value);
        cache.put(key, added);
        addAfterHead(added);
        if (cache.size() > capacity) {
            Node removed = tail.prev;
            unlink(removed);
            cache.remove(removed.key);
        }
    }

    private void moveToFront(Node node) {
        unlink(node);
        addAfterHead(node);
    }

    private void unlink(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addAfterHead(Node node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
}`,
  invariant: '哈希表中的每个 key 恰好对应链表中的一个真实节点，真实节点始终位于两个哨兵之间。',
  complexity: 'get 与 put 的期望时间复杂度都是 O(1)，空间复杂度 O(capacity)。',
  checks: [
    '连续 put 同一个 key，确认只更新值和顺序，不增加缓存大小。',
    '执行 put(1)、put(2)、get(1)、put(3)，确认淘汰的是 2。',
    '若淘汰后仍能 get 到旧值，先检查链表删除时是否同步删除哈希映射。',
  ],
  followUp: 'LFU 需要按频次分桶，并在同频次内继续维护 LRU。生产缓存还要定义并发、过期和容量淘汰的关系。',
});

const reverseList = makeInterviewCard({
  rank: 3,
  id: '206',
  title: '反转链表',
  slug: 'reverse-linked-list',
  difficulty: '简单',
  examines: '这道题检查指针修改顺序、循环不变量和空链表边界。',
  clarify: '确认需要修改原链表还是创建新节点。常见要求是原地反转，并返回新的头节点。',
  reasoning: '遍历时必须先保存 curr.next，随后才能让 curr 指回已经反转的前半段。prev 保存新链表头，curr 指向尚未处理的第一个节点。',
  code: `ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}`,
  invariant: '每轮开始时，prev 指向已经反转完成的前半段，curr 指向未处理部分的第一个节点。',
  complexity: '时间复杂度 O(n)，额外空间 O(1)。递归写法需要 O(n) 调用栈。',
  checks: [
    '测试空链表、单节点和两个节点，确认循环结束后返回 prev。',
    '若链表中途断掉，先检查是否在修改 curr.next 之前保存了 next。',
    '若返回 null，检查是否误把已经走到末尾的 curr 当成新头节点。',
  ],
  followUp: '区间反转需要先找到区间前驱，K 个一组还要先确认剩余节点是否够一组。',
});

const kthLargest = makeInterviewCard({
  rank: 4,
  id: '215',
  title: '数组中的第 K 个最大元素',
  slug: 'kth-largest-element-in-an-array',
  difficulty: '中等',
  examines: '这道题检查堆、选择算法和输入条件下的方案取舍。',
  clarify: '确认第 K 大按排序后的位置计算，重复元素也要计数，并问清是否允许修改原数组。',
  reasoning: '完整排序能得到 O(n log n) 基线。只保留最大的 K 个元素时，容量为 K 的最小堆更容易写稳。若允许修改数组并追求平均线性时间，可以把目标换成升序下标 n - k，再使用 Quickselect。',
  code: `int findKthLargest(int[] nums, int k) {
    int target = nums.length - k;
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int pivot = partition(nums, left, right);
        if (pivot == target) return nums[pivot];
        if (pivot < target) left = pivot + 1;
        else right = pivot - 1;
    }
    throw new IllegalStateException();
}

int partition(int[] nums, int left, int right) {
    int pivotIndex = left + ThreadLocalRandom.current().nextInt(right - left + 1);
    swap(nums, pivotIndex, right);
    int write = left;
    for (int i = left; i < right; i++) {
        if (nums[i] <= nums[right]) swap(nums, write++, i);
    }
    swap(nums, write, right);
    return write;
}

void swap(int[] nums, int i, int j) {
    int value = nums[i];
    nums[i] = nums[j];
    nums[j] = value;
}`,
  invariant: 'partition 返回后，pivot 已位于最终排序位置，目标只可能留在它的一侧。',
  complexity: 'Quickselect 平均时间 O(n)，最坏 O(n²)，额外空间 O(1)。最小堆方案为 O(n log k) 时间和 O(k) 空间。',
  checks: [
    '测试重复值、k 等于一和 k 等于数组长度。',
    '若答案偏一位，检查第 K 大是否正确换成 n - k。',
    '若分区死循环，检查区间端点是否每轮都排除了已经就位的 pivot。',
  ],
  followUp: '持续到来的数据应使用容量为 K 的最小堆。值域很小时，也可以计数后从大到小累计频次。',
});

const reverseKGroup = makeInterviewCard({
  rank: 5,
  id: '25',
  title: 'K 个一组翻转链表',
  slug: 'reverse-nodes-in-k-group',
  difficulty: '困难',
  examines: '这道题检查分组边界、局部反转和多段链表重新连接。',
  clarify: '确认不足 K 个的尾段保持原顺序，节点本身需要重连，不能只交换节点值。',
  reasoning: '虚拟头节点统一第一组和后续组。每轮先从 groupPrev 向后找到第 K 个节点，找不到就结束。保存 groupNext 后，将当前组反转并接到下一段，再让 groupPrev 移到本组的新尾节点。',
  code: `ListNode reverseKGroup(ListNode head, int k) {
    ListNode dummy = new ListNode(0, head);
    ListNode groupPrev = dummy;
    while (true) {
        ListNode kth = groupPrev;
        for (int i = 0; i < k && kth != null; i++) kth = kth.next;
        if (kth == null) return dummy.next;

        ListNode groupNext = kth.next;
        ListNode prev = groupNext;
        ListNode curr = groupPrev.next;
        while (curr != groupNext) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        ListNode newTail = groupPrev.next;
        groupPrev.next = kth;
        groupPrev = newTail;
    }
}`,
  invariant: 'groupPrev 之前的节点已经分组完成，当前组反转时 prev 从 groupNext 开始，反转结束后尾部天然接回下一段。',
  complexity: '每个节点被访问常数次，时间复杂度 O(n)，额外空间 O(1)。',
  checks: [
    '测试 k 等于一、节点数刚好为 k，以及尾段少于 k。',
    '若尾段丢失，检查反转前是否保存 groupNext，并让 prev 从它开始。',
    '若第二组开始错位，检查 groupPrev 是否移动到反转前的组头，也就是反转后的组尾。',
  ],
  followUp: '如果每组长度由数组给出，分组探测逻辑不变，只需逐组读取目标长度。递归写法更短，但需要考虑调用栈。',
});

const threeSum = makeInterviewCard({
  rank: 6,
  id: '15',
  title: '三数之和',
  slug: '3sum',
  difficulty: '中等',
  examines: '这道题检查排序、双指针、结果去重和提前剪枝。',
  clarify: '确认需要返回不重复的值组合，数组中重复数字可以作为不同位置参与，但结果组合不能重复。',
  reasoning: '三重枚举是 O(n³) 基线。排序后固定第一个数，剩余两数在有序区间内用左右指针逼近目标。固定值和找到答案后的左右值都要跳过重复项。',
  code: `List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> answer = new ArrayList<>();
    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        if (nums[i] > 0) break;
        int left = i + 1, right = nums.length - 1;
        while (left < right) {
            long sum = (long) nums[i] + nums[left] + nums[right];
            if (sum < 0) left++;
            else if (sum > 0) right--;
            else {
                answer.add(List.of(nums[i], nums[left], nums[right]));
                int a = nums[left], b = nums[right];
                while (left < right && nums[left] == a) left++;
                while (left < right && nums[right] == b) right--;
            }
        }
    }
    return answer;
}`,
  invariant: '固定 i 后，left 右移只会让和增大，right 左移只会让和减小。',
  complexity: '排序后双指针总时间 O(n²)，排序之外的额外空间取决于排序实现，答案空间不计。',
  checks: [
    '测试全零、没有答案和包含多个重复值的数组。',
    '若结果重复，分别检查固定值去重和命中答案后的双指针去重。',
    '若极端整数求和溢出，先把第一个操作数转成 long。',
  ],
  followUp: '四数之和可以再固定一层。一般 K 数之和可递归降维，最后落到有序双指针，同时加入上下界剪枝。',
});

const maxSubarray = makeInterviewCard({
  rank: 7,
  id: '53',
  title: '最大子数组和',
  slug: 'maximum-subarray',
  difficulty: '中等',
  examines: '这道题检查一维动态规划定义，以及何时放弃负贡献前缀。',
  clarify: '确认子数组必须连续且至少包含一个元素，所以全负数组不能返回零。',
  reasoning: '枚举所有区间的基线为 O(n²)。定义 current 为以当前位置结尾的最大和。来到新元素时，只需比较单独从它开始，或者把它接在 previous 后面。',
  code: `int maxSubArray(int[] nums) {
    int current = nums[0];
    int answer = nums[0];
    for (int i = 1; i < nums.length; i++) {
        current = Math.max(nums[i], current + nums[i]);
        answer = Math.max(answer, current);
    }
    return answer;
}`,
  invariant: '处理完下标 i 后，current 是所有以 i 结尾的子数组中的最大和，answer 是前缀范围内的全局最大和。',
  complexity: '时间复杂度 O(n)，额外空间 O(1)。',
  checks: [
    '测试单元素、全负数和最优区间位于中间的数组。',
    '若全负数组返回零，检查初始值是否错误地使用了零。',
    '若要求返回区间，在 current 选择重新开始时记录起点，在 answer 更新时保存左右边界。',
  ],
  followUp: '最大子数组乘积需要同时保留以当前位置结尾的最大值和最小值，因为负数会交换两者。',
});

const quickSort = makeInterviewCard({
  rank: 8,
  id: '补充题 4',
  title: '手写快速排序',
  slug: 'sort-an-array',
  leetcodeId: '912',
  leetcodeTitle: '排序数组',
  difficulty: '中等',
  examines: '这道题检查分区定义、递归边界和最坏情况意识。',
  clarify: '确认允许原地修改，并问清是否要求稳定排序。标准快速排序不稳定，随机 pivot 用来降低固定坏输入的风险。',
  reasoning: '分区将 pivot 放到最终位置，左侧不大于它，右侧不小于它。递归时必须排除已经就位的 pivot。随机选择 pivot 可以避免有序数组稳定触发极端不平衡分区。',
  code: `void quickSort(int[] nums, int left, int right) {
    if (left >= right) return;
    int pivot = partition(nums, left, right);
    quickSort(nums, left, pivot - 1);
    quickSort(nums, pivot + 1, right);
}

int partition(int[] nums, int left, int right) {
    int random = left + ThreadLocalRandom.current().nextInt(right - left + 1);
    swap(nums, random, right);
    int write = left;
    for (int i = left; i < right; i++) {
        if (nums[i] <= nums[right]) swap(nums, write++, i);
    }
    swap(nums, write, right);
    return write;
}

void swap(int[] nums, int i, int j) {
    int value = nums[i];
    nums[i] = nums[j];
    nums[j] = value;
}`,
  invariant: '扫描到 i 前，[left, write) 中的元素都不大于 pivot，[write, i) 中的元素都大于 pivot。',
  complexity: '平均时间 O(n log n)，最坏 O(n²)，递归栈平均 O(log n)，最坏 O(n)。',
  checks: [
    '测试空区间、全部相同、已经有序和逆序数组。',
    '若递归不终止，检查左右子区间是否排除了 pivot。',
    '若丢元素或重复元素错位，逐步检查 write 指针表示的区间，别靠样例临时补条件。',
  ],
  followUp: '工程排序会在小区间使用插入排序，并通过三路分区改善大量重复值。若要求稳定排序，应选择归并排序。',
  references: [
    {
      title: 'Princeton Algorithms Quick Sort',
      location: '分区、随机化与复杂度说明',
      href: 'https://algs4.cs.princeton.edu/23quicksort/',
    },
  ],
});

const longestPalindrome: KnowledgePointSeed = {
  title: '最长回文子串',
  content: [
    {
      type: 'link',
      label: '查看力扣原题',
      detail: 'LeetCode 5 · 最长回文子串',
      href: 'https://leetcode.cn/problems/longest-palindromic-substring/',
    },
    {
      type: 'paragraph',
      text: 'CodeTop 全站榜第 9 位，难度中等。题目要求在字符串中找出最长的连续回文片段。输入 babad 时，bab 和 aba 都符合要求；输入 cbbd 时，答案是 bb。存在多个并列结果时，返回其中任意一个即可。',
    },
    { type: 'heading', text: '先把回文和子串分开' },
    {
      type: 'paragraph',
      text: '回文从左往右和从右往左读完全相同。子串还要求字符连续。babad 中下标 0 和 2 的两个 b 可以组成子序列，却不能组成子串。力扣给出的字符串长度上限是 1000，字符只包含数字和英文字母。',
    },
    { type: 'heading', text: '从最慢的做法开始' },
    {
      type: 'paragraph',
      text: '长度为 n 的字符串一共有 n(n + 1) / 2 个子串。枚举每个子串需要平方级次数，再用双指针检查一次回文，单次最多扫描 n 个字符，总时间会到 O(n³)。重复工作出现在回文检查上，相邻子串会反复比较同一批字符。',
    },
    { type: 'heading', text: '枚举回文中心' },
    {
      type: 'paragraph',
      text: '回文有明确的对称中心。选定中心以后，只要左右字符相同就继续向外扩展，第一次越界或字符不同便停止。这次扩展已经得到以该位置为中心的最长回文，不需要再枚举它的所有左右边界。',
    },
    { type: 'heading', text: '奇数中心和偶数中心都要试' },
    {
      type: 'list',
      items: [
        '奇数长度回文以一个字符为中心。处理下标 i 时，让 left 和 right 都从 i 开始。bab 的中心是 a。',
        '偶数长度回文以两个相邻字符之间的缝隙为中心。处理下标 i 时，让 left 从 i 开始，right 从 i + 1 开始。bb 的中心位于两个 b 之间。',
      ],
    },
    {
      type: 'paragraph',
      text: '字符串有 n 个字符中心和 n - 1 个字符间中心，总共 2n - 1 个。代码在每个下标调用两次扩展函数，最后一个下标的偶数扩展会立刻碰到右边界，不需要单独写分支。',
    },
    getAlgorithmVisual('5'),
    { type: 'heading', text: '用 babad 手算一遍' },
    {
      type: 'paragraph',
      text: 'i 等于 0 时，奇数扩展得到 b，偶数扩展因为 b 和 a 不同而停止。i 等于 1 时，以 a 为中心先得到 a，再比较下标 0 和 2 的两个 b，得到 bab，最优区间更新成 [0, 2]。i 等于 2 时还能得到 aba，长度同样是 3。更新条件使用严格大于，所以等长结果不会覆盖已有答案，最终稳定返回 bab。',
    },
    { type: 'heading', text: 'Java 实现' },
    {
      type: 'code',
      language: 'java',
      text: `String longestPalindrome(String s) {
    if (s == null || s.length() < 2) return s;

    int bestStart = 0;
    int bestEnd = 0;
    for (int center = 0; center < s.length(); center++) {
        int oddLength = expandLength(s, center, center);
        int evenLength = expandLength(s, center, center + 1);
        int currentLength = Math.max(oddLength, evenLength);

        int bestLength = bestEnd - bestStart + 1;
        if (currentLength > bestLength) {
            bestStart = center - (currentLength - 1) / 2;
            bestEnd = center + currentLength / 2;
        }
    }
    return s.substring(bestStart, bestEnd + 1);
}

int expandLength(String s, int left, int right) {
    while (left >= 0
            && right < s.length()
            && s.charAt(left) == s.charAt(right)) {
        left--;
        right++;
    }
    return right - left - 1;
}`,
    },
    { type: 'heading', text: '四个地方最容易写错' },
    {
      type: 'list',
      items: [
        '先判断 left 和 right 是否仍在范围内，再读取字符。Java 的 && 会从左向右短路，顺序反过来可能直接越界。',
        '循环退出时，left 和 right 已经各自多走一步。有效区间是 [left + 1, right - 1]，长度化简后等于 right - left - 1。',
        '新长度严格大于当前最优长度时才更新。这样遇到 bab 和 aba 这类并列答案时，返回结果保持稳定。',
        '起点使用 center - (length - 1) / 2，终点使用 center + length / 2。同一组整数公式可以同时处理奇数长度和偶数长度。',
      ],
    },
    { type: 'heading', text: '循环里始终守住的条件' },
    {
      type: 'paragraph',
      text: '扩展函数准备比较一对新字符时，[left + 1, right - 1] 已经确认是回文。当前两个字符相同，回文范围便扩大到 [left, right]，随后指针再向外移动。循环退出时，夹在两个指针之间的部分就是当前中心能得到的最大回文。外层循环结束一个中心时，[bestStart, bestEnd] 保存此前所有中心里最长的结果。',
    },
    { type: 'heading', text: '复杂度怎么算' },
    {
      type: 'paragraph',
      text: '中心一共有 2n - 1 个，每个中心最坏向两边扩展 O(n) 次，所以总时间是 O(n²)。算法只保存中心、左右边界和最优区间，除返回字符串外只用 O(1) 额外空间。',
    },
    { type: 'heading', text: '写完后这样验收' },
    {
      type: 'list',
      items: [
        '用 a 检查单字符和初始区间。',
        '用 cbbd 检查偶数中心，预期得到 bb。',
        '用 babad 检查奇数中心和并列最长结果。',
        '用 aaaa 检查能否连续扩展，以及边界停止后有没有少算一个字符。',
        '若业务输入可能为空，再补空串和 null。力扣原题保证至少有一个字符，防御代码仍可以保留。',
      ],
    },
    { type: 'heading', text: '面试追问怎样接' },
    {
      type: 'paragraph',
      text: '动态规划也能在 O(n²) 时间内解决，但需要 O(n²) 空间。中心扩展保留相同时间上界，只用常数空间，更适合先写。面试官继续要求线性时间时，再说明 Manacher 会利用当前最右回文边界和镜像位置的已知半径，减少重复比较。没有被要求现场实现时，先把中心扩展的边界和证明讲稳。',
    },
  ],
  references: [
    codeTopReference(9),
    {
      title: 'Flashield 的中心扩展法动画讲解',
      location: '奇偶中心、四个实现细节与 babad 逐步推演',
      href: 'https://www.bilibili.com/video/BV1gTu16BE1w',
    },
  ],
};

const mergeTwoLists = makeInterviewCard({
  rank: 10,
  id: '21',
  title: '合并两个有序链表',
  slug: 'merge-two-sorted-lists',
  difficulty: '简单',
  examines: '这道题检查虚拟头节点、有序合并和尾段处理。',
  clarify: '确认是否可以复用原节点，以及相等值的先后顺序是否有要求。通常允许重连原节点。',
  reasoning: '虚拟头节点让第一次连接与后续连接使用同一逻辑。每次取两个当前节点中较小的一个接到结果尾部，任一链表耗尽后直接连接另一条尾段。',
  code: `ListNode mergeTwoLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode();
    ListNode tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) {
            tail.next = a;
            a = a.next;
        } else {
            tail.next = b;
            b = b.next;
        }
        tail = tail.next;
    }
    tail.next = a != null ? a : b;
    return dummy.next;
}`,
  invariant: 'dummy 到 tail 始终是已经合并完成的有序前缀，a 与 b 分别指向两条未处理尾段的最小节点。',
  complexity: '时间复杂度 O(m + n)，额外空间 O(1)。',
  checks: [
    '测试两条空链表、一空一非空和包含相等值的链表。',
    '若最后几个节点丢失，检查循环结束后是否直接接上剩余尾段。',
    '若返回结果多一个哨兵节点，检查是否返回 dummy.next。',
  ],
  followUp: '合并 K 个有序链表可以用最小堆，也可以两两分治合并。归并排序链表会复用同一个合并函数。',
});

const numberOfIslands = makeInterviewCard({
  rank: 11,
  id: '200',
  title: '岛屿数量',
  slug: 'number-of-islands',
  difficulty: '中等',
  examines: '这道题检查网格建图、连通块遍历和访问标记时机。',
  clarify: '确认只有上下左右相邻才连通，并问清能否修改输入网格。允许修改时可以直接把访问过的陆地改成水。',
  reasoning: '每遇到一个尚未访问的陆地，就发现了一个新的连通块。随后用 DFS 或 BFS 把整个岛屿标记掉，保证同一块陆地不会重复计数。',
  code: `int numIslands(char[][] grid) {
    int answer = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[0].length; c++) {
            if (grid[r][c] == '1') {
                answer++;
                flood(grid, r, c);
            }
        }
    }
    return answer;
}

void flood(char[][] grid, int r, int c) {
    if (r < 0 || r == grid.length || c < 0 || c == grid[0].length || grid[r][c] != '1') return;
    grid[r][c] = '0';
    flood(grid, r - 1, c);
    flood(grid, r + 1, c);
    flood(grid, r, c - 1);
    flood(grid, r, c + 1);
}`,
  invariant: '外层扫描到当前位置时，之前发现的每个岛屿都已被完整标记，当前值为 1 才会启动新的连通块遍历。',
  complexity: '每个格子最多处理一次，时间复杂度 O(mn)。递归栈最坏 O(mn)，大网格可改成显式队列。',
  checks: [
    '测试全水、全陆地、对角接触和只有一个格子的网格。',
    '若重复计数，检查是否在进入邻居前就完成访问标记。',
    '若大输入栈溢出，将 DFS 改成 ArrayDeque 驱动的 BFS 或显式栈。',
  ],
  followUp: '求最大岛屿面积时让遍历返回访问格子数。动态加陆地并实时查询岛屿数量时，更适合使用并查集。',
});

const levelOrder = makeInterviewCard({
  rank: 12,
  id: '102',
  title: '二叉树的层序遍历',
  slug: 'binary-tree-level-order-traversal',
  difficulty: '中等',
  examines: '这道题检查 BFS 队列、分层边界和空树处理。',
  clarify: '确认返回值需要按层分组，不要返回一个连续序列。空树应返回空列表。',
  reasoning: '队列保存下一批等待访问的节点。每轮开始时固定当前队列长度，这个长度就是本层节点数。本层扩展出的子节点留在队列中，交给下一轮处理。',
  code: `List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> answer = new ArrayList<>();
    if (root == null) return answer;
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.addLast(root);
    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.removeFirst();
            level.add(node.val);
            if (node.left != null) queue.addLast(node.left);
            if (node.right != null) queue.addLast(node.right);
        }
        answer.add(level);
    }
    return answer;
}`,
  invariant: '每轮开始时队列前 size 个节点恰好属于同一层，本轮新加入的节点都属于下一层。',
  complexity: '时间复杂度 O(n)，队列最坏占用 O(w)，w 是树的最大宽度。',
  checks: [
    '测试空树、单节点和只有单侧子树的结构。',
    '若层级混在一起，检查 size 是否在处理本层之前固定。',
    'ArrayDeque 不接受 null，入队前必须判断子节点是否存在。',
  ],
  followUp: '锯齿形层序只改变每层写入顺序。右视图可以保留每层最后一个节点，无需保存完整层结果。',
});

const searchRotated = makeInterviewCard({
  rank: 13,
  id: '33',
  title: '搜索旋转排序数组',
  slug: 'search-in-rotated-sorted-array',
  difficulty: '中等',
  examines: '这道题检查二分循环中如何利用局部有序性排除一半区间。',
  clarify: '确认数组原本严格递增且元素互不相同。若允许重复值，判断哪一半有序时会出现无法确定的情况。',
  reasoning: '线性扫描是 O(n) 基线。旋转后任意一次取中点，左右两半至少有一半保持有序。先判断有序的一侧，再看 target 是否落在它的值域内，由此排除另一半。',
  code: `int search(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}`,
  invariant: '若 target 存在，它始终位于当前闭区间 [left, right] 中，每轮至少排除不可能的一半。',
  complexity: '时间复杂度 O(log n)，额外空间 O(1)。',
  checks: [
    '测试未旋转数组、旋转点在两端、单元素和目标不存在。',
    '若漏掉边界值，检查有序区间的比较是否一边包含等号、另一边不包含。',
    '若数组允许重复值且左右中值相等，需要收缩边界，最坏复杂度会退化为 O(n)。',
  ],
  followUp: '寻找旋转数组最小值使用同样的局部有序性。面试中要先讲清有无重复值，因为它会改变最坏复杂度。',
});

const twoSum = makeInterviewCard({
  rank: 14,
  id: '1',
  title: '两数之和',
  slug: 'two-sum',
  difficulty: '简单',
  examines: '这道题检查哈希映射、一次遍历和重复值处理。',
  clarify: '确认返回下标还是数值，是否保证恰好一个答案，以及同一个位置不能使用两次。',
  reasoning: '双重循环需要 O(n²)。遍历到 nums[i] 时，答案只可能来自之前出现过的 target - nums[i]。先查询补数，再把当前值写入映射，可以自然避免使用同一位置两次。',
  code: `int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> indexByValue = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (indexByValue.containsKey(need)) {
            return new int[] { indexByValue.get(need), i };
        }
        indexByValue.put(nums[i], i);
    }
    return new int[0];
}`,
  invariant: '处理下标 i 前，映射中只保存 [0, i) 的值及其位置，因此命中补数时两个下标一定不同。',
  complexity: '期望时间复杂度 O(n)，空间复杂度 O(n)。',
  checks: [
    '测试两个相同值组成答案、负数和答案位于数组两端。',
    '若同一元素被使用两次，检查是否在查询补数之前写入了当前值。',
    '若题目不保证有解，提前与面试官约定返回空数组还是抛出异常。',
  ],
  followUp: '数组有序时可以用双指针并把空间降到 O(1)。若要返回所有不重复组合，还要明确按下标去重还是按数值去重。',
});

const mergeSortedArray = makeInterviewCard({
  rank: 15,
  id: '88',
  title: '合并两个有序数组',
  slug: 'merge-sorted-array',
  difficulty: '简单',
  examines: '这道题检查原地写入、从后向前合并和有效长度边界。',
  clarify: '确认 nums1 尾部已经预留 m + n 的容量，m 与 n 表示有效元素数量，预留位置中的零不属于原数据。',
  reasoning: '从前向后写会覆盖 nums1 尚未读取的元素。改为从末尾选择两个数组当前较大的值，写入 nums1 的最后一个空位，覆盖风险自然消失。',
  code: `void merge(int[] nums1, int m, int[] nums2, int n) {
    int i = m - 1;
    int j = n - 1;
    int write = m + n - 1;
    while (j >= 0) {
        if (i >= 0 && nums1[i] > nums2[j]) nums1[write--] = nums1[i--];
        else nums1[write--] = nums2[j--];
    }
}`,
  invariant: '区间 (write, m + n) 始终是已经放好的最大元素后缀，i 和 j 指向各自未处理部分的最大值。',
  complexity: '时间复杂度 O(m + n)，额外空间 O(1)。',
  checks: [
    '测试 m 为零、n 为零，以及 nums2 的全部元素都更小。',
    '若 nums1 中原值被覆盖，检查写指针是否从尾部开始。',
    '循环只需保证 nums2 被耗尽，nums1 剩余元素本来就在正确位置。',
  ],
  followUp: '若两个数组都不能修改，需要新的结果数组。合并多个有序数组时可以使用最小堆或分治。',
});

const permutations = makeInterviewCard({
  rank: 16,
  id: '46',
  title: '全排列',
  slug: 'permutations',
  difficulty: '中等',
  examines: '这道题检查回溯中的路径、选择、撤销和结果快照。',
  clarify: '确认输入元素互不相同。若存在重复值，题目会多出同层去重要求。',
  reasoning: '递归深度表示正在填写答案的第几个位置。每层尝试所有尚未使用的元素，加入路径后进入下一层，返回时恢复 used 和路径。路径长度达到 n 时必须复制一份结果。',
  code: `List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> answer = new ArrayList<>();
    backtrack(nums, new boolean[nums.length], new ArrayList<>(), answer);
    return answer;
}

void backtrack(int[] nums, boolean[] used, List<Integer> path,
               List<List<Integer>> answer) {
    if (path.size() == nums.length) {
        answer.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);
        backtrack(nums, used, path, answer);
        path.remove(path.size() - 1);
        used[i] = false;
    }
}`,
  invariant: 'path 中恰好保存当前递归分支已经选择的元素，used 与 path 保持一一对应。',
  complexity: '需要生成 n! 个结果，时间复杂度 O(n × n!)，递归与状态空间 O(n)，不计答案。',
  checks: [
    '测试空数组、单元素和三个元素，确认结果数量分别符合定义。',
    '若所有答案最后都相同，检查加入结果时是否复制了 path。',
    '若少结果或重复使用元素，检查每次递归返回后是否对称恢复 used 和 path。',
  ],
  followUp: '输入含重复值时先排序，同一层跳过与前一元素相同且前一元素尚未被当前路径使用的选择。',
});

const validParentheses = makeInterviewCard({
  rank: 17,
  id: '20',
  title: '有效的括号',
  slug: 'valid-parentheses',
  difficulty: '简单',
  examines: '这道题检查栈、配对关系和结束状态。',
  clarify: '确认输入只包含三类括号。空串通常有效，任何右括号都必须与最近尚未闭合的左括号匹配。',
  reasoning: '左括号入栈。遇到右括号时，它只能与栈顶配对，因为更早的左括号必须等待内层括号先闭合。可以直接把期望的右括号压栈，让比较逻辑更短。',
  code: `boolean isValid(String s) {
    Deque<Character> expected = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(') expected.push(')');
        else if (c == '[') expected.push(']');
        else if (c == '{') expected.push('}');
        else if (expected.isEmpty() || expected.pop() != c) return false;
    }
    return expected.isEmpty();
}`,
  invariant: '栈从顶到底保存尚未闭合括号按关闭顺序对应的期望字符。',
  complexity: '时间复杂度 O(n)，最坏空间 O(n)。',
  checks: [
    '测试空串、单个右括号、交叉括号和未闭合的左括号。',
    '若代码在右括号处抛异常，检查弹栈前是否判断为空。',
    '若遍历结束后错误返回 true，检查是否验证栈已经清空。',
  ],
  followUp: '带普通字符的表达式可以忽略非括号字符。要求最长有效括号时需要动态规划或下标栈，问题已经改变。',
});

const bestStockProfit = makeInterviewCard({
  rank: 18,
  id: '121',
  title: '买卖股票的最佳时机',
  slug: 'best-time-to-buy-and-sell-stock',
  difficulty: '简单',
  examines: '这道题检查一次遍历中的历史最值，以及交易顺序约束。',
  clarify: '确认只能完成一次购入和一次出售，并且购入必须更早。允许不交易时，最低收益为零。',
  reasoning: '枚举两个交易日需要 O(n²)。遍历到出售日时，最优购入价只可能是此前出现过的最低价格。维护历史最低价，就能常数时间计算当天出售的收益。',
  code: `int maxProfit(int[] prices) {
    int minPrice = Integer.MAX_VALUE;
    int answer = 0;
    for (int price : prices) {
        minPrice = Math.min(minPrice, price);
        answer = Math.max(answer, price - minPrice);
    }
    return answer;
}`,
  invariant: '处理当天价格后，minPrice 是截至当天的最低价格，answer 是截至当天可完成的一次交易最大收益。',
  complexity: '时间复杂度 O(n)，额外空间 O(1)。',
  checks: [
    '测试持续下跌、单日价格和最低价出现在最后一天。',
    '若得到负收益，检查 answer 是否从零开始并允许不交易。',
    '若交易顺序错误，检查 minPrice 是否只来自当前及之前的位置。',
  ],
  followUp: '允许多次交易时累加所有正相邻差。加入冷冻期、手续费或交易次数限制后，需要明确动态规划状态。',
});

const longestIncreasingSubsequence = makeInterviewCard({
  rank: 19,
  id: '300',
  title: '最长递增子序列',
  slug: 'longest-increasing-subsequence',
  difficulty: '中等',
  examines: '这道题检查序列动态规划，以及用最小结尾值优化状态。',
  clarify: '确认子序列可以不连续，并且严格递增。相等元素不能延长长度。',
  reasoning: '定义 dp[i] 为以 i 结尾的最长长度可得到 O(n²) 基线。进一步维护 tails[len]，表示长度为 len + 1 的递增子序列最小结尾值。新值用二分替换第一个大于等于它的位置。',
  code: `int lengthOfLIS(int[] nums) {
    int[] tails = new int[nums.length];
    int size = 0;
    for (int value : nums) {
        int left = 0, right = size;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (tails[mid] < value) left = mid + 1;
            else right = mid;
        }
        tails[left] = value;
        if (left == size) size++;
    }
    return size;
}`,
  invariant: 'tails 的有效区间严格递增，tails[i] 是当前已知长度 i + 1 的递增子序列中最小的结尾值。',
  complexity: '时间复杂度 O(n log n)，空间复杂度 O(n)。',
  checks: [
    '测试严格递减、全部相等和包含重复值的序列。',
    '若相等元素错误地延长长度，检查二分是否寻找第一个大于等于 value 的位置。',
    'tails 只保证最小结尾值，不能直接当成一条真实的最长子序列返回。',
  ],
  followUp: '若要恢复具体序列，需要保存每个位置的前驱和对应长度的末尾下标。最长不下降子序列要把二分条件改成第一个大于 value。',
});

const reverseBetween = makeInterviewCard({
  rank: 20,
  id: '92',
  title: '反转链表 II',
  slug: 'reverse-linked-list-ii',
  difficulty: '中等',
  examines: '这道题检查区间定位、虚拟头节点和局部头插。',
  clarify: '确认 left 与 right 从一开始计数，并且区间合法。要求一次遍历时不能先复制节点值。',
  reasoning: '虚拟头节点让 left 等于一时仍有区间前驱。找到 prev 后，curr 固定为反转段的新尾。每轮把 curr 后面的节点摘下并插到 prev 后面，重复 right - left 次。',
  code: `ListNode reverseBetween(ListNode head, int left, int right) {
    ListNode dummy = new ListNode(0, head);
    ListNode prev = dummy;
    for (int i = 1; i < left; i++) prev = prev.next;
    ListNode curr = prev.next;
    for (int i = 0; i < right - left; i++) {
        ListNode moved = curr.next;
        curr.next = moved.next;
        moved.next = prev.next;
        prev.next = moved;
    }
    return dummy.next;
}`,
  invariant: 'prev 不动并指向区间前驱，curr 始终是已反转区间的尾节点，curr.next 是下一次要前插的节点。',
  complexity: '时间复杂度 O(n)，额外空间 O(1)。',
  checks: [
    '测试 left 等于 right、left 等于一，以及 right 位于链表末尾。',
    '若区间后半段丢失，检查摘出 moved 后是否先让 curr.next 接回剩余链表。',
    '若头节点没有变化，检查是否使用 dummy 统一处理 left 等于一。',
  ],
  followUp: 'K 个一组反转会重复使用局部反转，但每轮开始前必须先确认剩余节点够一组。',
});

const zigzagLevelOrder = makeInterviewCard({
  rank: 21,
  id: '103',
  title: '二叉树的锯齿形层序遍历',
  slug: 'binary-tree-zigzag-level-order-traversal',
  difficulty: '中等',
  examines: '这道题检查层序遍历与输出顺序的分离。',
  clarify: '确认遍历仍按从上到下逐层进行，只是相邻层的输出方向交替变化。',
  reasoning: '队列扩展节点的顺序保持不变，避免破坏下一层结构。每层预先创建固定长度列表，根据方向把当前值写入 i 或 size - 1 - i。',
  code: `List<List<Integer>> zigzagLevelOrder(TreeNode root) {
    List<List<Integer>> answer = new ArrayList<>();
    if (root == null) return answer;
    Deque<TreeNode> queue = new ArrayDeque<>();
    queue.addLast(root);
    boolean leftToRight = true;
    while (!queue.isEmpty()) {
        int size = queue.size();
        List<Integer> level = new ArrayList<>(Collections.nCopies(size, 0));
        for (int i = 0; i < size; i++) {
            TreeNode node = queue.removeFirst();
            level.set(leftToRight ? i : size - 1 - i, node.val);
            if (node.left != null) queue.addLast(node.left);
            if (node.right != null) queue.addLast(node.right);
        }
        answer.add(level);
        leftToRight = !leftToRight;
    }
    return answer;
}`,
  invariant: '队列始终按正常层序保存节点，方向标记只决定本层结果的写入位置。',
  complexity: '时间复杂度 O(n)，队列和结果之外的辅助空间为 O(w)。',
  checks: [
    '测试空树、单节点和三层完全二叉树。',
    '若第三层方向错误，检查方向标记是否在整层结束后才翻转。',
    '若下一层节点顺序错乱，检查是否错误地根据输出方向改变了子节点入队顺序。',
  ],
  followUp: '也可以用双端队列保存本层结果。面试中应说明输出反向与遍历反向是两件事，前者更容易写稳。',
});

const lowestCommonAncestor = makeInterviewCard({
  rank: 22,
  id: '236',
  title: '二叉树的最近公共祖先',
  slug: 'lowest-common-ancestor-of-a-binary-tree',
  difficulty: '中等',
  examines: '这道题检查递归返回值定义，以及左右子树结果怎样在当前节点汇合。',
  clarify: '确认 p 与 q 都存在于树中，节点值是否唯一，并说明这里是普通二叉树，不使用二叉搜索树的有序性。',
  reasoning: '定义递归返回当前子树中找到的 p、q 或它们的公共祖先。当前节点命中任一目标时直接返回。左右都返回非空，说明两个目标分居两侧，当前节点就是最近公共祖先。',
  code: `TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);
    if (left != null && right != null) return root;
    return left != null ? left : right;
}`,
  invariant: '递归返回值只表示三种情况，当前子树未找到目标、找到一个目标、已经找到两个目标的最近公共祖先。',
  complexity: '每个节点最多访问一次，时间复杂度 O(n)，递归栈 O(h)。',
  checks: [
    '测试两个目标分居根的两侧、一个目标是另一个的祖先，以及深度不相同。',
    '若祖先关系返回错误，检查命中 p 或 q 时是否直接返回当前节点。',
    '若题目不保证两个节点都存在，需要额外统计命中数量，当前简洁写法无法验证缺失节点。',
  ],
  followUp: '二叉搜索树可以按值选择单侧递归。若同一棵树上有大量查询，可预处理深度和倍增祖先表。',
});

const mergeKLists = makeInterviewCard({
  rank: 23,
  id: '23',
  title: '合并 K 个有序链表',
  slug: 'merge-k-sorted-lists',
  difficulty: '困难',
  examines: '这道题检查最小堆、K 路归并和比较器安全。',
  clarify: '确认可以复用原节点，链表数组可能为空或包含 null，总节点数记为 N。',
  reasoning: '每次从 K 个当前头节点中选择最小值。线性查找需要 O(NK)，最小堆把选择成本降到 O(log K)。弹出节点后，只把它的下一个节点加入堆。',
  code: `ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>(
        Comparator.comparingInt(node -> node.val));
    for (ListNode head : lists) {
        if (head != null) heap.offer(head);
    }
    ListNode dummy = new ListNode();
    ListNode tail = dummy;
    while (!heap.isEmpty()) {
        ListNode node = heap.poll();
        tail.next = node;
        tail = node;
        if (node.next != null) heap.offer(node.next);
    }
    return dummy.next;
}`,
  invariant: '堆中最多保存每条尚未耗尽链表的当前最小节点，堆顶是所有未处理节点中的全局最小值。',
  complexity: '时间复杂度 O(N log K)，堆空间 O(K)。分治两两合并也能达到同样时间复杂度。',
  checks: [
    '测试空数组、全部为 null、只有一条链表和多条含重复值的链表。',
    '若节点丢失，检查弹出节点后是否把它的 next 加入堆。',
    '比较器不要用 a.val - b.val，极端整数可能溢出。',
  ],
  followUp: '链表数量很大但很多为空时，堆只放非空头节点。若需要并行处理，可以先分组归并，再合并各组结果。',
});

const spiralOrder = makeInterviewCard({
  rank: 24,
  id: '54',
  title: '螺旋矩阵',
  slug: 'spiral-matrix',
  difficulty: '中等',
  examines: '这道题检查四个边界的收缩顺序，以及剩余单行单列的处理。',
  clarify: '确认矩阵至少是一行一列，返回顺时针遍历结果。矩阵可以是长方形。',
  reasoning: '维护尚未访问矩形的 top、bottom、left、right。依次遍历上边、右边、下边和左边，每走完一条边就向内收缩。进入下边和左边前要重新检查矩形是否仍存在。',
  code: `List<Integer> spiralOrder(int[][] matrix) {
    List<Integer> answer = new ArrayList<>();
    int top = 0, bottom = matrix.length - 1;
    int left = 0, right = matrix[0].length - 1;
    while (top <= bottom && left <= right) {
        for (int c = left; c <= right; c++) answer.add(matrix[top][c]);
        top++;
        for (int r = top; r <= bottom; r++) answer.add(matrix[r][right]);
        right--;
        if (top <= bottom) {
            for (int c = right; c >= left; c--) answer.add(matrix[bottom][c]);
            bottom--;
        }
        if (left <= right) {
            for (int r = bottom; r >= top; r--) answer.add(matrix[r][left]);
            left++;
        }
    }
    return answer;
}`,
  invariant: '边界内的矩形恰好是未访问区域，每完成一条边后立即把对应边界向内移动。',
  complexity: '每个元素访问一次，时间复杂度 O(mn)，除结果外额外空间 O(1)。',
  checks: [
    '测试单行、单列、两行和非方阵。',
    '若中心元素重复，检查遍历下边和左边前是否重新判断边界。',
    '若漏掉最后一行或一列，逐条写出边界收缩发生在遍历之前还是之后。',
  ],
  followUp: '按顺时针生成矩阵时使用相同边界，只是把读取改成写入。也可以用方向数组和访问标记，但空间更多。',
});

const reorderList = makeInterviewCard({
  rank: 25,
  id: '143',
  title: '重排链表',
  slug: 'reorder-list',
  difficulty: '中等',
  examines: '这道题检查链表找中点、反转和交替合并三种基本操作的组合。',
  clarify: '确认需要原地重排节点，顺序为首、尾、次首、次尾，不能只把节点值复制到数组后改值。',
  reasoning: '先用快慢指针把链表切成两半，再反转后半段。最后让两个指针分别从前半段和反转后的后半段出发，交替连接。切断前半段尾部可以避免旧链接形成环。',
  code: `void reorderList(ListNode head) {
    if (head == null || head.next == null) return;
    ListNode slow = head, fast = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    ListNode second = reverseForReorder(slow.next);
    slow.next = null;

    ListNode first = head;
    while (second != null) {
        ListNode nextFirst = first.next;
        ListNode nextSecond = second.next;
        first.next = second;
        second.next = nextFirst;
        first = nextFirst;
        second = nextSecond;
    }
}

ListNode reverseForReorder(ListNode head) {
    ListNode prev = null;
    while (head != null) {
        ListNode next = head.next;
        head.next = prev;
        prev = head;
        head = next;
    }
    return prev;
}`,
  invariant: '合并阶段开始时，first 和 second 分别指向两段尚未写入的首节点，已经连接的前缀顺序正确且不会回到旧链。',
  complexity: '三次线性操作的总时间复杂度 O(n)，额外空间 O(1)。',
  checks: [
    '测试两个节点、奇数长度和偶数长度。',
    '若出现环，检查找到中点后是否执行 slow.next = null。',
    '若中间节点丢失，检查奇偶长度下 slow 的停留位置和合并循环条件。',
  ],
  followUp: '回文链表也会复用找中点和反转后半段，比较完成后还可以恢复原链表结构。',
});

const linkedListCycle = makeInterviewCard({
  rank: 26,
  id: '141',
  title: '环形链表',
  slug: 'linked-list-cycle',
  difficulty: '简单',
  examines: '这道题检查快慢指针和安全的循环条件。',
  clarify: '确认只能通过节点引用判断是否成环，不能依赖节点值。通常要求 O(1) 额外空间。',
  reasoning: '哈希集合可以记录访问过的节点，空间为 O(n)。快指针每次走两步，慢指针每次走一步。有环时快指针会在环内追上慢指针，无环时快指针先到 null。',
  code: `boolean hasCycle(ListNode head) {
    ListNode slow = head;
    ListNode fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}`,
  invariant: '每轮结束后，fast 比 slow 多走一步；进入环后两者距离会在有限轮次内归零。',
  complexity: '时间复杂度 O(n)，额外空间 O(1)。',
  checks: [
    '测试空链表、单节点无环、单节点自环和环入口位于中间。',
    '若访问 fast.next.next 时异常，检查循环条件是否先验证 fast 和 fast.next。',
    '比较节点身份要使用引用相等，节点值相等不能说明进入同一位置。',
  ],
  followUp: '寻找环入口时，相遇后让一个指针回到头节点，两者再同速前进，下一次相遇点就是入口。',
});

const mergeIntervals = makeInterviewCard({
  rank: 27,
  id: '56',
  title: '合并区间',
  slug: 'merge-intervals',
  difficulty: '中等',
  examines: '这道题检查排序键、区间边界语义和扫描合并。',
  clarify: '确认区间端点是否闭合。闭区间 [1, 4] 与 [4, 5] 需要合并，左闭右开语义会得到不同结论。',
  reasoning: '先按起点升序排列。结果中的最后一个区间保存当前已经合并的范围。新区间起点不超过当前右端时，只需扩展右端；否则开始一个新结果区间。',
  code: `int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
    List<int[]> merged = new ArrayList<>();
    for (int[] interval : intervals) {
        if (merged.isEmpty() || interval[0] > merged.get(merged.size() - 1)[1]) {
            merged.add(new int[] { interval[0], interval[1] });
        } else {
            int[] last = merged.get(merged.size() - 1);
            last[1] = Math.max(last[1], interval[1]);
        }
    }
    return merged.toArray(new int[merged.size()][]);
}`,
  invariant: '结果列表始终按起点有序且互不重叠，最后一个区间包含已经扫描部分中最右侧的连续覆盖范围。',
  complexity: '排序占 O(n log n) 时间，扫描 O(n)，结果之外的额外空间取决于排序实现。',
  checks: [
    '测试空数组、完全包含、首尾相接和完全不重叠。',
    '若嵌套区间让右端变小，检查合并时是否取 max。',
    '若相邻区间是否合并与预期不符，回到题目确认闭区间或左闭右开语义。',
  ],
  followUp: '插入一个新区间可以先复制结束更早的区间，再合并重叠段，最后复制剩余部分。会议室问题会把区间转成开始和结束事件。',
});

const addStrings = makeInterviewCard({
  rank: 28,
  id: '415',
  title: '字符串相加',
  slug: 'add-strings',
  difficulty: '简单',
  examines: '这道题检查竖式加法、进位和不同长度字符串的边界。',
  clarify: '确认输入是非负整数字符串，不能直接转换成大整数类型，结果是否需要保留前导零。',
  reasoning: '从两个字符串末尾开始逐位相加。任一字符串仍有数字或 carry 不为零时继续循环，把 sum % 10 追加到 StringBuilder，最后整体反转。',
  code: `String addStrings(String a, String b) {
    int i = a.length() - 1;
    int j = b.length() - 1;
    int carry = 0;
    StringBuilder reversed = new StringBuilder();
    while (i >= 0 || j >= 0 || carry != 0) {
        int x = i >= 0 ? a.charAt(i--) - '0' : 0;
        int y = j >= 0 ? b.charAt(j--) - '0' : 0;
        int sum = x + y + carry;
        reversed.append(sum % 10);
        carry = sum / 10;
    }
    return reversed.reverse().toString();
}`,
  invariant: '每轮开始时，carry 是较低位相加后传给当前位的进位，结果缓冲区保存已经完成的低位并保持逆序。',
  complexity: '时间复杂度 O(max(m, n))，结果缓冲区空间 O(max(m, n))。',
  checks: [
    '测试零、不同长度和最高位产生新进位的 999 + 1。',
    '若最高位少一位，检查循环条件是否包含 carry 不为零。',
    '若字符被当成 ASCII 数值直接相加，检查是否减去字符零。',
  ],
  followUp: '字符串相乘会把第 i、j 位的乘积累加到结果数组 i + j 和 i + j + 1 的位置，再统一处理进位。',
});

const editDistance = makeInterviewCard({
  rank: 29,
  id: '72',
  title: '编辑距离',
  slug: 'edit-distance',
  difficulty: '困难',
  examines: '这道题检查二维动态规划状态、空前缀初始化和三种操作的统一表达。',
  clarify: '确认允许插入、删除和替换，每次代价为一。状态表示两个字符串前缀之间的编辑距离。',
  reasoning: '定义 dp[i][j] 为 word1 前 i 个字符转换成 word2 前 j 个字符的最少操作。尾字符相等时继承 dp[i - 1][j - 1]，否则在删除、插入、替换三种前驱中取最小值再加一。',
  code: `int minDistance(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
    for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
    for (int i = 1; i <= a.length(); i++) {
        for (int j = 1; j <= b.length(); j++) {
            if (a.charAt(i - 1) == b.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1],
                    Math.min(dp[i - 1][j], dp[i][j - 1]));
            }
        }
    }
    return dp[a.length()][b.length()];
}`,
  invariant: '计算 dp[i][j] 时，它依赖的左、上和左上状态都已经完成，并且每个状态只描述两个确定前缀。',
  complexity: '时间复杂度 O(mn)，空间复杂度 O(mn)，只求距离时可压缩到 O(n)。',
  checks: [
    '测试两个空串、一个空串、完全相同和只差一次替换。',
    '若空串结果错误，检查第一行和第一列是否按前缀长度初始化。',
    '若插入与删除方向混乱，重新写出 dp[i][j] 的完整中文含义，再对应三个前驱。',
  ],
  followUp: '若三种操作代价不同，只需给对应转移加不同成本。恢复具体编辑步骤需要从 dp[m][n] 反向追踪前驱。',
});

const intersectionNode = makeInterviewCard({
  rank: 30,
  id: '160',
  title: '相交链表',
  slug: 'intersection-of-two-linked-lists',
  difficulty: '简单',
  examines: '这道题检查双指针路程对齐，以及节点身份与节点值的区别。',
  clarify: '确认相交指的是两个链表从某个节点开始共享同一批节点对象，链表无环，并要求保持原结构。',
  reasoning: '两个指针分别走完自己的链表后切换到另一条链表。它们都走过长度 a + b，长度差被自动抵消。若有交点会同时到达交点，无交点会同时变成 null。',
  code: `ListNode getIntersectionNode(ListNode headA, ListNode headB) {
    ListNode a = headA;
    ListNode b = headB;
    while (a != b) {
        a = a == null ? headB : a.next;
        b = b == null ? headA : b.next;
    }
    return a;
}`,
  invariant: '两个指针切换链表后走过的总路程相同，任何原始长度差都会在第二段被补齐。',
  complexity: '时间复杂度 O(m + n)，额外空间 O(1)。',
  checks: [
    '测试头节点就是交点、尾节点交汇、完全不相交和任一头节点为 null。',
    '若相同值被误判为交点，检查比较的是节点引用。',
    '若循环无法结束，检查指针到 null 后是否切换到另一条链表的头部。',
  ],
  followUp: '也可以先计算长度差，让长链表先走差值。若链表可能有环，需要先判断各自环入口，再分类讨论。',
});

const trappingRainWater = makeInterviewCard({
  rank: 31,
  id: '42',
  title: '接雨水',
  slug: 'trapping-rain-water',
  difficulty: '困难',
  examines: '这道补洞题训练双指针中由较短边决定局部答案的证明。',
  clarify: '确认柱宽为一、高度非负，返回总蓄水量。少于三根柱子时结果为零。',
  reasoning: '对位置 i，水位由左侧最高值和右侧最高值的较小者决定。双指针维护 leftMax 与 rightMax。当左侧最高值更小时，当前 left 的水量已经可以确定，右侧未来变化不会再限制它。',
  code: `int trap(int[] height) {
    int left = 0, right = height.length - 1;
    int leftMax = 0, rightMax = 0;
    int answer = 0;
    while (left < right) {
        leftMax = Math.max(leftMax, height[left]);
        rightMax = Math.max(rightMax, height[right]);
        if (leftMax <= rightMax) {
            answer += leftMax - height[left++];
        } else {
            answer += rightMax - height[right--];
        }
    }
    return answer;
}`,
  invariant: '移动某一侧时，该侧历史最高值不高于另一侧已知最高值，因此当前位置水位已经确定。',
  complexity: '时间复杂度 O(n)，额外空间 O(1)。前后缀最大值方案需要 O(n) 空间。',
  checks: [
    '测试空数组、单调递增、单调递减和中间有多个凹槽。',
    '若出现负水量，检查是否先更新对应侧最大值再计算差。',
    '若移动了较高一侧，重新说明当前水位由哪一边的较小上界决定。',
  ],
  followUp: '单调栈也能在遇到更高柱子时结算横向水层。二维接雨水需要从边界启动最小堆。',
});

const binarySearch = makeInterviewCard({
  rank: 41,
  id: '704',
  title: '二分查找',
  slug: 'binary-search',
  difficulty: '简单',
  examines: '这道补洞题训练统一的闭区间模板和边界更新。',
  clarify: '确认数组按升序排列且元素互不相同，目标不存在时返回负一。若要找第一个目标位置，循环条件和更新方式会改变。',
  reasoning: '使用闭区间 [left, right]。mid 命中就返回，目标更小时排除 mid 及其右侧，目标更大时排除 mid 及其左侧。循环退出时区间为空。',
  code: `int binarySearch(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
  invariant: '若 target 存在，它始终位于当前闭区间内，更新边界时已经检查过的 mid 必须被排除。',
  complexity: '时间复杂度 O(log n)，额外空间 O(1)。',
  checks: [
    '测试空数组、单元素、目标位于两端和目标不存在。',
    '若循环卡住，检查更新是否使用 mid 加一或减一。',
    '若边界漏查，检查闭区间模板是否配套使用 left <= right。',
  ],
  followUp: '寻找第一个大于等于 target 的位置时使用左闭右开区间 [left, right)，命中也继续收缩右边界。',
});

const slidingWindowMaximum = makeInterviewCard({
  rank: 42,
  id: '239',
  title: '滑动窗口最大值',
  slug: 'sliding-window-maximum',
  difficulty: '困难',
  examines: '这道补洞题训练单调双端队列，以及为什么队列必须保存下标。',
  clarify: '确认窗口长度 k 合法，每移动一步都要输出当前最大值。重复的最大值需要正确保留到它离开窗口。',
  reasoning: '普通窗口每次扫描最大值需要 O(nk)。双端队列保存仍可能成为未来最大值的下标，值从队首到队尾单调递减。新值进入时删除尾部不大于它的候选，队首离开窗口时再删除。',
  code: `int[] maxSlidingWindow(int[] nums, int k) {
    int[] answer = new int[nums.length - k + 1];
    Deque<Integer> deque = new ArrayDeque<>();
    for (int right = 0; right < nums.length; right++) {
        while (!deque.isEmpty() && deque.peekFirst() <= right - k) deque.removeFirst();
        while (!deque.isEmpty() && nums[deque.peekLast()] <= nums[right]) deque.removeLast();
        deque.addLast(right);
        if (right >= k - 1) answer[right - k + 1] = nums[deque.peekFirst()];
    }
    return answer;
}`,
  invariant: '队列中的下标始终位于当前窗口内，对应值严格递减，队首因此是窗口最大值。',
  complexity: '每个下标最多入队和出队一次，时间复杂度 O(n)，队列空间 O(k)。',
  checks: [
    '测试 k 等于一、k 等于数组长度、严格递增和包含重复最大值。',
    '若过期最大值仍被使用，检查是否在输出前删除下标小于等于 right - k 的队首。',
    '若只存数值，遇到重复值时无法判断哪一个已经离开窗口，应改存下标。',
  ],
  followUp: '窗口最小值只需反转单调方向。连续数据流可以维护同样的队列，并在每次新数据到来后输出。',
});

const minimumWindowSubstring = makeInterviewCard({
  rank: 50,
  id: '76',
  title: '最小覆盖子串',
  slug: 'minimum-window-substring',
  difficulty: '困难',
  examines: '这道补洞题训练带需求计数的可变窗口，以及收缩时的状态恢复。',
  clarify: '确认覆盖需要满足字符出现次数，不只判断字符种类。若不存在覆盖窗口返回空串，并问清字符集范围。',
  reasoning: 'need 保存窗口仍欠缺的字符数量，missing 保存总欠缺数。右端加入字符时减少欠缺，missing 归零后左端持续收缩并更新最短答案。移出一个必要字符后，窗口重新变为不可行。',
  code: `String minWindow(String s, String t) {
    if (t.isEmpty()) return "";
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int missing = t.length();
    int left = 0, bestStart = 0, bestLength = Integer.MAX_VALUE;
    for (int right = 0; right < s.length(); right++) {
        char added = s.charAt(right);
        if (need[added] > 0) missing--;
        need[added]--;
        while (missing == 0) {
            if (right - left + 1 < bestLength) {
                bestStart = left;
                bestLength = right - left + 1;
            }
            char removed = s.charAt(left++);
            need[removed]++;
            if (need[removed] > 0) missing++;
        }
    }
    return bestLength == Integer.MAX_VALUE ? "" : s.substring(bestStart, bestStart + bestLength);
}`,
  invariant: 'missing 等于窗口相对 t 仍缺少的字符总数。missing 为零时窗口可行，左端只负责找到当前右端下的最短可行范围。',
  complexity: '左右指针都只向前移动，时间复杂度 O(m + n)，固定 ASCII 计数数组占 O(1) 空间。',
  checks: [
    '测试不存在答案、t 含重复字符、答案位于边界和 s 与 t 相同。',
    '若重复字符被少算，检查 missing 是否按总字符数计算。',
    '若窗口收缩过头，检查移出字符后 need 变为正数时是否立即增加 missing。',
  ],
  followUp: '字符集不限定为 ASCII 时改用 Map<Character, Integer>。返回所有最短窗口时保存同长度起点列表。',
});

const coinChange = makeInterviewCard({
  rank: 54,
  id: '322',
  title: '零钱兑换',
  slug: 'coin-change',
  difficulty: '中等',
  examines: '这道补洞题训练完全背包、不可达状态和最小值初始化。',
  clarify: '确认每种硬币可以无限使用，求最少硬币数量，无法组成时返回负一。金额为零需要返回零。',
  reasoning: '定义 dp[value] 为组成金额 value 的最少硬币数。dp[0] 为零，其余位置先设为 amount + 1，表示不可达。遍历每枚硬币，并用 dp[value - coin] 加一更新当前金额。',
  code: `int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);
    dp[0] = 0;
    for (int coin : coins) {
        for (int value = coin; value <= amount; value++) {
            dp[value] = Math.min(dp[value], dp[value - coin] + 1);
        }
    }
    return dp[amount] > amount ? -1 : dp[amount];
}`,
  invariant: '处理当前硬币时，金额从小到大更新，因此本轮刚得到的状态可以继续使用同一枚硬币。',
  complexity: '时间复杂度 O(amount × 硬币种类数)，空间复杂度 O(amount)。',
  checks: [
    '测试 amount 为零、无法组成、只有一种硬币和需要重复使用同一硬币。',
    '若不可达状态溢出，使用 amount + 1 作为有限哨兵，不要直接对 Integer.MAX_VALUE 加一。',
    '若每枚硬币只能使用一次，金额应从大到小遍历，循环方向不能混用。',
  ],
  followUp: '求组合数量时转移改成累加。硬币在外层会忽略选择顺序，金额在外层会把不同排列计为不同方案。',
});

const buildTree = makeInterviewCard({
  rank: 56,
  id: '105',
  title: '从前序与中序遍历序列构造二叉树',
  slug: 'construct-binary-tree-from-preorder-and-inorder-traversal',
  difficulty: '中等',
  examines: '这道补洞题训练递归区间、遍历序列含义和索引映射。',
  clarify: '确认树中没有重复值，前序与中序长度一致且来自同一棵树。重复值会让根节点在中序中的位置不唯一。',
  reasoning: '前序的下一个值是当前子树根。根在中序中的位置把区间分成左右子树。用哈希表预先保存值到中序下标的映射，再按左子树、右子树的顺序递归构造。',
  code: `TreeNode buildTree(int[] preorder, int[] inorder) {
    Map<Integer, Integer> inorderIndex = new HashMap<>();
    for (int i = 0; i < inorder.length; i++) inorderIndex.put(inorder[i], i);
    int[] preorderIndex = { 0 };
    return build(preorder, 0, inorder.length - 1, preorderIndex, inorderIndex);
}

TreeNode build(int[] preorder, int left, int right, int[] preorderIndex,
               Map<Integer, Integer> inorderIndex) {
    if (left > right) return null;
    int rootValue = preorder[preorderIndex[0]++];
    TreeNode root = new TreeNode(rootValue);
    int middle = inorderIndex.get(rootValue);
    root.left = build(preorder, left, middle - 1, preorderIndex, inorderIndex);
    root.right = build(preorder, middle + 1, right, preorderIndex, inorderIndex);
    return root;
}`,
  invariant: '递归参数 [left, right] 只描述当前子树在中序序列中的范围，preorderIndex 始终指向这个子树的根。',
  complexity: '每个节点创建一次，时间复杂度 O(n)，映射与递归栈空间 O(n)。',
  checks: [
    '测试空树、单节点、只有左子树和只有右子树。',
    '若左右子树颠倒，检查前序消费顺序是否先构造左子树。',
    '若递归区间越界，检查 middle 是否来自全局中序下标，并使用 left > right 作为空区间。',
  ],
  followUp: '中序与后序构树时，后序指针从末尾向前消费，因此必须先构造右子树。只有前序和后序通常不能唯一确定普通二叉树。',
});

const algorithmKnowledge = createKnowledgeMap({
  slug: 'algorithm',
  updatedAt: CODETOP_UPDATED_AT,
  sources: [codeTopArticle, interviewArticle],
  domains: [
    {
      title: '先把一轮面试答完整',
      short: '作答协议',
      summary: '用同一套步骤练澄清、分析、编码、测试和修错。',
      articles: [interviewArticle],
      groups: [
        {
          title: '完整作答协议',
          level: 'core',
          points: [interviewProtocol],
        },
      ],
    },
    {
      title: '链表基础',
      short: '三指针与快慢指针',
      summary: '看到反转、局部重连、环和交点，先画清节点关系。',
      articles: [codeTopArticle],
      groups: [
        {
          title: '三指针与虚拟头节点',
          level: 'core',
          points: [reverseList, mergeTwoLists],
        },
        {
          title: '区间、环与交点迁移',
          level: 'scenario',
          points: [reverseBetween, linkedListCycle, intersectionNode],
        },
      ],
    },
    {
      title: '链表进阶与数据结构设计',
      short: '分组、归并与缓存',
      summary: '把指针重连、最小堆和双向链表组合成稳定结构。',
      articles: [codeTopArticle],
      groups: [
        {
          title: '哈希表与双向链表母题',
          level: 'core',
          points: [lruCache],
        },
        {
          title: '分组、重排与多路归并',
          level: 'scenario',
          points: [reverseKGroup, reorderList, mergeKLists],
        },
      ],
    },
    {
      title: '哈希、滑动窗口、双指针与栈',
      short: '单调移动状态',
      summary: '用查询表、窗口边界和候选集消除重复扫描。',
      articles: [codeTopArticle],
      groups: [
        {
          title: '查找、窗口与栈母题',
          level: 'core',
          points: [twoSum, longestSubstring, validParentheses],
        },
        {
          title: '排序双指针与原地写入',
          level: 'scenario',
          points: [threeSum, mergeSortedArray],
        },
        {
          title: '窗口与单调结构进阶',
          level: 'advanced',
          points: [trappingRainWater, slidingWindowMaximum, minimumWindowSubstring],
        },
      ],
    },
    {
      title: '排序、选择、二分、区间与矩阵',
      short: '分区、有序性与边界',
      summary: '看到第 K 大、局部有序、重叠区间和矩阵边界时选对骨架。',
      articles: [codeTopArticle],
      groups: [
        {
          title: '分区、选择与二分母题',
          level: 'core',
          points: [quickSort, kthLargest, binarySearch],
        },
        {
          title: '旋转数组、区间与矩阵迁移',
          level: 'scenario',
          points: [searchRotated, mergeIntervals, spiralOrder],
        },
      ],
    },
    {
      title: '树、图与回溯',
      short: '遍历、连通与撤销选择',
      summary: '先定义访问状态和递归返回值，再决定 BFS、DFS 或回溯。',
      articles: [codeTopArticle],
      groups: [
        {
          title: '层序、连通块与回溯母题',
          level: 'core',
          points: [levelOrder, numberOfIslands, permutations],
        },
        {
          title: '层序变化与递归返回值',
          level: 'scenario',
          points: [zigzagLevelOrder, lowestCommonAncestor],
        },
        { title: '递归区间进阶', level: 'advanced', points: [buildTree] },
      ],
    },
    {
      title: '动态规划与字符串模拟',
      short: '状态、转移与进位',
      summary: '让每个状态都能用一句话解释，字符串运算额外守住索引和进位。',
      articles: [codeTopArticle],
      groups: [
        {
          title: '一维状态与字符串母题',
          level: 'core',
          points: [maxSubarray, bestStockProfit, longestPalindrome, addStrings],
        },
        {
          title: '序列与二维状态迁移',
          level: 'scenario',
          points: [longestIncreasingSubsequence, editDistance],
        },
        { title: '完全背包进阶', level: 'advanced', points: [coinChange] },
      ],
    },
  ],
});

export default algorithmKnowledge;
