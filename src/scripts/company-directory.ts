export function setupCompanyDirectory() {
  const controls = document.querySelector<HTMLElement>('[data-company-controls]');
  const search = document.querySelector<HTMLInputElement>('#company-search');
  const region = document.querySelector<HTMLSelectElement>('#company-region');
  const cards = [...document.querySelectorAll<HTMLElement>('[data-company-card]')];
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-company-category]')];
  const status = document.querySelector<HTMLElement>('[data-company-status]');
  const empty = document.querySelector<HTMLElement>('[data-company-empty]');
  if (!controls || !search || !region || !status || !empty) return;
  let category = '全部';
  const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim();
  function update() {
    const terms = normalize(search!.value).split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const matches = (category === '全部' || card.dataset.category === category)
        && (region!.value === '全部' || card.dataset.region === region!.value)
        && terms.every(term => normalize(card.dataset.search || '').includes(term));
      card.hidden = !matches;
      if (matches) count++;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.companyCategory === category)));
    status!.textContent = `显示 ${count} / ${cards.length} 家公司`;
    empty!.hidden = count !== 0;
  }
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.companyCategory || '全部'; update(); }));
  search.addEventListener('input', update);
  region.addEventListener('change', update);
  document.querySelector('[data-company-reset]')?.addEventListener('click', () => { search.value = ''; region.value = '全部'; category = '全部'; update(); search.focus(); });
  controls.hidden = false;
  update();
}
