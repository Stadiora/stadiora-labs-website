// Slow-scroll motion recordings of the four coach pages (EN, light, live motion), Playwright recordVideo -> MP4.
//   node record.mjs <outDir> [desktop|phone]
import { spawnSync } from 'node:child_process';
import { mkdir, rename, rm } from 'node:fs/promises';
import { chromium } from '/data/ianrowe/worktrees/coach/web/node_modules/playwright/index.mjs';
import { serve } from '/data/ianrowe/worktrees/coach/web/scripts/lib/static-server.mjs';

const [, , out, which = 'desktop'] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(out, { recursive: true });
const server = await serve('/data/ianrowe/worktrees/coach/web/dist');
const browser = await chromium.launch();

const jobs = which === 'phone' ? [['programs', 390, 844, true]] : ['programs', 'nutrition', 'readiness', 'power-lab'].map((s) => [s, 1440, 900, false]);

const ease = (page, sel, offset) =>
  page.evaluate(
    ([sel, offset]) =>
      new Promise((resolve) => {
        const el = document.querySelector(sel);
        if (!el) return resolve(false);
        const target = Math.max(0, el.getBoundingClientRect().top + scrollY - offset);
        const from = scrollY;
        const dur = Math.min(3200, Math.max(1800, Math.abs(target - from) * 1.1));
        const t0 = performance.now();
        const e = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
        const step = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          scrollTo(0, from + (target - from) * e(t));
          t < 1 ? requestAnimationFrame(step) : resolve(true);
        };
        requestAnimationFrame(step);
      }),
    [sel, offset],
  );

for (const [slug, width, height, mobile] of jobs) {
  const name = `${slug}-${mobile ? 'phone' : 'desktop'}`;
  const dir = `${out}/.rec-${name}`;
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light', deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, recordVideo: { dir, size: { width, height } } });
  const page = await context.newPage();
  await page.goto(`${server.url}/platform/${slug}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await sleep(4000); // hero first: the clip, the chips and the headline run
  const count = await page.evaluate(() => document.querySelectorAll('main > div > section, main > section, main section.cf-stage, main section.cf-sec, main section.final').length);
  const ids = await page.evaluate(() => [...document.querySelectorAll('main section')].map((s, i) => (s.id ? `#${s.id}` : null) ?? (s.setAttribute('data-rec', String(i)), `[data-rec="${i}"]`)));
  for (const sel of ids.slice(1)) {
    if (!(await ease(page, sel, mobile ? 70 : 70))) continue;
    await sleep(2500);
    const acc = page.locator(`${sel} [data-accordion] .acc__btn`);
    const n = await acc.count();
    for (let i = 0; i < n; i++) {
      await acc.nth(i).click({ timeout: 2000 }).catch(() => {});
      await sleep(1700);
    }
    const hrc = page.locator(`${sel} [data-hrc]`);
    const h = mobile ? 0 : await hrc.count();
    for (let i = 0; i < h; i++) {
      await hrc.nth(i).hover({ timeout: 2000 }).catch(() => {});
      await sleep(1500);
    }
    if (h) await page.mouse.move(4, 4);
    await sleep(n || h ? 1200 : 3000);
  }
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await sleep(3000);
  const video = page.video();
  await context.close();
  const webm = await video.path();
  const mp4 = `${out}/coach-${name}.mp4`;
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  await rm(dir, { recursive: true, force: true });
  console.log(`recorded ${mp4} (${count} blocks)`);
}
await browser.close();
await server.close();
