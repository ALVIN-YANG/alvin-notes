import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inRegion } from '../src/lib/company-directory.mjs';

const read = async name => JSON.parse(await readFile(new URL(`../src/data/companies/${name}.json`, import.meta.url), 'utf8'));
const audit = await read('hangzhou-audit');
const directory = await read('directory');
const seed = await read('seed');
const supplements = await read('hangzhou-supplements');

test('杭州比对包含两年四类省级名单、全部十三期国家附件和两则新增公告，条目无漏记或重复', () => {
  assert.equal(audit.sources.length, 17);
  assert.equal(audit.rows.length, 307);
  assert.equal(new Set(audit.rows.map(row => row.id)).size, audit.rows.length);
  assert.equal(new Set(audit.sources.map(source => source.id)).size, audit.sources.length);
  const provincial = audit.sources.filter(source => source.id.startsWith('zj-service-'));
  assert.deepEqual(provincial.map(source => [source.scannedRows, source.reviewedRows]), [[179, 85], [178, 97]]);
  const national = audit.sources.filter(source => source.id.startsWith('cac-'));
  assert.deepEqual(national.map(source => source.id), Array.from({ length: 13 }, (_, index) => `cac-${String(index + 1).padStart(2, '0')}`));
  assert.equal(national.reduce((sum, source) => sum + source.scannedRows, 0), 1843);
  assert.equal(national.reduce((sum, source) => sum + source.reviewedRows, 0), 109);
  assert.deepEqual(audit.sources.filter(source => source.id.startsWith('zjwx-')).map(source => source.reviewedRows), [3, 13]);
  for (const source of audit.sources) {
    assert.equal(audit.rows.filter(row => row.sourceId === source.id).length, source.reviewedRows, source.id);
    assert.ok(source.scannedRows >= source.reviewedRows);
    assert.ok(new URL(source.url).hostname.endsWith('.gov.cn'), source.url);
    if (source.sha256) assert.match(source.sha256, /^[a-f0-9]{64}$/);
    if (source.id.startsWith('zj-service-')) {
      assert.equal(new Set(audit.rows.filter(row => row.sourceId === source.id).map(row => row.section)).size, 4);
      assert.ok(audit.rows.filter(row => row.sourceId === source.id).every(row => row.city === '杭州' && row.page > 0));
    }
  }
});

test('每项官方记录有明确结论，收录项均指向杭州目录、基础名单及同一直接官方来源', () => {
  const counts = Object.fromEntries(Object.keys(audit.counts).map(status => [status, 0]));
  for (const row of audit.rows) {
    const source = audit.sources.find(source => source.id === row.sourceId);
    assert.ok(source, row.id);
    assert.ok(row.company && typeof row.product === 'string' && row.reason && Object.hasOwn(counts, row.status), row.id);
    counts[row.status]++;
    if (row.status !== 'included') {
      assert.ok(!row.companyId, row.id);
      continue;
    }
    for (const collection of [directory, seed]) {
      const company = collection.companies.find(company => company.id === row.companyId);
      assert.ok(company && inRegion(company, '杭州') && inRegion(company, '国内'), row.company);
      assert.ok(company.sources.some(citation => citation.url === source.url), row.company);
      assert.ok(company.sources.some(citation => citation.sourceId === 'official'), row.company);
    }
  }
  assert.deepEqual(counts, audit.counts);
  assert.match(audit.limits, /不视为不符合/);
});

test('名单外补充逐家公司去重并保留官网和杭州依据，待补项不混入正式目录', () => {
  assert.equal(supplements.rows.length, 50);
  assert.equal(new Set(supplements.rows.map(row => row.id)).size, supplements.rows.length);
  const added = supplements.rows.filter(row => row.status === 'included');
  assert.equal(added.length, supplements.added);
  assert.equal(new Set(added.map(row => row.companyId)).size, supplements.added);
  for (const row of supplements.rows) {
    assert.ok(row.reason && row.sources.length, row.id);
    assert.ok(row.sources.every(source => /^https?:$/.test(new URL(source.url).protocol)), row.id);
    if (row.status === 'unconfirmed') {
      assert.ok(!row.companyId && !directory.companies.some(company => company.id === row.id), row.id);
      continue;
    }
    assert.equal(row.status, 'included');
    for (const collection of [directory, seed]) {
      const company = collection.companies.find(company => company.id === row.companyId);
      assert.ok(company && inRegion(company, '杭州') && company.region === '国内', row.id);
      assert.equal(company.website, row.website);
      assert.ok(row.sources.every(source => company.sources.some(citation => citation.url === source.url)), row.id);
    }
  }
  assert.match(supplements.limits, /不代表产品实测/);
});
