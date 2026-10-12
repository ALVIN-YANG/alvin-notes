import { splitSpeechText } from './article-speech.mjs';
import { chooseSpeechVoice } from './speech-voices.mjs';

export const PROGRESS_KEY = 'alvin-ai-concepts-progress-v1';
const DAY = 86400000;
const intervals = [1, 3, 7, 14, 30, 60];
export const categories = { model: '模型与生成', training: '训练与适配', retrieval: '知识与检索', context: '上下文与记忆', agent: 'Agent 与工具', quality: '评测与安全', multimodal: '多模态', data: '数据与学习', fundamentals: '基础与数学', research: '论文术语' };

export function searchKey(text = '') {
  return text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function revision(term) {
  let hash = 2166136261;
  for (const character of `${term.definition}|${term.contrast}`) hash = Math.imul(hash ^ character.codePointAt(0), 16777619);
  return (hash >>> 0).toString(16);
}

export function readProgress(value, terms) {
  const data = typeof value === 'string' ? JSON.parse(value) : value;
  if (data?.version !== 1 || !data.records || typeof data.records !== 'object' || Array.isArray(data.records)) throw new Error('复习记录格式不正确');
  const known = new Set(terms.map(term => term.id));
  const records = {};
  for (const [id, record] of Object.entries(data.records)) {
    if (!known.has(id) || !record || !Number.isInteger(record.level) || record.level < 0 || record.level > intervals.length || !Number.isFinite(record.lastReviewed) || !Number.isFinite(record.nextDue) || record.lastReviewed < 0 || record.nextDue < record.lastReviewed || typeof record.revision !== 'string') continue;
    records[id] = { level: record.level, lastReviewed: record.lastReviewed, nextDue: record.nextDue, revision: record.revision };
  }
  return { version: 1, records };
}

export function rateTerm(term, old, recalled, now = Date.now()) {
  // Repeated ratings on the same day cannot stretch the next interval.
  const sameDay = old && new Date(old.lastReviewed).toDateString() === new Date(now).toDateString();
  const unchanged = old?.revision === revision(term);
  const level = recalled ? Math.min(intervals.length, sameDay && unchanged && old.level ? old.level : (unchanged ? old.level : 0) + 1) : 0;
  return { level, lastReviewed: now, nextDue: now + (recalled ? intervals[level - 1] * DAY : 10 * 60000), revision: revision(term) };
}

export function reviewQueue(terms, records, now = Date.now(), limit = 10) {
  const due = terms.filter(term => records[term.id] && (records[term.id].nextDue <= now || records[term.id].revision !== revision(term)))
    .sort((a, b) => records[a.id].nextDue - records[b.id].nextDue);
  const fresh = terms.filter(term => !records[term.id]);
  return [...due, ...fresh].slice(0, limit);
}

const speaker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? escapeHtml(url.href) : ''; } catch { return ''; } };
const speechButton = term => `<button type="button" class="ac-speak" data-speak="${escapeHtml(term.id)}" aria-label="朗读 ${escapeHtml(term.term)}" aria-pressed="false" title="播放英文名词发音">${speaker}</button>`;

export function createConceptSpeech(view, onState) {
  const synth = view?.speechSynthesis;
  synth?.getVoices?.();
  let generation = 0, current = null, active = null;
  function stop(message = '') {
    generation++;
    const hadActive = active !== null;
    active = null;
    current = null;
    if (hadActive) synth?.cancel();
    onState(null, message, false);
  }
  function toggle(term) {
    if (!synth || !view.SpeechSynthesisUtterance) { onState(null, '此浏览器不支持朗读。可以使用 Chrome、Edge 或 Safari。', true); return; }
    if (active === term.id) { stop('已停止朗读'); return; }
    stop();
    active = term.id;
    const run = generation;
    const chunks = splitSpeechText(term.term);
    const voices = synth.getVoices?.() || [];
    const voice = chooseSpeechVoice(voices, 'en-US');
    if (voices.length && !voice) {
      stop();
      onState(null, '此设备没有可用的常规英语语音，请安装英语声音或使用其他浏览器。', true);
      return;
    }
    let index = 0;
    onState(active, `正在朗读 ${term.term}`, false);
    synth.cancel();
    synth.resume();
    function next() {
      if (run !== generation) return;
      if (index >= chunks.length) { stop('朗读结束'); return; }
      const utterance = new view.SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = (voice?.lang || 'en-US').replace(/_/gu, '-');
      if (voice) utterance.voice = voice;
      current = utterance;
      utterance.onend = () => { if (run !== generation || current !== utterance) return; index++; next(); };
      utterance.onerror = event => {
        if (run !== generation || current !== utterance) return;
        stop();
        onState(null, event.error === 'not-allowed' ? '浏览器未允许朗读，请再次点击或检查网站权限。' : '朗读暂不可用，请检查浏览器或系统语音设置。', true);
      };
      try { synth.speak(utterance); } catch { stop(); onState(null, '朗读暂不可用，请检查系统语音设置。', true); }
    }
    next();
  }
  return { toggle, stop };
}

export function mountConcepts(root, data) {
  const document = root.ownerDocument, view = document.defaultView;
  const terms = data.terms, byId = new Map(terms.map(term => [term.id, term]));
  const find = selector => root.querySelector(selector);
  const browse = find('[data-browse]'), detail = find('[data-detail]'), review = find('[data-review]');
  const grid = find('[data-grid]'), search = find('[data-search]'), category = find('[data-category]'), sort = find('[data-sort]');
  const status = find('[data-status]'), count = find('[data-count]'), pageLabel = find('[data-page-label]');
  let progress = { version: 1, records: {} }, page = 0, mode = 'browse', queue = [], reviewIndex = 0, returnId = null;
  const searchIndex = new Map(terms.map(term => [term.id, searchKey([term.term, term.zh, ...term.aliases, term.summary].join(' '))]));
  const events = new view.AbortController();
  const listen = (element, event, handler) => element.addEventListener(event, handler, { signal: events.signal });
  function announce(message, error = false) {
    for (const element of [status, detail.querySelector('[data-detail-status]')]) {
      if (!element) continue;
      element.textContent = message;
      element.classList.toggle('ac-sr-only', !error);
    }
  }
  try { const saved = view.localStorage.getItem(PROGRESS_KEY); if (saved) progress = readProgress(saved, terms); }
  catch { announce('无法读取已保存的复习记录。本次仍可学习。', true); }
  function persist() {
    let saved = true;
    try { view.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); }
    catch { saved = false; announce('浏览器无法保存记录。本次进度仍在，离开后可能丢失。', true); }
    updateProgress();
    return saved;
  }
  function updateProgress() {
    const reviewed = Object.keys(progress.records).length;
    const due = terms.filter(term => progress.records[term.id] && (progress.records[term.id].nextDue <= Date.now() || progress.records[term.id].revision !== revision(term))).length;
    find('[data-progress]').textContent = reviewed ? `已练 ${reviewed} 个 · 待复习 ${due} 个` : '复习记录保存在此浏览器';
  }
  const speech = createConceptSpeech(view, (id, message, error) => {
    root.querySelectorAll('[data-speak]').forEach(button => {
      const playing = button.dataset.speak === id;
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', `${playing ? '停止朗读' : '朗读'} ${byId.get(button.dataset.speak)?.term || ''}`);
      button.title = playing ? '停止朗读' : '播放英文名词发音';
    });
    announce(message, error);
  });
  function filtered() {
    const key = searchKey(search.value);
    const result = terms.filter(term => (!category.value || term.category === category.value) && (!key || searchIndex.get(term.id).includes(key)));
    if (sort.value === 'latest') result.sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt) || a.priority - b.priority);
    if (sort.value === 'name') result.sort((a, b) => a.term.localeCompare(b.term, 'en'));
    return result;
  }
  function renderBrowse() {
    const result = filtered();
    const pages = Math.max(1, Math.ceil(result.length / 12));
    page = Math.min(page, pages - 1);
    grid.innerHTML = result.slice(page * 12, page * 12 + 12).map(term => `<article class="ac-card">
      ${speechButton(term)}<button type="button" class="ac-card-open" data-open="${escapeHtml(term.id)}"><span class="ac-term">${escapeHtml(term.term)}</span><span class="ac-zh">${escapeHtml(term.zh)}</span><span class="ac-summary">${escapeHtml(term.summary)}</span><span class="ac-card-foot">${escapeHtml(term.scope === '论文术语' ? '论文术语' : categories[term.category])}<span aria-hidden="true">↗</span></span></button></article>`).join('');
    if (!result.length) grid.innerHTML = '<p class="ac-empty">没有匹配的词条。试试英文全称、缩写或中文名。</p>';
    count.textContent = `${result.length} 个概念`;
    pageLabel.textContent = `${page + 1} / ${pages}`;
    find('[data-prev]').disabled = page === 0;
    find('[data-next]').disabled = page >= pages - 1;
    find('[data-pagination]').hidden = pages <= 1;
    updateProgress();
  }
  function show(next) {
    closeTerm(); mode = next;
    browse.hidden = next !== 'browse'; review.hidden = next !== 'review';
    root.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-current', button.dataset.mode === next ? 'page' : 'false'));
  }
  function closeTerm() {
    speech.stop();
    if (detail.open) detail.close();
    document.documentElement.classList.remove('ac-dialog-open');
  }
  function openTerm(id) {
    const term = byId.get(id); if (!term) return;
    returnId = id; speech.stop();
    const sources = term.sources.map(source => `<a href="${safeUrl(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)} ↗</a>`).join('');
    detail.innerHTML = `<article class="ac-detail-card">
      <div class="ac-detail-head"><div><p class="ac-eyebrow">${escapeHtml(categories[term.category])} · ${escapeHtml(term.scope)}</p><h2 id="ac-detail-title" tabindex="-1">${escapeHtml(term.term)}</h2><p class="ac-zh">${escapeHtml(term.zh)}</p></div><div class="ac-detail-actions">${speechButton(term)}<button type="button" class="ac-close" data-close-detail aria-label="关闭概念详情" title="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></div>
      <div class="ac-definition">${term.definition.split('\n\n').map(text => `<p>${escapeHtml(text)}</p>`).join('')}</div>
      ${term.example ? `<section class="ac-note"><h3>一个例子</h3><p>${escapeHtml(term.example)}</p></section>` : ''}
      ${term.contrast ? `<section class="ac-note"><h3>别混淆</h3><p>${escapeHtml(term.contrast)}</p></section>` : ''}
      <button type="button" class="ac-primary" data-practice="${escapeHtml(term.id)}">练习这个概念</button>
      <p class="ac-status ac-sr-only" data-detail-status role="status" aria-live="polite"></p>
      <details class="ac-term-sources"><summary>来源与原文</summary><div>${sources}</div>${term.upstreamDefinition ? `<p class="ac-upstream">Google 中文原文节选：${escapeHtml(term.upstreamDefinition)}</p>` : ''}</details>
    </article>`;
    if (!detail.open) detail.showModal();
    document.documentElement.classList.add('ac-dialog-open');
    detail.scrollTop = 0;
    detail.querySelector('h2').focus({ preventScroll: true });
  }
  function returnBrowse() {
    show('browse'); renderBrowse();
    const button = [...root.querySelectorAll('[data-open]')].find(element => element.dataset.open === returnId);
    (button || search).focus();
  }
  function renderReview() {
    const term = queue[reviewIndex];
    if (!term) {
      review.innerHTML = `<div class="ac-review-complete"><p class="ac-eyebrow">${queue.length ? '这一组完成了' : '暂时没有待复习项'}</p><h2 tabindex="-1">${queue.length ? `过了 ${queue.length} 个概念` : '可以继续查概念'}</h2><p>${queue.length ? '已按自评安排下次复习。下一组优先复习到期词条，再补入新词。' : '已练过的词条会在到期后出现，也可以从详情中单独复习。'}</p><button class="ac-primary" type="button" data-restart aria-label="继续下一组">继续下一组 <kbd>Enter</kbd></button><button class="ac-back" type="button" data-back>返回卡片</button></div>`;
    } else {
      const now = Date.now(), old = progress.records[term.id];
      const days = Math.round((rateTerm(term, old, true, now).nextDue - now) / DAY);
      review.innerHTML = `<div class="ac-review-top"><span>${reviewIndex + 1} / ${queue.length} · 到期优先</span><button type="button" class="ac-back" data-back aria-label="退出复习">退出复习 <kbd>Esc</kbd></button></div><article class="ac-flashcard">
        <div class="ac-review-term"><div><h2 tabindex="-1">${escapeHtml(term.term)}</h2><p class="ac-zh">${escapeHtml(term.zh)}</p></div>${speechButton(term)}</div>
        <div class="ac-answer"><p>${escapeHtml(term.definition)}</p>${term.contrast ? `<p class="ac-answer-contrast">${escapeHtml(term.contrast)}</p>` : ''}</div>
        <div class="ac-rating"><button type="button" data-rate="again" aria-label="不知道" aria-keyshortcuts="ArrowLeft 1"><span>不知道 <kbd>← / 1</kbd></span><small>10 分钟后复习</small></button><button type="button" class="ac-primary" data-rate="recalled" aria-label="知道" aria-keyshortcuts="ArrowRight 2"><span>知道 <kbd>→ / 2</kbd></span><small>${days} 天后复习</small></button></div>
      </article>`;
    }
    (review.querySelector('[data-restart]') || review.querySelector('h2')).focus({ preventScroll: true });
  }
  function startReview(id) {
    show('review'); queue = id ? [byId.get(id)] : reviewQueue(terms.filter(term => !category.value || term.category === category.value), progress.records);
    reviewIndex = 0; renderReview();
    review.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function rateCurrent(recalled) {
    const term = queue[reviewIndex];
    if (mode !== 'review' || !term) return;
    speech.stop();
    progress.records[term.id] = rateTerm(term, progress.records[term.id], recalled);
    persist(); reviewIndex++; renderReview();
  }
  listen(root, 'click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.speak) { speech.toggle(byId.get(button.dataset.speak)); return; }
    if (button.dataset.open) { openTerm(button.dataset.open); return; }
    if (button.hasAttribute('data-close-detail')) { closeTerm(); return; }
    if (button.hasAttribute('data-back') || button.dataset.mode === 'browse') { returnBrowse(); return; }
    if (button.dataset.mode === 'review' || button.hasAttribute('data-restart')) { startReview(); return; }
    if (button.dataset.practice) { startReview(button.dataset.practice); return; }
    if (button.dataset.rate) { rateCurrent(button.dataset.rate === 'recalled'); return; }
    if (button.hasAttribute('data-prev') || button.hasAttribute('data-next')) {
      speech.stop(); page += button.hasAttribute('data-prev') ? -1 : 1; renderBrowse();
      grid.querySelector('[data-open]')?.focus(); view.scrollTo({ top: browse.offsetTop, behavior: 'instant' });
    }
  });
  for (const [element, event] of [[search, 'input'], [category, 'change'], [sort, 'change']]) listen(element, event, () => { speech.stop(); page = 0; renderBrowse(); });
  // A drag that starts inside the content must not dismiss the dialog.
  let backdropDown = false;
  const onBackdrop = event => {
    const rect = detail.getBoundingClientRect();
    return event.target === detail && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  listen(detail, 'pointerdown', event => { backdropDown = onBackdrop(event); });
  listen(detail, 'click', event => { if (backdropDown && onBackdrop(event)) closeTerm(); backdropDown = false; });
  listen(detail, 'close', () => { speech.stop(); document.documentElement.classList.remove('ac-dialog-open'); });
  listen(detail, 'keydown', event => {
    if (event.key !== 'Tab') return;
    const targets = [...detail.querySelectorAll('button, a[href], summary')].filter(element => element.getClientRects().length && (!element.closest('details:not([open])') || element.tagName === 'SUMMARY'));
    const first = targets[0], last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  listen(root, 'keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (event.key === 'Escape' && mode === 'review') { event.preventDefault(); returnBrowse(); return; }
    if (mode !== 'review' || detail.open || !queue[reviewIndex]) return;
    const ratings = { ArrowLeft: false, '1': false, ArrowRight: true, '2': true };
    if (!Object.hasOwn(ratings, event.key)) return;
    event.preventDefault();
    if (!event.repeat) rateCurrent(ratings[event.key]);
  });
  listen(view, 'pagehide', () => speech.stop());
  root.querySelectorAll('[data-enhanced]').forEach(element => { element.hidden = false; });
  renderBrowse();
  return () => { events.abort(); closeTerm(); };
}
