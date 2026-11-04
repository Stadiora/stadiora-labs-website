// Browser checks for the cutover pages, run against dist/:
//   npm run build && node scripts/cutover-checks.mjs [--shots <dir>]
// Covers what `npm run verify` cannot see in HTML alone: the redirect stubs land on their targets with JavaScript off,
// the 404 answers unknown URLs with a real 404 status in both languages, the carried pages load without a failed local
// request (the connect.html video was one), and the lead form is honest in every outcome: no endpoint key, an HTTP error,
// `success: false`, a body that is not JSON, a dropped connection, and a real success. `--shots` also writes the screenshots.
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { statusText } from './lib/contact-contract.mjs';
import { serve } from './lib/static-server.mjs';
import { carried, redirects } from './lib/live-urls.mjs';

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
  await context.route((u) => !u.href.startsWith(server.url) && !u.href.startsWith('data:'), (route) => {
    if (route.request().url().startsWith('https://api.web3forms.com/')) return route.fallback();
    return route.abort();
  });
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
{
  const { page, context } = await open('/connect.html');
  check('carried', 'connect.html: no video element is left pointing at the missing file', (await page.locator('video').count()) === 0 && (await page.content()).replace(/<!--[\s\S]*?-->/g, '').includes('monitors.mp4') === false);
  await context.close();
}

// ---------------------------------------------------------------- the lead form
const web3forms = 'https://api.web3forms.com/submit';
const withKey = (html) => html.replace("const WEB3FORMS_KEY = '';", "const WEB3FORMS_KEY = 'test-key';");
const copy = {
  '/lead-magnet.html': { locale: 'en', fail: 'We could not send your request. Try again, or write to anthony@stadioralabs.com.', again: /Get Early Access/ },
  '/lead-magnet-es.html': { locale: 'es', fail: 'No pudimos enviar tu solicitud. Inténtalo de nuevo o escribe a anthony@stadioralabs.com.', again: /Acceso Anticipado/ },
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

for (const [path, { locale, fail, again }] of Object.entries(copy)) {
  const t = (name) => `${locale}: ${name}`;
  const outcomes = [
    ['an HTTP 500 with a JSON body', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"message":"boom"}' })],
    ['HTTP 200 with success: false', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":false}' })],
    ['HTTP 200 with a body that is not JSON', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>maintenance</html>' })],
    ['HTTP 200 with success: "true" (a string)', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true"}' })],
    ['a dropped connection', (route) => route.abort('failed')],
  ];

  // No endpoint key: nothing is posted, nothing is claimed, the email app is the hand-off.
  {
    const { page, context } = await open(path);
    let posted = 0;
    await page.route(web3forms, (route) => {
      posted++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    await toResults(page, locale);
    await page.locator('.email-row button').click();
    await sleep(400);
    const status = await statusOf(page);
    check('lead-form', t('no key: nothing is posted to Web3Forms'), posted === 0, `${posted} requests`);
    check('lead-form', t('no key: the status says the email app opens, with the approved wording'), status === statusText(locale), status);
    check('lead-form', t('no key: the success state is never shown'), !(await visible(page, '#email-success')));
    check('lead-form', t('no key: the form stays usable'), (await visible(page, '.email-row')) && (await page.locator('.email-row button').isEnabled()));
    if (shotsAt) await page.screenshot({ path: `${shotsAt}/lead-form-${locale}-no-key.png`, fullPage: true });
    await context.close();
  }

  for (const [label, handler] of outcomes) {
    const { page, context } = await open(path, { rewrite: withKey });
    await page.route(web3forms, handler);
    await toResults(page, locale);
    await page.locator('.email-row button').click();
    await sleep(500);
    const status = await statusOf(page);
    check('lead-form', t(`${label}: a real error, no success`), status === fail && !(await visible(page, '#email-success')), status);
    check('lead-form', t(`${label}: the button is usable again`), (await page.locator('.email-row button').isEnabled()) && again.test(await page.locator('.email-row button').innerText()), await page.locator('.email-row button').innerText());
    if (shotsAt && label.startsWith('an HTTP 500')) await page.screenshot({ path: `${shotsAt}/lead-form-${locale}-error.png`, fullPage: true });
    await context.close();
  }

  // A real success, after a failure: only now does the page say they are on the list.
  {
    const { page, context } = await open(path, { rewrite: withKey });
    let calls = 0;
    let sent;
    await page.route(web3forms, (route) => {
      calls++;
      sent = route.request().postDataJSON();
      if (calls === 1) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    await toResults(page, locale);
    await page.locator('.email-row button').click();
    await sleep(400);
    check('lead-form', t('a failure first leaves no success on the page'), !(await visible(page, '#email-success')));
    await page.locator('.email-row button').click();
    await page.locator('#email-success').waitFor({ state: 'visible', timeout: 3000 });
    const gone = !(await visible(page, '.email-row')) && !(await visible(page, '#email-status')) && !(await visible(page, '.privacy-note'));
    check('lead-form', t('HTTP 200 with success: true shows the success state and hides the form, note and error'), gone);
    check('lead-form', t('the request carries the key, the email and the product'), calls === 2 && sent?.access_key === 'test-key' && sent?.email === `athlete-${locale}@example.com` && /Aria/.test(sent?.product ?? ''), JSON.stringify({ ...sent, message: undefined }));
    if (shotsAt) await page.screenshot({ path: `${shotsAt}/lead-form-${locale}-success.png`, fullPage: true });
    await context.close();
  }
}

await browser.close();
await server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\ncutover-checks: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
