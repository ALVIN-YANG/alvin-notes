import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { interviewModules, getInterviewModule } from '../src/lib/interview-taxonomy.mjs';
import { buildInterviewSidebar } from '../src/lib/interview-sidebar.mjs';

const entries = ['agent', 'infra'].flatMap(directory => {
  const folder = new URL(`../src/content/docs/interview/${directory}/`, import.meta.url);
  return readdirSync(folder).filter(file => file.endsWith('.mdx')).map(file => {
    const header = readFileSync(new URL(file, folder), 'utf8').split('---')[1];
    return {url:`/interview/${directory}/${file.slice(0,-4)}/`, module:header.match(/^  module: (.+)$/m)?.[1], topic:header.match(/^  topic: (.+)$/m)?.[1]};
  });
});

test('every question belongs to one flat ability category', () => {
  assert.equal(interviewModules.length, 7);
  assert.equal(new Set(interviewModules.map(module => module.id)).size, 7);
  assert(interviewModules.every(module => !('topics' in module)));
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length);
  for (const entry of entries) assert(getInterviewModule(entry.module), entry.url);
  assert(entries.every(entry => entry.topic === undefined));
});

test('the capability sidebar reaches every unchanged question URL exactly once', () => {
  const walk = entries => entries.flatMap(entry => entry.items ? walk(entry.items) : [entry.link]);
  const links = walk(buildInterviewSidebar()).filter(link => !link.includes('?'));
  assert.deepEqual(links.sort(), entries.map(entry => entry.url).sort());
  assert(buildInterviewSidebar().every(group => group.items.every(entry => !entry.items)));
  const product = buildInterviewSidebar().find(entry => entry.label === '产品与业务');
  assert.equal(product.items[0].link, '/interview/?module=product');
});
