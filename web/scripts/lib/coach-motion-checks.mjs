// Hover and focus pause for the coach pages' moving stages, measured on what is rendered.
//   A stage is every [data-cf-stage] unit (hero media frame, accordion with its buttons, scan stage, plan-to-phone link,
//   step flow). For each one the check samples the rendered value of every property an endless CSS loop inside it animates
//   (plus the box of the element and the time of every clip inside), waits, and samples again:
//     - running: the stage must move (the positive control, so a stage that never moved cannot pass as "paused");
//     - mouse over it, over its controls, or with focus inside it: nothing may move, not a loop and not a clip;
//     - after the pointer and focus leave: it must move again.
//   Reading getAnimations().playState instead would pass a loop that a transform override keeps moving, so only
//   rendered values count. A second check lists every endless loop under <main> and fails any that sits outside a stage.
import { coachSlugs } from './platform-coach-verify.mjs';

const locales = ['en', 'es'];
const pathOf = (slug, locale) => `${locale === 'es' ? '/es' : ''}/platform/${slug}/`;

// Foundation decoration that belongs to the shared page chrome, not to a coach stage: the mesh and grain behind the page, the
// orbit lines, and the shifting colour of a headline. Timelines that the kit's group() drives pause themselves (data-tl-host).
const chrome = '.mesh, .orbits, .grad-text, [data-tl-host]';

// In the browser: the rendered state of one stage. Keys name the loop, values are what it currently renders.
const sample = ([idx, sel]) => {
  const host = document.querySelectorAll(sel)[idx];
  const out = {};
  const skip = new Set(['offset', 'easing', 'composite', 'computedOffset']);
  const name = (t, pseudo) => `${t.tagName.toLowerCase()}.${String(t.className?.baseVal ?? t.className).split(/\s+/)[0]}${pseudo ?? ''}`;
  for (const a of document.getAnimations()) {
    const e = a.effect;
    const t = e?.target;
    if (!t || e.getComputedTiming().iterations !== Infinity || !host.contains(t)) continue;
    const pseudo = e.pseudoElement || null;
    const cs = getComputedStyle(t, pseudo);
    const props = new Set(e.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !skip.has(p))));
    const rendered = [...props].map((p) => (p.startsWith('--') ? cs.getPropertyValue(p) : cs[p])).join('|');
    const r = pseudo ? null : t.getBoundingClientRect();
    out[`${a.animationName} on ${name(t, pseudo)}`] = `${rendered}${r ? `|${r.x.toFixed(2)},${r.y.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}` : ''}`;
  }
  for (const v of host.querySelectorAll('video')) out[`clip ${v.currentSrc.split('/').pop() || 'video'}`] = `${v.currentTime.toFixed(3)}${v.paused ? ' paused' : ''}`;
  return out;
};

const moved = (a, b) => Object.keys(b).filter((k) => a[k] !== b[k]);

export async function coachMotionChecks({ open, check, sleep, settle, metrics }) {
  const SEL = '[data-cf-stage]';
  for (const locale of locales) {
    for (const slug of coachSlugs) {
      const tag = `${locale}/${slug}`;
      const page = await open({ width: 1440, height: 900 }, pathOf(slug, locale));
      await settle(page);
      const stages = await page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => ({ name: e.dataset.cfStage, controls: e.querySelectorAll('button, a[href], input, [tabindex="0"]').length, acc: e.matches('[data-accordion]') })), SEL);
      check('coach-motion', `${tag}: the page declares its moving stages`, stages.length > 0, `${stages.length} stages: ${stages.map((s) => s.name).join(', ')}`);

      for (let i = 0; i < stages.length; i++) {
        const st = stages[i];
        const label = `${tag} ${st.name}`;
        const take = () => page.evaluate(sample, [i, SEL]);
        const idle = async () => {
          await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
          await page.mouse.move(2, 2);
          await sleep(250);
        };
        const park = async () => {
          await page.locator(SEL).nth(i).evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.waitForFunction(([s, k]) => document.querySelectorAll(s)[k]?.dataset.ap === 'on', [SEL, i], { timeout: 4000 }).catch(() => {});
          // Count-ups and reveal transitions are one-shot; let them finish so only loops and clips can move.
          await page.waitForFunction(([s, k]) => [...document.querySelectorAll(s)[k].querySelectorAll('video')].every((v) => v.readyState >= 2 && v.currentTime > 0), [SEL, i], { timeout: 5000 }).catch(() => {});
          await sleep(2200);
        };
        const interval = 1200;
        // One measurement: sample, wait, sample, and report what moved between the two.
        const measure = async () => {
          const a = await take();
          await sleep(interval);
          const b = await take();
          return { keys: Object.keys(b), moved: moved(a, b) };
        };

        await idle();
        await park();
        const run = await measure();
        check('coach-motion', `${label}: runs while on screen with no pointer or focus (positive control)`, run.moved.length > 0, `${run.keys.length} loops/clips, moving: ${run.moved.join(', ') || 'none'}`);
        const live = new Set(run.moved);

        // Mouse over the stage, and over each distinct surface the user can reach inside it (the accordion's buttons and its stage).
        const host = page.locator(SEL).nth(i);
        const targets = st.acc ? [['its first button', host.locator('.acc__btn').first()], ['its last button', host.locator('.acc__btn').last()], ['its stage', host.locator('.acc__stage')]] : [['the stage', host]];
        for (const [what, loc] of targets) {
          await idle();
          const box = await loc.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
          await sleep(250);
          const hov = await measure();
          const frozen = hov.moved.filter((k) => live.has(k));
          check('coach-motion', `${label}: mouse over ${what} stops every loop and clip in it`, frozen.length === 0, frozen.length ? `still moving: ${frozen.join(', ')}` : `${hov.keys.length} loops/clips held still for ${interval} ms`);
        }

        // Keyboard focus on a control inside the stage.
        if (st.controls > 0) {
          await idle();
          await page.locator(SEL).nth(i).locator('button, a[href], input, [tabindex="0"]').first().focus();
          await sleep(250);
          const foc = await measure();
          const frozen = foc.moved.filter((k) => live.has(k));
          check('coach-motion', `${label}: focus on a control inside it stops every loop and clip in it`, frozen.length === 0, frozen.length ? `still moving: ${frozen.join(', ')}` : `${foc.keys.length} loops/clips held still for ${interval} ms`);
        }

        // Leaving the stage resumes it.
        await idle();
        const back = await measure();
        const resumed = [...live].filter((k) => back.moved.includes(k));
        check('coach-motion', `${label}: moves again once the pointer and focus leave`, resumed.length > 0, `resumed: ${resumed.join(', ') || 'none'}`);
        metrics[`coach-motion-stage-${slug}-${locale}-${i}`] = { loops: run.keys.length, moving: run.moved.length };
      }

      // Every endless loop in the page's content belongs to a stage (or to the shared chrome), so nothing new can escape the pause.
      const loose = await page.evaluate(
        ([s, c]) =>
          [
            ...new Set(
              document
                .getAnimations()
                .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.('main'))
                .filter((a) => !a.effect.target.closest(s) && !a.effect.target.closest(c))
                .map((a) => `${a.animationName} on ${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className?.baseVal ?? a.effect.target.className).split(/\s+/)[0]}`),
            ),
          ],
        [SEL, chrome],
      );
      check('coach-motion', `${tag}: every endless loop in the page content sits inside a stage that pauses`, loose.length === 0, loose.length ? `outside any stage: ${loose.join(', ')}` : 'none outside');
      await page.context().close();
    }
  }
}
