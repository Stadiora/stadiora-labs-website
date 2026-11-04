// Renders the Platform "Coach" clip stages (scripts/clips/stages/*.html) to the home media trio:
// name.webm (VP9) + name.mp4 (H.264) + name.webp (poster) in public/home/media/.
// Every CSS animation is seeked per frame, so the render is deterministic and the loop is seamless.
// usage: node scripts/clips/render.mjs [name ...]   (no names = all four)   [--dur 8] [--fps 30]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../public/home/media');
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf('--' + k);
  return i >= 0 ? args[i + 1] : d;
};
const dur = +opt('dur', 8);
const fps = +opt('fps', 30);
const skip = new Set(args.flatMap((a, i) => (a.startsWith('--') ? [i, i + 1] : [])));
const names = args.filter((_, i) => !skip.has(i));
const all = ['coach-programs', 'coach-nutrition', 'coach-readiness', 'coach-powerlab'];
const todo = names.length ? names : all;

const tmpRoot = process.env.TMPDIR || os.tmpdir();
const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
for (const name of todo) {
  const frames = fs.mkdtempSync(path.join(tmpRoot, `clip-${name}-`));
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(pathToFileURL(path.join(here, 'stages', `${name}.html`)).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const n = Math.round(dur * fps);
  for (let f = 0; f < n; f++) {
    const t = (f / fps) * 1000;
    await page.evaluate(async (ms) => {
      document.getAnimations().forEach((a) => {
        a.pause();
        a.currentTime = ms;
      });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    await page.screenshot({ path: path.join(frames, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  const src = ['-y', '-framerate', String(fps), '-i', path.join(frames, '%05d.jpg')];
  const q = { stdio: 'ignore' };
  execFileSync('ffmpeg', [...src, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(OUT, `${name}.mp4`)], q);
  execFileSync('ffmpeg', [...src, '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', path.join(OUT, `${name}.webm`)], q);
  const poster = path.join(frames, `${String(Math.round(n * 0.4)).padStart(5, '0')}.jpg`);
  execFileSync('ffmpeg', ['-y', '-i', poster, '-vf', 'scale=960:-2', '-c:v', 'libwebp', '-quality', '62', path.join(OUT, `${name}.webp`)], q);
  fs.rmSync(frames, { recursive: true, force: true });
  const kb = (ext) => (fs.statSync(path.join(OUT, `${name}.${ext}`)).size / 1024).toFixed(0) + ' KB';
  console.log(name, `${n} frames`, 'webm', kb('webm'), 'mp4', kb('mp4'), 'poster', kb('webp'));
  await page.context().close();
}
await browser.close();
