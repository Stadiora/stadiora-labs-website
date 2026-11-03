// One-open-at-a-time accordion that drives a crossfade stage.
// Markup contract (see components/coach/Accordion.astro): [data-accordion] holds .acc__btn headers
// (aria-expanded, aria-controls), .acc__item[data-open] wrappers and .acc__stage .acc__screen
// children, one per row. The open row can't be closed; Arrow/Home/End move between headers.

function init(root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>('.acc__item'));
  const buttons = items.map((item) => item.querySelector<HTMLButtonElement>('.acc__btn')!);
  const panels = items.map((item) => item.querySelector<HTMLElement>('.acc__panel')!);
  const screens = Array.from(root.querySelectorAll<HTMLElement>('.acc__screen'));

  const open = (index: number) => {
    items.forEach((item, i) => {
      const on = i === index;
      if (on) item.setAttribute('data-open', '');
      else item.removeAttribute('data-open');
      buttons[i].setAttribute('aria-expanded', String(on));
      panels[i].inert = !on;
      if (screens[i]) {
        if (on) screens[i].setAttribute('data-active', '');
        else screens[i].removeAttribute('data-active');
      }
    });
  };

  const current = Math.max(
    0,
    items.findIndex((item) => item.hasAttribute('data-open')),
  );
  open(current);

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => open(i));
    button.addEventListener('keydown', (event) => {
      let next = -1;
      if (event.key === 'ArrowDown') next = (i + 1) % buttons.length;
      else if (event.key === 'ArrowUp') next = (i - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      if (next < 0) return;
      event.preventDefault();
      buttons[next].focus();
    });
  });
}

document.querySelectorAll<HTMLElement>('[data-accordion]').forEach(init);

export {};
