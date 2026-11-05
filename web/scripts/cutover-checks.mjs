// Browser checks for the cutover pages, run against dist/:
//   npm run build && node scripts/cutover-checks.mjs [--shots <dir>]
// Covers what `npm run verify` cannot see in HTML alone: the redirect stubs land on their targets with JavaScript off,
// the 404 answers unknown URLs with a real 404 status in both languages, the carried pages load without a failed local
// request (the connect.html video was one), and the lead form is honest in every outcome: the live contact endpoint is
// intercepted, and anything but a 202 (a 200, 400, 429, 503, a dropped connection) must leave the form usable with a plain
// message and the direct contacts, while every post carries the honeypot and a startedAt old enough to be accepted.
// `--shots` also writes the screenshots.
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { findDeliveryClaims, leadSuccess, roles, wireTopic } from './lib/contact-contract.mjs';
import { interceptContact, postProblems } from './lib/contact-route.mjs';
import { serve } from './lib/static-server.mjs';
import { carried, redirects } from './lib/live-urls.mjs';
import { noindexPages } from './lib/cutover-verify.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const shotsAt = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (group, name, ok, detail = '') => {
  results.push({ group, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? `  (${detail})` : ''}`);
};

// DIST_DIR points the run at another build (a mutation copy).
const server = await serve(process.env.DIST_DIR ? resolve(process.env.DIST_DIR) : `${root}dist`, 0, { pagesStyle404: true });
const browser = await chromium.launch();
const local = (url) => url.startsWith(server.url);

// Opens a page and records every failed local request and console error.
async function open(path, { js = true, width = 1280, height = 900, scheme = 'dark', reduced = false, rewrite } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: js, colorScheme: scheme, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  // Fonts and other third parties are not part of the check; the sandbox may have no route to them.
  await context.route((u) => !u.href.startsWith(server.url) && !u.href.startsWith('data:'), (route) => route.abort());
  const page = await context.newPage();
  page.failed = [];
  page.problems = [];
  page.on('response', (r) => {
    if (local(r.url()) && r.status() >= 400 && !r.url().endsWith(path)) page.failed.push(`${r.status()} ${r.url().replace(server.url, '')}`);
  });
  page.on('pageerror', (e) => page.problems.push(`pageerror: ${e.message}`));
  if (rewrite) {
    await page.route(`${server.url}${path}`, async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: rewrite(await res.text()) });
    });
  }
  const response = await page.goto(server.url + path, { waitUntil: 'load' });
  return { page, response, context };
}

// ---------------------------------------------------------------- redirects: meta refresh, no JavaScript
for (const { url, to } of redirects) {
  const { page, context } = await open(url, { js: false });
  await page.waitForURL((u) => u.pathname === to, { timeout: 5000 }).catch(() => {});
  check('redirects', `${url} -> ${to} with JavaScript off`, new URL(page.url()).pathname === to, new URL(page.url()).pathname);
  await context.close();
}

// ---------------------------------------------------------------- the 404 page
{
  const { page, response, context } = await open('/definitely-not-a-page/');
  check('404', 'an unknown URL answers with status 404', response.status() === 404, String(response.status()));
  const h1 = await page.locator('h1').allInnerTexts();
  check('404', 'one h1, in English, and the Spanish heading is on the page too', h1.length === 1 && /page not found/i.test(h1[0]) && (await page.locator('[lang="es"] h2').innerText()).includes('Página no encontrada'), h1.join('|'));
  const links = await page.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check('404', 'both languages link home and to contact', ['/', '/es/', '/contact/', '/es/contact/'].every((h) => links.includes(h)), links.join(' '));
  check('404', 'noindex, no canonical, no hreflang', (await page.locator('meta[name="robots"][content*="noindex"]').count()) === 1 && (await page.locator('link[rel="canonical"], link[rel="alternate"][hreflang]').count()) === 0);
  check('404', 'no failed local request', page.failed.length === 0, page.failed.join(', '));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('404', 'no horizontal scroll at 1280', overflow <= 0, String(overflow));
  if (shotsAt) {
    await mkdir(shotsAt, { recursive: true });
    await page.screenshot({ path: `${shotsAt}/404-desktop-dark.png`, fullPage: true });
  }
  await context.close();
  for (const [scheme, width] of [['light', 1280], ['dark', 390]]) {
    const o = await open('/no/such/page.html', { scheme, width, height: 844 });
    const over = await o.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('404', `${scheme} ${width}: no horizontal scroll, still the 404 page`, over <= 0 && o.response.status() === 404, String(over));
    if (shotsAt) await o.page.screenshot({ path: `${shotsAt}/404-${width === 390 ? 'mobile' : 'desktop'}-${scheme}.png`, fullPage: true });
    await o.context.close();
  }
}

// ---------------------------------------------------------------- every carried page loads without a failed local request
for (const url of carried.filter((u) => u.endsWith('.html') || u.endsWith('/'))) {
  const { page, response, context } = await open(url);
  await sleep(300);
  check('carried', `${url} loads (200) with no failed local request or page error`, response.status() === 200 && page.failed.length === 0 && page.problems.length === 0, [...page.failed, ...page.problems].join(', '));
  if (shotsAt) {
    const slug = url.replace(/^\//, '').replace(/\/$/, '').replace(/[/.]/g, '-') || 'home';
    await page.addStyleTag({ content: '*{animation-play-state:paused!important}' });
    await page.evaluate(async () => {
      document.querySelectorAll('[data-reveal],.reveal').forEach((e) => e.classList.add('in', 'visible', 'is-visible'));
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await sleep(300);
    await page.screenshot({ path: `${shotsAt}/carried-${slug}.png`, fullPage: true });
  }
  await context.close();
}
// ---------------------------------------------------------------- the investor pages and the cards are noindex in the DOM
// The DOM holds only active tags: a robots tag inside an HTML comment is not there, so this fails on it.
for (const url of noindexPages) {
  const { page, context } = await open(url);
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.getAttribute('content') ?? ''));
  check('noindex', `${url}: an active <meta name="robots"> carries noindex`, robots.some((c) => c.toLowerCase().split(',').map((d) => d.trim()).includes('noindex')), robots.join(' | ') || 'no active robots tag');
  await context.close();
}
for (const url of ['/api.html', '/lead-magnet.html', '/privacy.html', '/terms.html', '/connect.html']) {
  const { page, context } = await open(url);
  // Robots directives are case-insensitive ("NOINDEX" counts), so normalise them exactly as the noindex check above does.
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((el) => el.getAttribute('content') ?? ''));
  const noindex = robots.some((c) => c.toLowerCase().split(',').map((d) => d.trim()).includes('noindex'));
  check('noindex', `${url}: indexable, no active noindex`, !noindex, robots.join(' | ') || 'no active robots tag');
  await context.close();
}

// ---------------------------------------------------------------- the API and legal pages (built Floodlight pages at their old flat URLs)
// They left `carried`, so the load and footer checks that covered them live here: the site footer's links land where they say,
// and the old deep links into the legal pages (#s1 ... #sN) still reach a section.
const flatPages = [
  { url: '/api.html', lang: 'en', sections: 0 },
  { url: '/api-es.html', lang: 'es', sections: 0 },
  { url: '/privacy.html', lang: 'en', sections: 14 },
  { url: '/terms.html', lang: 'en', sections: 17 },
];
for (const { url, lang, sections } of flatPages) {
  const { page, response, context } = await open(url);
  await sleep(300);
  check('flat-pages', `${url}: loads (200) with no failed local request or page error`, response.status() === 200 && page.failed.length === 0 && page.problems.length === 0, [...page.failed, ...page.problems].join(', '));
  check('flat-pages', `${url}: one h1, lang="${lang}", and the URL stays flat (no redirect to a folder)`, (await page.locator('h1').count()) === 1 && (await page.locator('html').getAttribute('lang')) === lang && new URL(page.url()).pathname === url, new URL(page.url()).pathname);
  const hrefs = await page.locator('footer a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/')));
  const prefix = lang === 'es' ? '/es' : '';
  const expected = ['/solutions/athletes/', '/solutions/coaches/', '/platform/programs/', '/about/'].map((p) => `${prefix}${p}`);
  check('flat-pages', `${url}: the site footer carries the Aria 12, Aria for Coaches, Programs and About links`, expected.every((h) => hrefs.includes(h)), hrefs.join(' '));
  for (const href of new Set(hrefs)) {
    const target = new URL(href, server.url);
    const res = await page.goto(target.href, { waitUntil: 'load' });
    await sleep(100);
    const landed = new URL(page.url());
    const frag = target.hash ? await page.evaluate((id) => !!document.getElementById(id), decodeURIComponent(target.hash.slice(1))) : true;
    check('flat-pages', `${url}: ${href} lands on itself (200), with its section if it names one`, res.status() === 200 && landed.pathname === target.pathname && frag, `${res.status()} ${landed.pathname}${landed.hash}`);
  }
  await context.close();
  if (sections) {
    const legal = await open(url);
    const ids = await legal.page.evaluate((n) => Array.from({ length: n }, (_, i) => `s${i + 1}`).filter((id) => !document.getElementById(id)), sections);
    check('flat-pages', `${url}: the old deep links #s1 ... #s${sections} all reach a section`, ids.length === 0, ids.join(' '));
    const toc = await legal.page.locator('[data-toc]').count();
    check('flat-pages', `${url}: the contents list has one entry per section and the text is in the HTML with JavaScript off`, toc === sections, String(toc));
    await legal.context.close();
    const off = await open(url, { js: false });
    const visibleWords = await off.page.locator('[data-v="content"]').innerText().then((t) => t.split(/\s+/).length);
    check('flat-pages', `${url}: the legal text is readable with JavaScript off`, visibleWords > 1500, `${visibleWords} words`);
    await off.context.close();
  }
}

{
  const { page, context } = await open('/connect.html');
  check('carried', 'connect.html: no video element is left pointing at the missing file', (await page.locator('video, [src*="monitors.mp4"], [href*="monitors.mp4"]').count()) === 0);
  await context.close();
}

// ---------------------------------------------------------------- the lead form
const copy = {
  '/lead-magnet.html': { locale: 'en', again: /Get Early Access/ },
  '/lead-magnet-es.html': { locale: 'es', again: /Acceso Anticipado/ },
};

async function toResults(page, locale) {
  await page.locator('.screen.active .btn-primary').first().click();
  await page.locator('#s-role .big-opt[data-value="athlete"]').click();
  await page.locator('#s-sport .big-opt[data-value="tf"]').click();
  for (let i = 0; i < 20; i++) {
    if (await page.locator('#s-results.active').count()) break;
    await page.locator('#q-options .opt').first().click({ timeout: 4000 });
    await page.locator('#next-btn').click();
    await sleep(120);
  }
  await page.locator('#s-results.active').waitFor({ timeout: 4000 });
  await page.locator('#cta-email').fill(`athlete-${locale}@example.com`);
}

const visible = (page, sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden').catch(() => false);

const statusOf = (page) => page.locator('#email-status').innerText({ timeout: 1500 }).then((t) => t.trim(), () => '(no status element)');
const statusLinks = (page) => page.locator('#email-status a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
const directLinks = ['mailto:ian@stadioralabs.com', 'mailto:anthony@stadioralabs.com', 'https://wa.me/50660419069'];

for (const [path, { locale, again }] of Object.entries(copy)) {
  const t = (name) => `${locale}: ${name}`;
  {
    const { page, context } = await open(path);
    const posts = await interceptContact(page, server.url, () => 202);
    await toResults(page, locale);
    const now = Date.now();
    await page.clock.install({ time: new Date(now) });
    await page.clock.pauseAt(new Date(now + 1000));
    await page.clock.runFor(3500);
    await page.evaluate(() => {
      const original = window.fetch;
      let first = true;
      window.fetch = (...args) => {
        if (!first) return original(...args);
        first = false;
        const signal = args[1]?.signal;
        window.__hungContact = { started: Date.now(), aborted: false, elapsed: null };
        return new Promise((_, reject) => {
          signal?.addEventListener('abort', () => {
            window.__hungContact.aborted = true;
            window.__hungContact.elapsed = Date.now() - window.__hungContact.started;
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        });
      };
    });
    await page.locator('.email-row button').click();
    await page.clock.runFor(1);
    const beforeDeadline = await page.evaluate(() => window.__hungContact.started + 14999 - Date.now());
    await page.clock.runFor(beforeDeadline);
    check('lead-form', t('a never-settling fetch remains pending until the 15 s deadline'), await page.locator('.email-row button').isDisabled() && !(await page.evaluate(() => window.__hungContact.aborted)));
    await page.clock.runFor(1);
    const hung = await page.evaluate(() => window.__hungContact);
    const status = await statusOf(page);
    const retry = await page.locator('.email-row button').isEnabled();
    check('lead-form', t('a never-settling fetch is aborted at 15 s with localized failure, direct links and retry'), hung.aborted && hung.elapsed === 15000 && retry && again.test(await page.locator('.email-row button').innerText()) && status.length > 20 && findDeliveryClaims(status, locale).length === 0 && JSON.stringify(await statusLinks(page)) === JSON.stringify(directLinks) && !(await visible(page, '#email-success')), JSON.stringify({ hung, retry, status }));
    if (retry) {
      await page.locator('.email-row button').click();
      await page.clock.runFor(1);
      await page.locator('#email-success').waitFor({ state: 'visible', timeout: 3000 });
    }
    check('lead-form', t('retry after a timed-out request can succeed on 202'), retry && posts.length === 1 && await visible(page, '#email-success'));
    await context.close();
  }
  // Every outcome that is not exactly 202. The first three get their own message; the rest share the "unavailable" one.
  const outcomes = [
    ['HTTP 400', 400],
    ['HTTP 429', 429],
    ['HTTP 503', 503],
    ['HTTP 500', 500],
    ['HTTP 200 with { ok: true }', 200],
    ['HTTP 201', 201],
    ['HTTP 204', 204],
    ['a dropped connection', 'abort'],
  ];

  // A fresh page, jumped straight to the results: the post goes out within a second of opening and must still be held back to 3 s.
  {
    const { page, context } = await open(path);
    const posts = await interceptContact(page, server.url, () => 202);
    await page.locator('.screen.active .btn-primary').first().click();
    await page.locator('#s-role .big-opt[data-value="athlete"]').click();
    await page.locator('#s-sport .big-opt[data-value="tf"]').click();
    await sleep(450);
    await page.evaluate(() => showResults());
    await page.locator('#cta-email').fill(`athlete-${locale}@example.com`);
    await page.locator('.email-row button').click();
    await page.locator('#email-success').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    check('lead-form', t('a post made right after the page opens still waits out the 3 s fill time'), posts.length === 1 && postProblems(posts[0]).length === 0, posts[0] ? postProblems(posts[0]).join('; ') : 'no post');
    await context.close();
  }

  // One page per language: the first post waits out the 3 s fill time, and every later one on the page goes out at once.
  {
    const { page, context } = await open(path);
    const posts = await interceptContact(page, server.url, (_, n) => outcomes[n - 1]?.[1] ?? 202);
    await toResults(page, locale);
    const messages = {};
    for (const [label, outcome] of outcomes) {
      await page.locator('.email-row button').click();
      await page.locator('.email-row button:enabled').waitFor({ timeout: 8000 }).catch(() => {});
      const status = await statusOf(page);
      messages[outcome] = status;
      check('lead-form', t(`${label}: a plain message with the direct contacts, no success`), !(await visible(page, '#email-success')) && findDeliveryClaims(status, locale).length === 0 && status.length > 20, status);
      check('lead-form', t(`${label}: the direct contacts are links in the message`), JSON.stringify(await statusLinks(page)) === JSON.stringify(directLinks), JSON.stringify(await statusLinks(page)));
      check('lead-form', t(`${label}: the form stays and the button is usable again`), (await visible(page, '.email-row')) && (await page.locator('.email-row button').isEnabled()) && again.test(await page.locator('.email-row button').innerText()), await page.locator('.email-row button').innerText());
      if (shotsAt && label === 'HTTP 503') await page.screenshot({ path: `${shotsAt}/lead-form-${locale}-error.png`, fullPage: true });
    }
    check('lead-form', t('a 400, a 429 and a 503 each get their own message'), new Set([messages[400], messages[429], messages[503]]).size === 3, JSON.stringify([messages[400], messages[429], messages[503]]));
    check('lead-form', t('every other non-202 answer reads as the 503 message'), [500, 200, 201, 204, 'abort'].every((o) => messages[o] === messages[503]));
    check('lead-form', t('every post carries the honeypot, an old enough startedAt and only contract fields'), posts.length === outcomes.length && posts.every((p) => postProblems(p, { locale, topic: wireTopic.call, role: 'athlete', email: `athlete-${locale}@example.com` }).length === 0), posts.map((p) => postProblems(p).join('; ')).filter(Boolean)[0] ?? `${posts.length} posts`);
    check('lead-form', t('the role sent is one of the endpoint roles, the page is the path'), posts.every((p) => roles.includes(p.body?.role) && p.body?.page === path), JSON.stringify(posts[0]?.body?.role));

    // The 202 comes last, on the same page: only now does the page say they are on the list.
    check('lead-form', t('before the 202 no success state was ever shown'), !(await visible(page, '#email-success')));
    await page.locator('.email-row button').click();
    await page.locator('#email-success').waitFor({ state: 'visible', timeout: 3000 });
    const gone = !(await visible(page, '.email-row')) && !(await visible(page, '#email-status')) && !(await visible(page, '.privacy-note'));
    check('lead-form', t('HTTP 202 shows the success state and hides the form, note and error'), gone && leadSuccess[locale].test(await page.locator('#email-success').innerText()));
    if (shotsAt) await page.screenshot({ path: `${shotsAt}/lead-form-${locale}-success.png`, fullPage: true });
    await context.close();
  }
}

await browser.close();
await server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\ncutover-checks: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
