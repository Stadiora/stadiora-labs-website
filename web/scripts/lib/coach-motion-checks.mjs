// Pointer, click and focus behaviour of the coach pages' moving stages, measured on what is rendered.
//   A stage is every [data-cf-stage] unit (hero media frame, accordion with its buttons, scan stage, plan-to-phone link,
//   step flow). For each one the check samples the rendered value of every property an endless CSS loop inside it animates
//   (plus the box of the element and the time of every clip inside), waits, and samples again:
//     - running: the stage must move, in two windows in a row (the positive control, so a stage that never moved cannot
//       pass as "still moving", and the loops that count are the ones that were really moving);
//     - mouse parked over it or over its controls: every one of those loops and clips keeps moving, and so after a mouse
//       click on it or on a control (a mouse click leaves focus there, which is not keyboard focus);
//     - with keyboard focus inside it: nothing may move, not a loop and not a clip, and it must move again after the focus leaves.
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
const readable = (data) => `data-ap=${data.ap}${data.why ? ` data-ap-why=${data.why}` : ''}`;

export async function coachMotionChecks({ open, check, sleep, settle, metrics }) {
  const SEL = '[data-cf-stage]';
  for (const locale of locales) {
    for (const slug of coachSlugs) {
      const tag = `${locale}/${slug}`;
      const page = await open({ width: 1440, height: 900 }, pathOf(slug, locale));
      await settle(page);
      const stages = await page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => ({ name: e.dataset.cfStage, controls: e.querySelectorAll('button, a[href], input, [tabindex="0"]').length, acc: e.matches('[data-accordion]') })), SEL);
      check('coach-motion', `${tag}: the page declares its moving stages`, stages.length > 0, `${stages.length} stages: ${stages.map((s) => s.name).join(', ')}`);

      const idle = async () => {
        await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
        await page.mouse.move(2, 2);
        await sleep(250);
      };
      const interval = 1200;
      // One measurement: sample, wait, sample, and report what moved between the two.
      const measure = async (i, ms = interval) => {
        const a = await page.evaluate(sample, [i, SEL]);
        await sleep(ms);
        const b = await page.evaluate(sample, [i, SEL]);
        return { keys: Object.keys(b), moved: moved(a, b) };
      };
      // The same over a long stretch, sampled every ~600 ms: comparing only its two ends would alias with a loop whose cycle
      // is shorter than the stretch, so a loop counts as moving if any sample differs from the first.
      const watch = async (i, ms) => {
        const first = await page.evaluate(sample, [i, SEL]);
        const seen = new Set();
        let last = first;
        for (let t = 0; t < ms; t += 600) {
          await sleep(600);
          last = await page.evaluate(sample, [i, SEL]);
          for (const k of moved(first, last)) seen.add(k);
        }
        return { keys: Object.keys(last), moved: [...seen] };
      };
      // Of the loops that were really moving, those still present that stood still over this window and over one more window
      // (which rules out a loop caught at a turning point), and over a third, longer one: a keyframe loop such as the send ring
      // holds still for about 3.5 s of its 4.8 s cycle, so only a window that long tells a rest from a pause. A loop that left
      // the DOM tree because a mouse click switched an accordion row is not a stall.
      const stalledIn = async (i, live, m) => {
        const left = [...live].filter((k) => m.keys.includes(k) && !m.moved.includes(k));
        if (!left.length) return left;
        const retry = await measure(i);
        const rest = left.filter((k) => retry.keys.includes(k) && !retry.moved.includes(k));
        if (!rest.length) return rest;
        const long = await watch(i, 3600);
        return rest.filter((k) => long.keys.includes(k) && !long.moved.includes(k));
      };
      const apOf = (i) => page.evaluate(([s, k]) => ({ ap: document.querySelectorAll(s)[k].dataset.ap, why: document.querySelectorAll(s)[k].dataset.apWhy }), [SEL, i]);
      const park = async (i) => {
        await page.locator(SEL).nth(i).evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(([s, k]) => document.querySelectorAll(s)[k]?.dataset.ap === 'on', [SEL, i], { timeout: 4000 }).catch(() => {});
        // Count-ups and reveal transitions are one-shot; let them finish so only loops and clips can move.
        await page.waitForFunction(([s, k]) => [...document.querySelectorAll(s)[k].querySelectorAll('video')].every((v) => v.readyState >= 2 && v.currentTime > 0), [SEL, i], { timeout: 5000 }).catch(() => {});
        await sleep(2200);
      };
      // Mouse over the stage, and over each distinct surface the user can reach inside it (the accordion's buttons and its stage).
      const targetsOf = (i, st) => {
        const host = page.locator(SEL).nth(i);
        return st.acc ? [['its first button', host.locator('.acc__btn').first()], ['its last button', host.locator('.acc__btn').last()], ['its stage', host.locator('.acc__stage')]] : [['the stage', host]];
      };
      const lives = [];

      for (let i = 0; i < stages.length; i++) {
        const st = stages[i];
        const label = `${tag} ${st.name}`;

        await idle();
        await park(i);
        const run = await measure(i);
        const again = await measure(i);
        check('coach-motion', `${label}: runs while on screen with no pointer or focus (positive control)`, run.moved.length > 0 && again.moved.length > 0, `${run.keys.length} loops/clips, moving: ${run.moved.join(', ') || 'none'}`);
        const live = new Set(run.moved.filter((k) => again.moved.includes(k)));
        lives.push(live);

        for (const [what, loc] of targetsOf(i, st)) {
          await idle();
          const box = await loc.boundingBox();
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
          await sleep(250);
          const hov = await measure(i);
          const stalled = await stalledIn(i, live, hov);
          const state = await apOf(i);
          const ok = live.size > 0 && stalled.length === 0 && state.ap === 'on' && !state.why;
          check('coach-motion', `${label}: mouse over ${what} keeps every loop and clip in it moving (data-ap stays on)`, ok, ok ? `${live.size} loops/clips kept moving for ${interval} ms` : `paused under the pointer (${readable(state)}), stood still: ${stalled.join(', ') || 'none'}`);
        }

        // Keyboard focus on a control inside the stage.
        if (st.controls > 0) {
          await idle();
          await page.locator(SEL).nth(i).locator('button, a[href], input, [tabindex="0"]').first().focus();
          await sleep(250);
          const foc = await measure(i);
          const frozen = foc.moved.filter((k) => live.has(k));
          check('coach-motion', `${label}: focus on a control inside it stops every loop and clip in it`, frozen.length === 0, frozen.length ? `still moving: ${frozen.join(', ')}` : `${foc.keys.length} loops/clips held still for ${interval} ms`);
        }

        // Keyboard focus leaving the stage resumes it.
        await idle();
        const back = await measure(i);
        const resumed = [...live].filter((k) => back.moved.includes(k));
        check('coach-motion', `${label}: moves again once focus leaves`, resumed.length > 0, `resumed: ${resumed.join(', ') || 'none'}`);
        metrics[`coach-motion-stage-${slug}-${locale}-${i}`] = { loops: run.keys.length, moving: run.moved.length, live: live.size };
      }

      // A mouse click on the stage or on a control inside it must not stop it: the click leaves focus on that control, which is
      // not keyboard focus. Run after every stage's keyboard-focus check, so no script focus follows a click.
      for (let i = 0; i < stages.length; i++) {
        const st = stages[i];
        const label = `${tag} ${st.name}`;
        const live = lives[i];
        await idle();
        await page.locator(SEL).nth(i).evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await sleep(600);
        for (const [what, loc] of targetsOf(i, st)) {
          await idle();
          const box = await loc.boundingBox();
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await sleep(250);
          const after = await measure(i);
          const stalled = await stalledIn(i, live, after);
          const state = await apOf(i);
          const keptMoving = [...live].filter((k) => after.moved.includes(k)).length;
          const ok = keptMoving > 0 && stalled.length === 0 && state.ap === 'on' && !state.why;
          check('coach-motion', `${label}: a mouse click on ${what} keeps every loop and clip in it moving (data-ap stays on)`, ok, ok ? `${keptMoving} of ${live.size} loops/clips kept moving for ${interval} ms` : `stopped by a mouse click (${readable(state)}), moving ${keptMoving} of ${live.size}, stood still: ${stalled.join(', ') || 'none'}`);
        }
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
