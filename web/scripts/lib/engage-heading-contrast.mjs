// Contrast of the gradient headings (.grad-text: the lane word of every hero h1 and the closing band's h2) measured on
// composited pixels. The text is transparent with a gradient clipped to its glyphs and sits over a moving mesh, so no
// colour arithmetic on styles can say what a reader sees. For each heading four screenshots of the same clip are taken:
//   real   the page as shown,
//   hidden the same page with only that span hidden (the true backdrop under every glyph pixel),
//   white / black  the span in solid white and solid black (their difference is the glyph's coverage, whatever the backdrop is).
// A pixel counts when its coverage is full and so are its four neighbours' (anti-aliased edges are left out). Its contrast
// is the ratio of the real pixel to the hidden-span pixel at the same place. The lowest ratio over the glyph interiors must
// meet WCAG AA: 3:1 for large text (24px, or 18.66px bold), 4.5:1 otherwise.
// Only the named decorative orbit dots (.orbits .fdot in the hero and closing band) are hidden during the four captures.
// With motion on, the mesh blobs, the gradient's own shift and the closing band's clip are frozen at five seeded points
// of their loops first (`freezeAt`). These are sampled frames, not an exhaustive minimum over time.

const group = 'engage-heading-contrast';

const pages = ['messaging', 'guardian-portal', 'teams', 'custom-branded-apps', 'integrations'];
const widths = [390, 1440];

// In page: decode the four captures and return the lowest contrast over the glyph interiors.
const analyse = async ({ real, hidden, white, black, large }) => {
  const load = async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(bmp, 0, 0);
    return x.getImageData(0, 0, bmp.width, bmp.height);
  };
  const [R, H, W, B] = await Promise.all([real, hidden, white, black].map(load));
  const { width: w, height: h } = R;
  const lum = (r, g, b) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const full = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    full[i] = W.data[o] - B.data[o] >= 250 && W.data[o + 1] - B.data[o + 1] >= 250 && W.data[o + 2] - B.data[o + 2] >= 250 ? 1 : 0;
  }
  let min = Infinity;
  let at = null;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!(full[i] && full[i - 1] && full[i + 1] && full[i - w] && full[i + w])) continue;
      const o = i * 4;
      const a = lum(R.data[o], R.data[o + 1], R.data[o + 2]);
      const b = lum(H.data[o], H.data[o + 1], H.data[o + 2]);
      const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      n++;
      if (r < min) {
        min = r;
        at = { x, y, text: [R.data[o], R.data[o + 1], R.data[o + 2]], backdrop: [H.data[o], H.data[o + 1], H.data[o + 2]] };
      }
    }
  }
  return { pixels: n, min: n ? min : null, at, need: large ? 3 : 4.5 };
};

/** Pause every infinite CSS loop and every clip at a point derived from `seed` (same seed, same frame). */
export async function freezeAt(page, seed) {
  await page.evaluate(async (seed) => {
    let s = seed >>> 0;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      if (!t || t.iterations !== Infinity || typeof t.duration !== 'number') continue;
      a.pause();
      a.currentTime = rnd() * t.duration * 2;
    }
    for (const v of document.querySelectorAll('video')) {
      const r = v.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      for (let n = 0; n < 40 && (v.readyState < 2 || !Number.isFinite(v.duration)); n++) await new Promise((q) => setTimeout(q, 100));
      v.pause();
      if (v.readyState < 2 || !Number.isFinite(v.duration)) continue;
      const done = new Promise((r) => v.addEventListener('seeked', r, { once: true }));
      v.currentTime = rnd() * v.duration;
      await Promise.race([done, new Promise((r) => setTimeout(r, 1500))]);
    }
  }, seed);
  await page.waitForTimeout(120);
}

/** Shared by the evidence run and the mutation proof: measure every .grad-text in the open page. */
export async function measureGradHeadings(page, seed = null) {
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('.grad-text')].map((el, i) => {
      el.setAttribute('data-gt', String(i));
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.fontSize);
      return { i, text: el.textContent.trim().slice(0, 24), large: px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700) };
    }),
  );
  const out = [];
  for (const g of found) {
    await page.evaluate((i) => document.querySelector(`[data-gt="${i}"]`).scrollIntoView({ block: 'center', behavior: 'instant' }), g.i);
    await page.waitForTimeout(350);
    await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.playState === 'running').map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 1500))]));
    if (seed !== null) await freezeAt(page, seed * 31 + g.i);
    const clip = await page.evaluate((i) => {
      const r = document.querySelector(`[data-gt="${i}"]`).getBoundingClientRect();
      const x = Math.max(0, Math.floor(r.left) - 2);
      const y = Math.max(0, Math.floor(r.top) - 2);
      return { x, y, width: Math.min(innerWidth - x, Math.ceil(r.width) + 4), height: Math.min(innerHeight - y, Math.ceil(r.height) + 4) };
    }, g.i);
    const style = (css) =>
      page.evaluate(([i, css]) => {
        const el = document.querySelector(`[data-gt="${i}"]`);
        if (!el.dataset.gtStyle) el.dataset.gtStyle = el.getAttribute('style') ?? '';
        el.setAttribute('style', `${el.dataset.gtStyle};${css}`);
      }, [g.i, css]);
    const shot = async (css) => {
      await style(css);
      return (await page.screenshot({ clip, type: 'png' })).toString('base64');
    };
    const solid = (c) => `background-image:none !important;color:${c} !important;-webkit-text-fill-color:${c} !important`;
    const decoration = await page.addStyleTag({ content: '.eg-hero .orbits .fdot, .final .orbits .fdot { visibility:hidden !important; }' });
    try {
      const real = await shot('');
      const hidden = await shot('visibility:hidden');
      const white = await shot(solid('#fff'));
      const black = await shot(solid('#000'));
      const r = await page.evaluate(analyse, { real, hidden, white, black, large: g.large });
      out.push({ ...g, ...r });
    } finally {
      await style('');
      await decoration.evaluate((el) => el.remove());
    }
  }
  return out;
}

const seeds = [1, 2, 3, 4, 5];

export async function engageHeadingContrast({ open, check, settle, metrics }) {
  const only = process.env.ENGAGE_ONLY?.split(',');
  const selected = pages.filter((slug) => !only || only.includes(slug));
  const lowest = (rows) => (rows.length ? Math.min(...rows.map((r) => r.min ?? 0)).toFixed(2) : 'none');
  const bad = (rows) => rows.filter((r) => r.pixels === 0 || r.min < r.need);
  const why = (rows) => bad(rows).map((r) => `"${r.text}" ${r.min?.toFixed(2) ?? 'no glyph pixels'}:1 < ${r.need}:1 at ${JSON.stringify(r.at)}`).join(' | ');
  for (const lang of ['en', 'es']) {
    for (const slug of selected) {
      const path = `${lang === 'en' ? '' : '/es'}/platform/${slug}/`;
      for (const width of widths) {
        const view = { width, height: width < 500 ? 844 : 900, mobile: width < 500 };
        for (const scheme of ['light', 'dark']) {
          const page = await open({ ...view, scheme, reduced: true }, path);
          await settle(page);
          const rows = await measureGradHeadings(page);
          check(group, `${lang}/${slug} ${scheme} at ${width}: gradient headings meet AA on composited pixels, reduced motion (${rows.length} headings, lowest ${lowest(rows)}:1)`, rows.length >= 2 && bad(rows).length === 0, why(rows));
          metrics[`heading-contrast-${lang}-${slug}-${scheme}-${width}`] = rows.map((r) => ({ text: r.text, min: r.min && Number(r.min.toFixed(2)), pixels: r.pixels }));
          await page.context().close();
        }
        // Motion on: the same minimum requirement, with the loops frozen at five seeded points.
        const page = await open({ ...view, scheme: 'dark' }, path);
        await settle(page);
        const all = [];
        for (const seed of seeds) all.push(...(await measureGradHeadings(page, seed)));
        check(group, `${lang}/${slug} at ${width}: minimum gradient-heading glyph-interior contrast meets AA at ${seeds.length} points of the mesh, gradient and clip loops (${all.length} samples, lowest pixel ${lowest(all)}:1)`, all.length >= seeds.length * 2 && bad(all).length === 0, why(all));
        await page.context().close();
      }
    }
  }
}
