import { mountArticleReader } from './article-speech.mjs';
import { interviewModules, getInterviewModule, getInterviewTopic } from './interview-taxonomy.mjs';

// 保留原存储键，迁移旧方向与阅读位置；新记录按能力模块和二级专题保存。
const progressKey = 'alvin:interview-progress:v1';

export function mountInterviewBank(root) {
  const document = root.ownerDocument;
  const view = document.defaultView;
  const controller = new view.AbortController();
  const signal = controller.signal;
  const rows = [...root.querySelectorAll('[data-ib-question]')];
  const tagsByRow = new Map(rows.map(row => [row, JSON.parse(row.dataset.tags || '[]')]));
  const search = root.querySelector('[data-ib-search]');
  const topicSelect = root.querySelector('[data-ib-topic]');
  const tagSelect = root.querySelector('[data-ib-tag]');
  const reader = root.querySelector('[data-ib-reader]');
  const scroll = root.querySelector('[data-ib-scroll]');
  const prev = root.querySelector('[data-ib-prev]');
  const next = root.querySelector('[data-ib-next]');
  const catalog = root.querySelector('[data-ib-catalog-scroll]');
  const catalogToggle = root.querySelector('[data-ib-catalog-toggle]');
  const params = new URLSearchParams(view.location.search);
  let saved = {};
  try {
    const value = JSON.parse(view.localStorage.getItem(progressKey));
    if (value?.version === 1 || value?.version === 2) saved = value;
  } catch {}
  const linked = ['module', 'topic', 'tag', 'track', 'question', 'level', 'q'].some(key => params.has(key));
  const oldModule = track => track === 'infra' ? 'models' : track === 'agent' ? 'ai-agent' : 'all';
  const questionRow = params.has('question') ? rows.find(row =>
    row.dataset.id.split('/').at(-1) === params.get('question')
    && (!params.has('track') || row.dataset.track === params.get('track')),
  ) : undefined;
  const oldSavedRow = saved.version === 1 ? rows.find(row => row.dataset.id === saved.lastQuestions?.[saved.track]) : undefined;
  let module = linked
    ? params.get('module') || questionRow?.dataset.module || oldModule(params.get('track'))
    : saved.module || oldSavedRow?.dataset.module || oldModule(saved.track);
  if (module !== 'all' && !getInterviewModule(module)) module = 'all';
  if (questionRow && module !== 'all' && questionRow.dataset.module !== module) module = questionRow.dataset.module;
  let topic = linked ? params.get('topic') || '' : saved.topic || '';
  const topicModule = interviewModules.find(item => item.topics.some(item => item.id === topic));
  if (!topicModule || (module !== 'all' && topicModule.id !== module) || (questionRow && questionRow.dataset.topic !== topic)) topic = '';
  let tag = linked ? params.get('tag') || '' : typeof saved.tag === 'string' ? saved.tag : '';
  const initialLevel = linked ? params.get('level') : saved.level;
  let level = ['basic', 'intermediate', 'advanced'].includes(initialLevel) ? initialLevel : '';
  const scope = () => `${module}:${topic}`;
  const lastQuestions = {};
  const positions = {};
  rows.forEach(row => {
    const top = saved.positions?.[row.dataset.id];
    if (Number.isFinite(top) && top >= 0) positions[row.dataset.id] = top;
  });
  if (saved.version === 2) {
    for (const [key, id] of Object.entries(saved.lastQuestions || {})) {
      const row = rows.find(row => row.dataset.id === id);
      const [moduleId, topicId = ''] = key.split(':');
      if (row && (moduleId === 'all' || row.dataset.module === moduleId) && (!topicId || row.dataset.topic === topicId)) lastQuestions[key] = id;
    }
  } else if (oldSavedRow) {
    lastQuestions[`${oldSavedRow.dataset.module}:`] = oldSavedRow.dataset.id;
  }
  let selected = questionRow?.dataset.id || (!linked ? lastQuestions[scope()] : undefined);
  let visible = [];
  let cleanupReader = () => {};
  let rendered = false;
  let saveTimer;
  search.value = linked ? params.get('q') || '' : typeof saved.query === 'string' ? saved.query : '';

  function rememberPosition() {
    if (rendered && selected) positions[selected] = scroll.scrollTop;
  }

  function persist() {
    view.clearTimeout(saveTimer);
    rememberPosition();
    try {
      view.localStorage.setItem(progressKey, JSON.stringify({ version: 2, module, topic, tag, level, query: search.value, lastQuestions, positions }));
    } catch {}
  }

  function syncUrl() {
    const url = new URL(view.location.href);
    url.searchParams.delete('track');
    url.searchParams.set('module', module);
    for (const [key, value] of [['topic', topic], ['tag', tag], ['level', level], ['q', search.value.trim()], ['question', selected?.split('/').at(-1)]]) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    view.history.replaceState(null, '', url);
  }

  function select(row, { revealRow = false } = {}) {
    if (catalog) catalog.dataset.open = 'false';
    catalogToggle?.setAttribute('aria-expanded', 'false');
    const changed = selected !== row?.dataset.id || reader.dataset.readerContent !== (row ? `#${row.dataset.panel}` : '');
    if (changed) rememberPosition();
    selected = row?.dataset.id;
    if (row) lastQuestions[scope()] = selected;
    root.querySelectorAll('[data-ib-answer]').forEach(panel => { panel.hidden = panel.id !== row?.dataset.panel; });
    rows.forEach(item => {
      const link = item.querySelector('a');
      if (item === row) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
    });
    const index = visible.indexOf(row);
    root.querySelector('[data-ib-position]').textContent = visible.length ? `${index + 1} / ${visible.length}` : '0 / 0';
    prev.disabled = index <= 0;
    next.disabled = index < 0 || index === visible.length - 1;
    root.querySelector('[data-ib-reading-empty]').hidden = visible.length > 0;
    if (changed) {
      cleanupReader();
      scroll.scrollTop = positions[selected] || 0;
      if (row) {
        reader.dataset.readerContent = `#${row.dataset.panel}`;
        reader.dataset.readerTitle = '';
        cleanupReader = mountArticleReader(reader);
      } else {
        reader.dataset.readerContent = '';
        reader.hidden = true;
        cleanupReader = () => {};
      }
    }
    rendered = true;
    if (revealRow) row?.scrollIntoView?.({ block: 'nearest' });
    syncUrl();
    persist();
  }

  function option(value, label) {
    const item = document.createElement('option');
    item.value = value;
    item.textContent = label;
    return item;
  }

  function updateFacets(moduleRows) {
    topicSelect.replaceChildren(option('', '全部二级专题'));
    for (const item of interviewModules.filter(item => module === 'all' || item.id === module)) {
      const group = document.createElement('optgroup');
      group.label = item.label;
      for (const entry of item.topics) {
        const count = moduleRows.filter(row => row.dataset.topic === entry.id).length;
        if (count) group.append(option(entry.id, `${entry.label}（${count}）`));
      }
      if (group.children.length) topicSelect.append(group);
    }
    topicSelect.value = topic;
    topicSelect.disabled = moduleRows.length === 0;
    const topicRows = moduleRows.filter(row => !topic || row.dataset.topic === topic);
    const counts = new Map();
    for (const row of topicRows) for (const value of new Set(tagsByRow.get(row))) counts.set(value, (counts.get(value) || 0) + 1);
    if (tag && !counts.has(tag)) tag = '';
    tagSelect.replaceChildren(option('', '全部技术与场景标签'));
    for (const [value, count] of [...counts].sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))) tagSelect.append(option(value, `${value}（${count}）`));
    tagSelect.value = tag;
    tagSelect.disabled = topicRows.length === 0;
  }

  function filter() {
    const query = search.value.trim().toLowerCase();
    const moduleRows = rows.filter(row => module === 'all' || row.dataset.module === module);
    updateFacets(moduleRows);
    visible = rows.filter(row => {
      const matches = (module === 'all' || row.dataset.module === module)
        && (!topic || row.dataset.topic === topic) && (!tag || tagsByRow.get(row).includes(tag))
        && (!level || row.dataset.level === level) && (!query || row.dataset.search.includes(query));
      row.hidden = !matches;
      return matches;
    });
    visible.forEach((row, index) => {
      const number = row.querySelector('[data-ib-number]');
      if (number) number.textContent = String(index + 1).padStart(2, '0');
    });
    root.querySelectorAll('[data-ib-module]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ibModule === module)));
    root.querySelectorAll('[data-ib-level]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ibLevel === level)));
    root.querySelector('[data-ib-count]').textContent = `${visible.length} 题`;
    root.querySelector('[data-ib-empty]').hidden = visible.length > 0;
    const message = moduleRows.length ? '没有找到题目，换一个关键词或清除筛选。' : '这个能力模块暂未收录独立题目，覆盖范围见学习路线。';
    const emptyMessage = root.querySelector('[data-ib-empty-message]');
    if (emptyMessage) emptyMessage.textContent = message;
    root.querySelector('[data-ib-reading-empty]').textContent = message;
    select(visible.find(row => row.dataset.id === selected) || visible[0]);
  }

  function move(delta) {
    const index = visible.findIndex(row => row.dataset.id === selected);
    const row = visible[index + delta];
    if (row) select(row, { revealRow: true });
  }

  rows.forEach(row => row.querySelector('a').addEventListener('click', event => {
    if (row.hidden || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    select(row);
    scroll.focus({ preventScroll: true });
  }, { signal }));
  root.querySelectorAll('[data-ib-module]').forEach(button => button.addEventListener('click', () => {
    rememberPosition();
    module = button.dataset.ibModule;
    topic = ''; tag = ''; search.value = '';
    selected = lastQuestions[scope()];
    rendered = false;
    filter();
  }, { signal }));
  topicSelect.addEventListener('change', () => {
    rememberPosition();
    topic = topicSelect.value; tag = '';
    selected = lastQuestions[scope()];
    rendered = false;
    filter();
  }, { signal });
  tagSelect.addEventListener('change', () => { tag = tagSelect.value; filter(); }, { signal });
  root.querySelectorAll('[data-ib-level]').forEach(button => button.addEventListener('click', () => { level = button.dataset.ibLevel; filter(); }, { signal }));
  search.addEventListener('input', filter, { signal });
  root.querySelector('[data-ib-reset]').addEventListener('click', () => { topic = ''; tag = ''; level = ''; search.value = ''; filter(); }, { signal });
  prev.addEventListener('click', () => move(-1), { signal });
  next.addEventListener('click', () => move(1), { signal });
  catalogToggle?.addEventListener('click', () => {
    const open = catalog.dataset.open !== 'true';
    catalog.dataset.open = String(open);
    catalogToggle.setAttribute('aria-expanded', String(open));
  }, { signal });
  scroll.addEventListener('scroll', () => {
    view.clearTimeout(saveTimer);
    saveTimer = view.setTimeout(persist, 180);
  }, { signal });
  view.addEventListener('pagehide', persist, { signal });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey
      || document.querySelector('dialog[open], #mermaid-zoom-overlay')
      || event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      scroll.scrollBy({ top: event.key === 'ArrowUp' ? -80 : 80, behavior: 'instant' });
    } else if (event.key.toLowerCase() === 'r' && !event.repeat && !reader.hidden) {
      event.preventDefault();
      reader.querySelector('[data-reader-toggle]').click();
    } else if (event.key === 'Escape') {
      reader.querySelector('[data-reader-stop]').click();
    }
  }, { signal });
  root.querySelectorAll('[data-ib-enhanced]').forEach(element => { element.hidden = false; });
  filter();
  root.querySelector('[data-ib-module][aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  return () => { persist(); controller.abort(); cleanupReader(); };
}
