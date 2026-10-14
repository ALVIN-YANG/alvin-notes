import { mountArticleReader } from './article-speech.mjs';
import { getInterviewModule } from './interview-taxonomy.mjs';

// 保留原存储键与题目 ID，迁移旧方向、专题筛选与阅读位置。
const progressKey = 'alvin:interview-progress:v1';

export function mountInterviewBank(root) {
  const document = root.ownerDocument;
  const view = document.defaultView;
  const controller = new view.AbortController();
  const signal = controller.signal;
  const rows = [...root.querySelectorAll('[data-ib-question]')];
  const search = root.querySelector('[data-ib-search]');
  const moduleSelect = root.querySelector('[data-ib-module-select]');
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
    if ([1, 2, 3].includes(value?.version)) saved = value;
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
  const initialLevel = linked ? params.get('level') : saved.level;
  let level = ['basic', 'intermediate', 'advanced'].includes(initialLevel) ? initialLevel : '';
  const lastQuestions = {};
  const positions = {};
  rows.forEach(row => {
    const top = saved.positions?.[row.dataset.id];
    if (Number.isFinite(top) && top >= 0) positions[row.dataset.id] = top;
  });
  if (saved.version === 2 || saved.version === 3) {
    for (const [key, id] of Object.entries(saved.lastQuestions || {})) {
      const row = rows.find(row => row.dataset.id === id);
      const moduleId = saved.version === 2 ? key.split(':')[0] : key;
      if (row && (moduleId === 'all' || row.dataset.module === moduleId)) lastQuestions[moduleId] = id;
    }
  } else if (oldSavedRow) {
    lastQuestions[oldSavedRow.dataset.module] = oldSavedRow.dataset.id;
  }
  const oldScopeQuestion = saved.version === 2 ? saved.lastQuestions?.[`${module}:${saved.topic || ''}`] : undefined;
  let selected = questionRow?.dataset.id || (!linked ? oldScopeQuestion || lastQuestions[module] : undefined);
  let visible = [];
  let cleanupReader = () => {};
  let rendered = false;
  let saveTimer;
  search.value = linked ? params.get('q') || params.get('tag') || '' : typeof saved.query === 'string' ? saved.query : '';

  function rememberPosition() {
    if (rendered && selected) positions[selected] = scroll.scrollTop;
  }

  function persist() {
    view.clearTimeout(saveTimer);
    rememberPosition();
    try {
      view.localStorage.setItem(progressKey, JSON.stringify({ version: 3, module, level, query: search.value, lastQuestions, positions }));
    } catch {}
  }

  function syncUrl() {
    const url = new URL(view.location.href);
    for (const key of ['track', 'topic', 'tag']) url.searchParams.delete(key);
    url.searchParams.set('module', module);
    for (const [key, value] of [['level', level], ['q', search.value.trim()], ['question', selected?.split('/').at(-1)]]) {
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
    if (row) lastQuestions[module] = selected;
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

  function filter() {
    const query = search.value.trim().toLowerCase();
    const moduleRows = rows.filter(row => module === 'all' || row.dataset.module === module);
    visible = rows.filter(row => {
      const matches = (module === 'all' || row.dataset.module === module)
        && (!level || row.dataset.level === level) && (!query || row.dataset.search.includes(query));
      row.hidden = !matches;
      return matches;
    });
    visible.forEach((row, index) => {
      const number = row.querySelector('[data-ib-number]');
      if (number) number.textContent = String(index + 1).padStart(2, '0');
    });
    moduleSelect.value = module;
    root.querySelectorAll('[data-ib-level]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ibLevel === level)));
    root.querySelector('[data-ib-count]').textContent = `${visible.length} 题`;
    root.querySelector('[data-ib-empty]').hidden = visible.length > 0;
    const message = moduleRows.length ? '没有找到题目，换一个关键词或清除筛选。' : '这个能力分类暂未收录独立题目，请选择其他分类。';
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
  moduleSelect.addEventListener('change', () => {
    rememberPosition();
    module = moduleSelect.value;
    search.value = '';
    selected = lastQuestions[module];
    rendered = false;
    filter();
  }, { signal });
  root.querySelectorAll('[data-ib-level]').forEach(button => button.addEventListener('click', () => { level = button.dataset.ibLevel; filter(); }, { signal }));
  search.addEventListener('input', filter, { signal });
  root.querySelector('[data-ib-reset]').addEventListener('click', () => { level = ''; search.value = ''; filter(); }, { signal });
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
  return () => { persist(); controller.abort(); cleanupReader(); };
}
