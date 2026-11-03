// Evidence run for the home page: screenshots, interaction checks and measured budgets.
//   npm run build && npm run evidence          (everything)
//   node scripts/evidence.mjs --checks-only    (no screenshots)
//   node scripts/evidence.mjs --nav-only       (header geometry, mega panel height, drawer and panel focus only)
//   node scripts/evidence.mjs --pricing-only   (the /pricing/ page only: prices, region, dialogs, layout, contrast; add --checks-only to skip screenshots)
//   node scripts/evidence.mjs --engage-only    (the five Platform pages, EN and ES: overflow, contrast, a11y, interactions)
//   node scripts/evidence.mjs --home-only      (the home guards only: structure, autoplayers, reduced motion, marquees, hero words, clipping, contrast)
// Output goes to web/.evidence/ (git-ignored): PNGs plus summary.json. Exit code 1 when a check fails.
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { contrastProbe } from './lib/contrast.mjs';
import { engageChecks } from './lib/engage-checks.mjs';
import { homeChecks, homeSections } from './lib/home-checks.mjs';
import { navChecks } from './lib/nav-checks.mjs';
import { pricingChecks } from './lib/pricing-checks.mjs';
import { platformCoachChecks } from './lib/platform-coach-checks.mjs';
import { solutionsChecks } from './lib/solutions-checks.mjs';
import { serve } from './lib/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}.evidence/`;
const navOnly = process.argv.includes('--nav-only');
const pricingOnly = process.argv.includes('--pricing-only');
const engageOnly = process.argv.includes('--engage-only');
const checksOnly = process.argv.includes('--checks-only');
const coachOnly = process.argv.includes('--coach-only');
const homeOnly = process.argv.includes('--home-only');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const results = [];
const check = (group, name, pass, detail = '') => {
  results.push({ group, name, pass: Boolean(pass), detail: String(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? `  (${detail})` : ''}`);
};
const metrics = {};

const server = await serve(`${root}dist`);
const browser = await chromium.launch();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sections = homeSections;

async function open(opts, path = '/') {
  const { width, height, scheme = 'light', reduced = false, init, mobile = false, timezoneId, js = true } = opts;
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
    javaScriptEnabled: js,
    ...(timezoneId ? { timezoneId } : {}),
  });
  if (init) await context.addInitScript(init);
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
  if (js) await page.evaluate(() => document.fonts.ready);
  return page;
}

// Scroll through the page so lazy images and reveal-on-scroll content have loaded, then return to the top.
async function settle(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    window.scrollTo(0, 0);
  });
  await sleep(500);
}

const shot = (page, name, opts = {}) => page.screenshot({ path: `${outDir}${name}.png`, ...opts });
const el = (page, selector, name) => page.locator(selector).first().screenshot({ path: `${outDir}${name}.png` });

async function finish() {
  await browser.close();
  await server.close();

  const failed = results.filter((r) => !r.pass);
  await writeFile(`${outDir}summary.json`, JSON.stringify({ results, metrics }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(JSON.stringify(metrics, null, 2));
  process.exit(failed.length ? 1 : 0);
}

// ---------------------------------------------------------------- 0. pricing page (its own contexts, time zones and checks)
if (pricingOnly) {
  await pricingChecks({ browser, server, outDir, check, metrics, sleep, checksOnly });
  await finish();
}

// Platform Coach pages (programs, nutrition, readiness, power lab); `--coach-only` runs just these.
const coachRun = () => platformCoachChecks({ open, check, shot, el, sleep, settle, checksOnly, metrics, server, browser, outDir });
if (coachOnly) {
  await coachRun();
  await finish();
}

// ---------------------------------------------------------------- 1. static captures
if (!checksOnly && !navOnly && !engageOnly && !homeOnly) {
  for (const locale of ['en', 'es']) {
    const path = locale === 'en' ? '/' : '/es/';
    for (const scheme of ['light', 'dark']) {
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
      ]) {
        const page = await open({ width, height, scheme, reduced: true, mobile: width < 500 }, path);
        await settle(page);
        await shot(page, `full-${locale}-${scheme}-${width}`, { fullPage: true });
        {
          const count = await page.locator('main > section').count();
          check('capture', `${locale}/${scheme}/${width}: main has ${sections.length} sections`, count === sections.length, `found ${count}`);
          for (let i = 0; i < Math.min(count, sections.length); i++) {
            await page.locator('main > section').nth(i).screenshot({ path: `${outDir}sec-${sections[i]}-${locale}-${scheme}-${width}.png` });
          }
          await page.locator('footer').screenshot({ path: `${outDir}sec-footer-${locale}-${scheme}-${width}.png` });
        }
        await page.context().close();
      }
    }
  }
}

// ---------------------------------------------------------------- 1b. header: geometry, mega panel height, drawer and panel focus (fix round B)
if (homeOnly) {
  await homeChecks({ open, check, sleep, settle, metrics });
  await finish();
}
if (!engageOnly) await navChecks({ open, check, shot, sleep, checksOnly, metrics });
if (navOnly) await finish();
await engageChecks({ open, check, shot, sleep, settle, checksOnly, metrics });
if (engageOnly) await finish();

// ---------------------------------------------------------------- 2. interactions (motion on)
// The Floodlight home guards (structure, every autoplayer, reduced motion, marquees, hero words, clipping, contrast).
await homeChecks({ open, check, sleep, settle, metrics });

{
  const page = await open({ width: 1440, height: 900 });
  await page.mouse.move(2, 2);
  if (!checksOnly) await shot(page, 'state-hero-word-1', { clip: { x: 0, y: 0, width: 1440, height: 760 } });

  // Mega menu
  const triggers = page.locator('[data-mega-trigger]');
  await triggers.nth(0).click();
  await sleep(450);
  check('nav', 'Platform mega menu opens', (await triggers.nth(0).getAttribute('aria-expanded')) === 'true' && (await page.locator('#mega-platform').isVisible()));
  if (!checksOnly) await shot(page, 'state-mega-platform', { clip: { x: 0, y: 0, width: 1440, height: 720 } });
  await page.keyboard.press('Escape');
  await sleep(250);
  check('nav', 'Escape closes the menu and returns focus to its trigger', (await triggers.nth(0).getAttribute('aria-expanded')) === 'false' && (await page.evaluate(() => document.activeElement?.hasAttribute('data-mega-trigger'))));
  await triggers.nth(1).click();
  await sleep(450);
  check('nav', 'Solutions mega menu opens', (await triggers.nth(1).getAttribute('aria-expanded')) === 'true');
  if (!checksOnly) await shot(page, 'state-mega-solutions', { clip: { x: 0, y: 0, width: 1440, height: 720 } });
  await page.keyboard.press('Escape');
  await page.mouse.click(700, 880);

  // Skip link and focus visibility
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press('Tab');
  check('a11y', 'first Tab stop is the skip link', await page.evaluate(() => document.activeElement?.classList.contains('skip-link')));
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
  });
  check('a11y', 'focused control shows a focus ring (>= 2px outline)', ring);

  // SECTION-INTERACTIONS-START
  // Pillar tabs (mouse and keyboard)
  const pillarRoot = page.locator('.pillars [data-tabs]');
  await pillarRoot.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await sleep(400);
  const ptabs = pillarRoot.locator('[role="tab"]');
  check('pillars', 'four tabs, first selected', (await ptabs.count()) === 4 && (await ptabs.nth(0).getAttribute('aria-selected')) === 'true');
  await ptabs.nth(1).click();
  await sleep(600);
  check('pillars', 'click selects the second tab', (await ptabs.nth(1).getAttribute('aria-selected')) === 'true' && (await ptabs.nth(0).getAttribute('tabindex')) === '-1');
  if (!checksOnly) await el(page, '.pillars', 'state-pillars-2-nutrition');
  await ptabs.nth(1).focus();
  await page.keyboard.press('ArrowRight');
  check('pillars', 'ArrowRight moves to the third tab', (await ptabs.nth(2).getAttribute('aria-selected')) === 'true');
  await page.keyboard.press('End');
  check('pillars', 'End moves to the last tab', (await ptabs.nth(3).getAttribute('aria-selected')) === 'true');
  await page.keyboard.press('Home');
  check('pillars', 'Home moves to the first tab', (await ptabs.nth(0).getAttribute('aria-selected')) === 'true');
  const activePanels = await page.evaluate(() => [...document.querySelectorAll('.pillars [role="tabpanel"]')].filter((p) => !p.hasAttribute('inert')).length);
  check('pillars', 'only the active panel is interactive', activePanels === 1, `${activePanels} non-inert panels`);

  // Store chooser dialog
  await page.locator('#final').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.locator('#final a[href="#get-app"]').first().click();
  await sleep(400);
  check('dialog', 'store chooser opens as a modal dialog', await page.evaluate(() => document.querySelector('dialog#get-app')?.open === true));
  check('dialog', 'chooser links to both Run with Aria stores', (await page.locator('dialog#get-app a[href*="apps.apple.com"], dialog#get-app a[href*="play.google.com"]').count()) >= 2);
  if (!checksOnly) await shot(page, 'state-store-dialog');
  await page.keyboard.press('Escape');
  await sleep(300);
  check('dialog', 'Escape closes it', await page.evaluate(() => document.querySelector('dialog#get-app')?.open === false));

  // Theme toggle persists
  await page.evaluate(() => window.scrollTo(0, 0));
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('[data-theme-toggle]:visible').first().click();
  await sleep(300);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('theme', 'toggle switches the page to dark', lightBg !== darkBg, `${lightBg} -> ${darkBg}`);
  await page.reload();
  check('theme', 'choice persists after reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  if (!checksOnly) await shot(page, 'state-hero-dark', { clip: { x: 0, y: 0, width: 1440, height: 760 } });

  check('runtime', 'no console errors, page errors or failed requests (desktop run)', page.problems.length === 0, page.problems.join(' | '));
  await page.context().close();
}

// Mobile drawer
{
  const page = await open({ width: 390, height: 844, mobile: true });
  await page.locator('[data-nav-burger]').click();
  await sleep(450);
  check('nav', 'mobile drawer opens', (await page.locator('[data-nav-burger]').getAttribute('aria-expanded')) === 'true' && (await page.locator('[data-nav-menu]').isVisible()));
  if (!checksOnly) await shot(page, 'state-mobile-drawer');
  await page.locator('[data-nav-menu] [data-mega-trigger]').first().click();
  await sleep(450);
  check('nav', 'drawer group expands as an accordion', (await page.locator('[data-nav-menu] [data-mega-trigger]').first().getAttribute('aria-expanded')) === 'true');
  if (!checksOnly) await shot(page, 'state-mobile-drawer-group');
  await page.keyboard.press('Escape');
  await sleep(300);
  check('nav', 'Escape closes the drawer', (await page.locator('[data-nav-burger]').getAttribute('aria-expanded')) === 'false');
  await page.context().close();
}

// ES hero, mobile hero rotation frames
if (!checksOnly) {
  const page = await open({ width: 1440, height: 900 }, '/es/');
  await page.mouse.move(2, 2);
  await shot(page, 'state-hero-es-1', { clip: { x: 0, y: 0, width: 1440, height: 760 } });
  const first = (await page.locator('[data-hero-word][data-active]').first().innerText()).trim();
  await page.waitForFunction((w) => document.querySelector('[data-hero-word][data-active]')?.textContent?.trim() !== w, first, { timeout: 9000 });
  await sleep(900);
  await shot(page, 'state-hero-es-2', { clip: { x: 0, y: 0, width: 1440, height: 760 } });
  await page.context().close();
}

// ---------------------------------------------------------------- 3. reduced motion
// Covered by homeChecks (section 2 above): every autoplayer off with data-ap-why=reduced, no clip playing, posters shown,
// no infinite animation, marquees static, hero on its first word, and the live switch of the OS setting.

// ---------------------------------------------------------------- 4. responsive overflow
for (const path of ['/', '/es/']) {
  for (const width of [1920, 1440, 1280, 1100, 1024, 768, 600, 390, 360]) {
    const page = await open({ width, height: 900, reduced: true, mobile: width < 600 }, path);
    await settle(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('responsive', `${path} @${width}: no horizontal scroll`, over <= 0, over > 0 ? `${over}px over` : '');
    await page.context().close();
  }
}

// ---------------------------------------------------------------- 4b. content details
// The old AI-layout, phone-photo, logo-sizing and "In range" claims checks belonged to the retired sections. Their
// replacements live in homeChecks (hero logos, clipping at six widths) and in scripts/lib/home-verify.mjs (claims, media).

// ---------------------------------------------------------------- 5. measured budgets
const measure = {
  contrast: contrastProbe,
  targets: () => {
    const hidden = (e) => {
      for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
        if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert') || n.hasAttribute('hidden')) return true;
      }
      return false;
    };
    const rows = [];
    let inline = 0;
    for (const e of document.querySelectorAll('a[href], button, [role="tab"], summary, input, select, textarea, [role="button"]')) {
      if (hidden(e)) continue;
      const rect = e.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (e.closest('dialog:not([open])')) continue;
      const cs = getComputedStyle(e);
      if (cs.display === 'inline') {
        inline++;
        continue;
      }
      rows.push({ name: (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 36), w: Math.round(rect.width), h: Math.round(rect.height) });
    }
    const small = rows.filter((r) => r.w < 44 || r.h < 44);
    return { checked: rows.length, inline, minW: Math.min(...rows.map((r) => r.w)), minH: Math.min(...rows.map((r) => r.h)), small: small.slice(0, 12), smallCount: small.length };
  },
};

for (const locale of ['en', 'es']) {
  for (const scheme of ['light', 'dark']) {
    const path = locale === 'en' ? '/' : '/es/';
    const page = await open({ width: 1440, height: 900, scheme, reduced: true }, path);
    await settle(page);
    const c = await page.evaluate(measure.contrast);
    check('contrast', `${locale}/${scheme}: text meets WCAG AA (4.5:1, 3:1 large)`, c.failCount === 0, `${c.checked} text nodes, lowest ${c.min.toFixed(2)}:1${c.failCount ? `, failing: ${JSON.stringify(c.fails)}` : ''}; ${c.skippedImage} over images skipped, ${c.decorative} decorative demo nodes excluded`);
    metrics[`contrast-${locale}-${scheme}`] = { checked: c.checked, lowest: Number(c.min.toFixed(2)), decorativeExcluded: c.decorative, overImagesSkipped: c.skippedImage };
    if (scheme === 'light') {
      const t = await page.evaluate(measure.targets);
      check('hit-targets', `${locale}: every button, tab and block link is >= 44px`, t.smallCount === 0, `${t.checked} controls, smallest ${t.minW}x${t.minH}${t.smallCount ? `, under: ${JSON.stringify(t.small)}` : ''}; ${t.inline} inline text links exempt`);
      metrics[`targets-${locale}`] = { controls: t.checked, smallest: `${t.minW}x${t.minH}`, inlineLinksExempt: t.inline };
    }
    await page.context().close();
  }
}

// LCP and CLS (three runs each, median). Mobile runs use a throttled link and 4x CPU slowdown.
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const perfInit = () => {
  window.__lcp = 0;
  window.__cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
};
for (const [label, width, height, mobile] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, true],
]) {
  const lcps = [];
  const clss = [];
  let bytes = 0;
  let heroImages = [];
  let videoFirst = 0;
  let videoScrolled = 0;
  let clipsRequested = 0;
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(perfInit);
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    if (mobile) {
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const loaded = [];
    page.on('response', async (r) => {
      try {
        loaded.push({ url: r.url(), type: r.headers()['content-type'] ?? '', size: (await r.body()).length });
      } catch {
        /* redirects and aborted requests have no body */
      }
    });
    await page.goto(server.url + '/', { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await sleep(2500);
    const firstScreen = loaded.slice();
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
    });
    await sleep(600);
    lcps.push(await page.evaluate(() => window.__lcp));
    clss.push(await page.evaluate(() => window.__cls));
    if (run === 0) {
      bytes = firstScreen.reduce((n, r) => n + r.size, 0);
      heroImages = loaded.filter((r) => /\/home\/img\/hero\d-.*\.(avif|webp)$/.test(r.url));
      videoFirst = firstScreen.filter((r) => r.type.startsWith('video/')).reduce((n, r) => n + r.size, 0);
      videoScrolled = loaded.filter((r) => r.type.startsWith('video/')).reduce((n, r) => n + r.size, 0);
      clipsRequested = new Set(loaded.filter((r) => r.type.startsWith('video/')).map((r) => r.url)).size;
      metrics[`js-${label}`] = firstScreen.filter((r) => r.type.includes('javascript')).reduce((n, r) => n + r.size, 0);
    }
    await context.close();
  }
  const lcp = median(lcps);
  const cls = median(clss);
  check('perf', `${label}: LCP <= 2500 ms${mobile ? ' (throttled: 1.6 Mbps, 150 ms RTT, 4x CPU)' : ' (local, unthrottled)'}`, lcp <= 2500, `${Math.round(lcp)} ms (runs ${lcps.map(Math.round).join(', ')})`);
  check('perf', `${label}: CLS <= 0.1 including a full scroll-through`, cls <= 0.1, cls.toFixed(4));
  const maxHero = Math.max(0, ...heroImages.map((r) => r.size));
  check('perf', `${label}: every hero photo delivered <= 180 KB`, maxHero <= 180 * 1024, `${heroImages.length} hero files, largest ${(maxHero / 1024).toFixed(0)} KB`);
  // DESIGN-4 section 5: preload="none", clips start on visibility. Measured after a fast scroll, so partial range requests count as bytes.
  check('perf', `${label}: clips stay off the first view (<= 512 KB of video before any scroll)`, videoFirst <= 512 * 1024, `${(videoFirst / 1024).toFixed(0)} KB`);
  check('perf', `${label}: a full fast scroll loads <= 6 MB of video`, videoScrolled <= 6 * 1024 * 1024, `${(videoScrolled / 1024 / 1024).toFixed(2)} MB over ${clipsRequested} clips`);
  metrics[`perf-${label}`] = { lcpMs: Math.round(lcp), cls: Number(cls.toFixed(4)), firstScreenKB: Math.round(bytes / 1024), jsKB: Math.round(metrics[`js-${label}`] / 1024), largestHeroKB: Math.round(maxHero / 1024), heroFiles: heroImages.length, videoFirstScreenKB: Math.round(videoFirst / 1024), videoFullScrollKB: Math.round(videoScrolled / 1024), clipsRequested };
}
const homeHtml = await readFile(`${root}dist/index.html`, 'utf8');
metrics['js-inline-bytes-home'] = [...homeHtml.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].reduce((n, m) => n + Buffer.byteLength(m[1]), 0);
const media = await readdir(`${root}dist/home/media`);
const mediaSizes = await Promise.all(media.filter((f) => /\.(mp4|webm)$/.test(f)).map(async (f) => [f, (await stat(`${root}dist/home/media/${f}`)).size]));
const overBudget = mediaSizes.filter(([, size]) => size > 1.6 * 1024 * 1024).map(([f]) => f);
check('perf', 'every shipped clip is <= 1.6 MB, WebM and MP4 (DESIGN-4 M17)', mediaSizes.length >= 16 && overBudget.length === 0, `${mediaSizes.length} clip files, largest ${(Math.max(...mediaSizes.map(([, s]) => s)) / 1024 / 1024).toFixed(2)} MB${overBudget.length ? `, over: ${overBudget.join(', ')}` : ''}`);
const astroAssets = await readdir(`${root}dist/_astro`);
check('perf', 'no clip is bundled into _astro (clips are public files, loaded on visibility)', !astroAssets.some((f) => /\.(mp4|webm)$/.test(f)));

await pricingChecks({ browser, server, outDir, check, metrics, sleep, checksOnly });
// ---------------------------------------------------------------- 6. solutions, resources and company pages
await solutionsChecks({ open, settle, check, sleep, metrics, measure, outDir, checksOnly });

await coachRun();
await finish();
