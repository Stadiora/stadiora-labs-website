// Team cards: one open bio at a time, Escape and an outside click close it, and focus returns to the card.
function init() {
  const cards = Array.from(document.querySelectorAll<HTMLDetailsElement>('[data-person]'));
  if (!cards.length) return;

  const closeAll = (except?: HTMLDetailsElement) => {
    for (const card of cards) if (card !== except) card.open = false;
  };

  for (const card of cards) {
    card.addEventListener('toggle', () => {
      if (card.open) closeAll(card);
    });
    card.querySelector<HTMLButtonElement>('[data-person-close]')?.addEventListener('click', () => {
      card.open = false;
      card.querySelector<HTMLElement>('summary')?.focus();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openCard = cards.find((card) => card.open);
    if (!openCard) return;
    openCard.open = false;
    openCard.querySelector<HTMLElement>('summary')?.focus();
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    for (const card of cards) if (card.open && !card.contains(target)) card.open = false;
  });
}

init();

export {};
