// Pixel contrast for the Solutions, Resources and company pages (EN and ES, light and dark, 390 and 1440, reduced motion).
//
// The DOM probe in contrast.mjs cannot score text over an image or a gradient. This samples composited pixels:
//   1. the page is photographed five times with only the text changed: as it is, with the text invisible (the real backdrop
//      under every glyph, text-shadow and glass included), with the text forced black and with it forced white, and as a glyph
//      mask (only the text, black on a blank white page, same layout and same animation frame);
//   2. black and white differ by the glyph coverage over the real backdrop, and the mask gives the coverage of the text alone. A
//      pixel is "glyph interior" when either says the glyph covers it completely (anti-aliased edges are not scored). The mask is
//      what keeps a glyph in the measurement when something paints OVER it in the real photograph (an orbit dot, a badge, a
//      scrim): that layer lowers the black/white difference, but not the mask;
//   3. for every glyph sample the colour that really reached the screen (gradient stops and anything painted over the text
//      included) is compared with the backdrop that pixel has without the text, as a WCAG contrast ratio. A stroke that a
//      foreground layer erases can read 1:1. The lowest sampled interior pixel of a text node is
//      its score: 4.5:1, or 3:1 for large text (24 px, or 18.66 px at weight 700).
// Enumeration skips hidden, near-transparent and 1px-clipped text, PURE_DECORATION and FAN_PHONE_TEXT below. Nodes without
// enough sampled pixels return null. Motion is sampled at selected frames, not continuously. See README's pixel-contrast
// coverage boundary: the committed-head proof IDs cover front-text/descendant erasure, both reviewed foreground-dot cases,
// repeated transition-free captures and the clean control; they do not prove arbitrary overlays, clipping or text layouts.
import { inflateSync } from 'node:zlib';

// Explicit decorative backdrops, left unchanged in the photographs.
export const PURE_DECORATION = '.sx-a__glyph[aria-hidden="true"], .footer__wordmark[aria-hidden="true"]';

// Only the intentionally occluded fanned neighbours' subtrees are exempt, including their visible words. The front phone and
// siblings painted over it remain candidates (proofs: front-text-erase, descendant-erase). No rectangle or paint-order inference.
export const FAN_PHONE_TEXT = '.sx-morph > .sx-ms.l1, .sx-morph > .sx-ms.r1';

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
const BAND = 3000;
const AA = 4.5;
const AA_LARGE = 3;
// A pixel is glyph interior when the glyph mask covers it at least this much.
const FULL = 0.97;

// ---------------------------------------------------------------- PNG decoding (8-bit RGB or RGBA, no interlace)
export function decodePng(buf) {
  let p = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let type = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const kind = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      depth = body[8];
      type = body[9];
      if (body[12]) throw new Error('interlaced PNG');
    } else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    p += len + 12;
  }
  if (depth !== 8 || (type !== 2 && type !== 6)) throw new Error(`unsupported PNG (depth ${depth}, colour type ${type})`);
  const bpp = type === 6 ? 4 : 3;
  const stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4, 255);
  let prev = Buffer.alloc(stride);
  let cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      let v;
      if (f === 0) v = row[i];
      else if (f === 1) v = row[i] + a;
      else if (f === 2) v = row[i] + b;
      else if (f === 3) v = row[i] + ((a + b) >> 1);
      else {
        const c = i >= bpp ? prev[i - bpp] : 0;
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v = row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      out[o] = cur[x * bpp];
      out[o + 1] = cur[x * bpp + 1];
      out[o + 2] = cur[x * bpp + 2];
    }
    [prev, cur] = [cur, prev];
  }
  return { w, h, data: out };
}

// ---------------------------------------------------------------- WCAG
const lin = Float64Array.from({ length: 256 }, (_, v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
});
const lum = (d, o) => 0.2126 * lin[d[o]] + 0.7152 * lin[d[o + 1]] + 0.0722 * lin[d[o + 2]];
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// ---------------------------------------------------------------- in-page helpers (serialised, so self-contained)

// Candidate text nodes and their line boxes, in page coordinates.
const enumerate = () => {
  const skip = 'script, style, noscript, template, title';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const sx = scrollX;
  const sy = scrollY;
  const op = new Map();
  const opacityOf = (e) => {
    if (!e) return 1;
    if (!op.has(e)) op.set(e, Number(getComputedStyle(e).opacity) * opacityOf(e.parentElement));
    return op.get(e);
  };
  const path = (e) => {
    const parts = [];
    for (let n = e; n && n !== document.body && parts.length < 3; n = n.parentElement) {
      const cls = String(n.className?.baseVal ?? n.className ?? '').trim().split(/\s+/)[0];
      parts.unshift(`${n.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`);
    }
    return parts.join(' > ');
  };
  const clipped = (e) => {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const r = n.getBoundingClientRect();
      if (r.width <= 2 && r.height <= 2 && getComputedStyle(n).overflow !== 'visible') return true;
    }
    return false;
  };
  const out = [];
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const text = t.nodeValue.replace(/\s+/g, ' ').trim();
    const el = t.parentElement;
    if (!text || !el || el.closest(skip) || (window.__pcDecor && el.closest(window.__pcDecor)) || (window.__pcFan && el.closest(window.__pcFan))) continue;
    const cs = getComputedStyle(el);
    // screen-reader text (a 1px clipped box) paints nothing, so what lies under its overflow belongs to other text
    if (cs.visibility === 'hidden' || cs.display === 'none' || opacityOf(el) < 0.05 || clipped(el)) continue;
    range.selectNodeContents(t);
    const rects = [...range.getClientRects()]
      .filter((r) => r.width >= 2 && r.height >= 2)
      .map((r) => [r.left + sx, r.top + sy, r.right + sx, r.bottom + sy]);
    if (!rects.length) continue;
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    out.push({ text: text.slice(0, 40), path: path(el), size, weight, large: size >= 24 || (size >= 18.66 && weight >= 700), op: opacityOf(el), rects });
  }
  return out;
};

// Changes only the text: 'real' (as is), 'hide' (invisible), 'black' or 'white', or 'mask' (the text alone, black on a blank white
// page: every backdrop, image, clip and decoration removed, so nothing can paint over a glyph).
export const setInk = (mode) => {
  document.getElementById('pc-ink')?.remove();
  for (const e of document.querySelectorAll('[data-pc-t]')) e.removeAttribute('data-pc-t');
  if (mode === 'real') return;
  if (!window.__pcClip) {
    window.__pcClip = true;
    for (const e of document.querySelectorAll('*')) {
      const cs = getComputedStyle(e);
      if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') e.setAttribute('data-pc-clip', '');
    }
  }
  const ink = { hide: 'transparent', black: '#000', white: '#fff', mask: '#000' }[mode];
  const keep = window.__pcDecor ? `:not(:is(${window.__pcDecor}, ${window.__pcDecor.split(',').map((s) => `${s.trim()} *`).join(', ')}))` : '';
  const style = document.createElement('style');
  style.id = 'pc-ink';
  if (mode === 'mask') {
    // Everything is invisible except the elements that own a text node.
    const decor = window.__pcDecor ? `:is(${window.__pcDecor}, ${window.__pcDecor.split(',').map((s) => `${s.trim()} *`).join(', ')})` : ':not(*)';
    for (const e of document.querySelectorAll('body *')) {
      if (e.matches(decor) || e.closest('script, style, noscript, template, title')) continue;
      if ([...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim())) e.setAttribute('data-pc-t', '');
    }
    style.textContent = `
      html { background: #fff !important; }
      *, *::before, *::after { visibility: hidden !important; background: none !important; box-shadow: none !important; text-shadow: none !important; outline: none !important; border-color: transparent !important; mix-blend-mode: normal !important; text-decoration: none !important; color: ${ink} !important; -webkit-text-fill-color: ${ink} !important; -webkit-text-stroke: 0 !important; }
      svg text, svg tspan { fill: ${ink} !important; stroke: none !important; }
      [data-pc-t] { visibility: visible !important; }`;
    document.head.append(style);
    return;
  }
  style.textContent = `
    *${keep}, *${keep}::before, *${keep}::after { color: ${ink} !important; -webkit-text-fill-color: ${ink} !important; ${mode === 'hide' ? '' : 'text-shadow: none !important;'} }
    svg text${keep}, svg tspan${keep} { fill: ${ink} !important; stroke: none !important; }
    [data-pc-clip]${keep} { background-image: none !important; }
    ${window.__pcDecor ? `${window.__pcDecor}, ${window.__pcDecor.split(',').map((s) => `${s.trim()} *`).join(', ')} { -webkit-text-fill-color: currentcolor !important; }` : ''}`;
  document.head.append(style);
};

const docSize = () => ({ w: document.documentElement.clientWidth, h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) });

// ---------------------------------------------------------------- measuring
async function photograph(page, mode, w, h, clip) {
  await page.evaluate(setInk, mode);
  const bands = [];
  const top = clip?.y ?? 0;
  const bottom = clip ? clip.y + clip.height : h;
  for (let y = top; y < bottom; y += BAND) {
    const height = Math.min(BAND, bottom - y);
    bands.push(await page.screenshot({ fullPage: true, clip: { x: 0, y, width: w, height }, animations: 'allow' }));
  }
  return { top, bands };
}

/**
 * Samples candidate text nodes as the page stands (the caller has settled it). `clip` limits the photographs to one region
 * (page coordinates). A record's score is null when no pixels meet the sampling thresholds.
 */
export async function scorePage(page, { clip } = {}) {
  const { w, h } = await page.evaluate(docSize);
  await page.evaluate(([decor, fan]) => ((window.__pcDecor = decor), (window.__pcFan = fan)), [PURE_DECORATION, FAN_PHONE_TEXT]);
  const nodes = await page.evaluate(enumerate);
  const shots = {};
  const transitions = await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  try {
    for (const mode of ['real', 'hide', 'black', 'white', 'mask']) shots[mode] = await photograph(page, mode, w, h, clip);
  } finally {
    await page.evaluate(setInk, 'real');
    await transitions.evaluate((style) => {
      // Resolve restored ink while transitions are still suppressed, before returning to production styling.
      document.body.offsetHeight;
      style.remove();
    });
  }

  const stat = nodes.map(() => ({ n: 0, min: Infinity, at: null, thin: 0, thinMin: Infinity }));
  const count = shots.real.bands.length;
  for (let b = 0; b < count; b++) {
    const y0 = shots.real.top + b * BAND;
    const img = {};
    for (const mode of Object.keys(shots)) img[mode] = decodePng(shots[mode].bands[b]);
    const { w: iw, h: ih } = img.real;
    const R = img.real.data;
    const H = img.hide.data;
    const K = img.black.data;
    const W = img.white.data;
    const M = img.mask.data;
    // Coverage of a glyph at a pixel, 0..1, from the text's own opacity divided out (a faded text keeps its fade in all five
    // photographs, so it is scored as faded). `over` is the coverage as the real backdrop shows it: black and white differ by it, and
    // whatever paints over the glyph lowers it. `alone` is the coverage of the text on a blank page, which nothing can lower.
    const over = (x, y, op) => {
      if (x < 0 || y < 0 || x >= iw || y >= ih) return 1;
      const q = (y * iw + x) * 4;
      return Math.min(1, Math.min(W[q] - K[q], W[q + 1] - K[q + 1], W[q + 2] - K[q + 2]) / (255 * op));
    };
    const alone = (x, y, op) => {
      if (x < 0 || y < 0 || x >= iw || y >= ih) return 1;
      const q = (y * iw + x) * 4;
      return Math.min(1, (255 - Math.min(M[q], M[q + 1], M[q + 2])) / (255 * op));
    };
    // Interior means the pixel and its eight neighbours are fully covered: a glyph edge that the photographs rasterise a
    // sub-pixel apart (a rotated or faded layer) is then not mistaken for ink.
    const interiorOf = (coverage, x, y, op) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (coverage(x + dx, y + dy, op) < FULL) return false;
      return true;
    };
    nodes.forEach((node, k) => {
      const s = stat[k];
      const op = Math.max(node.op, 0.05);
      for (const [l, t, r, bt] of node.rects) {
        const xa = Math.max(0, Math.floor(l));
        const xb = Math.min(iw, Math.ceil(r));
        const ya = Math.max(y0, Math.floor(t)) - y0;
        const yb = Math.min(y0 + ih, Math.ceil(bt)) - y0;
        for (let y = Math.max(0, ya); y < yb; y++) {
          for (let x = xa; x < xb; x++) {
            const o = (y * iw + x) * 4;
            const seen = over(x, y, op);
            const bare = alone(x, y, op);
            if (seen < 0.5 && bare < FULL) continue;
            const c = ratio(lum(R, o), lum(H, o));
            // Glyph interior by the real photographs, or by the bare text: a layer painted over the stroke lowers only the first.
            if ((seen >= FULL && interiorOf(over, x, y, op)) || (bare >= FULL && interiorOf(alone, x, y, op))) {
              s.n++;
              if (c < s.min) {
                s.min = c;
                s.at = [x, y + y0];
              }
            } else if (seen >= 0.5) {
              // Hairline text has no interior: score its best-covered pixels by what they would be at full coverage.
              const full = ratioAtFull(R, H, o, seen);
              s.thin++;
              if (full < s.thinMin) s.thinMin = full;
            }
          }
        }
      }
    });
  }
  return nodes.map((node, k) => {
    const s = stat[k];
    const measured = s.n > 0 ? s.min : s.thin >= 4 ? s.thinMin : null;
    return { ...node, rects: undefined, score: measured, interior: s.n, at: s.at, estimated: s.n === 0 && s.thin >= 4 };
  });
}

// What the ink contrast would be if this partly covered pixel were fully covered: undo the blend R = cov*ink + (1-cov)*backdrop.
function ratioAtFull(R, H, o, cov) {
  const ink = [0, 1, 2].map((i) => Math.max(0, Math.min(255, Math.round((R[o + i] - (1 - cov) * H[o + i]) / cov))));
  return ratio(lum(Uint8Array.from(ink), 0), lum(H, o));
}

export const failures = (scored) => scored.filter((n) => n.score !== null && n.score < (n.large ? AA_LARGE : AA));

const describe = (n) => `"${n.text}" ${n.size}px${n.weight >= 700 ? ' bold' : ''} ${n.score.toFixed(2)}:1 < ${n.large ? AA_LARGE : AA} (${n.path})`;

// ---------------------------------------------------------------- the checks
const CANARY = `
  <div id="pc-canary" style="position:absolute;left:0;top:0;width:100%;height:260px;z-index:2147483000;background:#0b1730;padding:24px;font:400 18px/1.4 sans-serif">
    <p id="pc-low" style="margin:0 0 12px;color:#4a5568">canary low contrast solid text</p>
    <p id="pc-grad" style="margin:0 0 12px;display:inline-block;padding:0 8px;background-color:#00bef3;font:700 40px/1.2 sans-serif"><span style="background:linear-gradient(90deg,#00bef3,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent">canary gradient on cyan</span></p>
    <p id="pc-fade" style="margin:0 0 12px;color:#fff;opacity:.35">canary faded white text</p>
    <p id="pc-ok" style="margin:0;color:#fff">canary white on navy control</p>
  </div>`;

// ---------------------------------------------------------------- moving backdrops and lettering
// Reduced motion renders one frame. Three things move in the real page: the mesh blobs drift behind the heroes, gradient lettering
// sweeps its colours (gradShift), and the athlete morph wears four apps in turn. Those are photographed in more frames.
const PHASES = [0, 0.25, 0.5, 0.75, 0.97];

// Parks every endless CSS animation at one phase of its own cycle (the gradient letters all together, the others spread out so the
// blobs do not line up), so the frame is still while it is photographed.
const park = async (phase) => {
  const endless = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity);
  endless.forEach((a, i) => {
    const t = a.effect.getComputedTiming();
    const own = a.effect.target?.closest?.('.grad-text') ? phase : (phase + i * 0.37) % 1;
    a.pause();
    a.currentTime = Number(t.delay) + own * Number(t.duration);
  });
  // a clip behind the lettering shows a different frame at every phase
  const clips = [...document.querySelectorAll('video')].filter((v) => v.readyState >= 1 && v.duration > 0);
  await Promise.all(
    clips.map(
      (v) =>
        new Promise((done) => {
          v.pause();
          // 'seeked' fires before the new frame reaches the screen; the five photographs must all show it
          v.addEventListener('seeked', () => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => done()) : done()), { once: true });
          v.currentTime = Math.min(v.duration - 0.05, phase * v.duration);
          setTimeout(done, 1500);
        }),
    ),
  );
  return { animations: endless.length, clips: clips.length };
};

// Parks every endless CSS animation (and every clip) at the SAME elapsed time, as a page that has been running for `ms` shows them.
// `park` spreads the loops out on purpose so mesh blobs do not line up; the orbit dots of one section only meet its lettering at
// particular times of the shared clock, which spreading never reaches.
const parkSynced = async (ms) => {
  const endless = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity);
  endless.forEach((a) => {
    a.pause();
    a.currentTime = ms;
  });
  const clips = [...document.querySelectorAll('video')].filter((v) => v.readyState >= 1 && v.duration > 0);
  await Promise.all(
    clips.map(
      (v) =>
        new Promise((done) => {
          v.pause();
          // 'seeked' fires before the new frame reaches the screen; the five photographs must all show it
          v.addEventListener('seeked', () => (v.requestVideoFrameCallback ? v.requestVideoFrameCallback(() => done()) : done()), { once: true });
          v.currentTime = Math.min(v.duration - 0.05, (ms / 1000) % v.duration);
          setTimeout(done, 1500);
        }),
    ),
  );
  return { animations: endless.length, clips: clips.length };
};
// Elapsed times (ms) of the shared clock, spread over the dots' 16 s and 22 s laps; 5,500 and 21,500 are frames where an opaque dot
// and the old half-strength dot sat over the closing call's lettering.
const SYNCED = [3000, 5500, 9000, 13500, 17500, 21500];

// Page-coordinate bands of the sections that hold gradient lettering (the hero, a section head, the closing call), plus the hero.
const lettering = () => {
  const bands = [];
  const hosts = [...document.querySelectorAll('.grad-text')].map((g) => g.closest('section, header') ?? g.parentElement);
  for (const s of [...document.querySelectorAll('.sx-hero')].concat(hosts)) {
    const r = s.getBoundingClientRect();
    const top = Math.max(0, Math.floor(r.top + scrollY));
    const height = Math.min(1400, Math.ceil(r.height));
    const orbit = !!s.querySelector('.orbits .fdot');
    const seen = bands.find((b) => b.y === top && b.height === height);
    if (seen) seen.orbit ||= orbit;
    else bands.push({ y: top, height, orbit });
  }
  return bands;
};

async function sweepLettering(page, tag, scheme, width, { check, sleep, metrics, group }) {
  const bands = await page.evaluate(lettering);
  if (!bands.length) return;
  let worst = Infinity;
  const bad = [];
  let frames = 0;
  let clips = 0;
  // A hidden tab pauses every autoplayer and every CSS loop (the kit's own rule), so the words, images and phones stay put while a
  // frame is photographed; the loops are then parked at the phase being measured.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  for (const clip of bands) {
    await page.evaluate((y) => scrollTo(0, y), clip.y);
    await sleep(700);
    for (const phase of PHASES) {
      const parked = await page.evaluate(park, phase);
      clips = Math.max(clips, parked.clips);
      await sleep(60);
      // The fixed header rides over each band while it is scrolled to and slides in and out with the scroll: it is measured at rest
      // above, and is shared chrome, so it is left out of the moving frames.
      const scored = (await scorePage(page, { clip })).filter((n) => !n.path.includes('nav__'));
      frames++;
      for (const n of scored) if (n.score !== null) worst = Math.min(worst, n.score / (n.large ? AA_LARGE : AA));
      for (const n of failures(scored)) bad.push({ ...n, phase });
    }
    // Sections with orbit dots are also photographed on the shared clock (every loop at the same elapsed time).
    if (!clip.orbit) continue;
    for (const ms of SYNCED) {
      const parked = await page.evaluate(parkSynced, ms);
      clips = Math.max(clips, parked.clips);
      await sleep(60);
      const scored = (await scorePage(page, { clip })).filter((n) => !n.path.includes('nav__'));
      frames++;
      for (const n of scored) if (n.score !== null) worst = Math.min(worst, n.score / (n.large ? AA_LARGE : AA));
      for (const n of failures(scored)) bad.push({ ...n, phase: `${ms} ms` });
    }
  }
  metrics[`pixel-contrast-sweep-${tag}-${scheme}-${width}`] = { bands: bands.length, frames, clips, lowestVsNeeded: Number(worst.toFixed(2)) };
  check(
    group,
    `${tag} ${scheme} ${width}px: gradient lettering and the mesh keep AA at ${PHASES.length} phases of their cycle and on the shared clock at ${SYNCED.length} times (${bands.length} bands)`,
    bad.length === 0 && frames > 0,
    bad.length ? `${bad.length} failing: ${bad.slice(0, 4).map((n) => `${describe(n)} at phase ${n.phase}`).join('; ')}` : `${frames} frames, lowest ${worst.toFixed(2)}x of the needed ratio`,
  );
}

// Reduced motion shows the first app only, so the other apps are reached through the real autoplayer: wait until the label list
// shows app k, then hover the stage (which finishes the reveal and the name scramble) and photograph the hero.
async function stepMorph(page, tag, scheme, width, { check, sleep, metrics, group }) {
  const apps = await page.locator('[data-sx-ap-labels] [data-ap-lab]').count();
  const hero = await page.evaluate(() => {
    const s = document.querySelector('[data-sx-morph]').closest('section');
    const r = s.getBoundingClientRect();
    return { y: Math.max(0, Math.floor(r.top + scrollY)), height: Math.min(1400, Math.ceil(r.height)) };
  });
  const bad = [];
  let worst = Infinity;
  let stepped = 0;
  for (let k = 1; k < apps; k++) {
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.querySelector('[data-sx-morph]').scrollIntoView({ block: 'center' }));
    await page.waitForFunction((n) => document.querySelectorAll('[data-sx-ap-labels] [data-ap-lab]')[n]?.classList.contains('on'), k, { timeout: 20000, polling: 'raf' });
    const box = await page.locator('[data-sx-morph]').boundingBox();
    await page.mouse.move(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
    await sleep(1200);
    const held = await page.evaluate((n) => document.querySelectorAll('[data-sx-ap-labels] [data-ap-lab]')[n]?.classList.contains('on'), k);
    if (!held) {
      bad.push({ text: `app ${k} did not hold while hovered`, size: 0, weight: 0, score: 0, large: false, path: 'morph' });
      continue;
    }
    stepped++;
    // the brand reveal (a clip-path circle) is a finite animation: on a loaded machine it may still be growing after the pause
    await page.evaluate(() => Promise.all(document.querySelector('[data-sx-morph]').getAnimations({ subtree: true }).filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime)).map((a) => a.finished.catch(() => {})).concat(new Promise((r) => setTimeout(r, 3000)))));
    await sleep(150);
    const scored = await scorePage(page, { clip: hero });
    for (const n of scored) if (n.score !== null) worst = Math.min(worst, n.score / (n.large ? AA_LARGE : AA));
    for (const n of failures(scored)) bad.push({ ...n, app: k });
  }
  metrics[`pixel-contrast-morph-${tag}-${scheme}-${width}`] = { apps, stepped, lowestVsNeeded: Number(worst.toFixed(2)) };
  check(
    group,
    `${tag} ${scheme} ${width}px: the athlete morph keeps AA on every app (${apps} apps, ${stepped} stepped to)`,
    bad.length === 0 && apps >= 3 && stepped === apps - 1,
    bad.length ? `${bad.length} failing: ${bad.slice(0, 4).map((n) => `${describe(n)} app ${n.app}`).join('; ')}` : `lowest ${worst.toFixed(2)}x of the needed ratio`,
  );
}

export async function solutionsPixelContrastChecks({ open, check, sleep, settle, metrics = {}, only = process.env.SOLUTIONS_CONTRAST_ONLY }) {
  const group = 'solutions-pixel-contrast';
  const pool = async (items, size, fn) => {
    const queue = [...items];
    await Promise.all(
      Array.from({ length: size }, async () => {
        while (queue.length) await fn(queue.shift());
      }),
    );
  };

  // ---- canary: the measurement must be able to fail, on solid text, on gradient lettering and on faded text
  {
    const page = await open({ width: 1440, height: 900, scheme: 'dark', reduced: true }, '/solutions/schools/');
    await settle(page);
    await page.evaluate((html) => document.body.insertAdjacentHTML('afterbegin', html), CANARY);
    await sleep(150);
    const scored = await scorePage(page, { clip: { y: 0, height: 300 } });
    const bad = failures(scored);
    const flagged = (needle) => bad.some((n) => n.path.includes(needle) || n.text.includes(needle));
    check(group, 'canary: low-contrast solid text is flagged', flagged('canary low'), JSON.stringify(bad.map((n) => n.text)));
    check(group, 'canary: gradient lettering on a cyan block is flagged', flagged('canary gradient'), JSON.stringify(bad.map((n) => n.text)));
    check(group, 'canary: faded text is scored with its fade and flagged', flagged('canary faded'), JSON.stringify(bad.map((n) => n.text)));
    check(group, 'canary: white on navy passes', !flagged('canary white') && scored.some((n) => n.text.includes('canary white') && n.score > 10), JSON.stringify(scored.filter((n) => n.text.startsWith('canary')).map((n) => [n.text, n.score && +n.score.toFixed(2)])));
    await page.context().close();
  }

  // ---- mutation canary: the closing call as it was reviewed (dots painted over the lettering) must FAIL at the reviewer's frames
  {
    const old = '.sx-final .orbits { z-index: 0 !important; } .sx-final .orbits .fdot { opacity: var(--pc-dot, 0.5) !important; }';
    const page = await open({ width: 1440, height: 900, scheme: 'light', reduced: false }, '/solutions/coaches/');
    try {
      await settle(page);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      const band = await page.evaluate(() => {
        const r = document.querySelector('.sx-final').getBoundingClientRect();
        return { y: Math.max(0, Math.floor(r.top + scrollY)), height: Math.ceil(r.height) };
      });
      const frame = async (css, dot, ms) => {
        await page.evaluate(({ css, dot }) => {
          document.getElementById('pc-old')?.remove();
          if (!css) return;
          const st = document.createElement('style');
          st.id = 'pc-old';
          st.textContent = `.sx-final { --pc-dot: ${dot}; } ${css}`;
          document.head.append(st);
        }, { css, dot });
        await page.evaluate((y) => scrollTo(0, y), band.y);
        await sleep(500);
        await page.evaluate(parkSynced, ms);
        await sleep(80);
        const scored = (await scorePage(page, { clip: band })).filter((n) => !n.path.includes('nav__'));
        return { bad: failures(scored), low: Math.min(...scored.filter((n) => n.score !== null).map((n) => n.score / (n.large ? AA_LARGE : AA))) };
      };
      const half = await frame(old, 0.5, 21500);
      check(group, 'mutation: the reviewed z-order (dots over the lettering, 0.5) fails at 21,500 ms on Coaches', half.bad.length > 0, `${half.bad.length} failing, lowest ${half.low.toFixed(2)}x`);
      const full = await frame(old, 1, 5500);
      check(group, 'mutation: opaque dots over the lettering erase strokes and fail at 5,500 ms on Coaches', full.bad.length > 0, `${full.bad.length} failing, lowest ${full.low.toFixed(2)}x`);
      const fixed = await frame('', 1, 21500);
      check(group, 'mutation control: the shipped z-order passes the same frame', fixed.bad.length === 0, `lowest ${fixed.low.toFixed(2)}x`);
    } finally {
      await page.context().close();
    }
  }

  const cases = pages
    .flatMap(([name, path]) => ['en', 'es'].flatMap((locale) => ['light', 'dark'].flatMap((scheme) => [1440, 390].map((width) => ({ name, scheme, width, path: localized(locale, path), tag: `${locale}${path}`, locale })))))
    .filter((c) => !only || `${c.tag} ${c.scheme} ${c.width}`.includes(only));

  await pool(cases, 4, async ({ path, tag, scheme, width }) => {
    const page = await open({ width, height: width === 390 ? 844 : 900, scheme, reduced: true, mobile: width < 500 }, path);
    try {
      await settle(page);
      await sleep(250);
      const scored = await scorePage(page);
      const measured = scored.filter((n) => n.score !== null);
      const bad = failures(scored);
      const lowest = measured.reduce((m, n) => Math.min(m, n.score / (n.large ? AA_LARGE : AA)), Infinity);
      metrics[`pixel-contrast-${tag}-${scheme}-${width}`] = { nodes: scored.length, scored: measured.length, failing: bad.length, lowestVsNeeded: Number(lowest.toFixed(2)) };
      check(
        group,
        `${tag} ${scheme} ${width}px: every text reaches AA on the rendered pixels (glyph interior vs backdrop)`,
        bad.length === 0 && measured.length > 10,
        bad.length ? `${bad.length} failing of ${measured.length} scored: ${bad.slice(0, 6).map(describe).join('; ')}` : `${measured.length} text nodes scored, none below AA`,
      );
    } finally {
      await page.context().close();
    }
  });

  // ---- moving frames: the mesh and the gradient lettering at several phases, in the page with its animations running
  await pool(cases, 3, async ({ path, tag, scheme, width }) => {
    const page = await open({ width, height: width === 390 ? 844 : 900, scheme, reduced: false }, path);
    try {
      await settle(page);
      await sweepLettering(page, tag, scheme, width, { check, sleep, metrics, group });
    } finally {
      await page.context().close();
    }
  });

  // ---- the athlete morph: every app, not just the first that reduced motion shows
  const morphCases = cases.filter((c) => c.name === 'athletes');
  await pool(morphCases, 3, async ({ path, tag, scheme, width }) => {
    const page = await open({ width, height: width === 390 ? 844 : 900, scheme, reduced: false }, path);
    try {
      await settle(page);
      await stepMorph(page, tag, scheme, width, { check, sleep, metrics, group });
    } finally {
      await page.context().close();
    }
  });
}
