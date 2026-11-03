// Evidence run for the home page: screenshots, interaction checks and measured budgets.
//   npm run build && npm run evidence          (everything)
//   node scripts/evidence.mjs --checks-only    (no screenshots)
//   node scripts/evidence.mjs --nav-only       (header geometry, mega panel height, drawer and panel focus only)
//   node scripts/evidence.mjs --pricing-only   (the /pricing/ page only: prices, region, dialogs, layout, contrast; add --checks-only to skip screenshots)
// Output goes to web/.evidence/ (git-ignored): PNGs plus summary.json. Exit code 1 when a check fails.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { navChecks } from './lib/nav-checks.mjs';
import { pricingChecks } from './lib/pricing-checks.mjs';
import { platformCoachChecks } from './lib/platform-coach-checks.mjs';
import { serve } from './lib/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}.evidence/`;
const navOnly = process.argv.includes('--nav-only');
const pricingOnly = process.argv.includes('--pricing-only');
const checksOnly = process.argv.includes('--checks-only');
const coachOnly = process.argv.includes('--coach-only');

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
const sections = ['hero', 'logos', 'ai', 'pillars', 'engage', 'brand', 'apps', 'voices', 'cta'];

async function open(opts, path = '/') {
  const { width, height, scheme = 'light', reduced = false, init, mobile = false } = opts;
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
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
  await page.evaluate(() => document.fonts.ready);
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
if (!checksOnly && !navOnly) {
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
        if (scheme === 'light' || width === 1440) {
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
await navChecks({ open, check, shot, sleep, checksOnly, metrics });
if (navOnly) await finish();

// ---------------------------------------------------------------- 2. interactions (motion on)
// Hero cycle: the first painted word is "coaches" (also in the no-JS HTML) and the rotation visits all seven
// words in order, with the three photo tiles on the same set as the word.
{
  const expected = {
    '/': ['coaches', 'high school teams', 'soccer academies', 'track and field', 'gyms and studios', 'nutrition coaches', 'universities'],
    '/es/': ['entrenadores', 'equipos escolares', 'academias de fútbol', 'equipos de atletismo', 'gimnasios y estudios', 'coaches de nutrición', 'universidades'],
  };
  for (const [path, words] of Object.entries(expected)) {
    const file = path === '/' ? 'index.html' : 'es/index.html';
    const html = await readFile(`${root}dist/${file}`, 'utf8');
    const staticWord = html.match(/<span[^>]*class="hero__static"[^>]*>([^<]*)<\/span>/)?.[1]?.trim();
    check('hero', `${path} first painted word (HTML, no JS) is "${words[0]}"`, staticWord === words[0], `static word "${staticWord}"`);
    const domOrder = [...html.matchAll(/<span[^>]*class="hero__word"[^>]*>([^<]*)<\/span>/g)].map((m) => m[1].trim());
    check('hero', `${path} rotation order is ${words.length} words, coaches first`, JSON.stringify(domOrder) === JSON.stringify(words), domOrder.join(' | '));
  }
  const page = await open({ width: 1440, height: 900 });
  await page.mouse.move(2, 2);
  const seen = [];
  const mismatched = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 24000) {
    const s = await page.evaluate(() => ({
      word: document.querySelector('.hero__word[data-active]')?.textContent?.trim(),
      sets: [...document.querySelectorAll('[data-hero-slot] .hero__ph[data-active]')].map((e) => e.dataset.set),
      index: [...document.querySelectorAll('.hero__word')].findIndex((e) => e.hasAttribute('data-active')),
    }));
    if (seen[seen.length - 1] !== s.word) seen.push(s.word);
    if (s.sets.some((v) => Number(v) !== s.index)) mismatched.push(`${s.word}:${s.sets}`);
    await sleep(250);
  }
  check('hero', 'rotation cycles coaches -> ... -> universities -> coaches in order', JSON.stringify(seen.slice(0, 8)) === JSON.stringify([...expected['/'], expected['/'][0]]), seen.join(' > '));
  check('hero', 'photo sets stay in sync with the word through the whole cycle', mismatched.length <= 2, `${mismatched.length} samples out of step (a crossfade frame can lag)`);
  await page.context().close();
}

{
  const page = await open({ width: 1440, height: 900 });
  await page.mouse.move(2, 2);

  // Hero word rotation, pause control
  const heroWord = () => page.locator('.hero__word[data-active]').first().innerText();
  const first = await heroWord();
  if (!checksOnly) await shot(page, 'state-hero-word-1', { clip: { x: 0, y: 0, width: 1440, height: 760 } });
  await page.waitForFunction((w) => document.querySelector('.hero__word[data-active]')?.textContent?.trim() !== w, first.trim(), { timeout: 9000 });
  await sleep(900);
  const second = await heroWord();
  if (!checksOnly) await shot(page, 'state-hero-word-2', { clip: { x: 0, y: 0, width: 1440, height: 760 } });
  check('hero', 'headline word rotates', first.trim() !== second.trim(), `"${first.trim()}" -> "${second.trim()}"`);
  const photoSets = await page.evaluate(() => document.querySelectorAll('[data-hero-slot] [data-active]').length);
  check('hero', 'three photo tiles follow the word', photoSets === 3, `${photoSets} active tiles`);
  await page.locator('[data-hero-pause]').click();
  await page.mouse.move(2, 2);
  const paused = await heroWord();
  await sleep(3600);
  check('hero', 'pause button stops the rotation (WCAG 2.2.2)', (await heroWord()) === paused && (await page.locator('[data-hero-pause]').getAttribute('aria-pressed')) === 'true');
  await page.locator('[data-hero-pause]').click();

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

  // AI demo
  await page.locator('[data-ai-panel]').scrollIntoViewIfNeeded();
  await page.locator('[data-ai]').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => document.querySelector('[data-ai-panel]')?.getAttribute('data-phase') === '1', null, { timeout: 12000 });
  if (!checksOnly) await el(page, '[data-ai-panel]', 'state-ai-1-reviewing');
  await page.waitForFunction(() => document.querySelector('[data-ai-panel]')?.getAttribute('data-phase') === '2', null, { timeout: 12000 });
  await sleep(500);
  if (!checksOnly) await el(page, '[data-ai-panel]', 'state-ai-2-scheduled');
  check('ai-demo', 'loop runs prompt -> review -> calendar', true);
  const aiPause = page.locator('[data-ai-pause]').first();
  if (await aiPause.count()) {
    await aiPause.click();
    check('ai-demo', 'pause control is pressed after click', (await aiPause.getAttribute('aria-pressed')) === 'true');
    await aiPause.click();
  }

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

  // Messaging tabs
  const msgRoot = page.locator('.msg[data-tabs]');
  await msgRoot.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await sleep(500);
  const mtabs = msgRoot.locator('[role="tab"]');
  await mtabs.nth(2).click();
  await sleep(500);
  const slide = await page.evaluate(() => {
    const track = document.querySelector('.msg__track');
    return new DOMMatrix(getComputedStyle(track).transform).m41 / track.getBoundingClientRect().width;
  });
  check('messaging', 'phone screen slides to the broadcast screen', Math.abs(slide + 0.5) < 0.02, `translateX ${(slide * 100).toFixed(1)}% of track`);
  if (!checksOnly) await el(page, '.engage', 'state-messaging-3-broadcast');

  // Retro stack
  await page.locator('.brand').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await sleep(500);
  const pos = () => page.evaluate(() => [...document.querySelectorAll('.retro__card')].map((c) => c.dataset.pos).join(','));
  const p0 = await pos();
  await sleep(3200);
  const p1 = await pos();
  check('brand', 'retro stack advances on its own', p0 !== p1, `${p0} -> ${p1}`);
  const fronts = new Set();
  const tFan = Date.now();
  while (Date.now() - tFan < 21000 && fronts.size < 8) {
    fronts.add(await page.evaluate(() => document.querySelector('.retro__card[data-pos="0"] img')?.getAttribute('alt')));
    await sleep(250);
  }
  check('brand', 'stack cycles through all 8 retro images', fronts.size === 8, `${fronts.size} distinct front cards`);
  if (!checksOnly) await el(page, '.brand', 'state-brand-retro-stack');
  await page.locator('[data-retro-pause]').click();
  const p2 = await pos();
  await sleep(3200);
  check('brand', 'pause control stops the stack', p2 === (await pos()));
  const fan = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.retro__card')].filter((c) => parseFloat(getComputedStyle(c).opacity) > 0.9);
    return { visible: cards.length, positions: cards.map((c) => c.dataset.pos).sort() };
  });
  check('brand', 'five overlapping cards are visible as a fan', fan.visible === 5, `${fan.visible} visible, positions ${fan.positions.join(',')}`);
  await page.locator('[data-retro-pause]').click();

  // Store chooser dialog
  await page.locator('.cta').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.locator('.cta a[href="#get-app"]').first().click();
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
  const first = (await page.locator('.hero__word[data-active]').first().innerText()).trim();
  await page.waitForFunction((w) => document.querySelector('.hero__word[data-active]')?.textContent?.trim() !== w, first, { timeout: 9000 });
  await sleep(900);
  await shot(page, 'state-hero-es-2', { clip: { x: 0, y: 0, width: 1440, height: 760 } });
  await page.context().close();
}

// ---------------------------------------------------------------- 3. reduced motion
{
  const page = await open({ width: 1440, height: 900, reduced: true });
  const first = (await page.locator('.hero__static').first().innerText()).trim();
  const wordBefore = await page.locator('.hero__word[data-active]').first().evaluate((e) => e.textContent.trim());
  await sleep(3500);
  const wordAfter = await page.locator('.hero__word[data-active]').first().evaluate((e) => e.textContent.trim());
  const infinite = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity)
      .map((a) => a.animationName ?? a.id ?? 'unnamed'),
  );
  check('reduced-motion', 'hero shows the static word "coaches", no rotation', first === 'coaches' && wordBefore === wordAfter, `"${first}"; active word stays "${wordAfter}"`);
  check('reduced-motion', 'no infinite animation is running', infinite.length === 0, infinite.join(','));
  const fanBefore = await page.evaluate(() => [...document.querySelectorAll('.retro__card')].map((c) => c.dataset.pos).join(','));
  await sleep(2800);
  const fan = await page.evaluate(() => ({
    order: [...document.querySelectorAll('.retro__card')].map((c) => c.dataset.pos).join(','),
    visible: [...document.querySelectorAll('.retro__card')].filter((c) => getComputedStyle(c).display !== 'none' && parseFloat(getComputedStyle(c).opacity) > 0.9).length,
  }));
  check('reduced-motion', 'retro stack is a static fan of five cards, no cycling', fan.visible === 5 && fan.order === fanBefore, `${fan.visible} cards visible, order ${fanBefore} -> ${fan.order}`);
  await page.context().close();
}

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

// ---------------------------------------------------------------- 4b. layout and content details (fix round A)
for (const [path, locale] of [
  ['/', 'en'],
  ['/es/', 'es'],
]) {
  for (const width of [1440, 1360, 1280, 1024]) {
    const page = await open({ width, height: 900, reduced: true }, path);
    await settle(page);
    const ai = await page.evaluate(() => {
      const box = (s) => document.querySelector(s)?.getBoundingClientRect();
      const typed = document.querySelector('[data-ai-typed]');
      const lh = parseFloat(getComputedStyle(typed).lineHeight);
      const ask = box('.ai__ask');
      const program = box('.ai__program');
      const cal = box('.ai__cal');
      // A word wider than its box would break mid-word ("Acceleratio / n"): measure each word on one line.
      const brokenWords = [...document.querySelectorAll('.ai__event-name, .ai__event-spec, .ai__row')].filter((e) => {
        if (getComputedStyle(e).display === 'none' || e.getBoundingClientRect().width === 0) return false;
        const probe = document.createElement('span');
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit';
        e.appendChild(probe);
        const room = e.clientWidth - parseFloat(getComputedStyle(e).paddingLeft) - parseFloat(getComputedStyle(e).paddingRight);
        const tooWide = e.textContent.trim().split(/\s+/).some((w) => ((probe.textContent = w), probe.getBoundingClientRect().width > room + 0.5));
        probe.remove();
        return tooWide;
      }).length;
      const clipped = brokenWords + [...document.querySelectorAll('.ai__event-name, .ai__event-spec, .ai__spec')].filter((e) => e.scrollWidth > e.clientWidth + 1).length;
      return { lines: Math.round(typed.getBoundingClientRect().height / lh), ask: Math.round(ask.width), program: Math.round(program.width), cal: Math.round(cal.width), clipped };
    });
    check('ai-layout', `${locale} @${width}: the prompt reads in 2 to 3 lines`, ai.lines >= 2 && ai.lines <= 3, `${ai.lines} lines in a ${ai.ask}px card`);
    check('ai-layout', `${locale} @${width}: ask card is wider than the program card on the three-column row, no word breaks mid-word`, ai.clipped === 0 && (width < 1360 || ai.ask >= ai.program * 1.1), `ask ${ai.ask} / program ${ai.program} / calendar ${ai.cal}px, ${ai.clipped} clipped`);
    await page.context().close();
  }
}
{
  const page = await open({ width: 1440, height: 900, reduced: true });
  await settle(page);
  const apps = await page.evaluate(() => {
    const loaded = (img) => img.complete && img.naturalWidth > 0;
    const hero = [...document.querySelectorAll('.bp__hero img')];
    const thumbs = [...document.querySelectorAll('.bp__list--tiles b img')];
    return {
      hero: hero.length,
      heroLoaded: hero.filter(loaded).length,
      thumbs: thumbs.length,
      thumbsLoaded: thumbs.filter(loaded).length,
      distinct: new Set([...hero, ...thumbs].map((i) => i.currentSrc.replace(/-[0-9a-f]+\.[a-z]+$/, ''))).size,
      missing: document.querySelectorAll('.photo--missing').length,
    };
  });
  check('apps', 'three phone screens carry real photos, FitMG rows carry thumbnails', apps.hero === 3 && apps.heroLoaded === 3 && apps.thumbs === 4 && apps.thumbsLoaded === 4 && apps.missing === 0, `${apps.heroLoaded}/${apps.hero} hero photos, ${apps.thumbsLoaded}/${apps.thumbs} thumbnails loaded, ${apps.distinct} distinct files`);
  const logos = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.marquee__group:not([aria-hidden]) .logos__item img.only-light')];
    return { heights: imgs.map((i) => Math.round(i.getBoundingClientRect().height)), widths: imgs.map((i) => Math.round(i.getBoundingClientRect().width)), opacity: Number(getComputedStyle(imgs[0]).opacity) };
  });
  check('logos', 'logos are sized by optical area, not one shared height', new Set(logos.heights).size >= 4, `heights ${logos.heights.join('/')}, widths ${logos.widths.join('/')}`);
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const mix = (fg, a, bg) => fg.map((v, i) => v * a + bg[i] * (1 - a));
  const onLight = mix([11, 18, 32], logos.opacity, [255, 255, 255]);
  const ratio = (L([255, 255, 255]) + 0.05) / (L(onLight) + 0.05);
  check('logos', 'mono-dark (#0B1220) at 70-80% opacity keeps AA contrast on white', logos.opacity >= 0.7 && logos.opacity <= 0.8 && ratio >= 4.5, `opacity ${logos.opacity}, ${ratio.toFixed(1)}:1`);
  const load = await page.evaluate(() => document.querySelector('.pcard--load')?.textContent ?? '');
  check('claims', 'training load card carries no unbacked "In range" verdict', !/in range|en rango/i.test(load) && /effort|esfuerzo/i.test(load), load.replace(/\s+/g, ' ').trim());
  await page.context().close();
}

// ---------------------------------------------------------------- 5. measured budgets
const measure = {
  contrast: () => {
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
  },
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
      heroImages = loaded.filter((r) => /\/_astro\/h\d-.*\.(avif|webp)$/.test(r.url));
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
  metrics[`perf-${label}`] = { lcpMs: Math.round(lcp), cls: Number(cls.toFixed(4)), firstScreenKB: Math.round(bytes / 1024), jsKB: Math.round(metrics[`js-${label}`] / 1024), largestHeroKB: Math.round(maxHero / 1024), heroFiles: heroImages.length };
}
const homeHtml = await readFile(`${root}dist/index.html`, 'utf8');
metrics['js-inline-bytes-home'] = [...homeHtml.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].reduce((n, m) => n + Buffer.byteLength(m[1]), 0);
const dist = await readdir(`${root}dist/_astro`);
check('perf', 'no video files shipped (budget 1.5 MB each)', !dist.some((f) => /\.(mp4|webm)$/.test(f)));

await pricingChecks({ browser, server, outDir, check, metrics, sleep, checksOnly });
await coachRun();
await finish();
