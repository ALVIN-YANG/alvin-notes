import { publicUrl, websiteKey } from './company-directory.mjs';

export const employeeAnalysisLabels = { product: '产品资料初筛', limited: '资料有限', disclosed: '公司披露初筛' };
export const employeeAnalysisBoundary = '公司级初筛，岗位未指定。直属上级、团队预算、薪酬与雇佣条件未核实，不能据此决定接受 Offer 或离职。';

export function analysisFor(company, collection) {
  const report = collection.reports.find(report => report.companyId === company.id);
  return report && websiteKey(report.website) === websiteKey(company.website) ? report : undefined;
}

export function validateEmployeeAnalyses(collection) {
  const fail = message => { throw new Error(`员工分析校验失败：${message}`); };
  if (collection.schemaVersion !== 1 || !Array.isArray(collection.reports)) fail('数据结构无效');
  const ids = new Set();
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && new Date(value).toISOString().slice(0, 10) === value;
  for (const report of collection.reports) {
    if (ids.has(report.companyId)) fail(`重复公司 ${report.companyId}`);
    ids.add(report.companyId);
    publicUrl(report.website);
    if (!validDate(report.reviewedAt) || !employeeAnalysisLabels[report.level]) fail(`${report.companyId} 日期或资料层级无效`);
    for (const field of ['teaser', 'action', 'thesis', 'career', 'counter', 'change', 'confidence']) if (!report[field]?.trim()) fail(`${report.companyId} 缺少 ${field}`);
    if (!Array.isArray(report.questions) || report.questions.length !== 2 || report.questions.some(question => !question?.trim())) fail(`${report.companyId} 核实问题不完整`);
    if (!report.sources?.length) fail(`${report.companyId} 缺少来源`);
    const sourceIds = new Set();
    for (const source of report.sources) {
      if (!/^[a-z0-9-]+$/.test(source.id || '') || sourceIds.has(source.id)) fail(`${report.companyId} 来源 ID 重复或无效`);
      sourceIds.add(source.id);
      publicUrl(source.url);
      if (!source.title?.trim() || !source.kind?.trim() || !source.note?.trim() || !validDate(source.asOf)) fail(`${report.companyId}/${source.id} 来源口径不完整`);
      if (source.asOf > report.reviewedAt) fail(`${report.companyId} 来源日期晚于分析日期`);
    }
    for (const field of ['basisSources', 'careerSources', 'counterSources']) if (!report[field]?.length || report[field].some(id => !sourceIds.has(id))) fail(`${report.companyId}/${field} 缺少有效引用`);
    for (const fact of report.facts || []) if (!fact.label || !fact.value || !fact.note || !['disclosed', 'calculated', 'unknown'].includes(fact.kind) || !fact.sources?.length || fact.sources.some(id => !sourceIds.has(id))) fail(`${report.companyId} 关键事实缺少口径与来源`);
  }
  return true;
}
