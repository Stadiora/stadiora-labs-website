// Floodlight home guards (R57 V1). Everything that moves on its own goes through the motion kit's autoplayer, which
// mirrors its state to `data-ap` ("on" | "off") and `data-ap-why` ("reduced" | "hidden" | "offscreen" | "hover" |
// "focus") and marks the element whose hover and focus pause it with `data-ap-scope`. These guards read that contract,
// so a section that animates without the kit fails them. The contract is only half of it: the "autoplay" and "hidden-tab"
// groups also MEASURE what moves (animation clocks, element transforms, video currentTime, tab progress, DOM changes) under
// hover, focus, offscreen and a hidden tab, because a flag can say "off" while the code underneath keeps running.
// Called from evidence.mjs with its page opener and recorder.
import { clipProbe } from './clip-probe.mjs';
import { contrastProbe } from './contrast.mjs';
import { motionChecks } from './home-motion-checks.mjs';

export const homeSections = ['hero', 'ai', 'pillars', 'brand', 'showcase', 'proof', 'final'];

const heroWords = {
  '/': ['coaches', 'high school teams', 'soccer academies', 'track and field', 'gyms and studios', 'nutrition coaches', 'universities'],
  '/es/': ['entrenadores', 'equipos escolares', 'academias de fútbol', 'equipos de atletismo', 'gimnasios y estudios', 'coaches de nutrición', 'universidades'],
};

const pathFor = (locale) => (locale === 'en' ? '/' : '/es/');

// The hero word on screen (the per-letter markup uses no-break spaces) and the full list the markup carries.
const activeWord = () => document.querySelector('[data-hero-word][data-active]')?.textContent?.replace(/[\u00a0\u200b]/g, ' ').replace(/\s+/g, ' ').trim();
const wordList = () => JSON.parse(document.querySelector('[data-hero-words]')?.getAttribute('data-words') ?? '[]');

// ---- in-page helpers (serialised into the page, so they must stay self-contained)

// Tag every autoplayer host with an index and describe it.
const tagHosts = () =>
  [...document.querySelectorAll('[data-ap]')].map((h, i) => {
    h.setAttribute('data-ap-i', String(i));
    const scope = (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h;
    const section = h.closest('main > section')?.id ?? '';
    const label = `${section ? `#${section} ` : ''}${h.tagName.toLowerCase()}${h.id ? `#${h.id}` : ''}${typeof h.className === 'string' && h.className ? `.${h.className.trim().split(/\s+/)[0]}` : ''}${h.tagName === 'VIDEO' ? ` ${h.dataset.clip || h.querySelector('source')?.getAttribute('src') || ''}` : ''}`;
    return { i, label: label.trim(), isVideo: h.tagName === 'VIDEO', scopeIsHost: scope === h };
  });

const hostState = (i) => {
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  return h ? `${h.dataset.ap}/${h.dataset.apWhy ?? ''}` : 'missing';
};

// A point inside the host's scope that is visible and really belongs to it (not covered by something else).
const scopePoint = (i) => {
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  const scope = (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h;
  const r = scope.getBoundingClientRect();
  const x0 = Math.max(r.left, 0);
  const x1 = Math.min(r.right, innerWidth);
  const y0 = Math.max(r.top, 0);
  const y1 = Math.min(r.bottom, innerHeight);
  for (const fy of [0.5, 0.25, 0.75, 0.1, 0.9]) {
    for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
      const x = x0 + (x1 - x0) * fx;
      const y = y0 + (y1 - y0) * fy;
      if (x1 <= x0 || y1 <= y0) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && scope.contains(hit)) return { x, y };
    }
  }
  return null;
};

// A point outside the scope for the mouse to rest on.
const restPoint = (i) => {
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  const scope = (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h;
  const corners = [[2, 2], [innerWidth - 2, 2], [2, innerHeight - 2], [innerWidth - 2, innerHeight - 2]];
  for (const [x, y] of corners) {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !scope.contains(hit)) return { x, y };
  }
  return { x: 2, y: 2 };
};

const focusIn = (i) => {
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  const scope = (h.dataset.apWithin && document.querySelector(h.dataset.apWithin)) || h.closest('[data-ap-scope]') || h.querySelector('[data-ap-scope]') || h;
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
  const h = document.querySelector(`[data-ap-i="${i}"]`);
  const r = h.getBoundingClientRect();
  const top = r.top + scrollY;
  scrollTo({ top: top > innerHeight + 200 ? 0 : document.documentElement.scrollHeight, behavior: 'instant' });
};

export async function homeChecks({ open, check, sleep, settle, metrics }) {
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

  // HOME_ONLY=autoplay,marquee runs just those groups (used to mutation-prove one guard quickly); unset runs all.
  // Groups: structure autoplay reduced marquee hero clipping contrast a11y integrations nojs pillars-media hidden-tab flip.
  const only = process.env.HOME_ONLY?.split(',');
  const on = (group) => !only || only.includes(group);

  // ------------------------------------------------------------ 1. structure of the page
  if (on('structure')) for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, pathFor(locale));
    const ids = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.id));
    check('home', `${locale}: main holds the seven sections in order`, JSON.stringify(ids) === JSON.stringify(homeSections), ids.join(' > '));
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('main > section')].filter((s) => !s.getAttribute('aria-labelledby') || !document.getElementById(s.getAttribute('aria-labelledby'))?.textContent?.trim()).map((s) => s.id));
    check('home', `${locale}: every section is named by a heading`, unnamed.length === 0, unnamed.join(','));
    const markup = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      autoplay: document.querySelectorAll('video[autoplay]').length,
      videos: [...document.querySelectorAll('video')].filter((v) => !v.hasAttribute('data-clip') || !v.muted || v.getAttribute('preload') !== 'none').length,
    }));
    check('home', `${locale}: one h1, every image has alt, no autoplay attribute, every video is a muted preload=none clip`, markup.h1 === 1 && markup.noAlt === 0 && markup.autoplay === 0 && markup.videos === 0, JSON.stringify(markup));
    // Class names are global: the planner calendar and the Scale rail's mini calendar once collided on `.cal-grid`, so the planner lost its week-label column.
    const cal = await page.evaluate(() => {
      const mid = (e) => Math.round(e.getBoundingClientRect().left + e.getBoundingClientRect().width / 2);
      const g = document.querySelector('.ai-cal .cal-grid');
      const cells = [...g.querySelectorAll('.cal-cell')].slice(0, 7);
      const heads = [...g.querySelectorAll('.dh')];
      return {
        tracks: getComputedStyle(g).gridTemplateColumns.split(' ').length,
        heads: heads.map((h) => h.textContent.trim()),
        aligned: heads.length === 7 && cells.length === 7 && heads.every((h, i) => Math.abs(mid(h) - mid(cells[i])) <= 2),
        labelLeft: g.querySelector('.wk').getBoundingClientRect().right <= cells[0].getBoundingClientRect().left + 1,
        mini: getComputedStyle(document.querySelector('.rail .cal-grid')).gridTemplateColumns.split(' ').length,
      };
    });
    check('home', `${locale}: the planner calendar is a week-label column plus seven day columns, each day header over its cells; the mini calendar has seven`, cal.tracks === 8 && cal.aligned && cal.labelLeft && cal.mini === 7, JSON.stringify(cal));
    await page.context().close();
  }

  // ------------------------------------------------------------ 2. every autoplayer: starts visible, pauses on hover, focus, offscreen
  // HOME_HOSTS (see home-motion-checks.mjs) narrows the measured behaviour to a few hosts; the flag walk is skipped then.
  if (on('autoplay') && !process.env.HOME_HOSTS) {
    const page = await open({ width: 1440, height: 900 }, '/');
    await page.mouse.move(2, 2);
    await settle(page);
    const hosts = await page.evaluate(tagHosts);
    check('autoplay', `the home registers autoplayers through the kit (${hosts.length} found, at least 20 expected)`, hosts.length >= 20, hosts.map((h) => h.label).join(' | '));
    const videos = await page.evaluate(() => document.querySelectorAll('video[data-clip]').length);
    check('autoplay', 'every clip is an autoplayer host', hosts.filter((h) => h.isVideo).length === videos && videos >= 8, `${hosts.filter((h) => h.isVideo).length} of ${videos} clips`);
    const problems = { start: [], offscreen: [], hover: [], focus: [], resume: [], noFocusable: [] };
    for (const h of hosts) {
      await page.evaluate(awayFromHost, h.i);
      const off = await waitState(page, h.i, 'off/offscreen');
      if (!off.ok) problems.offscreen.push(`${h.label} (${off.s})`);
      await page.evaluate(centreHost, h.i);
      const on = await waitState(page, h.i, 'on/');
      if (!on.ok) {
        problems.start.push(`${h.label} (${on.s})`);
        continue; // hover and focus mean nothing for a host that never starts
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
      const focused = await page.evaluate(focusIn, h.i);
      if (!focused) problems.noFocusable.push(h.label);
      else {
        const foc = await waitState(page, h.i, 'off/focus', 1200);
        if (!foc.ok) problems.focus.push(`${h.label} (${foc.s})`);
        await page.evaluate(blurAll);
        const back = await waitState(page, h.i, 'on/', 1200);
        if (!back.ok) problems.resume.push(`${h.label} after focus (${back.s})`);
      }
    }
    check('autoplay', 'every autoplayer starts once it is on screen', problems.start.length === 0, problems.start.join('; '));
    check('autoplay', 'every autoplayer pauses when it leaves the screen', problems.offscreen.length === 0, problems.offscreen.join('; '));
    check('autoplay', 'every autoplayer pauses under the pointer (data-ap-why=hover) and resumes when it leaves', problems.hover.length === 0 && problems.resume.length === 0, [...problems.hover, ...problems.resume].join('; '));
    check('autoplay', 'every autoplayer pauses while keyboard focus is inside its scope (data-ap-why=focus) and resumes on blur', problems.focus.length === 0, `${problems.focus.join('; ')}${problems.noFocusable.length ? ` [${problems.noFocusable.length} hosts have no focusable control in their scope]` : ''}`);
    metrics['autoplayers'] = { hosts: hosts.length, clips: videos, withoutFocusableScope: problems.noFocusable.length };

    // A hidden tab pauses everything (visibilitychange), and coming back resumes the visible ones.
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(400);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(200);
    const hiddenOn = await page.evaluate(() => [...document.querySelectorAll('[data-ap="on"]')].map((h) => h.id || h.tagName));
    check('autoplay', 'a hidden tab pauses every autoplayer', hiddenOn.length === 0, hiddenOn.join(','));
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(300);
    const backOn = await page.evaluate(() => document.querySelectorAll('[data-ap="on"]').length);
    check('autoplay', 'the autoplayers on screen resume when the tab is visible again', backOn >= 1, `${backOn} running`);

    // Flipping the OS setting while the page is open stops and restarts them (the kit listens to the media query).
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    const before = await page.evaluate(() => document.querySelectorAll('[data-ap="on"]').length);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sleep(600);
    const during = await page.evaluate(() => ({ on: document.querySelectorAll('[data-ap="on"]').length, playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length }));
    check('reduced-motion', 'switching to reduced motion while the page is open stops every autoplayer and every clip', before >= 1 && during.on === 0 && during.playing === 0, `${before} running -> ${during.on} running, ${during.playing} clips playing`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await sleep(700);
    const after = await page.evaluate(() => document.querySelectorAll('[data-ap="on"]').length);
    check('reduced-motion', 'switching back restarts the autoplayers on screen', after >= 1, `${after} running`);
    check('runtime', 'no console errors, page errors or failed requests during the autoplayer walk', page.problems.length === 0, page.problems.join(' | '));
    await page.context().close();
  }

  // ------------------------------------------------------------ 3. reduced motion: no autoplay, no loops, posters shown
  if (on('reduced')) for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, pathFor(locale));
    await settle(page);
    await sleep(1500);
    const rm = await page.evaluate(() => {
      const hosts = [...document.querySelectorAll('[data-ap]')];
      const videos = [...document.querySelectorAll('video[data-clip]')];
      const running = document
        .getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => a.animationName ?? a.transitionProperty ?? a.id ?? 'unnamed');
      const infinite = document
        .getAnimations()
        .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity)
        .map((a) => a.animationName ?? a.id ?? 'unnamed');
      return {
        hosts: hosts.length,
        notReduced: hosts.filter((h) => !(h.dataset.ap === 'off' && h.dataset.apWhy === 'reduced')).map((h) => `${h.tagName}${h.id ? `#${h.id}` : ''}.${String(h.className).split(' ')[0]}`),
        videos: videos.length,
        playing: videos.filter((v) => !v.paused).length,
        noPoster: videos.filter((v) => !v.getAttribute('poster')).map((v) => v.dataset.clip || v.currentSrc),
        advanced: videos.filter((v) => v.currentTime > 0).length,
        infinite,
        running,
        smooth: getComputedStyle(document.documentElement).scrollBehavior,
      };
    });
    check('reduced-motion', `${locale}: every autoplayer is off with data-ap-why=reduced (${rm.hosts} hosts)`, rm.hosts >= 20 && rm.notReduced.length === 0, rm.notReduced.slice(0, 6).join(', '));
    check('reduced-motion', `${locale}: no clip plays and none has moved off its first frame (${rm.videos} clips)`, rm.videos >= 8 && rm.playing === 0 && rm.advanced === 0, `${rm.playing} playing, ${rm.advanced} advanced`);
    check('reduced-motion', `${locale}: every clip shows its poster`, rm.noPoster.length === 0, rm.noPoster.join(', '));
    check('reduced-motion', `${locale}: no infinite animation is running`, rm.infinite.length === 0, rm.infinite.join(','));
    check('reduced-motion', `${locale}: nothing animates at rest (a settled page runs no animation)`, rm.running.length === 0, rm.running.slice(0, 8).join(','));
    check('reduced-motion', `${locale}: smooth scrolling is cancelled`, rm.smooth === 'auto', rm.smooth);
    await page.context().close();
  }

  // ------------------------------------------------------------ 4. marquees move, and stop under the pointer or reduced motion
  if (on('marquee')) {
    const page = await open({ width: 1440, height: 900 }, '/');
    await page.mouse.move(2, 2);
    const count = await page.evaluate(() => document.querySelectorAll('.marquee').length);
    check('marquee', 'the home has its logo marquee and its ticker', count >= 2, `${count} marquees`);
    for (let n = 0; n < count; n++) {
      const name = await page.evaluate((k) => {
        const m = document.querySelectorAll('.marquee')[k];
        m.scrollIntoView({ block: 'center', behavior: 'instant' });
        const sec = m.closest('main > section');
        // A decorative marquee cannot be hovered itself, so it pauses with its section: park the pointer off that section.
        const r = m.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const decorative = !(hit && m.contains(hit));
        if (decorative && sec && document.elementFromPoint(2, 2)?.closest('main > section') === sec) window.scrollBy(0, sec.getBoundingClientRect().top - 120);
        return `${sec?.id ?? '?'} marquee`;
      }, n);
      await sleep(900);
      const x = () => page.evaluate((k) => document.querySelectorAll('.marquee')[k].querySelector('.marquee-track').getBoundingClientRect().left, n);
      const a = await x();
      await sleep(1200);
      const b = await x();
      check('marquee', `${name} ${n + 1} moves on its own`, Math.abs(b - a) >= 4, `${(b - a).toFixed(1)}px in 1.2 s`);
      // A decorative marquee behind content cannot be hovered itself: the section it decorates is the hover target.
      const box = await page.evaluate((k) => {
        const m = document.querySelectorAll('.marquee')[k];
        const r = m.getBoundingClientRect();
        const pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const hit = document.elementFromPoint(pt.x, pt.y);
        if (hit && m.contains(hit)) return pt;
        const s = m.closest('main > section').getBoundingClientRect();
        return { x: s.left + s.width / 2, y: Math.min(Math.max(s.top, 0) + innerHeight * 0.6, s.bottom - 20, innerHeight - 40) };
      }, n);
      await page.mouse.move(box.x, box.y);
      await sleep(300);
      const c = await x();
      await sleep(1000);
      const d = await x();
      check('marquee', `${name} ${n + 1} stops under the pointer`, Math.abs(d - c) < 0.5, `${(d - c).toFixed(2)}px in 1 s`);
      await page.mouse.move(2, 2);
    }
    await page.context().close();
    const still = await open({ width: 1440, height: 900, reduced: true }, '/');
    const st = await still.evaluate(() => [...document.querySelectorAll('.marquee')].map((m) => {
      const t = m.querySelector('.marquee-track');
      const cs = getComputedStyle(t);
      return { wrap: cs.flexWrap, animation: cs.animationName, dupes: [...m.querySelectorAll('[aria-hidden="true"]')].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0).length };
    }));
    check('marquee', 'under reduced motion every marquee is a static row that wraps, with no animation and no repeated copy', st.length >= 2 && st.every((s) => s.wrap === 'wrap' && s.animation === 'none' && s.dupes === 0), JSON.stringify(st));
    await still.context().close();
  }

  // ------------------------------------------------------------ 5. hero: seven words, in order, and the conveyor follows
  if (on('hero')) for (const [path, words] of Object.entries(heroWords)) {
    const page = await open({ width: 1440, height: 900 }, path);
    await page.mouse.move(2, 2);
    const initial = {
      count: await page.evaluate(() => document.querySelector('[data-hero-words]')?.getAttribute('data-hero-count')),
      first: await page.evaluate(activeWord),
      all: await page.evaluate(wordList),
    };
    check('hero', `${path} the h1 starts on "${words[0]}" and lists ${words.length} words in order`, initial.count === String(words.length) && initial.first === words[0] && JSON.stringify(initial.all) === JSON.stringify(words), JSON.stringify(initial));
    const seen = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 26000) {
      const w = await page.evaluate(activeWord);
      if (seen[seen.length - 1] !== w) seen.push(w);
      if (seen.length > words.length) break;
      await sleep(200);
    }
    check('hero', `${path} the words cycle ${words.join(' > ')} and back to the first`, JSON.stringify(seen.slice(0, words.length + 1)) === JSON.stringify([...words, words[0]]), seen.join(' > '));
    await page.context().close();
  }
  if (on('hero')) {
    const page = await open({ width: 1440, height: 900 }, '/');
    await page.mouse.move(2, 2);
    const word = () => page.evaluate(activeWord);
    const w0 = await word();
    const pt = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const r = h1.getBoundingClientRect();
      return { x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2 };
    });
    await page.mouse.move(pt.x, pt.y);
    await sleep(4200);
    check('hero', 'the word cycle holds while the pointer is on the headline', (await word()) === w0, `"${w0}"`);
    await page.mouse.move(2, 2);
    await page.context().close();
  }
  if (on('hero')) {
    const page = await open({ width: 1440, height: 900, reduced: true }, '/');
    const w0 = await page.evaluate(activeWord);
    await sleep(4500);
    const w1 = await page.evaluate(activeWord);
    check('reduced-motion', 'the hero stays on its first word', w0 === heroWords['/'][0] && w1 === w0, `"${w0}" -> "${w1}"`);
    await page.context().close();
  }
  // The customers band is pinned to the hero's bottom edge: the copy above it (headline, lead, buttons, note) must never run under it,
  // in either motion mode (reduced motion swaps the marquee for a taller wrapped row).
  if (on('hero')) for (const locale of ['en', 'es']) {
    for (const reduced of [false, true]) {
      const page = await open({ width: 1440, height: 900, reduced }, pathFor(locale));
      const bad = [];
      for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720], [1180, 800], [1100, 800], [1024, 768], [768, 1024], [390, 844], [360, 740]]) {
        await page.setViewportSize({ width, height });
        await sleep(150);
        const gap = await page.evaluate(() => {
          const band = document.querySelector('.hero-band').getBoundingClientRect();
          const bottoms = ['.hero-copy h1', '.hero-copy .lead', '.hero-copy .hero-ctas', '.hero-copy .hero-note'].map((s) => document.querySelector(s)?.getBoundingClientRect().bottom ?? 0);
          return Math.round(band.top - Math.max(...bottoms));
        });
        if (gap < 8) bad.push(`${width}x${height}: ${gap}px`);
      }
      await page.context().close();
      check('hero', `${locale} ${reduced ? 'reduced motion' : 'motion'}: the hero copy stays clear of the customers band at 10 viewports`, bad.length === 0, bad.length ? `overlap/gap under 8px at ${bad.join(', ')}` : 'at least 8px clear everywhere');
    }
  }

  // ------------------------------------------------------------ 6. no clipped text, EN and ES, both themes, six widths
  if (on('clipping')) for (const locale of ['en', 'es']) {
    for (const scheme of ['light', 'dark']) {
      const bad = [];
      let checked = 0;
      for (const width of [1440, 1280, 1024, 768, 390, 360]) {
        const page = await open({ width, height: 900, scheme, reduced: true, mobile: width < 600 }, pathFor(locale));
        await settle(page);
        const k = await page.evaluate(clipProbe);
        checked += k.checked;
        if (k.cutCount) bad.push(`@${width}: ${k.cut.slice(0, 3).join('; ')}`);
        await page.context().close();
      }
      check('clipping', `${locale}/${scheme}: no text is cut off at 1440, 1280, 1024, 768, 390 and 360 px`, bad.length === 0, bad.length ? bad.join(' | ') : `${checked} text boxes checked`);
    }
  }

  // ------------------------------------------------------------ 7. AA contrast on the phone layout (the 1440 pass is in "measured budgets")
  if (on('contrast')) for (const locale of ['en', 'es']) {
    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 390, height: 844, scheme, reduced: true, mobile: true }, pathFor(locale));
      await settle(page);
      const c = await page.evaluate(contrastProbe);
      check('contrast', `${locale}/${scheme}/390: text meets WCAG AA (4.5:1, 3:1 large)`, c.checked > 150 && c.failCount === 0, `${c.checked} text nodes, lowest ${c.min.toFixed(2)}:1${c.failCount ? `, failing: ${JSON.stringify(c.fails)}` : ''}`);
      await page.context().close();
    }
  }

  // The bar is transparent over the dark hero (the page probe skips what sits on a gradient), so judge its glass state
  // separately: scrolled onto the page, against a white worst case.
  if (on('contrast')) for (const locale of ['en', 'es']) {
    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 1440, height: 900, scheme, reduced: true }, pathFor(locale));
      await settle(page);
      await page.evaluate(() => window.scrollTo(0, 2400));
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-scrolled'), null, { timeout: 5000 });
      const c = await page.evaluate(contrastProbe, { scope: '.nav' });
      check('contrast', `${locale}/${scheme}: the scrolled nav bar meets WCAG AA`, c.checked >= 5 && c.failCount === 0 && c.skippedImage === 0, `${c.checked} text nodes, lowest ${c.min.toFixed(2)}:1${c.failCount ? `, failing: ${JSON.stringify(c.fails)}` : ''}`);
      await page.context().close();
    }
  }

  // ------------------------------------------------------------ 8. Engage: the open scene is in the accessibility tree
  // Read through Playwright's ARIA snapshot (what a screen reader is given), not through the DOM: the phone mock once sat under
  // aria-hidden, which removed the selected tab panel and everything in it.
  if (on('a11y')) for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, pathFor(locale));
    await settle(page);
    await page.locator('#engage').scrollIntoViewIfNeeded();
    const tabs = page.locator('#engage [role="tab"]');
    const n = await tabs.count();
    const bad = [];
    for (let k = 0; k < n; k++) {
      await tabs.nth(k).click();
      await sleep(150);
      const snap = await page.locator('#engage').ariaSnapshot();
      const lines = snap.split('\n');
      const panels = lines.filter((l) => /^\s*- tabpanel\b/.test(l));
      const at = lines.findIndex((l) => /^\s*- tabpanel\b/.test(l));
      const indent = at >= 0 ? lines[at].match(/^\s*/)[0].length : 0;
      let end = at + 1;
      while (at >= 0 && end < lines.length && (lines[end].match(/^\s*/)[0].length > indent || !lines[end].trim())) end++;
      const panel = at >= 0 ? lines.slice(at, end).join(' ') : '';
      // The longest line of the panel's visible text, as plain words: it has to be in the tree under the tab's panel.
      const want = await page.evaluate((i) => {
        const p = document.getElementById(`en-p${i}`);
        const words = (t) => t.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
        const lines = p.innerText.split('\n').map(words).filter((l) => l.length >= 6);
        const body = lines.sort((a, b) => b.length - a.length)[0] ?? '';
        return { name: words(p.querySelector('.ph-top b')?.textContent ?? ''), body };
      }, k);
      const flat = (t) => t.replace(/[^\p{L}\p{N}]+/gu, ' ');
      const tabName = (snap.match(/- tab "([^"]+)" \[selected\]/) ?? [])[1] ?? '';
      const problems = [];
      if (panels.length !== 1) problems.push(`${panels.length} tab panels in the tree`);
      if (!tabName || !panel.includes(`tabpanel "${tabName}"`)) problems.push(`panel not named by its tab "${tabName}"`);
      if (!want.name || !flat(panel).includes(want.name)) problems.push(`panel header "${want.name}" missing`);
      if (!want.body || !flat(panel).includes(want.body)) problems.push(`panel content "${want.body}" missing`);
      if (/9:41/.test(snap)) problems.push('the phone status bar is exposed');
      if (problems.length) bad.push(`tab ${k + 1}: ${problems.join(', ')}`);
    }
    check('a11y', `${locale}: Engage exposes exactly the selected tab panel and its content to assistive tech, on every tab, and hides the phone chrome`, n === 4 && bad.length === 0, bad.join(' | ') || `${n} tabs`);
    await page.context().close();
  }

  // ------------------------------------------------------------ 9. Measure > Integrations fits a phone (both satellites inside the frame)
  if (on('integrations')) {
    for (const locale of ['en', 'es']) {
      for (const scheme of ['light', 'dark']) {
        const bad = [];
        let probed = 0;
        for (const width of [390, 360, 320]) {
          const page = await open({ width, height: 844, scheme, reduced: true, mobile: true }, pathFor(locale));
          await settle(page);
          await page.locator('#measure').scrollIntoViewIfNeeded();
          await page.locator('#ms-t4').click();
          await sleep(250);
          const geo = await page.evaluate(() => {
            const frame = document.querySelector('.ms-media').getBoundingClientRect();
            return [...document.querySelectorAll('.int-orbit .sat')].map((s) => {
              const r = s.getBoundingClientRect();
              return { text: s.textContent.trim(), left: r.left - frame.left, right: frame.right - r.right, visible: s.checkVisibility({ visibilityProperty: true, opacityProperty: true }) };
            });
          });
          if (geo.length !== 2 || geo.some((g) => !g.visible || g.left < -0.5 || g.right < -0.5)) bad.push(`@${width} frame edge: ${geo.map((g) => `"${g.text}" ${g.left.toFixed(0)}/${g.right.toFixed(0)}px`).join(', ')}`);
          if (width >= 360) {
            // 320 only gets the geometry check above: the page's own marquee and buttons are not designed for it.
            const k = await page.evaluate(clipProbe);
            probed += k.checked;
            if (k.cutCount) bad.push(`@${width} clipped: ${k.cut.slice(0, 3).join('; ')}`);
          }
          await page.context().close();
        }
        check('integrations', `${locale}/${scheme}: the Integrations slide keeps both satellites inside the frame at 390, 360 and 320 px, with no text cut off at 390 and 360`, bad.length === 0, bad.join(' | ') || `${probed} text boxes checked`);
      }
    }
    // The satellites keep clear of the frame with motion on as well, at the sizes where the layout switches columns.
    const bad = [];
    for (const width of [1440, 1180, 1024, 768, 641, 390]) {
      const page = await open({ width, height: 900, mobile: width < 600 }, '/');
      await page.locator('#measure').scrollIntoViewIfNeeded();
      await page.locator('#ms-t4').click();
      await sleep(900);
      const geo = await page.evaluate(() => {
        const frame = document.querySelector('.ms-media').getBoundingClientRect();
        return [...document.querySelectorAll('.int-orbit .sat')].map((s) => {
          const r = s.getBoundingClientRect();
          return { left: r.left - frame.left, right: frame.right - r.right, top: r.top - frame.top, bottom: frame.bottom - r.bottom };
        });
      });
      if (geo.some((g) => Math.min(g.left, g.right, g.top, g.bottom) < -0.5)) bad.push(`@${width}: ${JSON.stringify(geo.map((g) => Object.values(g).map(Math.round)))}`);
      await page.context().close();
    }
    check('integrations', 'with motion on, both satellites stay inside the frame from 1440 down to 390 px', bad.length === 0, bad.join(' | '));
  }

  // ------------------------------------------------------------ 10. no JavaScript: every reveal is simply visible
  // The reveal classes hide their content until a script marks them in. Without a script nothing ever does, so the hiding must wait for html.js.
  if (on('nojs')) for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, js: false }, pathFor(locale));
    const hidden = await page.evaluate(() => {
      const out = [];
      const sel = '.rv, .rv-mask, .lines > span > span';
      const nodes = [...document.querySelectorAll(sel)];
      for (const e of nodes) {
        const cs = getComputedStyle(e);
        const bad = [];
        if (cs.opacity !== '1') bad.push(`opacity ${cs.opacity}`);
        if (cs.transform !== 'none') bad.push(`transform ${cs.transform}`);
        if (cs.clipPath !== 'none') bad.push(`clip-path ${cs.clipPath}`);
        if (bad.length) out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${(e.textContent ?? '').trim().slice(0, 24)}" ${bad.join(', ')}`);
      }
      return { total: nodes.length, out, jsClass: document.documentElement.classList.contains('js') };
    });
    check('nojs', `${locale}: with JavaScript off, every reveal element is fully shown (no opacity, transform or clip left over)`, !hidden.jsClass && hidden.total >= 20 && hidden.out.length === 0, hidden.out.slice(0, 4).join(' | ') || `${hidden.total} elements`);
    await page.context().close();
  }

  // ------------------------------------------------------------ 11. pillar media is text-free; its words are localized HTML
  // The four pillar clips carry no words (home-verify.mjs pins their bytes), so every label, card and number over them is a
  // [data-ov] element from the page's own locale. This checks the overlay set exists in both locales, reads differently in ES,
  // and sits inside the frame, clear of the other cards, on every tab at desktop and phone size.
  if (on('pillars-media')) {
    const OV = {
      training: ['big', 'label', 'head', 'title', 'row1', 'row2', 'row3', 'row4', 'send', 'sentTitle', 'sentSub', 'coachName', 'coachSub'],
      nutrition: ['big', 'label', 'snap', 'head', 'unit', 'macro1', 'macro2', 'macro3', 'loggedTitle', 'loggedSub'],
      readiness: ['big', 'label', 'head', 'status', 'sleepHead', 'sleepValue', 'mood1', 'mood2', 'mood3', 'breatheTitle', 'breatheSub'],
      team: ['big', 'label', 'head', 'unit', 'best', 'rosterHead', 'status1', 'status2', 'status3', 'status4', 'day', 'matchTitle', 'matchSub'],
    };
    const expected = Object.entries(OV).flatMap(([sc, ks]) => ks.map((k) => `${sc}.${k}`)).sort();
    // Words and numbers that read the same in both languages (the 01-04 numerals, KCAL, a coach's name).
    const same = new Set(['training.big', 'nutrition.big', 'readiness.big', 'team.big', 'nutrition.unit', 'training.coachName']);
    const copy = {};
    for (const locale of ['en', 'es']) {
      const page = await open({ width: 1440, height: 900, reduced: true }, pathFor(locale));
      const got = await page.evaluate(() => [...document.querySelectorAll('#pillars [data-ov]')].map((e) => [e.getAttribute('data-ov'), (e.textContent ?? '').replace(/\s+/g, ' ').trim()]));
      copy[locale] = Object.fromEntries(got);
      const keys = got.map((g) => g[0]).sort();
      const missing = expected.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !expected.includes(k));
      const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
      check('pillars-media', `${locale}: every pillar demo card and label is a live overlay (${expected.length} keys, none missing, extra or repeated)`, !missing.length && !extra.length && !dupes.length, `missing ${missing.join(',') || '-'} extra ${extra.join(',') || '-'} repeated ${dupes.join(',') || '-'}`);
      const empty = got.filter((g) => !g[1]).map((g) => g[0]);
      check('pillars-media', `${locale}: no overlay is empty`, empty.length === 0, empty.join(','));
      const tabs = await page.evaluate(() => [...document.querySelectorAll('#pillars [role="tab"] strong')].map((e) => e.textContent.trim()));
      const labels = Object.keys(OV).map((sc) => copy[locale][`${sc}.label`]);
      check('pillars-media', `${locale}: each scene label is its tab's name`, JSON.stringify(tabs) === JSON.stringify(labels), `${tabs.join(' | ')} vs ${labels.join(' | ')}`);
      await page.context().close();
    }
    const stale = expected.filter((k) => !same.has(k) && copy.en[k] !== undefined && copy.en[k] === copy.es[k]);
    check('pillars-media', 'every overlay reads differently in Spanish (only the numerals, KCAL and the coach name match)', stale.length === 0, stale.map((k) => `${k}="${copy.en[k]}"`).join(' | '));

    for (const locale of ['en', 'es'])
      for (const width of [1440, 390]) {
        const page = await open({ width, height: width < 600 ? 844 : 900, reduced: true }, pathFor(locale));
        await page.evaluate(() => document.querySelector('#pillars .pil-media').scrollIntoView({ block: 'center' }));
        const bad = [];
        for (let k = 0; k < 4; k++) {
          await page.locator('#pillars [role="tab"]').nth(k).click();
          await sleep(750);
          const r = await page.evaluate((k) => {
            const media = document.querySelector('#pillars .pil-media').getBoundingClientRect();
            const scene = document.querySelectorAll('#pillars .pm-scene')[k];
            const cs = getComputedStyle(scene);
            const out = [];
            const cards = [];
            const inside = (b, o, what) => {
              if (b.width === 0 || b.height === 0) out.push(`${what} has no size`);
              else if (b.left < o.left - 1 || b.top < o.top - 1 || b.right > o.right + 1 || b.bottom > o.bottom + 1) out.push(`${what} leaves its frame`);
            };
            for (const e of scene.querySelectorAll('[data-ov]')) {
              const range = document.createRange();
              range.selectNodeContents(e);
              const text = range.getBoundingClientRect();
              const key = e.getAttribute('data-ov');
              inside(text, media, key);
              const box = e.closest('.pm-card, .pm-chip, .pm-breathe, .pm-mood > span');
              if (box) inside(text, box.getBoundingClientRect(), `${key} text in its card`);
              if (!/\.(big|label)$/.test(key)) cards.push({ key, text });
            }
            for (let i = 0; i < cards.length; i++)
              for (let j = i + 1; j < cards.length; j++) {
                const a = cards[i].text;
                const b = cards[j].text;
                if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`${cards[i].key} overlaps ${cards[j].key}`);
              }
            const others = [...document.querySelectorAll('#pillars .pm-scene')].filter((s, i) => i !== k && getComputedStyle(s).visibility !== 'hidden').length;
            return { vis: cs.visibility === 'visible' && cs.opacity === '1', others, n: scene.querySelectorAll('[data-ov]').length, out };
          }, k);
          if (!r.vis) bad.push(`tab ${k + 1}: scene not shown`);
          if (r.others) bad.push(`tab ${k + 1}: ${r.others} other scene(s) still shown`);
          bad.push(...r.out.slice(0, 3).map((o) => `tab ${k + 1}: ${o}`));
        }
        check('pillars-media', `${locale} ${width}: on every tab its scene shows, with every label and card inside the frame, clear of the others`, bad.length === 0, bad.slice(0, 5).join(' | '));
        await page.context().close();
      }
  }

  // ------------------------------------------------------------ 12. motion and hidden-tab behaviour, measured (home-motion-checks.mjs)
  await motionChecks({ open, check, sleep, metrics, on, pathFor, helpers: { tagHosts, hostState, scopePoint, restPoint, focusIn, blurAll, centreHost, awayFromHost } });
}
