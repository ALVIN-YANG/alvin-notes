export const categories = {
  model: '模型与生成', training: '训练与适配', retrieval: '知识与检索',
  context: '上下文与记忆', agent: 'Agent 与工具', quality: '评测与安全',
  multimodal: '多模态', data: '数据与学习',
  mathematics: '线性代数与微积分', statistics: '概率与统计',
  neural: '神经网络基础', optimization: '损失与优化',
  reinforcement: '强化学习', systems: '计算与工程',
  classical: '传统机器学习', fundamentals: '机器学习通用概念', research: '论文术语',
};

// Display taxonomy only: keep source records and progress IDs unchanged.
export function displayCategory(term) {
  if (term.category !== 'fundamentals') return term.category;
  const name = `${term.term} ${term.zh}`.toLowerCase();
  const rules = [
    ['reinforcement', /reinforcement|q-learning|q-network|q-function|bellman|markov|policy|reward|replay|episode|trajectory|target network|^return\b/],
    ['systems', /fiddle|flax|keras|optax|google ai studio|host|pipelining|nan trap|tensorflow|tensorboard|tensorstore|tpu|gpu|accelerator|chip|device|compute|hardware|numpy|pandas|matplotlib|scikit|jax|xla|spmd|pmap|pjit|praxis|t5x|tf\.keras|estimator|saver|checkpoint|parameter server|replica|shard|mesh|pipeline|queue|endpoint|configuration|eager execution|graph execution|root directory|\bttl\b|serving|pure function|^static\b|^dynamic\b|^operation\b/],
    ['optimization', /hill climbing|hyperparameter|loss|gradient|optimization|optimizer|adagrad|adam\b|momentum|regularization|convergence|convex|learning rate|clipping|risk minimization|shrinkage|parameter update/],
    ['statistics', /log-odds|i\.i\.d|identically distributed|probabil|bayes|prior belief|distribution|sampling|quantile|variance|standard deviation|mean\b|median|random|statistic|stationarity|noise|outlier|correlation|deterministic|z-score|置信|概率|统计/],
    ['mathematics', /^linear$|hyperplane|function transformation|matrix|vector|tensor|scalar|derivative|dimension|einsum|weighted sum|nonlinear|broadcasting|数学|微分|积分/],
    ['neural', /forget gate|discriminator|generative adversarial|generator|positional encoding|logits|neural|neuron|perceptron|activation|relu|sigmoid|softmax|convolution|pooling|stride|autoencoder|encoder|decoder|backbone|layer|dropout|co-adaptation|deep learning|^weight\b|^parameter\b|^depth\b|^width\b/],
    ['quality', /groundedness|guardrails|interpretability|intersection over union|^test\b|evaluat|precision|recall|confusion matrix|cross-validation|a\/b testing|ablation|\bbleu\b|pass@|privacy|validation|test set/],
    ['data', /ground truth|rater|dataset|mnist|feature|featur|label|class\b|bucketing|normalization|imputation|one-hot|downsampling|concept drift|数据/],
    ['multimodal', /image|vision|bounding box|invariance|augmented reality|modality|视觉|图像/],
    ['model', /language|\bnlp\b|bigram|trigram|n-gram|skip-gram|bag of words|parsing|sentiment|sequence-to-sequence|text span|reading comprehension|\bt5\b|\bwmt\b/],
    ['classical', /decision|forest|classification|classifier|regression|bagging|boosting|ensemble|one-vs|anomaly|novelty detection|axis-aligned|condition|^leaf\b|^root\b|splitter/],
    ['training', /batch|epoch|early stopping|learning|overfitting|underfitting|fine.tun|训练|拟合/],
    ['context', /lost-in-the-middle/],
    ['retrieval', /candidate generation|ranking|re-ranking|recommendation|collaborative filtering/],
  ];
  return rules.find(([, pattern]) => pattern.test(name))?.[0] || 'fundamentals';
}
