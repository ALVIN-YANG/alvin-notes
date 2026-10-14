import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCompanies } from '../src/lib/company-observer.mjs';
const catalog = JSON.parse(await readFile(new URL('../src/data/companies/catalog.json', import.meta.url), 'utf8'));
const updates = JSON.parse(await readFile(new URL('../src/data/companies/updates.json', import.meta.url), 'utf8'));
const archive = JSON.parse(await readFile(new URL('../src/data/companies/archive.json', import.meta.url), 'utf8'));
test('停止同步后，原档案及历史事件仍保留有效直接引用', () => {
  assert.equal(validateCompanies(catalog, updates), true);
  assert.equal(validateCompanies(archive, archive), true);
});
test('历史档案不能失去事实来源或插入不安全链接', () => {
  const missing = structuredClone(catalog); missing.companies[0].sections[0].rows[0].sources = [];
  assert.throws(() => validateCompanies(missing, updates), /事实缺少来源/);
  const unsafe = structuredClone(catalog); unsafe.companies[0].sources[0].url = 'javascript:alert(1)';
  assert.throws(() => validateCompanies(unsafe, updates), /来源地址无效/);
});
