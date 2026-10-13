import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { getISOWeek } from './weekly-report.mjs';

export const companyCategories = ['AI 编程', 'Agent 基础设施', '语音与视频', '企业应用'];
export const evidenceLabels = { verified: '已核实事实', disclosed: '企业自述', analysis: '分析判断', unknown: '待核实' };
export const sectionIds = ['product', 'workflow', 'pricing', 'competition', 'outlook', 'team', 'funding'];

export function shanghaiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function sourceKey(companyId, sourceId) { return `${companyId}:${sourceId}`; }
export function dateLabel(value = '') { return value.slice(0, 10).replaceAll('-', '.'); }
export function sourceFor(company, id) { return company.sources.find(source => source.id === id); }
export function latestCompanyUpdate(companyId, reports) {
  return reports.flatMap(report => report.items).filter(item => item.companyId === companyId).sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function validateCompanies(catalog, updates) {
  const fail = message => { throw new Error(`公司资料校验失败：${message}`); };
  const date = (value, context) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail(`${context} 日期无效`);
  };
  const ids = new Set();
  for (const company of catalog.companies) {
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(company.id) || ids.has(company.id)) fail(`公司 ID 重复或无效：${company.id}`);
    ids.add(company.id);
    if (!companyCategories.includes(company.category)) fail(`${company.id} 分类无效`);
    for (const key of ['name', 'company', 'product', 'summary', 'region', 'status']) if (!company[key]?.trim()) fail(`${company.id} 缺少 ${key}`);
    date(company.reviewedAt, company.id);
    date(company.analysisAt, company.id);
    const sources = new Set();
    for (const source of company.sources) {
      if (sources.has(source.id) || !source.title?.trim()) fail(`${company.id} 来源重复或缺少标题`);
      sources.add(source.id);
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || url.username || url.password) fail(`${company.id} 来源地址无效`);
      date(source.checkedAt, source.id);
      if (source.publishedAt) date(source.publishedAt, source.id);
    }
    if (company.sections.map(section => section.id).join() !== sectionIds.join()) fail(`${company.id} 档案章节不完整`);
    for (const section of company.sections) {
      if (!section.rows.length || !section.title?.trim()) fail(`${company.id}/${section.id} 缺少内容`);
      if (section.id === 'workflow' && section.steps?.length !== 3) fail(`${company.id} 缺少完整工作流程`);
      for (const row of section.rows) {
        if (!row.text?.trim() || !row.label?.trim() || !evidenceLabels[row.kind]) fail(`${company.id} 证据内容无效`);
        date(row.asOf, row.label);
        if (['verified', 'disclosed'].includes(row.kind) && !row.sources.length) fail(`${company.id}/${row.label} 事实缺少来源`);
        for (const id of row.sources) if (!sources.has(id)) fail(`${company.id} 引用未知来源 ${id}`);
      }
    }
  }
  const eventIds = new Set();
  for (const report of updates.reports) {
    date(report.publishedAt, report.id); date(report.start, report.id); date(report.end, report.id);
    if (report.start > report.end || report.end > report.publishedAt) fail(`${report.id} 覆盖范围无效`);
    for (const item of report.items) {
      if (eventIds.has(item.id) || !ids.has(item.companyId)) fail(`动态重复或公司不存在：${item.id}`);
      eventIds.add(item.id); date(item.date, item.id);
      if (item.date < report.start || item.date > report.end) fail(`${item.id} 事件不在本期范围内`);
      const company = catalog.companies.find(company => company.id === item.companyId);
      if (!item.sources?.length || item.sources.some(id => !sourceFor(company, id))) fail(`${item.id} 缺少有效来源`);
      for (const key of ['title', 'fact', 'impact', 'watch']) if (!item[key]?.trim()) fail(`${item.id} 缺少 ${key}`);
      if (!['verified', 'disclosed'].includes(item.kind)) fail(`${item.id} 未核实动态不能发布`);
    }
  }
  return true;
}

export function extractSource(html, url) {
  const document = new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ''), { url }).window.document;
  const title = document.querySelector('title')?.textContent?.trim() || new URL(url).hostname;
  document.querySelectorAll('script,style,noscript,nav,header,footer,aside,iframe,svg,[hidden],[aria-hidden="true"]').forEach(node => node.remove());
  const root = document.querySelector('main') || document.querySelector('article') || document.body;
  const text = root.textContent.replace(/\s+/g, ' ').trim();
  if (text.length < 100 || /^(we.?re sorry|just a moment|access denied|checking your browser|enable javascript)/i.test(text)) {
    throw new Error('未取得可检查的正文，需浏览器核对');
  }
  const normalized = text.slice(0, 18000);
  return { title, hash: createHash('sha256').update(normalized).digest('hex') };
}

export async function checkCompanySources(catalog, previous, { fetcher = fetch, now = new Date(), force = false } = {}) {
  const at = now.toISOString();
  const date = shanghaiDate(now);
  const week = getISOWeek(date);
  if (!force && previous.lastRun?.week === week && previous.lastRun.status === 'ok') return { state: previous, skipped: true };
  const state = structuredClone(previous);
  const jobs = catalog.companies.flatMap(company => company.sources.filter(source => source.monitor).map(source => ({ company, source })));
  let successCount = 0;
  let failureCount = 0;
  // A bounded pool keeps one failed website from blocking the other companies.
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const { company, source } = jobs[cursor++];
      const key = sourceKey(company.id, source.id);
      const old = previous.sources[key];
      try {
        const response = await fetcher(source.url, { headers: { 'User-Agent': 'AlvinNotes-CompanyObserver/1.0' }, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (Number(response.headers?.get('content-length') || 0) > 4_000_000) throw new Error('来源页面过大');
        const html = await response.text();
        if (html.length > 4_000_000) throw new Error('来源页面过大');
        const result = extractSource(html, response.url || source.url);
        state.sources[key] = { ...result, checkedAt: at, attemptedAt: at, error: null };
        if (old?.hash && old.hash !== result.hash) {
          const id = `${key}:${result.hash.slice(0, 16)}`;
          if (!state.candidates.some(item => item.id === id)) state.candidates.push({ id, companyId: company.id, sourceId: source.id, detectedAt: at, status: 'pending' });
        }
        successCount++;
      } catch (error) {
        state.sources[key] = { ...old, attemptedAt: at, error: String(error.message).slice(0, 200) };
        failureCount++;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
  state.candidates.sort((a, b) => a.id.localeCompare(b.id));
  state.lastRun = { at, week, status: failureCount ? 'partial' : 'ok', successCount, failureCount };
  return { state, skipped: false };
}
