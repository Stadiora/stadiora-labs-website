// Review evidence for the Solutions, Resources, About and Contact pages: settled screenshots and slow-scroll recordings.
//   npm run build && node scripts/capture-solutions-evidence.mjs --out ../../evidence-out [--stills] [--motion] [--no-encode]
// Stills: every page at 1440x900 and 390x844, EN and ES, light and dark, full page, reduced motion (every stage shows its finished
// frame, every clip its poster). Motion: Playwright recordVideo of a slow full scroll with motion on, every page (EN, light) at
// 1440x900 and 390x844, encoded to MP4 with ffmpeg. The Contact recording also drives the topic control, a field focus and a
// submit. Not part of `npm run evidence`.
import { spawnSync } from 'node:child_process';
import { mkdir, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { serve } from './lib/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const flag = (name) => process.argv.includes(name);
const out = arg('--out', `${root}.evidence/pr`);
const only = arg('--only', '');
const wantStills = flag('--stills') || !flag('--motion');
const wantMotion = flag('--motion') || !flag('--stills');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const pages = [
  ['schools', '/solutions/schools/'],
  ['coaches', '/solutions/coaches/'],
  ['clubs', '/solutions/teams-and-clubs/'],
  ['athletes', '/solutions/athletes/'],
  ['case-studies', '/resources/case-studies/'],
  ['about', '/about/'],
  ['contact', '/contact/'],
].filter(([name]) => !only || only.split(',').includes(name));
const localized = (locale, path) => (locale === 'es' ? `/es${path}` : path);

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

const scrollTo = (page, target, dur) =>
  page.evaluate(
    ([to, ms]) =>
      new Promise((resolve) => {
        const from = scrollY;
        const t0 = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - t0) / ms);
          window.scrollTo(0, from + (to - from) * (t * t * (3 - 2 * t)));
          t < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
      }),
    [target, dur],
  );

if (wantStills) {
  for (const [name, path] of pages) {
    for (const locale of ['en', 'es']) {
      for (const scheme of ['light', 'dark']) {
        for (const [width, height] of [[1440, 900], [390, 844]]) {
          const dir = `${out}/stills/${name}`;
          await mkdir(dir, { recursive: true });
          const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500 });
          const page = await context.newPage();
          await page.goto(server.url + localized(locale, path), { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          await settle(page);
          await page.screenshot({ path: `${dir}/${locale}-${scheme}-${width}.png`, fullPage: true });
          await context.close();
        }
      }
    }
    console.log(`stills ${name}`);
  }
}

if (wantMotion) {
  for (const [name, path] of pages) {
    for (const [size, width, height, mobile] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
      const dir = `${out}/motion-tmp-${process.pid}`;
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light', deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, recordVideo: { dir, size: { width, height } } });
      const page = await context.newPage();
      await page.goto(server.url + path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(5, 5);
      await sleep(5200); // hero first: the headline reveal, the swap line and the mesh
      const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const step = Math.round(height * 0.62);
      for (let y = step; y < total; y += step) {
        await scrollTo(page, y, 1700);
        await sleep(2300);
      }
      await scrollTo(page, total, 1700);
      await sleep(2800);
      if (name === 'contact') {
        await scrollTo(page, 0, 1800);
        await sleep(900);
        const form = page.locator('#contact-form');
        await form.scrollIntoViewIfNeeded();
        await sleep(700);
        await page.locator('.seg__opt:has(#topic-question)').click();
        await sleep(1200);
        await page.locator('.seg__opt:has(#topic-demo)').click();
        await sleep(1200);
        await page.focus('#f-name');
        await sleep(900);
        await page.fill('#f-name', 'Ana López');
        await page.fill('#f-email', 'ana@escuela.example');
        await page.selectOption('#f-role', { index: 1 });
        await sleep(700);
        const buttonTop = await page.evaluate(() => document.querySelector('#contact-form button[type="submit"]').getBoundingClientRect().top + scrollY);
        await scrollTo(page, Math.max(0, buttonTop - height * 0.36), 1200);
        await sleep(600);
        await page.locator('#contact-form button[type="submit"]').click();
        await sleep(4500);
      }
      const video = page.video();
      await context.close();
      const webm = await video.path();
      const base = `${out}/${name}-${size}`;
      await rename(webm, `${base}.webm`);
      await rm(dir, { recursive: true, force: true });
      if (!flag('--no-encode')) {
        const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${base}.webm`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-an', `${base}.mp4`], { stdio: 'inherit' });
        if (r.status !== 0) throw new Error('ffmpeg failed');
        await rm(`${base}.webm`);
      }
      console.log(`motion ${name} ${size} done`);
    }
  }
}

await browser.close();
await server.close();
console.log(`evidence written to ${out}`);
