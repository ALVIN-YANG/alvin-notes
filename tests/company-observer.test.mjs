import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCompanies, checkCompanySources, extractSource, shanghaiDate } from '../src/lib/company-observer.mjs';

const catalog = JSON.parse(await readFile(new URL('../src/data/companies/catalog.json', import.meta.url), 'utf8'));
const updates = JSON.parse(await readFile(new URL('../src/data/companies/updates.json', import.meta.url), 'utf8'));
const empty = () => ({ schemaVersion: 1, lastRun: null, sources: {}, candidates: [] });
const subject = { companies: [{ id: 'example', sources: [{ id: 'news', url: 'https://example.com/news', monitor: true }] }] };
const now = new Date('2026-10-12T01:00:00Z');
const page = value => `<html><title>Official product news</title><main><h1>Product update</h1><p>${value.repeat(30)}</p></main></html>`;
const fetcher = value => async () => new Response(page(value));

test('首期公司档案、事件日期与直接引用可完整追溯', () => {
  assert.equal(catalog.companies.length, 12);
  assert.equal(new Set(catalog.companies.map(company => company.category)).size, 4);
  assert.ok(catalog.companies.some(company => company.region === '中国'));
  assert.equal(validateCompanies(catalog, updates), true);
});

test('阻止没有来源的事实、未知引用和错误周报日期进入页面', () => {
  const missing = structuredClone(catalog);
  missing.companies[0].sections[0].rows[0].sources = [];
  assert.throws(() => validateCompanies(missing, updates), /事实缺少来源/);
  const unsafe = structuredClone(catalog);
  unsafe.companies[0].sources[0].url = 'javascript:alert(1)';
  assert.throws(() => validateCompanies(unsafe, updates), /来源地址无效/);
  const future = structuredClone(updates);
  future.reports[0].items[0].date = '2026-10-14';
  assert.throws(() => validateCompanies(catalog, future), /事件不在本期范围内/);
  const unknown = structuredClone(updates);
  unknown.reports[0].items[0].sources = ['missing'];
  assert.throws(() => validateCompanies(catalog, unknown), /缺少有效来源/);
});

test('首次成功检查只建立基线；稳定页面不会生成伪动态', async () => {
  const first = await checkCompanySources(subject, empty(), { fetcher: fetcher('Original content.'), now });
  assert.equal(first.state.lastRun.status, 'ok');
  assert.equal(first.state.candidates.length, 0);
  const same = await checkCompanySources(subject, first.state, { fetcher: fetcher('Original content.'), now, force: true });
  assert.equal(same.state.candidates.length, 0);
});

test('页面变化只成为待核实线索，重复检查不会重复发布或改写档案', async () => {
  const before = JSON.stringify(subject);
  const first = await checkCompanySources(subject, empty(), { fetcher: fetcher('Original content.'), now });
  const changed = await checkCompanySources(subject, first.state, { fetcher: fetcher('New capability.'), now, force: true });
  assert.equal(changed.state.candidates.length, 1);
  assert.equal(changed.state.candidates[0].status, 'pending');
  const again = await checkCompanySources(subject, changed.state, { fetcher: fetcher('New capability.'), now, force: true });
  assert.equal(again.state.candidates.length, 1);
  assert.equal(JSON.stringify(subject), before);
});

test('下载失败保留正文哈希和成功日期，失败尝试不会冒充更新', async () => {
  const first = await checkCompanySources(subject, empty(), { fetcher: fetcher('Original content.'), now });
  const failed = await checkCompanySources(subject, first.state, { fetcher: async () => new Response('Unavailable', { status: 503 }), now: new Date('2026-10-19T01:00:00Z') });
  assert.equal(failed.state.lastRun.status, 'partial');
  assert.equal(failed.state.sources['example:news'].hash, first.state.sources['example:news'].hash);
  assert.equal(failed.state.sources['example:news'].checkedAt, first.state.sources['example:news'].checkedAt);
  assert.equal(failed.state.sources['example:news'].error, 'HTTP 503');
  assert.equal(failed.state.candidates.length, 0);
  const retried = await checkCompanySources(subject, failed.state, { fetcher: fetcher('Original content.'), now: new Date('2026-10-19T02:00:00Z') });
  assert.equal(retried.skipped, false);
  assert.equal(retried.state.lastRun.status, 'ok');
});

test('一个来源失败不丢失其他公司的成功结果', async () => {
  const mixed = structuredClone(subject);
  mixed.companies.push({ id: 'other', sources: [{ id: 'news', url: 'https://other.example/news', monitor: true }] });
  const result = await checkCompanySources(mixed, empty(), { now, fetcher: async url => url.includes('other.example') ? new Response('Forbidden', { status: 403 }) : new Response(page('Good content.')) });
  assert.equal(result.state.lastRun.successCount, 1);
  assert.equal(result.state.lastRun.failureCount, 1);
  assert.ok(result.state.sources['example:news'].hash);
  assert.equal(result.state.sources['other:news'].checkedAt, undefined);
});

test('同一周的成功检查跳过重复访问，周边界使用北京时间', async () => {
  assert.equal(shanghaiDate(new Date('2026-10-11T17:00:00Z')), '2026-10-12');
  const first = await checkCompanySources(subject, empty(), { fetcher: fetcher('Original content.'), now });
  const skipped = await checkCompanySources(subject, first.state, { fetcher: async () => { throw new Error('Should not fetch'); }, now: new Date('2026-10-18T10:00:00Z') });
  assert.equal(skipped.skipped, true);
});

test('脚本、导航和页脚变化不生成内容变化；空壳和挑战页不能成为有效基线', () => {
  const original = page('Visible content.');
  assert.equal(extractSource(original, 'https://example.com').hash, extractSource(original.replace('</main>', '</main><footer>Changed footer</footer><script>new Date()</script>'), 'https://example.com').hash);
  assert.throws(() => extractSource('<html><body>Please enable JavaScript</body></html>', 'https://example.com'), /需浏览器核对/);
});
