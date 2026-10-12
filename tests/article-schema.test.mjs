import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { createArticleJsonLd } from '../src/lib/article-schema.mjs';

const canonical = 'https://blog.mlxb.cc/ai/recovery/';
const route = {
  slug: 'ai/recovery',
  entry: {
    body: '服务重启后读取已保存的状态。',
    data: {
      title: 'Agent 状态恢复',
      description: '保存与恢复执行进度。',
      date: new Date('2026-09-07'),
      lastUpdated: new Date('2026-10-12'),
    },
  },
};

test('article metadata uses its canonical URL and real publication and update dates', () => {
  const schema = JSON.parse(createArticleJsonLd(route, canonical));
  assert.equal(schema.mainEntityOfPage, canonical);
  assert.equal(schema.headline, route.entry.data.title);
  assert.equal(schema.datePublished, '2026-09-07T00:00:00.000Z');
  assert.equal(schema.dateModified, '2026-10-12T00:00:00.000Z');
  assert.deepEqual(schema.author, {
    '@type': 'Person', name: 'Alvin Yang', url: 'https://blog.mlxb.cc/about/',
  });
});

test('landing pages, tools and synthetic component pages are not marked as blog articles', () => {
  assert.equal(createArticleJsonLd({ ...route, entry: { ...route.entry, data: { ...route.entry.data, template: 'splash' } } }, canonical), null);
  assert.equal(createArticleJsonLd({ ...route, slug: 'tools/code-image' }, canonical), null);
  assert.equal(createArticleJsonLd({ ...route, entry: { ...route.entry, body: '' } }, canonical), null);
});

test('unknown dates are not invented and lastUpdated false is not a modification date', () => {
  const data = { ...route.entry.data, lastUpdated: false };
  assert.equal('dateModified' in JSON.parse(createArticleJsonLd({ ...route, entry: { ...route.entry, data } }, canonical)), false);
  for (const date of [undefined, new Date('invalid')]) {
    assert.equal(createArticleJsonLd({ ...route, entry: { ...route.entry, data: { ...data, date } } }, canonical), null);
  }
});

test('HTML in article metadata cannot end the JSON script or create another element', () => {
  const title = '</script><script>alert(1)</script><h1>Injected</h1>';
  const json = createArticleJsonLd({ ...route, entry: { ...route.entry, data: { ...route.entry.data, title } } }, canonical);
  const dom = new JSDOM(`<script type="application/ld+json">${json}</script>`);
  assert.equal(dom.window.document.scripts.length, 1);
  assert.equal(dom.window.document.querySelector('h1'), null);
  assert.equal(JSON.parse(dom.window.document.scripts[0].textContent).headline, title);
  dom.window.close();
});
