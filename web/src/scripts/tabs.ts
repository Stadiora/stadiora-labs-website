// WAI-ARIA tabs with a sliding lane indicator, optional auto-advance and a pause control.
// Markup contract: [data-tabs] > [role=tablist] > [role=tab][aria-controls] + .tabs__lane;
// panels are the elements the tabs control. The active panel gets [data-active]; the others are inert.
// Auto-advance ([data-tabs-auto]=ms) stops for good after the first interaction.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function init(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('[role="tablist"]');
  if (!list) return;
  const tabs = Array.from(list.querySelectorAll<HTMLElement>('[role="tab"]'));
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls') ?? ''));
  const lane = list.querySelector<HTMLElement>('.tabs__lane');
  const pauseBtn = root.querySelector<HTMLButtonElement>('[data-tabs-pause]');
  const delay = Number(root.dataset.tabsAuto ?? 0);

  let index = Math.max(
    0,
    tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
  );
  let timer = 0;
  let inView = false;
  let hovering = false;
  let focusWithin = false;
  let interacted = false;
  let userPaused = false;

  const placeLane = () => {
    const tab = tabs[index];
    if (!lane || !tab) return;
    lane.style.width = `${tab.offsetWidth}px`;
    lane.style.transform = `translateX(${tab.offsetLeft}px)`;
    // Keep the active tab visible inside a scrolling tab row without scrolling the page.
    const left = tab.offsetLeft;
    const right = left + tab.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = left - 12;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth + 12;
  };

  const select = (next: number, focus = false) => {
    index = (next + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      const panel = panels[i];
      if (!panel) return;
      if (on) panel.setAttribute('data-active', '');
      else panel.removeAttribute('data-active');
      panel.inert = !on;
    });
    root.style.setProperty('--tab-i', String(index));
    placeLane();
    if (focus) tabs[index].focus();
  };

  const stop = () => {
    window.clearTimeout(timer);
    timer = 0;
  };
  const schedule = () => {
    stop();
    if (!delay || reduced.matches || interacted || userPaused || !inView || hovering || focusWithin) return;
    timer = window.setTimeout(() => {
      select(index + 1);
      schedule();
    }, delay);
  };

  const interact = () => {
    if (interacted) return;
    interacted = true;
    stop();
    if (pauseBtn) pauseBtn.hidden = true;
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      interact();
      select(i);
    });
  });

  list.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(key in keys)) return;
    event.preventDefault();
    interact();
    select(keys[key], true);
  });

  root.addEventListener('pointerenter', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse') return;
    hovering = true;
    stop();
  });
  root.addEventListener('pointerleave', () => {
    hovering = false;
    schedule();
  });
  root.addEventListener('focusin', () => {
    focusWithin = true;
    stop();
  });
  root.addEventListener('focusout', (e) => {
    if (root.contains((e as FocusEvent).relatedTarget as Node | null)) return;
    focusWithin = false;
    schedule();
  });

  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', (userPaused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause) ?? '');
    schedule();
  });

  if (delay && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        schedule();
      },
      { threshold: 0.4 },
    ).observe(root);
  }

  if (pauseBtn && (!delay || reduced.matches)) pauseBtn.hidden = true;
  reduced.addEventListener('change', () => {
    if (pauseBtn) pauseBtn.hidden = !delay || reduced.matches || interacted;
    schedule();
  });

  select(index);
  window.addEventListener('resize', placeLane);
  document.fonts?.ready.then(placeLane);
  if ('ResizeObserver' in window) new ResizeObserver(placeLane).observe(list);
}

document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(init);

export {};
