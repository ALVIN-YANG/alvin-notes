// Questions adapted from cocodot2026/cocodot-llmprobe (MIT).
// Copyright notice and the original specification are in src/data/ai-probe/.
import upstream from '../data/ai-probe/upstream-spec.json' with { type: 'json' };

export const SPEC_VERSION = upstream.version + '-alvin-1';
export const PROBES = upstream.probes.map(({ id, label_zh, weight, prompt }) => ({ id, label: label_zh, weight, prompt }));
export const STATUS_LABELS = { pending: '等待检测', running: '正在检测', passed: '通过', failed: '答题异常', error: '请求未完成', cancelled: '已停止', skipped: '未运行' };
const answers = { instruct: 'CORRECT', base64: 'the magic word is falcon', needle: '7391', reason: '$0.05（5 cents）', math: '408', code: '3' };

export function expectedAnswer(id) { return answers[id]; }

export function normalizeEndpoint(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('请填写有效的 Base URL。');
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('请填写完整的 HTTPS 地址。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')) throw new Error('只支持 HTTPS 默认端口；地址不能包含登录信息或片段。');
  for (const name of url.searchParams.keys()) if (/key|token|secret|password|authorization/iu.test(name)) throw new Error('请把密钥填入 API Key，不要放在地址中。');
  let path = url.pathname.replace(/\/+$/u, '');
  if (!path.endsWith('/chat/completions')) path = (path || '/v1') + '/chat/completions';
  url.pathname = path;
  return url;
}

export function validateProbeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('检测参数无效。');
  const allowed = ['baseUrl', 'apiKey', 'model', 'probeId'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new Error('接口只接受固定检测题。');
  const endpoint = normalizeEndpoint(input.baseUrl);
  if (typeof input.apiKey !== 'string' || input.apiKey.trim().length < 8 || input.apiKey.length > 2048 || /[\x00-\x1f\x7f]/u.test(input.apiKey)) throw new Error('请填写有效的 API Key。');
  if (typeof input.model !== 'string' || !input.model.trim() || input.model.length > 160 || /[\x00-\x1f\x7f]/u.test(input.model)) throw new Error('请填写模型名，最多 160 字符。');
  if(input.baseUrl.includes(input.apiKey.trim())||input.model.includes(input.apiKey.trim()))throw new Error('请只在 API Key 输入框中填写密钥。');
  const probe = PROBES.find(value => value.id === input.probeId);
  if (!probe) throw new Error('检测题不存在。');
  return { endpoint, apiKey: input.apiKey.trim(), model: input.model.trim(), probe };
}

export function gradeAnswer(id, reply) {
  const text = typeof reply === 'string' ? reply.trim() : '';
  if (!PROBES.some(probe => probe.id === id)) throw new Error('检测题不存在。');
  if (id === 'reason') return /^(?:\$\s*)?0\.050*(?:\s*dollars?)?$|^5\s*cents?$/iu.test(text);
  return text === answers[id];
}

export function summarizeResults(results) {
  const rows = PROBES.map(probe => results.find(result => result.probeId === probe.id));
  const completed = rows.filter(row => row && ['passed', 'failed'].includes(row.status)).length;
  const passed = rows.filter(row => row?.status === 'passed').length;
  const complete = completed === PROBES.length;
  const score = complete ? PROBES.reduce((total, probe, index) => total + (rows[index].status === 'passed' ? probe.weight : 0), 0) : null;
  return { complete, completed, passed, total: PROBES.length, score, verdict: !complete ? '检测未完成' : passed === PROBES.length ? '基础题全部通过' : score >= 60 ? '部分基础题异常' : '多项基础题异常' };
}

export function createProbeReport({ baseUrl, model, startedAt, results }) {
  const endpoint = normalizeEndpoint(baseUrl);
  const records = PROBES.map(probe => {
    const result = results.find(value => value.probeId === probe.id) || {};
    return {
      probeId: probe.id, label: probe.label, weight: probe.weight, prompt: probe.prompt, expected: expectedAnswer(probe.id),
      status: Object.hasOwn(STATUS_LABELS,result.status) ? result.status : 'pending',
      actual: typeof result.actual === 'string' ? result.actual.slice(0, 12000) : '',
      elapsedMs: Number.isFinite(result.elapsedMs) ? result.elapsedMs : null,
      returnedModel: typeof result.returnedModel === 'string' ? result.returnedModel.slice(0, 160) : null,
      finishReason: typeof result.finishReason === 'string' ? result.finishReason.slice(0, 80) : null,
      usage: selectUsage(result.usage),
      attempts: Number.isInteger(result.attempts) ? result.attempts : null,
      errorKind: typeof result.errorKind === 'string' ? result.errorKind : null,
      error: typeof result.error === 'string' ? result.error.slice(0, 400) : null,
    };
  });
  return { version: SPEC_VERSION, startedAt, endpoint: endpoint.origin + endpoint.pathname, requestedModel: model, summary: summarizeResults(records), results: records, limitation: '基础题不能识别实际模型，也不能验证计费、间歇性降级或标称长上下文。型号与用量来自接口自报。', attribution:upstream.notice };
}

export function selectUsage(value) {
  const usage = {};
  for (const key of ['prompt_tokens', 'completion_tokens', 'total_tokens']) if (Number.isSafeInteger(value?.[key]) && value[key] >= 0) usage[key] = value[key];
  return Object.keys(usage).length ? usage : null;
}

function codeBlock(value) {
  const text = String(value || '（空）');
  const longest = Math.max(2, ...[...text.matchAll(/`+/gu)].map(match => match[0].length));
  const fence = '`'.repeat(longest + 1);
  return fence + '\n' + text + '\n' + fence;
}

export function reportMarkdown(report) {
  const escape=value=>String(value).replace(/[\\`*_{}\[\]<>#]/gu,'\\$&');
  const lines = ['# AI 降智检测', '', '- 检测时间：' + escape(report.startedAt), '- 端点：' + escape(report.endpoint), '- 请求模型：' + escape(report.requestedModel), '- 题库版本：' + report.version, '- 结果：' + report.summary.verdict + (report.summary.complete ? ' · ' + report.summary.score + '/100' : ' · 不计算总分'), '', report.limitation];
  for (const result of report.results) lines.push('', '## ' + result.label, '', '- 状态：' + STATUS_LABELS[result.status], '- 标准答案：' + result.expected, '- 耗时：' + (result.elapsedMs === null ? '未取得' : (result.elapsedMs / 1000).toFixed(2) + ' 秒'), '- 返回型号（自报）：' + escape(result.returnedModel || '未提供'), '- 用量（自报）：' + (result.usage ? JSON.stringify(result.usage) : '未提供'), ...(result.error ? ['- 错误：' + escape(result.error)] : []), '', '题目：', '', codeBlock(result.prompt), '', '实际回答：', '', codeBlock(result.actual));
  lines.push('','## 题库来源与许可','',report.attribution.source,'',codeBlock(report.attribution.text));
  return lines.join('\n') + '\n';
}
