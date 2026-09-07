import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const script = fileURLToPath(new URL('../public/examples/harness-goal-loop.mjs', import.meta.url));
const execFileAsync = promisify(execFile);

function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'harness-goal-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const db = path.join(directory, 'goal.sqlite');
  const invoke = (command, ...args) => spawnSync(process.execPath, [script, command, db, ...args], { encoding: 'utf8' });
  const call = (command, ...args) => {
    const result = invoke(command, ...args);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  return { db, invoke, call };
}

test('提前完成声明必须经过完整验收，成功后不再续跑', t => {
  const { call } = fixture(t);
  const initial = call('init');
  const first = call('tick', 'event-1');
  assert.equal(first.claimedComplete, true);
  assert.equal(first.status, 'ACTIVE');
  assert.equal(first.evidence.passed, false);
  assert.deepEqual(first.evidence.failed, ['/about/ 页脚年份应为 2026']);
  const second = call('tick', 'event-2');
  assert.equal(second.status, 'SUCCEEDED');
  assert.equal(second.evidence.passed, true);
  assert.notEqual(first.evidence.artifactHash, second.evidence.artifactHash);
  assert.deepEqual(call('tick', 'event-3'), { skipped: 'SUCCEEDED', turns: 2 });
  const final = call('status');
  assert.equal(final.turns, 2);
  assert.deepEqual(final.pages.map(p => p.body), initial.pages.map(p => p.body));
  assert.ok(final.pages.every(p => p.footerYear === 2026));
});

test('不同进程之间保存暂停状态，明确恢复后才继续', t => {
  const { call, invoke } = fixture(t);
  call('init');
  call('tick', 'event-1');
  assert.equal(call('pause').status, 'PAUSED');
  assert.deepEqual(call('run'), { stopped: 'PAUSED' });
  assert.deepEqual(call('tick', 'event-2'), { skipped: 'PAUSED', turns: 1 });
  assert.equal(call('status').turns, 1);
  assert.equal(call('resume').status, 'ACTIVE');
  assert.equal(invoke('run').status, 0);
  assert.equal(call('status').status, 'SUCCEEDED');
  assert.equal(call('status').turns, 2);
});

test('预算耗尽保留未完成结果，不允许用 resume 绕过限制', t => {
  const { call } = fixture(t);
  call('init', '1');
  const result = call('tick', 'event-1');
  assert.equal(result.status, 'BUDGET_LIMITED');
  assert.equal(result.evidence.passed, false);
  assert.equal(call('resume').skipped, 'BUDGET_LIMITED');
  assert.deepEqual(call('run'), { stopped: 'BUDGET_LIMITED' });
  assert.equal(call('status').turns, 1);
  assert.equal(call('status').pages[1].footerYear, 2025);
});

test('顺序和并发重复事件均只执行一次', async t => {
  const { db, call } = fixture(t);
  call('init');
  const results = await Promise.all([1, 2].map(async () => {
    const result = await execFileAsync(process.execPath, [script, 'tick', db, 'same-event']);
    return JSON.parse(result.stdout);
  }));
  const original = results.find(result => !result.duplicate);
  const duplicate = results.find(result => result.duplicate);
  assert.ok(original);
  assert.ok(duplicate);
  assert.deepEqual(duplicate.original, original);
  assert.equal(call('status').turns, 1);
  assert.deepEqual(call('tick', 'same-event'), duplicate);
  assert.equal(call('status').turns, 1);
});

test('拒绝覆盖已有数据库，非法参数和查询不创建数据库', t => {
  const { db, invoke, call } = fixture(t);
  assert.notEqual(invoke('status').status, 0);
  assert.equal(existsSync(db), false);
  assert.notEqual(invoke('init', '0').status, 0);
  assert.equal(existsSync(db), false);
  call('init');
  call('tick', 'event-1');
  assert.notEqual(invoke('init').status, 0);
  assert.equal(call('status').turns, 1);
});
