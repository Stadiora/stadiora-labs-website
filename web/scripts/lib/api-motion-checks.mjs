// Pause (keyboard focus, hidden tab, off screen), pointer and reduced motion for the API page's moving stages, measured on what is rendered.
//   A stage is every [data-api-stage] unit (hero engine, status line, data wall, capability cards, how-it-works sample, sports
//   strip, use cases, hub). For each one the check takes a fingerprint, waits, and takes another:
//     - the rendered value of every property an endless loop (CSS or the kit's timelines) inside it animates, and
//     - the serialised markup of the stage, which carries what the timers and frame loops write (typed code, the swapped
//       sport word, the progress variable, class changes).
//   running: the fingerprint must change (the positive control, so a stage that never moved cannot pass as "paused");
//   focused (keyboard), off screen, or in a hidden tab: it must not change at all; after that it must change again.
//   A mouse pointer never pauses a stage: with the pointer parked over it, and again after a mouse click on it, the same loops
//   (a stalled one is retried over a second window) and the fingerprint must keep changing and data-ap must stay on.
//   Reading playState instead would pass a loop that something else keeps moving, so only rendered values count.
//   Finite transitions: a stage's fingerprint also lists every transition or one-shot animation still in flight with the rendered
//   value of each property it drives (the use-case photo's 7 s scale), so a pause that leaves one running fails whatever its duration.
//   Reduced motion: no endless loop in the content, every stage parked with data-ap-why="reduced", the settled frames shown.
//   Coverage of the reduced-motion group. PROVEN by a mutation in scripts/mutation-battery.mjs: the code samples are complete
//   (every line compared with the expected text). NOT COVERED (asserted, but no mutation has been run against the assertion, so
//   it is not claimed): every stage parked, the hero's finished frame, and "no stage changes over four seconds".
const SEL = '[data-api-stage]';
const pages = [
  ['en', '/api.html', null],
  ['es', '/api-es.html', new Set(['engine', 'wall', 'sports', 'uc'])],
];
// Foundation decoration owned by the page chrome (it parks itself on tab-hidden and off screen), not by a stage.
const chrome = '.mesh, .orbits, .grad-text';

const fingerprint = (idx) => {
  const host = document.querySelectorAll('[data-api-stage]')[idx];
  const skip = new Set(['offset', 'easing', 'composite', 'computedOffset']);
  const out = {};
  let n = 0;
  for (const a of document.getAnimations()) {
    const e = a.effect;
    const t = e?.target;
    if (!t || e.getComputedTiming().iterations !== Infinity || !host.contains(t)) continue;
    const pseudo = e.pseudoElement || null;
    const cs = getComputedStyle(t, pseudo);
    const props = new Set(e.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !skip.has(p))));
    const rendered = [...props].map((p) => (p.startsWith('--') ? cs.getPropertyValue(p) : cs[p])).join('|');
    const r = pseudo ? null : t.getBoundingClientRect();
    out[`loop ${n++} ${t.tagName.toLowerCase()}.${String(t.className?.baseVal ?? t.className).split(/\s+/)[0]}${pseudo ?? ''}`] = `${rendered}${r ? `|${r.x.toFixed(2)},${r.y.toFixed(2)}` : ''}`;
  }
  // Finite transitions and one-shot animations that are still in flight (the use-case photo's 7 s scale). What is read is the
  // rendered value of each property they drive, so a transition that keeps going under a paused host changes the value, and one
  // that finishes underneath it drops out of the list. Nothing is excluded for being finite or for how long it lasts.
  const all = [...host.querySelectorAll('*')];
  const flight = [];
  for (const a of document.getAnimations()) {
    const e = a.effect;
    const t = e?.target;
    if (!t || e.getComputedTiming().iterations === Infinity || !host.contains(t) || a.playState === 'finished' || a.playState === 'idle') continue;
    const pseudo = e.pseudoElement || null;
    const cs = getComputedStyle(t, pseudo);
    const props = new Set(e.getKeyframes().flatMap((k) => Object.keys(k).filter((p) => !skip.has(p))));
    flight.push(`${all.indexOf(t)} ${t.tagName.toLowerCase()}${pseudo ?? ''} ${[...props].map((p) => `${p}=${p.startsWith('--') ? cs.getPropertyValue(p) : cs[p]}`).join(';')}`);
  }
  out.inflight = flight.sort().join(' | ');
  out.markup = host.outerHTML.replace(/\sdata-ap(-why)?="[^"]*"/g, '');
  return out;
};

// A viewport point inside the stage's scope that sits on no control, and one on a control that a click cannot navigate away with.
// Serialised into the page, so each helper is self-contained.
const quietPoint = (i) => {
  const host = document.querySelectorAll('[data-api-stage]')[i];
  const scope = host.matches('[data-ap-scope]') ? host : host.querySelector('[data-ap-scope]') || host;
  const r = scope.getBoundingClientRect();
  for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85]) {
    for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
      const x = Math.min(Math.max(r.left, 0) + (Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * fx, innerWidth - 1);
      const y = Math.max(r.top, 0) + (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) * fy;
      const hit = document.elementFromPoint(x, y);
      if (hit && scope.contains(hit) && !hit.closest('a, button, input, select, textarea, summary, label')) return { x, y };
    }
  }
  return null;
};
const controlPoint = (i) => {
  const host = document.querySelectorAll('[data-api-stage]')[i];
  const scope = host.matches('[data-ap-scope]') ? host : host.querySelector('[data-ap-scope]') || host;
  for (const c of scope.querySelectorAll('button, [tabindex="0"]')) {
    const r = c.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) continue;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit && c.contains(hit)) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return null;
};

// Waits until the page has stopped scrolling, then lets the observers report.
const settled = async (page) => {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => scrollY);
    if (y === last) break;
    last = y;
    await new Promise((r) => setTimeout(r, 150));
  }
  await new Promise((r) => setTimeout(r, 500));
};

const changed = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);

export async function apiMotionChecks({ open, check, sleep, settle, metrics }) {
  for (const [lang, path, only] of pages) {
    const page = await open({ width: 1440, height: 900 }, path);
    await settle(page);
    const stages = await page.evaluate(
      (s) => [...document.querySelectorAll(s)].map((e, i) => ({ i, name: e.dataset.apiStage, slow: !!e.querySelector('.q'), focusable: !!(e.matches('[data-ap-scope]') ? e : e.querySelector('[data-ap-scope]') || e).querySelector('button, a[href], input, [tabindex="0"]') })),
      SEL,
    );
    check('api-motion', `${lang}: the page declares its moving stages`, stages.length >= 8, `${stages.length}: ${stages.map((s) => s.name).join(', ')}`);

    const clicks = [];
    const clicked = { surface: 0, control: 0 };
    for (const st of stages) {
      if (only && !only.has(st.name)) continue;
      if (process.env.API_MOTION_STAGE && !`${lang}:${st.name}#${st.i}`.startsWith(process.env.API_MOTION_STAGE)) continue;
      const label = `${lang} ${st.name}#${st.i}`;
      const host = page.locator(SEL).nth(st.i);
      // The queue card holds each row for most of a 6s loop, so it is watched across a longer window.
      const interval = st.name === 'sports' ? 3600 : st.slow ? 3000 : 1300;
      const take = () => page.evaluate(fingerprint, st.i);
      const idle = async () => {
        await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
        // Outside the viewport, so the positive control and the pause conditions are measured with no pointer over any stage.
        await page.mouse.move(-5, -5);
        await sleep(250);
      };
      const watch = async () => {
        const a = await take();
        await sleep(interval);
        const b = await take();
        return changed(a, b);
      };
      const park = async () => {
        // The capability cards ride a horizontal track that the vertical scroll drives, so "in view" can need a scroll search.
        await page.evaluate(async (i) => {
          const e = document.querySelectorAll('[data-api-stage]')[i];
          const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          e.scrollIntoView({ block: 'center', behavior: 'instant' });
          await frame();
          const pin = e.closest('[data-cap]');
          const fits = () => {
            const r = e.getBoundingClientRect();
            return r.left >= 0 && r.right <= innerWidth;
          };
          if (pin && !fits()) {
            const top = pin.getBoundingClientRect().top + scrollY;
            for (let y = top; y <= top + pin.offsetHeight && !fits(); y += 50) {
              scrollTo({ top: y, behavior: 'instant' });
              await frame();
            }
          }
        }, st.i);
        await page.waitForFunction((i) => document.querySelectorAll('[data-api-stage]')[i]?.dataset.ap === 'on', st.i, { timeout: 4000 }).catch(() => {});
        await sleep(2300);
      };
      const spoofHidden = (on) =>
        page.evaluate((v) => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
          document.dispatchEvent(new Event('visibilitychange'));
        }, on);
      // The use-case photo animates through a 7 s CSS transition that starts when a row opens, so a pause that only stops the
      // frame loop leaves it moving. Opening the next row just before each scenario puts a transition in flight to be paused.
      const provoke = async () => {
        if (st.name !== 'uc') return;
        await page.evaluate((i) => {
          const rows = [...document.querySelectorAll('[data-api-stage]')[i].querySelectorAll('[data-uc-row] button')];
          rows[(rows.findIndex((b) => b.getAttribute('aria-expanded') === 'true') + 1) % rows.length].click();
        }, st.i);
        await sleep(300);
      };
      // The data wall moves with the scroll position, so its own scrub is not time and its loops are what the pause covers.
      await idle();
      await park();
      await provoke();
      const run = await watch();
      check('api-motion', `${label}: runs while on screen with no pointer or focus (positive control)`, run.length > 0, `moving: ${run.slice(0, 4).join(', ') || 'none'}`);
      const live = new Set(run);

      await idle();
      await provoke();
      const scopeEl = host.locator('xpath=self::*[@data-ap-scope] | .//*[@data-ap-scope]').first();
      const box = await scopeEl.boundingBox();
      await page.mouse.move(box.x + Math.min(box.width / 2, 400), box.y + Math.min(box.height / 2, 200), { steps: 4 });
      await sleep(250);
      const apState = () => page.evaluate((i) => { const e = document.querySelectorAll('[data-api-stage]')[i]; return { ap: e.dataset.ap, why: e.dataset.apWhy }; }, st.i);
      const readable = (d) => `data-ap=${d.ap}${d.why ? ` data-ap-why=${d.why}` : ''}`;
      // Loops of the live set that stood still over a window and over one more (a loop caught at a turning point is not a stall).
      const stalledLoops = async (changedNow) => {
        const left = [...live].filter((k) => k.startsWith('loop ') && !changedNow.includes(k));
        if (!left.length) return left;
        const retry = await watch();
        return left.filter((k) => !retry.includes(k));
      };
      // Moving: at least one live part changed, no live loop stood still, and the host never left "on".
      const keepsMoving = async () => {
        const now = await watch();
        const stalled = await stalledLoops(now);
        const kept = now.filter((k) => live.has(k));
        const state = await apState();
        return { ok: kept.length > 0 && stalled.length === 0 && state.ap === 'on' && !state.why, kept, stalled, state };
      };
      const verdict = (m, how) => (m.ok ? `${m.kept.length} of ${live.size} moving parts kept changing` : `${how} (${readable(m.state)}); changing ${m.kept.length} of ${live.size}${m.stalled.length ? `, loops that stood still: ${m.stalled.join(', ')}` : ''}`);
      let m = await keepsMoving();
      check('api-motion', `${label}: mouse over it keeps everything in it moving (data-ap stays on)`, m.ok, verdict(m, 'paused under the pointer'));

      if (st.name === 'uc') {
        // A row opened under the pointer starts a new transition; it runs as well.
        await provoke();
        await sleep(700);
        m = await keepsMoving();
        check('api-motion', `${label}: a row opened while the pointer is over it keeps moving too (data-ap stays on)`, m.ok, verdict(m, 'paused under the pointer'));
      }

      let still;
      if (st.focusable) {
        await idle();
        await provoke();
        // Keyboard focus, as a keyboard user gets it: any earlier mouse click must not make this a mouse focus.
        await page.keyboard.press('Shift');
        await scopeEl.evaluate((e) => (e.matches('button, a[href], input, [tabindex="0"]') ? e : e.querySelector('button, a[href], input, [tabindex="0"]')).focus());
        await sleep(250);
        still = (await watch()).filter((k) => live.has(k));
        check('api-motion', `${label}: focus on a control inside it stops everything in it`, still.length === 0, still.length ? `still moving: ${still.join(', ')}` : `${live.size} moving parts held still`);
        if (st.name === 'uc') {
          // A row opened while keyboard focus holds the block starts a transition that must be held as well.
          await provoke();
          await sleep(700);
          still = (await watch()).filter((k) => live.has(k));
          check('api-motion', `${label}: a row opened while keyboard focus is inside it stays still too`, still.length === 0, still.length ? `still moving: ${still.join(', ')}` : `${live.size} moving parts held still`);
        }
      }

      await idle();
      await provoke();
      await spoofHidden(true);
      await sleep(250);
      still = (await watch()).filter((k) => live.has(k));
      await spoofHidden(false);
      check('api-motion', `${label}: a hidden tab stops everything in it`, still.length === 0, still.length ? `still moving: ${still.join(', ')}` : `${live.size} moving parts held still`);

      // Off screen: scroll to the far end of the page and watch the stage from there.
      await idle();
      await provoke();
      await page.evaluate((i) => {
        const r = document.querySelectorAll('[data-api-stage]')[i].getBoundingClientRect();
        scrollTo({ top: r.top + scrollY > document.documentElement.scrollHeight / 2 ? 0 : document.documentElement.scrollHeight, behavior: 'instant' });
      }, st.i);
      await settled(page);
      const away = await page.evaluate((i) => {
        const r = document.querySelectorAll('[data-api-stage]')[i].getBoundingClientRect();
        return r.bottom < 0 || r.top > innerHeight;
      }, st.i);
      still = (await watch()).filter((k) => live.has(k));
      check('api-motion', `${label}: scrolled off screen it stops everything in it`, away && still.length === 0, !away ? 'the stage was still in view' : still.length ? `still moving: ${still.join(', ')}` : `${live.size} moving parts held still`);

      await idle();
      await park();
      const back = (await watch()).filter((k) => live.has(k));
      check('api-motion', `${label}: moves again once focus and the hidden tab are gone and it is back on screen`, back.length > 0, `resumed: ${back.slice(0, 4).join(', ') || 'none'}`);
      // A mouse click on the stage (a quiet spot of its scope, then a control in it) leaves focus there by mouse: still moving.
      const clickAt = async (what, pointOf) => {
        await idle();
        await park();
        await provoke();
        const pt = await pointOf();
        if (!pt) return false;
        await page.mouse.click(pt.x, pt.y);
        await sleep(250);
        const m = await keepsMoving();
        check('api-motion', `${label}: a mouse click on ${what} keeps everything in it moving (data-ap stays on)`, m.ok, verdict(m, 'stopped by a mouse click'));
        return true;
      };
      const quiet = await clickAt('its surface', () => page.evaluate(quietPoint, st.i));
      const onControl = await clickAt('a control in it', () => page.evaluate(controlPoint, st.i));
      clicks.push(`${label}: surface ${quiet}, control ${onControl}`);
      if (quiet) clicked.surface++;
      if (onControl) clicked.control++;
      metrics[`api-motion-${label.replace(/\W+/g, '-')}`] = { moving: live.size };
    }

    check('api-motion', `${lang}: the mouse clicks really landed (${clicked.surface} stages clicked on a quiet spot, ${clicked.control} on a control)`, clicked.surface >= 1 && clicked.control >= 1, clicks.join('; '));

    // Every endless loop in the page content belongs to a stage (or to the shared chrome), so nothing escapes the pause.
    const loose = await page.evaluate(
      ([s, c]) => [
        ...new Set(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.('main'))
            .filter((a) => !a.effect.target.closest(s) && !a.effect.target.closest(c))
            .map((a) => `${a.animationName ?? 'timeline'} on ${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className?.baseVal ?? a.effect.target.className).split(/\s+/)[0]}`),
        ),
      ],
      [SEL, chrome],
    );
    check('api-motion', `${lang}: every endless loop in the page content sits inside a stage that pauses`, loose.length === 0, loose.length ? `outside any stage: ${loose.join(', ')}` : 'none outside');
    await page.context().close();
  }
}

// The complete code samples, line by line, as the page must show them settled (the comment line comes from the page's own copy).
const REQ_LINES = [
  '{',
  '  "athlete_id": "ATH_8821",',
  '  "sport": "track_field",',
  '  "signals": {',
  '    "training_load_7d": 84,',
  '    "recovery_score": 58,',
  '    "sleep_hours": 6.4,',
  '    "wellness_score": 6,',
  '    "hrv_delta": -6.2,',
  '    "session_rpe_last": 8.5,',
  '    "days_since_rest": 5',
  '  }',
  '}',
];
const RES_LINES = [
  '{',
  '  "athlete_id": "ATH_8821",',
  '  "availability": "MODIFIED",',
  '  "readiness_index": 54,',
  '  "classification": "Reduced Load Session",',
  '  "recommendation": "Technical work only. Cap volume at 60%. No max-intensity efforts today.",',
  '  "flags": [',
  '    "elevated_cumulative_load",',
  '    "hrv_below_7d_baseline",',
  '    "sleep_deficit_detected"',
  '  ],',
  '  "coach_attention": true,',
  '  "confidence": 0.91,',
  '  "primary_signal": "hrv_delta"',
  '}',
];

/** Reduced motion: nothing runs on its own, and the settled frames are what is shown. */
export async function apiReducedMotionChecks({ open, check, sleep, settle }) {
  for (const [lang, path] of [['en', '/api.html'], ['es', '/api-es.html']]) {
    const page = await open({ width: 1440, height: 900, reduced: true }, path);
    await settle(page);
    const loops = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.('main'))
        .map((a) => `${a.animationName ?? 'timeline'} on ${a.effect.target.tagName.toLowerCase()}.${String(a.effect.target.className?.baseVal ?? a.effect.target.className).split(/\s+/)[0]}`),
    );
    check('api-reduced', `${lang}: no endless loop runs in the content`, loops.length === 0, loops.length ? [...new Set(loops)].join(', ') : 'none');
    const parked = await page.evaluate(() => [...document.querySelectorAll('[data-api-stage]')].filter((e) => e.dataset.ap !== 'off' || e.dataset.apWhy !== 'reduced').map((e) => e.dataset.apiStage));
    check('api-reduced', `${lang}: every stage is parked for reduced motion`, parked.length === 0, parked.length ? `not parked: ${parked.join(', ')}` : 'all parked');

    // The wall is judged where it enters the viewport, where a scroll-driven version would still be at its first frame.
    await page.evaluate(() => scrollTo(0, document.querySelector('.dw-pin').getBoundingClientRect().top + scrollY - innerHeight * 0.4));
    await sleep(600);
    const frames = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const op = (s) => (q(s) ? Number(getComputedStyle(q(s)).opacity) : null);
      const lines = (pane) => [...document.querySelectorAll(`[data-pane="${pane}"] code .ln`)].map((l) => l.textContent);
      const code = lines('req');
      const res = lines('res');
      const strings = JSON.parse(q('[data-code-strings]')?.textContent ?? '{}');
      return {
        strings,
        caret: document.querySelectorAll('[data-code] .caret').length,
        typing: q('[data-code-state]')?.textContent.trim() ?? null,
        card: op('[data-card]'),
        sigs: [...document.querySelectorAll('.sig')].map((s) => Number(getComputedStyle(s).opacity)),
        wall: getComputedStyle(q('.dw-sticky')).getPropertyValue('--q').trim() || q('.dw-sticky').style.getPropertyValue('--q'),
        code,
        res,
      };
    });
    check('api-reduced', `${lang}: the hero shows its finished frame (decision card up, every signal read)`, frames.card === 1 && frames.sigs.length > 0 && frames.sigs.every((o) => o >= 0.85), `card ${frames.card}, signals ${frames.sigs.join(',')}`);
    check('api-reduced', `${lang}: the data wall shows the finished frame (q = 1)`, Number(frames.wall) === 1, `--q ${frames.wall}`);
    const wantReq = [frames.strings.cReq, ...REQ_LINES];
    const wantRes = [frames.strings.cRes, ...RES_LINES];
    const sameLines = (got, want) => got.length === want.length && got.every((l, i) => l === want[i]);
    const firstDiff = (got, want) => {
      const i = want.findIndex((l, k) => got[k] !== l);
      return i < 0 ? `${got.length} lines, expected ${want.length}` : `line ${i + 1}: got ${JSON.stringify(got[i])}, expected ${JSON.stringify(want[i])}`;
    };
    check(
      'api-reduced',
      `${lang}: both code samples are complete with nothing typing`,
      !!frames.strings.cReq && sameLines(frames.code, wantReq) && sameLines(frames.res, wantRes) && frames.caret === 0 && frames.typing === '',
      sameLines(frames.code, wantReq) && sameLines(frames.res, wantRes) ? `request ${frames.code.length} lines, response ${frames.res.length} lines, identical to the expected samples, no caret, no status text` : `request ${firstDiff(frames.code, wantReq)}; response ${firstDiff(frames.res, wantRes)}; carets ${frames.caret}; status ${JSON.stringify(frames.typing)}`,
    );

    // Nothing may change over time either: the same fingerprint of every stage, twice.
    const snap = () => page.evaluate(() => [...document.querySelectorAll('[data-api-stage]')].map((e) => e.outerHTML.replace(/\sdata-ap(-why)?="[^"]*"/g, '')));
    const a = await snap();
    await sleep(4000);
    const b = await snap();
    const moved = a.map((x, i) => (x !== b[i] ? i : -1)).filter((i) => i >= 0);
    check('api-reduced', `${lang}: no stage changes over four seconds`, moved.length === 0, moved.length ? `changed: stage #${moved.join(', #')}` : `${a.length} stages unchanged`);
    await page.context().close();
  }
}
