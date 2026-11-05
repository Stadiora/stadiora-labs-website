// Contrast checks for the API and legal pages, built on the glyph-pixel oracle (lib/glyph-contrast.mjs).
//   - Every page is scrolled through at 390 and 1440, light and dark, normal and reduced motion. At each stop the page is frozen
//     (hidden tab, finite moves finished, endless loops paused) and every painted text node is judged over its glyph pixels.
//     Where a loop, a gradient heading, a video or the hero's script timeline is in view, it is seeked to four phases first.
//   - A node's verdict is the minimum over all its samples. Nothing is skipped for sitting on an image, a video or a gradient.
//     Only two kinds of text are not judged: the two reviewed aria-hidden decorations (the footer watermark and the wall of raw
//     numbers; any other data-decorative text is judged and fails), and the reviewed aria-hidden .dw-card and .dw-caption
//     directly inside .dw-sticky[data-scrub], marked data-scrub-fade, between its two ends. Any other data-scrub-fade marker
//     fails by element name, even without painted text. The stationary eyebrow and heading are judged on every
//     frame, and the scene is scanned at a stop for every 0.05 of the wall's --q (data-scrub-pin), so a state lasting 0.1 of --q or more cannot be stepped over.
//   - Canaries: a word over a band that is ~1:1 for a few glyph pixels, a gradient heading faded into its backdrop and small grey
//     text must all FAIL, and a legible control must pass. This is what stops the oracle from being quietly loosened.
import { collectFn, describe, fold, freezeFn, measure, seekFn, thawFn, verdict } from './glyph-contrast.mjs';

export const apiPages = [
  { path: '/api.html', tag: 'api-en' },
  { path: '/api-es.html', tag: 'api-es' },
  { path: '/privacy.html', tag: 'privacy' },
  { path: '/terms.html', tag: 'terms' },
];
export const widths = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
const PHASES = [0, 0.34, 0.67, 0.9];

const inView = () => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  };
  // The page-wide backdrops (mesh, orbits) loop everywhere, so they alone do not ask for more phases.
  const loops = document.getAnimations().some((a) => {
    const t = a.effect?.target;
    return a.effect.getComputedTiming().iterations === Infinity && t && !t.closest?.('.mesh, .orbits') && vis(t);
  });
  return loops || [...document.querySelectorAll('[data-gc-clip], video')].some(vis);
};

/**
 * Scroll positions through a scroll-scrubbed pin, chosen in --q space. datawall.ts sets --q = ease(clamp(p * 1.18)) with a cubic
 * ease that is steep in the middle (dq/dp is about 7 at q = 0.5), so stops evenly spaced in scroll progress jump over whole bands of
 * q. One stop at every 0.05 of --q (and one past the end) cannot be stepped over by a state that lasts 0.1 of --q or longer.
 * A state narrower than 0.05 of --q is NOT covered.
 */
const scrubStops = () =>
  [...document.querySelectorAll('[data-scrub-pin]')].flatMap((pin) => {
    const top = pin.getBoundingClientRect().top + scrollY;
    const run = pin.offsetHeight - innerHeight;
    // inverse of the pin's cubic ease: the k (0..1) whose eased value is q
    const unease = (q) => (q < 0.5 ? Math.cbrt(q / 4) : 1 - Math.cbrt(2 * (1 - q)) / 2);
    const fracs = Array.from({ length: 20 }, (_, i) => unease(i * 0.05) / 1.18);
    return [...fracs, 0.96].map((f) => Math.round(top + run * f));
  });

/** Scrolls through the page and folds every sample into `acc`. */
export async function scanPage(page, decoder, acc, { sleep, tag, scope = null, wait = 1700, phases = PHASES }) {
  const { height } = page.viewportSize();
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.round(height * 0.7);
  const stops = [];
  for (let y = 0; y < total - height + step; y += step) stops.push(y);
  stops.push(...(await page.evaluate(scrubStops)));
  let samples = 0;
  for (const y of stops.sort((a, b) => a - b)) {
    await page.evaluate(thawFn);
    await page.evaluate((v) => scrollTo(0, v), y);
    await sleep(wait);
    await page.evaluate(freezeFn);
    await sleep(120);
    await page.evaluate(collectFn, { scope });
    const more = await page.evaluate(inView);
    for (const p of more ? phases : [0]) {
      if (more) await page.evaluate(seekFn, p);
      await sleep(80);
      fold(acc, await measure(page, decoder, { scope }), `${tag} y=${y} phase=${p}`);
      samples++;
    }
  }
  return samples;
}

/**
 * The oracle must be able to fail. Four planted words on a clean overlay in the real page (so the page's own styles apply):
 * a word that crosses a mid-grey band (only a handful of its glyph pixels are at ~1:1, a percentile would pass it), a gradient
 * heading faded into its backdrop, small grey body text, and a control that is fine and must pass.
 */
async function oracleCanaries({ open, check, sleep, decoder }) {
  const page = await open({ width: 1440, height: 900 }, '/api.html');
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    const o = document.createElement('div');
    o.id = 'gc-canary';
    o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fff;padding:40px;font-family:Inter,sans-serif';
    o.innerHTML =
      '<p id="c-band" style="margin:0 0 30px;width:420px;padding:10px 0;font:800 64px/1 Inter,sans-serif;color:#808080;background:linear-gradient(90deg,#fff 0,#fff 205px,#000 215px,#000 100%)">BANDED</p>' +
      '<h2 id="c-fade" class="grad-text" style="margin:0 0 30px;font-size:64px;line-height:1;opacity:.32">Faded heading</h2>' +
      '<p id="c-grey" style="margin:0 0 30px;font-size:16px;color:#9AA3B2">Small grey body text that is too light</p>' +
      '<p id="c-ok" style="margin:0 0 30px;font-size:16px;color:#0B1220">A control that is plainly legible</p>' +
      '<p id="c-deco" data-decorative style="margin:0;font-size:16px;color:#0B1220">Legible text under a stray data-decorative</p>';
    document.body.append(o);
  });
  await sleep(200);
  await page.evaluate(freezeFn);
  await sleep(150);
  const rows = await measure(page, decoder, { scope: '#gc-canary' });
  const by = (t) => rows.find((r) => r.text.startsWith(t));
  const band = by('BANDED');
  const fade = by('Faded');
  const grey = by('Small grey');
  const ok = by('A control');
  const stray = by('Legible text under');
  check('page-contrast', 'oracle canary: a word over a band that is ~1:1 for a few glyph pixels is caught (no percentile)', !!band?.painted && band.min < 1.3, `min ${band?.min?.toFixed(2)}:1`);
  check('page-contrast', 'oracle canary: a gradient heading faded into its backdrop is caught', !!fade?.painted && fade.min < 3, `min ${fade?.min?.toFixed(2)}:1`);
  check('page-contrast', 'oracle canary: small grey body text under 4.5:1 is caught', !!grey?.painted && grey.min < 4.5, `min ${grey?.min?.toFixed(2)}:1`);
  check('page-contrast', 'oracle canary: the legible control passes', !!ok?.painted && ok.min >= 4.5, `min ${ok?.min?.toFixed(2)}:1`);
  check('page-contrast', 'oracle canary: text under data-decorative outside the two reviewed decorations is flagged, even when legible', !!stray?.deco, stray ? `flagged ${stray.deco}` : 'the element was skipped');
  await page.context().close();
}

export async function pageContrastChecks({ open, check, sleep, metrics, browser, only = null }) {
  const decoder = await (await browser.newContext()).newPage();
  await decoder.goto('about:blank');
  if (!only || only === 'canary') await oracleCanaries({ open, check, sleep, decoder });
  if (only === 'canary') {
    await decoder.context().close();
    return;
  }
  const jobs = [];
  for (const { path, tag } of apiPages) {
    for (const { width, height } of widths) {
      for (const scheme of ['light', 'dark']) {
        for (const reduced of [false, true]) {
          // Reduced motion is the settled version of the page; it is scanned in one theme per width to bound the run.
          if (reduced && scheme === 'dark' && tag !== 'api-en') continue;
          if (only) {
            const [t, w, s, r] = only.split(',');
            if (t !== tag || Number(w) !== width || s !== scheme || Boolean(r) !== reduced) continue;
          }
          jobs.push({ path, tag, width, height, scheme, reduced });
        }
      }
    }
  }
  const run = async (j) => {
    const label = `${j.tag} ${j.width} ${j.scheme}${j.reduced ? ' reduced' : ''}`;
    let acc;
    let samples;
    // A browser timeout on a loaded host is not a verdict: redo the whole job on a fresh page. Findings are never retried.
    for (let attempt = 1; ; attempt++) {
      const page = await open({ width: j.width, height: j.height, scheme: j.scheme, reduced: j.reduced }, j.path);
      acc = new Map();
      try {
        samples = await scanPage(page, decoder, acc, { sleep, tag: label });
        await page.context().close();
        break;
      } catch (e) {
        await page.context().close().catch(() => {});
        if (e?.name !== 'TimeoutError' || attempt >= 3) throw e;
      }
    }
    const v = verdict(acc);
    check('page-contrast', `${label}: every painted text node meets AA over its glyph pixels (${v.painted} nodes, ${samples} frames)`, v.painted >= 40 && v.fails.length === 0, v.fails.length ? `${v.fails.length} fail; ${v.fails.slice(0, 4).map(describe).join(' | ')}` : `lowest ${(v.lowest * 100).toFixed(0)}% of its threshold`);
    metrics[`page-contrast-${label}`] = { nodes: v.nodes, painted: v.painted, unpainted: v.unpainted, frames: samples };
  };
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let j = queue.shift(); j; j = queue.shift()) await run(j);
    }),
  );
  await decoder.context().close();
}
