// In-page WCAG AA text-contrast probe, run with page.evaluate(contrastProbe, opts). It must stay self-contained.
// includeAriaHidden: also measure decorative (aria-hidden) demo text, which sighted users still read.
export const contrastProbe = ({ includeAriaHidden = false } = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const rgba = (css) => {
    if (!cache.has(css)) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      cache.set(css, [r, g, b, a / 255]);
    }
    return cache.get(css);
  };
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat(a);
  };
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const hidden = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
      if ((!includeAriaHidden && n.getAttribute('aria-hidden') === 'true') || n.hasAttribute('inert') || n.tagName === 'TEMPLATE') return true;
    }
    return false;
  };
  const bgOf = (e) => {
    let stack = [];
    let imageBg = false;
    for (let n = e; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      // Link underlines are a zero-width gradient until hover; only real image or gradient fills defeat the check.
      const fill = cs.backgroundImage;
      if (fill !== 'none' && (/url\(/.test(fill) || !/^0(px|%) /.test(cs.backgroundSize))) imageBg = true;
      stack.push(rgba(cs.backgroundColor));
      if (rgba(cs.backgroundColor)[3] >= 0.99) break;
    }
    let bg = [255, 255, 255, 1];
    for (const layer of stack.reverse()) bg = over(layer, bg);
    return { bg, imageBg };
  };
  const rows = [];
  let skippedImage = 0;
  let decorative = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    const e = node.parentElement;
    if (!e || seen.has(e) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName)) continue;
    seen.add(e);
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (hidden(e)) {
      if (e.closest('[aria-hidden="true"]') && getComputedStyle(e).display !== 'none') decorative++;
      continue;
    }
    const cs = getComputedStyle(e);
    const { bg, imageBg } = bgOf(e);
    if (imageBg) {
      skippedImage++;
      continue;
    }
    const fgRaw = rgba(cs.color);
    const fg = over([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * parseFloat(cs.opacity)], bg);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(fg, bg);
    rows.push({ text: node.textContent.trim().slice(0, 40), ratio: r, need, cls: String(e.className).slice(0, 40) || e.tagName });
  }
  const fails = rows.filter((r) => r.ratio < r.need - 0.005);
  return {
    checked: rows.length,
    min: Math.min(...rows.map((r) => r.ratio)),
    fails: fails.slice(0, 12),
    failCount: fails.length,
    skippedImage,
    decorative,
  };
};
