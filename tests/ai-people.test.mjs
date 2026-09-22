import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const directory = new URL('../src/data/people/', import.meta.url);
const json = async url => JSON.parse(await readFile(url, 'utf8'));
const people = (await Promise.all((await readdir(directory)).filter(f => f.endsWith('.json') && f !== 'sources.json').map(f => json(new URL(f, directory))))).flat();
const sources = await json(new URL('sources.json', directory));
const portraits = await json(new URL('../src/data/ai-people-portraits.json', import.meta.url));
const portraitSources = await json(new URL('../scripts/people-portrait-sources.json', import.meta.url));
const categories = new Set(['基础与架构', '训练与推理', '多模态', 'Agent 与工具', '对齐与评测', '模型与团队', '开源与教育']);

test('人物志持续收录至少 150 个独立人物，简介与引用完整', () => {
  assert.ok(people.length >= 150);
  assert.equal(new Set(people.map(p => p.id)).size, people.length);
  assert.equal(new Set(people.map(p => p.name)).size, people.length);
  for (const person of people) {
    assert.match(person.id, /^[a-z]+(?:-[a-z]+)+$/);
    assert.ok(categories.has(person.category), person.id);
    assert.ok(person.tag && person.name, person.id);
    assert.ok(person.bio.length >= 3 && person.bio.length <= 4, person.id);
    assert.ok(person.bio.join('').length >= 220 && person.bio.join('').length <= 600, person.id);
    assert.ok(person.sources.length >= 1 && person.sources.length <= 4, person.id);
    assert.equal(new Set(person.sources).size, person.sources.length, person.id);
    for (const id of person.sources) {
      assert.ok(sources[id]?.[0], `${person.id}: ${id}`);
      assert.ok(['https:', 'http:'].includes(new URL(sources[id][1]).protocol), id);
    }
  }
});

test('已收录头像必须对应人物、本地文件和完整署名来源', async () => {
  for (const [id, portrait] of Object.entries(portraits)) {
    assert.ok(people.some(p => p.id === id), id);
    const source = portraitSources.find(p => p.id === id);
    assert.ok(source && !source.skipReason, `${id}: 已排除的同名或无效肖像不能发布`);
    if (portrait.source.includes('commons.wikimedia.org')) assert.equal(source.wikipediaReviewed, true, `${id}: 百科身份未确认`);
    assert.equal(portrait.src, `/images/people/${id}.webp`);
    assert.ok(portrait.source && portrait.credit && portrait.license && portrait.licenseUrl && portrait.modification, id);
    assert.equal(new URL(portrait.source).protocol, 'https:', id);
    await access(new URL(`../public${portrait.src}`, import.meta.url));
  }
  const actual = await readdir(new URL('../public/images/people/', import.meta.url));
  assert.deepEqual(actual.filter(f => path.extname(f) === '.webp').sort(), Object.keys(portraits).map(id => `${id}.webp`).sort());
});
