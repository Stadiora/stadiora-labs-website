// Floodlight motion guards for the five Platform pages (R57 VB-3). Everything that moves on its own goes through the
// motion kit, which mirrors its state to `data-ap` ("on" | "off") and `data-ap-why` ("reduced" | "hidden" |
// "offscreen" | "hover" | "focus"). These guards read that contract, so a stage that animates without the kit fails.
// The helpers mirror home-checks.mjs (kept local so this lane never edits the home lane's file).
// Called from evidence.mjs with its page opener and recorder.

import { FINAL_CLIP, HERO_CLIP, judgeVideo } from './engage-media-guard.mjs';
import { engageMovementChecks } from './engage-movement-checks.mjs';

const group = 'engage-motion';

const pages = [
  { slug: 'messaging', hosts: 3, tabs: 1 },
  { slug: 'guardian-portal', hosts: 4, tabs: 1 },
  { slug: 'teams', hosts: 3, tabs: 0 },
  { slug: 'custom-branded-apps', hosts: 2, tabs: 0 },
  { slug: 'integrations', hosts: 2, tabs: 0 },
];

// In page: every <video> with everything the browser can read a clip from (its own src, every <source>, the poster, what it
// plays now) and the slot it sits in, for judgeVideo in engage-media-guard.mjs.
const readClips = () =>
  [...document.querySelectorAll('video')].map((v) => ({
    slot: v.closest('.eg-hero') ? 'hero' : v.closest('.final') ? 'final' : 'stage',
    ownSrc: v.getAttribute('src'),
    sources: [...v.querySelectorAll('source')].map((x) => ({ src: x.getAttribute('src'), type: x.getAttribute('type') })),
    poster: v.getAttribute('poster') ?? v.dataset.poster ?? '',
    currentSrc: v.currentSrc,
    muted: v.muted,
    preload: v.getAttribute('preload'),
    loop: v.loop,
    autoplay: v.hasAttribute('autoplay'),
    data: v.hasAttribute('data-clip'),
  }));

/** Problems of every clip against the slot it sits in (the hero's own clip, the closing night-stadium). */
const judgeClips = (clips, slug) =>
  clips.flatMap((c) => {
    const want = c.slot === 'hero' ? HERO_CLIP[slug] : c.slot === 'final' ? FINAL_CLIP : null;
    return want ? judgeVideo(c, want).map((m) => `${c.slot}: ${m}`) : [`${c.slot} video is not expected on this page`];
  });

const pathFor = (slug, lang) => `${lang === 'en' ? '' : '/es'}/platform/${slug}/`;

// ---- in-page helpers (serialised into the page, so each must stay self-contained: no shared helpers)

const tagHosts = () =>
  [...document.querySelectorAll('[data-ap]')].map((h, i) => {
    h.setAttribute('data-ap-i', String(i));
    const src = h.tagName === 'VIDEO' ? h.querySelector('source')?.getAttribute('src') ?? '' : '';
    const label = `${h.tagName.toLowerCase()}${typeof h.className === 'string' && h.className ? `.${h.className.trim().split(/\s+/)[0]}` : ''}${src ? ` ${src.split('/').pop()}` : ''}`;
    return { i, label, isVideo: h.tagName === 'VIDEO' };
  });

const hostState = (i) => {
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  return h ? `${h.dataset.ap}/${h.dataset.apWhy ?? ''}` : 'missing';
};

// A point inside the host's scope that is visible and really belongs to it.
const scopePoint = (i) => {
  const scope = (() => { const h = document.querySelector(`[data-ap-i="${i}"]`); return (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h; })();
  const r = scope.getBoundingClientRect();
  const x0 = Math.max(r.left, 0);
  const x1 = Math.min(r.right, innerWidth);
  const y0 = Math.max(r.top, 0);
  const y1 = Math.min(r.bottom, innerHeight);
  if (x1 <= x0 || y1 <= y0) return null;
  for (const fy of [0.5, 0.25, 0.75, 0.1, 0.9]) {
    for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
      const x = x0 + (x1 - x0) * fx;
      const y = y0 + (y1 - y0) * fy;
      const hit = document.elementFromPoint(x, y);
      if (hit && scope.contains(hit)) return { x, y };
    }
  }
  return null;
};

const restPoint = (i) => {
  const scope = (() => { const h = document.querySelector(`[data-ap-i="${i}"]`); return (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h; })();
  for (const [x, y] of [[2, 2], [innerWidth - 2, 2], [2, innerHeight - 2], [innerWidth - 2, innerHeight - 2]]) {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !scope.contains(hit)) return { x, y };
  }
  return { x: 2, y: 2 };
};

const focusIn = (i) => {
  const scope = (() => { const h = document.querySelector(`[data-ap-i="${i}"]`); return (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h; })();
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

export async function engageMotionChecks({ open, check, sleep, settle, metrics }) {
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

  // ENGAGE_ONLY=teams,integrations runs just those pages (used to mutation-prove one guard quickly).
  const only = process.env.ENGAGE_ONLY?.split(',');
  const selected = pages.filter((p) => !only || only.includes(p.slug));

  for (const p of selected) {
    const label = p.slug;

    // ------------------------------------------------------------ 1. the Floodlight frame of the page
    for (const lang of ['en', 'es']) {
      const page = await open({ width: 1440, height: 900, reduced: true }, pathFor(p.slug, lang));
      await settle(page);
      const s = await page.evaluate(() => {
        const lum = (rgb) => {
          const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const final = document.querySelector('main #final, #final');
        const clip = final?.querySelector('video[data-clip] source')?.getAttribute('src') ?? '';
        return {
          nav: !!document.querySelector('header.nav[data-nav]'),
          h1: document.querySelectorAll('h1#page-title').length,
          hero: !!document.querySelector('main .impact h1#page-title'),
          orbits: !!document.querySelector('main .impact .orbits svg'),
          dark: document.querySelectorAll('main .show.impact').length,
          finalClip: clip.split('/').pop(),
          footerLum: Number(lum(getComputedStyle(document.querySelector('footer.footer')).backgroundColor).toFixed(3)),
          last: document.querySelector('main')?.lastElementChild?.id ?? document.querySelector('#final')?.id,
        };
      });
      check(group, `${lang}/${label}: Floodlight nav, one h1 in an .impact hero with orbits, at least one dark stage`, s.nav && s.h1 === 1 && s.hero && s.orbits && s.dark >= 1, JSON.stringify(s));
      check(group, `${lang}/${label}: the final call to action runs the night-stadium clip and the footer is dark`, s.finalClip.startsWith('night-stadium') && s.footerLum < 0.1, `${s.finalClip}, footer luminance ${s.footerLum}`);

      // No text baked into any video: every <video> is judged in full (own src, every <source>, the poster) against the text-free
      // list and the clip its slot must play, then follows the markup contract (muted, preload none, WebM then MP4, poster).
      const clips = await page.evaluate(readClips);
      const baked = judgeClips(clips, p.slug);
      check(group, `${lang}/${label}: only the right text-free clip plays in each slot (own src, every source and poster judged, ${clips.length} clips)`, clips.length >= 1 && baked.length === 0, baked.join('; '));
      const bad = clips.filter((c) => !c.muted || c.preload !== 'none' || !c.loop || c.autoplay || !c.data || !c.poster);
      check(group, `${lang}/${label}: every clip is a muted looping preload=none data-clip with WebM then MP4 and a poster`, bad.length === 0, JSON.stringify(bad));
      await page.context().close();
    }

    // ------------------------------------------------------------ 2. every autoplayer: starts on screen, pauses off screen, under the pointer and on focus
    {
      const page = await open({ width: 1440, height: 900 }, pathFor(p.slug, 'en'));
      await page.mouse.move(2, 2);
      await settle(page);
      const hosts = await page.evaluate(tagHosts);
      const videos = await page.evaluate(() => document.querySelectorAll('video[data-clip]').length);
      check(group, `${label}: the page registers its autoplayers through the kit (${hosts.length} found, at least ${p.hosts} expected)`, hosts.length >= p.hosts, hosts.map((h) => h.label).join(' | '));
      check(group, `${label}: every clip is an autoplayer host`, hosts.filter((h) => h.isVideo).length === videos && videos >= 1, `${hosts.filter((h) => h.isVideo).length} of ${videos} clips`);
      const problems = { start: [], offscreen: [], hover: [], focus: [], resume: [], noFocusable: [] };
      for (const h of hosts) {
        await page.evaluate(awayFromHost, h.i);
        const off = await waitState(page, h.i, 'off/offscreen');
        if (!off.ok) problems.offscreen.push(`${h.label} (${off.s})`);
        await page.evaluate(centreHost, h.i);
        const on = await waitState(page, h.i, 'on/');
        if (!on.ok) {
          problems.start.push(`${h.label} (${on.s})`);
          continue;
        }
        const pt = await page.evaluate(scopePoint, h.i);
        if (!pt) problems.hover.push(`${h.label} (no hoverable point)`);
        else {
          await page.mouse.move(pt.x, pt.y);
          const hov = await waitState(page, h.i, 'off/hover', 1200);
          if (!hov.ok) problems.hover.push(`${h.label} (${hov.s})`);
          const rest = await page.evaluate(restPoint, h.i);
          await page.mouse.move(rest.x, rest.y);
          const back = await waitState(page, h.i, 'on/', 1200);
          if (!back.ok) problems.resume.push(`${h.label} after hover (${back.s})`);
        }
        if (!(await page.evaluate(focusIn, h.i))) problems.noFocusable.push(h.label);
        else {
          const foc = await waitState(page, h.i, 'off/focus', 1200);
          if (!foc.ok) problems.focus.push(`${h.label} (${foc.s})`);
          await page.evaluate(blurAll);
          const back = await waitState(page, h.i, 'on/', 1200);
          if (!back.ok) problems.resume.push(`${h.label} after focus (${back.s})`);
        }
      }
      check(group, `${label}: every autoplayer starts once it is on screen`, problems.start.length === 0, problems.start.join('; '));
      check(group, `${label}: every autoplayer pauses when it leaves the screen`, problems.offscreen.length === 0, problems.offscreen.join('; '));
      check(group, `${label}: every autoplayer pauses under the pointer (data-ap-why=hover) and resumes when it leaves`, problems.hover.length === 0 && problems.resume.length === 0, [...problems.hover, ...problems.resume].join('; '));
      check(group, `${label}: every autoplayer pauses while keyboard focus is inside its scope (data-ap-why=focus) and resumes on blur`, problems.focus.length === 0, `${problems.focus.join('; ')}${problems.noFocusable.length ? ` [${problems.noFocusable.length} decorative hosts have no focusable control: ${problems.noFocusable.join(', ')}]` : ''}`);
      metrics[`autoplayers-${label}`] = { hosts: hosts.length, clips: videos, withoutFocusableScope: problems.noFocusable.length };

      // A hidden tab pauses everything, and coming back resumes what is on screen.
      await page.evaluate(() => scrollTo(0, 0));
      await sleep(500);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await sleep(250);
      const hiddenOn = await page.evaluate(() => [...document.querySelectorAll('[data-ap="on"]')].length);
      check(group, `${label}: a hidden tab pauses every autoplayer`, hiddenOn === 0, `${hiddenOn} running`);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await sleep(350);
      check(group, `${label}: the autoplayers on screen resume when the tab is visible again`, (await page.evaluate(() => document.querySelectorAll('[data-ap="on"]').length)) >= 1);

      // Flipping the OS setting while the page is open stops everything, and flipping back restarts it.
      await page.evaluate(() => scrollTo(0, 0));
      await sleep(500);
      const before = await page.evaluate(() => document.querySelectorAll('[data-ap="on"]').length);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await sleep(700);
      const during = await page.evaluate(() => ({ on: document.querySelectorAll('[data-ap="on"]').length, playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length }));
      check(group, `${label}: switching to reduced motion while the page is open stops every autoplayer and every clip`, before >= 1 && during.on === 0 && during.playing === 0, `${before} running -> ${during.on} running, ${during.playing} clips playing`);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await sleep(800);
      check(group, `${label}: switching back restarts the autoplayers on screen`, (await page.evaluate(() => document.querySelectorAll('[data-ap="on"]').length)) >= 1);
      check(group, `${label}: no console errors, page errors or failed requests during the autoplayer walk`, page.problems.length === 0, page.problems.join(' | '));
      await page.context().close();
    }

    // ------------------------------------------------------------ 2b. the same pauses, judged by what actually moves (not by data-ap)
    await engageMovementChecks({ open, check, sleep, settle }, { slug: p.slug, path: pathFor(p.slug, 'en') });

    // ------------------------------------------------------------ 3. reduced motion: no autoplay, no loops, finished stills
    for (const lang of ['en', 'es']) {
      const page = await open({ width: 1440, height: 900, reduced: true }, pathFor(p.slug, lang));
      await settle(page);
      await sleep(1500);
      const rm = await page.evaluate(() => {
        const hosts = [...document.querySelectorAll('[data-ap]')];
        const videos = [...document.querySelectorAll('video[data-clip]')];
        const live = document.getAnimations().filter((a) => a.playState === 'running');
        return {
          hosts: hosts.length,
          notReduced: hosts.filter((h) => !(h.dataset.ap === 'off' && h.dataset.apWhy === 'reduced')).map((h) => `${h.tagName}.${String(h.className).split(' ')[0]}`),
          videos: videos.length,
          playing: videos.filter((v) => !v.paused).length,
          advanced: videos.filter((v) => v.currentTime > 0).length,
          noPoster: videos.filter((v) => !v.getAttribute('poster')).map((v) => v.querySelector('source')?.getAttribute('src')),
          infinite: live.filter((a) => a.effect?.getComputedTiming().iterations === Infinity).map((a) => a.animationName ?? a.id ?? 'unnamed'),
          running: live.map((a) => a.animationName ?? a.transitionProperty ?? a.id ?? 'unnamed'),
          marquee: [...document.querySelectorAll('.marquee-track')].map((m) => getComputedStyle(m).animationName),
          smooth: getComputedStyle(document.documentElement).scrollBehavior,
        };
      });
      check(group, `${lang}/${label}: every autoplayer is off with data-ap-why=reduced (${rm.hosts} hosts; looping stages register none, they never start)`, rm.hosts >= rm.videos && rm.notReduced.length === 0, rm.notReduced.join(', '));
      check(group, `${lang}/${label}: no clip plays and none has moved off its first frame (${rm.videos} clips)`, rm.playing === 0 && rm.advanced === 0, `${rm.playing} playing, ${rm.advanced} advanced`);
      check(group, `${lang}/${label}: every clip shows its poster`, rm.noPoster.length === 0, rm.noPoster.join(', '));
      check(group, `${lang}/${label}: no infinite animation is running and a settled page animates nothing`, rm.infinite.length === 0 && rm.running.length === 0 && rm.marquee.every((n) => n === 'none'), `infinite: ${rm.infinite.join(',')}; running: ${rm.running.slice(0, 8).join(',')}; marquee: ${rm.marquee.join(',')}`);
      check(group, `${lang}/${label}: smooth scrolling is cancelled`, rm.smooth === 'auto', rm.smooth);
      await page.context().close();
    }

    // ------------------------------------------------------------ 4. what each stage does while it plays
    const page = await open({ width: 1440, height: 900 }, pathFor(p.slug, 'en'));
    await page.mouse.move(2, 2);
    await settle(page);

    // Tab sets rotate on their own, move the selection and the panel, and (by the ARIA contract) keep one tab focusable.
    if (p.tabs) {
      const sets = await page.evaluate(() => [...document.querySelectorAll('[data-autotabs]')].map((r, i) => (r.setAttribute('data-at-i', String(i)), { i, at: Number(r.dataset.at) || 6000, tabs: r.querySelectorAll('[role="tab"]').length })));
      check(group, `${label}: the tab sets are autotabs hosts (${sets.length} found, ${p.tabs} expected)`, sets.length >= p.tabs && sets.every((s) => s.tabs >= 2), JSON.stringify(sets));
      for (const s of sets) {
        await page.evaluate((i) => document.querySelector(`[data-at-i="${i}"]`).scrollIntoView({ block: 'center', behavior: 'instant' }), s.i);
        await page.mouse.move(2, 2);
        await sleep(700);
        const sel = () => page.evaluate((i) => [...document.querySelectorAll(`[data-at-i="${i}"] [role="tab"]`)].findIndex((t) => t.getAttribute('aria-selected') === 'true'), s.i);
        const a = await sel();
        await sleep(s.at + 1500);
        const b = await sel();
        const panels = await page.evaluate((i) => [...document.querySelectorAll(`[data-at-i="${i}"] [data-panel]`)].filter((x) => x.classList.contains('on') || x.hasAttribute('data-active')).length, s.i);
        check(group, `${label}: tab set ${s.i + 1} rotates by itself (tab ${a + 1} -> ${b + 1} after ${(s.at + 1500) / 1000} s) with one active panel`, a !== b && panels === 1, `${panels} active panels`);
      }
    }

    // Marquee: the Teams rail moves, stops under the pointer, and its duplicate set is hidden from assistive tech.
    if (p.slug === 'teams') {
      const x = () => page.evaluate(() => document.querySelector('.marquee-track').getBoundingClientRect().left);
      await page.evaluate(() => document.querySelector('.marquee').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(900);
      const a = await x();
      await sleep(1200);
      const b = await x();
      check(group, `${label}: the schools rail moves on its own`, Math.abs(b - a) >= 4, `${(b - a).toFixed(1)}px in 1.2 s`);
      const box = await page.evaluate(() => {
        const r = document.querySelector('.marquee').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.mouse.move(box.x, box.y);
      await sleep(300);
      const c = await x();
      await sleep(1000);
      const d = await x();
      check(group, `${label}: the schools rail stops under the pointer`, Math.abs(d - c) < 0.5, `${(d - c).toFixed(2)}px in 1 s`);
      await page.mouse.move(2, 2);
      const dup = await page.evaluate(() => {
        const tracks = [...document.querySelectorAll('.marquee-track > *')];
        const hidden = tracks.filter((e) => e.getAttribute('aria-hidden') === 'true');
        return { sets: tracks.length, hidden: hidden.length, inert: hidden.every((e) => e.hasAttribute('inert')) };
      });
      check(group, `${label}: the duplicate set of the rail is aria-hidden and inert`, dup.sets >= 2 && dup.hidden >= 1 && dup.inert, JSON.stringify(dup));
      // The planner stage: event bars really animate while it plays.
      await page.evaluate(() => document.querySelector('.eg-th').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(1500);
      const bars = await page.evaluate(() => document.querySelector('.eg-th').getAnimations({ subtree: true }).filter((n) => n.playState === 'running').length);
      check(group, `${label}: the planner stage animates while it plays (${bars} running animations)`, bars >= 3, String(bars));
    }

    // Branded: the app mock-up cycles through the example brands.
    if (p.slug === 'custom-branded-apps') {
      await page.evaluate(() => document.querySelector('[data-morph]').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.mouse.move(2, 2);
      await sleep(700);
      const name = () => page.evaluate(() => document.querySelector('[data-app-name]')?.textContent?.trim());
      const first = await name();
      await sleep(3800);
      const next = await name();
      const colour = await page.evaluate(() => getComputedStyle(document.querySelector('[data-app]')).getPropertyValue('--bc').trim());
      check(group, `${label}: the phone swaps to the next example brand on its own ("${first}" -> "${next}")`, !!first && !!next && first !== next && /^#/.test(colour), `colour ${colour}`);
    }

    // Integrations: the data chips fly from the sources to the hub (they sit at opacity 0 until their turn).
    if (p.slug === 'integrations') {
      await page.evaluate(() => document.querySelector('.eg-ih').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(700);
      const seen = new Set();
      for (let n = 0; n < 40; n++) {
        const v = await page.evaluate(() => [...document.querySelectorAll('.eg-dchip')].map((c, i) => (Number(getComputedStyle(c).opacity) > 0.5 ? i : -1)).filter((i) => i >= 0));
        v.forEach((i) => seen.add(i));
        await sleep(250);
      }
      check(group, `${label}: the data chips take turns flying into the hub (${[...seen].length} of 3 seen in 10 s)`, seen.size >= 2, [...seen].join(','));
    }

    // Guardian: the hero cards move too (they are a looping group on the stage).
    if (p.slug === 'guardian-portal') {
      await page.evaluate(() => document.querySelector('.media-frame').scrollIntoView({ block: 'center', behavior: 'instant' }));
      await sleep(1200);
      const run = await page.evaluate(() => document.querySelector('.media-frame').getAnimations({ subtree: true }).filter((n) => n.playState === 'running').length);
      check(group, `${label}: the hero stage animates while it plays (${run} running animations)`, run >= 2, String(run));
    }
    await page.context().close();
  }
}
