// Floodlight home guards (R57 V1). Everything that moves on its own goes through the motion kit's autoplayer, which
// mirrors its state to `data-ap` ("on" | "off") and `data-ap-why` ("reduced" | "hidden" | "offscreen" | "hover" |
// "focus") and marks the element whose hover and focus pause it with `data-ap-scope`. These guards read that contract,
// so a section that animates without the kit fails them. Called from evidence.mjs with its page opener and recorder.
import { clipProbe } from './clip-probe.mjs';
import { contrastProbe } from './contrast.mjs';

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
    await page.context().close();
  }

  // ------------------------------------------------------------ 2. every autoplayer: starts visible, pauses on hover, focus, offscreen
  if (on('autoplay')) {
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
}
