// Evidence checks for /pricing/ and /es/pricing/. Called from evidence.mjs with its browser, server and recorders.
//   node scripts/evidence.mjs --pricing-only            (checks plus screenshots)
//   node scripts/evidence.mjs --pricing-only --checks-only
//   node scripts/evidence.mjs --pricing-only --checks-only --pricing-group=dialogs   (one group: data, region, prices,
//     behaviour, dialogs, fallback, layout, contrast, links; repeat it to look for flakes)
// It opens its own Playwright contexts (it needs a time zone per context) and carries its own price oracle
// (pricing-oracle.mjs): the numbers there are typed in from the epic (Stadiora/Aria#16544) and DECISIONS #3 to #5, not
// read back from src/data/prices.ts, so a wrong edit to the table fails here.
import { mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import * as table from '../../src/data/prices.ts';
import { regionFromTimeZone } from '../../src/lib/region.ts';
import { fill } from '../../src/lib/template.ts';
import { en, es } from '../../src/i18n/pages/pricing.ts';
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
    brandedDialog: { monthly: text('#addon-branded-app [data-price="branded-monthly"]'), setup: text('#addon-branded-app [data-price="branded-setup"]'), line: text('#addon-branded-app .modal__fact') },
    extraStrip: text('[data-addon="extra-coach"] [data-extra-coach]'),
    extraDialog: text('#addon-extra-coach [data-extra-coach]'),
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
            // words beside them, in the strip and in the dialog, so swapping or editing one of them fails here.
            for (const where of ['brandedStrip', 'brandedDialog']) {
              const g = got[where];
              const read = brandedFromText(g.line ?? '');
              if (g.monthly !== fmt(BRANDED.monthly)) addonWrong.push(`${tag} ${where} monthly fee is "${g.monthly}", want ${fmt(BRANDED.monthly)}`);
              if (g.setup !== fmt(BRANDED.setup)) addonWrong.push(`${tag} ${where} setup fee is "${g.setup}", want ${fmt(BRANDED.setup)}`);
              if (read.monthly !== fmt(BRANDED.monthly)) addonWrong.push(`${tag} ${where} shows "${read.monthly}" per month, want ${fmt(BRANDED.monthly)} ("${g.line}")`);
              if (read.setup !== fmt(BRANDED.setup)) addonWrong.push(`${tag} ${where} shows "${read.setup}" as setup, want ${fmt(BRANDED.setup)} ("${g.line}")`);
            }
            if (got.extraStrip !== want.extra) addonWrong.push(`${tag} extra coach in the strip is "${got.extraStrip}", want ${want.extra}`);
            if (got.extraDialog !== want.extra) addonWrong.push(`${tag} extra coach in the dialog is "${got.extraDialog}", want ${want.extra}`);
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
    check('pricing/addons', `custom-branded app: ${fmt(BRANDED.monthly)} is the monthly fee and ${fmt(BRANDED.setup)} the setup fee, each at its own place in the strip and the dialog (marker and wording; ${n} states: en/es x us/latam x monthly/annual x 6 sizes)`, addonWrong.length === 0, addonWrong.slice(0, 3).join('; '));
    check('pricing/addons', `extra coach: the price in the strip and in the dialog is ${fmt(EXTRA_COACH.us)} (US) or ${fmt(EXTRA_COACH.latam)} (LatAm), both places, every state`, addonWrong.every((w) => !/extra coach/.test(w)) && wrong.every((w) => !/extra coach/.test(w)));
    check('pricing/prices', `Free card shows ${fmt(FREE.monthly)} with ${FREE.coaches} coach and ${FREE.athletes} athletes, and the annual saving reads ${ANNUAL_PERCENT}%, from the table in every state`, freeWrong.length === 0, freeWrong.slice(0, 3).join('; '));
    check('pricing/prices', 'no dollar amount outside the current state is anywhere in the DOM, dialogs included', wrong.every((w) => !/unexpected dollar/.test(w)));
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
  if (run('dialogs')) {
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

  // ------------------------------------------------------------ 5b. dialogs: closing and moving on at once never reopens the wrong thing
  // Regression for a reviewed race: closing a dialog queued a `close` event whose handler gave focus back to the opener.
  // A keyboard user who closed one dialog and moved straight to another trigger had their focus stolen, and Enter then
  // opened the first dialog again. Two variants, each cycling through every ordered pair of triggers:
  //   - same-task: close() and the next trigger's focus() run in one synchronous turn, the worst timing for a late handler;
  //   - real keys: Escape or the close button, then focus the next trigger and press Enter, the way the reviewer did.
  if (run('dialogs')) {
    const ids = ['addon-extra-coach', 'addon-branded-app', 'addon-credits', 'education-rates'];
    const pairs = ids.flatMap((a) => ids.filter((b) => b !== a).map((b) => [a, b]));
    const bad = [];
    let rounds = 0;
    const page = await open(`${paths.en}?region=latam`);
    const state = () => page.evaluate((all) => ({ opened: all.filter((i) => document.getElementById(i).open), active: document.activeElement?.getAttribute('data-open-modal') ?? document.activeElement?.tagName }), ids);
    for (let round = 0; round < 2; round++) {
      for (const [a, b] of pairs) {
        for (const via of ['escape', 'button']) {
          rounds++;
          const tag = `${a} -> ${b} via ${via}`;
          await page.locator(`[data-open-modal="${a}"]`).first().focus();
          await page.keyboard.press('Enter');
          if (round === 0) {
            // Same task: no event-loop turn between close and the focus move.
            await page.evaluate(
              ([from, next]) => {
                document.getElementById(from).close();
                document.querySelector(`[data-open-modal="${next}"]`).focus();
              },
              [a, b],
            );
            await page.waitForTimeout(40);
          } else {
            if (via === 'escape') await page.keyboard.press('Escape');
            else await page.locator(`dialog#${a} [data-modal-close]`).first().click();
            await page.locator(`[data-open-modal="${b}"]`).first().focus();
          }
          const mid = await state();
          if (mid.opened.length) bad.push(`${tag}: a dialog is open before Enter (${mid.opened})`);
          if (mid.active !== b) bad.push(`${tag}: focus is on "${mid.active}" after the move, want ${b}`);
          await page.keyboard.press('Enter');
          const after = await state();
          if (after.opened.join() !== b) bad.push(`${tag}: Enter opened [${after.opened}], want [${b}]`);
          await page.keyboard.press('Escape');
          if ((await state()).opened.length) bad.push(`${tag}: Escape left a dialog open`);
        }
      }
    }
    out.dialogRounds = rounds;
    check('pricing/dialogs', `close then move to another trigger then Enter opens that dialog, never the previous one (${rounds} rounds: every ordered pair of 4 triggers x Escape and close button x same-task and real-key variants)`, bad.length === 0, bad.slice(0, 3).join('; '));
    check('pricing/dialogs', 'the race run stayed clean (no console errors)', page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);
  }

  // ------------------------------------------------------------ 5c. fallback: JavaScript on, pricing script never arrives
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
          selector: shown('select[data-athletes]'),
          segmented: shown('.seg'),
          note: shown('.controls-note'),
          noteText: document.querySelector('.controls-note')?.textContent.trim() ?? '',
          triggers: [...document.querySelectorAll('[data-open-modal]')].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).length,
          modalsShown: shown('.modals'),
          dialogsVisible: [...document.querySelectorAll('.modals dialog')].filter((d) => d.getBoundingClientRect().height > 0).length,
          brandedFee: document.querySelector('.modals #addon-branded-app [data-price="branded-monthly"]')?.textContent.trim(),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5,
        };
      });
      if (view.controls || view.selector || view.segmented) bad.push('the controls are still on screen');
      if (!view.note) bad.push('the US/monthly/100-athletes note is not shown');
      const noteWant = fill(en.controls.noScript, { athletes: String(DEFAULT_BAND) });
      if (view.noteText !== noteWant) bad.push(`note reads "${view.noteText}", want "${noteWant}"`);
      if (view.triggers) bad.push(`${view.triggers} dialog trigger(s) still on screen`);
      if (!view.modalsShown || view.dialogsVisible < 4) bad.push(`dialog content is not inline (${view.dialogsVisible} of 4)`);
      if (view.brandedFee !== fmt(BRANDED.monthly)) bad.push(`inline branded fee "${view.brandedFee}"`);
      // Tab through the page: every stop is on screen, and none is a control or dialog trigger the fallback hides.
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
        if (st.tag === 'select' || /^(More info|Más información)/.test(st.name) || /^(Monthly|Annual|Mensual|Anual)/.test(st.name)) bad.push(`Tab reaches "${st.name}", a control the fallback hides`);
      }
      if (stops.length < 10) bad.push(`the Tab walk ended after ${stops.length} stops`);
      if (view.overflow) bad.push('the page scrolls sideways');
      // Nothing can move the state, so nothing can contradict it: force the events a control would send.
      await page.evaluate(() => {
        const sel = document.querySelector('select[data-athletes]');
        sel.value = '2000';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        const radio = document.querySelector('input[name="billing"][value="annual"], input[value="annual"]');
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const forced = await page.evaluate(readState);
      for (const key of ['core', 'performance', 'coreMeta', 'coreBilled', 'performanceBilled']) {
        if (forced[key] !== want[key]) bad.push(`after a forced change ${key} became "${forced[key]}"`);
      }
      check('pricing/fallback', `${label}px: script blocked -> after the failsafe the page shows one honest state (US, monthly, ${DEFAULT_BAND} athletes: ${want.core} / ${want.performance}), hides the controls and dialog triggers, shows the note and the dialog content inline, and the Tab walk reaches nothing hidden`, bad.length === 0, bad.slice(0, 4).join('; '));
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
      check('pricing/links', `${locale}: Free, Core and Performance go to sign-up; Schools to the booking page; Federations to contact`, l.plan.free === SIGN_UP && l.plan.core === SIGN_UP && l.plan.performance === SIGN_UP && /^https:\/\/bookings\.cloud\.microsoft\//.test(l.plan.schools) && /(connect|contact)/.test(l.plan.federations), JSON.stringify(l.plan));
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

      page = await open(`${paths.en}?region=latam`, { width, height, mobile, noBundle: true });
      await sleep(300);
      await page.locator('.top').first().screenshot({ path: `${outDir}state-fallback-top-${tag}.png` });
      await page.locator('.plans-section').first().screenshot({ path: `${outDir}state-fallback-plans-${tag}.png` });
      await close(page);
    }
  }
}
