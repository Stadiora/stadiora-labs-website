// Section crops for the evidence comment: hero, first dark stage and the closing band of each coach page,
// EN and ES, light and dark, 1440 and 390, reduced motion (finished frames, clips show their poster).
import { mkdir } from 'node:fs/promises';
import { chromium } from '/data/ianrowe/worktrees/coach/web/node_modules/playwright/index.mjs';
import { serve } from '/data/ianrowe/worktrees/coach/web/scripts/lib/static-server.mjs';

const [, , out] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(out, { recursive: true });
const server = await serve('/data/ianrowe/worktrees/coach/web/dist');
const browser = await chromium.launch();
const picks = [
  ['hero', 'main section.cf-hero'],
  ['stage', 'main section.cf-stage'],
  ['final', 'main section.final'],
];
for (const slug of ['programs', 'nutrition', 'readiness', 'power-lab']) {
  for (const locale of ['en', 'es']) {
    for (const scheme of ['light', 'dark']) {
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        const mobile = width < 500;
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
        const page = await context.newPage();
        await page.goto(`${server.url}${locale === 'es' ? '/es' : ''}/platform/${slug}/`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(async () => {
          document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager'));
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 70));
          }
          await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
          scrollTo(0, 0);
        });
        await sleep(700);
        for (const [name, sel] of picks) {
          if (name !== 'hero') await page.addStyleTag({ content: '.nav, .skip-link { visibility: hidden !important; }' });
          await page.locator(sel).first().screenshot({ path: `${out}/${slug}-${locale}-${scheme}-${width}-${name}.png` });
        }
        await context.close();
      }
    }
  }
  console.log('crops', slug);
}
await browser.close();
await server.close();
