// Evidence checks for /pricing/ and /es/pricing/. Called from evidence.mjs with its browser, server and recorders.
//   node scripts/evidence.mjs --pricing-only            (checks plus screenshots)
//   node scripts/evidence.mjs --pricing-only --checks-only
//   node scripts/evidence.mjs --pricing-only --checks-only --pricing-group=reveals   (one group: data, region, prices,
//     behaviour, reveals, estimate, motion, fallback, layout, contrast, links; repeat it to look for flakes)
// It opens its own Playwright contexts (it needs a time zone per context) and carries its own price oracle
// (pricing-oracle.mjs): the numbers there are typed in from the epic (Stadiora/Aria#16544) and DECISIONS #3 to #5, not
// read back from src/data/prices.ts, so a wrong edit to the table fails here.
import { mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import * as table from '../../src/data/prices.ts';
import { regionFromTimeZone } from '../../src/lib/region.ts';
import { fill } from '../../src/lib/template.ts';
import { en, es } from '../../src/i18n/pages/pricing.ts';
import { contrastProbe } from './contrast.mjs';
import { estimateChecks } from './pricing-estimate-checks.mjs';
import { motionChecks } from './pricing-motion-checks.mjs';
import { ANNUAL_PERCENT, BRANDED, DEFAULT_BAND, EDU, EXTRA_COACH, FREE, ORACLE, annual, brandedFromText, copyProblems, everyAmount, fmt, sharedAmounts, sizes, tableProblems } from './pricing-oracle.mjs';

const { athleteBands } = table;
const copyFor = { en, es };
const paths = { en: '/pricing/', es: '/es/pricing/' };
const SIGN_UP = 'https://app.ariaforcoaches.com/signup';
const onlyGroup = process.argv.find((a) => a.startsWith('--pricing-group='))?.slice('--pricing-group='.length) ?? null;

function expectedState(region, billing, n, locale) {
  const copy = copyFor[locale];
  const [coaches, core, perf] = ORACLE[region][n];
  const per = (m) => (billing === 'annual' ? annual(m) : m);
  const billed = (m) => (billing === 'annual' ? fill(copy.price.billedYearly, { total: fmt(annual(m) * 12) }) : copy.price.billedMonthly);
  const meta = fill(copy.price.meta, { athletes: n.toLocaleString('en-US'), coaches: String(coaches) });
  const allowed = new Set([...sharedAmounts, per(core), per(perf), ...EDU[region], EXTRA_COACH[region]]);
  if (billing === 'annual') allowed.add(annual(core) * 12).add(annual(perf) * 12);
  return {
    core: fmt(per(core)),
    performance: fmt(per(perf)),
    coreMeta: meta,
    performanceMeta: meta,
    coreBilled: billed(core),
    performanceBilled: billed(perf),
    schools: fmt(Math.min(...EDU[region])),
    edu: EDU[region].map(fmt),
    extra: fmt(EXTRA_COACH[region]),
    allowed,
  };
}

// ---------------------------------------------------------------- in-page helpers (serialised into the page)
const readState = () => {
  const root = document.querySelector('[data-pricing]');
  const text = (sel) => document.querySelector(sel)?.textContent.trim() ?? null;
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
  const amounts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (skip.has(n.parentElement?.tagName ?? '') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (const m of n.textContent.matchAll(/\$\s?([\d,]+)/g)) amounts.push(Number(m[1].replace(/,/g, '')));
  }
  return {
    region: root.dataset.region,
    billing: root.dataset.billing,
    athletes: root.dataset.athletes,
    ready: root.hasAttribute('data-ready'),
    core: text('[data-amount="core"]'),
    performance: text('[data-amount="performance"]'),
    coreMeta: text('.pcard--core [data-meta]'),
    performanceMeta: text('.pcard--performance [data-meta]'),
    coreBilled: text('.pcard--core [data-billed]'),
    performanceBilled: text('.pcard--performance [data-billed]'),
    schools: text('[data-schools-from]'),
    edu: ['highSchool', 'department', 'college'].map((k) => text(`[data-edu-rate="${k}"]`)),
    extra: [...document.querySelectorAll('[data-extra-coach]')].map((e) => e.textContent.trim()),
    live: text('[data-live]'),
    fallback: root.hasAttribute('data-fallback'),
    // Each branded-app amount read where it shows: the marked span and the whole line it sits in.
    brandedStrip: { monthly: text('[data-addon="branded-app"] [data-price="branded-monthly"]'), setup: text('[data-addon="branded-app"] [data-price="branded-setup"]'), line: text('[data-addon="branded-app"] .addon__price') },
    brandedPanel: { monthly: text('#addon-branded-app [data-price="branded-monthly"]'), setup: text('#addon-branded-app [data-price="branded-setup"]'), line: text('#addon-branded-app .addon__fact') },
    extraStrip: text('[data-addon="extra-coach"] .addon__price [data-extra-coach]'),
    extraPanel: text('#addon-extra-coach [data-extra-coach]'),
    freePrice: text('.pcard--free .pcard__amount'),
    freeLine: text('.pcard--free .pcard__lines p'),
    saves: text('.saves'),
    amounts,
  };
};

// Text boxes and button boxes must stay inside their card, row or panel and must not overlap each other.
const readLayout = () => {
  const problems = [];
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 0.5) problems.push(`page scrolls sideways (${sw} > ${vw})`);
  const visible = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (n.classList.contains('sr-only')) return false;
    }
    return true;
  };
  const lines = (container) => {
    const out = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement || !visible(n.parentElement)) continue;
      if (n.parentElement.closest('[hidden]')) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width > 0.5 && r.height > 0.5) out.push({ text: n.textContent.trim().slice(0, 28), l: r.left, r: r.right, t: r.top, b: r.bottom, badge: Boolean(n.parentElement.closest('.pcard__badge')) });
      }
    }
    return out;
  };
  const name = (c) => (c.className ? String(c.className).split(' ')[0] : c.tagName);
  for (const c of document.querySelectorAll('.pcard, .controls, .addon, .est')) {
    if (!visible(c)) continue;
    const box = c.getBoundingClientRect();
    const items = lines(c);
    for (const it of items) {
      if (it.badge) continue;
      if (it.l < box.left - 0.5 || it.r > box.right + 0.5 || it.t < box.top - 0.5 || it.b > box.bottom + 0.5) {
        problems.push(`"${it.text}" leaves ${name(c)} (${Math.round(it.l - box.left)},${Math.round(it.r - box.right)})`);
      }
    }
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const x = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const y = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        // Text boxes are font content areas, taller than a tight line-height: only real stacking counts.
        if (x > 1 && y > 0.35 * Math.min(a.b - a.t, b.b - b.t)) problems.push(`"${a.text}" overlaps "${b.text}" in ${name(c)}`);
      }
    }
  }
  for (const b of document.querySelectorAll('.pcard a.btn, .pcard__more, .pcard__use, .addon__more, .sw, .step button, .est a.btn')) {
    if (!visible(b)) continue;
    const host = b.closest('.pcard, .addon, .est');
    const r = b.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    if (r.left < h.left - 0.5 || r.right > h.right + 0.5) problems.push(`button "${b.textContent.trim().slice(0, 24)}" leaves its ${name(host)}`);
    if (b.scrollWidth > b.clientWidth + 1) problems.push(`button "${b.textContent.trim().slice(0, 24)}" clips its label`);
  }
  for (const e of document.querySelectorAll('.pcard *, .controls *, .addon *, .est *')) {
    if (!visible(e)) continue;
    const cs = getComputedStyle(e);
    if (cs.overflow !== 'visible' && e.scrollWidth > e.clientWidth + 1 && !/^(INPUT|SELECT)$/.test(e.tagName) && !e.classList.contains('dg')) {
      problems.push(`${name(e)} clips its content (${e.scrollWidth} > ${e.clientWidth})`);
    }
  }
  const cards = [...document.querySelectorAll('.pcard')].filter(visible);
  const rects = cards.map((c) => c.getBoundingClientRect());
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const x = Math.min(rects[i].right, rects[j].right) - Math.max(rects[i].left, rects[j].left);
      const y = Math.min(rects[i].bottom, rects[j].bottom) - Math.max(rects[i].top, rects[j].top);
      if (x > 0.5 && y > 0.5) problems.push(`${cards[i].dataset.plan} card overlaps ${cards[j].dataset.plan} card`);
    }
  }
  // Cards in one visual row share their name, price and button positions (subgrid rows).
  const rows = new Map();
  cards.forEach((c, i) => {
    const key = Math.round(rects[i].top / 3);
    rows.set(key, [...(rows.get(key) ?? []), c]);
  });
  const misaligned = [];
  for (const row of rows.values()) {
    if (row.length < 2) continue;
    for (const sel of ['.pcard__name', '.pcard__price', '.pcard__cta', '.pcard__checks', '.pcard__use']) {
      const offsets = row.filter((c) => visible(c.querySelector(sel))).map((c) => c.querySelector(sel).getBoundingClientRect().top - c.getBoundingClientRect().top);
      if (offsets.length > 1 && Math.max(...offsets) - Math.min(...offsets) > 1.5) misaligned.push(sel);
    }
  }
  if (vw > 720 && misaligned.length) problems.push(`rows not aligned: ${[...new Set(misaligned)].join(', ')}`);
  const sameWidth = vw <= 720 ? new Set(rects.map((r) => Math.round(r.width))).size : 1;
  if (sameWidth > 1) problems.push('phone cards differ in width');
  const cta = [...document.querySelectorAll('.pcard a.btn')].map((b) => Math.round(b.getBoundingClientRect().height));
  return { problems, cards: cards.length, ctaHeights: cta };
};

// Text contrast comes from the shared foundation probe (./contrast.mjs). It skips text over gradients and images, so
// everything inside <main> (the light plan cards and add-on cards as much as the dark hero, Performance card, estimate
// panel and final CTA) is also measured on rendered pixels by `stageRuns` + `worstOverPixels`: every visible text run's
// box is read, all text is hidden, the page is screenshotted, and the worst contrast between the run's colour and any
// pixel under its box must still clear AA. A background swapped for a gradient cannot slip past the probe's skip.
const stageRuns = ({ scope = null } = {}) => {
  const hidden = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return true;
      if (n.hasAttribute('inert') || n.hasAttribute('data-decorative') || n.tagName === 'TEMPLATE') return true;
    }
    return false;
  };
  const opacityOf = (e) => {
    let o = 1;
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  };
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // The nav is transparent over the hero until the page scrolls; after that it is glass and the shared probe judges it.
  const stages = scope ? [document.querySelector(scope)] : [document.querySelector('main')].concat(document.documentElement.hasAttribute('data-scrolled') ? [] : [document.querySelector('.nav')]);
  const runs = [];
  const navBox = document.documentElement.hasAttribute('data-scrolled') ? document.querySelector('.nav')?.getBoundingClientRect() : null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const e = node.parentElement;
    if (!node.textContent.trim() || !e || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName) || hidden(e)) continue;
    if (!stages.some((s) => s?.contains(e))) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const cs = getComputedStyle(e);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const box = e.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1) continue; // visually-hidden text
    let color = cs.color;
    // Gradient text (the h1 and final CTA accent line): judge the darkest stop in the window the box shows.
    if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') {
      const shown = 100 / (parseFloat(cs.backgroundSize) || 100);
      const stops = [...cs.backgroundImage.matchAll(/(rgba?\([^)]*\))\s+([\d.]+)%/g)].map((m) => ({ c: m[1], at: parseFloat(m[2]) / 100, l: lum(m[1].match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)) }));
      const visible = stops.filter((s) => s.at <= shown + 0.001);
      if (visible.length) color = visible.sort((p, q) => p.l - q.l)[0].c;
      e.setAttribute('data-px-clip', '');
    }
    const opacity = opacityOf(e);
    for (const r of range.getClientRects()) {
      if (r.width < 2 || r.height < 2 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      // Skip text a fixed bar sits over: the shot would measure the bar, and the bar is judged on its own.
      const hit = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
      if (hit && !e.contains(hit) && !hit.contains(e)) continue;
      if (navBox && r.top < navBox.bottom && r.bottom > navBox.top && r.left < navBox.right && r.right > navBox.left) continue;
      // A punctuation-only glyph hidden from assistive tech (the "/" between EN and ES) is decoration, judged as a graphic at 3:1.
      const glyph = Boolean(e.closest('[aria-hidden="true"]')) && /^[^\p{L}\p{N}]+$/u.test(node.textContent.trim());
      runs.push({ text: node.textContent.trim().slice(0, 28), cls: String(e.className).slice(0, 28) || e.tagName, l: r.left, t: Math.max(0, r.top), w: r.width, h: Math.min(innerHeight, r.bottom) - Math.max(0, r.top), color, need: glyph ? 3 : large ? 3 : 4.5, opacity });
    }
  }
  return runs;
};

// Runs in the page: the screenshot (png, base64) holds the background with the text hidden.
const worstOverPixels = async ({ png, runs, scale }) => {
  const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => {
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = '#000';
    pctx.fillStyle = css;
    pctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const fails = [];
  let lowest = Infinity;
  let checked = 0;
  for (const run of runs) {
    const x = Math.max(0, Math.floor(run.l * scale));
    const y = Math.max(0, Math.floor(run.t * scale));
    const w = Math.min(bitmap.width - x, Math.ceil(run.w * scale));
    const h = Math.min(bitmap.height - y, Math.ceil(run.h * scale));
    if (w < 1 || h < 1) continue;
    checked++;
    const [fr, fg, fb, fa] = rgba(run.color);
    const a = fa * run.opacity;
    const data = ctx.getImageData(x, y, w, h).data;
    const ratios = [];
    for (let i = 0; i < data.length; i += 4) {
      const bgL = 0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]);
      const mix = (f, b) => f * a + b * (1 - a);
      const fgL = 0.2126 * lin(mix(fr, data[i])) + 0.7152 * lin(mix(fg, data[i + 1])) + 0.0722 * lin(mix(fb, data[i + 2]));
      ratios.push((Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05));
    }
    // The page has film grain: a stray speck is not the backdrop, so the 3rd percentile stands for the worst case.
    ratios.sort((p, q) => p - q);
    const worst = ratios[Math.floor(ratios.length * 0.03)];
    lowest = Math.min(lowest, worst);
    if (worst < run.need - 0.005) fails.push({ text: run.text, ratio: Number(worst.toFixed(2)), need: run.need, cls: run.cls, box: [run.l, run.t, run.w, run.h].map(Math.round).join(',') });
  }
  return { checked, lowest, fails: fails.slice(0, 8), failCount: fails.length };
};

// Touch targets: every real button, summary, control and standalone link is at least 44 by 44.
const readTargets = () => {
  const hidden = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    }
    return false;
  };
  const small = [];
  let checked = 0;
  for (const e of document.querySelectorAll('[data-pricing] a.btn, [data-pricing] button, [data-pricing] .seg__opt, [data-pricing] input[type="range"]')) {
    if (hidden(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    checked++;
    if (r.width < 44 || r.height < 44) small.push(`${(e.textContent || e.className).trim().slice(0, 28)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return { checked, small };
};

// Focus scrolls the page a frame or two after the key press; wait until it has stopped.
const scrolled = () =>
  new Promise((done) => {
    let last = -1;
    let still = 0;
    const tick = () => {
      if (window.scrollY === last) {
        if (++still >= 4) return done();
      } else {
        still = 0;
        last = window.scrollY;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

const describeFocus = () => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { end: true };
  window.__seen ??= new Set();
  if (window.__seen.has(e)) return { end: true, repeat: true };
  window.__seen.add(e);
  const wrapper = e.matches('input[type="radio"]') ? e.closest('label') : e.matches('input[type="range"]') ? e.closest('.range') : null;
  const target = wrapper ?? e;
  const r = target.getBoundingClientRect();
  const cs = getComputedStyle(target);
  const csFocus = getComputedStyle(e);
  const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
  const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
  const top = document.elementFromPoint(cx, cy);
  const ring = (c) => (parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== 'none') || (c.boxShadow && c.boxShadow !== 'none');
  // The radio and the range input are transparent: their own outline is never seen. The ring that counts is on the label, the
  // range wrapper, or (range) the knob's opaque spread ring.
  const knob = e.matches('input[type="range"]') ? wrapper?.querySelector('.range__knob') : null;
  const knobRing = knob ? /rgb\(\d+, \d+, \d+\) 0px 0px 0px [2-9]px/.test(getComputedStyle(knob).boxShadow) : false;
  return {
    end: false,
    name: (e.getAttribute('aria-label') || e.textContent || e.name || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
    tag: e.tagName.toLowerCase(),
    inMain: Boolean(e.closest('main')),
    visible: r.width > 0 && r.height > 0 && cs.visibility === 'visible' && (wrapper ? true : parseFloat(cs.opacity) > 0),
    // Chrome snaps a focus scroll to whole device pixels; with fractional layout it can leave about a pixel of a control past the edge.
    inViewport: r.top >= -2 && r.bottom <= innerHeight + 2,
    obscured: !(top && (target.contains(top) || top.contains(target))),
    ariaHidden: Boolean(e.closest('[aria-hidden="true"], [inert]')),
    ring: wrapper ? ring(cs) || knobRing : ring(cs) || ring(csFocus),
  };
};

// ---------------------------------------------------------------- driver
export async function pricingChecks({ browser, server, outDir, check, metrics, sleep, checksOnly }) {
  const out = (metrics.pricing = {});

  async function open(path, opts = {}) {
    const { width = 1280, height = 900, scheme = 'light', reduced = true, mobile = false, tz = 'America/New_York', js = true, noBundle = false } = opts;
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: scheme,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      deviceScaleFactor: 1,
      hasTouch: mobile,
      isMobile: mobile,
      timezoneId: tz,
      javaScriptEnabled: js,
    });
    // noBundle: JavaScript is on but the pricing script never arrives (blocked, CDN failure): the page must fall back.
    if (noBundle) await context.route('**/_astro/PricingPage.astro_astro_type_script_*.js', (route) => route.abort());
    const page = await context.newPage();
    page.problems = [];
    page.on('console', (m) => {
      if (m.type() === 'error') page.problems.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => page.problems.push(`requestfailed: ${r.url()}`));
    page.on('response', (r) => {
      if (r.status() >= 400) page.problems.push(`${r.status()}: ${r.url()}`);
    });
    await page.goto(server.url + path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    // The inline failsafe fires at 2.5 s; wait past it and let the checks read what it left behind.
    if (noBundle) await page.waitForTimeout(3200);
    else if (js) await page.waitForSelector('[data-pricing][data-ready]', { state: 'attached', timeout: 4000 });
    return page;
  }

  const setState = async (page, billing, n) => {
    await page.locator('input[data-athletes]').fill(String(athleteBands.indexOf(n)));
    await page.locator(`label.seg__opt:has(input[value="${billing}"])`).click();
  };
  const scrollTop = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  // The page uses smooth scrolling and reveal-on-scroll, so step slowly and jump instantly, then let the entrances end.
  const settle = async (page) => {
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await page.waitForFunction(() => [...document.querySelectorAll('.pricing .rv')].every((e) => parseFloat(getComputedStyle(e).opacity) > 0.99), null, { timeout: 4000 }).catch(() => {});
    await sleep(300);
  };
  const close = (page) => page.context().close();
  const run = (group) => !onlyGroup || onlyGroup === group;

  // ------------------------------------------------------------ 1. the price table and the copy against the oracle
  if (run('data')) {
    const bad = tableProblems(table);
    check('pricing/data', 'price table matches the epic and DECISIONS oracle (both regions, annual, yearly, education, add-ons, Free, annual percentage)', bad.length === 0, bad.join('; '));
    const copyBad = copyProblems({ en, es });
    check('pricing/data', 'copy holds words and {tokens}, never numbers or amounts; en and es use the same tokens', copyBad.length === 0, copyBad.slice(0, 4).join('; '));
  }

  // ------------------------------------------------------------ 2. region detection
  if (run('region')) {
    // Data-driven: every zone in the tz database maps to the region its country belongs to.
    const latamCountries = new Set(
      'MX BZ CR SV GT HN NI PA AR BO BR CL CO EC GY PY PE SR UY VE GF CU DO HT JM BS BB TT CW AW BQ SX MF MQ GP BL TC KY AG DM GD KN LC VC AI MS VG'.split(' '),
    );
    const tab = '/usr/share/zoneinfo/zone.tab';
    if (existsSync(tab)) {
      const wrong = [];
      let n = 0;
      for (const line of readFileSync(tab, 'utf8').split('\n')) {
        if (!line || line.startsWith('#')) continue;
        const [cc, , tz] = line.split('\t');
        n++;
        const want = latamCountries.has(cc) ? 'latam' : 'us';
        if (regionFromTimeZone(tz) !== want) wrong.push(`${tz} (${cc}) is ${regionFromTimeZone(tz)}, want ${want}`);
      }
      check('pricing/region', `every zone in zone.tab (${n}) maps to its country's region`, wrong.length === 0, wrong.slice(0, 6).join('; '));
    } else {
      check('pricing/region', 'zone.tab present on this host', true, 'skipped: no /usr/share/zoneinfo/zone.tab');
    }
    const aliases = ['America/Buenos_Aires', 'America/Cordoba', 'America/Rosario', 'America/Porto_Acre', 'America/Catamarca', 'America/Mendoza', 'America/Jujuy'];
    check('pricing/region', 'legacy Argentina and Brazil aliases are LatAm', aliases.every((z) => regionFromTimeZone(z) === 'latam'));
    const usZones = ['America/Puerto_Rico', 'America/St_Thomas', 'America/Virgin', 'America/New_York', 'America/Los_Angeles', 'America/Toronto', 'Europe/Madrid', 'Atlantic/Bermuda', 'UTC', 'Etc/UTC', 'Atlantic/Stanley', '', undefined, null, 'Not/AZone'];
    check('pricing/region', 'Puerto Rico, US, Canada, Europe, UTC and unknown or missing zones are US', usZones.every((z) => regionFromTimeZone(z) === 'us'));

    const cases = [
      ['America/Costa_Rica', 'latam'], ['America/Mexico_City', 'latam'], ['America/Bogota', 'latam'], ['America/Sao_Paulo', 'latam'],
      ['America/Argentina/Buenos_Aires', 'latam'], ['America/Santiago', 'latam'], ['America/Lima', 'latam'], ['America/Santo_Domingo', 'latam'],
      ['America/Puerto_Rico', 'us'], ['America/New_York', 'us'], ['America/Los_Angeles', 'us'], ['Europe/Madrid', 'us'], ['UTC', 'us'], ['America/Toronto', 'us'],
    ];
    const rendered = [];
    for (const [tz, region] of cases) {
      const page = await open(paths.en, { tz });
      const s = await page.evaluate(readState);
      const want = ORACLE[region][100];
      const ok = s.region === region && s.core === fmt(want[1]) && s.performance === fmt(want[2]);
      rendered.push({ tz, ok, got: `${s.region} ${s.core}/${s.performance}` });
      await close(page);
    }
    check('pricing/region', `browser time zone picks the region on the page (${cases.length} zones, Core/Performance shown)`, rendered.every((r) => r.ok), rendered.filter((r) => !r.ok).map((r) => `${r.tz}: ${r.got}`).join('; '));

    let page = await open(`${paths.en}?region=latam`, { tz: 'America/New_York' });
    let s = await page.evaluate(readState);
    check('pricing/region', '?region=latam overrides a US time zone', s.region === 'latam' && s.core === '$129', `${s.region} ${s.core}`);
    await close(page);
    page = await open(`${paths.es}?region=us`, { tz: 'America/Mexico_City' });
    s = await page.evaluate(readState);
    check('pricing/region', '?region=us overrides a LatAm time zone (Spanish page)', s.region === 'us' && s.core === '$199', `${s.region} ${s.core}`);
    await close(page);
    page = await open(`${paths.en}?region=mars`, { tz: 'America/Bogota' });
    s = await page.evaluate(readState);
    check('pricing/region', 'an unknown ?region value is ignored and the time zone decides', s.region === 'latam', s.region);
    await close(page);
  }

  // ------------------------------------------------------------ 3. rendered prices: region x billing x athletes x language
  if (run('prices')) {
    const wrong = [];
    const addonWrong = [];
    const freeWrong = [];
    let n = 0;
    let isolation = 0;
    for (const locale of ['en', 'es']) {
      for (const region of ['us', 'latam']) {
        const page = await open(`${paths[locale]}?region=${region}`);
        const other = region === 'us' ? 'latam' : 'us';
        const foreign = [...everyAmount(other)].filter((v) => !everyAmount(region).has(v) && !sharedAmounts.has(v));
        for (const billing of ['monthly', 'annual']) {
          for (const size of sizes) {
            await setState(page, billing, size);
            const got = await page.evaluate(readState);
            const want = expectedState(region, billing, size, locale);
            n++;
            const tag = `${locale}/${region}/${billing}/${size}`;
            for (const key of ['core', 'performance', 'coreMeta', 'performanceMeta', 'coreBilled', 'performanceBilled', 'schools']) {
              if (got[key] !== want[key]) wrong.push(`${tag} ${key}: "${got[key]}" want "${want[key]}"`);
            }
            if (got.edu.join() !== want.edu.join()) wrong.push(`${tag} education ${got.edu}`);
            if (got.extra.length !== 2 || got.extra.some((e) => e !== want.extra)) wrong.push(`${tag} extra coach ${got.extra}`);
            // Add-ons: every amount read where it shows. Monthly and setup are told apart by their marker and by the
            // words beside them, in the strip and in the More info panel, so swapping or editing one of them fails here.
            for (const where of ['brandedStrip', 'brandedPanel']) {
              const g = got[where];
              const read = brandedFromText(g.line ?? '');
              if (g.monthly !== fmt(BRANDED.monthly)) addonWrong.push(`${tag} ${where} monthly fee is "${g.monthly}", want ${fmt(BRANDED.monthly)}`);
              if (g.setup !== fmt(BRANDED.setup)) addonWrong.push(`${tag} ${where} setup fee is "${g.setup}", want ${fmt(BRANDED.setup)}`);
              if (read.monthly !== fmt(BRANDED.monthly)) addonWrong.push(`${tag} ${where} shows "${read.monthly}" per month, want ${fmt(BRANDED.monthly)} ("${g.line}")`);
              if (read.setup !== fmt(BRANDED.setup)) addonWrong.push(`${tag} ${where} shows "${read.setup}" as setup, want ${fmt(BRANDED.setup)} ("${g.line}")`);
            }
            if (got.extraStrip !== want.extra) addonWrong.push(`${tag} extra coach in the strip is "${got.extraStrip}", want ${want.extra}`);
            if (got.extraPanel !== want.extra) addonWrong.push(`${tag} extra coach in the More info panel is "${got.extraPanel}", want ${want.extra}`);
            const freeWant = fill(copyFor[locale].plans.free.line, { coaches: String(FREE.coaches), athletes: String(FREE.athletes) });
            if (got.freePrice !== fmt(FREE.monthly) || got.freeLine !== freeWant) freeWrong.push(`${tag} Free card "${got.freePrice}" / "${got.freeLine}", want ${fmt(FREE.monthly)} / "${freeWant}"`);
            if (got.saves !== fill(copyFor[locale].controls.annualSaves, { percent: String(ANNUAL_PERCENT) })) freeWrong.push(`${tag} annual saving reads "${got.saves}"`);
            if (got.region !== region || got.billing !== billing || got.athletes !== String(size)) wrong.push(`${tag} data-* is ${got.region}/${got.billing}/${got.athletes}`);
            const stray = got.amounts.filter((a) => !want.allowed.has(a));
            if (stray.length) wrong.push(`${tag} unexpected dollar amounts in the DOM: ${[...new Set(stray)]}`);
            if (got.amounts.some((a) => foreign.includes(a))) isolation++;
          }
        }
        await close(page);
      }
    }
    check('pricing/prices', `Core and Performance price, meta, billed line, Schools from, education, extra coach (${n} states: en/es x us/latam x monthly/annual x 6 sizes)`, wrong.length === 0, wrong.slice(0, 4).join('; '));
    check('pricing/addons', `custom-branded app: ${fmt(BRANDED.monthly)} is the monthly fee and ${fmt(BRANDED.setup)} the setup fee, each at its own place in the strip and the More info panel (marker and wording; ${n} states: en/es x us/latam x monthly/annual x 6 sizes)`, addonWrong.length === 0, addonWrong.slice(0, 3).join('; '));
    check('pricing/addons', `extra coach: the price in the strip and in the More info panel is ${fmt(EXTRA_COACH.us)} (US) or ${fmt(EXTRA_COACH.latam)} (LatAm), both places, every state`, addonWrong.every((w) => !/extra coach/.test(w)) && wrong.every((w) => !/extra coach/.test(w)));
    check('pricing/prices', `Free card shows ${fmt(FREE.monthly)} with ${FREE.coaches} coach and ${FREE.athletes} athletes, and the annual saving reads ${ANNUAL_PERCENT}%, from the table in every state`, freeWrong.length === 0, freeWrong.slice(0, 3).join('; '));
    check('pricing/prices', 'no dollar amount outside the current state is anywhere in the DOM, closed panels and the estimate included', wrong.every((w) => !/unexpected dollar/.test(w)));
    check('pricing/prices', "the other region's exclusive amounts never appear", isolation === 0, `${isolation} states`);
    const annualBad = ['us', 'latam'].flatMap((r) => table.bands[r].flatMap((b) => [b.core, b.performance].filter((p) => p.annualMonthly !== annual(p.monthly) || p.annualYearly !== annual(p.monthly) * 12).map((p) => `${r} ${b.athletes}: ${p.monthly} -> ${p.annualMonthly}/${p.annualYearly}`)));
    check('pricing/prices', `annual is ${ANNUAL_PERCENT}% off rounded down per month; the yearly total is that times 12 (every band in the table)`, annualBad.length === 0, annualBad.slice(0, 3).join('; '));
  }

  // ------------------------------------------------------------ 4. keyboard, announcements, motion
  if (run('behaviour')) {
    const page = await open(paths.en, { reduced: false });
    const idle = await page.evaluate(() => ({ live: document.querySelector('[data-live]').textContent, rolling: document.querySelectorAll('.is-rolling').length }));
    check('pricing/behaviour', 'nothing is announced and nothing rolls on first load', idle.live === '' && idle.rolling === 0, JSON.stringify(idle));

    await page.focus('input[data-billing][value="monthly"]');
    await page.keyboard.press('ArrowRight');
    let s = await page.evaluate(readState);
    check('pricing/behaviour', 'arrow keys move the billing radios and the prices follow', s.billing === 'annual' && s.core === '$179', `${s.billing} ${s.core}`);
    const rolling = await page.evaluate(() => document.querySelectorAll('.is-rolling').length);
    check('pricing/behaviour', 'prices roll on a user change (motion on)', rolling >= 2, `${rolling} rolling`);
    check('pricing/behaviour', 'the live region announces both plans after a change', /Core.*179/.test(s.live ?? '') && /Performance.*269/.test(s.live ?? ''), s.live);
    await page.waitForFunction(() => document.querySelectorAll('.is-rolling').length === 0, null, { timeout: 2500 }).catch(() => {});
    check('pricing/behaviour', 'the roll animation clears itself', (await page.evaluate(() => document.querySelectorAll('.is-rolling, .odo-on').length)) === 0);
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'after the roll the price is plain text again (no leftover digit wheels)', s.core === '$179', s.core);
    await page.keyboard.press('ArrowLeft');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'ArrowLeft returns to monthly', s.billing === 'monthly' && s.core === '$199', `${s.billing} ${s.core}`);

    await page.focus('input[data-athletes]');
    await page.keyboard.press('ArrowRight');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'the roster slider works from the keyboard (ArrowRight: 100 to 250)', s.athletes === '250' && s.core === '$349' && s.performance === '$529', `${s.athletes} ${s.core}`);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'ArrowLeft twice goes from 250 to 50', s.athletes === '50' && s.core === '$129', `${s.athletes} ${s.core}`);
    await page.keyboard.press('End');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'End goes to 1,000 athletes', s.athletes === '1000' && s.core === '$799', `${s.athletes} ${s.core}`);
    await page.keyboard.press('Home');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'Home goes to 25 athletes', s.athletes === '25' && s.core === '$79', `${s.athletes} ${s.core}`);
    const spoken = await page.evaluate(() => document.querySelector('input[data-athletes]').getAttribute('aria-valuetext'));
    check('pricing/behaviour', 'the slider speaks the roster, not just the step number', /25/.test(spoken ?? '') && /2/.test(spoken ?? ''), spoken);

    await page.focus('input[data-billing]:checked');
    await page.keyboard.press('Tab');
    const afterRadio = await page.evaluate(() => document.activeElement.matches('input[data-athletes]'));
    check('pricing/behaviour', 'Tab goes from the billing radios to the roster slider', afterRadio);
    const order = [];
    for (let i = 0; i < 11; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => `${document.activeElement.tagName[0]}:${document.activeElement.getAttribute('aria-describedby') ?? document.activeElement.getAttribute('aria-controls')}`));
    }
    check('pricing/behaviour', 'Tab then visits each plan card in order: its button, "Use this plan", with the education rates button before Schools "Use this plan"', order.join() === 'A:plan-free,B:plan-free,A:plan-core,B:plan-core,A:plan-performance,B:plan-performance,A:plan-schools,B:education-rates,B:plan-schools,A:plan-federations,B:plan-federations', order.join());
    await close(page);

    const calm = await open(paths.en, { reduced: true });
    await setState(calm, 'annual', 250);
    const still = await calm.evaluate(() => ({
      rolling: document.querySelectorAll('.is-rolling, .odo-on').length,
      iris: getComputedStyle(document.querySelector('.pcard--performance'), '::before').animationName,
      spot: getComputedStyle(document.querySelector('.pcard--core'), '::after').display,
      core: document.querySelector('[data-amount="core"]').textContent.trim(),
    }));
    check('pricing/behaviour', 'reduced motion: prices change at once with no digit wheels, the iris border does not spin, the spotlight is off', still.rolling === 0 && still.iris === 'none' && still.spot === 'none' && still.core === '$314', JSON.stringify(still));
    await close(calm);

    const reveal = await open(paths.en, { reduced: false });
    await settle(reveal);
    const revealed = await reveal.evaluate(() => [...document.querySelectorAll('.pricing .rv')].map((e) => parseFloat(getComputedStyle(e).opacity)));
    check('pricing/behaviour', 'reveal-on-scroll: every entrance ends fully visible after scrolling through', revealed.length >= 10 && revealed.every((o) => o > 0.99), `${revealed.filter((o) => o <= 0.99).length} of ${revealed.length} left hidden`);
    await close(reveal);
  }

  // ------------------------------------------------------------ 5. "More info" and FAQ reveals: buttons that open a panel in place
  // Not dialogs: nothing traps focus or locks scroll. Each button owns one panel, toggles it on Enter, Space and click,
  // keeps focus, and never changes another panel.
  const reveals = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-reveal-btn]')].map((b) => {
        const p = document.getElementById(b.getAttribute('aria-controls'));
        const cs = getComputedStyle(p);
        const r = p.getBoundingClientRect();
        return { id: p.id, expanded: b.getAttribute('aria-expanded'), shown: cs.visibility !== 'hidden' && r.height > 4, hidden: cs.visibility === 'hidden', inside: r.left >= -0.5 && r.right <= innerWidth + 0.5 };
      }),
    );
  const settleReveals = (page) => page.evaluate(() => Promise.allSettled(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)));
  // Pixel contrast over rendered pixels: hide all text, screenshot, and judge every text run against the pixels under it.
  // Full scroll in viewport steps, or one scope (the estimate panel) centred in the viewport.
  // `under` scrolls the scope so its top sits that many px from the viewport top: directly below the fixed bar, in its shadow.
  const stagePixels = async (page, scope = null, under = null) => {
    await page.addStyleTag({ content: 'html.px-hide *, html.px-hide *::before, html.px-hide *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } html.px-hide [data-px-clip] { background-image: none !important; }' });
    // Posters and lazy images must be painted, or a stage reads as white.
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      await Promise.all([...document.querySelectorAll('video[poster], img')].map((n) => {
        const i = new Image();
        i.src = n.poster || n.currentSrc || n.src;
        return i.decode().catch(() => {});
      }));
    });
    const { height } = page.viewportSize();
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const tops = scope ? [0] : Array.from({ length: Math.ceil(total / (height * 0.8)) }, (_, i) => Math.round(i * height * 0.8));
    const sum = { checked: 0, lowest: Infinity, fails: [], failCount: 0 };
    for (const top of tops) {
      if (scope && under !== null) await page.evaluate(({ s, y }) => window.scrollBy({ top: document.querySelector(s).getBoundingClientRect().top - y, behavior: 'instant' }), { s: scope, y: under });
      else if (scope) await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center', behavior: 'instant' }), scope);
      else await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
      await page.waitForFunction(() => [...document.querySelectorAll('.pricing .rv')].every((e) => e.getBoundingClientRect().top > innerHeight || parseFloat(getComputedStyle(e).opacity) > 0.99), null, { timeout: 4000 });
      await settleReveals(page);
      await sleep(150);
      const runs = await page.evaluate(stageRuns, { scope });
      await page.evaluate(() => document.documentElement.classList.add('px-hide'));
      const png = (await page.screenshot()).toString('base64');
      await page.evaluate(() => document.documentElement.classList.remove('px-hide'));
      const r = await page.evaluate(worstOverPixels, { png, runs, scale: 1 });
      sum.checked += r.checked;
      sum.lowest = Math.min(sum.lowest, r.lowest);
      sum.failCount += r.failCount;
      sum.fails.push(...r.fails.map((f) => ({ ...f, at: top })));
    }
    sum.fails = sum.fails.slice(0, 8);
    return sum;
  };
  if (run('reveals')) {
    for (const [label, width, height, mobile] of [['1280', 1280, 900, false], ['390', 390, 844, true]]) {
      const bad = [];
      const page = await open(`${paths.en}?region=latam`, { width, height, mobile });
      const start = await reveals(page);
      if (start.length !== 11) bad.push(`${start.length} reveal buttons, want 11`);
      for (const r of start) {
        if (r.expanded !== 'false' || r.shown || !r.hidden) bad.push(`${r.id}: not collapsed and hidden at start`);
      }
      const dialogs = await page.locator('dialog').count();
      if (dialogs) bad.push(`${dialogs} <dialog> on the page`);
      const buttons = page.locator('[data-reveal-btn]');
      const n = await buttons.count();
      for (let i = 0; i < n; i++) {
        const btn = buttons.nth(i);
        const id = await btn.getAttribute('aria-controls');
        await btn.scrollIntoViewIfNeeded();
        await btn.focus();
        await page.keyboard.press('Enter');
        await settleReveals(page);
        let now = (await reveals(page)).find((r) => r.id === id);
        if (now.expanded !== 'true' || !now.shown || !now.inside) bad.push(`${id}: Enter does not open it (${JSON.stringify(now)})`);
        if (!(await btn.evaluate((b) => b === document.activeElement))) bad.push(`${id}: focus left the button on open`);
        const others = (await reveals(page)).filter((r) => r.id !== id && r.expanded === 'true');
        if (others.length) bad.push(`${id}: opening it also opened ${others.map((o) => o.id)}`);
        if (await page.evaluate(() => getComputedStyle(document.documentElement).overflow === 'hidden')) bad.push(`${id}: the page scroll is locked`);
        await page.keyboard.press('Space');
        await settleReveals(page);
        now = (await reveals(page)).find((r) => r.id === id);
        if (now.expanded !== 'false' || now.shown) bad.push(`${id}: Space does not close it`);
        if (!(await btn.evaluate((b) => b === document.activeElement))) bad.push(`${id}: focus left the button on close`);
        await btn.click();
        await settleReveals(page);
        now = (await reveals(page)).find((r) => r.id === id);
        if (now.expanded !== 'true' || !now.shown) bad.push(`${id}: a click does not open it`);
        await btn.click();
        await settleReveals(page);
        now = (await reveals(page)).find((r) => r.id === id);
        if (now.expanded !== 'false' || now.shown) bad.push(`${id}: a second click does not close it`);
      }
      check('pricing/reveals', `${label}px: all 11 "More info" and FAQ buttons start collapsed and open and close on Enter, Space and click, keep focus, move the page scroll lock nowhere, and open no other panel`, bad.length === 0, bad.slice(0, 4).join('; '));
      check('pricing/reveals', `${label}px: the page stayed clean (no console errors)`, page.problems.length === 0, page.problems.slice(0, 2).join('; '));
      await close(page);
    }
  }

  // ------------------------------------------------------------ 5b. reveals stay in step with their buttons under any order of toggling
  // The old dialogs had a reviewed race (close, move on, press Enter, the first one reopened). Reveals have no event
  // queue to race with, but a handler that keeps its own state could still drift from the DOM, so: a seeded random
  // walk over all 11 buttons, mouse and keyboard mixed, checking after every step against a model of what should be open.
  if (run('reveals')) {
    const bad = [];
    const page = await open(`${paths.en}?region=latam`, { reduced: false });
    const buttons = page.locator('[data-reveal-btn]');
    const n = await buttons.count();
    const model = new Array(n).fill(false);
    let seed = 20240601;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const steps = 160;
    for (let step = 0; step < steps; step++) {
      const i = Math.floor(rand() * n);
      const btn = buttons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      if (rand() < 0.5) await btn.click();
      else {
        await btn.focus();
        await page.keyboard.press(rand() < 0.5 ? 'Enter' : 'Space');
      }
      model[i] = !model[i];
      if (step % 8 === 7 || step === steps - 1) {
        await settleReveals(page);
        const now = await reveals(page);
        now.forEach((r, k) => {
          if ((r.expanded === 'true') !== model[k]) bad.push(`step ${step}: ${r.id} aria-expanded=${r.expanded}, want ${model[k]}`);
          if (r.shown !== model[k]) bad.push(`step ${step}: ${r.id} is ${r.shown ? 'shown' : 'hidden'}, want ${model[k] ? 'shown' : 'hidden'}`);
        });
      }
    }
    out.revealSteps = steps;
    check('pricing/reveals', `${steps} random toggles over the 11 reveal buttons (click, Enter, Space) leave every panel and aria-expanded matching the model`, bad.length === 0, bad.slice(0, 3).join('; '));
    check('pricing/reveals', 'the random walk stayed clean (no console errors)', page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);
  }

  // ------------------------------------------------------------ 5c. the live estimate (its own file: the math, the limits, the motion)
  if (run('estimate')) await estimateChecks({ open, close, check, sleep, out });

  // ------------------------------------------------------------ 5c2. the motion: the odometer in the accessibility tree, the estimate loop, the iris ring
  if (run('motion')) await motionChecks({ open, close, check, sleep, out });

  // ------------------------------------------------------------ 5d. fallback: JavaScript on, pricing script never arrives
  if (run('fallback')) {
    for (const [label, width, height, mobile] of [['1280', 1280, 900, false], ['390', 390, 844, true]]) {
      const bad = [];
      const page = await open(`${paths.en}?region=latam`, { width, height, mobile, noBundle: true });
      // Browser time zone is US and the URL asks for LatAm: the fallback must still show one consistent state (US, monthly, 100 athletes).
      const got = await page.evaluate(readState);
      const want = expectedState('us', 'monthly', DEFAULT_BAND, 'en');
      if (!got.fallback) bad.push('data-fallback is not set');
      if (got.ready) bad.push('data-ready is set although the script never ran');
      for (const key of ['core', 'performance', 'coreMeta', 'performanceMeta', 'coreBilled', 'performanceBilled', 'schools']) {
        if (got[key] !== want[key]) bad.push(`${key}: "${got[key]}" want "${want[key]}"`);
      }
      if (got.edu.join() !== want.edu.join()) bad.push(`education ${got.edu}`);
      const view = await page.evaluate(() => {
        const shown = (sel) => {
          const e = document.querySelector(sel);
          if (!e) return false;
          const r = e.getBoundingClientRect();
          return getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && r.width > 0 && r.height > 0;
        };
        return {
          controls: shown('.controls'),
          selector: shown('input[data-athletes]'),
          segmented: shown('.seg'),
          note: shown('.controls-note'),
          noteText: document.querySelector('.controls-note')?.textContent.trim() ?? '',
          triggers: [...document.querySelectorAll('[data-reveal-btn], .sw, .step button, .pcard__use')].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length,
          estimate: shown('.est'),
          panelsOpen: [...document.querySelectorAll('.reveal')].filter((p) => getComputedStyle(p).visibility !== 'hidden' && p.getBoundingClientRect().height > 4).length,
          panels: document.querySelectorAll('.reveal').length,
          faqText: [...document.querySelectorAll('.faq__static')].filter((e) => e.getBoundingClientRect().height > 0 && e.textContent.trim().length > 8).length,
          brandedFee: document.querySelector('#addon-branded-app [data-price="branded-monthly"]')?.textContent.trim(),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5,
        };
      });
      if (view.controls || view.selector || view.segmented) bad.push('the controls are still on screen');
      if (!view.note) bad.push('the US/monthly/100-athletes note is not shown');
      const noteWant = fill(en.controls.noScript, { athletes: String(DEFAULT_BAND) });
      if (view.noteText !== noteWant) bad.push(`note reads "${view.noteText}", want "${noteWant}"`);
      if (view.triggers) bad.push(`${view.triggers} button(s) that would do nothing are still on screen`);
      if (view.estimate) bad.push('the live estimate is on screen with no script to drive it');
      if (view.panelsOpen !== view.panels || view.panels !== 11) bad.push(`More info and FAQ content is not inline (${view.panelsOpen} of ${view.panels} panels, want 11)`);
      if (view.faqText !== 7) bad.push(`${view.faqText} of 7 FAQ questions show as plain text`);
      if (view.brandedFee !== fmt(BRANDED.monthly)) bad.push(`inline branded fee "${view.brandedFee}"`);
      // Tab through the page: every stop is on screen, and none is a control the fallback hides.
      await page.evaluate(() => document.activeElement?.blur());
      const stops = [];
      for (let i = 0; i < 120; i++) {
        await page.keyboard.press('Tab');
        const st = await page.evaluate(describeFocus);
        if (st.end) break;
        stops.push(st);
      }
      for (const st of stops) {
        if (!st.visible || st.ariaHidden) bad.push(`Tab reaches "${st.name}", which is not visible`);
        if (st.tag === 'input' || /^(More info|Más información|Use this plan)/.test(st.name) || /^(Monthly|Annual|Mensual|Anual)/.test(st.name)) bad.push(`Tab reaches "${st.name}", a control the fallback hides`);
      }
      if (stops.length < 10) bad.push(`the Tab walk ended after ${stops.length} stops`);
      if (view.overflow) bad.push('the page scrolls sideways');
      // Nothing can move the state, so nothing can contradict it: force the events a control would send.
      await page.evaluate(() => {
        const range = document.querySelector('input[data-athletes]');
        range.value = '0';
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
        const radio = document.querySelector('input[data-billing][value="annual"]');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const forced = await page.evaluate(readState);
      for (const key of ['core', 'performance', 'coreMeta', 'coreBilled', 'performanceBilled']) {
        if (forced[key] !== want[key]) bad.push(`after a forced change ${key} became "${forced[key]}"`);
      }
      check('pricing/fallback', `${label}px: script blocked -> after the failsafe the page shows one honest state (US, monthly, ${DEFAULT_BAND} athletes: ${want.core} / ${want.performance}), hides the controls, the estimate and every button that would do nothing, shows the note, the More info and FAQ content inline, and the Tab walk reaches nothing hidden`, bad.length === 0, bad.slice(0, 4).join('; '));
      await close(page);
    }
  }

  // ------------------------------------------------------------ 6. layout: no overflow, no overlap
  if (run('layout')) {
    const worstCoreCta = {};
    for (const width of [390, 1024, 1280, 1440]) {
      const bad = [];
      let loaded = 0;
      for (const locale of ['en', 'es']) {
        for (const region of ['us', 'latam']) {
          const page = await open(`${paths[locale]}?region=${region}`, { width, height: width < 500 ? 844 : 900, mobile: width < 500 });
          for (const [billing, size] of [['monthly', 100], ['annual', 1000]]) {
            await setState(page, billing, size);
            await sleep(60);
            const r = await page.evaluate(readLayout);
            loaded++;
            if (r.cards !== 5) bad.push(`${locale}/${region}/${billing}/${size}: ${r.cards} cards`);
            for (const p of r.problems) bad.push(`${locale}/${region}/${billing}/${size}: ${p}`);
            worstCoreCta[`${locale}-${width}`] = Math.max(...r.ctaHeights, worstCoreCta[`${locale}-${width}`] ?? 0);
          }
          await close(page);
        }
      }
      check('pricing/layout', `${width}px: no overflow or overlap in cards, controls and add-ons, rows aligned (${loaded} states, en/es x us/latam x default/annual-1000)`, bad.length === 0, bad.slice(0, 4).join('; '));
    }
    out.tallestCta = worstCoreCta;
  }

  // ------------------------------------------------------------ 7. contrast, touch targets, tab order, alt text
  if (run('contrast')) {
    for (const [width, mobile] of [[1440, false], [390, true]]) {
      for (const scheme of ['light', 'dark']) {
        for (const locale of ['en', 'es']) {
          const page = await open(`${paths[locale]}?region=latam`, { width, height: mobile ? 844 : 900, scheme, mobile });
          const rows = [];
          const run = async (state, pixels = null) => {
            const c = await page.evaluate(contrastProbe, { includeAriaHidden: true });
            // The Monthly/Annual labels sit on a sliding thumb the page probe cannot see; the pixel pass judges them.
            const fails = c.fails.filter((f) => !/seg__txt/.test(f.cls));
            rows.push({ state, ...c, fails, failCount: c.failCount - (c.fails.length - fails.length) });
            for (const scope of pixels === null ? [] : [].concat(pixels)) {
              const p = await stagePixels(page, scope || null);
              rows.push({ state: `${state}, pixels${scope ? ` of ${scope}` : ''}`, checked: p.checked, min: p.lowest, fails: p.fails, failCount: p.failCount, skippedImage: 0 });
            }
          };
          await run('default', '');
          await setState(page, 'annual', 1000);
          await run('annual 1000', ['', '.seg']);
          await page.locator('.faq__q').first().click();
          await settleReveals(page);
          await run('faq open');
          for (const id of ['addon-extra-coach', 'addon-branded-app', 'addon-credits', 'education-rates']) {
            await page.locator(`[data-reveal-btn][aria-controls="${id}"]`).first().click();
            await settleReveals(page);
            await run(id);
          }
          // Every other "More info" and FAQ panel open too, so the light cards carry their longest content.
          const closed = page.locator('[data-reveal-btn][aria-expanded="false"]');
          while ((await closed.count()) > 0) {
            await closed.first().click();
            await settleReveals(page);
          }
          await run('every reveal open');
          // Estimate with everything on: the coach row, the app row, the credits row and the setup line all show.
          await page.locator('.sw[data-sw="coach"]').click();
          await page.locator('.sw[data-sw="app"]').click();
          await page.locator('.sw[data-sw="ai"]').click();
          await page.locator('[data-step="1"]').click();
          await page.waitForFunction(() => document.querySelectorAll('.is-rolling').length === 0, null, { timeout: 2500 }).catch(() => {});
          await run('estimate with every add-on', '.est');
          for (const plan of ['free', 'performance', 'schools', 'federations']) {
            await page.locator(`.pcard__use[data-use="${plan}"]`).click();
            await page.waitForFunction(() => document.querySelectorAll('.is-rolling').length === 0, null, { timeout: 2500 }).catch(() => {});
            await run(`estimate ${plan}`, '.est');
          }
          // The selected plan card changes its own look: scan the whole page once more with every panel open and Federations chosen.
          await run('every reveal open, Federations chosen', '');
          const isPixels = (r) => r.state.includes(', pixels');
          const failing = rows.filter((r) => r.failCount > 0);
          const checkedTotal = rows.reduce((a, r) => a + r.checked, 0);
          const min = Math.min(...rows.filter(isPixels).map((r) => r.min));
          check('pricing/contrast', `${scheme}/${locale}/${width}: text meets WCAG AA in ${rows.length} measurements (page probe in ${rows.filter((r) => !isPixels(r)).length} states, rendered pixels under every text run in ${rows.filter(isPixels).length} full-page and panel scans, light cards included; ${checkedTotal} text runs, lowest on pixels ${min.toFixed(2)}:1)`, failing.length === 0 && checkedTotal > 400, failing.map((r) => `${r.state}: ${r.fails.map((f) => `"${f.text}" ${f.ratio.toFixed(2)} (${f.cls}${f.box ? ` box ${f.box} scrollY ${f.at}` : ''})`).join(', ')}`).slice(0, 2).join(' | '));
          out[`contrastSkipped-${scheme}-${locale}-${width}`] = rows.reduce((a, r) => Math.max(a, r.skippedImage), 0);
          out[`contrastMin-${scheme}-${locale}-${width}`] = Number(min.toFixed(2));
          await close(page);
        }
      }
    }

    // The fixed bar throws a shadow on whatever rests just below it, and that text stays there once scrolling stops. Park a
    // known text block 70px from the top (the bar ends at 68px or less), screenshot the composited page and judge the text
    // against those pixels. A shadow restyle that darkens the area below the bar fails this, which the full-page scans may miss.
    for (const [width, mobile] of [[1440, false], [390, true]]) {
      for (const scheme of ['light', 'dark']) {
        const page = await open(`${paths.en}?region=us`, { width, height: mobile ? 844 : 900, scheme, mobile });
        await page.locator('.pcard__use[data-use="free"]').click();
        await settleReveals(page);
        await page.waitForFunction(() => !document.querySelector('[data-coach-note]').hidden && document.querySelector('[data-coach-note]').textContent.trim().length > 0, null, { timeout: 3000 }).catch(() => {});
        const p = await stagePixels(page, '[data-coach-note]', 70);
        const geo = await page.evaluate(() => ({
          top: Math.round(document.querySelector('[data-coach-note]').getBoundingClientRect().top),
          navBottom: Math.ceil(document.querySelector('.nav__bar').getBoundingClientRect().bottom),
          scrolled: document.documentElement.hasAttribute('data-scrolled'),
        }));
        check('pricing/contrast', `${scheme}/${width}: the coach note parked ${geo.top}px from the top, below the ${geo.navBottom}px bar and in its shadow, keeps AA on composited pixels (${p.checked} runs, lowest ${p.lowest.toFixed(2)}:1)`, geo.scrolled && geo.top === 70 && geo.navBottom <= 70 && p.checked >= 1 && p.failCount === 0 && p.lowest >= 4.5, `${JSON.stringify(geo)} ${p.fails.map((f) => `"${f.text}" ${f.ratio}`).join(', ')}`);
        await close(page);
      }
    }

    for (const [width, mobile] of [[390, true], [1280, false]]) {
      const page = await open(paths.en, { width, mobile });
      // The stepper and its buttons only show with the coach switch on: turn every add-on on so they are measured too.
      for (const sw of ['coach', 'app', 'ai']) await page.locator(`.sw[data-sw="${sw}"]`).click();
      await sleep(600);
      const t = await page.evaluate(readTargets);
      check('pricing/targets', `${width}px: ${t.checked} buttons, switches, the stepper, the slider and controls are at least 44px`, t.small.length === 0 && t.checked >= 20, t.small.slice(0, 4).join('; '));
      await close(page);
    }

    for (const locale of ['en', 'es']) {
      for (const [width, mobile] of [[1440, false], [390, true]]) {
        const page = await open(paths[locale], { width, height: width > 500 ? 900 : 844, mobile });
        await page.evaluate(() => {
          document.activeElement?.blur();
          window.scrollTo({ top: 0, behavior: 'instant' });
        });
        const stops = [];
        for (let i = 0; i < 140; i++) {
          await page.keyboard.press('Tab');
          await page.evaluate(scrolled);
          const s = await page.evaluate(describeFocus);
          if (s.end) break;
          stops.push(s);
        }
        const issues = [];
        for (const s of stops) {
          if (!s.visible) issues.push(`"${s.name}" takes focus but is not visible`);
          if (s.ariaHidden) issues.push(`"${s.name}" is focusable inside aria-hidden or inert`);
          if (!s.ring) issues.push(`"${s.name}" has no focus indicator`);
          if (s.inMain && s.obscured) issues.push(`"${s.name}" is covered when focused`);
          if (s.inMain && !s.inViewport) issues.push(`"${s.name}" is not scrolled into view`);
        }
        check('pricing/a11y', `${locale} ${width}px: Tab walk of ${stops.length} stops: every stop visible, indicated, uncovered, none inside aria-hidden`, stops.length > 20 && issues.length === 0, issues.slice(0, 4).join('; '));
        const statics = await page.evaluate(() => ({
          noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
          hiddenTabbable: [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')]
            .filter((e) => e.closest('[aria-hidden="true"], [inert]') && !e.closest('dialog') && e.tabIndex >= 0 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden')
            .map((e) => e.outerHTML.slice(0, 60)),
          h1: document.querySelectorAll('h1').length,
          main: document.querySelectorAll('main').length,
          headings: [...document.querySelectorAll('main h1, main h2, main h3')].map((h) => Number(h.tagName[1])),
          unnamed: [...document.querySelectorAll('a[href], button')].filter((e) => !(e.getAttribute('aria-label') || e.textContent.trim())).length,
          lang: document.documentElement.lang,
        }));
        const jumps = statics.headings.some((h, i) => i > 0 && h - statics.headings[i - 1] > 1);
        check('pricing/a11y', `${locale} ${width}px: ${await page.evaluate(() => document.images.length)} images all have alt, one h1 and one main, no heading level skipped, no unnamed button or link, lang set`, statics.noAlt === 0 && statics.h1 === 1 && statics.main === 1 && !jumps && statics.unnamed === 0 && statics.lang === locale && statics.hiddenTabbable.length === 0, JSON.stringify({ ...statics, headings: statics.headings.join('') }));
        check('pricing/a11y', `${locale} ${width}px: no console errors or failed requests`, page.problems.length === 0, page.problems.slice(0, 2).join('; '));
        await close(page);
      }
    }
  }

  // ------------------------------------------------------------ 8. links, language switch, no-JS
  if (run('links')) {
    const links = {};
    for (const locale of ['en', 'es']) {
      const page = await open(paths[locale]);
      links[locale] = await page.evaluate(() => ({
        plan: Object.fromEntries([...document.querySelectorAll('.pcard')].map((c) => [c.dataset.plan, c.querySelector('a.btn')?.getAttribute('href')])),
        lang: [...document.querySelectorAll('.langswitch a')].map((a) => `${a.getAttribute('hreflang')}=${a.getAttribute('href')}`),
        current: document.querySelector('.nav a[aria-current="page"]')?.getAttribute('href') ?? null,
        external: [...document.querySelectorAll('[data-pricing] a[href^="http"]')].map((a) => `${new URL(a.href).host}:${a.rel}`),
      }));
      await close(page);
    }
    for (const locale of ['en', 'es']) {
      const l = links[locale];
      check('pricing/links', `${locale}: Free, Core and Performance go to sign-up; Schools to the booking page; Federations to contact`, l.plan.free === SIGN_UP && l.plan.core === SIGN_UP && l.plan.performance === SIGN_UP && /^https:\/\/bookings\.cloud\.microsoft\//.test(l.plan.schools) && (l.plan.federations === (locale === 'es' ? '/es/contact/' : '/contact/') || l.plan.federations === '/connect.html'), JSON.stringify(l.plan));
    }
    check('pricing/links', 'the language switch keeps you on pricing in the other language', links.en.lang.includes('es=/es/pricing/') && links.es.lang.includes('en=/pricing/'), `${links.en.lang} | ${links.es.lang}`);

    for (const [width, mobile] of [[1280, false], [390, true]]) {
      const page = await open(paths.en, { width, mobile, js: false });
      const s = await page.evaluate(() => {
        const shown = (sel) => [...document.querySelectorAll(sel)].some((e) => e.getClientRects().length > 0);
        const text = (sel) => document.querySelector(sel)?.textContent.trim();
        return {
          core: text('[data-amount="core"]'),
          performance: text('[data-amount="performance"]'),
          controls: shown('[data-controls] input'),
          note: shown('.controls-note'),
          buttons: [...document.querySelectorAll('[data-reveal-btn], .sw, .step button, .pcard__use')].filter((e) => e.getClientRects().length > 0).length,
          estimate: shown('.est'),
          panels: [...document.querySelectorAll('.reveal')].filter((p) => getComputedStyle(p).visibility !== 'hidden' && p.getBoundingClientRect().height > 4).length,
          rates: shown('[data-edu-rate]'),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5,
          faq: document.querySelectorAll('.faq__item').length,
          faqText: [...document.querySelectorAll('.faq__static')].filter((e) => e.getClientRects().length > 0).length,
          hiddenEntrances: [...document.querySelectorAll('.pricing .rv, .pricing .lines > span > span')].map((e) => parseFloat(getComputedStyle(e).opacity)).filter((o) => o < 1).length,
        };
      });
      check('pricing/no-js', `${width}px without JavaScript: US monthly prices for 100 athletes, controls, estimate and do-nothing buttons hidden with a note, More info and FAQ content inline, every entrance visible, no overflow`, s.core === '$199' && s.performance === '$299' && !s.controls && s.note && !s.buttons && !s.estimate && s.panels === 11 && s.rates && !s.overflow && s.faq === 7 && s.faqText === 7 && s.hiddenEntrances === 0, JSON.stringify(s));
      await close(page);
    }
  }

  // ------------------------------------------------------------ 9. screenshots (final pass, settled UI)
  if (!checksOnly && !onlyGroup) await captures();

  async function captures() {
    await mkdir(outDir, { recursive: true });
    const shot = (page, name, opts = {}) => page.screenshot({ path: `${outDir}${name}.png`, ...opts });
    for (const locale of ['en', 'es']) {
      for (const scheme of ['light', 'dark']) {
        for (const [width, height] of [[1440, 900], [390, 844]]) {
          for (const region of ['us', 'latam']) {
            if (region === 'latam' && scheme === 'dark') continue;
            const page = await open(`${paths[locale]}?region=${region}`, { width, height, scheme, mobile: width < 500 });
            await settle(page);
            await shot(page, `pricing-${locale}-${scheme}-${width}-${region}`, { fullPage: true });
            await close(page);
          }
        }
      }
    }

    // Interactive states, English light unless noted.
    for (const [width, height, mobile] of [[1440, 900, false], [390, 844, true]]) {
      const tag = String(width);
      let page = await open(`${paths.en}?region=us`, { width, height, mobile });
      await setState(page, 'annual', 500);
      await sleep(400);
      await shot(page, `state-annual-500-us-${tag}`, { fullPage: true });
      await setState(page, 'annual', 1000);
      await sleep(300);
      await page.locator('.plans-section').first().screenshot({ path: `${outDir}state-annual-1000-us-plans-${tag}.png` });
      await close(page);

      page = await open(`${paths.en}?region=latam`, { width, height, mobile });
      await setState(page, 'annual', 1000);
      await sleep(300);
      await page.locator('.plans-section').first().screenshot({ path: `${outDir}state-annual-1000-latam-plans-${tag}.png` });
      await close(page);

      page = await open(`${paths.en}?region=latam`, { width, height, mobile });
      await settle(page);
      for (const id of ['addon-extra-coach', 'addon-branded-app', 'addon-credits']) {
        await page.locator(`[data-reveal-btn][aria-controls="${id}"]`).first().click();
      }
      await settleReveals(page);
      await page.locator('.addons__grid').first().screenshot({ path: `${outDir}state-more-info-addons-${tag}.png` });
      await page.locator('[data-reveal-btn][aria-controls="education-rates"]').first().click();
      await settleReveals(page);
      await page.locator('.plans-section').first().screenshot({ path: `${outDir}state-more-info-education-${tag}.png` });
      await close(page);

      page = await open(paths.en, { width, height, mobile });
      await settle(page);
      await page.locator('.sw[data-sw="coach"]').click();
      await page.locator('[data-step="1"]').click();
      await page.locator('.sw[data-sw="app"]').click();
      await page.locator('.sw[data-sw="ai"]').click();
      await page.waitForFunction(() => document.querySelectorAll('.is-rolling').length === 0, null, { timeout: 2500 }).catch(() => {});
      await page.locator('.addons__grid').first().screenshot({ path: `${outDir}state-estimate-addons-on-${tag}.png` });
      await close(page);

      page = await open(paths.es, { width, height, mobile });
      await settle(page);
      await page.locator('.sw[data-sw="coach"]').click();
      await page.locator('.sw[data-sw="app"]').click();
      await page.waitForFunction(() => document.querySelectorAll('.is-rolling').length === 0, null, { timeout: 2500 }).catch(() => {});
      await page.locator('.addons__grid').first().screenshot({ path: `${outDir}state-estimate-addons-on-es-${tag}.png` });
      await close(page);

      page = await open(paths.en, { width, height, mobile });
      await settle(page);
      await page.locator('.faq__q').nth(0).click();
      await page.locator('.faq__q').nth(2).click();
      await settleReveals(page);
      await page.locator('.faq').first().screenshot({ path: `${outDir}state-faq-open-${tag}.png` });
      await close(page);

      page = await open(paths.en, { width, height, mobile });
      await page.focus('input[data-billing][value="monthly"]');
      await page.keyboard.press('Tab');
      await sleep(200);
      await page.locator('.p-hero').first().screenshot({ path: `${outDir}state-focus-slider-${tag}.png` });
      await page.keyboard.press('Tab');
      await sleep(200);
      await shot(page, `state-focus-cta-${tag}`);
      await close(page);

      page = await open(`${paths.en}?region=latam`, { width, height, mobile, noBundle: true });
      await sleep(300);
      await page.locator('.p-hero').first().screenshot({ path: `${outDir}state-fallback-top-${tag}.png` });
      await page.locator('.plans-section').first().screenshot({ path: `${outDir}state-fallback-plans-${tag}.png` });
      await close(page);
    }
  }
}
