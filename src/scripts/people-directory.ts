export function setupPeopleDirectory() {
  const page = document.querySelector<HTMLElement>('.people-page');
  const dialog = document.querySelector<HTMLDialogElement>('.person-dialog');
  if (!page || !dialog) return;
  const search = page.querySelector<HTMLInputElement>('#people-search')!;
  const cards = Array.from(page.querySelectorAll<HTMLAnchorElement>('[data-person]'));
  const buttons = Array.from(page.querySelectorAll<HTMLButtonElement>('[data-category]')).filter(el => el.tagName === 'BUTTON');
  const status = page.querySelector<HTMLElement>('[data-people-status]')!;
  const empty = page.querySelector<HTMLElement>('[data-people-empty]')!;
  const content = dialog.querySelector<HTMLElement>('[data-person-content]')!;
  const permalink = dialog.querySelector<HTMLAnchorElement>('[data-person-permalink]')!;
  const close = dialog.querySelector<HTMLButtonElement>('[data-person-close]')!;
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/ł/g, 'l');
  const texts = new Map(cards.map(card => [card, normalize(card.dataset.search || '')]));
  let category = '全部';
  let opener: HTMLAnchorElement | null = null;
  let pushed = false;
  page.querySelector<HTMLElement>('[data-people-controls]')!.hidden = false;

  function filter() {
    const words = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const match = (category === '全部' || card.dataset.category === category) && words.every(word => texts.get(card)!.includes(word));
      card.hidden = !match;
      if (match) count++;
    }
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
    status.textContent = search.value.trim() || category !== '全部' ? `找到 ${count} 位人物` : '';
    empty.hidden = count !== 0;
  }
  search.addEventListener('input', filter);
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.category!; filter(); }));
  page.querySelector('[data-people-reset]')!.addEventListener('click', () => { category = '全部'; search.value = ''; filter(); search.focus(); });

  function show(id: string) {
    const template = document.getElementById(`person-template-${id}`);
    if (!(template instanceof HTMLTemplateElement)) return false;
    content.replaceChildren(template.content.cloneNode(true));
    permalink.href = `/people/${id}/`;
    if (!dialog!.open) dialog!.showModal();
    document.documentElement.classList.add('person-dialog-open');
    dialog!.scrollTop = 0;
    close.focus({ preventScroll: true });
    return true;
  }
  for (const card of cards) card.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!show(card.dataset.person!)) return;
    event.preventDefault();
    opener = card;
    history.pushState(null, '', `#${card.dataset.person}`);
    pushed = true;
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const targets = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])')).filter(el => el.getClientRects().length > 0 && (!el.closest('details:not([open])') || el.tagName === 'SUMMARY'));
    const first = targets[0];
    const last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });
  // Only dismiss when both ends of the pointer action are on the backdrop.
  let backdropDown = false;
  dialog.addEventListener('pointerdown', event => {
    const r = dialog.getBoundingClientRect();
    backdropDown = event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom);
  });
  dialog.addEventListener('click', event => { if (backdropDown && event.target === dialog) dialog.close(); backdropDown = false; });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('person-dialog-open');
    content.replaceChildren();
    if (document.getElementById(`person-template-${location.hash.slice(1)}`)) {
      if (pushed) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
    pushed = false;
    if (opener && !opener.hidden) opener.focus({ preventScroll: true });
  });
  function syncHash() {
    if (!show(location.hash.slice(1)) && dialog!.open) dialog!.close();
  }
  window.addEventListener('hashchange', syncHash);
  syncHash();
}
