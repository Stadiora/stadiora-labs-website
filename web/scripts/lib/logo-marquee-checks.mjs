// Guards for the shared logo marquee (components/ui/LogoMarquee.astro): the home hero band and the About partners strip.
// Every number is read from what is rendered, in Chromium, at 1440 and 390, light and dark:
//   - two sets, the second aria-hidden and inert with empty alt text, the same marks in the same order (a seamless loop:
//     the track is exactly two set widths and the keyframes move it by half);
//   - the strip moves on its own and stops under the pointer; offscreen, hidden-tab and keyboard pauses of the About
//     instance are measured by solutions-motion-checks.mjs, which this file runs for /about/ when called with `pauses`;
//   - theme-correct marks (About follows the page theme, the home band is always on the dark stage);
//   - no mark is clipped: every visible mark sits inside the marquee box, and the marquee inside its section;
//   - reduced motion: no animation, a static row that wraps, the repeated copy gone and nothing wider than the strip.
import { solutionsMotionChecks } from './solutions-motion-checks.mjs';

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

export async function logoMarqueeChecks({ open, settle, check, sleep, pauses = true }) {
  const group = 'logo-marquee';
  const left = (page, sel) => page.evaluate((s) => document.querySelector(`${s} .marquee-track`).getBoundingClientRect().left, sel);
  const park = async (page) => {
    const b = await page.locator('header a').first().boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  };

  for (const t of targets) {
    for (const scheme of t.schemes) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        const tag = `${t.label} @${width} ${scheme}`;
        const page = await open({ width, height, scheme, mobile: width < 500 }, t.path);
        try {
          await settle(page);
          await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), t.sel);
          await park(page);
          await sleep(900);
          const p = await page.evaluate(probe, t.sel);
          const [a, b] = p.sets;
          check(group, `${tag}: two sets, the second aria-hidden, inert and without alt text`, p.sets.length === 2 && a.aria === null && b.aria === 'true' && b.inert && b.names.every((n) => n === '') && a.names.length >= 9 && a.names.every((n) => n), JSON.stringify({ sets: p.sets.length, a: a.names.length, b: b.names.length }));
          check(group, `${tag}: the second set repeats the first mark for mark, so the loop is seamless (set widths ${a.width.toFixed(1)} and ${b.width.toFixed(1)}, track ${p.track.width.toFixed(1)})`, JSON.stringify(a.marks) === JSON.stringify(b.marks) && Math.abs(a.width - b.width) < 1 && Math.abs(p.track.width - (a.width + b.width)) < 1 && p.track.animation === 'marq' && p.track.count === 'infinite', JSON.stringify({ aw: a.width, bw: b.width, track: p.track }));
          const want = t.themed ? (scheme === 'light' ? 'dark' : 'light') : 'light';
          check(group, `${tag}: every visible mark is the ${want === 'dark' ? 'dark' : 'light'} variant ${t.themed ? 'for this theme' : '(the band is always dark)'}, loaded`, a.variants.length >= 9 && b.variants.length === a.variants.length && [...a.variants, ...b.variants].every((v) => v === want) && a.broken === 0 && b.broken === 0, JSON.stringify({ a: a.variants, broken: a.broken }));
          check(group, `${tag}: no mark is clipped (every one inside the marquee box, which sits inside its section)`, a.outside.length === 0 && b.outside.length === 0 && a.tooSmall === 0 && p.inSection, JSON.stringify({ outside: [...a.outside, ...b.outside], inSection: p.inSection, box: p.box }));
          check(group, `${tag}: no horizontal scroll`, p.overflowX <= 0, `${p.overflowX}px`);

          const x0 = await left(page, t.sel);
          await sleep(1200);
          const x1 = await left(page, t.sel);
          check(group, `${tag}: the strip moves on its own`, Math.abs(x1 - x0) >= 4, `${(x1 - x0).toFixed(1)}px in 1.2 s`);
          if (width === 1440 && scheme === 'light') {
            const bx = await page.evaluate((s) => {
              const r = document.querySelector(s).getBoundingClientRect();
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }, t.sel);
            await page.mouse.move(bx.x, bx.y);
            await sleep(300);
            const c = await left(page, t.sel);
            await sleep(1000);
            const d = await left(page, t.sel);
            check(group, `${tag}: the strip stops under the pointer`, Math.abs(d - c) < 0.5, `${(d - c).toFixed(2)}px in 1 s`);
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
        const [a, b] = p.sets;
        check(group, `${tag}: a static wrapped row, no animation, no repeated copy, nothing clipped or wider than the strip`, p.track.animation === 'none' && p.track.wrap === 'wrap' && p.setWrap === 'wrap' && !b.shownSet && a.names.length >= 9 && a.outside.length === 0 && a.width <= p.box.w + 1 && p.overflowX <= 0, JSON.stringify({ track: p.track, setWrap: p.setWrap, secondShown: b.shownSet, marks: a.names.length, outside: a.outside, setW: a.width, boxW: p.box.w }));
      } catch (e) {
        check(group, `${tag}: the probe ran to the end`, false, String(e.stack ?? e).split('\n').slice(0, 3).join(' | '));
      } finally {
        await page.context().close();
      }
    }
  }

  // Hover, keyboard focus, offscreen and hidden-tab pauses of the About instance, measured on rendered values.
  if (pauses) await solutionsMotionChecks({ open, settle, check, sleep, only: 'en/about/' });
}
