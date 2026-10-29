import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { buildConcepts, parseGoogleGlossary, validateConcepts } from '../scripts/ai-concepts-core.mjs';
import { atomicJsonWrite, fetchSource, generateJson, parseArxivFeed, refreshTranslations, validateDiscoveredTerms } from '../scripts/sync-ai-concepts.mjs';
import { chooseSpeechVoice as chooseEnglishVoice } from '../src/lib/speech-voices.mjs';
import { createConceptSpeech, mountConcepts, rateTerm, readProgress, reviewQueue, revision, searchKey } from '../src/lib/ai-concepts.mjs';

const term = { id: 'rag', term: 'RAG', zh: '检索增强生成', aliases: ['Retrieval-augmented generation'], definition: '先找资料，再把资料交给模型生成回答。', contrast: 'RAG 提供资料，微调更新参数。', summary: '先检索资料，再依据资料回答', category: 'retrieval', priority: 0, sources: [{ title: '来源', url: 'https://example.com/terms' }] };

test('Google parser isolates definitions, preserves stable anchors and detects legacy aliases', () => {
  const html = '<div class="devsite-article-body"><h2 id="l">L</h2><h2 id="lora">LoRA</h2><p>Abbreviation for <a href="#Low-Rank-Adaptability">low-rank adaptability</a>.</p><h2 id="low-rank-adaptability-lora">low-rank adaptability (LoRA)</h2><div>#generativeAI</div><p>Freeze base weights and train adapters.</p><pre>do not import code</pre><h2 id="context-window">context window</h2><p>The current request capacity.</p></div>';
  const parsed = parseGoogleGlossary(html);
  assert.equal(parsed.entries.length, 3);
  assert.equal(parsed.entries[0].aliasOf, 'Low-Rank-Adaptability');
  assert.deepEqual(parsed.entries[1].paragraphs, ['Freeze base weights and train adapters.']);
  const filler = Array.from({ length: 300 }, (_, i) => ({ id: `fill-${i}`, name: `fill ${i}`, paragraphs: ['中文定义。'], tags: [], aliasOf: null }));
  const english = { entries: [...parsed.entries, ...filler], updatedAt: null };
  const chinese = { entries: english.entries.map(entry => ({ ...entry, name: `中文 ${entry.id}`, paragraphs: ['中文定义。'] })), updatedAt: null };
  const curated = [{ ...term, id: 'lora', googleId: 'lora', term: 'LoRA' }, { ...term, id: 'context', term: 'Context', googleId: null }];
  const data = buildConcepts({ english, chinese, curated, now: '2026-10-12T00:00:00Z' });
  assert.equal(data.terms.filter(entry => entry.term === 'LoRA').length, 1);
  assert.equal(data.terms.find(entry => entry.id === 'context').term, 'Context');
  assert(data.terms.some(entry => entry.id === 'google:context-window'));
  const next = buildConcepts({ english, chinese, curated, previous: JSON.parse(JSON.stringify(data)), now: '2026-10-19T00:00:00Z' });
  assert.deepEqual(next, data, 'an unchanged sync must not produce a fresh update date or reset IDs');
  const adopted = JSON.parse(JSON.stringify(data));
  const imported = adopted.terms.find(entry => entry.id === 'google:fill-0');
  imported.id = 'huggingface:fill-0';
  imported.sources = [{ sourceId: 'huggingface', title: 'HF', url: 'https://huggingface.co/docs/transformers/glossary' }];
  const merged = buildConcepts({ english, chinese, curated, previous: adopted, now: '2026-10-19T00:00:00Z' });
  assert.equal(merged.terms.filter(entry => entry.term === 'fill 0').length, 1);
  assert(merged.terms.some(entry => entry.id === 'huggingface:fill-0'), 'a concept adopted by another source keeps its prior learning ID');
  const excluded = buildConcepts({ english, chinese, curated, previous: data, excluded: [{ term: 'fill 0', reason: 'unrelated domain metric' }] });
  assert(!excluded.terms.some(entry => entry.term === 'fill 0'), 'an excluded concept must not reappear through previous-entry retention');
  assert.throws(() => buildConcepts({ english: { entries: [] }, chinese, curated }), /数量异常/u);
});

test('published dataset has Chinese definitions and distinct core concepts', async () => {
  const data = validateConcepts(JSON.parse(await readFile(new URL('../src/data/ai-concepts.json', import.meta.url), 'utf8')));
  for (const id of ['mcp', 'memory', 'context', 'lora', 'rag', 'finetuning', 'kvcache', 'contexteng']) assert(data.terms.some(entry => entry.id === id));
  assert(data.terms.every(entry => /\p{Script=Han}/u.test(entry.summary)));
  assert.equal(searchKey('Fine–tuning 微调'), searchKey('fine tuning微调'));
});

test('failed source requests never return error pages as definitions; JSON publication replaces atomically', async t => {
  let calls = 0;
  await assert.rejects(fetchSource('https://example.com', { attempts: 1, fetcher: async () => { calls++; return { ok: false, status: 503 }; } }), /503/u);
  assert.equal(calls, 1);
  const directory = await mkdtemp(path.join(tmpdir(), 'ai-concepts-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = pathToFileURL(path.join(directory, 'data.json'));
  await atomicJsonWrite(file, { stable: true });
  await assert.rejects(atomicJsonWrite(file, { cyclic: (() => { const v = {}; v.self = v; return v; })() }));
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), { stable: true });
});

test('new term discovery requires literal source evidence and keeps paper scope and controlled source URL', () => {
  const materials = [{ title: 'A paper', text: 'We propose Source Anchored Routing for agent systems.', scope: '论文术语', url: 'https://arxiv.org/abs/2610.00001' }];
  const entry = { term: 'Source Anchored Routing', zh: '来源锚定路由', summary: '该论文提出的一种路由方法。', definition: '该论文用来源约束路由选择。', category: 'agent', sourceIndex: 0, url: 'https://unrelated.example.com' };
  const found = validateDiscoveredTerms({ terms: [entry, { ...entry, term: 'Invented Concept' }, { ...entry, definition: '' }] }, materials, [term], '2026-10-12T00:00:00Z');
  assert.equal(found.length, 1);
  assert.equal(found[0].category, 'research');
  assert.equal(found[0].sources[0].url, materials[0].url);
  assert.equal(validateDiscoveredTerms({ terms: [entry] }, materials, [term], '2026-10-12T00:00:00Z', [{ term: entry.term }]).length, 0);
  const feed = published => `<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2610.00001</id><published>${published}</published><title>Paper</title><summary>Abstract</summary></entry></feed>`;
  const now = Date.parse('2026-10-12T00:00:00Z');
  assert.equal(parseArxivFeed(feed('2026-10-10T00:00:00Z'), now).length, 1);
  for (const date of ['invalid', '2026-11-01T00:00:00Z', '2026-09-01T00:00:00Z']) assert.equal(parseArxivFeed(feed(date), now).length, 0);
});

test('generation falls back to the existing compatible provider and fails closed for invalid JSON', async () => {
  const env = { DEEPSEEK_API_KEY: 'test-only', OPENAI_API_KEY: 'test-only', OPENAI_BASE_URL: 'https://example.com/v1', OPENAI_MODEL: 'test-model' };
  const urls = [];
  const result = await generateJson('整理资料', [], { env, fetcher: async (url, options) => {
    urls.push(url);
    const request = JSON.parse(options.body);
    if (urls.length === 1) { assert.equal(request.thinking.type, 'disabled'); return { ok: false, status: 402, json: async () => ({ error: { message: 'test-only payment failure' } }) }; }
    // Some configured compatible providers support chat completions but reject JSON mode.
    if (request.response_format) return { ok: false, status: 400, json: async () => ({ error: { message: 'unsupported parameter' } }) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"terms":[]}' } }] }) };
  } });
  assert.deepEqual(result, { terms: [] });
  assert.equal(urls.length, 2);
  await assert.rejects(generateJson('整理资料', [], { env, fetcher: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'invalid' } }] }) }) }), /JSON 无效/u);
});

test('existing HF entries update when their source changes, without translating unchanged entries again', async () => {
  const entry = { id: 'new-concept', name: 'New concept', paragraphs: ['Updated technical definition.'] };
  const old = { 'new-concept': { zh: '旧释义', summary: '旧释义。', sourceHash: 'old' } };
  const existing = { ...term, id: 'huggingface:new-concept', term: entry.name, sources: [{ sourceId: 'huggingface' }] };
  let calls = 0;
  const generate = async () => { calls++; return { terms: [{ id: entry.id, zh: '新概念', summary: '更新后的中文释义。', definition: '更新后的中文定义。', category: 'model' }] }; };
  const updated = await refreshTranslations([entry], old, [existing], { generate });
  assert.equal(calls, 1);
  assert.equal(updated[entry.id].summary, '更新后的中文释义。');
  await refreshTranslations([entry], updated, [existing], { generate });
  assert.equal(calls, 1);
});

test('self ratings schedule spaced practice; same-day repetition cannot claim longer retention', () => {
  const now = Date.parse('2026-10-12T00:00:00Z');
  const first = rateTerm(term, null, true, now);
  assert.equal(first.nextDue, now + 86400000);
  const repeated = rateTerm(term, first, true, now + 1000);
  assert.equal(repeated.level, 1);
  const second = rateTerm(term, first, true, now + 86400000);
  assert.equal(second.level, 2);
  assert.equal(second.nextDue, now + 4 * 86400000);
  const failed = rateTerm(term, second, false, now + 86400000);
  assert.equal(failed.level, 0);
  assert.equal(failed.nextDue, now + 86400000 + 600000);
  assert.deepEqual(reviewQueue([term], { rag: first }, now), []);
  assert.deepEqual(reviewQueue([term], { rag: first }, now + 86400000), [term]);
  const changed = { ...term, definition: '更新过的定义。' };
  assert.deepEqual(reviewQueue([changed], { rag: first }, now), [changed]);
  assert.equal(rateTerm(changed, second, true, now + 2 * 86400000).level, 1);
});

test('progress imports keep only valid known IDs and retain records across dataset updates', () => {
  const record = { level: 1, lastReviewed: 1000, nextDue: 86401000, revision: revision(term) };
  const imported = readProgress(JSON.stringify({ version: 1, records: { rag: record, removed: record, bad: { ...record, level: 999 } } }), [term, { ...term, id: 'bad' }]);
  assert.deepEqual(imported.records, { rag: record });
  assert.throws(() => readProgress('{broken', [term]));
  assert.throws(() => readProgress({ version: 2, records: {} }, [term]));
});

test('term audio reads the English name only and cancelled callbacks cannot continue playback', () => {
  const calls = [], states = [];
  const voice = { name: 'Samantha', lang: 'en-US' };
  const view = { SpeechSynthesisUtterance: class { constructor(text) { this.text = text; this.voice = null; } }, speechSynthesis: { getVoices: () => [{ name: 'Albert', lang: 'en-US' }, voice], cancel() {}, resume() {}, speak(utterance) { calls.push(utterance); } } };
  const speech = createConceptSpeech(view, (...state) => states.push(state));
  assert.equal(calls.length, 0);
  speech.toggle(term);
  assert.equal(calls[0].voice, voice);
  assert.equal(calls[0].text, term.term);
  assert.equal(calls[0].lang, 'en-US');
  calls[0].onend();
  assert.equal(calls.length, 1, 'finishing the name must not start its introduction');
  assert.equal(states.at(-1)[1], '朗读结束');
  speech.toggle(term);
  const cancelled = calls[1];
  speech.toggle(term);
  cancelled.onend();
  assert.equal(calls.length, 2);
  speech.toggle(term);
  const old = calls[2];
  speech.toggle({ ...term, id: 'other', term: 'Other' });
  old.onend(); old.onerror({ error: 'canceled' });
  assert.equal(calls.length, 4);
  assert.equal(states.at(-1)[0], 'other');
  speech.stop();
  const unsupported = createConceptSpeech({}, (...state) => states.push(state));
  unsupported.toggle(term);
  assert.equal(states.at(-1)[2], true);
});

test('finishing a term does not cancel its audio tail', () => {
  let cancels = 0, utterance;
  const view = { SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { getVoices: () => [], cancel() { cancels++; }, resume() {}, speak(value) { utterance = value; } } };
  const speech = createConceptSpeech(view, () => {});
  speech.toggle(term);
  const beforeEnd = cancels;
  utterance.onend();
  assert.equal(cancels, beforeEnd, 'natural completion must not cancel the audio output');
});

test('English speech avoids Chinese defaults and novelty voices, and prefers natural voices when available', () => {
  const chinese = { name: 'Tingting', lang: 'zh-CN', default: true };
  const novelty = { name: 'Zarvox', lang: 'en-US', default: true };
  const standard = { name: 'Samantha', lang: 'en-US' };
  const neural = { name: 'Microsoft Jenny Online (Natural)', lang: 'en-US' };
  assert.equal(chooseEnglishVoice([chinese, novelty, standard]), standard);
  assert.equal(chooseEnglishVoice([standard, neural]), neural);
  const british = { name: 'Daniel', lang: 'en-GB' };
  assert.equal(chooseEnglishVoice([novelty, british]), british);
  assert.equal(chooseEnglishVoice([chinese]), null);
});

test('an initially empty browser voice list still reads the name in English', () => {
  const calls = [];
  const view = { SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } }, speechSynthesis: { getVoices: () => [], cancel() {}, resume() {}, speak: utterance => calls.push(utterance) } };
  createConceptSpeech(view, () => {}).toggle(term);
  assert.equal(calls[0].text, term.term);
  assert.equal(calls[0].lang, 'en-US');
});

test('known non-English or novelty-only voice lists do not silently use the wrong voice', () => {
  const calls = [], states = [];
  const view = { SpeechSynthesisUtterance: class {}, speechSynthesis: { getVoices: () => [{ name: 'Tingting', lang: 'zh-CN' }, { name: 'Zarvox', lang: 'en-US' }], cancel() {}, resume() {}, speak: utterance => calls.push(utterance) } };
  createConceptSpeech(view, (...state) => states.push(state)).toggle(term);
  assert.equal(calls.length, 0);
  assert.equal(states.at(-1)[2], true);
});

function uiFixture(t, entry, blocked = false, { records, speech } = {}) {
  const dom = new JSDOM(`<div data-concepts-root><button data-mode="browse"></button><button data-mode="review"></button>
    <section data-browse><p data-learning-summary></p><button data-start-learning>开始学习</button><input data-search>
      <details data-filter="category"><summary><span data-filter-label>全部分类</span></summary><input type="hidden" data-category value="">
        <div><button data-choice="" aria-pressed="true">全部分类</button><button data-choice="model" aria-pressed="false">模型与生成</button><button data-choice="retrieval" aria-pressed="false">知识与检索</button></div>
      </details>
      <details data-filter="sort"><summary><span data-filter-label>常用优先</span></summary><input type="hidden" data-sort value="common">
        <div><button data-choice="common" aria-pressed="true">常用优先</button><button data-choice="name" aria-pressed="false">英文排序</button></div>
      </details>
      <span data-count></span><div data-grid></div><nav data-pagination><button data-prev></button><span data-page-label></span><button data-next></button></nav>
    </section><dialog data-detail aria-labelledby="ac-detail-title"></dialog><section data-review hidden></section><span data-progress></span><p data-status class="ac-sr-only"></p></div>`, { url: 'https://blog.mlxb.cc/ai-concepts/' });
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  if (blocked) Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('storage blocked'); } });
  if (records) dom.window.localStorage.setItem('alvin-ai-concepts-progress-v1', JSON.stringify({ version: 1, records }));
  if (speech) {
    dom.window.speechSynthesis = speech;
    dom.window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  }
  const root = dom.window.document.querySelector('[data-concepts-root]');
  // JSDOM does not implement the browser's dialog lifecycle.
  const dialog = root.querySelector('[data-detail]');
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new dom.window.Event('close')); };
  const dispose = mountConcepts(root, { terms: (Array.isArray(entry) ? entry : [entry]).map(item => ({ ...item, firstSeenAt: '2026-10-12T00:00:00Z' })) });
  t.after(() => { dispose(); dom.window.close(); });
  return root;
}

test('learning entry starts the selected category and shows due terms in its summary', t => {
  const token = { ...term, id: 'token', term: 'Token', category: 'model' };
  const root = uiFixture(t, [token, term], false, { records: { rag: { level: 1, lastReviewed: 1, nextDue: 1, revision: revision(term) } } });
  assert(root.querySelector('[data-learning-summary]').textContent.includes('1 个待巩固'));
  const dropdown = root.querySelector('[data-filter="category"]');
  dropdown.open = true;
  dropdown.querySelector('[data-choice="retrieval"]').click();
  assert.equal(root.querySelector('[data-count]').textContent, '1 个概念');
  assert.equal(dropdown.querySelector('[data-filter-label]').textContent, '知识与检索');
  assert.equal(dropdown.querySelector('[data-choice="retrieval"]').getAttribute('aria-pressed'), 'true');
  assert.equal(dropdown.open, false);
  root.querySelector('[data-start-learning]').click();
  assert.equal(root.querySelector('[data-browse]').hidden, true);
  assert.equal(root.querySelector('[data-review] h2').textContent, 'RAG');
  assert(root.querySelector('.ac-review-position').textContent.includes('1 / 1'));
});

test('filter menus support keyboard focus, dismissal and sorting without changing progress', t => {
  const token = { ...term, id: 'token', term: 'Token', category: 'model' };
  const root = uiFixture(t, [token, term]), view = root.ownerDocument.defaultView;
  const dropdown = root.querySelector('[data-filter="category"]'), summary = dropdown.querySelector('summary');
  const press = key => root.ownerDocument.activeElement.dispatchEvent(new view.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  summary.focus(); press('ArrowDown');
  assert.equal(dropdown.open, true);
  assert.equal(root.ownerDocument.activeElement.dataset.choice, '');
  press('End');
  assert.equal(root.ownerDocument.activeElement.dataset.choice, 'retrieval');
  press('Escape');
  assert.equal(dropdown.open, false);
  assert.equal(root.ownerDocument.activeElement, summary);
  dropdown.open = true;
  root.querySelector('[data-search]').click();
  assert.equal(dropdown.open, false);
  dropdown.open = true;
  root.querySelector('[data-search]').focus();
  assert.equal(dropdown.open, false, 'tabbing out closes the menu');
  const sort = root.querySelector('[data-filter="sort"]');
  sort.open = true;
  sort.querySelector('[data-choice="name"]').click();
  assert.deepEqual([...root.querySelectorAll('[data-open]')].map(button => button.dataset.open), ['rag', 'token']);
  assert.equal(sort.querySelector('[data-filter-label]').textContent, '英文排序');
  assert.equal(view.localStorage.getItem('alvin-ai-concepts-progress-v1'), null);
});

test('concept details preserve the browsing context and close before practice starts', t => {
  const root = uiFixture(t, term), search = root.querySelector('[data-search]');
  search.value = 'RAG';
  search.dispatchEvent(new root.ownerDocument.defaultView.Event('input'));
  const card = root.querySelector('[data-open]'), dialog = root.querySelector('[data-detail]');
  card.click();
  assert.equal(dialog.open, true);
  assert.equal(root.querySelector('[data-browse]').hidden, false);
  root.querySelector('[data-close-detail]').click();
  assert.equal(dialog.open, false);
  assert.equal(root.querySelector('[data-open]'), card);
  assert.equal(search.value, 'RAG');
  card.click();
  root.querySelector('[data-practice]').click();
  assert.equal(dialog.open, false);
  assert.equal(root.querySelector('[data-review]').hidden, false);
  assert.equal(root.ownerDocument.documentElement.classList.contains('ac-dialog-open'), false);
});

test('imported source prose renders as text instead of executable HTML', t => {
  const root = uiFixture(t, { ...term, definition: '中文定义 <img src=x onerror=alert(1)>', summary: '词条 <svg onload=alert(1)>' });
  assert.equal(root.querySelector('[data-grid] svg[onload]'), null);
  root.querySelector('[data-open]').click();
  assert.equal(root.querySelector('[data-detail] img'), null);
  assert(root.querySelector('.ac-definition').textContent.includes('<img'));
});

test('blocked browser storage leaves practice usable and keeps the save warning visible', t => {
  const root = uiFixture(t, term, true);
  root.querySelector('[data-mode="review"]').click();
  root.querySelector('[data-rate="recalled"]').click();
  assert(root.querySelector('[data-status]').textContent.includes('无法保存'));
  assert.equal(root.querySelector('[data-status]').classList.contains('ac-sr-only'), false);
  assert(root.querySelector('[data-progress]').textContent.includes('已学 1 个'));
});

test('quick review shows the answer and rates one card per deliberate shortcut', t => {
  const entries = [term, { ...term, id: 'token', term: 'Token' }, { ...term, id: 'llm', term: 'LLM' }];
  const root = uiFixture(t, entries), view = root.ownerDocument.defaultView;
  const records = () => JSON.parse(view.localStorage.getItem('alvin-ai-concepts-progress-v1')).records;
  const press = (key, options = {}) => root.querySelector('[data-review] h2').dispatchEvent(new view.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }));
  root.querySelector('[data-mode="review"]').click();
  assert.equal(root.querySelector('[data-reveal]'), null);
  assert(root.querySelector('.ac-answer').textContent.includes(term.definition));
  press('1');
  assert.equal(records().rag.level, 0);
  assert.equal(records().rag.nextDue - records().rag.lastReviewed, 600000);
  press('2', { repeat: true });
  press('ArrowRight', { ctrlKey: true });
  press('2', { isComposing: true });
  const input = root.ownerDocument.createElement('input');
  root.querySelector('[data-review]').append(input);
  input.dispatchEvent(new view.KeyboardEvent('keydown', { key: '2', bubbles: true }));
  assert.deepEqual(Object.keys(records()), ['rag']);
  input.remove();
  press('ArrowRight');
  assert.equal(records().token.level, 1);
  assert.equal(records().token.nextDue - records().token.lastReviewed, 86400000);
  press('Escape');
  assert.equal(root.querySelector('[data-review]').hidden, true);
  root.querySelector('[data-search]').dispatchEvent(new view.KeyboardEvent('keydown', { key: '1', bubbles: true }));
  assert.deepEqual(Object.keys(records()), ['rag', 'token']);
});

test('review arrows navigate, pronounce and correct ratings without accumulating levels', t => {
  const now = Date.now(), calls = [];
  const old = { level: 2, lastReviewed: now - 4 * 86400000, nextDue: now - 86400000, revision: revision(term) };
  const root = uiFixture(t, [term, { ...term, id: 'token', term: 'Token' }], false, {
    records: { rag: old },
    speech: { getVoices: () => [{ name: 'Samantha', lang: 'en-US' }], speak: utterance => calls.push(utterance), cancel() {}, resume() {} },
  });
  const view = root.ownerDocument.defaultView;
  const records = () => JSON.parse(view.localStorage.getItem('alvin-ai-concepts-progress-v1')).records;
  const press = (key, options = {}) => root.querySelector('[data-review] h2').dispatchEvent(new view.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }));
  root.querySelector('[data-mode="review"]').click();
  press('ArrowLeft');
  assert.deepEqual(records().rag, old, 'first-card navigation must not rate anything');
  press('ArrowUp');
  press('ArrowUp', { repeat: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].text, 'RAG');
  assert.equal(calls[0].lang, 'en-US');
  press('ArrowUp');
  assert.equal(calls.length, 2, 'another deliberate press replays the term');
  press('ArrowRight');
  assert.equal(records().rag.level, 3);
  press('ArrowDown');
  assert.equal(records().token.level, 0);
  assert.equal(records().token.nextDue - records().token.lastReviewed, 600000);
  const completed = records();
  press('ArrowLeft');
  assert.equal(root.querySelector('[data-review] h2').textContent, 'Token');
  assert.deepEqual(records(), completed, 'returning from completion must not rewrite ratings');
  root.querySelector('[data-review-prev]').click();
  assert.equal(root.querySelector('[data-review] h2').textContent, 'RAG');
  press('ArrowDown');
  assert.equal(records().rag.level, 0);
  press('ArrowLeft');
  press('ArrowRight');
  assert.equal(records().rag.level, 3, 'correcting an answer uses the pre-group state');
  assert.equal(records().rag.nextDue - records().rag.lastReviewed, 7 * 86400000);
  press('ArrowLeft');
  press('ArrowRight');
  assert.equal(records().rag.level, 3, 'going back and forward cannot advance another level');
});
