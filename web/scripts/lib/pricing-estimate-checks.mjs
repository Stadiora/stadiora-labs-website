// Evidence for the live estimate on /pricing/ and /es/pricing/: the panel beside the add-ons that totals the plan, the
// extra coaches and the branded app. Called from pricing-checks.mjs (group "estimate") with its page opener.
//   node scripts/evidence.mjs --pricing-only --checks-only --pricing-group=estimate
// Every expected number comes from pricing-oracle.mjs (typed in from the epic, not read back from src/data/prices.ts),
// and every expected sentence from the copy files, so a wrong edit to the table, the estimate script or the copy fails.
import { en, es } from '../../src/i18n/pages/pricing.ts';
import { fill } from '../../src/lib/template.ts';
import { BRANDED, EDU, EXTRA_COACH, ORACLE, annual, estimateOracle, fmt, sizes } from './pricing-oracle.mjs';

const copyFor = { en, es };
const paths = { en: '/pricing/', es: '/es/pricing/' };
const MAX_COACHES = 20;
const PLANS = ['free', 'core', 'performance', 'schools', 'federations'];
const sw = { coach: '.sw[data-sw="coach"]', app: '.sw[data-sw="app"]', ai: '.sw[data-sw="ai"]' };

/** What the panel, the switches, the stepper and the plan buttons should show for a state. */
export function expectedView({ locale, region, st }) {
  const copy = copyFor[locale];
  const e = copy.estimate;
  const unit = copy.price.unit;
  const athletes = sizes[st.index];
  const [, core, perf] = ORACLE[region][athletes];
  const allowed = st.plan === 'core' || st.plan === 'performance';
  const coachCount = st.coachOn && allowed ? st.qty : 0;
  const name = copy.plans[st.plan].name;
  const t = estimateOracle({ region, athletes, billing: st.billing, plan: st.plan, extraCoaches: coachCount, app: st.appOn });

  const rows = [];
  if (st.plan === 'core' || st.plan === 'performance') {
    const plain = st.plan === 'core' ? core : perf;
    const amount = st.billing === 'annual' ? annual(plain) : plain;
    rows.push(['plan', fill(e.planRow, { plan: name, athletes: athletes.toLocaleString('en-US') }), `${fmt(amount)}${unit}${st.billing === 'annual' ? ` (${e.yearly})` : ''}`]);
  } else if (st.plan === 'schools') rows.push(['plan', e.schoolsRow, `${fmt(Math.min(...EDU[region]))}${unit}`]);
  else if (st.plan === 'federations') rows.push(['plan', name, copy.plans.federations.price]);
  else rows.push(['plan', name, `${fmt(0)}${unit}`]);
  if (coachCount > 0) rows.push(['coach', fill(e.coachRow, { qty: String(coachCount) }), `${fmt(EXTRA_COACH[region] * coachCount)}${unit}`]);
  if (st.appOn) rows.push(['app', copy.addons.brandedApp.name, `${fmt(BRANDED.monthly)}${unit}`]);
  if (st.aiOn) rows.push(['ai', copy.addons.credits.name, copy.addons.credits.price]);

  const label = t.custom ? e.custom : t.from ? e.fromPerMonth : e.perMonth;
  const live = [
    t.custom ? fill(e.liveCustom, { plan: name }) : fill(t.from ? e.liveFrom : e.live, { plan: name, amount: t.monthly.toLocaleString('en-US') }),
    st.appOn ? fill(e.liveSetup, { setup: fmt(BRANDED.setup) }) : null,
    st.aiOn ? e.liveCredits : null,
  ]
    .filter(Boolean)
    .join('. ');
  return {
    total: t.custom ? copy.plans.federations.price : fmt(t.monthly),
    totalLabel: st.aiOn ? `${label} ${e.plusCredits}` : label,
    setup: st.appOn ? fmt(BRANDED.setup) : null,
    rows,
    coach: { checked: String(st.coachOn && allowed), disabled: !allowed },
    app: { checked: String(st.appOn), disabled: false },
    ai: { checked: String(st.aiOn), disabled: false },
    qty: String(st.qty),
    stepVisible: String(st.coachOn && allowed),
    stepDisabled: [String(st.qty - 1 < 1), String(st.qty + 1 > MAX_COACHES)],
    note: allowed ? null : copy.addons.extraCoach.unavailable[st.plan],
    pressed: st.plan,
    cta: copy.plans[st.plan].cta,
    live,
  };
}

/** Read the same things off the page. */
export const readView = () => {
  const text = (s) => document.querySelector(s)?.textContent.trim() ?? null;
  const setup = document.querySelector('[data-setup]');
  const rowOf = (el) => {
    const spans = el.querySelectorAll('.r > span');
    return [el.dataset.k, spans[0]?.textContent.trim(), spans[1]?.textContent.trim()];
  };
  const swOf = (s) => {
    const b = document.querySelector(s);
    return { checked: b.getAttribute('aria-checked'), disabled: b.disabled };
  };
  const note = document.querySelector('[data-coach-note]');
  const cta = document.querySelector('[data-est-cta]');
  const card = document.querySelector(`.pcard[data-plan="${document.querySelector('.pcard__use[aria-pressed="true"]')?.dataset.use}"] a.btn`);
  return {
    total: text('[data-total]'),
    totalLabel: text('[data-total-lbl]'),
    setup: setup.hidden ? null : text('[data-setup-amt]'),
    rows: [...document.querySelectorAll('[data-lines] .el:not(.out)')].map(rowOf),
    coach: swOf('.sw[data-sw="coach"]'),
    app: swOf('.sw[data-sw="app"]'),
    ai: swOf('.sw[data-sw="ai"]'),
    qty: text('[data-qty]'),
    stepVisible: String(getComputedStyle(document.querySelector('[data-stepper]')).visibility === 'visible'),
    stepDisabled: [...document.querySelectorAll('[data-step]')].map((b) => b.getAttribute('aria-disabled')),
    note: note && !note.hidden ? note.textContent.trim() : null,
    pressed: [...document.querySelectorAll('.pcard__use[aria-pressed="true"]')].map((b) => b.dataset.use).join(),
    cta: cta?.textContent.trim(),
    ctaHref: cta?.getAttribute('href'),
    cardHref: card?.getAttribute('href') ?? null,
    live: document.querySelector('[data-est-live]')?.textContent.trim() ?? '',
    onFlags: [...document.querySelectorAll('.addon[data-on]')].map((a) => `${a.dataset.addon}=${a.dataset.on}`).join(),
  };
};

/** Differences between what the model wants and what the page shows, as short strings. */
export function diffView(want, got, { checkLive = true } = {}) {
  const bad = [];
  const cmp = (key, a, b) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) bad.push(`${key}: want ${JSON.stringify(a)}, got ${JSON.stringify(b)}`);
  };
  for (const key of ['total', 'totalLabel', 'setup', 'rows', 'coach', 'app', 'ai', 'qty', 'stepVisible', 'stepDisabled', 'note', 'pressed', 'cta']) cmp(key, want[key], got[key]);
  if (got.ctaHref !== got.cardHref) bad.push(`est CTA goes to ${got.ctaHref}, the ${want.pressed} card goes to ${got.cardHref}`);
  if (checkLive) cmp('live', want.live, got.live);
  const on = `extra-coach=${want.coach.checked},branded-app=${want.app.checked},credits=${want.ai.checked}`;
  if (got.onFlags !== on) bad.push(`data-on: want ${on}, got ${got.onFlags}`);
  return bad;
}

export async function estimateChecks({ open, close, check, sleep, out }) {
  const fresh = () => ({ index: sizes.indexOf(100), billing: 'monthly', plan: 'core', coachOn: false, qty: 1, appOn: false, aiOn: false });

  // The driver: one function per way a person can change the estimate. Each updates the model the way the page should.
  const actions = (page, st) => ({
    slider: async (i) => {
      await page.locator('input[data-athletes]').fill(String(i));
      st.index = i;
    },
    billing: async (b) => {
      await page.locator(`label.seg__opt:has(input[value="${b}"])`).click();
      st.billing = b;
    },
    plan: async (p) => {
      await page.locator(`.pcard__use[data-use="${p}"]`).click();
      st.plan = p;
      return true;
    },
    coach: async () => {
      const allowed = st.plan === 'core' || st.plan === 'performance';
      if (!allowed) return false;
      await page.locator(sw.coach).click();
      st.coachOn = !st.coachOn;
      return true;
    },
    step: async (d) => {
      // The stepper only shows while the extra-coach switch is on.
      if (!(st.coachOn && (st.plan === 'core' || st.plan === 'performance'))) return false;
      // aria-disabled buttons stay in the tab order and take the click; Playwright would wait on them, so force it.
      await page.locator(`[data-step="${d}"]`).click({ force: true });
      const next = st.qty + d;
      if (next < 1 || next > MAX_COACHES) return false;
      st.qty = next;
      return true;
    },
    app: async () => {
      await page.locator(sw.app).click();
      st.appOn = !st.appOn;
      return true;
    },
    ai: async () => {
      await page.locator(sw.ai).click();
      st.aiOn = !st.aiOn;
      return true;
    },
  });

  // ------------------------------------------------------------ 1. the owner's scenario, by hand, from the table
  for (const locale of ['en', 'es']) {
    for (const region of ['us', 'latam']) {
      const page = await open(`${paths[locale]}?region=${region}`, { width: 1280, height: 900 });
      const st = fresh();
      const act = actions(page, st);
      const start = diffView(expectedView({ locale, region, st }), await page.evaluate(readView), { checkLive: false });
      await act.slider(sizes.indexOf(250));
      await act.billing('annual');
      await act.plan('core');
      await act.coach();
      await act.step(1);
      await act.app();
      const want = expectedView({ locale, region, st });
      const got = await page.evaluate(readView);
      const bad = [...start.map((d) => `at load: ${d}`), ...diffView(want, got)];
      // Named by hand, so the arithmetic is on the page of this file and not only in the oracle: US is 314 + 40 + 99.
      const headline = region === 'us' ? { total: '$453', coach: '$40', plan: '$314' } : { total: `$${annual(ORACLE.latam[250][1]) + 2 * 10 + 99}`, coach: '$20', plan: `$${annual(ORACLE.latam[250][1])}` };
      const rowValue = (key) => got.rows.find((r) => r[0] === key)?.[2] ?? '';
      if (got.total !== headline.total) bad.push(`total ${got.total}, want ${headline.total}`);
      if (!rowValue('plan').startsWith(headline.plan)) bad.push(`plan row ${rowValue('plan')}, want ${headline.plan}`);
      if (!rowValue('coach').startsWith(headline.coach)) bad.push(`coach row ${rowValue('coach')}, want ${headline.coach}`);
      if (!rowValue('app').startsWith('$99')) bad.push(`app row ${rowValue('app')}, want $99`);
      if (got.setup !== '$499') bad.push(`setup ${got.setup}, want $499, shown apart from the monthly total`);
      if (got.rows.some((r) => r[0] === 'ai')) bad.push('a credits row appeared without the credits switch');
      if (/499/.test(got.total)) bad.push('the setup fee leaked into the monthly total');
      check('pricing/estimate', `${locale}/${region}: Core 250 annual + 2 extra coaches + branded app totals ${headline.total} a month with ${fmt(BRANDED.setup)} setup apart, rows and announcement match`, bad.length === 0, bad.slice(0, 4).join('; '));
      await close(page);
    }
  }

  // ------------------------------------------------------------ 2. every plan, both billings, one add-on mix
  {
    const bad = [];
    let combos = 0;
    for (const locale of ['en', 'es']) {
      for (const region of ['us', 'latam']) {
        const page = await open(`${paths[locale]}?region=${region}`, { width: 1280, height: 900 });
        const st = fresh();
        const act = actions(page, st);
        for (const billing of ['monthly', 'annual']) {
          for (const index of [0, 3, 5]) {
            await act.slider(index);
            await act.billing(billing);
            for (const plan of PLANS) {
              await act.plan(plan);
              combos++;
              for (const d of diffView(expectedView({ locale, region, st }), await page.evaluate(readView))) bad.push(`${locale}/${region}/${billing}/${sizes[index]}/${plan}: ${d}`);
            }
          }
        }
        await close(page);
      }
    }
    out.estimatePlanCombos = combos;
    check('pricing/estimate', `every plan x both billings x 25/250/1000 athletes x en/es x US/LatAm (${combos} states) shows the oracle's total, rows and call to action`, bad.length === 0, bad.slice(0, 3).join('; '));
  }

  // ------------------------------------------------------------ 3. seeded random walk over every control
  {
    const bad = [];
    let steps = 0;
    let seed = 20240917;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pick = (list) => list[Math.floor(rand() * list.length)];
    for (const [locale, region] of [['en', 'us'], ['es', 'latam'], ['en', 'latam'], ['es', 'us']]) {
      const page = await open(`${paths[locale]}?region=${region}`, { width: 1440, height: 900 });
      const st = fresh();
      const act = actions(page, st);
      let live = '';
      for (let n = 0; n < 90; n++) {
        const r = rand();
        let estimateAction = false;
        let label = '';
        if (r < 0.14) {
          const i = Math.floor(rand() * sizes.length);
          await act.slider(i);
          label = `slider ${sizes[i]}`;
        } else if (r < 0.26) {
          const b = pick(['monthly', 'annual']);
          await act.billing(b);
          label = `billing ${b}`;
        } else if (r < 0.46) {
          const p = pick(PLANS);
          estimateAction = await act.plan(p);
          label = `plan ${p}`;
        } else if (r < 0.6) {
          estimateAction = await act.coach();
          label = 'coach switch';
        } else if (r < 0.78) {
          const d = pick([-1, 1, 1]);
          estimateAction = await act.step(d);
          label = `coaches ${d > 0 ? '+' : '-'}1`;
        } else if (r < 0.9) {
          estimateAction = await act.app();
          label = 'app switch';
        } else {
          estimateAction = await act.ai();
          label = 'credits switch';
        }
        steps++;
        const want = expectedView({ locale, region, st });
        // The announcement follows the estimate actions only (billing and the slider have their own live region).
        if (estimateAction) live = want.live;
        const got = await page.evaluate(readView);
        for (const d of diffView({ ...want, live }, got)) bad.push(`${locale}/${region} step ${n} (${label}): ${d}`);
        if (bad.length > 6) break;
      }
      if (page.problems.length) bad.push(`${locale}/${region}: ${page.problems.slice(0, 2).join('; ')}`);
      await close(page);
    }
    out.estimateWalkSteps = steps;
    check('pricing/estimate', `${steps} random changes (slider, billing, plan, extra-coach switch and stepper, app, credits) across en/es x US/LatAm keep the estimate equal to the oracle after every one`, bad.length === 0, bad.slice(0, 3).join('; '));
  }

  // ------------------------------------------------------------ 4. limits, memory, and what is not priced
  {
    const bad = [];
    const page = await open(paths.en, { width: 1280, height: 900 });
    const st = fresh();
    const act = actions(page, st);
    await act.coach();
    for (let i = 0; i < MAX_COACHES + 3; i++) await act.step(1);
    let got = await page.evaluate(readView);
    if (got.qty !== String(MAX_COACHES)) bad.push(`the stepper reached ${got.qty}, want a stop at ${MAX_COACHES}`);
    if (got.stepDisabled[1] !== 'true') bad.push('the + button is not aria-disabled at the maximum');
    if (got.total !== fmt(estimateOracle({ plan: 'core', extraCoaches: MAX_COACHES }).monthly)) bad.push(`${MAX_COACHES} coaches total ${got.total}`);
    for (let i = 0; i < MAX_COACHES + 3; i++) await act.step(-1);
    got = await page.evaluate(readView);
    if (got.qty !== '1') bad.push(`the stepper reached ${got.qty}, want a stop at 1`);
    if (got.stepDisabled[0] !== 'true') bad.push('the - button is not aria-disabled at one');
    await act.step(1);
    await act.step(1);
    await act.plan('schools');
    got = await page.evaluate(readView);
    if (!got.coach.disabled || got.coach.checked !== 'false') bad.push(`on Schools the coach switch is ${JSON.stringify(got.coach)}, want off and disabled`);
    if (!got.note) bad.push('Schools shows no reason for the disabled coach switch');
    if (got.rows.some((r) => r[0] === 'coach')) bad.push('Schools still lists an extra-coach row');
    if (got.total !== fmt(Math.min(...EDU.us)) || got.totalLabel !== en.estimate.fromPerMonth) bad.push(`Schools total ${got.total} (${got.totalLabel}), want ${fmt(Math.min(...EDU.us))} from`);
    await act.plan('performance');
    got = await page.evaluate(readView);
    if (got.coach.checked !== 'true' || got.qty !== '3') bad.push(`back on Performance the coach switch is ${got.coach.checked} at ${got.qty}, want it remembered: on at 3`);
    await act.plan('federations');
    await act.app();
    got = await page.evaluate(readView);
    if (got.total !== en.plans.federations.price || got.totalLabel !== en.estimate.custom) bad.push(`Federations total ${got.total} (${got.totalLabel}), want custom pricing`);
    if (got.setup !== '$499') bad.push('the app setup fee is not listed on Federations');
    await act.app();
    await act.plan('free');
    got = await page.evaluate(readView);
    if (got.total !== '$0') bad.push(`Free total ${got.total}, want $0`);
    if (!got.coach.disabled || got.coach.checked !== 'false' || got.rows.some((r) => r[0] === 'coach')) bad.push(`on Free the coach switch is ${JSON.stringify(got.coach)}, want off and disabled with no coach row`);
    // Credits are "talk to us": a row and a label, never a number.
    await act.plan('core');
    const before = (await page.evaluate(readView)).total;
    await act.ai();
    got = await page.evaluate(readView);
    const row = got.rows.find((r) => r[0] === 'ai');
    if (!row || row[2] !== en.addons.credits.price || /\d|\$/.test(row[2])) bad.push(`credits row ${JSON.stringify(row)}, want the words "${en.addons.credits.price}" and no amount`);
    if (got.total !== before) bad.push(`credits changed the total from ${before} to ${got.total}`);
    if (!got.totalLabel.endsWith(en.estimate.plusCredits)) bad.push(`total label "${got.totalLabel}" does not say credits are extra`);
    // The toggle and the slider never touch what the person has already chosen.
    await act.app();
    await act.slider(sizes.indexOf(500));
    await act.billing('annual');
    got = await page.evaluate(readView);
    if (got.app.checked !== 'true' || got.coach.checked !== 'true' || got.ai.checked !== 'true' || got.qty !== '3') bad.push(`moving the slider and billing reset the choices: ${JSON.stringify({ app: got.app.checked, coach: got.coach.checked, ai: got.ai.checked, qty: got.qty })}`);
    check('pricing/estimate', 'coaches stop at 1 and 20, the coach switch is off on Free, Schools and Federations and is remembered, credits show words not a number, the slider and billing keep the choices', bad.length === 0, bad.slice(0, 4).join('; '));
    check('pricing/estimate', 'the estimate flow logged no console errors', page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);
  }

  // ------------------------------------------------------------ 5. with motion on: the odometer settles, rows come and go, announcements are plain text
  {
    const bad = [];
    const page = await open(paths.en, { width: 1280, height: 900, reduced: false });
    const st = fresh();
    const act = actions(page, st);
    await act.slider(sizes.indexOf(250));
    await act.billing('annual');
    await act.coach();
    await act.step(1);
    await act.app();
    await page.waitForFunction(() => document.querySelectorAll('[data-total] .dg, .is-rolling').length === 0, null, { timeout: 4000 }).catch(() => bad.push('the total never settled to plain text'));
    const settled = await page.evaluate(() => ({ html: document.querySelector('[data-total]').innerHTML, text: document.querySelector('[data-total]').textContent.trim(), rows: document.querySelectorAll('[data-lines] .el').length }));
    if (settled.text !== '$453' || /<|dg/.test(settled.html)) bad.push(`after the roll the total is ${JSON.stringify(settled.html)}, want plain $453`);
    await act.coach();
    await sleep(700);
    const rowsAfter = await page.evaluate(() => [...document.querySelectorAll('[data-lines] .el')].map((el) => el.dataset.k));
    if (rowsAfter.join() !== 'plan,app') bad.push(`after the coach row leaves the rows are ${rowsAfter}, want plan,app`);
    const bump = await page.evaluate(async () => {
      document.querySelector('.sw[data-sw="ai"]').click();
      document.querySelector('.sw[data-sw="coach"]').click();
      await new Promise((r) => setTimeout(r, 60));
      const bumped = document.querySelector('[data-est]').classList.contains('bump');
      await new Promise((r) => setTimeout(r, 700));
      return { bumped, cleared: !document.querySelector('[data-est]').classList.contains('bump') };
    });
    if (!bump.bumped || !bump.cleared) bad.push(`the total bump ${JSON.stringify(bump)}, want it on a change and cleared after`);
    const live = await page.evaluate(() => ({ role: document.querySelector('[data-est-live]').getAttribute('role'), live: document.querySelector('[data-est-live]').getAttribute('aria-live'), box: document.querySelector('[data-est]').getAttribute('aria-labelledby') }));
    if (live.role !== 'status' || live.live !== 'polite' || live.box !== 'est-title') bad.push(`estimate live region ${JSON.stringify(live)}`);
    check('pricing/estimate', 'with motion on the total rolls then settles to plain text, rows leave, the bump fires once and clears, the announcement is a polite status', bad.length === 0, bad.slice(0, 3).join('; '));
    check('pricing/estimate', 'the motion pass logged no console errors', page.problems.length === 0, page.problems.slice(0, 2).join('; '));
    await close(page);
  }
}
