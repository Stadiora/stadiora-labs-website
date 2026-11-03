// Behaviour guards for everything on the home that moves (R57 V1 fix round).
//
// The flag checks in home-checks.mjs read the kit's own bookkeeping (`data-ap="off"`). A flag can say "off" while the code
// underneath keeps running (a cancelled-too-late requestAnimationFrame, a CSS loop nobody told about the hidden tab, a video
// that was never paused), so the guards here MEASURE what moves instead: DOM mutations, animation clocks, element poses,
// video currentTime, canvas pixels and the selected tab, while the pointer is over a scene, focus is inside it, it is
// offscreen and the tab is hidden. Each measurement has a control (the same host visibly moving a moment earlier) so a
// silent probe cannot pass.
//
// Groups (HOME_ONLY): "autoplay" (behaviour meter), "hidden-tab" (CSS loops against a hidden tab), "flip" (reduced
// motion switched on mid-scene). HOME_HOSTS=hero,pil-grid narrows the meter to hosts whose label contains one of them.

// ---- in-page functions (serialised into the page, so they must stay self-contained)

// Start counting everything that moves inside the host. Read it back with meterRead. With `cssLoops` false the CSS keyframe
// loops (ambient decoration) are not counted, see the note on hover and focus in motionChecks.
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

const motionOn = () => document.querySelectorAll('[data-ap="on"]').length;

// ---- the guards

export async function motionChecks({ open, check, sleep, metrics, on, pathFor, helpers }) {
  const { tagHosts, hostState, scopePoint, restPoint, focusIn, blurAll, centreHost, awayFromHost } = helpers;

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

  // ------------------------------------------------------------ A. behaviour meter: every autoplayer, four ways of pausing it
  // Hover and focus pause what the autoplayer drives: its timers, frame loops, timelines, clips, canvases and tab progress.
  // The CSS keyframe loops (hero colour wash, orbit lines, status dots, the CTA ring) are decoration that keeps running
  // under the pointer by design; the marquees have their own :hover rule (measured in the marquee group). Offscreen and
  // hidden stop everything, CSS loops included, so those two windows count them.
  if (on('autoplay')) {
    const probe = await open({ width: 1440, height: 900 }, '/');
    await probe.mouse.move(2, 2);
    const all = await probe.evaluate(tagHosts);
    await probe.context().close();
    const wanted = process.env.HOME_HOSTS?.split(',');
    const hosts = wanted ? all.filter((h) => wanted.some((w) => h.label.includes(w))) : all;
    const problems = { control: [], hover: [], focus: [], offscreen: [], hidden: [], resume: [] };
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

        // Wait for the host to show activity (up to 9 s); returns the evidence.
        const activity = async (ms = 9000) => {
          await page.evaluate(meterStart, { i: h.i });
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
          await sleep(settleMs);
          await page.evaluate(meterStart, { i: h.i, cssLoops: !(cond === 'hover' || cond === 'focus') });
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

        const pt = await page.evaluate(scopePoint, h.i);
        if (pt) {
          await page.mouse.move(pt.x, pt.y);
          const s = await waitState(page, h.i, 'off/hover', 1500);
          if (!s.ok) problems.hover.push(`${h.label}: state ${s.s}`);
          else await still('hover');
          const rest = await page.evaluate(restPoint, h.i);
          await page.mouse.move(rest.x, rest.y);
          await resumes('hover');
        } else problems.hover.push(`${h.label}: no hoverable point`);

        if (await page.evaluate(focusIn, h.i)) {
          const s = await waitState(page, h.i, 'off/focus', 1500);
          if (!s.ok) problems.focus.push(`${h.label}: state ${s.s}`);
          else await still('focus');
          await page.evaluate(blurAll);
          await resumes('focus');
        } else focusSkipped++;

        await page.evaluate(awayFromHost, h.i);
        const away = await waitState(page, h.i, 'off/offscreen', 2500);
        if (!away.ok) problems.offscreen.push(`${h.label}: state ${away.s}`);
        else await still('offscreen');
        await page.evaluate(centreHost, h.i);
        await resumes('offscreen');

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
    for (const [cond, text] of [
      ['hover', 'the pointer is over it'],
      ['focus', 'keyboard focus is inside it'],
      ['offscreen', 'it is scrolled offscreen'],
      ['hidden', 'the tab is hidden'],
    ]) {
      check('autoplay', `behaviour: nothing inside an autoplayer moves, changes, plays or advances for a full window while ${text}`, problems[cond].length === 0, problems[cond].join('; ') || `${n} hosts${cond === 'focus' ? `, ${n - focusSkipped} with a focusable control` : ''}`);
    }
    metrics['behaviour'] = { hosts: n, secondsMeasuredWhilePaused: Math.round(measuredSeconds), hostsWithoutFocusableControl: focusSkipped, clipsOnUnselectedTabs: notShown.length };
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
