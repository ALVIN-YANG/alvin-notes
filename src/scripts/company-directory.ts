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
