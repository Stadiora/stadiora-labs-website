// Guards for the shared logo marquee (components/ui/LogoMarquee.astro): the home hero band and the About partners strip.
// Every number is read from what is rendered, in Chromium, at 1440 and 390, light and dark:
//   - two sets, the second aria-hidden and inert with empty alt text, the same marks in the same order (a seamless loop:
//     the track is exactly two set widths and the keyframes move it by half);
//   - the strip moves on its own and keeps moving under the pointer and after a click on it (a pointer never pauses it);
//     the pointer, click, offscreen, hidden-tab and keyboard behaviour of the About instance is measured by
//     solutions-motion-checks.mjs, which this file runs for /about/ when called with `pauses`;
//   - theme-correct marks (About follows the page theme, the home band is always on the dark stage);
//   - no mark is clipped: every visible mark sits inside the marquee box, and the marquee inside its section;
//   - reduced motion: no animation, a static row that wraps, the repeated copy gone and nothing wider than the strip.
import { solutionsMotionChecks } from './solutions-motion-checks.mjs';

// The marks the strip is meant to show. Stated here, not read from data/logos.ts, so dropping one by accident still fails.
const LOGO_COUNT = 8;

const targets = [
  { id: 'home', label: 'home hero', path: '/', sel: '#hero .logo-marquee', themed: false, schemes: ['light'] },
  { id: 'about', label: 'about partners', path: '/about/', sel: '.sx-partners .logo-marquee', themed: true, schemes: ['light', 'dark'] },
  { id: 'about-es', label: 'es about partners', path: '/es/about/', sel: '.sx-partners .logo-marquee', themed: true, schemes: ['light'] },
];

// Runs in the page.
const probe = (sel) => {
  const m = document.querySelector(sel);
  if (!m) return null;
  const track = m.querySelector('.marquee-track');
  const sets = [...track.children];
  const shown = (i) => getComputedStyle(i).display !== 'none' && i.getBoundingClientRect().width > 0;
  const box = m.getBoundingClientRect();
  const sec = m.closest('section')?.getBoundingClientRect();
  const setInfo = sets.map((s) => {
    const imgs = [...s.querySelectorAll('img')];
    const r = s.getBoundingClientRect();
    return {
      width: r.width,
      aria: s.getAttribute('aria-hidden'),
      inert: s.hasAttribute('inert'),
      shownSet: getComputedStyle(s).display !== 'none' && r.height > 0,
      names: imgs.filter(shown).map((i) => i.getAttribute('alt')),
      marks: imgs.map((i) => new URL(i.src).pathname.replace(/-mono-(dark|light)\./, '.')).filter((_, k) => shown(imgs[k])),
      variants: imgs.filter(shown).map((i) => /-mono-(dark|light)\./.exec(i.src)?.[1]),
      broken: imgs.filter(shown).filter((i) => !(i.complete && i.naturalWidth > 0)).length,
      outside: imgs.filter(shown).filter((i) => {
        const b = i.getBoundingClientRect();
        return b.top < box.top - 0.5 || b.bottom > box.bottom + 0.5;
      }).map((i) => i.getAttribute('alt') || i.getAttribute('src')),
      tooSmall: imgs.filter(shown).filter((i) => i.getBoundingClientRect().height < 12).length,
    };
  });
  const cs = getComputedStyle(track);
  return {
    sets: setInfo,
    track: { width: track.getBoundingClientRect().width, animation: cs.animationName, count: cs.animationIterationCount, wrap: cs.flexWrap },
    setWrap: getComputedStyle(sets[0]).flexWrap,
    box: { w: box.width, top: box.top, bottom: box.bottom },
    inSection: sec ? box.top >= sec.top - 0.5 && box.bottom <= sec.bottom + 0.5 : false,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

// Stands in for a set that is not in the page, so the assertion on it fails instead of the probe.
const missing = { width: 0, aria: null, inert: false, shownSet: false, names: [], marks: [], variants: [], broken: 0, outside: [], tooSmall: 0 };

export async function logoMarqueeChecks({ open, settle, check, sleep, pauses = true }) {
  const group = 'logo-marquee';
  const left = (page, sel) => page.evaluate((s) => document.querySelector(`${s} .marquee-track`).getBoundingClientRect().left, sel);
  // A fresh context has no pointer, so nothing is under it until the pointer check moves one onto the strip.

  for (const t of targets) {
    for (const scheme of t.schemes) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        const tag = `${t.label} @${width} ${scheme}`;
        const page = await open({ width, height, scheme, mobile: width < 500 }, t.path);
        try {
          await settle(page);
          await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), t.sel);
          await sleep(900);
          const p = await page.evaluate(probe, t.sel);
          const [a, b = missing] = p.sets;
          check(group, `${tag}: two sets, the second aria-hidden, inert and without alt text`, p.sets.length === 2 && a.aria === null && b.aria === 'true' && b.inert && b.names.every((n) => n === '') && a.names.length === LOGO_COUNT && a.names.every((n) => n), JSON.stringify({ sets: p.sets.length, a: a.names.length, b: b.names.length }));
          check(group, `${tag}: the second set repeats the first mark for mark, so the loop is seamless (set widths ${a.width.toFixed(1)} and ${b.width.toFixed(1)}, track ${p.track.width.toFixed(1)})`, JSON.stringify(a.marks) === JSON.stringify(b.marks) && Math.abs(a.width - b.width) < 1 && Math.abs(p.track.width - (a.width + b.width)) < 1 && p.track.animation === 'marq' && p.track.count === 'infinite', JSON.stringify({ aw: a.width, bw: b.width, track: p.track }));
          const want = t.themed ? (scheme === 'light' ? 'dark' : 'light') : 'light';
          check(group, `${tag}: every visible mark is the ${want === 'dark' ? 'dark' : 'light'} variant ${t.themed ? 'for this theme' : '(the band is always dark)'}, loaded`, a.variants.length === LOGO_COUNT && b.variants.length === a.variants.length && [...a.variants, ...b.variants].every((v) => v === want) && a.broken === 0 && b.broken === 0, JSON.stringify({ a: a.variants, broken: a.broken }));
          check(group, `${tag}: no mark is clipped (every one inside the marquee box, which sits inside its section)`, a.outside.length === 0 && b.outside.length === 0 && a.tooSmall === 0 && p.inSection, JSON.stringify({ outside: [...a.outside, ...b.outside], inSection: p.inSection, box: p.box }));
          check(group, `${tag}: no horizontal scroll`, p.overflowX <= 0, `${p.overflowX}px`);

          const x0 = await left(page, t.sel);
          // A strip that is paused never moves; a busy machine only delays the first frame, so allow up to 6 s.
          let moved = 0;
          for (let waited = 0; waited < 6000 && Math.abs(moved) < 4; waited += 400) {
            await sleep(400);
            moved = (await left(page, t.sel)) - x0;
          }
          const why = await page.evaluate((sel) => {
            const m = document.querySelector(sel);
            const h = m.closest('[data-ap]');
            return { ap: h?.dataset.ap, why: h?.dataset.apWhy, hidden: document.hidden, state: getComputedStyle(m.querySelector('.marquee-track')).animationPlayState, html: document.documentElement.className };
          }, t.sel);
          check(group, `${tag}: the strip moves on its own`, Math.abs(moved) >= 4, `${moved.toFixed(1)}px within 6 s ${JSON.stringify(why)}`);
          if (width === 1440 && scheme === 'light') {
            const bx = await page.evaluate((s) => {
              const r = document.querySelector(s).getBoundingClientRect();
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }, t.sel);
            const ap = () => page.evaluate((sel) => {
              const h = document.querySelector(sel).closest('[data-ap]');
              return { ap: h?.dataset.ap ?? 'no host', why: h?.dataset.apWhy ?? '' };
            }, t.sel);
            const travels = async () => {
              const c = await left(page, t.sel);
              await sleep(1000);
              return Math.abs((await left(page, t.sel)) - c);
            };
            await page.mouse.move(bx.x, bx.y);
            await sleep(300);
            const under = await ap();
            const dUnder = await travels();
            check(group, `${tag}: the strip keeps moving under the pointer (data-ap stays on)`, dUnder >= 2 && under.ap === 'on' && under.why === '', `${dUnder.toFixed(2)}px in 1 s ${JSON.stringify(under)}${under.why === 'hover' ? ' paused under the pointer (data-ap-why=hover)' : dUnder < 2 ? ' held still under the pointer' : ''}`);
            await page.mouse.click(bx.x, bx.y);
            await sleep(300);
            const clicked = await ap();
            const dClick = await travels();
            check(group, `${tag}: the strip keeps moving after a click on it (data-ap stays on)`, dClick >= 2 && clicked.ap === 'on' && clicked.why === '', `${dClick.toFixed(2)}px in 1 s ${JSON.stringify(clicked)}${dClick < 2 ? ' held still after the click' : ''}`);
          }
        } catch (e) {
          check(group, `${tag}: the probe ran to the end`, false, String(e.stack ?? e).split('\n').slice(0, 3).join(' | '));
        } finally {
          await page.context().close();
        }
      }
    }

    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const tag = `${t.label} @${width} reduced motion`;
      const page = await open({ width, height, reduced: true, mobile: width < 500 }, t.path);
      try {
        await settle(page);
        await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), t.sel);
        await sleep(400);
        const p = await page.evaluate(probe, t.sel);
        const [a, b = missing] = p.sets;
        check(group, `${tag}: a static wrapped row, no animation, no repeated copy, nothing clipped or wider than the strip`, p.track.animation === 'none' && p.track.wrap === 'wrap' && p.setWrap === 'wrap' && !b.shownSet && a.names.length === LOGO_COUNT && a.outside.length === 0 && a.width <= p.box.w + 1 && p.overflowX <= 0, JSON.stringify({ track: p.track, setWrap: p.setWrap, secondShown: b.shownSet, marks: a.names.length, outside: a.outside, setW: a.width, boxW: p.box.w }));
      } catch (e) {
        check(group, `${tag}: the probe ran to the end`, false, String(e.stack ?? e).split('\n').slice(0, 3).join(' | '));
      } finally {
        await page.context().close();
      }
    }
  }

  // Pointer and click (keeps moving), keyboard focus, offscreen and hidden-tab pauses (stops) of the About instance, measured on rendered values.
  if (pauses) await solutionsMotionChecks({ open, settle, check, sleep, only: 'en/about/', requireMarqueeFocus: true });
}
