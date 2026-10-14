// 主模块按主要考点归属；技术、场景与关注点通过题目 tags 提供交叉入口。
export const interviewModules = [
  { id: 'product', label: '产品与业务', topics: [
    ['product-scenarios', '场景与需求判断'], ['product-process', '业务流程'],
    ['product-metrics', '效果指标'], ['product-cost', '成本与收益'],
  ] },
  { id: 'fundamentals', label: '编程与工程基础', topics: [
    ['fundamentals-language', '语言与并发'], ['fundamentals-algorithms', '算法与数据结构'],
    ['fundamentals-systems', '操作系统与网络'], ['fundamentals-data', '数据库基础'],
  ] },
  { id: 'system-design', label: '系统设计', topics: [
    ['design-architecture', '架构与边界'], ['design-storage', '存储与缓存'],
    ['design-async', '异步任务与消息'], ['design-consistency', '分布式一致性'],
    ['design-capacity', '容量与扩展'],
  ] },
  { id: 'ai-agent', label: 'AI 应用与 Agent', topics: [
    ['ai-api', '模型调用与结构化输出'], ['ai-prompt', '提示工程'],
    ['ai-context', '上下文与记忆'], ['ai-rag', 'RAG'],
    ['ai-knowledge', '数据与知识工程'], ['ai-tools', '工具与 MCP / Skills'],
    ['ai-planning', '规划与多 Agent'], ['ai-runtime', 'Harness 运行工程'],
    ['ai-evaluation', '应用评测'], ['ai-security', '安全与权限'],
  ] },
  { id: 'models', label: '模型训练与推理', topics: [
    ['model-basics', '模型基础'], ['model-training', '训练与微调'],
    ['model-memory', '推理与显存'], ['model-parallel', '并行与通信'],
    ['model-optimization', '量化与加速'],
  ] },
  { id: 'reliability', label: '可靠性与运维', topics: [
    ['ops-observability', '可观测性'], ['ops-performance', '性能与压测'],
    ['ops-diagnosis', '故障诊断'], ['ops-release', '发布与回滚'],
    ['ops-recovery', '恢复与资源治理'],
  ] },
  { id: 'delivery', label: '工程交付与协作', topics: [
    ['delivery-ai-coding', 'AI Coding'], ['delivery-testing', '测试与验收'],
    ['delivery-review', '代码审查'], ['delivery-automation', '自动化交付'],
    ['delivery-handoff', '项目复盘与交接'],
  ] },
].map(module => ({ ...module, topics: module.topics.map(([id, label]) => ({ id, label })) }));

export function getInterviewModule(id) {
  return interviewModules.find(module => module.id === id);
}

export function getInterviewTopic(moduleId, topicId) {
  return getInterviewModule(moduleId)?.topics.find(topic => topic.id === topicId);
}
