#!/usr/bin/env node
// Node.js 22+；离线教学演练，只改内存。两个工具是自定义封装，不是 HA 官方工具名。
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const clone = value => structuredClone(value);
const room = 'living_room';
const system = [{ type: 'text', text: '你是设备助手，仅处理用户当前请求。执行前先读取状态，依据工具回执报告结果，不把计划当作成功。权限、凭据和执行条件由服务端校验；拒绝后停止，不等待条件恢复自动重试。', cache_control: { type: 'ephemeral' } }];
const tools = [
  { name: 'read_room_state', description: '读取客厅状态并取得绑定本次授权的读取凭据。', input_schema: {
    type: 'object', properties: { room: { enum: [room] } }, required: ['room'], additionalProperties: false,
  } },
  { name: 'set_room_climate', description: '服务端验证权限、读取凭据和当前状态后，尝试执行一次。', input_schema: {
    type: 'object', properties: {
      room: { enum: [room] }, mode: { enum: ['cool'] }, temperature_c: { type: 'number', minimum: 16, maximum: 30 },
      read_receipt: { type: 'string' }, expected_version: { type: 'string' }, operation_id: { type: 'string' },
    }, required: ['room', 'mode', 'temperature_c', 'read_receipt', 'expected_version', 'operation_id'], additionalProperties: false,
  } },
];

export function createRoomServer({ now = Date.now, readTtlMs = 30_000 } = {}) {
  if (!Number.isFinite(readTtlMs) || readTtlMs <= 0) throw new Error('读取凭据有效期必须为正数毫秒。');
  let revision = 41, writes = 0;
  let state = { version: 'v41', window: 'closed', aircon: 'off', connection: 'healthy' };
  const grants = new Map(), reads = new Map(), operations = new Map();
  const snapshot = () => clone(state);
  const unavailable = () => state.connection !== 'healthy' || !['open', 'closed'].includes(state.window)
    || !['off', 'cool'].includes(state.aircon);
  const grantFor = (session, request) => {
    const grant = grants.get(request);
    return grant?.session === session ? grant : undefined;
  };
  return {
    // 仅受信应用在收到新的明确用户请求后调用；不暴露给模型。
    authorizeUserRequest(session, target = { room, mode: 'cool', temperature_c: 26 }) {
      if (target.room !== room || target.mode !== 'cool' || !Number.isFinite(target.temperature_c)
        || target.temperature_c < 16 || target.temperature_c > 30) throw new Error('授权目标超出示例设备能力。');
      const request = randomUUID();
      grants.set(request, { session, active: true, target: clone(target) });
      return request;
    },
    // 模拟外部观测更新。真实系统必须由可信状态源推进版本。
    observe(patch) {
      const { window = state.window, aircon = state.aircon, connection = state.connection } = patch;
      state = { ...state, window, aircon, connection, version: `v${++revision}` };
    },
    inspect: () => ({ state: snapshot(), writes }),
    readRoomState(session, request, input) {
      const grant = grantFor(session, request);
      if (!grant?.active) return { ok: false, code: 'NOT_AUTHORIZED' };
      if (input.room !== room || unavailable()) {
        grant.active = false; // 读取失败也停止，不把一次请求变成长时间等待。
        return { ok: false, code: input.room !== room ? 'OUT_OF_SCOPE' : 'STATE_UNAVAILABLE', latest: snapshot() };
      }
      const read_receipt = randomUUID();
      const expires_at_ms = now() + readTtlMs;
      reads.set(read_receipt, { session, request, version: state.version, expires_at_ms });
      return { ok: true, read_receipt, expires_at_ms, state: snapshot() };
    },
    setRoomClimate(session, request, input) {
      const grant = grantFor(session, request);
      if (!grant) return { ok: false, code: 'NOT_AUTHORIZED' };
      const key = `${request}:${input.operation_id}`;
      const fingerprint = JSON.stringify([
        input.room, input.mode, input.temperature_c, input.read_receipt, input.expected_version,
      ]);
      const prior = operations.get(key);
      // 重复投递只重放历史执行回执，不代表设备当前仍处于回执中的状态。
      if (prior) return prior.fingerprint === fingerprint
        ? { ...clone(prior.result), duplicate: true }
        : { ok: false, code: 'OPERATION_CONFLICT' };
      if (!grant.active) return { ok: false, code: 'NOT_AUTHORIZED' };
      grant.active = false; // 本次尝试即结束授权；拒绝后不能自动等关窗再执行。
      const fail = code => ({ ok: false, code, latest: snapshot() });
      const receipt = reads.get(input.read_receipt);
      let result;
      if (input.room !== grant.target.room || input.mode !== grant.target.mode || input.temperature_c !== grant.target.temperature_c
        || typeof input.operation_id !== 'string' || !input.operation_id) result = fail('OUT_OF_SCOPE');
      else if (!receipt || receipt.session !== session || receipt.request !== request) result = fail('INVALID_READ_RECEIPT');
      else if (now() >= receipt.expires_at_ms) result = fail('READ_RECEIPT_EXPIRED');
      else if (unavailable()) result = fail('STATE_UNAVAILABLE');
      else if (receipt.version !== input.expected_version || state.version !== receipt.version) result = fail('STALE_STATE');
      else if (state.window !== 'closed') result = fail('PRECONDITION_FAILED');
      else {
        // 同一进程内无 await 的检查与写入；不能据此推导真实 HA 的分布式原子性。
        state = { ...state, aircon: input.mode, temperature_c: input.temperature_c, version: `v${++revision}` };
        writes++;
        result = { ok: true, code: 'APPLIED', operation_id: input.operation_id, state: snapshot() };
      }
      operations.set(key, { fingerprint, result: clone(result) });
      return result;
    },
  };
}

export function validateToolPairs(messages) {
  const seen = new Set();
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const blocks = Array.isArray(message.content) ? message.content : [];
    const uses = blocks.filter(block => block.type === 'tool_use');
    const results = blocks.filter(block => block.type === 'tool_result');
    if (uses.length) {
      const next = messages[i + 1];
      const nextBlocks = Array.isArray(next?.content) ? next.content : [];
      const nextResults = nextBlocks.filter(block => block.type === 'tool_result');
      if (message.role !== 'assistant' || next?.role !== 'user' || nextResults.length !== uses.length)
        throw new Error('tool_use 后必须紧邻对应的 user tool_result，不能以待执行调用结束请求帧。');
      for (const use of uses) {
        if (seen.has(use.id) || nextResults.filter(result => result.tool_use_id === use.id).length !== 1)
          throw new Error('tool_use ID 必须唯一，并与下一条消息的结果一一对应。');
        seen.add(use.id);
      }
      if (nextBlocks.slice(0, uses.length).some(block => block.type !== 'tool_result'))
        throw new Error('tool_result 必须位于 user 内容块前部。');
    }
    if (results.length) {
      const previous = messages[i - 1];
      const previousUses = Array.isArray(previous?.content)
        ? previous.content.filter(block => block.type === 'tool_use') : [];
      if (message.role !== 'user' || previous?.role !== 'assistant' || !previousUses.length
        || results.some(result => !previousUses.some(use => use.id === result.tool_use_id)))
        throw new Error('不允许孤立或错配的 tool_result。');
    }
  }
  return true;
}

export function buildRequestFrame(messages) {
  validateToolPairs(messages);
  // Anthropic Messages 请求体的相关字段；未填写 model/max_tokens，也不会发送 API 请求。
  return clone({ tools, system, messages });
}

export function inspectFrames(frames) {
  const fixed = frame => JSON.stringify({ tools: frame.tools, system: frame.system });
  return frames.map((frame, index) => ({
    frame: index + 1,
    message_count: frame.messages.length,
    static_prefix_unchanged: fixed(frame) === fixed(frames[0]),
    previous_messages_preserved: index === 0 || JSON.stringify(frame.messages.slice(0, frames[index - 1].messages.length))
      === JSON.stringify(frames[index - 1].messages),
    tool_pairs_valid: validateToolPairs(frame.messages),
  }));
}

export function runDemo(log = console.log) {
  const server = createRoomServer(), session = 'session-alvin';
  const target = { room, mode: 'cool', temperature_c: 26 };
  let request = server.authorizeUserRequest(session, target);
  const messages = [{ role: 'user', content: '窗户关闭时，将客厅空调设为制冷 26°C。仅限本次，不要自动等待或重试。' }];
  const frames = [buildRequestFrame(messages)];
  // 模拟模型响应与工具分发。session/request 由受信应用注入，不来自模型参数。
  function exchange(id, name, input) {
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id, name, input: clone(input) }] });
    const result = name === 'read_room_state' ? server.readRoomState(session, request, input)
      : server.setRoomClimate(session, request, input);
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: id,
      content: JSON.stringify(result), ...(result.ok ? {} : { is_error: true }) }] });
    frames.push(buildRequestFrame(messages));
    return result;
  }
  const action = (read, operation_id) => ({ ...target,
    read_receipt: read.read_receipt, expected_version: read.state.version, operation_id });
  const oldRead = exchange('read-1', 'read_room_state', { room });
  log(`读取：${oldRead.state.version}，窗户=${oldRead.state.window}，空调=${oldRead.state.aircon}`);
  server.observe({ window: 'open' });
  const rejected = exchange('set-1', 'set_room_climate', action(oldRead, 'operation-1'));
  log(`执行前开窗：${rejected.code}，最新=${rejected.latest.version}/${rejected.latest.window}，设备写入=${server.inspect().writes}`);
  messages.push({ role: 'assistant', content: '窗户已打开，本次未执行且授权已结束。不会等关窗后自动执行。' });
  server.observe({ window: 'closed' });
  messages.push({ role: 'user', content: '这是一次新的请求：窗户关闭时，将客厅空调设为制冷 26°C。' });
  request = server.authorizeUserRequest(session, target);
  const freshRead = exchange('read-2', 'read_room_state', { room });
  const input = action(freshRead, 'operation-2');
  const applied = exchange('set-2', 'set_room_climate', input);
  const duplicate = server.setRoomClimate(session, request, input); // 模拟相同操作重复投递。
  log(`用户明确新请求并重读：${freshRead.state.version}/${freshRead.state.window} → ${applied.code}，制冷=${applied.state.temperature_c}°C`);
  log(`同一操作重复投递：duplicate=${duplicate.duplicate}，累计设备写入=${server.inspect().writes}`);
  for (const check of inspectFrames(frames)) log(`请求帧结构：${JSON.stringify(check)}`);
  log('边界：以上仅是本地结构检查，不是 token 缓存命中率；未调用模型或 HA，不验证真实设备和分布式原子性。');
  return { frames, oldRead, rejected, freshRead, applied, duplicate, final: server.inspect() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runDemo();
