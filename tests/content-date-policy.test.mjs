import assert from 'node:assert/strict';
import test from 'node:test';
import { validateArticleDates } from '../scripts/check-content-date-policy.mjs';

const original = `---\ntitle: 示例\ndate: 2026-01-10\nlastUpdated: 2026-01-10\n---\n`;
const current = `---\ntitle: 示例\ndate: 2026-01-10\nlastUpdated: 2026-02-01\n---\n`;

test('已有文章可以修订 lastUpdated，但不能修改首次发布日', () => {
  assert.deepEqual(validateArticleDates({
    status: 'M', path: 'article.md', currentSource: current, previousSource: original, today: '2026-02-02',
  }), []);
  const errors = validateArticleDates({
    status: 'M', path: 'article.md', currentSource: current.replace('date: 2026-01-10', 'date: 2026-02-01'), previousSource: original, today: '2026-02-02',
  });
  assert(errors.some((error) => error.includes('不得从 2026-01-10 改为 2026-02-01')));
});

test('新文章必须有完整且相同的首次发布与修订日期', () => {
  assert.deepEqual(validateArticleDates({
    status: 'A', path: 'new.md', currentSource: original, today: '2026-02-02',
  }), []);
  assert(validateArticleDates({
    status: 'A', path: 'new.md', currentSource: current, previousSource: '', today: '2026-02-02',
  }).some((error) => error.includes('应相同')));
  assert(validateArticleDates({
    status: 'A', path: 'new.md', currentSource: original.replace('lastUpdated: 2026-01-10\n', ''), today: '2026-02-02',
  }).some((error) => error.includes('必须填写 lastUpdated')));
});

test('修订日期不能早于首次发布或晚于当前日期', () => {
  assert(validateArticleDates({
    status: 'M', path: 'article.md', currentSource: current.replace('2026-02-01', '2026-01-01'), previousSource: original, today: '2026-02-02',
  }).some((error) => error.includes('不得早于')));
  assert(validateArticleDates({
    status: 'M', path: 'article.md', currentSource: current.replace('2026-02-01', '2026-03-01'), previousSource: original, today: '2026-02-02',
  }).some((error) => error.includes('晚于当前日期')));
});

test('迁移文件保留原首次发布日', () => {
  assert.deepEqual(validateArticleDates({
    status: 'R', path: 'ai/moved.md', currentSource: original, previousSource: original, today: '2026-02-02',
  }), []);
});

test('已有文章可以把 lastUpdated 显式设为 false', () => {
  assert.deepEqual(validateArticleDates({
    status: 'M', path: 'article.md', currentSource: current.replace('2026-02-01', 'false'), previousSource: original, today: '2026-02-02',
  }), []);
});
