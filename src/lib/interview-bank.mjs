import { mountArticleReader } from './article-speech.mjs';

const progressKey = 'alvin:interview-progress:v1';

export function mountInterviewBank(root) {
  const document = root.ownerDocument;
  const view = document.defaultView;
  const controller = new view.AbortController();
  const signal = controller.signal;
  const rows = [...root.querySelectorAll('[data-ib-question]')];
  const search = root.querySelector('[data-ib-search]');
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
    if (value?.version === 1) saved = value;
  } catch {}
  const linked = ['track', 'question', 'level', 'q'].some(key => params.has(key));
  const initialTrack = linked ? params.get('track') : saved.track;
  let track = initialTrack === 'infra' ? 'infra' : 'agent';
  const initialLevel = linked ? params.get('level') : saved.level;
  let level = ['basic', 'intermediate', 'advanced'].includes(initialLevel) ? initialLevel : '';
  const lastQuestions = {};
  const positions = {};
  rows.forEach(row => {
    const id = row.dataset.id;
    const top = saved.positions?.[id];
    if (Number.isFinite(top) && top >= 0) positions[id] = top;
    if (saved.lastQuestions?.[row.dataset.track] === id) lastQuestions[row.dataset.track] = id;
  });
  let selected = params.has('question')
    ? rows.find(row => row.dataset.track === track && row.dataset.id.split('/').at(-1) === params.get('question'))?.dataset.id
    : lastQuestions[track];
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
      view.localStorage.setItem(progressKey, JSON.stringify({ version: 1, track, level, query: search.value, lastQuestions, positions }));
    } catch {}
  }

  function syncUrl() {
    const url = new URL(view.location.href);
    url.searchParams.set('track', track);
    if (selected) url.searchParams.set('question', selected.split('/').at(-1)); else url.searchParams.delete('question');
    if (level) url.searchParams.set('level', level); else url.searchParams.delete('level');
    if (search.value.trim()) url.searchParams.set('q', search.value.trim()); else url.searchParams.delete('q');
    view.history.replaceState(null, '', url);
  }

  function select(row, { updateUrl = true, revealRow = false } = {}) {
    if (catalog) catalog.dataset.open = 'false';
    catalogToggle?.setAttribute('aria-expanded', 'false');
    const changed = selected !== row?.dataset.id || reader.dataset.readerContent !== (row ? `#${row.dataset.panel}` : '');
    if (changed) rememberPosition();
    selected = row?.dataset.id;
    if (row) lastQuestions[row.dataset.track] = selected;
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
        cleanupReader = () => {};
      }
    }
    rendered = true;
    if (revealRow) row?.scrollIntoView?.({ block: 'nearest' });
    if (updateUrl) syncUrl();
    persist();
  }

  function filter(updateUrl = true) {
    const query = search.value.trim().toLowerCase();
    visible = rows.filter(row => {
      const matches = row.dataset.track === track && (!level || row.dataset.level === level) && (!query || row.dataset.search.includes(query));
      row.hidden = !matches;
      return matches;
    });
    root.querySelectorAll('[data-ib-track]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ibTrack === track)));
    root.querySelectorAll('[data-ib-level]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ibLevel === level)));
    root.querySelector('[data-ib-count]').textContent = `${visible.length} 题`;
    root.querySelector('[data-ib-empty]').hidden = visible.length > 0;
    select(visible.find(row => row.dataset.id === selected) || visible[0], { updateUrl });
  }

  function move(delta) {
    const index = visible.findIndex(row => row.dataset.id === selected);
    const row = visible[index + delta];
    if (row) select(row, { revealRow: true });
  }

  rows.forEach(row => row.querySelector('a').addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    select(row);
    scroll.focus({ preventScroll: true });
  }, { signal }));
  root.querySelectorAll('[data-ib-track]').forEach(button => button.addEventListener('click', () => {
    rememberPosition();
    track = button.dataset.ibTrack;
    search.value = '';
    selected = lastQuestions[track];
    // 当前 DOM 仍是上一方向，首次显示新方向前不要把旧位置写到新题。
    rendered = false;
    filter();
  }, { signal }));
  root.querySelectorAll('[data-ib-level]').forEach(button => button.addEventListener('click', () => { level = button.dataset.ibLevel; filter(); }, { signal }));
  search.addEventListener('input', () => filter(), { signal });
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
  filter(false);
  return () => { persist(); controller.abort(); cleanupReader(); };
}
