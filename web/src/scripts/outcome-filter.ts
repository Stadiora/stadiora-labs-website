// "I want to…" filter for the case-study index. Single-select chips, 200 ms fade, state kept in ?outcome=.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const FADE_MS = 200;

function init(root: HTMLElement) {
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-outcome]'));
  const stage = root.querySelector<HTMLElement>('[data-outcome-stage]');
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-outcomes]'));
  const empty = root.querySelector<HTMLElement>('[data-outcome-empty]');
  const emptyAll = root.querySelector<HTMLElement>('[data-empty-all]');
  const emptyOutcome = root.querySelector<HTMLElement>('[data-empty-outcome]');
  const emptyLabel = root.querySelector<HTMLElement>('[data-empty-label]');
  const template = emptyOutcome?.dataset.template ?? '';
  const ids = chips.map((chip) => chip.dataset.outcome ?? 'all');
  let timer = 0;

  const apply = (id: string) => {
    let shown = 0;
    for (const card of cards) {
      const match = id === 'all' || (card.dataset.outcomes ?? '').split(' ').includes(id);
      card.hidden = !match;
      if (match) shown += 1;
    }
    if (empty) empty.hidden = shown > 0;
    if (emptyAll) emptyAll.hidden = id !== 'all';
    if (emptyOutcome) {
      emptyOutcome.hidden = id === 'all';
      const label = chips.find((chip) => chip.dataset.outcome === id)?.textContent?.trim() ?? '';
      if (emptyLabel && template) emptyLabel.textContent = template.replace('{outcome}', label);
    }
  };

  const select = (id: string, animate: boolean) => {
    chips.forEach((chip) => chip.setAttribute('aria-pressed', String(chip.dataset.outcome === id)));
    const url = new URL(window.location.href);
    if (id === 'all') url.searchParams.delete('outcome');
    else url.searchParams.set('outcome', id);
    window.history.replaceState(null, '', url);

    window.clearTimeout(timer);
    if (!animate || reduced.matches || !stage) {
      apply(id);
      return;
    }
    stage.classList.add('is-fading');
    timer = window.setTimeout(() => {
      apply(id);
      stage.classList.remove('is-fading');
    }, FADE_MS);
  };

  chips.forEach((chip) => chip.addEventListener('click', () => select(chip.dataset.outcome ?? 'all', true)));

  const requested = new URLSearchParams(window.location.search).get('outcome') ?? 'all';
  select(ids.includes(requested) ? requested : 'all', false);
}

document.querySelectorAll<HTMLElement>('[data-outcome-filter]').forEach(init);

export {};
