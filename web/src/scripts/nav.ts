// Header behaviour: compaction on scroll, mega menu (hover, click, keyboard, focus trap), mobile drawer.
const nav = document.querySelector<HTMLElement>('[data-nav]');

if (nav) {
  const root = document.documentElement;
  const scrim = document.querySelector<HTMLElement>('[data-nav-scrim]');
  const burger = nav.querySelector<HTMLButtonElement>('[data-nav-burger]');
  const menu = nav.querySelector<HTMLElement>('[data-nav-menu]');
  const items = [...nav.querySelectorAll<HTMLElement>('[data-mega-item]')];
  const desktop = window.matchMedia('(min-width: 1025px)');

  type Entry = { item: HTMLElement; trigger: HTMLButtonElement; panel: HTMLElement };
  const entries: Entry[] = items.flatMap((item) => {
    const trigger = item.querySelector<HTMLButtonElement>('[data-mega-trigger]');
    const panel = item.querySelector<HTMLElement>('[data-mega-panel]');
    return trigger && panel ? [{ item, trigger, panel }] : [];
  });

  let current: Entry | null = null;
  let sticky = false;
  let viaKeyboard = false;
  let hoverTimer = 0;
  let leaveTimer = 0;

  // Compaction: 80px to 60px past 24px of scroll.
  let ticking = false;
  const applyScroll = () => {
    ticking = false;
    if (window.scrollY > 24) root.setAttribute('data-scrolled', '');
    else root.removeAttribute('data-scrolled');
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyScroll);
      }
    },
    { passive: true },
  );
  applyScroll();

  const focusables = (panel: HTMLElement) =>
    [...panel.querySelectorAll<HTMLElement>('[data-mega-link]')].filter((el) => el.offsetParent !== null || el === document.activeElement);

  const warmImages = (panel: HTMLElement) => {
    panel.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
      img.loading = 'eager';
    });
  };

  const setScrim = (on: boolean) => {
    if (!scrim) return;
    if (on) scrim.setAttribute('data-on', '');
    else scrim.removeAttribute('data-on');
  };

  function open(entry: Entry, opts: { keyboard?: boolean; pin?: boolean } = {}) {
    if (current && current !== entry) close(false);
    current = entry;
    viaKeyboard = !!opts.keyboard;
    sticky = !!opts.pin;
    entry.trigger.setAttribute('aria-expanded', 'true');
    entry.panel.setAttribute('data-open', '');
    warmImages(entry.panel);
    if (desktop.matches) setScrim(true);
  }

  function close(restoreFocus: boolean) {
    if (!current) return;
    const entry = current;
    current = null;
    sticky = false;
    viaKeyboard = false;
    entry.trigger.setAttribute('aria-expanded', 'false');
    entry.panel.removeAttribute('data-open');
    setScrim(false);
    if (restoreFocus) entry.trigger.focus();
  }

  for (const entry of entries) {
    const { item, trigger, panel } = entry;

    trigger.addEventListener('click', (event) => {
      const keyboard = (event as MouseEvent).detail === 0;
      if (current === entry && (sticky || !desktop.matches)) close(false);
      else open(entry, { keyboard, pin: true });
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(entry, { keyboard: true, pin: true });
        focusables(panel)[0]?.focus();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (!desktop.matches) return;
        const tops = [...nav.querySelectorAll<HTMLElement>('.nav__trigger, .nav__link')];
        const i = tops.indexOf(trigger);
        const next = tops[(i + (event.key === 'ArrowRight' ? 1 : -1) + tops.length) % tops.length];
        event.preventDefault();
        next.focus();
        const nextEntry = entries.find((e) => e.trigger === next);
        if (current && nextEntry) open(nextEntry, { keyboard: true, pin: true });
        else if (current) close(false);
      }
    });

    item.addEventListener('pointerenter', (event) => {
      if (!desktop.matches || event.pointerType !== 'mouse') return;
      window.clearTimeout(leaveTimer);
      if (current === entry) return;
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => open(entry), 120);
    });
    item.addEventListener('pointerleave', (event) => {
      if (!desktop.matches || event.pointerType !== 'mouse') return;
      window.clearTimeout(hoverTimer);
      if (current === entry && !sticky) {
        leaveTimer = window.setTimeout(() => {
          if (current === entry && !sticky) close(false);
        }, 220);
      }
    });

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      }
      const links = focusables(panel);
      const i = links.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        links[(i + 1) % links.length]?.focus();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (i <= 0) trigger.focus();
        else links[i - 1]?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        links[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        links[links.length - 1]?.focus();
      }
    });
  }

  // Focus trap while a menu opened from the keyboard is open (desktop panels only).
  document.addEventListener('keydown', (event) => {
    if (!current || !viaKeyboard || !desktop.matches) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const order = [current.trigger, ...focusables(current.panel)];
    const i = order.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    event.preventDefault();
    const next = order[(i + (event.shiftKey ? -1 : 1) + order.length) % order.length];
    next.focus();
  });

  // Escape from the trigger itself, and click or tap outside.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current && !viaKeyboard) close(true);
  });
  document.addEventListener('pointerdown', (event) => {
    if (!current || !desktop.matches) return;
    if (!(event.target as Element).closest('[data-mega-item]')) close(false);
  });

  // Mobile drawer
  const setDrawer = (on: boolean) => {
    if (!burger) return;
    if (on) nav.setAttribute('data-menu-open', '');
    else nav.removeAttribute('data-menu-open');
    burger.setAttribute('aria-expanded', String(on));
    burger.setAttribute('aria-label', (on ? burger.dataset.labelClose : burger.dataset.labelOpen) ?? '');
    root.style.overflow = on ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setDrawer(!nav.hasAttribute('data-menu-open')));
  menu?.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) setDrawer(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.hasAttribute('data-menu-open')) {
      setDrawer(false);
      burger?.focus();
    }
  });
  desktop.addEventListener('change', () => {
    close(false);
    setDrawer(false);
  });
}

export {};
