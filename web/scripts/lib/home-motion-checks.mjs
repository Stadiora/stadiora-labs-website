// Behaviour guards for everything on the home that moves (R57 V1 fix round).
//
// The flag checks in home-checks.mjs read the kit's own bookkeeping (`data-ap="off"`). A flag can say "off" while the code
// underneath keeps running (a cancelled-too-late requestAnimationFrame, a CSS loop nobody told about the hidden tab, a video
// that was never paused), so the guards here MEASURE what moves instead: DOM mutations, animation clocks, element poses,
// video currentTime, canvas pixels and the selected tab. A mouse pointer resting over a scene or clicking in it must change
// none of that (the scene keeps moving); keyboard focus inside it, being offscreen and a hidden tab must stop all of it.
// Each measurement has a control (the same host visibly moving a moment earlier) so a silent probe cannot pass.
//
// Groups (HOME_ONLY): "autoplay" (behaviour meter), "hidden-tab" (CSS loops against a hidden tab), "flip" (reduced
// motion switched on mid-scene), "hero-pointer" (the hero under the pointer, at a fixed phase of its cycle), "iris" (the CTA ring turns, by pixel diff). HOME_HOSTS=hero,pil-grid narrows the meter to hosts whose label contains one of them.

// ---- in-page functions (serialised into the page, so they must stay self-contained)

// Start counting everything that moves inside the host. Read it back with meterRead. With `cssLoops` false the CSS keyframe
// loops (ambient decoration) are not counted, see the note on pointer and focus in motionChecks.
const meterStart = ({ i, cssLoops = true }) => {
  window.__meter?.stop();
  const host = document.querySelector(`[data-ap-i="${i}"]`);
  const lab = (n) => `${n.tagName ? n.tagName.toLowerCase() : '#text'}${n.id ? `#${n.id}` : ''}${typeof n.className === 'string' && n.className ? `.${n.className.trim().split(/\s+/)[0]}` : ''}`;
  const hash = (c) => {
    try {
      const s = document.createElement('canvas');
      s.width = s.height = 24;
      const x = s.getContext('2d');
      x.drawImage(c, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data;
      let h = 0;
      for (let k = 0; k < d.length; k++) h = (h * 31 + d[k]) | 0;
      return h;
    } catch {
      return 0;
    }
  };
  const videos = () => (host.tagName === 'VIDEO' ? [host] : [...host.querySelectorAll('video')]);
  const anims = () => new Map(host.getAnimations({ subtree: true }).filter((a) => cssLoops || !(a instanceof CSSAnimation)).map((a) => [a, Number(a.currentTime ?? 0)]));
  const muts = new Map();
  const obs = new MutationObserver((list) => {
    for (const r of list) {
      if (r.type === 'attributes' && r.attributeName.startsWith('data-ap')) continue;
      const key = `${r.type === 'attributes' ? r.attributeName : r.type} on ${lab(r.target)}`;
      muts.set(key, (muts.get(key) ?? 0) + 1);
    }
  });
  obs.observe(host, { attributes: true, subtree: true, childList: true, characterData: true });
  const m = {
    muts,
    anims0: anims(),
    vids0: new Map(videos().map((v) => [v, v.currentTime])),
    cans: new Map([...host.querySelectorAll('canvas')].map((c) => [c, new Set([hash(c)])])),
    changed: 0,
    sel0: [...host.querySelectorAll('[role="tab"]')].findIndex((t) => t.getAttribute('aria-selected') === 'true'),
    timer: setInterval(() => m.cans.forEach((set, c) => set.add(hash(c))), 200),
  };
  const onChange = () => m.changed++;
  host.addEventListener('at:change', onChange);
  m.stop = () => {
    obs.disconnect();
    clearInterval(m.timer);
    host.removeEventListener('at:change', onChange);
  };
  m.host = host;
  m.lab = lab;
  m.videos = videos;
  m.anims = anims;
  m.hash = hash;
  window.__meter = m;
};

const meterRead = () => {
  const m = window.__meter;
  const why = [];
  const rows = [...m.muts.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length) why.push(`${rows.reduce((s, r) => s + r[1], 0)} DOM changes (${rows.slice(0, 2).map(([k, n]) => `${n}× ${k}`).join(', ')})`);
  const now = m.anims();
  const moved = [];
  for (const [a, t0] of m.anims0) if (!now.has(a) || Math.abs(now.get(a) - t0) > 1) moved.push(`${a.animationName ?? a.id ?? 'animation'} on ${a.effect?.target ? m.lab(a.effect.target) : '?'}`);
  for (const a of now.keys()) if (!m.anims0.has(a) && a.playState !== 'idle') moved.push(`new ${a.animationName ?? 'animation'} on ${a.effect?.target ? m.lab(a.effect.target) : '?'}`);
  if (moved.length) why.push(`${moved.length} animations advanced (${[...new Set(moved)].slice(0, 2).join(', ')})`);
  const vids = m.videos().filter((v) => Math.abs(v.currentTime - (m.vids0.get(v) ?? 0)) > 0.04);
  if (vids.length) why.push(`${vids.length} video(s) playing (${vids.map((v) => (v.currentSrc || v.dataset.clip || '').split('/').pop()).join(', ')})`);
  m.cans.forEach((set, c) => {
    set.add(m.hash(c));
    if (set.size > 1) why.push(`canvas redrawn (${m.lab(c)})`);
  });
  if (m.changed) why.push(`tab advanced by itself ${m.changed}×`);
  const sel = [...m.host.querySelectorAll('[role="tab"]')].findIndex((t) => t.getAttribute('aria-selected') === 'true');
  if (sel !== m.sel0) why.push(`selected tab moved ${m.sel0} -> ${sel}`);
  return { n: why.length, why };
};

const meterStop = () => window.__meter?.stop();

// Hosts that animate once and then stay put: after a pause there is nothing left to resume.
const ONE_SHOT = ['blockquote.proof-text'];

// Resolves once the host has been quiet: no finite CSS animation running inside it, and no DOM change (text, attribute,
// child) for `quiet` ms, or after `cap` ms. That covers what a step started before the pause may still be finishing, and
// the finite JavaScript work the page does on purpose, which getAnimations() cannot see: the brand scramble steps its
// letters from timeouts staggered 70 ms apart and requestAnimationFrame, so there can be a gap of one stagger between two
// writes. `quiet` is longer than that gap. A host that pauses for real goes quiet at once; one that does not keeps writing,
// is never quiet, stays unsettled until the cap and is then measured as moving. No fixed sleep decides the outcome, and
// nothing is excluded from the measurement that follows.
const settled = ({ i, cap, quiet }) =>
  new Promise((resolve) => {
    const host = document.querySelector(`[data-ap-i="${i}"]`);
    const t0 = performance.now();
    let last = t0;
    const watch = new MutationObserver(() => {
      last = performance.now();
    });
    watch.observe(host, { subtree: true, childList: true, characterData: true, attributes: true });
    const tick = () => {
      const now = performance.now();
      const running = host.getAnimations({ subtree: true }).filter((a) => a.playState === 'running' && !(a.effect?.getComputedTiming().iterations === Infinity));
      if (running.length) last = now;
      if ((!running.length && now - last >= quiet) || now - t0 > cap) {
        watch.disconnect();
        resolve({ waited: Math.round(now - t0), running: running.length });
      } else requestAnimationFrame(tick);
    };
    tick();
  });

const hostWindow = (i) => Number(document.querySelector(`[data-ap-i="${i}"]`).dataset.at) || 0;

// Pose of every element a CSS animation is driving inside the scope, plus the animation clocks.
const poseSample = (scope) => {
  const root = document.querySelector(scope) ?? document.documentElement;
  const poses = {};
  let clock = 0;
  const seen = new Map();
  for (const a of root.getAnimations({ subtree: true })) {
    const t = a.effect?.target;
    if (!t || !(a instanceof CSSAnimation)) continue;
    clock += Number(a.currentTime ?? 0);
    const name = `${t.tagName.toLowerCase()}.${String(t.getAttribute('class') ?? '').split(' ').join('.')}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    const cs = getComputedStyle(t);
    const r = t.getBoundingClientRect();
    poses[`${name}#${n}`] = [r.left.toFixed(2), r.top.toFixed(2), cs.transform, cs.translate, cs.rotate, cs.scale, cs.offsetDistance, cs.strokeDashoffset, cs.opacity, cs.filter].join('|');
  }
  return { poses, clock };
};

// Everything that decides how a scene looks, per element of <main>. Two states of the page that should look the same must
// produce the same fingerprint. Not compared: inline transform (the computed one is), lazily applied background images and
// posters (they follow how far the page was scrolled, not the motion state) and the sources a clip parks while it is at its poster.
const fingerprint = () => {
  const props = ['opacity', 'transform', 'translate', 'rotate', 'scale', 'clipPath', 'filter', 'visibility', 'display', 'color', 'backgroundColor', 'boxShadow', 'maxHeight', 'strokeDashoffset', 'offsetDistance', 'backgroundPosition', 'objectPosition', 'borderColor', 'outlineColor', 'pointerEvents'];
  const attrs = ['aria-current', 'aria-selected', 'aria-hidden', 'hidden', 'inert', 'data-active', 'class', 'style', 'data-lit-ready', 'data-scrambling', 'tabindex'];
  const canvasHash = (c) => {
    const s = document.createElement('canvas');
    s.width = s.height = 32;
    const x = s.getContext('2d');
    x.drawImage(c, 0, 0, 32, 32);
    const d = x.getImageData(0, 0, 32, 32).data;
    let h = 0;
    for (let k = 0; k < d.length; k++) h = (h * 31 + d[k]) | 0;
    return h;
  };
  const out = [];
  const nodes = [...document.querySelector('main').querySelectorAll('*:not(source)')];
  for (const e of nodes) {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.replace(/\s+/g, ' ').trim()).join('');
    const cls = String(e.getAttribute('class') ?? '').split(/\s+/).filter((c) => c && !['in', 'is-off', 'is-on', 'go'].includes(c)).sort().join(' ');
    const a = attrs.map((k) => (k === 'class' ? cls : k === 'style' ? e.style.cssText.replace(/(?:^|\s)(?:transform|background-image):[^;]*;/g, '') : (e.getAttribute(k) ?? ''))).join('|');
    const v = e instanceof HTMLVideoElement ? `${e.readyState}/${e.currentTime}/${e.paused}/${e.getAttribute('poster') || e.dataset.poster || ''}` : '';
    const c = e instanceof HTMLCanvasElement ? `canvas:${canvasHash(e)}` : e.classList.contains('count') ? `counter:${cs.counterReset}` : '';
    out.push({
      key: `${out.length}:${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}.${String(e.getAttribute('class') ?? '').split(' ')[0]}`,
      v: [props.map((p) => cs[p]).join(','), [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 2) / 2).join(','), own, a, v, c].join(' ¦ '),
    });
  }
  return out;
};

// ---- iris ring of the brand strip's CTA: two screenshots apart, diffed in the page on the 2 px ring and on the pixels beyond it.
const irisAngle = () => getComputedStyle(document.querySelector('.mega-cta'), '::before').getPropertyValue('--a').trim();

const irisBox = () => {
  const r = document.querySelector('.mega-cta').getBoundingClientRect();
  return { x: Math.floor(r.left) - 8, y: Math.floor(r.top) - 8, width: Math.ceil(r.width) + 16, height: Math.ceil(r.height) + 16, left: r.left - Math.floor(r.left) + 8, top: r.top - Math.floor(r.top) + 8, w: r.width, h: r.height };
};

// Counts the pixels that changed (any channel by more than 10) between two PNGs, per zone around the capsule: the 2 px ring just
// outside the pill, and everything 4 px or more beyond it.
const irisDiff = async ({ a, b, box }) => {
  const load = (b64) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        resolve(x.getImageData(0, 0, c.width, c.height));
      };
      img.src = `data:image/png;base64,${b64}`;
    });
  const [A, B] = await Promise.all([load(a), load(b)]);
  const radius = box.h / 2;
  const cx = box.left + box.w / 2;
  const cy = box.top + box.h / 2;
  const half = box.w / 2 - radius;
  const out = { ring: 0, beyond: 0 };
  for (let y = 0; y < A.height; y++) {
    for (let x = 0; x < A.width; x++) {
      const dx = Math.max(Math.abs(x + 0.5 - cx) - half, 0);
      const dist = Math.hypot(dx, y + 0.5 - cy) - radius;
      const k = (y * A.width + x) * 4;
      const changed = Math.max(Math.abs(A.data[k] - B.data[k]), Math.abs(A.data[k + 1] - B.data[k + 1]), Math.abs(A.data[k + 2] - B.data[k + 2])) > 10;
      if (!changed) continue;
      if (dist > 0.3 && dist < 1.9) out.ring++;
      else if (dist >= 4) out.beyond++;
    }
  }
  return out;
};

const motionOn = () => document.querySelectorAll('[data-ap="on"]').length;

// ---- hero under the pointer: the pointer is put over the headline in the middle of a step, never at a random phase of the cycle.
// Resolves the moment the word swap has started (the conveyor, the zoom, the word and the toast are all in flight).
const heroStepStarted = () =>
  new Promise((resolve) => {
    const index = () => document.querySelector('[data-hero-word][data-active]')?.getAttribute('data-word-index');
    const first = index();
    const tick = () => (index() !== first ? resolve(true) : requestAnimationFrame(tick));
    tick();
  });

// Finite transitions and animations running right now (the keyframe loops are not counted).
const heroInFlight = () => {
  const running = document.querySelector('#hero').getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSAnimation && a.effect.getComputedTiming().iterations === Infinity) && a.playState === 'running');
  return running.map((a) => `${a instanceof CSSTransition ? `transition ${a.transitionProperty}` : a instanceof CSSAnimation ? `animation ${a.animationName}` : 'animate'} on ${a.effect?.target?.className?.toString().split(' ')[0] || a.effect?.target?.tagName}`);
};

const heroFingerprint = () => {
  const hero = document.querySelector('#hero');
  const out = [];
  for (const e of [hero, ...hero.querySelectorAll('*')]) {
    const cs = getComputedStyle(e);
    const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    out.push({ key: `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}.${String(e.getAttribute('class') ?? '').split(' ')[0]}`, v: [cs.transform, cs.opacity, cs.filter, cs.clipPath, cs.translate, cs.scale, cs.backgroundPosition, cs.boxShadow, own, e.children.length].join('|') });
  }
  const clocks = hero.getAnimations({ subtree: true }).map((a) => `${Math.round(Number(a.currentTime ?? 0))}`);
  return { out, clocks: clocks.join(','), count: clocks.length };
};

// ---- the guards

// A host state as hostState reports it ("off/hover") written the way the attributes read.
export const apState = (s) => {
  const [ap, why] = s.split('/');
  return why ? `data-ap=${ap} data-ap-why=${why}` : `data-ap=${ap}`;
};

export async function motionChecks({ open, check, sleep, metrics, on, pathFor, helpers }) {
  const { tagHosts, hostState, scopePoint, clickPoint, selectedTab, restPoint, focusIn, blurAll, centreHost, awayFromHost } = helpers;

  const waitState = async (page, i, want, ms = 2500) => {
    const t0 = Date.now();
    let s = '';
    while (Date.now() - t0 < ms) {
      s = await page.evaluate(hostState, i);
      if (s === want) return { ok: true, s };
      await sleep(120);
    }
    return { ok: false, s };
  };
  const holdState = async (page, i, want, ms) => {
    const t0 = Date.now();
    let s = want;
    while (Date.now() - t0 < ms) {
      s = await page.evaluate(hostState, i);
      if (s !== want) return { ok: false, s };
      await sleep(120);
    }
    return { ok: true, s };
  };
  const pool = async (items, size, fn) => {
    const queue = [...items];
    await Promise.all(Array.from({ length: size }, async () => {
      while (queue.length) await fn(queue.shift());
    }));
  };
  const eagerImages = (page) =>
    page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });
  const setHidden = (page, hidden) =>
    page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);

  // ------------------------------------------------------------ A. behaviour meter: every autoplayer, a pointer that must not stop it, three ways of pausing it
  // A pointer resting over the scene and a mouse click in it (a tab click included) must leave everything running: timers,
  // frame loops, timelines, clips, canvases and tab progress keep moving, and the CSS keyframe loops with them. Keyboard
  // focus pauses what the autoplayer drives (its timers, frame loops, timelines, clips, canvases and tab progress) but not
  // the CSS keyframe loops (hero colour wash, orbit lines, status dots, the CTA ring), which are decoration; offscreen and
  // hidden stop everything, CSS loops included, so those two windows count them.
  if (on('autoplay')) {
    const probe = await open({ width: 1440, height: 900 }, '/');
    await probe.mouse.move(2, 2);
    const all = await probe.evaluate(tagHosts);
    await probe.context().close();
    const wanted = process.env.HOME_HOSTS?.split(',');
    const hosts = wanted ? all.filter((h) => wanted.some((w) => h.label.includes(w))) : all;
    const problems = { control: [], hover: [], click: [], focus: [], offscreen: [], hidden: [], resume: [] };
    const probed = { hover: 0, click: 0, tabs: 0, clickSkipped: [], loopOnly: [] };
    let measuredSeconds = 0;
    let focusSkipped = 0;
    const notShown = [];

    await pool(hosts, 6, async (h) => {
      const page = await open({ width: 1440, height: 900 }, '/');
      try {
        await page.mouse.move(2, 2);
        await eagerImages(page);
        await page.evaluate(tagHosts);
        const tabWindow = await page.evaluate(hostWindow, h.i);
        const win = tabWindow ? tabWindow + 800 : 3400;
        const settleMs = 1800;
        const oneShot = ONE_SHOT.some((l) => h.label.includes(l));

        // A clip lives in one tab's panel. Tabs now keep cycling while the pointer rests or clicks, so wait until its panel is the selected one
        // before measuring or pausing it (a clip on an unselected tab is hidden and cannot move).
        const shown = () => page.waitForFunction((i) => !document.querySelector(`[data-ap-i="${i}"]`).closest('[data-panel]:not(.on)'), h.i, { timeout: 40000, polling: 200 }).catch(() => {});
        // Wait for the host to show activity (up to 9 s); returns the evidence. `cssLoops` false looks only at what the autoplayer drives.
        const activity = async (ms = 9000, cssLoops = true) => {
          await shown();
          await page.evaluate(meterStart, { i: h.i, cssLoops });
          const t0 = Date.now();
          let r = { n: 0, why: [] };
          while (Date.now() - t0 < ms) {
            await sleep(300);
            r = await page.evaluate(meterRead);
            if (r.n) break;
          }
          await page.evaluate(meterStop);
          return r;
        };
        // After a pause has settled, nothing may move for the whole window.
        const still = async (cond) => {
          if (cond === 'focus') await page.evaluate(settled, { i: h.i, cap: 7500, quiet: 400 });
          else await sleep(settleMs);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
          await page.evaluate(meterStart, { i: h.i, cssLoops: cond !== 'focus' });
          await sleep(win);
          const r = await page.evaluate(meterRead);
          await page.evaluate(meterStop);
          measuredSeconds += (settleMs + win) / 1000;
          if (r.n) problems[cond].push(`${h.label}: ${r.why.join('; ')}`);
        };
        const resumes = async (cond) => {
          const back = await waitState(page, h.i, 'on/', 2000);
          const r = back.ok && !oneShot ? await activity() : { n: 1, why: [] };
          if (!back.ok || !r.n) problems.resume.push(`${h.label} after ${cond} (${back.ok ? 'no activity' : back.s})`);
        };
        // The pointer (resting or clicking) must not have stopped it: state stays on and the same meter still sees it move. What the
        // autoplayer itself drives has to move when it moved without the pointer (`strict`); a host whose only motion is CSS loops is held to those.
        const keepsMoving = async (where, strict, bucket) => {
          const held = await holdState(page, h.i, 'on/', 1200);
          if (!held.ok) {
            problems[bucket].push(`${h.label}: paused ${where} (${apState(held.s)})`);
            return;
          }
          const r = oneShot ? { n: 1 } : await activity(9000, !strict);
          if (!r.n) problems[bucket].push(`${h.label}: frozen ${where} (nothing moved, changed, played or advanced in 9 s${strict ? '' : ', CSS loops included'})`);
        };

        await page.evaluate(centreHost, h.i);
        // A clip on a tab that is not selected is hidden and does not play; its tab list is measured as its own host.
        if (await page.evaluate((i) => Boolean(document.querySelector(`[data-ap-i="${i}"]`).closest('[data-panel]:not(.on)')), h.i)) {
          notShown.push(h.label);
          return;
        }
        const started = await waitState(page, h.i, 'on/');
        if (!started.ok) {
          problems.control.push(`${h.label}: never started (${started.s})`);
          return;
        }
        const control = await activity();
        if (!control.n) {
          problems.control.push(`${h.label}: nothing moved in 9 s while running`);
          return;
        }

        // Does the host move when only what the autoplayer drives is counted? Decides what the pointer probes hold it to.
        const strict = (await activity(9000, false)).n > 0;
        if (!strict) probed.loopOnly.push(h.label);

        const pt = await page.evaluate(scopePoint, h.i);
        if (pt) {
          await page.mouse.move(pt.x, pt.y);
          probed.hover++;
          await keepsMoving('under the pointer', strict, 'hover');
          const cp = await page.evaluate(clickPoint, h.i);
          if (!cp) probed.clickSkipped.push(h.label);
          else {
            const url = page.url();
            await page.mouse.click(cp.x, cp.y);
            probed.click++;
            if (cp.tab >= 0) {
              probed.tabs++;
              await sleep(150);
              const sel = await page.evaluate(selectedTab, h.i);
              if (sel !== cp.tab) problems.click.push(`${h.label}: a mouse click on tab ${cp.tab} left tab ${sel} selected`);
              else if (tabWindow) {
                // The clicked tab gets its dwell time: half of it later the cycle has not moved on yet.
                await sleep(Math.round(tabWindow / 2));
                const still = await page.evaluate(selectedTab, h.i);
                if (still !== cp.tab) problems.click.push(`${h.label}: tab ${cp.tab} was clicked but the cycle moved on to tab ${still} within ${Math.round(tabWindow / 2)} ms (it needs its full ${tabWindow} ms)`);
              }
            }
            await keepsMoving(`after a mouse click${cp.tab >= 0 ? ' on a tab' : ''}`, strict, 'click');
            if (page.url() !== url) problems.click.push(`${h.label}: the click left the page (${page.url()})`);
          }
          const rest = await page.evaluate(restPoint, h.i);
          await page.mouse.move(rest.x, rest.y);
          await keepsMoving('after the pointer left', strict, 'hover');
          await page.evaluate(blurAll);
        } else problems.hover.push(`${h.label}: no hoverable point`);

        // :focus-visible matches a script focus() only after a keyboard event: a key press first makes this a keyboard user tabbing in.
        await page.keyboard.press('Shift');
        await shown();
        if (await page.evaluate(focusIn, h.i)) {
          const s = await waitState(page, h.i, 'off/focus', 1500);
          if (!s.ok) problems.focus.push(`${h.label}: state ${s.s}`);
          else await still('focus');
          await page.evaluate(blurAll);
          await resumes('focus');
        } else focusSkipped++;

        await shown();
        await page.evaluate(awayFromHost, h.i);
        const away = await waitState(page, h.i, 'off/offscreen', 2500);
        if (!away.ok) problems.offscreen.push(`${h.label}: state ${away.s}`);
        else await still('offscreen');
        await page.evaluate(centreHost, h.i);
        await resumes('offscreen');

        await shown();
        await setHidden(page, true);
        const hid = await waitState(page, h.i, 'off/hidden', 1500);
        if (!hid.ok) problems.hidden.push(`${h.label}: state ${hid.s}`);
        else await still('hidden');
        await setHidden(page, false);
        await resumes('hidden');
      } catch (e) {
        problems.control.push(`${h.label}: probe error ${String(e.message).split('\n')[0]}`);
      } finally {
        await page.context().close();
      }
    });

    const n = hosts.length;
    check('autoplay', `behaviour: every autoplayer visibly moves while it is running (${n} hosts measured)`, (n >= 20 || wanted) && problems.control.length === 0, problems.control.join('; ') || `${n - notShown.length} hosts${notShown.length ? `; ${notShown.length} clips on unselected tabs are hidden and left to their tab list` : ''}`);
    check('autoplay', 'behaviour: every autoplayer shows activity again after each pause (measured, not the data-ap flag)', problems.resume.length === 0, problems.resume.join('; '));
    check('autoplay', `behaviour: everything inside an autoplayer keeps moving, changing, playing and advancing while the pointer is over it (data-ap stays on; ${probed.hover} hosts probed, ${probed.loopOnly.length} of them held to their CSS loops only)`, problems.hover.length === 0 && (probed.hover >= 15 || wanted), problems.hover.join('; ') || `${probed.hover} hosts`);
    check('autoplay', `behaviour: everything inside an autoplayer keeps moving after a mouse click in it, and a click on a tab selects it (${probed.click} hosts clicked, ${probed.tabs} on a tab; at least 15 and 1 expected)`, problems.click.length === 0 && ((probed.click >= 15 && probed.tabs >= 1) || wanted), `${problems.click.join('; ') || `${probed.click} hosts clicked`}${probed.clickSkipped.length ? ` [no safe click point: ${probed.clickSkipped.join(', ')}]` : ''}`);
    for (const [cond, text] of [
      ['focus', 'keyboard focus is inside it'],
      ['offscreen', 'it is scrolled offscreen'],
      ['hidden', 'the tab is hidden'],
    ]) {
      check('autoplay', `behaviour: nothing inside an autoplayer moves, changes, plays or advances for a full window while ${text}`, problems[cond].length === 0, problems[cond].join('; ') || `${n} hosts${cond === 'focus' ? `, ${n - focusSkipped} with a focusable control` : ''}`);
    }
    metrics['behaviour'] = { hosts: n, hoverProbed: probed.hover, clicked: probed.click, tabsClicked: probed.tabs, loopOnlyHosts: probed.loopOnly.length, secondsMeasuredWhilePaused: Math.round(measuredSeconds), hostsWithoutFocusableControl: focusSkipped, clipsOnUnselectedTabs: notShown.length };
  }

  // ------------------------------------------------------------ A2. the hero under the pointer, at a fixed phase
  // A pointer anywhere over the hero, the headline included, stops nothing: not what a step has already started (the 7 s zoom of
  // the big photo, the conveyor, the word, the toast, the parallax) and not a keyframe loop. The probe waits for the swap to
  // start, puts the pointer over the headline at once, waits two frames, and then follows the whole subtree (computed pose, text,
  // animation clocks, the word, the conveyor's pointer parallax) over four samples while the pointer keeps moving across the copy,
  // for the same 4.4 s the pause used to be measured over. A control makes sure transitions were really in flight. Then a mouse
  // click on the headline and one on the lead must leave it running, and so must the pointer leaving.
  if (on('hero-pointer')) {
    const page = await open({ width: 1440, height: 900 }, '/');
    try {
      await page.mouse.move(2, 2);
      const points = await page.evaluate(() => {
        const h1 = document.querySelector('[data-hero-copy] h1').getBoundingClientRect();
        const copy = document.querySelector('[data-hero-copy]').getBoundingClientRect();
        const lead = document.querySelector('[data-hero-copy] .lead').getBoundingClientRect();
        const a = { x: h1.left + Math.min(40, h1.width / 2), y: h1.top + h1.height / 2 };
        return { a, b: { x: copy.right - 40, y: a.y + 40 }, lead: { x: lead.left + Math.min(40, lead.width / 2), y: lead.top + lead.height / 2 } };
      });
      await page.waitForFunction(() => document.querySelector('#hero').dataset.ap === 'on');
      await page.evaluate(heroStepStarted);
      const inFlight = await page.evaluate(heroInFlight);
      // Every state the hero's autoplayer takes from here on that is not a plain "on".
      await page.evaluate(() => {
        const hero = document.querySelector('#hero');
        window.__heroPaused = new Set();
        const note = () => {
          if (hero.dataset.ap !== 'on' || hero.dataset.apWhy) window.__heroPaused.add(`data-ap=${hero.dataset.ap}${hero.dataset.apWhy ? ` data-ap-why=${hero.dataset.apWhy}` : ''}`);
        };
        new MutationObserver(note).observe(hero, { attributes: true, attributeFilter: ['data-ap', 'data-ap-why'] });
        window.__heroNote = note;
        note();
      });
      const frames = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const read = () =>
        page.evaluate(() => ({
          word: document.querySelector('[data-hero-word][data-active]')?.getAttribute('data-word-index'),
          cvx: document.querySelector('[data-hero-cv]').style.getPropertyValue('--cvx'),
        }));
      // From a fingerprint, wait up to `ms` for the word to change and the animation clocks to move; both have to happen while the autoplayer stays on.
      const advances = async (from, ms) => {
        await page.evaluate(() => {
          window.__heroPaused.clear();
          window.__heroNote();
        });
        const t0 = Date.now();
        let r = { word: from.word, clocks: false };
        while (Date.now() - t0 < ms && !(r.word !== from.word && r.clocks)) {
          await sleep(150);
          const now = await page.evaluate(heroFingerprint);
          r = { word: (await read()).word, clocks: now.clocks !== from.fp.clocks };
        }
        return { wordMoved: r.word !== from.word, clocks: r.clocks, paused: await page.evaluate(() => [...window.__heroPaused]) };
      };
      const snapshot = async () => ({ ...(await read()), fp: await page.evaluate(heroFingerprint) });

      await page.mouse.move(points.a.x, points.a.y);
      await frames();
      const samples = [await snapshot()];
      const cvx = [samples[0].cvx];
      await sleep(1500);
      samples.push(await snapshot());
      await page.mouse.move(points.b.x, points.b.y, { steps: 8 });
      await frames();
      cvx.push((await read()).cvx);
      await page.mouse.move(points.a.x + 24, points.a.y + 18, { steps: 6 });
      await sleep(1400);
      samples.push(await snapshot());
      await sleep(1400);
      samples.push(await snapshot());
      const problems = [];
      const paused = await page.evaluate(() => [...window.__heroPaused]);
      if (paused.length) problems.push(`paused under the pointer (${paused.join(', ')})`);
      const words = new Set(samples.map((x) => x.word));
      if (words.size < 2) problems.push(`the word stayed on index ${samples[0].word} for 4.4 s`);
      for (let k = 1; k < samples.length; k++) if (samples[k].fp.clocks === samples[k - 1].fp.clocks) problems.push(`animation clocks did not advance between sample ${k - 1} and ${k}`);
      const [first, last] = [samples[0].fp, samples[samples.length - 1].fp];
      let changed = 0;
      for (let j = 0; j < Math.min(first.out.length, last.out.length); j++) if (first.out[j].v !== last.out[j].v) changed++;
      if (changed < 1) problems.push('no element in the hero changed pose or text');
      const dx = Math.abs(parseFloat(cvx[1]) - parseFloat(cvx[0]));
      if (!(dx > 0.2)) problems.push(`the conveyor parallax did not follow the pointer (--cvx ${cvx[0] || 'unset'} -> ${cvx[1] || 'unset'})`);
      check('hero-pointer', 'the pointer lands in the middle of a step: transitions and animations are in flight at that moment (control)', inFlight.length >= 3, `${inFlight.length} in flight: ${[...new Set(inFlight)].join(', ')}`);
      check('hero-pointer', 'hero under the pointer keeps running for 4.4 s of pointer movement over the headline (data-ap stays on, the word changes, animation clocks and poses advance, the parallax follows)', problems.length === 0, problems.slice(0, 4).join(' ; ') || `${first.out.length} elements, ${words.size} words, ${changed} elements changed, parallax ${dx.toFixed(1)}px`);

      const clickProblems = [];
      for (const [name, pt] of [['the headline', points.a], ['the lead', points.lead]]) {
        await page.mouse.click(pt.x, pt.y);
        await frames();
        const r = await advances(await snapshot(), 4500);
        if (!r.wordMoved) clickProblems.push(`the word stopped after a click on ${name}`);
        if (!r.clocks) clickProblems.push(`animation clocks stopped after a click on ${name}`);
        if (r.paused.length) clickProblems.push(`paused after a click on ${name} (${r.paused.join(', ')})`);
      }
      check('hero-pointer', 'a mouse click on the headline and on the lead leaves the hero running (data-ap stays on, the word keeps changing, clocks keep advancing)', clickProblems.length === 0, clickProblems.join(' ; ') || '2 clicks, hero kept running');

      await page.mouse.move(2, 2);
      await frames();
      const left = await advances(await snapshot(), 4500);
      check('hero-pointer', 'still running after the pointer leaves the hero (the word changes, clocks advance, data-ap on)', left.wordMoved && left.clocks && left.paused.length === 0, `word moved ${left.wordMoved}, clocks advanced ${left.clocks}${left.paused.length ? `, ${left.paused.join(', ')}` : ''}`);
      check('runtime', 'no console errors or page errors during the hero pointer probe', page.problems.length === 0, page.problems.join(' | '));
    } finally {
      await page.context().close();
    }
  }

  // ------------------------------------------------------------ A3. the iris ring of the brand strip's CTA turns
  // `--grad-iris` once resolved `var(--a)` at :root, so the ring never moved although the animation clock did. The guard
  // measures pixels, not the clock: the ring has to change between two screenshots 700 ms apart, the pixels beyond it must not,
  // `--a` has to advance on the pseudo-element, and under reduced motion the ring is still.
  if (on('iris')) {
    const turn = async (reduced) => {
      const page = await open({ width: 1440, height: 900, reduced }, '/');
      try {
        await page.mouse.move(2, 2);
        await page.evaluate(() => document.querySelector('.mega-cta').scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.bs-card')).opacity === '1' && getComputedStyle(document.querySelector('.mega-cta')).visibility !== 'hidden');
        await sleep(600);
        const box = await page.evaluate(irisBox);
        const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
        const angle0 = await page.evaluate(irisAngle);
        const a = (await page.screenshot({ clip })).toString('base64');
        await sleep(700);
        const b = (await page.screenshot({ clip })).toString('base64');
        const angle1 = await page.evaluate(irisAngle);
        const diff = await page.evaluate(irisDiff, { a, b, box });
        return { diff, angle0, angle1, problems: page.problems };
      } finally {
        await page.context().close();
      }
    };
    const live = await turn(false);
    const still = await turn(true);
    check('iris', 'the CTA ring is painted by an angle that turns: --a on ::before advances', live.angle0 !== live.angle1, `${live.angle0} -> ${live.angle1}`);
    check('iris', 'pixel diff: the 2 px ring changes between screenshots 700 ms apart (at least 400 px) and nothing beyond it does', live.diff.ring >= 400 && live.diff.beyond === 0, `${live.diff.ring} ring px changed, ${live.diff.beyond} px beyond the ring`);
    check('iris', 'reduced motion: the ring does not change (0 px)', still.diff.ring === 0 && still.diff.beyond === 0, `${still.diff.ring} ring px changed`);
    check('runtime', 'no console errors or page errors during the iris probe', live.problems.length === 0 && still.problems.length === 0, [...live.problems, ...still.problems].join(' | '));
  }

  // ------------------------------------------------------------ B. a hidden tab holds every CSS loop in place
  if (on('hidden-tab')) {
    const scenes = [
      ['#hero', ['.marquee-track', '.mesh .b1', '.orbits .dash']],
      ['#brand', ['.marquee-track']],
      ['#proof', ['.orbits .dash'], '#proof .proof-card'],
      ['#final', ['.orbits .fdot']],
    ];
    const page = await open({ width: 1440, height: 900 }, '/');
    await page.mouse.move(2, 2);
    for (const [scope, named, view = scope] of scenes) {
      await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), view);
      await sleep(900);
      const measure = async () => {
        const a = await page.evaluate(poseSample, scope);
        await sleep(1200);
        const b = await page.evaluate(poseSample, scope);
        const moving = Object.keys(b.poses).filter((k) => a.poses[k] !== b.poses[k]);
        return { moving, clock: Math.round(b.clock - a.clock), total: Object.keys(b.poses).length };
      };
      const namedMoving = (r) => named.map((s) => [s, r.moving.some((k) => k.includes(`.${s.split(' ').pop().replace(/^\./, '')}`))]);
      const control = await measure();
      await setHidden(page, true);
      await sleep(400);
      const hidden = await measure();
      await setHidden(page, false);
      await sleep(400);
      const back = await measure();
      const ctl = namedMoving(control);
      check('hidden-tab', `${scope}: before the tab is hidden the CSS loops move (${named.join(', ')} measured by transform, offset or stroke)`, control.total >= named.length && control.clock > 500 && ctl.every(([, m]) => m), `${control.moving.length}/${control.total} elements moved, clock +${control.clock} ms, not moving: ${ctl.filter(([, m]) => !m).map(([s]) => s).join(', ') || 'none'}`);
      check('hidden-tab', `${scope}: while the tab is hidden no CSS loop moves (0 element poses changed, animation clocks +0 ms)`, hidden.total >= control.total - 1 && hidden.moving.length === 0 && hidden.clock === 0, `${hidden.moving.length} of ${hidden.total} moved: ${hidden.moving.slice(0, 3).join(', ')}; clock +${hidden.clock} ms`);
      check('hidden-tab', `${scope}: when the tab is visible again the CSS loops move again`, back.moving.length >= 1 && namedMoving(back).every(([, m]) => m), `${back.moving.length} elements moved`);
    }
    check('runtime', 'no console errors or page errors during the hidden-tab walk', page.problems.length === 0, page.problems.join(' | '));
    await page.context().close();
  }

  // ------------------------------------------------------------ C. reduced motion switched on in the middle of a scene
  // Whatever scene is running, flipping the preference must leave exactly the page a visitor with reduced motion gets on load:
  // every scene on its final state, posters instead of video, nothing mid-flight. Compared element by element.
  if (on('flip')) {
    const scenes = ['#hero', '#ai', '#pillars', '#brand', '#showcase', '#plan', '#measure', '#engage', '#scale', '#apps', '#proof', '#final'];
    const cases = [
      { width: 1440, height: 900, locale: 'en', scenes },
      { width: 390, height: 844, locale: 'en', scenes },
      { width: 1440, height: 900, locale: 'es', scenes: ['#hero', '#pillars', '#showcase', '#plan', '#measure', '#engage'] },
    ];
    // The scene's first autoplayer in the middle of the screen (or the top of the hero): that is the part that is running.
    const bring = (s) => {
      const sec = document.querySelector(s);
      (s === '#hero' ? sec : (sec.querySelector('[data-ap]') ?? sec)).scrollIntoView({ block: s === '#hero' ? 'start' : 'center', behavior: 'instant' });
    };
    for (const c of cases) {
      const mobile = c.width < 600;
      const ref = await open({ width: c.width, height: c.height, reduced: true, mobile }, pathFor(c.locale));
      await eagerImages(ref);
      await sleep(1200);
      const want = await ref.evaluate(fingerprint);
      await ref.context().close();
      const bad = [];
      let compared = 0;
      await pool(c.scenes, 4, async (scene) => {
        const page = await open({ width: c.width, height: c.height, mobile }, pathFor(c.locale));
        try {
          await page.mouse.move(2, 2);
          await eagerImages(page);
          await page.evaluate(bring, scene);
          await sleep(3600);
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await sleep(900);
          await page.evaluate(() => scrollTo(0, 0));
          await sleep(500);
          const got = await page.evaluate(fingerprint);
          compared += got.length;
          const diffs = [];
          if (got.length !== want.length) diffs.push(`${got.length} elements, reduced-at-load has ${want.length}`);
          for (let k = 0; k < Math.min(got.length, want.length) && diffs.length < 4; k++) {
            if (got[k].v === want[k].v) continue;
            const a = got[k].v.split(' ¦ ');
            const b = want[k].v.split(' ¦ ');
            const at = a.findIndex((p, j) => p !== b[j]);
            diffs.push(`${got[k].key}: [${at}] "${a[at]?.slice(0, 80)}" instead of "${b[at]?.slice(0, 80)}"`);
          }
          const vids = await page.evaluate(() => [...document.querySelectorAll('video[data-clip]')].filter((v) => v.readyState !== 0 || v.currentTime !== 0 || !v.paused || !v.getAttribute('poster')).map((v) => `${(v.dataset.clip || '').split('/').pop()} state ${v.readyState}/${v.currentTime}/${v.paused ? 'paused' : 'playing'}/${v.getAttribute('poster') ? 'poster' : 'no poster'}`));
          if (vids.length) diffs.push(`${vids.length} clips not at their poster: ${vids.slice(0, 2).join(', ')}`);
          const running = await page.evaluate(motionOn);
          if (running) diffs.push(`${running} autoplayers still on`);
          // And back again: the scene has to come back to life without errors.
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await sleep(600);
          await page.evaluate(bring, scene);
          await sleep(1500);
          const live = await page.evaluate(motionOn);
          if (!live) diffs.push('nothing restarts after switching motion back on');
          if (page.problems.length) diffs.push(`page errors: ${page.problems.slice(0, 2).join(' | ')}`);
          if (diffs.length) bad.push(`${scene}: ${diffs.join(' ; ')}`);
        } catch (e) {
          bad.push(`${scene}: probe error ${String(e.message).split('\n')[0]}`);
        } finally {
          await page.context().close();
        }
      });
      check('reduced-motion', `${c.locale}/${c.width}: switching to reduced motion in the middle of ${c.scenes.length} different scenes leaves each one exactly as a reduced-motion load shows it (final state, posters, nothing running)`, bad.length === 0, bad.join(' || ') || `${compared} element states compared`);
    }
  }
}
