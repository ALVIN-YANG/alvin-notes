// 按主要考点确定唯一能力分类；技术、场景与关注点保留在题目 tags 中供搜索。
export const interviewModules = [
  { id: 'product', label: '产品与业务', description: '场景与需求判断、业务流程、效果指标、成本与收益' },
  { id: 'fundamentals', label: '编程与工程基础', description: '语言与并发、算法与数据结构、操作系统与网络、数据库基础' },
  { id: 'system-design', label: '系统设计', description: '架构与边界、存储与缓存、异步任务、分布式一致性、容量与扩展' },
  { id: 'ai-agent', label: 'AI 应用与 Agent', description: '模型调用、Prompt、RAG、工具与 Skills、记忆、规划、运行控制、评测与安全' },
  { id: 'models', label: '模型训练与推理', description: '模型基础、训练与微调、显存、并行与通信、量化与推理加速' },
  { id: 'reliability', label: '可靠性与运维', description: '可观测性、性能与压测、故障诊断、发布回滚、恢复与资源治理' },
  { id: 'delivery', label: '工程交付与协作', description: 'AI Coding、测试与验收、代码审查、自动化交付、复盘与交接' },
];

export function getInterviewModule(id) {
  return interviewModules.find(module => module.id === id);
}
