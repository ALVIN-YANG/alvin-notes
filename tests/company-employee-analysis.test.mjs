import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analysisFor, validateEmployeeAnalyses } from '../src/lib/company-employee-analysis.mjs';

const read = async name => JSON.parse(await readFile(new URL(`../src/data/companies/${name}.json`, import.meta.url), 'utf8'));
const directory = await read('directory');
const analyses = await read('employee-analyses');

test('当前发布目录的每家公司都有可追溯员工初筛，不能用待分析或同类模板替代全量覆盖', () => {
  assert.equal(validateEmployeeAnalyses(analyses), true);
  const missing = directory.companies.filter(company => !analysisFor(company, analyses)).map(company => company.id);
  assert.deepEqual(missing, [], `缺少员工分析：${missing.join('、')}`);
  assert.equal(new Set(analyses.reports.map(report => report.thesis)).size, analyses.reports.length);
  assert.equal(new Set(analyses.reports.map(report => report.career)).size, analyses.reports.length);
  for (const report of analyses.reports) {
    for (const key of ['action', 'thesis', 'career', 'counter', 'change']) assert.doesNotMatch(report[key], /待生成|待分析|占位|TODO/i, `${report.companyId}/${key}`);
  }
});

test('来源丢失、事实脱离引用和官网主体变化不能沿用原分析', () => {
  for (const mutate of [
    report => { report.sources = []; },
    report => { report.basisSources = ['unknown']; },
    report => { report.counterSources = []; },
    report => { report.sources[0].url = 'javascript:alert(1)'; },
    report => { report.sources[0].asOf = '2099-01-01'; },
    report => { report.facts = [{ label: '营收', value: '100', note: '没有口径', kind: 'disclosed', sources: [] }]; },
  ]) {
    const invalid = structuredClone(analyses);
    mutate(invalid.reports[0]);
    assert.throws(() => validateEmployeeAnalyses(invalid));
  }
  const changed = { ...directory.companies[0], website: 'https://other-company.example/' };
  assert.equal(analysisFor(changed, analyses), undefined);
  assert.equal(validateEmployeeAnalyses(analyses), true, '来源更新不应使已保存的合法报告失效或阻断目录构建');
  const newcomer = { ...directory.companies[0], id: 'new-company' };
  assert.equal(analysisFor(newcomer, analyses), undefined, '新公司不能套用其他公司的报告');
});

test('经营披露保留集团和期间口径；产品预售不被写成已验证订单', () => {
  const tuya = analyses.reports.find(report => report.companyId === 'tuya');
  const hoorii = analyses.reports.find(report => report.companyId === 'hoorii');
  assert.ok(tuya && hoorii);
  assert.match(tuya.factScope, /2026 Q2.*集团合并口径.*美元/);
  assert.equal(tuya.facts[0].kind, 'calculated');
  assert.match(tuya.sources.find(source => source.id === 'results').note, /6,790.*9,290.*73.1/);
  assert.match(tuya.counter, /不是独立 AI 收入口径/);
  assert.equal(hoorii.facts.find(fact => fact.label === '经营与订单').kind, 'unknown');
  assert.match(hoorii.counter, /预售.*不能证明/);
});

test('无问芯穹和群核使用对应主体的官网，不再误链同名或近名企业', () => {
  const expected = { infinigence: 'www.infinigence-ai.com', qunhe: 'www.manycoretech.com' };
  for (const [id, hostname] of Object.entries(expected)) {
    const company = directory.companies.find(company => company.id === id);
    const report = analysisFor(company, analyses);
    assert.equal(new URL(company.website).hostname, hostname);
    assert.equal(new URL(report.sources[0].url).hostname, hostname);
    assert.equal(report.sources[0].asOf, '2026-10-16');
  }
});
