import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { checkSvgLayout } from '../../scripts/svg-layout-core.mjs';

let browser, page;
before(async () => { browser = await chromium.launch(); page = await browser.newPage(); });
after(async () => { await browser?.close(); });
async function check(content) {
  await page.setContent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
    <rect id="node" data-svg-box="" x="10" y="10" width="200" height="100"/>${content}</svg>`);
  return page.evaluate(checkSvgLayout);
}
test('accepts padded text and explicit multiline content', async () => {
  assert.deepEqual(await check('<text data-svg-container="node" x="30" y="42"><tspan>memory_search</tspan><tspan x="30" dy="24">memory_get</tspan></text>'), []);
});
test('rejects the reported bottom baseline overflow', async () => {
  const errors = await check('<text data-svg-container="node" x="30" y="114">intent reminder</text>');
  assert(errors.some(e => e.includes('Container node overflow')));
});
test('rejects long labels even when their anchor is inside the node', async () => {
  const errors = await check('<text data-svg-container="node" x="110" y="55" text-anchor="middle">memory_search memory_get memory_search memory_get</text>');
  assert(errors.some(e => e.includes('Container node overflow')));
});
test('does not allow node text to bypass checks as a free label', async () => {
  assert((await check('<text data-svg-label="" x="30" y="50">label</text>')).some(e => e.includes('must declare')));
});
test('does not allow unmarked rectangles to bypass node checks', async () => {
  const errors = await check('<rect x="220" y="20" width="70" height="100"/><text data-svg-label="" x="225" y="60">label</text>');
  assert(errors.some(e => e.includes('Unmarked text container')));
});
test('rejects connector labels crossing a node even if their center is outside', async () => {
  assert((await check('<text data-svg-label="" x="200" y="70">outside</text>')).some(e => e.includes('overlaps a node')));
});
test('rejects missing ownership and overlapping text', async () => {
  const errors = await check('<text x="30" y="50">one</text><text data-svg-container="node" x="30" y="51">two</text>');
  assert(errors.some(e => e.includes('needs data-svg-container')));
  assert(errors.some(e => e.includes('Text overlap')));
});
test('measures transformed text in root coordinates', async () => {
  assert((await check('<g transform="translate(200 0)"><text data-svg-container="node" x="30" y="50">moved</text></g>'))
    .some(e => e.includes('Container node overflow')));
});
test('rejects shapes and standalone labels outside the viewBox', async () => {
  const errors = await check('<path d="M290 150 L330 150"/><text data-svg-label="" x="280" y="180">outside viewport</text>');
  assert(errors.some(e => e.includes('Shape outside')));
  assert(errors.some(e => e.includes('viewBox overflow')));
});
