import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildRequestFrame, createRoomServer, inspectFrames, runDemo, validateToolPairs } from '../public/examples/agent-environment-cache.mjs';

function fixture(options = {}, target = { room: 'living_room', mode: 'cool', temperature_c: 26 }) {
  const server = createRoomServer(options), session = 'session-a';
  const request = server.authorizeUserRequest(session, target);
  const read = server.readRoomState(session, request, { room: 'living_room' });
  const input = { ...target,
    read_receipt: read.read_receipt, expected_version: read.state.version, operation_id: 'op-1' };
  return { server, session, request, read, input, set: changes => server.setRoomClimate(session, request, { ...input, ...changes }) };
}

test('旧状态阻断、返回最新状态且无副作用；关窗不恢复旧授权', () => {
  const { server, set, read } = fixture();
  server.observe({ window: 'open' });
  const before = server.inspect();
  const result = set();
  assert.equal(result.code, 'STALE_STATE');
  assert.equal(result.latest.version, 'v42');
  assert.equal(result.latest.window, 'open');
  assert.deepEqual(server.inspect(), before);
  assert.equal(read.state.window, 'closed');
  server.observe({ window: 'closed' });
  assert.equal(set({ operation_id: 'auto-retry' }).code, 'NOT_AUTHORIZED');
  assert.equal(server.inspect().writes, 0);
});

test('开关窗或断线重连后即使状态恢复相同，旧回执也不能继续执行', () => {
  for (const changes of [
    [{ window: 'open' }, { window: 'closed' }],
    [{ connection: 'offline' }, { connection: 'healthy' }],
  ]) {
    const { server, set } = fixture();
    for (const change of changes) server.observe(change);
    const before = server.inspect();
    assert.equal(before.state.window, 'closed');
    assert.equal(before.state.connection, 'healthy');
    assert.equal(set().code, 'STALE_STATE');
    assert.deepEqual(server.inspect(), before);
    assert.equal(before.writes, 0);
  }
});

test('工具允许通用温度范围，但实际目标只由服务端授权记录决定', () => {
  const target = { room: 'living_room', mode: 'cool', temperature_c: 22 };
  const { server, set } = fixture({}, target);
  target.temperature_c = 18; // 修改调用方对象不能改写既有授权。
  assert.equal(set({ temperature_c: 18 }).code, 'OUT_OF_SCOPE');
  assert.equal(server.inspect().writes, 0);
  const valid = fixture({}, { ...target, temperature_c: 22 }).set();
  assert.equal(valid.code, 'APPLIED');
  assert.equal(valid.state.temperature_c, 22);
  for (const temperature_c of [15, 31, NaN, Infinity, '26'])
    assert.throws(() => server.authorizeUserRequest('session-a', { ...target, temperature_c }));
});

test('读取凭据到期即失效，版本未变也不能执行；到期前仍可执行', () => {
  for (const elapsed of [99, 100, 101]) {
    let current = 1000;
    const { server, session, request, read, set } = fixture({ now: () => current, readTtlMs: 100 });
    assert.equal(read.expires_at_ms, 1100);
    read.expires_at_ms = 999999; // 模型修改回执副本不能延长服务端有效期。
    current += elapsed;
    const before = server.inspect();
    const result = set();
    if (elapsed < 100) assert.equal(result.code, 'APPLIED');
    else {
      assert.equal(result.code, 'READ_RECEIPT_EXPIRED');
      assert.deepEqual(server.inspect(), before);
      assert.equal(server.readRoomState(session, request, { room: 'living_room' }).code, 'NOT_AUTHORIZED');
    }
  }
});

test('明确新请求后成功一次；重复回执不重写，修改重复操作参数被拒绝', () => {
  const demo = runDemo(() => {});
  assert.equal(demo.applied.code, 'APPLIED');
  assert.equal(demo.final.state.aircon, 'cool');
  assert.equal(demo.final.state.temperature_c, 26);
  assert.equal(demo.final.writes, 1);
  assert.deepEqual(demo.duplicate, { ...demo.applied, duplicate: true });
  const { server, set } = fixture();
  const original = set();
  server.observe({ window: 'open' });
  const before = server.inspect();
  assert.deepEqual(set(), { ...original, duplicate: true });
  assert.equal(set({ temperature_c: 18 }).code, 'OPERATION_CONFLICT');
  assert.equal(set({ operation_id: 'another-operation' }).code, 'NOT_AUTHORIZED');
  assert.deepEqual(server.inspect(), before);
});

test('伪造、跨请求或跨会话读取凭据、越权目标均被拒绝且无写入', () => {
  for (const change of [
    { read_receipt: 'forged' }, { room: 'bedroom' }, { temperature_c: 18 }, { mode: 'heat' }, { expected_version: 'v99' },
  ]) {
    const { server, set } = fixture();
    const before = server.inspect();
    assert.equal(set(change).ok, false);
    assert.deepEqual(server.inspect(), before);
  }
  const { server, session, request, input } = fixture();
  assert.equal(server.setRoomClimate('session-b', request, input).code, 'NOT_AUTHORIZED');
  assert.equal(server.readRoomState('session-b', request, { room: 'living_room' }).code, 'NOT_AUTHORIZED');
  const other = server.authorizeUserRequest('session-b');
  assert.equal(server.setRoomClimate('session-b', other, input).code, 'INVALID_READ_RECEIPT');
  const fresh = server.authorizeUserRequest(session);
  assert.equal(server.setRoomClimate(session, fresh, input).code, 'INVALID_READ_RECEIPT');
  assert.equal(server.inspect().writes, 0);
});

test('unknown、断联、连接健康未知均在读取和执行时关闭写入通道', () => {
  for (const patch of [{ window: 'unknown' }, { aircon: 'unknown' }, { connection: 'offline' }, { connection: 'unknown' }]) {
    for (const checkRead of [true, false]) {
      const { server, session, request, set } = fixture();
      server.observe(patch);
      const before = server.inspect();
      const result = checkRead ? server.readRoomState(session, request, { room: 'living_room' }) : set();
      assert.equal(result.code, 'STATE_UNAVAILABLE');
      assert.deepEqual(server.inspect(), before);
      server.observe({ window: 'closed', aircon: 'off', connection: 'healthy' });
      assert.equal(server.readRoomState(session, request, { room: 'living_room' }).code, 'NOT_AUTHORIZED');
    }
  }
  const { server, session } = fixture();
  server.observe({ window: 'open' });
  const request = server.authorizeUserRequest(session);
  const read = server.readRoomState(session, request, { room: 'living_room' });
  assert.equal(server.setRoomClimate(session, request, { room: 'living_room', mode: 'cool', temperature_c: 26,
    read_receipt: read.read_receipt, expected_version: read.state.version, operation_id: 'open-window' }).code, 'PRECONDITION_FAILED');
  assert.equal(server.inspect().writes, 0);
});

test('五帧固定前缀、只追加历史、保留 closed 旧结果和 open 新结果', () => {
  const { frames } = runDemo(() => {});
  assert.equal(frames.length, 5);
  assert.ok(inspectFrames(frames).every(check => check.static_prefix_unchanged && check.previous_messages_preserved && check.tool_pairs_valid));
  assert.deepEqual(frames[0].system.at(-1).cache_control, { type: 'ephemeral' });
  assert.doesNotMatch(JSON.stringify(frames[0].system), /26|客厅|制冷/);
  assert.match(frames[0].messages[0].content, /制冷 26°C/);
  assert.deepEqual(frames[0].tools.map(tool => tool.name), ['read_room_state', 'set_room_climate']);
  assert.deepEqual(frames[0].tools[1].input_schema.properties.temperature_c, { type: 'number', minimum: 16, maximum: 30 });
  const content = index => JSON.parse(frames[2].messages[index].content[0].content);
  assert.equal(content(2).state.window, 'closed');
  assert.equal(content(4).latest.window, 'open');
  assert.equal(content(4).code, 'STALE_STATE');
  frames[1].messages[0].content = '篡改';
  assert.equal(inspectFrames(frames)[1].previous_messages_preserved, false);
  frames[1].system[0].text = '前缀发生变化';
  assert.equal(inspectFrames(frames)[1].static_prefix_unchanged, false);
  assert.notEqual(frames[0].system[0].text, frames[1].system[0].text);
});

test('请求帧拒绝悬空、隔条、错配、孤立及位置不正确的工具消息', () => {
  const use = { role: 'assistant', content: [{ type: 'tool_use', id: 'u1', name: 'read_room_state', input: {} }] };
  const result = { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'u1', content: '{}' }] };
  const text = { role: 'user', content: '插入消息' };
  assert.equal(validateToolPairs([use, result]), true);
  for (const messages of [[use], [use, text, result], [result], [use, result, use, result],
    [use, { ...result, content: [{ ...result.content[0], tool_use_id: 'other' }] }],
    [use, { ...result, content: [{ type: 'text', text: '先文本' }, ...result.content] }]])
    assert.throws(() => buildRequestFrame(messages));
});

test('无需参数的 CLI 完整运行，明确标注本地检查和无真实缓存统计', () => {
  const path = fileURLToPath(new URL('../public/examples/agent-environment-cache.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [path], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /STALE_STATE/);
  assert.match(result.stdout, /累计设备写入=1/);
  assert.match(result.stdout, /仅是本地结构检查，不是 token 缓存命中率/);
  assert.equal((result.stdout.match(/请求帧结构：/g) ?? []).length, 5);
});
