// Evidence for the motion on /pricing/ and /es/pricing/: what the odometer leaves in the accessibility tree, whether the
// estimate's background loop obeys the shared autoplayer (measured movement, not a flag), and whether the Performance
// card's iris ring really turns (rendered pixels). Called from pricing-checks.mjs (group "motion").
//   node scripts/evidence.mjs --pricing-only --checks-only --pricing-group=motion
// Expected prices come from pricing-oracle.mjs, never from src/data/prices.ts.
import { ORACLE, annual, estimateOracle, fmt, sizes } from './pricing-oracle.mjs';

const paths = { en: '/pricing/', es: '/es/pricing/' };
// Where the strip of digits shows up when a wheel's column is exposed: "0 1 2 3 ..." in one node name.
const STRIP = /0\s+1\s+2\s+3/;
const HOSTS = { core: '[data-amount="core"]', performance: '[data-amount="performance"]', total: '[data-total]' };

// ---------------------------------------------------------------- in-page helpers (serialised into the page)
const estTransform = () => getComputedStyle(document.querySelector('.est'), '::before').transform;
const estState = () => {
  const e = document.querySelector('.est');
  return { ap: e.dataset.ap ?? null, why: e.dataset.apWhy ?? null };
};
// The drift is slowest at the ends of each 9 s leg and quickest in the middle: park it mid-leg so "still" and "moving" are unambiguous.
const parkEstLoop = () => {
  const est = document.querySelector('.est');
  for (const a of document.getAnimations()) if (a.effect?.target === est && a.effect.pseudoElement === '::before') a.currentTime = 4500;
};
const irisAngle = () => getComputedStyle(document.querySelector('.pcard--performance'), '::before').getPropertyValue('--a').trim();
const setHidden = (h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  document.dispatchEvent(new Event('visibilitychange'));
};
const planOff = () => document.querySelector('.plans-section')?.classList.contains('is-off') ?? null;

// Compares two PNGs (base64) of the same card: how many pixels moved within 5 px of its rounded edge (the ring) and how
// many moved further in.
const diffFrames = async ({ a, b, radius }) => {
  const load = async (png) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    return { w: bitmap.width, h: bitmap.height, d: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data };
  };
  const [fa, fb] = [await load(a), await load(b)];
  if (fa.w !== fb.w || fa.h !== fb.h) return { size: false, ring: 0, inside: 0 };
  let ring = 0;
  let inside = 0;
  for (let y = 0; y < fa.h; y++) {
    for (let x = 0; x < fa.w; x++) {
      const i = (y * fa.w + x) * 4;
      const moved = Math.max(Math.abs(fa.d[i] - fb.d[i]), Math.abs(fa.d[i + 1] - fb.d[i + 1]), Math.abs(fa.d[i + 2] - fb.d[i + 2])) > 10;
      if (!moved) continue;
      const qx = Math.abs(x + 0.5 - fa.w / 2) - (fa.w / 2 - radius);
      const qy = Math.abs(y + 0.5 - fa.h / 2) - (fa.h / 2 - radius);
      const depth = radius - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0);
      if (depth <= 5) ring++;
      else inside++;
    }
  }
  return { size: true, ring, inside, w: fa.w, h: fa.h };
};

// ---------------------------------------------------------------- driver
export async function motionChecks({ open, close, check, sleep, out }) {
  const parked = (page) => page.mouse.move(2, 2);

  // ------------------------------------------------------------ 1. the odometer never changes what a screen reader reads
  // Chromium's accessibility tree is read over the protocol (not the DOM): the price must be exposed as its real value in
  // every sample taken while the wheels roll, and no node anywhere may carry the 0-to-9 strip.
  const axProbe = async (page) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('Accessibility.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const backend = {};
    for (const [key, sel] of Object.entries(HOSTS)) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      backend[key] = (await cdp.send('DOM.describeNode', { nodeId })).node.backendNodeId;
    }
    return async () => {
      const { nodes } = await cdp.send('Accessibility.getFullAXTree');
      const byId = new Map(nodes.map((n) => [n.nodeId, n]));
      const read = (key) => {
        const names = [];
        const walk = (n) => {
          if (!n) return;
          if (!n.ignored && n.role?.value === 'StaticText') names.push(n.name?.value ?? '');
          for (const c of n.childIds ?? []) walk(byId.get(c));
        };
        walk(nodes.find((n) => n.backendDOMNodeId === backend[key]));
        return names.join('').trim();
      };
      const strips = nodes.filter((n) => !n.ignored && STRIP.test(String(n.name?.value ?? ''))).length;
      return { core: read('core'), performance: read('performance'), total: read('total'), strips, nodes: nodes.length };
    };
  };

  for (const [locale, width, mobile] of [['en', 1280, false], ['es', 390, true]]) {
    const bad = [];
    const page = await open(paths[locale], { width, height: mobile ? 844 : 900, reduced: false, mobile });
    const read = await axProbe(page);
    let rolling = 0;
    const steps = [
      ['slider to 250 athletes', async () => page.locator('input[data-athletes]').fill(String(sizes.indexOf(250))), 250, 'monthly'],
      ['annual billing', async () => page.locator('label.seg__opt:has(input[value="annual"])').click(), 250, 'annual'],
      ['slider to 1000 athletes', async () => page.locator('input[data-athletes]').fill(String(sizes.indexOf(1000))), 1000, 'annual'],
    ];
    for (const [label, act, athletes, billing] of steps) {
      await act();
      const [, core, perf] = ORACLE.us[athletes];
      const want = {
        core: fmt(billing === 'annual' ? annual(core) : core),
        performance: fmt(billing === 'annual' ? annual(perf) : perf),
        total: fmt(estimateOracle({ region: 'us', athletes, billing }).monthly),
      };
      const t0 = Date.now();
      let seen = 0;
      while (Date.now() - t0 < 2600) {
        const before = await page.evaluate(() => document.querySelectorAll('.is-rolling').length);
        const got = await read();
        const dom = await page.evaluate((hosts) => Object.fromEntries(Object.entries(hosts).map(([k, s]) => [k, document.querySelector(s).textContent.trim()])), HOSTS);
        const after = await page.evaluate(() => document.querySelectorAll('.is-rolling').length);
        if (before > 0 && after > 0) seen++;
        for (const key of Object.keys(HOSTS)) {
          if (got[key] !== want[key]) bad.push(`${locale} ${label}: the accessibility tree reads ${key} as ${JSON.stringify(got[key])} (${before > 0 ? 'mid-roll' : 'settled'}), want ${want[key]}`);
          if (dom[key] !== want[key]) bad.push(`${locale} ${label}: the DOM text of ${key} is ${JSON.stringify(dom[key])}, want ${want[key]}`);
        }
        if (got.strips > 0) bad.push(`${locale} ${label}: ${got.strips} node(s) in the accessibility tree hold the 0 1 2 3 ... digit strip`);
        if (before === 0 && after === 0 && Date.now() - t0 > 900) break;
        await sleep(90);
      }
      rolling += seen;
      if (seen < 3) bad.push(`${locale} ${label}: only ${seen} samples were taken while a wheel was rolling, want 3 or more (the roll was not observed)`);
    }
    out[`motionAxRollingSamples-${locale}`] = rolling;
    check('pricing/motion', `${locale}/${width}: through ${steps.length} changes the accessibility tree reads Core, Performance and the estimate total as the real price at every sample, mid-roll included, and never holds the 0 1 2 3 digit strip (${rolling} samples taken while the wheels rolled)`, bad.length === 0, [...new Set(bad)].slice(0, 3).join('; '));
    check('pricing/motion', `${locale}/${width}: the odometer pass logged no console errors`, page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);
  }

  // ------------------------------------------------------------ 2. the estimate's background loop follows the autoplayer
  // Measured: the computed transform of .est::before is read 700 ms apart. A loop that ignores keyboard focus, the viewport,
  // a hidden tab or reduced motion shows up as movement where there must be none; a loop that never runs fails the control, and
  // so does a loop that a mouse pointer over the panel or a click on it stops (the pointer never pauses anything).
  {
    const bad = [];
    const page = await open(paths.en, { width: 1280, height: 900, reduced: false });
    const moved = async () => {
      const a = await page.evaluate(estTransform);
      await sleep(700);
      const c = await page.evaluate(estTransform);
      const num = (m) => (m.match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
      const [x, y] = [num(a), num(c)];
      const delta = x.length === 6 && y.length === 6 ? Math.abs(x[0] - y[0]) * 1000 + Math.abs(x[4] - y[4]) + Math.abs(x[5] - y[5]) : a === c ? 0 : 999;
      return { still: a === c, delta: Math.round(delta * 100) / 100 };
    };
    const expectMoving = async (label, into = bad) => {
      await page.evaluate(parkEstLoop);
      const r = await moved();
      if (r.delta < 5) into.push(`${label}: the loop should be moving but moved ${r.delta}`);
      return r.delta;
    };
    const expectOn = async (label, into) => {
      const state = await page.evaluate(estState);
      if (state.ap !== 'on' || state.why) into.push(`${label}: data-ap is ${JSON.stringify(state)}, want on with no reason${state.why === 'hover' ? ' (paused under the pointer: data-ap-why=hover)' : ''}`);
    };
    const expectStill = async (label, why) => {
      await page.evaluate(parkEstLoop);
      const state = await page.evaluate(estState);
      const r = await moved();
      if (!r.still) bad.push(`${label}: the loop kept moving (moved ${r.delta}), want it still`);
      if (why && (state.ap !== 'off' || state.why !== why)) bad.push(`${label}: data-ap is ${JSON.stringify(state)}, want off/${why}`);
    };
    const toEst = async () => {
      await page.locator('.est').scrollIntoViewIfNeeded();
      await parked(page);
      await page.evaluate(() => document.activeElement?.blur());
      await page.waitForFunction(() => document.querySelector('.est')?.dataset.ap === 'on', null, { timeout: 3000 }).catch(() => bad.push('the loop never switched on with the panel in view and the pointer away'));
    };

    await toEst();
    out.motionEstControlDelta = await expectMoving('in view, pointer away');

    await page.locator('[data-est-cta]').focus();
    await sleep(150);
    await expectStill('focus inside the panel', 'focus');
    await page.evaluate(() => document.activeElement?.blur());
    await sleep(150);
    await expectMoving('focus left the panel');

    // The pointer never pauses the loop: parked on the panel, after a click on it and on its button (which leaves focus there), and
    // once it has left again, data-ap stays on and the drift keeps moving. Runs after the keyboard focus case, because a script
    // focus that follows a mouse click does not count as keyboard focus.
    const pointerBad = [];
    const title = await page.locator('.est__title').boundingBox();
    await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2);
    await sleep(150);
    await expectOn('pointer over the panel', pointerBad);
    out.motionEstUnderPointerDelta = await expectMoving('pointer over the panel', pointerBad);
    await page.mouse.click(title.x + title.width / 2, title.y + title.height / 2);
    await sleep(150);
    await expectOn('mouse click on the panel', pointerBad);
    await expectMoving('mouse click on the panel', pointerBad);
    // the button is a link: the click must leave focus on it without leaving the page
    await page.evaluate(() => window.addEventListener('click', (e) => e.target instanceof Element && e.target.closest('[data-est-cta]') && e.preventDefault(), true));
    const cta = await page.locator('[data-est-cta]').boundingBox();
    await page.mouse.click(cta.x + cta.width / 2, cta.y + cta.height / 2);
    await sleep(150);
    await expectOn('mouse click on the panel button', pointerBad);
    await expectMoving('mouse click on the panel button', pointerBad);
    await page.evaluate(() => document.activeElement?.blur());
    await parked(page);
    await sleep(150);
    await expectOn('pointer left the panel', pointerBad);
    await expectMoving('pointer left the panel', pointerBad);
    check('pricing/motion', 'the estimate background loop keeps moving (computed transform differs 700 ms apart, data-ap stays on) with the pointer on the panel, after a mouse click on it and on its button, and after the pointer leaves', pointerBad.length === 0, pointerBad.slice(0, 3).join('; '));

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.est')?.dataset.ap === 'off', null, { timeout: 3000 }).catch(() => {});
    await sleep(150);
    await expectStill('scrolled away from the panel', 'offscreen');
    await toEst();
    await expectMoving('scrolled back to the panel');

    await page.evaluate(setHidden, true);
    await sleep(150);
    await expectStill('hidden tab', 'hidden');
    await page.evaluate(setHidden, false);
    await sleep(150);
    await expectMoving('tab shown again');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await sleep(200);
    await expectStill('reduced motion switched on', 'reduced');
    const noAnim = await page.evaluate(() => getComputedStyle(document.querySelector('.est'), '::before').animationName);
    if (noAnim !== 'none') bad.push(`reduced motion: the loop's animation is ${noAnim}, want none`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await sleep(200);
    await expectMoving('reduced motion switched off');

    check('pricing/motion', 'the estimate background loop is measured moving in view, and still (computed transform equal 700 ms apart) with keyboard focus inside the panel, scrolled away, a hidden tab and reduced motion, and moving again after each', bad.length === 0, bad.slice(0, 3).join('; '));
    check('pricing/motion', 'the estimate loop pass logged no console errors', page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);

    // Reduced motion from the first frame: no loop at all.
    const calm = await open(paths.en, { width: 1280, height: 900, reduced: true });
    await calm.locator('.est').scrollIntoViewIfNeeded();
    await sleep(300);
    const [t1, s1] = [await calm.evaluate(estTransform), await calm.evaluate(estState)];
    await sleep(700);
    const t2 = await calm.evaluate(estTransform);
    check('pricing/motion', 'with reduced motion at load the estimate background does not move and the panel reports why', t1 === t2 && s1.ap === 'off' && s1.why === 'reduced', `transform ${t1} then ${t2}, state ${JSON.stringify(s1)}`);
    await close(calm);
  }

  // ------------------------------------------------------------ 3. the Performance iris ring turns (rendered pixels)
  {
    const bad = [];
    const page = await open(paths.en, { width: 1280, height: 900, reduced: false });
    const card = page.locator('.pcard--performance');
    const frame = async () => (await card.screenshot()).toString('base64');
    await card.scrollIntoViewIfNeeded();
    await parked(page);
    await sleep(1400);
    const a = await frame();
    await sleep(700);
    const b = await frame();
    const radius = await card.evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius));
    const moving = await page.evaluate(diffFrames, { a, b, radius });
    out.motionIrisRingPixels = moving.ring;
    if (!moving.size) bad.push('the card changed size between frames');
    if (moving.ring < 1000) bad.push(`the iris ring changed ${moving.ring} pixels in 700 ms, want 1,000 or more (a ring that turns changes about 3,800; one that stands still shows only the page's own noise, about 200)`);
    if (moving.inside > 0) bad.push(`${moving.inside} pixels changed inside the card, want 0 (only the ring turns)`);

    // Hidden-tab and offscreen: the angle holds still, then turns again.
    const holds = async () => {
      const x = await page.evaluate(irisAngle);
      await sleep(600);
      const z = await page.evaluate(irisAngle);
      return { still: x === z, x, z };
    };
    await page.evaluate(setHidden, true);
    await sleep(150);
    const hidden = await holds();
    if (!hidden.still) bad.push(`hidden tab: --a went ${hidden.x} to ${hidden.z}, want it held`);
    await page.evaluate(setHidden, false);
    await sleep(150);
    const turning = await holds();
    if (turning.still) bad.push(`tab shown again: --a stayed ${turning.x}, want it turning`);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('.plans-section')?.classList.contains('is-off'), null, { timeout: 3000 }).catch(() => bad.push('the plans section never went off screen'));
    await sleep(200);
    const off = await holds();
    if (!off.still) bad.push(`scrolled away: --a went ${off.x} to ${off.z}, want it held`);
    await card.scrollIntoViewIfNeeded();
    await sleep(300);
    const back = await holds();
    if (back.still) bad.push(`scrolled back: --a stayed ${back.x}, want it turning`);
    check('pricing/motion', `the Performance iris ring turns in rendered pixels (${moving.ring} ring pixels changed in 700 ms, none inside the card) and holds still on a hidden tab and off screen`, bad.length === 0, bad.slice(0, 3).join('; '));
    check('pricing/motion', 'the iris pass logged no console errors', page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);

    const calm = await open(paths.en, { width: 1280, height: 900, reduced: true });
    const still = calm.locator('.pcard--performance');
    await still.scrollIntoViewIfNeeded();
    await parked(calm);
    await sleep(1400);
    const ca = (await still.screenshot()).toString('base64');
    await sleep(700);
    const cb = (await still.screenshot()).toString('base64');
    const same = await calm.evaluate(diffFrames, { a: ca, b: cb, radius });
    check('pricing/motion', 'with reduced motion the iris ring does not turn: no pixel changes between two frames 700 ms apart', same.size && same.ring === 0 && same.inside === 0, `${same.ring} ring and ${same.inside} inside pixels changed`);
    await close(calm);
  }
}
