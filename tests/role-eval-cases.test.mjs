import assert from 'node:assert/strict';
import test from 'node:test';
import cases from '../src/data/role-eval-cases.json' with { type: 'json' };

test('前置步骤可作为用户消息逐轮重放，语音操作单独记录', () => {
  for (const row of cases) {
    assert.ok(Array.isArray(row.setup), row.title);
    for (const message of row.setup) {
      assert.equal(typeof message, 'string', row.title);
      assert.ok(message.trim(), row.title);
    }
    assert.ok(row.inputs.length, row.title);
    for (const line of row.inputs) {
      if (typeof line === 'string') {
        assert.ok(line.trim(), row.title);
        continue;
      }
      assert.equal(row.category, 'voice', row.title);
      assert.ok(line.text.trim(), row.title);
      for (const key of Object.keys(line)) {
        assert.ok(['text', 'before', 'after'].includes(key), row.title);
      }
    }
  }
});

test('记忆更新题的历史与提问分开，停顿题保留同一句话的两段语音', () => {
  const record = cases.find(row => row.category === 'memory' && row.reference === '6a1eabeb');
  assert.match(record.setup[0], /27分12秒/);
  assert.match(record.setup[1], /25分50秒/);
  assert.deepEqual(record.inputs, ['我在慈善5公里跑中的个人最好成绩是多少？']);
  const pause = cases.find(row => row.category === 'voice' && row.reference === 'pause/0001_0003');
  assert.deepEqual(pause.setup, []);
  assert.deepEqual(pause.inputs.map(line => line.text), ['乌龙茶属于什么', '类型的茶饮？']);
  assert.match(pause.inputs[1].before, /停顿/);
});
