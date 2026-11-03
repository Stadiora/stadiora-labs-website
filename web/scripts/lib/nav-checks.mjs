// Header checks for the evidence run (fix round B): bar geometry, mega panel height, drawer and panel focus.
// Called from evidence.mjs with its page opener, check recorder and screenshot helpers.

const locales = [
  ['en', '/'],
  ['es', '/es/'],
];

// Runs in the page. Every rect is read at full precision: a 0.5px overlap is still an overlap.
const readGeometry = () => {
  const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const box = (name, e) => {
    const r = e.getBoundingClientRect();
    return { name, left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
  };
  const all = (sel) => [...document.querySelectorAll(sel)].filter(shown);
  return {
    vw: document.documentElement.clientWidth,
    drawer: shown(document.querySelector('.nav__burger')),
    logo: box('logo', document.querySelector('.nav__logo')),
    menu: all('.nav__bar > .nav__menu .nav__trigger, .nav__bar > .nav__menu .nav__link').map((e) => box(e.textContent.trim(), e)),
    right: all('.nav__actions .nav__signin, .nav__actions .nav__cta, .nav__actions .langswitch, .nav__actions [data-theme-toggle], .nav__actions .nav__burger').map((e) =>
      box(
        e.classList.contains('nav__signin')
          ? 'sign in'
          : e.classList.contains('nav__cta')
            ? 'start free'
            : e.classList.contains('langswitch')
              ? 'language'
              : e.classList.contains('nav__burger')
                ? 'burger'
                : 'theme',
        e,
      ),
    ),
  };
};

// Pure: returns the list of problems for one geometry reading.
export function geometryProblems(g, minGap = 8) {
  const boxes = [g.logo, ...g.menu, ...g.right];
  const problems = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 0.01 && y > 0.01) problems.push(`${a.name} and ${b.name} overlap by ${x.toFixed(2)}px`);
    }
  }
  if (g.menu.length) {
    const first = g.menu[0].left - g.logo.right;
    const last = g.right[0].left - g.menu[g.menu.length - 1].right;
    if (first < minGap) problems.push(`logo to ${g.menu[0].name} is ${first.toFixed(2)}px`);
    if (last < minGap) problems.push(`${g.menu[g.menu.length - 1].name} to ${g.right[0].name} is ${last.toFixed(2)}px`);
  }
  const edge = Math.max(...boxes.map((b) => b.right));
  if (edge > g.vw + 0.01) problems.push(`controls run ${(edge - g.vw).toFixed(2)}px past the viewport`);
  if (g.logo.left < -0.01) problems.push('logo starts left of the viewport');
  if (g.menu.some((m) => m.height > 56)) problems.push('a menu label wraps to two lines');
  return problems;
}

const describe = (g) => {
  if (!g.menu.length) return `drawer: logo ends ${g.logo.right.toFixed(1)}, controls start ${g.right[0].left.toFixed(1)}`;
  const last = g.menu[g.menu.length - 1];
  return `bar: logo to ${g.menu[0].name} ${(g.menu[0].left - g.logo.right).toFixed(1)}px, ${last.name} to ${g.right[0].name} ${(g.right[0].left - last.right).toFixed(1)}px`;
};

export async function navChecks({ open, check, shot, sleep, checksOnly, metrics }) {
  const attempt = async (group, label, fn) => {
    try {
      await fn();
    } catch (error) {
      check(group, `${label}: ran to completion`, false, String(error.message).split('\n')[0].slice(0, 200));
    }
  };
  const nextFrame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  // ---------------------------------------------------------------- A. bar geometry, 1025 to 1440, EN and ES
  for (const [locale, path] of locales) {
    const page = await open({ width: 1440, height: 900, reduced: true }, path);
    const named = [1025, 1100, 1180, 1280, 1440];
    for (const scrolled of [false, true]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrolled ? 400 : 0);
      await sleep(scrolled ? 450 : 50);
      let worst = Infinity;
      const failures = [];
      for (let width = 1025; width <= 1440; width += 5) {
        await page.setViewportSize({ width, height: 900 });
        await nextFrame(page);
        await sleep(scrolled ? 360 : 20);
        const g = await page.evaluate(readGeometry);
        const problems = geometryProblems(g);
        if (problems.length) failures.push(`${width}px: ${problems.join('; ')}`);
        if (g.menu.length) worst = Math.min(worst, g.menu[0].left - g.logo.right, g.right[0].left - g.menu[g.menu.length - 1].right);
        if (named.includes(width) && !scrolled) {
          check(
            'nav-layout',
            `${locale} @${width}: logo, menu items and right-side controls do not overlap`,
            problems.length === 0,
            `${describe(g)}${problems.length ? ` | ${problems.join('; ')}` : ''}`,
          );
        }
      }
      check(
        'nav-layout',
        `${locale}${scrolled ? ' (compact header, scrolled)' : ''}: no overlap at any width 1025 to 1440 (every 5px)`,
        failures.length === 0,
        failures.length ? failures.slice(0, 4).join(' | ') : `smallest gap on the desktop bar ${worst.toFixed(1)}px`,
      );
      metrics[`nav-min-gap-${locale}${scrolled ? '-scrolled' : ''}`] = Number(worst.toFixed(1));
    }
    if (!checksOnly) {
      for (const width of [1100, 1280, 1440]) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.setViewportSize({ width, height: 700 });
        await nextFrame(page);
        await sleep(450);
        await shot(page, `state-nav-${locale}-${width}`, { clip: { x: 0, y: 0, width, height: 96 } });
      }
    }
    await page.context().close();
  }

  // ---------------------------------------------------------------- B. mega panel fits under the header and scrolls inside
  const panelFit = function (id) {
    const panel = document.getElementById(`mega-${id}`);
    const body = panel.querySelector('.mega__body') ?? panel;
    const foot = panel.querySelector('.mega__foot');
    const header = document.querySelector('[data-nav]').getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const links = [...panel.querySelectorAll('[data-mega-link]')];
    const unreachable = [];
    for (const link of links) {
      link.focus();
      const r = link.getBoundingClientRect();
      if (r.top < Math.max(pr.top, header.bottom) - 0.5 || r.bottom > Math.min(pr.bottom, innerHeight) + 0.5) unreachable.push(link.textContent.trim().slice(0, 24));
    }
    body.scrollTop = body.scrollHeight;
    const last = links[links.length - 1].getBoundingClientRect();
    const fr = foot.getBoundingClientRect();
    return {
      top: pr.top,
      bottom: pr.bottom,
      vh: innerHeight,
      headerBottom: header.bottom,
      height: pr.height,
      overflow: Math.round(body.scrollHeight - body.clientHeight),
      overflowY: getComputedStyle(body).overflowY,
      unreachable,
      lastInView: last.top >= header.bottom && last.bottom <= innerHeight + 0.5,
      footInView: fr.bottom <= innerHeight + 0.5,
      links: links.length,
      pageScroll: scrollY,
    };
  };
  for (const [locale, path] of locales) {
    for (const [width, height] of [
      [1280, 700],
      [1280, 600],
      [1440, 500],
    ]) {
      const page = await open({ width, height, reduced: true }, path);
      for (const id of ['platform', 'solutions', 'resources']) {
        await page.locator(`[aria-controls="mega-${id}"]`).click();
        await sleep(450);
        const m = await page.evaluate(panelFit, id);
        const label = `${locale} @${width}x${height} ${id}`;
        check(
          'mega-fit',
          `${label}: panel sits between the header and the bottom of the viewport`,
          m.top >= m.headerBottom && m.bottom <= m.vh + 0.5,
          `y ${m.top.toFixed(0)}-${m.bottom.toFixed(0)} of ${m.vh}, header ends ${m.headerBottom}`,
        );
        check(
          'mega-fit',
          `${label}: all ${m.links} links reachable, last link and footer CTA in view${m.overflow > 0 ? ` (scrolls inside the panel, ${m.overflow}px)` : ''}`,
          m.unreachable.length === 0 && m.lastInView && m.footInView && (m.overflow <= 0 || m.overflowY === 'auto') && m.pageScroll === 0,
          m.unreachable.length ? `unreachable: ${m.unreachable.join(', ')}` : `height ${m.height.toFixed(0)}, overflow ${m.overflow}px`,
        );
        if (!checksOnly && id === 'platform' && locale === 'es' && ((width === 1280 && height === 700) || (width === 1280 && height === 600))) {
          if (m.overflow > 0) await shot(page, `state-mega-es-${width}x${height}-end`);
          await page.evaluate(() => document.querySelector('#mega-platform .mega__body').scrollTo(0, 0));
          await shot(page, `state-mega-es-${width}x${height}`);
        }
        await page.keyboard.press('Escape');
        await sleep(250);
      }
      await page.context().close();
    }
  }

  // Below 1280px the nav is the drawer, so the 1100x600 check scrolls the open Platform group inside the drawer.
  for (const [locale, path] of locales)
    await attempt('mega-fit', `${locale} @1100x600 (drawer)`, async () => {
      const page = await open({ width: 1100, height: 600, reduced: true }, path);
      await page.locator('[data-nav-burger]').click();
      await sleep(300);
      await page.locator('[data-nav-menu] [data-mega-trigger]').first().click();
      await sleep(300);
      const m = await page.evaluate(() => {
        const menu = document.querySelector('[data-nav-menu]');
        const header = document.querySelector('[data-nav]').getBoundingClientRect();
        const panel = document.getElementById('mega-platform');
        const links = [...panel.querySelectorAll('[data-mega-link]')];
        const unreachable = [];
        for (const link of links) {
          link.focus();
          const r = link.getBoundingClientRect();
          if (r.top < header.bottom - 0.5 || r.bottom > innerHeight + 0.5) unreachable.push(link.textContent.trim().slice(0, 24));
        }
        menu.scrollTop = menu.scrollHeight;
        const last = links[links.length - 1].getBoundingClientRect();
        const cta = panel.querySelector('.mega__foot a');
        cta.focus();
        const c = cta.getBoundingClientRect();
        return {
          unreachable,
          links: links.length,
          lastInView: last.top >= header.bottom && last.bottom <= innerHeight + 0.5,
          ctaInView: c.top >= header.bottom && c.bottom <= innerHeight + 0.5,
          overflow: Math.round(menu.scrollHeight - menu.clientHeight),
          overflowY: getComputedStyle(menu).overflowY,
          pageScroll: scrollY,
        };
      });
      check(
        'mega-fit',
        `${locale} @1100x600 (drawer): all ${m.links} Platform links and the footer CTA reachable by scrolling inside the drawer (${m.overflow}px)`,
        m.unreachable.length === 0 && m.lastInView && m.ctaInView && m.overflow > 0 && m.overflowY === 'auto' && m.pageScroll === 0,
        m.unreachable.length ? `unreachable: ${m.unreachable.join(', ')}` : `drawer scrolls ${m.overflow}px, page scrollY ${m.pageScroll}`,
      );
      if (!checksOnly && locale === 'es') await shot(page, 'state-drawer-platform-es-1100x600');
      await page.context().close();
    });

  // ---------------------------------------------------------------- C. drawer: focus in, trapped, page inert and locked, focus back
  const headerOrder = () => {
    const nav = document.querySelector('[data-nav]');
    const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const list = [...nav.querySelectorAll('a[href], button:not([disabled])')].filter(shown);
    list.forEach((e, i) => e.setAttribute('data-tt', String(i)));
    return list.length;
  };
  const where = () => {
    const a = document.activeElement;
    return { inHeader: !!a?.closest('[data-nav]'), id: a?.getAttribute('data-tt') ?? a?.tagName ?? '', burger: !!a?.hasAttribute?.('data-nav-burger'), inMenu: !!a?.closest('[data-nav-menu]') };
  };
  const pageState = () => ({
    expanded: document.querySelector('[data-nav-burger]').getAttribute('aria-expanded'),
    inert: ['main', 'footer', '.skip-link'].map((s) => document.querySelector(s)?.hasAttribute('inert')),
    headerInert: !!document.querySelector('[data-nav]').closest('[inert]'),
    overflow: getComputedStyle(document.documentElement).overflow,
  });

  for (const [tag, opts, path, shotName] of [
    ['390x844 touch', { width: 390, height: 844, mobile: true, reduced: true }, '/es/', 'state-drawer-focus-es-390'],
    ['1100x700', { width: 1100, height: 700, reduced: true }, '/', 'state-drawer-focus-en-1100'],
    ['1279x720', { width: 1279, height: 720, reduced: true }, '/es/', null],
  ])
    await attempt('nav-drawer', tag, async () => {
      const page = await open(opts, path);
      const burger = page.locator('[data-nav-burger]');
      await burger.focus();
      await page.keyboard.press('Enter');
      await sleep(350);
      const opened = await page.evaluate(pageState);
      const start = await page.evaluate(where);
      check('nav-drawer', `${tag}: opening the drawer moves focus into it`, opened.expanded === 'true' && start.inMenu, `focus on item ${start.id}, inside the menu: ${start.inMenu}`);
      check('nav-drawer', `${tag}: page behind the drawer is inert (main, footer, skip link) and the header is not`, opened.inert.every(Boolean) && !opened.headerInert, JSON.stringify(opened.inert));
      if (shotName && !checksOnly) await shot(page, shotName);

      const count = await page.evaluate(headerOrder);
      const forward = [];
      for (let i = 0; i < count * 2 + 2; i++) {
        await page.keyboard.press('Tab');
        forward.push(await page.evaluate(where));
      }
      const ids = forward.map((w) => w.id);
      check(
        'nav-drawer',
        `${tag}: Tab stays inside the header and drawer and wraps (${count} stops)`,
        forward.every((w) => w.inHeader) && new Set(ids).size === count && ids.every((id, i) => i < count || id === ids[i - count]),
        `${new Set(ids).size} distinct stops over ${forward.length} presses, ${forward.filter((w) => !w.inHeader).length} escaped`,
      );
      const backward = [];
      for (let i = 0; i < count + 1; i++) {
        await page.keyboard.press('Shift+Tab');
        backward.push(await page.evaluate(where));
      }
      check(
        'nav-drawer',
        `${tag}: Shift+Tab stays inside and wraps`,
        backward.every((w) => w.inHeader) && new Set(backward.map((w) => w.id)).size === count,
        `${new Set(backward.map((w) => w.id)).size} distinct stops, ${backward.filter((w) => !w.inHeader).length} escaped`,
      );

      const mid = Math.round(opts.width / 2);
      await page.mouse.move(mid, 30);
      await page.mouse.wheel(0, 900);
      await sleep(300);
      await page.mouse.move(mid, Math.round(opts.height / 2));
      await page.mouse.wheel(0, 900);
      await sleep(300);
      const locked = await page.evaluate(() => ({ y: scrollY, overflow: getComputedStyle(document.documentElement).overflow }));
      check('nav-drawer', `${tag}: the page behind does not scroll while the drawer is open`, locked.y === 0 && locked.overflow === 'hidden', `scrollY ${locked.y}, html overflow ${locked.overflow}`);

      await page.keyboard.press('Escape');
      await sleep(300);
      const closed = await page.evaluate(() => ({
        ...(() => ({
          expanded: document.querySelector('[data-nav-burger]').getAttribute('aria-expanded'),
          inert: document.querySelectorAll('[inert]').length,
          overflow: getComputedStyle(document.documentElement).overflow,
        }))(),
        burger: document.activeElement?.hasAttribute('data-nav-burger'),
      }));
      check('nav-drawer', `${tag}: Escape closes the drawer and returns focus to the burger`, closed.expanded === 'false' && closed.burger, `burger focused: ${closed.burger}`);
      check(
        'nav-drawer',
        `${tag}: closing restores the page (nothing inert, scrolling works)`,
        closed.overflow !== 'hidden' && !(await page.evaluate(() => ['main', 'footer', '.skip-link'].some((s) => document.querySelector(s)?.hasAttribute('inert')))),
        `html overflow ${closed.overflow}`,
      );
      await page.mouse.move(mid, Math.round(opts.height / 2));
      await page.mouse.wheel(0, 500);
      await sleep(400);
      check('nav-drawer', `${tag}: the page scrolls again after the drawer closes`, (await page.evaluate(() => scrollY)) > 0);
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(100);

      // Closing with the burger itself, and Escape from inside an expanded group.
      await burger.click();
      await sleep(300);
      await burger.click();
      await sleep(300);
      check(
        'nav-drawer',
        `${tag}: the burger closes the drawer and keeps focus`,
        (await page.evaluate(() => document.activeElement?.hasAttribute('data-nav-burger'))) && (await page.evaluate(pageState)).expanded === 'false',
      );
      await burger.click();
      await sleep(300);
      await page.locator('[data-nav-menu] [data-mega-trigger]').first().click();
      await sleep(250);
      await page.keyboard.press('ArrowDown');
      await sleep(100);
      await page.keyboard.press('Escape');
      await sleep(300);
      check(
        'nav-drawer',
        `${tag}: Escape from inside an open group closes the drawer and focuses the burger`,
        (await page.evaluate(() => document.activeElement?.hasAttribute('data-nav-burger'))) && (await page.evaluate(pageState)).expanded === 'false',
      );
      await page.context().close();
    });

  // ---------------------------------------------------------------- D. desktop mega panels confine focus however they were opened
  for (const [tag, opts, path] of [
    ['1440x900 en', { width: 1440, height: 900, reduced: true }, '/'],
    ['1280x700 es', { width: 1280, height: 700, reduced: true }, '/es/'],
  ]) {
    for (const mode of ['keyboard', 'pointer', 'hover'])
      await attempt('mega-focus', `${tag}, opened by ${mode}`, async () => {
        const page = await open(opts, path);
        await page.mouse.move(2, 2);
        const trigger = page.locator('[data-mega-trigger]').first();
        if (mode === 'keyboard') {
          await trigger.focus();
          await page.keyboard.press('Enter');
        } else if (mode === 'pointer') {
          await trigger.click();
          await page.mouse.move(2, 2);
        } else {
          await trigger.hover();
        }
        await page.waitForFunction(() => document.querySelector('#mega-platform')?.hasAttribute('data-open'));
        await sleep(350);
        const stops = await page.evaluate(() => {
          const item = document.querySelector('[data-mega-item]');
          const list = [...item.querySelectorAll('[data-mega-trigger], [data-mega-link]')];
          list.forEach((e, i) => e.setAttribute('data-tt', String(i)));
          return list.length;
        });
        const here = () =>
          page.evaluate(() => {
            const a = document.activeElement;
            const item = document.querySelector('[data-mega-item]');
            return { inside: !!a && item.contains(a), id: a?.getAttribute('data-tt') ?? a?.tagName ?? '' };
          });
        const forward = [];
        for (let i = 0; i < stops * 2 + 2; i++) {
          await page.keyboard.press('Tab');
          forward.push(await here());
        }
        const ids = forward.map((w) => w.id);
        check(
          'mega-focus',
          `${tag}, opened by ${mode}: Tab stays inside the open panel and wraps (${stops} stops)`,
          forward.every((w) => w.inside) && new Set(ids).size === stops && ids.every((id, i) => i < stops || id === ids[i - stops]),
          `${new Set(ids).size} distinct stops over ${forward.length} presses, ${forward.filter((w) => !w.inside).length} escaped`,
        );
        const backward = [];
        for (let i = 0; i < stops + 1; i++) {
          await page.keyboard.press('Shift+Tab');
          backward.push(await here());
        }
        check(
          'mega-focus',
          `${tag}, opened by ${mode}: Shift+Tab stays inside and wraps`,
          backward.every((w) => w.inside) && new Set(backward.map((w) => w.id)).size === stops,
          `${new Set(backward.map((w) => w.id)).size} distinct stops, ${backward.filter((w) => !w.inside).length} escaped`,
        );
        await page.keyboard.press('Escape');
        await sleep(300);
        const done = await page.evaluate(() => ({
          open: document.querySelector('#mega-platform').hasAttribute('data-open'),
          onTrigger: document.activeElement === document.querySelector('[data-mega-trigger]'),
        }));
        check('mega-focus', `${tag}, opened by ${mode}: Escape closes the panel and returns focus to its trigger`, !done.open && done.onTrigger);
        await page.context().close();
      });
  }

  // ---------------------------------------------------------------- E. the SPORT strip follows prefers-reduced-motion changes
  {
    const page = await open({ width: 1440, height: 900 }, '/');
    await page.locator('#brand .bs-card').evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await sleep(500);
    const pos = () => page.evaluate(() => [...document.querySelectorAll('#brand [data-brand-img]')].findIndex((i) => i.classList.contains('on')));
    const a = await pos();
    await sleep(3200);
    const b = await pos();
    check('retro-motion', 'normal motion: the retro images swap inside the O on their own', a !== b, `${a} -> ${b}`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sleep(700);
    const c = await pos();
    await sleep(6000);
    const d = await pos();
    check('retro-motion', 'switching to reduced motion stops the swap (the image holds for 6 s)', c === d, `${c} -> ${d}`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await sleep(3400);
    const e = await pos();
    check('retro-motion', 'switching back to normal motion restarts the swap', e !== d, `${d} -> ${e}`);
    await page.context().close();
  }

  // ---------------------------------------------------------------- F. Spanish alt text on the retro images
  {
    const alts = async (path) => {
      const page = await open({ width: 1440, height: 900, reduced: true }, path);
      const list = await page.evaluate(() => [...document.querySelectorAll('#brand [data-brand-img]')].map((i) => i.getAttribute('alt') ?? ''));
      await page.context().close();
      return list;
    };
    const en = await alts('/');
    const es = await alts('/es/');
    check(
      'i18n',
      '/es/ retro images carry Spanish alt text (all 8 differ from the English text)',
      en.length === 8 && es.length === 8 && es.every((t, i) => t.length > 10 && t !== en[i]),
      `e.g. "${es[0]}"`,
    );
  }
}
