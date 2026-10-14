import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { companiesFromYc, mergeDirectory, inRegion, registryAttachments, registryMatches, syncDirectory, validateDirectory } from '../src/lib/company-directory.mjs';

const read = async name => JSON.parse(await readFile(new URL(`../src/data/companies/${name}.json`, import.meta.url), 'utf8'));
const real = await read('directory');
const seed = await read('seed');
const sources = [ { id: 'yc', kind: 'yc', mode: 'automatic', url: 'https://list.example/yc.json', limit: 10 }, { id: 'cac', kind: 'registry', mode: 'automatic', url: 'https://www.cac.gov.cn/list.html' } ];
const now = new Date('2026-10-14T01:00:00Z');
const records = Array.from({ length: 10 }, (_, i) => ({ id: i, slug: `company-${i}`, name: `Company ${i}`, website: `https://company-${i}.example/`, url: `https://www.ycombinator.com/companies/company-${i}`, status: 'Active', tags: ['Artificial Intelligence'], one_liner: 'An AI assistant', all_locations: 'London', regions: ['United Kingdom'], isHiring: false, team_size: 5 }));

test('发布目录至少 50 家，杭州属于国内且每条有直接来源', () => {
  assert.equal(validateDirectory(real), true);
  assert.ok(real.companies.length >= 50);
  const hangzhou = real.companies.filter(company => inRegion(company, '杭州'));
  assert.ok(hangzhou.length >= 3);
  assert.ok(hangzhou.every(company => inRegion(company, '国内')));
});

test('只导入 Active、有官网且带 AI 标签的记录，不把未知状态当作活跃', () => {
  const input = structuredClone(records);
  input[0].status = 'Inactive'; input[1].website = ''; input[2].tags = ['Insurance']; input[3].status = null;
  assert.equal(companiesFromYc(input, sources[0], '2026-10-14').length, 6);
});

test('按官网去重；明确停止活动才退出，名册短暂缺项保留旧日期和简介', () => {
  const imported = companiesFromYc(records, sources[0], '2026-10-14');
  const first = { ...imported[0], id: 'curated', website: 'http://www.company-0.example/', sourceId: 'seed', summary: '人工中文简介' };
  const old = { ...imported[1], syncedAt: '2026-09-01', summary: '历史中文简介' };
  const upstream = records.filter(record => record.id !== 1);
  upstream[2] = { ...upstream[2], status: 'Inactive' };
  const selected = companiesFromYc(upstream.concat({ ...records[0], id: 99, slug: 'extra' }), sources[0], '2026-10-14');
  const result = mergeDirectory([first], selected, imported.map(company => company.id === old.id ? old : company), { ycRecords: upstream, today: '2026-10-14' });
  assert.equal(result.filter(company => company.website.includes('company-0.example')).length, 1);
  assert.ok(!result.some(company => company.id === 'yc-company-3'));
  assert.equal(result.find(company => company.id === old.id).syncedAt, '2026-09-01');
  assert.equal(result.find(company => company.id === old.id).summary, '历史中文简介');
});

test('备案单位跨行仍可匹配，备案日期与同步日期分别保留，外站附件不接受', () => {
  const html = '<a href="https://evil.example/downloadfile.jsp">生成式人工智能服务</a><a href="/cms/pub/interact/downloadfile.jsp?id=1">生成式人工智能服务（2026年8月）</a>';
  assert.equal(registryAttachments(html, sources[1].url).url, 'https://www.cac.gov.cn/cms/pub/interact/downloadfile.jsp?id=1');
  const company = { id: 'subject', aliases: ['杭州示例科技有限公司'] };
  const matches = registryMatches('序号 属地 模型 备案单位 备案时间\n100 浙江省 示例 杭州示例科技有限\n公司 Test-123 2026/7/13\n101 北京市 另一家公司 Test-456 2026/8/20', [company], sources[1], '备案名单', '2026-10-14');
  assert.equal(matches[0].asOf, '2026-07-13');
  assert.equal(matches[0].syncedAt, '2026-10-14');
  assert.throws(() => registryMatches('下载失败', [company], sources[1], '名单', '2026-10-14'), /未取得/);
});

test('来源结构变化或失败保留上次名单，其他成功来源照常更新且不访问公司官网', async () => {
  const imported = companiesFromYc(records, sources[0], '2026-09-01');
  const previous = { schemaVersion: 1, companies: imported };
  const state = { sources: { yc: { syncedAt: '2026-09-01', count: 10 }, cac: { syncedAt: '2026-09-01', matches: [], count: 0 } } };
  for (const mode of ['unavailable', 'wrong-shape']) {
    const visited = [];
    const result = await syncDirectory({ seed: [], previous, state, sources }, { now, pdfText: async () => '序号 备案单位 备案时间\n100 浙江省 示例 Test 2026/7/13', fetcher: async url => {
      visited.push(url);
      if (url === sources[0].url) return mode === 'unavailable' ? new Response('Unavailable', { status: 503 }) : Response.json({ unexpected: true });
      if (url === sources[1].url) return new Response('<a href="/cms/pub/interact/downloadfile.jsp?id=1">生成式人工智能服务名单</a>');
      return new Response('PDF');
    } });
    assert.deepEqual(result.directory.companies, previous.companies);
    assert.equal(result.state.sources.yc.syncedAt, '2026-09-01');
    assert.equal(result.state.sources.cac.syncedAt, '2026-10-14');
    assert.equal(result.state.lastRun.status, 'partial');
    assert.equal(visited.length, 3);
    assert.ok(visited.every(url => !url.includes('company-')));
  }
});

test('基础名单与旧来源对象不会被同步中的引用补充修改', async () => {
  const input = { seed: seed.companies, previous: real, state: { sources: {} }, sources: [] };
  const before = JSON.stringify(input);
  await syncDirectory(input, { now });
  assert.equal(JSON.stringify(input), before);
});

test('不安全链接、无来源和伪造日期不能进入发布目录', () => {
  for (const edit of [company => { company.website = 'javascript:alert(1)'; }, company => { company.sources = []; }, company => { company.activity.asOf = '2026-02-30'; }]) {
    const invalid = structuredClone(real); edit(invalid.companies[0]);
    assert.throws(() => validateDirectory(invalid));
  }
});
