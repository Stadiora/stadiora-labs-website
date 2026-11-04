// Review evidence for the five Platform pages (R57 VB-3): settled stills and slow-scroll motion recordings.
//   npm run build && node scripts/capture-engage-evidence.mjs --out ../../evidence-out [--stills] [--motion] [--no-encode]
// Stills: each page at 1440x900 and 390x844, EN and ES, light and dark, the whole page plus the hero and every
// `main > section` (reduced motion, so every stage shows its finished frame and every clip its poster).
// Motion: Playwright recordVideo of a full slow scroll with motion on, one MP4 per page at 1440x900 and one phone
// recording at 390x844 (ENGAGE_PHONE=slug picks the page, default messaging), encoded with ffmpeg. Not part of `npm run evidence`.
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './lib/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const flag = (name) => process.argv.includes(name);
const out = arg('--out', `${root}.evidence/engage`);
const wantStills = flag('--stills') || !flag('--motion');
const wantMotion = flag('--motion') || !flag('--stills');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pages = [
  ['messaging', 'messaging'],
  ['guardian-portal', 'guardian'],
  ['teams', 'teams'],
  ['custom-branded-apps', 'branded'],
  ['integrations', 'integrations'],
];
const only = process.env.ENGAGE_ONLY?.split(',');
const selected = pages.filter(([slug]) => !only || only.includes(slug));
const pathFor = (slug, locale) => `${locale === 'en' ? '' : '/es'}/platform/${slug}/`;

await mkdir(out, { recursive: true });
const server = await serve(`${root}dist`);
const browser = await chromium.launch();

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
  await sleep(700);
}

// Ease to a y position, then let the stage run.
const scrollTo = (page, selector, offset = 70, minMs = 1800) =>
  page.evaluate(
    ([sel, off, min]) =>
      new Promise((resolve) => {
        const el = document.querySelector(sel);
        const target = el ? el.getBoundingClientRect().top + scrollY - off : document.body.scrollHeight;
        const from = scrollY;
        const dur = Math.min(3200, Math.max(min, Math.abs(target - from) * 1.1));
        const t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
        const step = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          window.scrollTo(0, from + (target - from) * ease(t));
          t < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
      }),
    [selector, offset, minMs],
  );

if (wantStills) {
  for (const locale of ['en', 'es']) {
    for (const scheme of ['light', 'dark']) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        for (const [slug, name] of selected) {
          const dir = `${out}/stills/${name}/${locale}-${scheme}-${width}`;
          await mkdir(dir, { recursive: true });
          const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500 });
          const page = await context.newPage();
          await page.goto(server.url + pathFor(slug, locale), { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          await settle(page);
          await page.screenshot({ path: `${dir}/00-full.jpg`, fullPage: true, type: 'jpeg', quality: 86 });
          await page.locator('main > section').first().screenshot({ path: `${dir}/01-hero.jpg`, type: 'jpeg', quality: 88 });
          // The nav is fixed, so it would float over the heading of every later section frame: hide it for those.
          await page.addStyleTag({ content: '.nav, .skip-link { visibility: hidden !important; }' });
          const count = await page.locator('main > section').count();
          for (let i = 1; i < count; i++) await page.locator('main > section').nth(i).screenshot({ path: `${dir}/${String(i + 1).padStart(2, '0')}-section.jpg`, type: 'jpeg', quality: 88 });
          await page.locator('footer').screenshot({ path: `${dir}/99-footer.jpg`, type: 'jpeg', quality: 88 });
          await context.close();
          console.log(`stills ${name} ${locale} ${scheme} ${width} (${count} sections)`);
        }
      }
    }
  }
}

if (wantMotion) {
  const jobs = selected.map(([slug, name]) => [slug, name, 'desktop', 1440, 900, false]);
  const phone = process.env.ENGAGE_PHONE ?? 'messaging';
  const [pslug, pname] = pages.find(([s, n]) => s === phone || n === phone) ?? pages[0];
  if (!only || only.includes(pslug)) jobs.push([pslug, pname, 'phone', 390, 844, true]);
  for (const [slug, name, kind, width, height, mobile] of jobs) {
    const dir = `${out}/rec-${name}-${kind}`;
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light', deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, recordVideo: { dir, size: { width, height } } });
    const page = await context.newPage();
    await page.goto(server.url + pathFor(slug, 'en'), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await sleep(4000); // hero first
    // Each section in turn: ease to its top, dwell so its autoplayers and clips run, then go on.
    const count = await page.locator('main > section').count();
    for (let i = 1; i < count; i++) {
      await scrollTo(page, `main > section:nth-of-type(${i + 1})`);
      await sleep(5500);
    }
    await scrollTo(page, 'footer', 0);
    await sleep(2500);
    const video = page.video();
    await context.close();
    const webm = await video.path();
    const base = `${out}/${name}-${kind}`;
    await rename(webm, `${base}.webm`);
    await rm(dir, { recursive: true, force: true });
    if (!flag('--no-encode')) {
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${base}.webm`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-an', `${base}.mp4`], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('ffmpeg failed');
      await rm(`${base}.webm`);
    }
    console.log(`motion ${name} ${kind} done (${count} sections)`);
  }
}

await browser.close();
await server.close();
console.log(`evidence written to ${out}`);
console.log((await readdir(out)).join('\n'));
