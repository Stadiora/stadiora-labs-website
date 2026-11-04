// Glyph-pixel text contrast. The oracle judges what is rendered, at the pixels the letters cover, not what the CSS says.
//
// For one frozen viewport it takes four screenshots that differ only in how text is filled:
//   A  as the page renders       N  all text transparent (the backdrop under the letters; clip-text gradients removed)
//   K  all text black            W  all text white
// A glyph pixel with coverage a over backdrop B renders K = (1-a)B and W = a*255 + (1-a)B, so a = (W-K)/255 and the
// effective letter colour is F = (A - (1-a)B) / a. Contrast is F against B, and the verdict for a text node is the MINIMUM
// over every core glyph pixel of every line it occupies. No percentile, no averaging, no rectangle or image exemption:
// text over photos, video frames, gradients and gradient-filled headings is judged the same way as text on flat colour.
//
// Text under an opacity below 1 is judged after that fade (letter = backdrop + opacity x (letter - backdrop)), as a reader sees it.
//
// A node is core-measured on pixels whose coverage is at least 80% of the node's own maximum (and at least 0.3), so the
// anti-aliased fringe is left out but every solid stroke counts. Large text (>= 24 px, or >= 18.66 px at weight >= 700) needs
// 3:1, everything else 4.5:1.
//
// The caller scrolls through the page, seeks videos and gradient animations to several phases and calls `measure()` at each.

// ---- in the page being measured -------------------------------------------------------------------------------------

/** Freezes the page: the tab reads as hidden (the kit parks every stage), animations pause, videos pause. */
export const freezeFn = () => {
  document.documentElement.style.scrollBehavior = 'auto';
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
  // Moves that end (a word swap, a reveal) are judged at their end state; loops are paused where they are and seeked by seekFn.
  for (const a of document.getAnimations()) {
    if (Number(a.effect?.getComputedTiming().iterations) === Infinity) a.pause();
    else {
      try {
        a.finish();
      } catch {
        a.pause();
      }
    }
  }
  for (const v of document.querySelectorAll('video')) v.pause();
};
export const thawFn = () => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  for (const a of document.getAnimations()) if (a.playState === 'paused') a.play();
};

/** Seeks every endless loop and every visible clip to a phase in [0,1). Returns how many of each it moved. */
export const seekFn = async (phase) => {
  let clips = 0;
  let videos = 0;
  for (const a of document.getAnimations()) {
    // Every endless loop (gradient text, CSS loops, the kit's script timelines) goes to the same phase of its own length.
    if (a.effect?.getComputedTiming().iterations === Infinity) {
      const d = Number(a.effect.getComputedTiming().duration);
      if (d > 0) {
        a.pause();
        a.currentTime = phase * d;
        clips++;
      }
    }
  }
  const waits = [];
  for (const v of document.querySelectorAll('video')) {
    const r = v.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || !(v.duration > 0)) continue;
    v.pause();
    waits.push(
      new Promise((res) => {
        const done = () => res();
        v.addEventListener('seeked', done, { once: true });
        setTimeout(done, 1500);
        v.currentTime = phase * v.duration;
      }),
    );
    videos++;
  }
  await Promise.all(waits);
  return { clips, videos };
};

/** The text nodes painted in the current viewport, with their line rectangles. Marks background-clip:text elements. */
export const collectFn = ({ scope }) => {
  const root = scope ? document.querySelector(scope) : document.body;
  for (const e of document.querySelectorAll('*')) {
    const cs = getComputedStyle(e);
    if ((cs.webkitBackgroundClip || cs.backgroundClip) === 'text') e.setAttribute('data-gc-clip', '');
  }
  const visible = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0 || n.hasAttribute('inert') || n.tagName === 'TEMPLATE') return false;
    }
    return true;
  };
  const label = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? `.${e.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let id = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\s+/g, ' ').trim();
    const e = n.parentElement;
    if (!text || !e || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(e.tagName) || !visible(e)) continue;
    // Only the two reviewed decorations stay out of the judgement: the wall of raw numbers and the footer watermark, and only
    // while they are aria-hidden. Any other data-decorative element is judged like normal text and is flagged as a failure.
    // (The same selector is in modeFn; both run inside the page, so it cannot be shared.)
    const deco = e.closest('[data-decorative]');
    let bad = false;
    if (deco) {
      if (deco.matches(':is(.dw-field, .footer__wordmark)[data-decorative][aria-hidden="true"]')) continue;
      bad = true;
    }
    // A scroll-scrubbed scene is judged on every frame. Only the parts that fade or move through the scrub, marked
    // data-scrub-fade, are judged at its two ends (q = 0 and q = 1); the frames between are a move, not a state.
    const fade = e.closest('[data-scrub-fade]');
    if (fade) {
      const scrub = fade.closest('[data-scrub]');
      const q = scrub ? parseFloat(scrub.style.getPropertyValue('--q')) : NaN;
      if (q > 0.02 && q < 0.98) continue;
    }
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth);
    if (!rects.length) continue;
    const cs = getComputedStyle(e);
    // A box that a fixed or sticky element (the nav, the legal contents bar) sits over is judged where it is uncovered.
    const covered = (r) => {
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      for (const top of document.elementsFromPoint(x, y)) {
        if (top === e || top.contains(e) || e.contains(top)) return false;
        for (let m = top; m && m !== document.body; m = m.parentElement) {
          const p = getComputedStyle(m).position;
          if ((p === 'fixed' || p === 'sticky') && !m.contains(e)) return getComputedStyle(m).pointerEvents !== 'none';
        }
      }
      return false;
    };
    const open = rects.filter((r) => !covered(r));
    if (!open.length) continue;
    // Faded text (a reveal, a dimmed ghost label) is judged as seen: the product of the opacity of the element and its ancestors.
    let op = 1;
    for (let m = e; m && m !== document.documentElement; m = m.parentElement) op *= parseFloat(getComputedStyle(m).opacity);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    nodes.push({ id: id++, op, text: text.slice(0, 48), sel: label(e), size, large, clip: e.hasAttribute('data-gc-clip') || !!e.closest('[data-gc-clip]'), deco: bad, rects: open.map((r) => [r.left, r.top, r.width, r.height]) });
  }
  return nodes;
};

/** Switches how text is filled: 'a' as rendered, 'n' transparent, 'k' black, 'w' white. */
export const modeFn = (mode) => {
  let s = document.getElementById('gc-style');
  if (!s) {
    s = document.createElement('style');
    s.id = 'gc-style';
    document.head.append(s);
  }
  const fill = { n: 'transparent', k: '#000', w: '#fff' }[mode];
  // The reviewed decorations only (see collectFn); any other data-decorative text is painted and measured like the rest.
  const DECO = ':is(.dw-field,.footer__wordmark)[data-decorative][aria-hidden="true"]';
  s.textContent =
    '*,*::before,*::after{transition:none!important;caret-color:transparent!important}' +
    (fill
      ? `*:not(DECO,DECO *),*:not(DECO,DECO *)::before,*:not(DECO,DECO *)::after{-webkit-text-fill-color:${fill}!important;-webkit-text-stroke:0!important}DECO,DECO *,DECO::before,DECO::after{-webkit-text-fill-color:currentcolor!important}svg text:not(DECO *),svg tspan:not(DECO *){fill:${fill}!important;stroke:none!important}[data-gc-clip]:not(DECO,DECO *){background:none!important}`
      : '').replaceAll('DECO', DECO);
};

// ---- in a plain page: decode the four screenshots and judge the pixels ----------------------------------------------

export const analyzeFn = async ({ shots, nodes, w, h }) => {
  const load = async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob(), { colorSpaceConversion: 'none' });
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const [A, N, K, W] = await Promise.all(shots.map(load));
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const out = [];
  for (const node of nodes) {
    let min = Infinity;
    let amax = 0;
    let core = 0;
    let worst = null;
    const pad = node.size >= 24 ? 4 : 2;
    for (const [rx, ry, rw, rh] of node.rects) {
      const x0 = Math.max(0, Math.floor(rx) - pad);
      const y0 = Math.max(0, Math.floor(ry) - pad);
      const x1 = Math.min(w, Math.ceil(rx + rw) + pad);
      const y1 = Math.min(h, Math.ceil(ry + rh) + pad);
      const cover = (i) => (W[i] - K[i] + (W[i + 1] - K[i + 1]) + (W[i + 2] - K[i + 2])) / 765;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) amax = Math.max(amax, cover((y * w + x) * 4));
    }
    if (amax >= 0.08) {
      const thr = Math.max(0.3, 0.8 * amax);
      for (const [rx, ry, rw, rh] of node.rects) {
        const x0 = Math.max(0, Math.floor(rx) - pad);
        const y0 = Math.max(0, Math.floor(ry) - pad);
        const x1 = Math.min(w, Math.ceil(rx + rw) + pad);
        const y1 = Math.min(h, Math.ceil(ry + rh) + pad);
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            const a = (W[i] - K[i] + (W[i + 1] - K[i + 1]) + (W[i + 2] - K[i + 2])) / 765;
            if (a < thr) continue;
            const f = [0, 1, 2].map((c) => {
              const letter = Math.min(255, Math.max(0, (A[i + c] - (1 - a) * N[i + c]) / a));
              return N[i + c] + node.op * (letter - N[i + c]);
            });
            const l1 = lum(f[0], f[1], f[2]);
            const l2 = lum(N[i], N[i + 1], N[i + 2]);
            const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
            core++;
            if (ratio < min) {
              min = ratio;
              worst = { x, y, fg: f.map(Math.round), bg: [N[i], N[i + 1], N[i + 2]] };
            }
          }
        }
      }
    }
    out.push({ id: node.id, text: node.text, sel: node.sel, size: node.size, large: node.large, clip: node.clip, deco: node.deco, painted: core > 0, core, min: core ? min : null, worst });
  }
  return out;
};

// ---- the driver, in node --------------------------------------------------------------------------------------------

/**
 * Measures the current viewport. `decoder` is a Playwright page on about:blank. Returns one row per painted text node.
 * `scope` limits to a selector. The page must already be frozen and, for clip text and clips, seeked.
 */
export async function measure(page, decoder, { scope = null } = {}) {
  const nodes = await page.evaluate(collectFn, { scope });
  const vp = page.viewportSize();
  const shots = [];
  for (const mode of ['a', 'n', 'k', 'w']) {
    await page.evaluate(modeFn, mode);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    shots.push((await page.screenshot({ type: 'png' })).toString('base64'));
  }
  await page.evaluate(modeFn, 'a');
  await page.evaluate(() => document.getElementById('gc-style')?.remove());
  const rows = await decoder.evaluate(analyzeFn, { shots, nodes, w: vp.width, h: vp.height });
  return rows;
}

/** Folds the rows of many samples into one verdict per text node (keyed by text and selector): the minimum ratio ever seen. */
export function fold(acc, rows, tag) {
  for (const r of rows) {
    const key = `${r.sel}|${r.text}`;
    const cur = acc.get(key) ?? { deco: false, text: r.text, sel: r.sel, need: r.large ? 3 : 4.5, min: Infinity, painted: false, at: '', worst: null, samples: 0 };
    cur.samples++;
    cur.deco ||= !!r.deco;
    if (r.painted) {
      cur.painted = true;
      if (r.min < cur.min) {
        cur.min = r.min;
        cur.at = tag;
        cur.worst = r.worst;
      }
    }
    acc.set(key, cur);
  }
}

export const verdict = (acc) => {
  const all = [...acc.values()];
  const painted = all.filter((r) => r.painted);
  const low = painted.filter((r) => !r.deco && r.min < r.need - 0.005).sort((a, b) => a.min / a.need - b.min / b.need);
  // Text under any data-decorative element other than the two reviewed decorations fails whatever its contrast.
  const fails = [...low, ...all.filter((r) => r.deco)];
  return { nodes: all.length, painted: painted.length, unpainted: all.length - painted.length, fails, lowest: painted.length ? Math.min(...painted.map((r) => r.min / r.need)) : 0 };
};

export const describe = (r) => r.deco ? `"${r.text}" (${r.sel}) sits under data-decorative but is not one of the two reviewed aria-hidden decorations (.dw-field, .footer__wordmark)` : `"${r.text}" (${r.sel}) ${r.min.toFixed(2)}:1 < ${r.need}:1 at ${r.at}, letter rgb(${r.worst?.fg}) on rgb(${r.worst?.bg})`;
