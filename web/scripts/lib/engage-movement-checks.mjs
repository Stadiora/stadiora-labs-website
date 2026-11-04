// Real-movement guards for the five Platform pages. The autoplayer walk in engage-motion-checks.mjs reads `data-ap`, a flag the
// kit sets; a pause that sets the flag but leaves work running (a WAAPI animation, a CSS loop, a RAF, a clip) passes it. These
// guards watch what actually moves inside every autoplayer host's scope, while the host reports each pause condition:
//   - the clocks of every animation and transition in the scope (a running clock advances, a paused one holds still),
//   - the scope's markup with the kit's own data-ap* flags removed (text, classes, inline styles: scrambles, tab progress bars),
//   - the currentTime of every clip in the scope.
// For each host: a positive control (it must move while it runs, so "nothing moved" can mean something), then for hover,
// keyboard focus, leaving the screen, a hidden tab and reduced motion switched on mid-run: pause at the START of a burst of work
// (so a swap, a reveal or a scramble is in flight), take the clocks, wait 1.4 s, and nothing may have advanced; then lift the
// condition and the host must move again. Page chrome that is not an autoplayer (.mesh, .orbits, .grad-text) is out of scope,
// as in the Coach guard (coach-motion-checks.mjs). Transitions on the link or button under the pointer or focus are user
// feedback, not autoplay, and are ignored.
// Mutation proof (see the PR): kit.ts `pause: () => g.anims.forEach((a) => a.pause())` -> `pause: () => {}` fails Integrations
// and Teams; deleting the .dot-live rule from integrations.css fails Integrations; branded.ts pausing only its timer fails Branded.

const group = 'engage-movement';

// ---- in-page helpers (serialised into the page, so each must stay self-contained)

const tagHosts = () =>
  [...document.querySelectorAll('[data-ap]')].map((h, i) => {
    h.setAttribute('data-ap-i', String(i));
    const src = h.tagName === 'VIDEO' ? (h.querySelector('source')?.getAttribute('src') ?? '') : '';
    const label = `${h.tagName.toLowerCase()}${typeof h.className === 'string' && h.className ? `.${h.className.trim().split(/\s+/)[0]}` : ''}${src ? ` ${src.split('/').pop()}` : ''}`;
    return { i, label };
  });

const hostState = (i) => {
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  return h ? `${h.dataset.ap}/${h.dataset.apWhy ?? ''}` : 'missing';
};

// What is moving in the host's scope right now (see the header).
const motionState = (i) => {
  const host = document.querySelector(`[data-ap-i="${i}"]`);
  const region = (host.dataset.apWithin && document.querySelector(host.dataset.apWithin)) || host.closest('[data-ap-scope]') || host.querySelector('[data-ap-scope]') || host;
  const chrome = '.mesh, .orbits, .grad-text';
  const control = 'a, button, input, select, textarea, summary, [role="tab"], [role="button"]';
  const target = (a) => a.effect?.target ?? null;
  const own = (a) => {
    const t = target(a);
    if (!t || t.closest(chrome)) return false;
    return !(a instanceof CSSTransition && (t.matches(control) || t === document.activeElement));
  };
  const name = (a) => `${a.animationName ?? a.transitionProperty ?? a.id ?? 'anim'}@${target(a)?.tagName?.toLowerCase()}.${String(target(a)?.className?.baseVal ?? target(a)?.className ?? '').split(' ')[0]}`;
  return {
    html: region.innerHTML.replace(/\sdata-ap[\w-]*="[^"]*"/g, ''),
    clips: [...(region.matches('video') ? [region] : []), ...region.querySelectorAll('video')].map((v) => `${v.currentTime.toFixed(2)}:${v.paused}`),
    clocks: region.getAnimations({ subtree: true }).filter(own).map((a) => `${name(a)}:${a.playState}:${Math.round(Number(a.currentTime ?? 0))}`),
  };
};

// Hold the live animations of the scope, so a later read can say which of them advanced.
const holdClocks = (i) => {
  const host = document.querySelector(`[data-ap-i="${i}"]`);
  const region = (host.dataset.apWithin && document.querySelector(host.dataset.apWithin)) || host.closest('[data-ap-scope]') || host.querySelector('[data-ap-scope]') || host;
  const chrome = '.mesh, .orbits, .grad-text';
  const control = 'a, button, input, select, textarea, summary, [role="tab"], [role="button"]';
  window.__held = region
    .getAnimations({ subtree: true })
    .filter((a) => {
      const t = a.effect?.target;
      return t && !t.closest(chrome) && !(a instanceof CSSTransition && (t.matches(control) || t === document.activeElement));
    })
    .map((a) => ({ a, t: Number(a.currentTime ?? 0), state: a.playState }));
  return window.__held.length;
};
const readHeld = () =>
  window.__held
    .map(({ a, t }) => {
      const now = Number(a.currentTime ?? 0);
      const target = a.effect?.target;
      const name = `${a.animationName ?? a.transitionProperty ?? a.id ?? 'anim'}@${target?.tagName?.toLowerCase()}.${String(target?.className?.baseVal ?? target?.className ?? '').split(' ')[0]}`;
      return Math.abs(now - t) > 5 ? `${name} ${Math.round(t)} -> ${Math.round(now)} ms (${a.playState})` : null;
    })
    .filter(Boolean);

// A point inside the host's scope that is visible, belongs to it and sits on no control and no transition, so hovering it
// does nothing but report "the pointer is here".
const quietPoint = (i) => {
  const host = document.querySelector(`[data-ap-i="${i}"]`);
  const scope = (host.dataset.apWithin && document.querySelector(host.dataset.apWithin)) || host.closest('[data-ap-scope]') || host.querySelector('[data-ap-scope]') || host;
  const r = scope.getBoundingClientRect();
  const x0 = Math.max(r.left, 0);
  const x1 = Math.min(r.right, innerWidth);
  const y0 = Math.max(r.top, 0);
  const y1 = Math.min(r.bottom, innerHeight);
  if (x1 <= x0 || y1 <= y0) return null;
  let any = null;
  for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85, 0.4, 0.6]) {
    for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85, 0.4, 0.6]) {
      const x = x0 + (x1 - x0) * fx;
      const y = y0 + (y1 - y0) * fy;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !scope.contains(hit)) continue;
      any ??= { x, y };
      if (!hit.closest('a, button, [role="tab"], [tabindex]:not([tabindex="-1"]), input, select, textarea')) return { x, y };
    }
  }
  return any;
};

const restPoint = (i) => {
  const host = document.querySelector(`[data-ap-i="${i}"]`);
  const scope = (host.dataset.apWithin && document.querySelector(host.dataset.apWithin)) || host.closest('[data-ap-scope]') || host.querySelector('[data-ap-scope]') || host;
  for (const [x, y] of [[2, 2], [innerWidth - 2, 2], [2, innerHeight - 2], [innerWidth - 2, innerHeight - 2]]) {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !scope.contains(hit)) return { x, y };
  }
  return { x: 2, y: 2 };
};

const focusIn = (i) => {
  const host = document.querySelector(`[data-ap-i="${i}"]`);
  const scope = (host.dataset.apWithin && document.querySelector(host.dataset.apWithin)) || host.closest('[data-ap-scope]') || host.querySelector('[data-ap-scope]') || host;
  const target = [...scope.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"]), input, select, textarea')].find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]');
  });
  if (!target) return false;
  target.focus({ preventScroll: true });
  return true;
};

const blurAll = () => document.activeElement instanceof HTMLElement && document.activeElement.blur();
const centreHost = (i) => document.querySelector(`[data-ap-i="${i}"]`).scrollIntoView({ block: 'center', behavior: 'instant' });
const awayFromHost = (i) => {
  const top = document.querySelector(`[data-ap-i="${i}"]`).getBoundingClientRect().top + scrollY;
  scrollTo({ top: top > innerHeight + 200 ? 0 : document.documentElement.scrollHeight, behavior: 'instant' });
};
const setHidden = (hidden) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

// The custom-branded phone, read as one thing: which example brand it shows on every surface (phone, side phones, chips, name).
const brandState = () => {
  const stage = document.querySelector('[data-ap-stage]');
  const brands = JSON.parse(stage.dataset.brands);
  const css = (el, name) => getComputedStyle(el).getPropertyValue(name).replace(/\s+/g, '').trim();
  const norm = (s) => String(s).replace(/\s+/g, '').trim();
  const phone = stage.querySelector('[data-morph]');
  const name = phone.querySelector('[data-app-name]').textContent.trim();
  const at = brands.findIndex((b) => b.n === name);
  const got = {
    name,
    mark: phone.querySelector('[data-app-mk]').textContent.trim(),
    colour: css(phone.querySelector('[data-app]'), '--bc'),
    image: css(phone.querySelector('[data-app-img]'), '--img'),
    chips: [...stage.querySelectorAll('.flychip')].map((c) => css(c, '--bc')),
    sides: [...stage.querySelectorAll('.ap-side')].map((sd) => ({ colour: css(sd.querySelector('.app-scr'), '--bc'), mark: sd.querySelector('.mk')?.textContent.trim(), name: sd.querySelector('.an')?.textContent.trim() })),
    running: stage.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
  };
  const b = brands[at];
  const side = (k) => brands[(at + (k ? 1 : brands.length - 1)) % brands.length];
  const mixed = [];
  if (!b) mixed.push(`name "${name}" is no example brand (a half-scrambled name)`);
  else {
    if (got.mark !== b.m) mixed.push(`mark ${got.mark} (name is ${b.n}, mark ${b.m})`);
    if (got.colour !== norm(b.c)) mixed.push(`colour ${got.colour} (name is ${b.n}, colour ${b.c})`);
    if (got.image !== norm(b.i)) mixed.push('photo of another brand');
    got.chips.forEach((c, k) => c !== norm(b.c) && mixed.push(`chip ${k} colour ${c}`));
    got.sides.forEach((sd, k) => {
      const w = side(k);
      if (sd.colour !== norm(w.c) || sd.mark !== w.m || sd.name !== w.n) mixed.push(`side phone ${k} is not the neighbour of ${b.n}`);
    });
  }
  return { at, mixed, running: got.running, name };
};

export async function engageMovementChecks({ open, check, sleep, settle }, p) {
  const label = p.slug;
  const page = await open({ width: 1440, height: 900 }, p.path);
  await page.mouse.move(2, 2);
  await settle(page);
  const hosts = await page.evaluate(tagHosts);

  const waitState = async (i, want, ms = 2500) => {
    const t0 = Date.now();
    let s = '';
    while (Date.now() - t0 < ms) {
      s = await page.evaluate(hostState, i);
      if (s === want) return { ok: true, s };
      await sleep(40);
    }
    return { ok: false, s };
  };
  const same = (a, b) => a.html === b.html && a.clips.join() === b.clips.join() && a.clocks.join() === b.clocks.join();
  // Poll until something in the scope moves; true as soon as it does.
  const untilMoved = async (i, ms) => {
    const t0 = Date.now();
    let prev = await page.evaluate(motionState, i);
    while (Date.now() - t0 < ms) {
      await sleep(40);
      const now = await page.evaluate(motionState, i);
      if (!same(prev, now)) return true;
      prev = now;
    }
    return false;
  };

  const conditions = [
    {
      name: 'the pointer is over it',
      flag: 'off/hover',
      apply: async (h) => {
        const pt = await page.evaluate(quietPoint, h.i);
        if (!pt) return false;
        await page.mouse.move(pt.x, pt.y);
        return true;
      },
      release: async (h) => {
        const rest = await page.evaluate(restPoint, h.i);
        await page.mouse.move(rest.x, rest.y);
      },
    },
    {
      name: 'keyboard focus is inside it',
      flag: 'off/focus',
      apply: (h) => page.evaluate(focusIn, h.i),
      release: () => page.evaluate(blurAll),
    },
    {
      name: 'it is off screen',
      flag: 'off/offscreen',
      apply: async (h) => {
        await page.evaluate(awayFromHost, h.i);
        return true;
      },
      release: (h) => page.evaluate(centreHost, h.i),
    },
    {
      name: 'the tab is hidden',
      flag: 'off/hidden',
      apply: async () => {
        await page.evaluate(setHidden, true);
        return true;
      },
      release: () => page.evaluate(setHidden, false),
    },
    {
      name: 'reduced motion is switched on mid-run',
      flag: 'off/reduced',
      apply: async () => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        return true;
      },
      release: () => page.emulateMedia({ reducedMotion: 'no-preference' }),
    },
  ];

  const still = Object.fromEntries(conditions.map((c) => [c.name, []]));
  const resumed = [];
  const flags = [];
  const idle = [];
  const unavailable = [];
  const exercised = Object.fromEntries(conditions.map((c) => [c.name, 0]));
  for (const h of hosts) {
    await page.evaluate(centreHost, h.i);
    const on = await waitState(h.i, 'on/', 3000);
    if (!on.ok) {
      idle.push(`${h.label} (${on.s})`);
      continue;
    }
    // Positive control: it moves while it runs.
    if (!(await untilMoved(h.i, 14000))) {
      idle.push(`${h.label} (nothing moved in 14 s while it ran)`);
      continue;
    }
    for (const c of conditions) {
      // Back to a running host, aligned to the start of a burst of work.
      const running = await waitState(h.i, 'on/', 3000);
      if (!running.ok || !(await untilMoved(h.i, 9000))) {
        idle.push(`${h.label} (not running before "${c.name}": ${running.s})`);
        continue;
      }
      if (!(await c.apply(h))) {
        unavailable.push(`${h.label} / ${c.name}`);
        continue;
      }
      exercised[c.name]++;
      const flag = await waitState(h.i, c.flag, 2000);
      if (!flag.ok) flags.push(`${h.label} when ${c.name} (${flag.s})`);
      // A CSS pause (animation-play-state) takes effect on the next frames and the clock settles then; wait that out.
      await sleep(250);
      await page.evaluate(holdClocks, h.i);
      const a = await page.evaluate(motionState, h.i);
      await sleep(1400);
      const b = await page.evaluate(motionState, h.i);
      const moved = await page.evaluate(readHeld);
      const what = [];
      if (a.html !== b.html) what.push('text/markup changed');
      if (a.clips.join() !== b.clips.join()) what.push(`clip ${a.clips.join(',')} -> ${b.clips.join(',')}`);
      what.push(...moved.slice(0, 3));
      if (what.length) still[c.name].push(`${h.label} (${what.join('; ')})`);
      await c.release(h);
      if (!(await untilMoved(h.i, 9000))) resumed.push(`${h.label} after ${c.name}`);
    }
  }
  const hostCount = hosts.length;
  check(group, `${label}: every autoplayer host moves while it runs (clocks, markup or clip time change within 14 s; ${hostCount} hosts)`, idle.length === 0 && hostCount >= 1, idle.join('; '));
  for (const c of conditions) {
    check(group, `${label}: nothing in an autoplayer's scope moves for 1.4 s after it pauses because ${c.name} (animation clocks, text and markup, clip time; ${exercised[c.name]} of ${hostCount} hosts exercised)`, still[c.name].length === 0 && exercised[c.name] >= 1, still[c.name].join(' | ') || `no host could be put in that condition: ${unavailable.join(', ')}`);
  }
  check(group, `${label}: every pause condition sets its data-ap flag`, flags.length === 0, flags.join('; '));
  check(group, `${label}: every autoplayer moves again once the condition is lifted`, resumed.length === 0, resumed.join('; '));
  await page.context().close();

  // The custom-branded phone swaps brand on a timer through a reveal, chip pulses and a name scramble. A pause has to hold that
  // swap where it stands, and reduced motion switched on at any point of it has to leave ONE brand on every surface.
  if (p.slug === 'custom-branded-apps') {
    const page2 = await open({ width: 1440, height: 900 }, p.path);
    await page2.mouse.move(2, 2);
    await settle(page2);
    await page2.evaluate(() => document.querySelector('[data-morph]').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await sleep(500);
    const nameNow = () => page2.evaluate(() => document.querySelector('[data-app-name]').textContent.trim());
    const swapStart = async () => {
      // The name changes (or starts scrambling) the instant a swap begins.
      let prev = await page2.evaluate(() => document.querySelector('[data-morph] [data-app-mk]').textContent.trim());
      for (let n = 0; n < 200; n++) {
        await sleep(30);
        const now = await page2.evaluate(() => document.querySelector('[data-morph] [data-app-mk]').textContent.trim());
        if (now !== prev) return true;
        prev = now;
      }
      return false;
    };
    const problems = [];
    for (const [mode, delay] of [['reduced motion', 120], ['reduced motion', 320], ['reduced motion', 560], ['hover, then reduced motion', 200], ['hover, then reduced motion', 450]]) {
      if (!(await swapStart())) {
        problems.push(`${mode} after ${delay} ms: no swap started`);
        continue;
      }
      if (mode.startsWith('hover')) {
        const pt = await page2.evaluate(() => {
          const r = document.querySelector('[data-ap-stage]').getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        await page2.mouse.move(pt.x, pt.y);
      }
      await sleep(delay);
      await page2.emulateMedia({ reducedMotion: 'reduce' });
      await sleep(450);
      const s = await page2.evaluate(brandState);
      const later = await sleep(700).then(() => page2.evaluate(brandState));
      const ok = s.mixed.length === 0 && s.at === 0 && s.running === 0 && later.name === s.name;
      if (!ok) problems.push(`${mode} after ${delay} ms: ${s.mixed.join(', ') || `shows brand ${s.at}`}${s.running ? `, ${s.running} animations still running` : ''}${later.name !== s.name ? `, name moved "${s.name}" -> "${later.name}"` : ''}`);
      await page2.emulateMedia({ reducedMotion: 'no-preference' });
      await page2.mouse.move(2, 2);
      await sleep(900);
    }
    check(group, `${label}: reduced motion switched on at any point of a brand swap (also while hovered) leaves one consistent brand (name, mark, colour, photo, side phones, chips) with nothing left running`, problems.length === 0, problems.join(' | '));
    // And it carries on afterwards: the swap restarts and ends consistent.
    const first = await nameNow();
    await sleep(4200);
    const after = await page2.evaluate(brandState);
    check(group, `${label}: after reduced motion is lifted the phone swaps brands again, each swap ending on one consistent brand`, (await nameNow()) !== first && after.mixed.length === 0, `${first} -> ${after.name}; ${after.mixed.join(', ')}`);
    await page2.context().close();
  }
}
