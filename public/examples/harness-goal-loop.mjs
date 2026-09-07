#!/usr/bin/env node
// 教学演示。Node.js 24+，无模型、无网络、无外部工具调用。
// 模拟执行器只改一个页面，验收器独立检查全部页面；所有状态存在指定 SQLite 文件。
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const [command, dbPath, argument] = process.argv.slice(2);
const commands = new Set(['init', 'tick', 'run', 'status', 'pause', 'resume']);
const originals = [
  { path: '/', body: '首页正文', footerYear: 2025 },
  { path: '/about/', body: '关于页正文', footerYear: 2025 },
];
const targetYear = 2026;

if (!commands.has(command) || !dbPath) {
  console.error('用法：node harness-goal-loop.mjs <init|tick|run|status|pause|resume> <db文件> [轮数上限|事件ID]');
  process.exit(1);
}
if (command === 'init' ? existsSync(dbPath) : !existsSync(dbPath)) {
  console.error(command === 'init' ? '数据库已存在，拒绝覆盖。' : '数据库不存在，请先 init。');
  process.exit(1);
}
const maxTurns = command === 'init' ? Number(argument ?? 4) : undefined;
if (command === 'init' && (!Number.isSafeInteger(maxTurns) || maxTurns < 1)) {
  console.error('轮数上限必须是正整数。');
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA busy_timeout = 5000');

function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function readGoal() {
  const row = db.prepare('SELECT * FROM goal WHERE id = 1').get();
  return { ...row, pages: JSON.parse(row.pages) };
}

function verify(pages) {
  const failed = [];
  if (pages.length !== originals.length) failed.push('页面数量必须保持不变');
  for (const expected of originals) {
    const matches = pages.filter(page => page.path === expected.path);
    if (matches.length !== 1) {
      failed.push(`${expected.path} 必须恰好存在一次`);
      continue;
    }
    const page = matches[0];
    if (page.body !== expected.body) failed.push(`${page.path} 正文不得改动`);
    if (page.footerYear !== targetYear) failed.push(`${page.path} 页脚年份应为 ${targetYear}`);
  }
  return {
    passed: failed.length === 0,
    failed,
    artifactHash: createHash('sha256').update(JSON.stringify(pages)).digest('hex'),
  };
}

function simulatedTurn(pages) {
  const candidate = structuredClone(pages);
  const page = candidate.find(item => item.footerYear !== targetYear);
  if (page) page.footerYear = targetYear;
  // 故意提前宣布完成，模拟遗漏工作。验收器不会相信这个声明。
  return { candidate, claimedComplete: true, changedPath: page?.path ?? null };
}

function tick(eventId) {
  return transaction(() => {
    const receipt = db.prepare('SELECT result FROM receipts WHERE event_id = ?').get(eventId);
    if (receipt) return { duplicate: true, original: JSON.parse(receipt.result) };

    const goal = readGoal();
    if (goal.status !== 'ACTIVE') return { skipped: goal.status, turns: goal.turns };
    if (goal.turns >= goal.max_turns) {
      db.prepare("UPDATE goal SET status = 'BUDGET_LIMITED' WHERE id = 1").run();
      return { skipped: 'BUDGET_LIMITED', turns: goal.turns };
    }

    // 这里只执行瞬时的本地纯函数。生产系统不能把网络调用放进这个事务。
    const turn = simulatedTurn(goal.pages);
    const evidence = verify(turn.candidate);
    const turns = goal.turns + 1;
    const status = evidence.passed ? 'SUCCEEDED'
      : turns >= goal.max_turns ? 'BUDGET_LIMITED' : 'ACTIVE';
    const result = {
      eventId, turns, status, claimedComplete: turn.claimedComplete,
      changedPath: turn.changedPath, evidence,
    };
    db.prepare('UPDATE goal SET status = ?, turns = ?, pages = ? WHERE id = 1')
      .run(status, turns, JSON.stringify(turn.candidate));
    db.prepare('INSERT INTO receipts(event_id, result) VALUES (?, ?)')
      .run(eventId, JSON.stringify(result));
    return result;
  });
}

function setStatus(next) {
  return transaction(() => {
    const goal = readGoal();
    const allowed = next === 'PAUSED' ? goal.status === 'ACTIVE'
      : goal.status === 'PAUSED' && goal.turns < goal.max_turns;
    if (!allowed) return { skipped: goal.status, turns: goal.turns };
    db.prepare('UPDATE goal SET status = ? WHERE id = 1').run(next);
    return readGoal();
  });
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

try {
  switch (command) {
    case 'init':
      transaction(() => {
        db.exec(`
          CREATE TABLE goal (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'BUDGET_LIMITED', 'SUCCEEDED')),
            turns INTEGER NOT NULL,
            max_turns INTEGER NOT NULL,
            pages TEXT NOT NULL
          );
          CREATE TABLE receipts (event_id TEXT PRIMARY KEY, result TEXT NOT NULL);
        `);
        db.prepare('INSERT INTO goal VALUES (1, ?, 0, ?, ?)')
          .run('ACTIVE', maxTurns, JSON.stringify(originals));
      });
      print(readGoal());
      break;
    case 'tick':
      print(tick(argument ?? randomUUID()));
      break;
    case 'run':
      // 外层自动续跑。生产系统应改成持久队列驱动，不用这个同步循环等待外部事件。
      while (readGoal().status === 'ACTIVE') print(tick(randomUUID()));
      print({ stopped: readGoal().status });
      break;
    case 'status':
      print(readGoal());
      break;
    case 'pause':
      print(setStatus('PAUSED'));
      break;
    case 'resume':
      print(setStatus('ACTIVE'));
      break;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
