// Contrast of the AI program demo that sits on the programs page (the shared home AiProgram), measured the way a reader meets it.
//   - Canary: the probe is run again with a deliberate white-on-white title in the calendar card. It has to fail on that
//     title; if the demo is ever skipped (an exclusion, a [data-decorative] on the stage) the canary passes silently and fails here.
//   - Timeline: the demo is a timeline of cards that fade in and out, so the rest state shows only some of its text. The
//     timeline is paused and seeked through its whole length, and every frame is measured.
import { contrastProbe } from './contrast.mjs';

const locales = ['en', 'es'];
const stage = '.ai-stage';

export async function coachAiContrastChecks({ open, check, sleep, settle }) {
  for (const locale of locales) {
    const path = `${locale === 'es' ? '/es' : ''}/platform/programs/`;
    const tag = `${locale}/programs`;

    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 1440, height: 900, scheme, reduced: true }, path);
      await settle(page);
      const base = await page.evaluate(contrastProbe, { includeAriaHidden: true, scope: stage });
      check('coach-contrast', `${tag} ${scheme}: the AI demo stage is measured (${base.checked} text nodes) and meets AA`, base.checked >= 20 && base.failCount === 0, `lowest ${base.min.toFixed(2)}:1${base.failCount ? `, failing: ${JSON.stringify(base.fails)}` : ''}`);
      await page.addStyleTag({ content: '.ai-cal .cal-hd > b{color:#fff!important}' });
      const title = await page.evaluate(() => document.querySelector('.ai-cal .cal-hd > b')?.textContent ?? '');
      const bad = await page.evaluate(contrastProbe, { includeAriaHidden: true });
      check('coach-contrast', `${tag} ${scheme} canary: white text on the calendar card title fails the probe`, title !== '' && bad.fails.some((f) => f.text === title), `injected on "${title}", probe reported ${JSON.stringify(bad.fails.map((f) => `${f.text} ${f.ratio}:1`))}`);
      await page.context().close();
    }

    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 1440, height: 900, scheme }, path);
      await settle(page);
      const host = page.locator('[data-tl-host="ai"]');
      await host.scrollIntoViewIfNeeded();
      // A hidden tab parks the autoplayer (a mouse pointer does not), so the paused animations are not restarted while they are measured.
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await sleep(400);
      const total = await page.evaluate(() =>
        Math.max(0, ...document.getAnimations().filter((a) => a.effect?.target && document.querySelector('[data-tl-host="ai"]').contains(a.effect.target)).map((a) => Number(a.effect.getTiming().duration)).filter(Number.isFinite)),
      );
      const fails = new Map();
      let frames = 0;
      let lowest = Infinity;
      let seen = 0;
      for (let t = 0; t <= total / 1000 + 0.5; t += 0.75) {
        await page.evaluate((ms) => {
          for (const a of document.getAnimations()) {
            if (a.effect?.target && document.querySelector('[data-tl-host="ai"]').contains(a.effect.target)) {
              a.pause();
              a.currentTime = ms;
            }
          }
        }, t * 1000);
        await sleep(120);
        const c = await page.evaluate(contrastProbe, { includeAriaHidden: true, scope: '[data-tl-host="ai"]' });
        frames++;
        seen = Math.max(seen, c.checked);
        lowest = Math.min(lowest, c.min);
        for (const f of c.fails) fails.set(`${f.text} ${f.ratio}:1 at ${t.toFixed(2)}s`, f);
      }
      check('coach-contrast', `${tag} ${scheme}: every frame of the AI demo timeline meets AA (${frames} frames over ${(total / 1000).toFixed(1)} s)`, total > 3000 && fails.size === 0, `up to ${seen} text nodes per frame, lowest ${Number.isFinite(lowest) ? lowest.toFixed(2) : 'n/a'}:1${fails.size ? `, failing: ${[...fails.keys()].slice(0, 6).join('; ')}` : ''}`);
      await page.context().close();
    }
  }
}
