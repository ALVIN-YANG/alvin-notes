export function setupCompanyDirectory() {
  const controls = document.querySelector<HTMLElement>('[data-company-controls]');
  const search = document.querySelector<HTMLInputElement>('#company-search');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-company-card]')];
  const categories = [...document.querySelectorAll<HTMLButtonElement>('[data-company-category]')];
  const regions = [...document.querySelectorAll<HTMLButtonElement>('[data-company-region]')];
  const status = document.querySelector<HTMLElement>('[data-company-status]');
  const empty = document.querySelector<HTMLElement>('[data-company-empty]');
  if (!controls || !search || !status || !empty) return;
  let category = '全部', region = '全部';
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();
  function update() {
    const terms = normalize(search!.value).split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const areaMatches = region === '全部' || (region === '杭州' ? card.dataset.hangzhou === 'true' : card.dataset.region === region);
      const matches = (category === '全部' || card.dataset.category === category) && areaMatches && terms.every(term => normalize(card.dataset.search || '').includes(term));
      card.hidden = !matches;
      if (matches) count++;
    });
    categories.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.companyCategory === category)));
    regions.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.companyRegion === region)));
    status!.textContent = `显示 ${count} / ${cards.length} 家公司`;
    empty!.hidden = count !== 0;
  }
  categories.forEach(button => button.addEventListener('click', () => { category = button.dataset.companyCategory || '全部'; update(); }));
  regions.forEach(button => button.addEventListener('click', () => { region = button.dataset.companyRegion || '全部'; update(); }));
  search.addEventListener('input', update);
  document.querySelector('[data-company-reset]')?.addEventListener('click', () => { search.value = ''; region = category = '全部'; update(); search.focus(); });
  controls.hidden = false;
  update();
}

export function setupCompanyAnalysis() {
  const observer = document.querySelector<HTMLElement>('.company-observer');
  observer?.addEventListener('pointerdown', () => observer.classList.add('co-pointer'));
  observer?.addEventListener('keydown', () => observer.classList.remove('co-pointer'));
  const dialog = document.querySelector<HTMLDialogElement>('[data-company-dialog]');
  const content = dialog?.querySelector<HTMLElement>('[data-company-dialog-content]');
  let trigger: HTMLAnchorElement | null = null;
  let previousOverflow = '';
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const citation = event.target.closest<HTMLAnchorElement>('[data-analysis-citation]');
    if (citation) {
      const analysis = citation.closest('[data-employee-analysis]');
      const source = analysis?.querySelector<HTMLElement>(`#${CSS.escape(citation.hash.slice(1))}`);
      const details = source?.closest<HTMLDetailsElement>('details');
      if (source && details) {
        event.preventDefault();
        details.open = true;
        analysis!.querySelectorAll<HTMLElement>('[data-analysis-source]').forEach(item => item.dataset.active = String(item === source));
        source.scrollIntoView({ block: 'nearest' });
        source.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true });
      }
      return;
    }
    if (!dialog || !content) return;
    if (event.target.closest('[data-company-close]')) { dialog.close(); return; }
    const link = event.target.closest<HTMLAnchorElement>('[data-company-open]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const template = document.querySelector<HTMLTemplateElement>(`[data-company-template="${CSS.escape(link.dataset.companyOpen || '')}"]`);
    if (!template || typeof dialog.showModal !== 'function') return;
    event.preventDefault();
    trigger = link;
    content.replaceChildren(template.content.cloneNode(true));
    const title = content.querySelector<HTMLElement>('[data-analysis-title]');
    if (title) title.id = 'co-dialog-company-title';
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    content.scrollTop = 0;
    dialog.querySelector<HTMLButtonElement>('[data-company-close]')?.focus({ preventScroll: true });
  });
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    content?.replaceChildren();
    trigger?.focus({ preventScroll: true });
  });
}
