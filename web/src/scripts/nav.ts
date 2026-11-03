// Header behaviour: compaction on scroll, mega menus (hover, click, keyboard; focus is confined to the open
// panel however it was opened) and the mobile drawer (focus moves in and is trapped, the page behind is inert
// and does not scroll, Escape and close return focus to the burger).
const nav = document.querySelector<HTMLElement>('[data-nav]');

if (nav) {
  const root = document.documentElement;
  const scrim = document.querySelector<HTMLElement>('[data-nav-scrim]');
  const burger = nav.querySelector<HTMLButtonElement>('[data-nav-burger]');
  const menu = nav.querySelector<HTMLElement>('[data-nav-menu]');
  const items = [...nav.querySelectorAll<HTMLElement>('[data-mega-item]')];
  // Same edge as the drawer breakpoint in Nav.astro (the drawer is below 1280px).
  const desktop = window.matchMedia('(min-width: 1280px)');

  type Entry = { item: HTMLElement; trigger: HTMLButtonElement; panel: HTMLElement };
  const entries: Entry[] = items.flatMap((item) => {
    const trigger = item.querySelector<HTMLButtonElement>('[data-mega-trigger]');
    const panel = item.querySelector<HTMLElement>('[data-mega-panel]');
    return trigger && panel ? [{ item, trigger, panel }] : [];
  });

  let current: Entry | null = null;
  let sticky = false;
  let hoverTimer = 0;
  let leaveTimer = 0;

  // Compaction: the floating pill shrinks past 24px of scroll; --progress drives its gradient line.
  let ticking = false;
  const bar = document.querySelector<HTMLElement>('.nav__bar');
  const applyScroll = () => {
    ticking = false;
    if (window.scrollY > 24) root.setAttribute('data-scrolled', '');
    else root.removeAttribute('data-scrolled');
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar?.style.setProperty('--progress', max > 0 ? String(Math.min(1, Math.max(0, window.scrollY / max))) : '0');
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

  const TABBABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
  const isShown = (el: HTMLElement) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[inert]');
  const tabbables = (scope: HTMLElement) => [...scope.querySelectorAll<HTMLElement>(TABBABLE)].filter(isShown);
  const focusables = (panel: HTMLElement) => [...panel.querySelectorAll<HTMLElement>('[data-mega-link]')].filter(isShown);

  // Keeps Tab and Shift+Tab inside `order`. Focus that is outside it (or on a non-tabbable node) enters at an end.
  const confineTab = (event: KeyboardEvent, order: HTMLElement[]) => {
    if (!order.length) return;
    const i = order.indexOf(document.activeElement as HTMLElement);
    const last = order.length - 1;
    if (i === -1) {
      event.preventDefault();
      order[event.shiftKey ? last : 0].focus();
    } else if (event.shiftKey && i === 0) {
      event.preventDefault();
      order[last].focus();
    } else if (!event.shiftKey && i === last) {
      event.preventDefault();
      order[0].focus();
    }
  };

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

  function open(entry: Entry, opts: { pin?: boolean } = {}) {
    if (current && current !== entry) close(false);
    current = entry;
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
    entry.trigger.setAttribute('aria-expanded', 'false');
    entry.panel.removeAttribute('data-open');
    setScrim(false);
    if (restoreFocus) entry.trigger.focus();
  }

  for (const entry of entries) {
    const { item, trigger, panel } = entry;

    trigger.addEventListener('click', () => {
      if (current === entry && (sticky || !desktop.matches)) close(false);
      else {
        open(entry, { pin: true });
        // Safari and Firefox on macOS do not focus a button on click; the confinement starts from the trigger.
        trigger.focus();
      }
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        open(entry, { pin: true });
        focusables(panel)[0]?.focus();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (!desktop.matches) return;
        const tops = [...nav.querySelectorAll<HTMLElement>('.nav__trigger, .nav__link')];
        const i = tops.indexOf(trigger);
        const next = tops[(i + (event.key === 'ArrowRight' ? 1 : -1) + tops.length) % tops.length];
        event.preventDefault();
        next.focus();
        const nextEntry = entries.find((e) => e.trigger === next);
        if (current && nextEntry) open(nextEntry, { pin: true });
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

  // Escape closes the drawer or the open panel; focus goes back to what opened it when it was inside.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (drawerOpen()) {
        event.preventDefault();
        closeDrawer(true);
      } else if (current) {
        event.preventDefault();
        const { item, trigger } = current;
        const hadFocus = item.contains(document.activeElement);
        close(false);
        if (hadFocus) trigger.focus();
      }
      return;
    }
    if (event.key !== 'Tab' || event.defaultPrevented) return;
    if (drawerOpen()) confineTab(event, tabbables(nav));
    else if (current && desktop.matches) confineTab(event, [current.trigger, ...focusables(current.panel)]);
  });

  // Click or tap outside closes a desktop panel.
  document.addEventListener('pointerdown', (event) => {
    if (!current || !desktop.matches) return;
    if (!(event.target as Element).closest('[data-mega-item]')) close(false);
  });

  // Mobile drawer
  let inerted: HTMLElement[] = [];
  const setPageInert = (on: boolean) => {
    for (const el of inerted) el.removeAttribute('inert');
    inerted = [];
    if (!on) return;
    for (let node: HTMLElement = nav; node !== document.body && node.parentElement; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || !(sibling instanceof HTMLElement) || ['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) continue;
        if (sibling.hasAttribute('inert')) continue;
        sibling.setAttribute('inert', '');
        inerted.push(sibling);
      }
    }
  };

  function drawerOpen() {
    return nav!.hasAttribute('data-menu-open');
  }

  function openDrawer() {
    if (!burger || drawerOpen()) return;
    close(false);
    nav!.setAttribute('data-menu-open', '');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', burger.dataset.labelClose ?? '');
    root.setAttribute('data-scroll-lock', '');
    setPageInert(true);
    (menu ? tabbables(menu)[0] : undefined)?.focus();
  }

  function closeDrawer(restoreFocus: boolean) {
    if (!burger || !drawerOpen()) return;
    nav!.removeAttribute('data-menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', burger.dataset.labelOpen ?? '');
    root.removeAttribute('data-scroll-lock');
    setPageInert(false);
    close(false);
    if (restoreFocus) burger.focus();
  }

  burger?.addEventListener('click', () => (drawerOpen() ? closeDrawer(true) : openDrawer()));
  menu?.addEventListener('click', (event) => {
    if ((event.target as Element).closest('a')) closeDrawer(false);
  });
  desktop.addEventListener('change', () => {
    close(false);
    closeDrawer(false);
  });
}

export {};
