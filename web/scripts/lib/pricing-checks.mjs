// Evidence checks for /pricing/ and /es/pricing/. Called from evidence.mjs with its browser, server and recorders.
//   node scripts/evidence.mjs --pricing-only            (checks plus screenshots)
//   node scripts/evidence.mjs --pricing-only --checks-only
// It opens its own Playwright contexts (it needs a time zone per context) and carries its own price oracle: the
// numbers below are typed in from the epic (Stadiora/Aria#16544) and DECISIONS #3 to #5, not read back from
// src/data/pricing.ts, so a wrong edit to the table fails here.
import { mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { addOns, bands, education, athleteBands } from '../../src/data/pricing.ts';
import { regionFromTimeZone } from '../../src/data/region.ts';
import { en, es } from '../../src/i18n/pages/pricing.ts';

const copyFor = { en, es };
const paths = { en: '/pricing/', es: '/es/pricing/' };
const SIGN_UP = 'https://app.ariaforcoaches.com/signup';

// athletes -> [coaches, Core monthly, Performance monthly]
const ORACLE = {
  us: { 25: [2, 79, 119], 50: [3, 129, 199], 100: [5, 199, 299], 250: [8, 349, 529], 500: [10, 499, 749], 1000: [15, 799, 1199] },
  latam: { 25: [2, 49, 79], 50: [3, 79, 119], 100: [5, 129, 199], 250: [8, 229, 349], 500: [10, 350, 529], 1000: [15, 550, 829] },
};
// high school (100), college department (250), college / university (500)
const EDU = { us: [99, 149, 299], latam: [69, 99, 199] };
const EXTRA_COACH = { us: 20, latam: 10 };
const BRANDED = { monthly: 99, setup: 499 };
const annual = (monthly) => Math.floor((monthly * 9) / 10);
const fmt = (n) => `$${n.toLocaleString('en-US')}`;
const sizes = Object.keys(ORACLE.us).map(Number);

const everyAmount = (region) => {
  const out = new Set([EXTRA_COACH[region], ...EDU[region]]);
  for (const [, core, perf] of Object.values(ORACLE[region])) for (const m of [core, perf]) out.add(m).add(annual(m)).add(annual(m) * 12);
  return out;
};
const sharedAmounts = new Set([0, BRANDED.monthly, BRANDED.setup]);

function expectedState(region, billing, n, locale) {
  const copy = copyFor[locale];
  const [coaches, core, perf] = ORACLE[region][n];
  const per = (m) => (billing === 'annual' ? annual(m) : m);
  const billed = (m) => (billing === 'annual' ? copy.price.billedYearly.replace('{total}', fmt(annual(m) * 12)) : copy.price.billedMonthly);
  const meta = copy.price.meta.replace('{athletes}', n.toLocaleString('en-US')).replace('{coaches}', String(coaches));
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
      if (n.parentElement.closest('dialog')) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width > 0.5 && r.height > 0.5) out.push({ text: n.textContent.trim().slice(0, 28), l: r.left, r: r.right, t: r.top, b: r.bottom, badge: Boolean(n.parentElement.closest('.pcard__badge')) });
      }
    }
    return out;
  };
  const name = (c) => (c.className ? String(c.className).split(' ')[0] : c.tagName);
  for (const c of document.querySelectorAll('.pcard, .controls, .addon, .addons__panel')) {
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
  for (const b of document.querySelectorAll('.pcard a.btn, .addon__more')) {
    const host = b.closest('.pcard, .addon');
    const r = b.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    if (r.left < h.left - 0.5 || r.right > h.right + 0.5) problems.push(`button "${b.textContent.trim().slice(0, 24)}" leaves its ${name(host)}`);
    if (b.scrollWidth > b.clientWidth + 1) problems.push(`button "${b.textContent.trim().slice(0, 24)}" clips its label`);
  }
  for (const e of document.querySelectorAll('.pcard *, .controls *, .addon *')) {
    if (!visible(e) || e.closest('dialog')) continue;
    const cs = getComputedStyle(e);
    if (cs.overflow !== 'visible' && e.scrollWidth > e.clientWidth + 1 && !/^(INPUT|SELECT)$/.test(e.tagName)) {
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
    for (const sel of ['.pcard__name', '.pcard__price', '.pcard__cta']) {
      const offsets = row.map((c) => c.querySelector(sel).getBoundingClientRect().top - c.getBoundingClientRect().top);
      if (Math.max(...offsets) - Math.min(...offsets) > 1.5) misaligned.push(sel);
    }
  }
  if (vw > 720 && misaligned.length) problems.push(`rows not aligned: ${[...new Set(misaligned)].join(', ')}`);
  const sameWidth = vw <= 720 ? new Set(rects.map((r) => Math.round(r.width))).size : 1;
  if (sameWidth > 1) problems.push('phone cards differ in width');
  const cta = [...document.querySelectorAll('.pcard a.btn')].map((b) => Math.round(b.getBoundingClientRect().height));
  return { problems, cards: cards.length, ctaHeights: cta };
};

// Text contrast for everything visible. Mirrors the foundation's measure in evidence.mjs.
const readContrast = () => {
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
      if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert') || n.tagName === 'TEMPLATE') return true;
    }
    return false;
  };
  const bgOf = (e) => {
    const stack = [];
    let imageBg = false;
    for (let n = e; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
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
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    const e = node.parentElement;
    if (!e || seen.has(e) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName)) continue;
    seen.add(e);
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || hidden(e)) continue;
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
    rows.push({ text: node.textContent.trim().slice(0, 36), ratio: r, need, cls: String(e.className).slice(0, 32) || e.tagName });
  }
  const fails = rows.filter((r) => r.ratio < r.need - 0.005);
  return { checked: rows.length, min: Math.min(...rows.map((r) => r.ratio)), fails: fails.slice(0, 8), failCount: fails.length, skippedImage };
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
  for (const e of document.querySelectorAll('[data-pricing] a.btn, [data-pricing] button, [data-pricing] summary, [data-pricing] .seg__opt, [data-pricing] .athletes select')) {
    if (hidden(e) || e.closest('dialog:not([open])')) continue;
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
  const wrapper = e.matches('input[type="radio"], select') ? e.closest('label') : null;
  const target = wrapper ?? e;
  const r = target.getBoundingClientRect();
  const cs = getComputedStyle(target);
  const csFocus = getComputedStyle(e);
  const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
  const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
  const top = document.elementFromPoint(cx, cy);
  const ring = (c) => (parseFloat(c.outlineWidth) >= 2 && c.outlineStyle !== 'none') || (c.boxShadow && c.boxShadow !== 'none');
  return {
    end: false,
    name: (e.getAttribute('aria-label') || e.textContent || e.name || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40),
    tag: e.tagName.toLowerCase(),
    inMain: Boolean(e.closest('main')),
    visible: r.width > 0 && r.height > 0 && cs.visibility === 'visible' && (wrapper ? true : parseFloat(cs.opacity) > 0),
    inViewport: r.top >= -1 && r.bottom <= innerHeight + 1,
    obscured: !(top && (target.contains(top) || top.contains(target))),
    ariaHidden: Boolean(e.closest('[aria-hidden="true"], [inert]')),
    ring: ring(cs) || ring(csFocus),
  };
};

// ---------------------------------------------------------------- driver
export async function pricingChecks({ browser, server, outDir, check, metrics, sleep, checksOnly }) {
  const out = (metrics.pricing = {});

  async function open(path, opts = {}) {
    const { width = 1280, height = 900, scheme = 'light', reduced = true, mobile = false, tz = 'America/New_York', js = true } = opts;
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
    if (js) await page.waitForSelector('[data-pricing][data-ready]', { state: 'attached', timeout: 4000 });
    return page;
  }

  const setState = async (page, billing, n) => {
    await page.selectOption('select[data-athletes]', String(n));
    await page.locator(`label.seg__opt:has(input[value="${billing}"])`).click();
  };
  const scrollTop = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  // The page uses smooth scrolling and reveal-on-scroll, so step slowly and jump instantly.
  const settle = async (page) => {
    await page.evaluate(async () => {
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    await sleep(400);
  };
  const close = (page) => page.context().close();

  // ------------------------------------------------------------ 1. the price table against the oracle
  {
    let bad = [];
    for (const region of ['us', 'latam']) {
      for (const band of bands[region]) {
        const [coaches, core, perf] = ORACLE[region][band.athletes] ?? [];
        const want = [coaches, core, perf, annual(core), annual(perf), annual(core) * 12, annual(perf) * 12];
        const got = [band.coaches, band.core.monthly, band.performance.monthly, band.core.annualMonthly, band.performance.annualMonthly, band.core.annualYearly, band.performance.annualYearly];
        if (want.join() !== got.join()) bad.push(`${region} ${band.athletes}: want ${want} got ${got}`);
      }
      const edu = education[region].map((r) => r.monthly);
      if (edu.join() !== EDU[region].join()) bad.push(`${region} education ${edu}`);
      if (addOns.extraCoach[region] !== EXTRA_COACH[region]) bad.push(`${region} extra coach`);
    }
    if (addOns.brandedApp.monthly !== BRANDED.monthly || addOns.brandedApp.setup !== BRANDED.setup) bad.push('branded app');
    if (athleteBands.join() !== sizes.join()) bad.push(`athlete bands ${athleteBands}`);
    check('pricing/data', 'price table matches the epic and DECISIONS oracle (both regions, annual, yearly, education, add-ons)', bad.length === 0, bad.join('; '));
  }

  // ------------------------------------------------------------ 2. region detection
  {
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
  {
    const wrong = [];
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
            if (got.extra.some((e) => e !== want.extra)) wrong.push(`${tag} extra coach ${got.extra}`);
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
    check('pricing/prices', 'no dollar amount outside the current state is anywhere in the DOM, dialogs included', wrong.every((w) => !/unexpected dollar/.test(w)));
    check('pricing/prices', "the other region's exclusive amounts never appear", isolation === 0, `${isolation} states`);
    const annualMath = sizes.every((n2) => [ORACLE.us, ORACLE.latam].every((r) => r[n2].slice(1).every((m) => annual(m) * 12 === Math.floor((m * 9) / 10) * 12)));
    check('pricing/prices', 'annual is 10% off rounded down per month; the yearly total is that times 12', annualMath);
  }

  // ------------------------------------------------------------ 4. keyboard, announcements, motion
  {
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
    await sleep(450);
    check('pricing/behaviour', 'the roll animation clears itself', (await page.evaluate(() => document.querySelectorAll('.is-rolling').length)) === 0);
    await page.keyboard.press('ArrowLeft');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'ArrowLeft returns to monthly', s.billing === 'monthly' && s.core === '$199', `${s.billing} ${s.core}`);

    await page.focus('select[data-athletes]');
    await page.keyboard.press('ArrowDown');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'the athlete select works from the keyboard (ArrowDown: 100 to 250)', s.athletes === '250' && s.core === '$349' && s.performance === '$529', `${s.athletes} ${s.core}`);
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    s = await page.evaluate(readState);
    check('pricing/behaviour', 'ArrowUp twice goes from 250 to 50', s.athletes === '50' && s.core === '$129', `${s.athletes} ${s.core}`);

    await page.focus('input[data-billing]:checked');
    await page.keyboard.press('Tab');
    const afterRadio = await page.evaluate(() => document.activeElement.matches('select[data-athletes]'));
    check('pricing/behaviour', 'Tab goes from the billing radios to the athlete select', afterRadio);
    const order = [];
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => document.activeElement.getAttribute('aria-describedby') ?? document.activeElement.getAttribute('data-open-modal')));
    }
    check('pricing/behaviour', 'Tab then visits the plan buttons in card order, with the education rates button after Schools', order.join() === 'plan-free,plan-core,plan-performance,plan-schools,education-rates,plan-federations', order.join());
    await close(page);

    const calm = await open(paths.en, { reduced: true });
    await setState(calm, 'annual', 250);
    const anim = await calm.evaluate(() => getComputedStyle(document.querySelector('[data-amount="core"]')).animationDuration);
    check('pricing/behaviour', 'reduced motion: the price roll has no duration', parseFloat(anim) <= 0.00001, anim);
    await close(calm);

    const reveal = await open(paths.en, { reduced: false });
    await settle(reveal);
    const revealed = await reveal.evaluate(() => [...document.querySelectorAll('.faq [data-reveal], .addons[data-reveal], .faq__item')].map((e) => parseFloat(getComputedStyle(e).opacity)));
    check('pricing/behaviour', 'reveal-on-scroll: add-ons and FAQ end fully visible after scrolling through', revealed.length > 0 && revealed.every((o) => o > 0.99), String(revealed.filter((o) => o <= 0.99).length));
    await close(reveal);
  }

  // ------------------------------------------------------------ 5. dialogs: focus, trap, Escape, backdrop, scroll lock
  {
    for (const [label, width, height, mobile] of [['1280', 1280, 900, false], ['390', 390, 844, true]]) {
      const bad = [];
      const page = await open(`${paths.en}?region=latam`, { width, height, mobile });
      for (const id of ['addon-extra-coach', 'addon-branded-app', 'addon-credits', 'education-rates']) {
        const trigger = page.locator(`[data-open-modal="${id}"]`).first();
        const dialog = page.locator(`dialog#${id}`);
        await trigger.focus();
        await page.keyboard.press('Enter');
        const st = await page.evaluate((i) => {
          const d = document.getElementById(i);
          const r = d.getBoundingClientRect();
          return {
            open: d.open,
            inside: d.contains(document.activeElement),
            locked: getComputedStyle(document.documentElement).overflow === 'hidden',
            fits: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
            named: Boolean(d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.textContent.trim()),
          };
        }, id);
        if (!st.open) bad.push(`${id}: Enter does not open it`);
        if (!st.inside) bad.push(`${id}: focus not inside on open`);
        if (!st.locked) bad.push(`${id}: page scroll not locked`);
        if (!st.fits) bad.push(`${id}: dialog leaves the viewport`);
        if (!st.named) bad.push(`${id}: no accessible name`);
        for (const key of ['Tab', 'Shift+Tab']) {
          let escaped = false;
          for (let i = 0; i < 8; i++) {
            await page.keyboard.press(key);
            if (!(await page.evaluate((d) => document.getElementById(d).contains(document.activeElement), id))) escaped = true;
          }
          if (escaped) bad.push(`${id}: ${key} leaves the dialog`);
        }
        await page.keyboard.press('Escape');
        const afterEsc = await page.evaluate((i) => ({ open: document.getElementById(i).open, back: document.activeElement?.getAttribute('data-open-modal') }), id);
        if (afterEsc.open) bad.push(`${id}: Escape does not close`);
        if (afterEsc.back !== id) bad.push(`${id}: focus not returned to its button after Escape`);

        await trigger.click();
        await page.mouse.click(3, height - 3);
        if (await dialog.evaluate((d) => d.open)) bad.push(`${id}: backdrop click does not close`);
        await trigger.click();
        await dialog.locator('h2, h3').first().click();
        if (!(await dialog.evaluate((d) => d.open))) bad.push(`${id}: a click inside closes it`);
        await dialog.locator('[data-modal-close]').first().click();
        const afterClose = await page.evaluate((i) => ({ open: document.getElementById(i).open, back: document.activeElement?.getAttribute('data-open-modal') }), id);
        if (afterClose.open) bad.push(`${id}: close button does not close`);
        if (afterClose.back !== id) bad.push(`${id}: focus not returned after the close button`);
      }
      check('pricing/dialogs', `${label}px: all four dialogs open, trap focus, close on Escape, backdrop and button, return focus, lock scroll`, bad.length === 0, bad.slice(0, 4).join('; '));
      check('pricing/dialogs', `${label}px: the page stayed clean (no console errors)`, page.problems.length === 0, page.problems.slice(0, 2).join('; '));
      await close(page);
    }
  }

  // ------------------------------------------------------------ 6. layout: no overflow, no overlap
  {
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
  {
    for (const scheme of ['light', 'dark']) {
      for (const locale of ['en', 'es']) {
        const page = await open(`${paths[locale]}?region=latam`, { width: 1440, scheme });
        const rows = [];
        const run = async (state) => rows.push({ state, ...(await page.evaluate(readContrast)) });
        await run('default');
        await setState(page, 'annual', 1000);
        await run('annual 1000');
        await page.locator('.faq details').first().evaluate((d) => (d.open = true));
        await run('faq open');
        for (const id of ['addon-extra-coach', 'addon-branded-app', 'addon-credits', 'education-rates']) {
          await page.locator(`[data-open-modal="${id}"]`).first().click();
          await run(id);
          await page.keyboard.press('Escape');
        }
        const failing = rows.filter((r) => r.failCount > 0);
        const checkedTotal = rows.reduce((a, r) => a + r.checked, 0);
        const min = Math.min(...rows.map((r) => r.min));
        check('pricing/contrast', `${scheme}/${locale}: text meets WCAG AA in ${rows.length} states (${checkedTotal} text runs, lowest ${min.toFixed(2)}:1)`, failing.length === 0, failing.map((r) => `${r.state}: ${r.fails.map((f) => `"${f.text}" ${f.ratio.toFixed(2)} (${f.cls})`).join(', ')}`).slice(0, 2).join(' | '));
        const skipped = rows.reduce((a, r) => Math.max(a, r.skippedImage), 0);
        out[`contrastSkipped-${scheme}-${locale}`] = skipped;
        out[`contrastMin-${scheme}-${locale}`] = Number(min.toFixed(2));
        await close(page);
      }
    }

    for (const [width, mobile] of [[390, true], [1280, false]]) {
      const page = await open(paths.en, { width, mobile });
      const t = await page.evaluate(readTargets);
      check('pricing/targets', `${width}px: ${t.checked} buttons, controls and summaries are at least 44px`, t.small.length === 0, t.small.slice(0, 4).join('; '));
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
  {
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
      check('pricing/links', `${locale}: Free, Core and Performance go to sign-up; Schools to the booking page; Federations to contact`, l.plan.free === SIGN_UP && l.plan.core === SIGN_UP && l.plan.performance === SIGN_UP && /^https:\/\/bookings\.cloud\.microsoft\//.test(l.plan.schools) && /connect/.test(l.plan.federations), JSON.stringify(l.plan));
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
          controls: shown('[data-controls] input, [data-controls] select'),
          note: shown('.controls-note'),
          more: shown('[data-open-modal]'),
          dialogs: [...document.querySelectorAll('dialog')].filter((d) => d.getClientRects().length > 0).length,
          rates: shown('[data-edu-rate]'),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5,
          faq: document.querySelectorAll('.faq details').length,
          opacity: [...document.querySelectorAll('.pricing [data-reveal]')].map((e) => parseFloat(getComputedStyle(e).opacity)).filter((o) => o < 1).length,
        };
      });
      check('pricing/no-js', `${width}px without JavaScript: US monthly prices for 100 athletes, controls hidden with a note, dialog content inline, no overflow`, s.core === '$199' && s.performance === '$299' && !s.controls && s.note && !s.more && s.dialogs === 4 && s.rates && !s.overflow && s.faq === 7 && s.opacity === 0, JSON.stringify(s));
      await close(page);
    }
  }

  // ------------------------------------------------------------ 9. screenshots (final pass, settled UI)
  if (!checksOnly) await captures();

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
      for (const id of ['addon-extra-coach', 'addon-branded-app', 'addon-credits', 'education-rates']) {
        await page.locator(`[data-open-modal="${id}"]`).first().click();
        await sleep(250);
        await shot(page, `state-modal-${id}-${tag}`);
        await page.keyboard.press('Escape');
      }
      await close(page);

      page = await open(paths.es, { width, height, mobile });
      await page.locator('[data-open-modal="education-rates"]').first().click();
      await sleep(250);
      await shot(page, `state-modal-education-rates-es-${tag}`);
      await close(page);

      page = await open(paths.en, { width, height, mobile });
      await settle(page);
      await page.locator('.faq details').nth(0).evaluate((d) => (d.open = true));
      await page.locator('.faq details').nth(2).evaluate((d) => (d.open = true));
      await sleep(250);
      await page.locator('.faq').first().screenshot({ path: `${outDir}state-faq-open-${tag}.png` });
      await close(page);

      page = await open(paths.en, { width, height, mobile });
      await page.focus('input[data-billing][value="monthly"]');
      await page.keyboard.press('Tab');
      await sleep(200);
      await page.locator('.top').first().screenshot({ path: `${outDir}state-focus-select-${tag}.png` });
      await page.keyboard.press('Tab');
      await sleep(200);
      await shot(page, `state-focus-cta-${tag}`);
      await close(page);
    }
  }
}
