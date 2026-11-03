// Review evidence for the home page: settled screenshots of every section and a slow-scroll motion recording.
//   npm run build && node scripts/capture-evidence.mjs --out ../../evidence-out [--stills] [--motion] [--no-encode]
// Stills: 1440x900 and 390x844, EN and ES, light and dark, `main > section` one by one plus the full page (reduced
// motion, so every stage shows its finished frame and every clip its poster). Motion: Playwright recordVideo of a full
// slow scroll with motion on, at 1440x900 and 390x844 in English plus 1440x900 in Spanish, encoded to MP4 with ffmpeg.
// Not part of `npm run evidence`.
import { spawnSync } from 'node:child_process';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { homeSections } from './lib/home-checks.mjs';
import { serve } from './lib/static-server.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const flag = (name) => process.argv.includes(name);
const out = arg('--out', `${root}.evidence/pr`);
const wantStills = flag('--stills') || !flag('--motion');
const wantMotion = flag('--motion') || !flag('--stills');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(out, { recursive: true });
const server = await serve(`${root}dist`);
const browser = await chromium.launch();
const pathFor = (locale) => (locale === 'en' ? '/' : '/es/');

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
  await sleep(600);
}

if (wantStills) {
  for (const locale of ['en', 'es']) {
    for (const scheme of ['light', 'dark']) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        const dir = `${out}/stills/${locale}-${scheme}-${width}`;
        await mkdir(dir, { recursive: true });
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500 });
        const page = await context.newPage();
        await page.goto(server.url + pathFor(locale), { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await settle(page);
        await page.screenshot({ path: `${dir}/00-full.png`, fullPage: true });
        await page.locator('main > section#hero').screenshot({ path: `${dir}/01-hero.png` });
        // The nav is fixed, so it would float over the heading of every later section frame: hide it (and the skip link) for those.
        await page.addStyleTag({ content: '.nav, .skip-link { visibility: hidden !important; }' });
        for (const [i, id] of homeSections.entries()) {
          if (id === 'hero') continue;
          await page.locator(`main > section#${id}`).screenshot({ path: `${dir}/${String(i + 1).padStart(2, '0')}-${id}.png` });
        }
        // The showcase is six stacked blocks; each gets its own frame next to the (very tall) whole section.
        for (const [j, [name, sel]] of [['head', '#showcase .show-head'], ['mosaic', '#showcase .mosaic'], ['plan', '#plan'], ['measure', '#measure'], ['engage', '#engage'], ['scale', '#scale'], ['apps', '#apps']].entries()) {
          await page.locator(sel).first().screenshot({ path: `${dir}/05${'abcdefg'[j]}-showcase-${name}.png` });
        }
        await page.locator('footer').screenshot({ path: `${dir}/08-footer.png` });
        await context.close();
        console.log(`stills ${locale} ${scheme} ${width}`);
      }
    }
  }
}

if (wantMotion) {
  for (const [name, width, height, mobile, locale = 'en'] of [['desktop', 1440, 900, false], ['phone', 390, 844, true], ['desktop-es', 1440, 900, false, 'es']]) {
    const dir = `${out}/motion-${name}`;
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light', deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, recordVideo: { dir, size: { width, height } } });
    const page = await context.newPage();
    await page.goto(server.url + pathFor(locale), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await sleep(3500); // hero first
    // Ease to the top of each section, then dwell so its autoplayers and clips run.
    for (const id of homeSections.slice(1)) {
      await page.evaluate(
        (sel) =>
          new Promise((resolve) => {
            const target = document.querySelector(sel).getBoundingClientRect().top + scrollY - 70;
            const from = scrollY;
            const dur = Math.min(3200, Math.max(1800, Math.abs(target - from) * 1.1));
            const t0 = performance.now();
            const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
            const step = (now) => {
              const t = Math.min(1, (now - t0) / dur);
              window.scrollTo(0, from + (target - from) * ease(t));
              t < 1 ? requestAnimationFrame(step) : resolve();
            };
            requestAnimationFrame(step);
          }),
        `main > section#${id}`,
      );
      await sleep(id === 'showcase' ? 2500 : id === 'pillars' ? 7000 : 5500); // the pillars dwell is one tab: its cards play in full
      if (id === 'showcase') {
        // The showcase is five stacked stages: walk through them slowly.
        for (const sub of ['plan', 'measure', 'engage', 'scale', 'apps']) {
          const found = await page.evaluate(
            (sel) =>
              new Promise((resolve) => {
                const el = document.querySelector(sel);
                if (!el) return resolve(false);
                const target = el.getBoundingClientRect().top + scrollY - 90;
                const from = scrollY;
                const dur = 1800;
                const t0 = performance.now();
                const step = (now) => {
                  const t = Math.min(1, (now - t0) / dur);
                  window.scrollTo(0, from + (target - from) * (t * t * (3 - 2 * t)));
                  t < 1 ? requestAnimationFrame(step) : resolve(true);
                };
                requestAnimationFrame(step);
              }),
            `#showcase #${sub}`,
          );
          if (found) await sleep(5500);
        }
      }
    }
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await sleep(3000);
    const video = page.video();
    await context.close();
    const webm = await video.path();
    await rename(webm, `${out}/home-${name}.webm`);
    await rm(dir, { recursive: true, force: true });
    if (!flag('--no-encode')) {
      const mp4 = `${out}/home-${name}.mp4`;
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${out}/home-${name}.webm`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
      if (r.status !== 0) throw new Error('ffmpeg failed');
      await rm(`${out}/home-${name}.webm`);
    }
    console.log(`motion ${name} done`);
  }
}

await browser.close();
await server.close();
console.log(`evidence written to ${out}`);
const files = await readdir(out);
console.log(files.join('\n'));
