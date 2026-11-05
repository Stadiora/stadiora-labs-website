// Pause guards for everything that moves on the Solutions, Resources and company pages (EN and ES), measured on what is
// rendered instead of on the kit's own flags.
//
// A unit is one pause scope ([data-ap-scope], the element whose keyboard focus the kit autoplayer watches) together with the
// autoplayer hosts ([data-ap]) that keyboard focus inside the scope turns off (found by putting focus there, so a unit is
// known without any pointer). For each unit the check samples the rendered state of everything that belongs to it (the value
// every running animation or transition drives, the box, transform, opacity and filter of the conveyor photos, lanes, word
// slot and phone screens, the text of the scope and the time of every clip), waits, and samples again:
//   - running: the unit must move (the positive control, so a unit that never moves cannot pass as "paused");
//   - a mouse parked over the scope, and a mouse click on it (on a tab or button when it has one, which leaves focus on it):
//     the unit keeps moving and every host stays on, with no data-ap-why. A pointer never pauses anything;
//   - keyboard focus inside the scope, the unit scrolled out of view and a hidden tab: nothing may move,
//     not a CSS loop, not a transition that was in flight, not a timer-driven step, not a clip;
//   - once focus, scroll position and tab visibility are back, it must move again.
// Reading data-ap or getAnimations().playState would pass a loop that a CSS override keeps moving, so only rendered values
// count. A second check lists every endless loop in the page content and fails any that sits outside a pause host.
const pages = [
  ['schools', '/solutions/schools/'],
  ['coaches', '/solutions/coaches/'],
  ['clubs', '/solutions/teams-and-clubs/'],
  ['athletes', '/solutions/athletes/'],
  ['case-studies', '/resources/case-studies/'],
  ['about', '/about/'],
  ['contact', '/contact/'],
];
const localized = (locale, path) => (locale === 'es' ? `/es${path}` : path);
// How many pause scopes each page carries today (hero copy, media frame, day-in-the-life stage, athlete morph, marquee, contact stage,
// closing band): fewer than this means a unit dropped out of the guard rather than that it passed.
const knownUnits = { schools: 2, coaches: 4, clubs: 3, athletes: 2, 'case-studies': 1, about: 3, contact: 2 };

// Shared page decoration (mesh and grain behind the page, orbit lines, the shifting colour of a headline, the header). It keeps
// its own offscreen and hidden-tab rules in floodlight.css and is not one of this lane's autoplayers.
const chrome = '.mesh, .orbits, .grad-text, header';
// The elements whose box and transform are read directly, on top of every running animation.
const probes = 'img, video, .sx-run, .sx-col, .sx-slot, .sx-cv, .sx-scr, [data-sx-word]';

// ---- in-page functions (serialised into the page, so they must stay self-contained)

// The rendered state of one unit. Keys name the thing, values are what it currently renders.
const sample = async ({ si, hs, chromeSel, probeSel }) => {
  // Animated values are only brought up to date on a frame; a page starved on a busy machine would otherwise be read a frame behind.
  await Promise.race([new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), new Promise((r) => setTimeout(r, 1500))]);
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  const hostEls = document.querySelectorAll('[data-ap]');
  const hosts = hs.map((k) => hostEls[k]);
  // A node keeps its number for the life of the page, so a swap running in another unit cannot rename what is measured here.
  const reg = (window.__sxIds ??= { seen: new WeakMap(), n: 0 });
  const id = (t) => {
    if (!reg.seen.has(t)) reg.seen.set(t, ++reg.n);
    return reg.seen.get(t);
  };
  const label = (t) => `${t.tagName.toLowerCase()}.${String(t.className?.baseVal ?? t.className).trim().split(/\s+/)[0]}#${id(t)}`;
  // Belongs to the unit: inside the scope, or inside one of its hosts and not inside a host of some other unit.
  const owned = (t) => !t.closest(chromeSel) && (scope.contains(t) || (hosts.some((h) => h.contains(t)) && hosts.includes(t.closest('[data-ap]'))));
  const kebab = (p) => (p.startsWith('--') ? p : p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
  const skip = new Set(['offset', 'easing', 'composite', 'computedOffset']);
  const out = {};
  for (const a of document.getAnimations()) {
    const e = a.effect;
    const t = e?.target;
    if (!t || !owned(t)) continue;
    const pseudo = e.pseudoElement || null;
    const cs = getComputedStyle(t, pseudo);
    const props = a.transitionProperty ? [a.transitionProperty] : [...new Set(e.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !skip.has(p))))].map(kebab);
    const r = pseudo ? null : t.getBoundingClientRect();
    const kind = e.getComputedTiming().iterations === Infinity ? 'loop' : 'once';
    out[`${a.animationName ?? a.transitionProperty ?? 'waapi'} ${kind} on ${label(t)}${pseudo ?? ''}`] = `${props.map((p) => cs.getPropertyValue(p)).join('|')}${r ? `|${r.x.toFixed(2)},${r.y.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}` : ''}`;
  }
  const seen = new Set();
  for (const root of new Set([scope, ...hosts])) {
    for (const e of [root, ...root.querySelectorAll(probeSel)]) {
      if (seen.has(e) || !e.matches(probeSel) || !owned(e)) continue;
      seen.add(e);
      if (e instanceof HTMLVideoElement) {
        out[`clip ${label(e)}`] = `${e.currentTime.toFixed(3)}${e.paused ? ' paused' : ''}`;
        continue;
      }
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      out[`box ${label(e)}`] = `${r.x.toFixed(2)},${r.y.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}|${cs.transform}|${cs.opacity}|${cs.filter}`;
    }
  }
  out[`text of ${label(scope)}`] = (scope.textContent ?? '').replace(/\s+/g, ' ').trim();
  return out;
};

// Which autoplayers are off for which reason, in document order.
const hostStates = () => [...document.querySelectorAll('[data-ap]')].map((h) => `${h.dataset.ap}/${h.dataset.apWhy ?? ''}`);

// The hosts a scope belongs to: put keyboard focus on the scope (a temporary tabindex when it has no control of its own) and read
// which autoplayers turn off for focus, then put everything back. Needs no pointer, so it also finds the units where a pointer pauses nothing.
const hostsOfScope = (si) => {
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  const had = scope.getAttribute('tabindex');
  if (had === null) scope.setAttribute('tabindex', '-1');
  scope.focus({ preventScroll: true });
  const states = [...document.querySelectorAll('[data-ap]')].map((h) => `${h.dataset.ap}/${h.dataset.apWhy ?? ''}`);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  if (had === null) scope.removeAttribute('tabindex');
  return states.flatMap((s, k) => (s === 'off/focus' ? [k] : []));
};

// The point for a mouse click on the scope: a tab, else a button or link of the scope that is really on screen (a click on it leaves
// focus on it), else any point of the scope. Links never navigate during the probe.
const clickTarget = (si) => {
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  if (!window.__sxNoNav) {
    window.__sxNoNav = true;
    window.addEventListener('click', (e) => e.target instanceof Element && e.target.closest('a') && e.preventDefault(), true);
  }
  const onScreen = (e) => {
    const r = e.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return hit && (e === hit || e.contains(hit)) ? { x, y } : null;
  };
  const usable = (e) => !e.disabled && !e.closest('[inert]') && e.getClientRects().length > 0;
  const allTabs = [...scope.querySelectorAll('[role="tab"]')];
  const tabs = allTabs.filter(usable).sort((a, b) => Number(a.getAttribute('aria-selected') === 'true') - Number(b.getAttribute('aria-selected') === 'true'));
  const controls = [...scope.querySelectorAll('button, a[href]')].filter(usable);
  for (const [kind, list] of [['tab', tabs], ['control', controls]]) {
    for (const e of list) {
      const pt = onScreen(e);
      if (pt) return { ...pt, kind, tab: kind === 'tab' ? allTabs.indexOf(e) : -1, label: `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}` };
    }
  }
  return null;
};

const selectedTabs = (si) => [...document.querySelectorAll('[data-ap-scope]')[si].querySelectorAll('[role="tab"]')].map((t) => t.getAttribute('aria-selected') === 'true');

const scopeLabel = (si) => {
  const e = document.querySelectorAll('[data-ap-scope]')[si];
  return `${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).trim().split(/\s+/)[0] || '-'}`;
};

// A point inside the scope that is really over it (the centre of what is on screen, else the first hit on a grid).
const scopePoint = (si) => {
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  const r = scope.getBoundingClientRect();
  const x0 = Math.max(r.left, 0);
  const x1 = Math.min(r.right, innerWidth);
  const y0 = Math.max(r.top, 0);
  const y1 = Math.min(r.bottom, innerHeight);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  const tries = [[0.5, 0.5]];
  for (const fy of [0.25, 0.5, 0.75, 0.15, 0.85]) for (const fx of [0.25, 0.5, 0.75, 0.15, 0.85]) tries.push([fx, fy]);
  for (const [fx, fy] of tries) {
    const x = x0 + (x1 - x0) * fx;
    const y = y0 + (y1 - y0) * fy;
    const hit = document.elementFromPoint(x, y);
    if (hit && scope.contains(hit)) return { x, y };
  }
  return null;
};

const focusIn = (si) => {
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  const el = [scope, ...scope.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')].find((e) => e.tabIndex >= 0 && !e.disabled && !e.closest('[inert]') && e.getClientRects().length > 0);
  if (!el) return false;
  el.focus({ preventScroll: true });
  return document.activeElement === el;
};

const blurAll = () => document.activeElement instanceof HTMLElement && document.activeElement.blur();

const scrollTo = ({ si, where }) => {
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  if (where === 'into') {
    scope.scrollIntoView({ block: 'center', behavior: 'instant' });
    return;
  }
  const r = scope.getBoundingClientRect();
  const mid = r.top + scrollY + r.height / 2;
  window.scrollTo({ top: mid > document.documentElement.scrollHeight / 2 ? 0 : document.documentElement.scrollHeight, behavior: 'instant' });
};

// Scenes that step on a timer (the word swap and conveyor, the app morph) need a window longer than their cycle.
const timedScope = (si) => {
  const scope = document.querySelectorAll('[data-ap-scope]')[si];
  return Boolean(scope.closest('[data-sx-hero], [data-sx-morph]') || scope.querySelector('[data-sx-swap], [data-morph]'));
};

const setHidden = (h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  document.dispatchEvent(new Event('visibilitychange'));
};

// Every endless loop under <main> that is neither shared decoration nor inside an autoplayer host.
const looseLoops = (chromeSel) => [
  ...new Set(
    document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.('main'))
      .filter((a) => !a.effect.target.closest(chromeSel) && !a.effect.target.closest('[data-ap]'))
      .map((a) => `${a.animationName} on ${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className?.baseVal ?? a.effect.target.className).split(/\s+/)[0]}`),
  ),
];

const moved = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);

export async function solutionsMotionChecks({ open, check, sleep, settle, metrics = {}, only = process.env.SOLUTIONS_MOTION_ONLY, requireMarqueeFocus = false }) {
  const pool = async (items, size, fn) => {
    const queue = [...items];
    await Promise.all(
      Array.from({ length: size }, async () => {
        while (queue.length) await fn(queue.shift());
      }),
    );
  };
  const cases = pages.flatMap(([name, path]) => ['en', 'es'].map((locale) => ({ name, locale, path: localized(locale, path), tag: `${locale}${path}` }))).filter((c) => !only || c.tag.includes(only));

  await pool(cases, 7, async ({ name, path, tag }) => {
    const page = await open({ width: 1440, height: 900 }, path);
    try {
      await settle(page);
      const park = async () => {
        const box = await page.locator('header a').first().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      };
      const rest = async () => {
        await page.evaluate(blurAll);
        await park();
      };
      const scopes = await page.evaluate(() => [...document.querySelectorAll('[data-ap-scope]')].map((_, i) => i));
      let marqueeFocusCases = 0;
      let units = 0;
      check('solutions-motion', `${tag}: the page has pause scopes to measure`, scopes.length > 0, `${scopes.length} scopes`);

      for (const si of scopes) {
        const label = `${tag} ${await page.evaluate(scopeLabel, si)}`;
        await rest();
        await page.evaluate(scrollTo, { si, where: 'into' });
        await sleep(300);

        // Which autoplayers belong to this scope? The ones keyboard focus on it turns off. The unit is the scope plus those hosts.
        // A busy machine delays the visibility observers, so scroll to the scope and look again for a while before giving up.
        const reach = async () => {
          for (let tries = 0; tries < 8; tries++) {
            await page.evaluate(scrollTo, { si, where: 'into' });
            await sleep(300);
            const p = await page.evaluate(scopePoint, si);
            if (p) return p;
          }
          return null;
        };
        if (!(await reach())) {
          check('solutions-motion', `${label}: the pause scope can be reached with the mouse`, false, 'no point of the scope is on screen');
          continue;
        }
        await page.keyboard.press('Tab');
        await rest();
        let hs = [];
        for (let tries = 0; tries < 8 && !hs.length; tries++) {
          await page.evaluate(scrollTo, { si, where: 'into' });
          await sleep(300);
          hs = await page.evaluate(hostsOfScope, si);
        }
        await rest();
        if (!hs.length) {
          check('solutions-motion', `${label}: keyboard focus on the scope turns an autoplayer off (finds the unit's hosts)`, false, `host states: ${(await page.evaluate(hostStates)).join(', ')}`);
          continue;
        }
        units++;
        const arg = { si, hs, chromeSel: chrome, probeSel: probes };
        const take = () => page.evaluate(sample, arg);
        const unitState = async () => (await page.evaluate(hostStates)).filter((_, k) => hs.includes(k));
        const waitState = async (want, ms = 2500) => {
          const t0 = Date.now();
          let s = [];
          while (Date.now() - t0 < ms) {
            s = await unitState();
            if (s.every((x) => x === want)) return { ok: true, s };
            await sleep(120);
          }
          return { ok: false, s };
        };
        const timed = await page.evaluate(timedScope, si);
        const interval = timed ? 3300 : 1300;
        const measure = async () => {
          const a = await take();
          await sleep(interval);
          const b = await take();
          return { keys: new Set([...Object.keys(a), ...Object.keys(b)]).size, moved: moved(a, b) };
        };
        // Where the unit must be moving: a slow loop can sit in a flat stretch of its keyframes for one window, so look at up to three.
        const measureMoving = async () => {
          let m = await measure();
          for (let again = 0; again < 2 && !m.moved.length; again++) m = await measure();
          return m;
        };
        const still = async (cond, state, lead, group = 'solutions-motion') => {
          const s = await waitState(state);
          check(group, `${label}: ${cond} puts every autoplayer of the unit in ${state}`, s.ok, s.ok ? `${s.s.length} hosts` : s.s.join(', '));
          await sleep(lead);
          const m = await measure();
          check(group, `${label}: ${cond} stops everything in it (loops, in-flight transitions, timers, clips)`, m.moved.length === 0, m.moved.length ? `still moving: ${m.moved.slice(0, 6).join('; ')}` : `${m.keys} rendered values held still for ${interval} ms`);
        };

        // The unit under the new contract: every host stays on with no reason, and the same rendered values still move.
        const keepsRunning = async (cond, lead) => {
          const s = await waitState('on/', 1500);
          const hover = s.s.filter((x) => x.endsWith('/hover')).length;
          check('solutions-motion', `${label}: ${cond} keeps every autoplayer of the unit on (data-ap stays on, no data-ap-why)`, s.ok, s.ok ? `${s.s.length} hosts` : `${hover ? `paused under the pointer (data-ap-why=hover): ` : ''}${s.s.join(', ')}`);
          await sleep(lead);
          const m = await measureMoving();
          check('solutions-motion', `${label}: ${cond} does not stop anything in it (loops, in-flight transitions, timers, clips keep moving)`, m.moved.length > 0, m.moved.length ? `${m.keys} rendered values, moving: ${m.moved.slice(0, 4).join('; ')}` : `${m.keys} rendered values held still for ${interval} ms${hover ? ' (paused under the pointer)' : ''}`);
        };

        // positive control: the unit runs and moves with no pointer and no focus
        let on = { ok: false, s: [] };
        for (let tries = 0; tries < 3 && !on.ok; tries++) {
          await page.evaluate(scrollTo, { si, where: 'into' });
          on = await waitState('on/', 4000);
        }
        await page.waitForFunction((s) => [...document.querySelectorAll('[data-ap-scope]')[s].querySelectorAll('video')].every((v) => v.readyState >= 2 && v.currentTime > 0), si, { timeout: 5000 }).catch(() => {});
        await sleep(2200);
        let run = await measureMoving();
        if (!run.moved.length) {
          // a page starved on a busy machine can stall for seconds: bring the unit back on screen once and look again
          await page.evaluate(scrollTo, { si, where: 'into' });
          await waitState('on/', 4000);
          run = await measureMoving();
        }
        check('solutions-motion', `${label}: runs while on screen with no pointer or focus (positive control)`, on.ok && run.moved.length > 0, `${on.ok ? '' : `hosts ${on.s.join(', ')}; `}${run.keys} rendered values, moving: ${run.moved.slice(0, 5).join('; ') || 'none'}`);

        // mouse parked over the scope: a pointer never pauses anything
        const at = await reach();
        await page.mouse.move(at.x, at.y, { steps: 4 });
        await keepsRunning('the mouse over the scope', 900);
        await rest();
        const back1 = await measureMoving();
        check('solutions-motion', `${label}: still moving after the pointer leaves the scope`, back1.moved.length > 0, `moving: ${back1.moved.slice(0, 4).join('; ') || 'none'}`);

        // keyboard focus inside the scope
        const marquee = await page.evaluate((s) => document.querySelectorAll('[data-ap-scope]')[s].matches('[data-logo-marquee]'), si);
        const focused = await page.evaluate(focusIn, si);
        if (marquee) check('logo-marquee', `${label}: the keyboard focus case executes`, focused);
        if (focused) {
          const group = marquee ? 'logo-marquee' : 'solutions-motion';
          await still('keyboard focus inside the scope', 'off/focus', 900, group);
          await rest();
          const resumed = await waitState('on/');
          const back = await measureMoving();
          check(group, `${label}: moves again after keyboard focus leaves`, resumed.ok && back.moved.length > 0, `moving: ${back.moved.slice(0, 4).join('; ') || 'none'}`);
          if (marquee) marqueeFocusCases++;
        }

        // a mouse click on the scope (on a tab or button when there is one: the click leaves focus on it, which must not freeze the unit)
        await page.evaluate(scrollTo, { si, where: 'into' });
        await sleep(300);
        const target = await page.evaluate(clickTarget, si);
        const clickAt = target ?? (await reach());
        await page.mouse.move(clickAt.x, clickAt.y, { steps: 4 });
        await page.mouse.click(clickAt.x, clickAt.y);
        const clicked = target ? `${target.kind} ${target.label}` : 'a point';
        if (target?.kind === 'tab') {
          const sel = await page.evaluate(selectedTabs, si);
          check('solutions-motion', `${label}: a mouse click on tab ${target.tab} selects it`, sel[target.tab] === true, JSON.stringify(sel));
        }
        await keepsRunning(`a mouse click on ${clicked} (focus left on it)`, 900);
        await rest();
        const back3 = await measureMoving();
        check('solutions-motion', `${label}: still moving after the click, once the pointer and focus leave`, back3.moved.length > 0, `moving: ${back3.moved.slice(0, 4).join('; ') || 'none'}`);

        // scrolled out of view
        await page.evaluate(scrollTo, { si, where: 'away' });
        await still('scrolling the unit out of view', 'off/offscreen', 900);
        await page.evaluate(scrollTo, { si, where: 'into' });
        await waitState('on/', 3000);
        await sleep(1500);

        // hidden tab
        await page.evaluate(setHidden, true);
        await still('a hidden tab', 'off/hidden', 900);
        await page.evaluate(setHidden, false);
        await waitState('on/', 3000);
        await sleep(1500);
        const back2 = await measureMoving();
        check('solutions-motion', `${label}: moves again once the tab is visible`, back2.moved.length > 0, `moving: ${back2.moved.slice(0, 4).join('; ') || 'none'}`);
        metrics[`solutions-motion-${tag}-${si}`] = { values: run.keys, moving: run.moved.length };
      }

      const want = knownUnits[name];
      check('solutions-motion', `${tag}: every known pause scope was probed as a unit (not skipped)`, units >= want && scopes.length >= want, `${units} units of ${scopes.length} scopes, want ${want} or more`);
      if (requireMarqueeFocus) check('logo-marquee', `${tag}: the required marquee keyboard focus case ran`, marqueeFocusCases > 0, `${marqueeFocusCases} cases`);
      const loose = await page.evaluate(looseLoops, chrome);
      check('solutions-motion', `${tag}: every endless loop in the page content sits inside an autoplayer host (or is shared decoration)`, loose.length === 0, loose.length ? `outside any host: ${loose.join(', ')}` : 'none outside');
    } catch (e) {
      check('solutions-motion', `${tag}: the motion probe ran to the end`, false, String(e.stack ?? e).split('\n').slice(0, 3).join(' | '));
    } finally {
      await page.context().close();
    }
  });
}
