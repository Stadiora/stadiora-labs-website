// Hover-reveal cards (components/coach/HoverRevealRow.astro).
// Interactive layout (wide screens, motion allowed): each card is a focusable group; hover or keyboard
// focus slides the phone up, and on touch a first tap reveals it and a second tap hides it.
// Static layout (narrow screens or reduced motion): the row itself scrolls, so the row is focusable.
const staticQuery = window.matchMedia('(max-width: 720px), (prefers-reduced-motion: reduce)');

function init(row: HTMLElement) {
  const cards = Array.from(row.querySelectorAll<HTMLElement>('[data-hrc]'));

  const setOpen = (card: HTMLElement, on: boolean) => card.classList.toggle('is-open', on);
  const closeAll = () => cards.forEach((card) => setOpen(card, false));

  cards.forEach((card) => {
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && !staticQuery.matches) setOpen(card, true);
    });
    card.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && !card.matches(':focus-within')) setOpen(card, false);
    });
    card.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch' || staticQuery.matches) return;
      const wasOpen = card.classList.contains('is-open');
      closeAll();
      setOpen(card, !wasOpen);
    });
    card.addEventListener('focus', () => {
      if (!staticQuery.matches && card.matches(':focus-visible')) setOpen(card, true);
    });
    card.addEventListener('blur', () => setOpen(card, false));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(card, false);
    });
  });

  const apply = () => {
    const isStatic = staticQuery.matches;
    closeAll();
    if (isStatic) {
      row.tabIndex = 0;
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', row.dataset.label ?? '');
      cards.forEach((card) => {
        card.removeAttribute('tabindex');
        card.removeAttribute('role');
        card.removeAttribute('aria-label');
      });
    } else {
      row.removeAttribute('tabindex');
      row.removeAttribute('role');
      row.removeAttribute('aria-label');
      cards.forEach((card) => {
        card.tabIndex = 0;
        card.setAttribute('role', 'group');
        card.setAttribute('aria-label', card.dataset.label ?? '');
      });
    }
  };
  apply();
  staticQuery.addEventListener('change', apply);
}

document.querySelectorAll<HTMLElement>('[data-hrr]').forEach(init);

export {};
