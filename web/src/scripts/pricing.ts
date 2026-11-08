// Pricing page behaviour: region, billing toggle, roster slider, odometer prices, plan spotlight, add-on switches,
// the live estimate and the reveal panels (More info, FAQ).
// Everything here is an enhancement. The HTML already holds the US monthly prices for 100 athletes.
// `data-ready` goes on only after every part below has started. If this module never runs or throws, the
// inline failsafe in PricingPage.astro marks the page `data-fallback` instead: the controls, switches and estimate
// stay hidden and every reveal is open, so nothing on screen depends on a script that did not run.
import { addOns, athleteBands, bandFor, defaultBand, free, usd, type Billing, type Region } from '../data/prices';
import { detectRegion } from '../lib/region';
import { fill } from '../lib/template';
import { autoplayer, isReduced, startKit } from './motion/kit';

type PlanKey = 'free' | 'core' | 'performance' | 'federations';

interface Strings {
  billedMonthly: string;
  billedYearly: string;
  meta: string;
  live: string;
  liveYearly: string;
  unit: string;
  core: string;
  performance: string;
  free: string;
  federations: string;
  federationsPrice: string;
  creditsName: string;
  creditsPrice: string;
  appName: string;
  coachUnavailable: { free: string; federations: string };
  valueText: string;
  coachesLabel: string;
  estimate: {
    perMonth: string;
    custom: string;
    plusCredits: string;
    yearly: string;
    planRow: string;
    coachRow: string;
    live: string;
    liveCustom: string;
    liveSetup: string;
    liveCredits: string;
  };
  cta: Record<PlanKey, string>;
  links: Record<PlanKey | 'talk', string>;
}

interface Row {
  key: 'plan' | 'coach' | 'app' | 'ai';
  label: string;
  value: string;
}

const MAX_COACHES = 20;
const ROW_ORDER: Row['key'][] = ['plan', 'coach', 'app', 'ai'];
const DIGIT = /\d/;
const root = document.querySelector<HTMLElement>('[data-pricing]');

const rollTimers = new WeakMap<Element, number>();

function settle(el: HTMLElement, text: string): void {
  el.classList.remove('odo-on', 'is-rolling');
  el.textContent = text;
}

/**
 * Sets a price. With `animate` each digit rolls from its old value to the new one (a column of 0 to 9 slides
 * behind the digit, units first). The price is always readable as its real value, mid-roll included: it lives in a
 * visually hidden span, and the wheels are an aria-hidden picture of it whose characters are drawn by CSS from
 * `data-ch` (no text nodes), so neither the DOM text nor the accessibility tree ever holds a half-rolled number or a
 * 0-to-9 strip. Reduced motion, or no digits, just sets the text.
 */
function setNumber(el: HTMLElement | null, text: string, animate: boolean): void {
  if (!el) return;
  const before = el.textContent ?? '';
  if (before === text) return;
  const pending = rollTimers.get(el);
  if (pending) window.clearTimeout(pending);
  rollTimers.delete(el);
  if (!animate || isReduced() || !DIGIT.test(text)) {
    settle(el, text);
    return;
  }
  const next = [...text];
  const prev = [...before];
  const real = document.createElement('span');
  real.className = 'sr-only';
  real.textContent = text;
  const wheels = document.createElement('span');
  wheels.className = 'odo';
  wheels.setAttribute('aria-hidden', 'true');
  const digits: HTMLElement[] = [];
  next.forEach((ch, at) => {
    const cell = document.createElement('span');
    cell.dataset.ch = ch;
    if (!DIGIT.test(ch)) {
      cell.className = 'odo-ch';
      wheels.append(cell);
      return;
    }
    const fromEnd = next.length - 1 - at;
    const old = prev[prev.length - 1 - fromEnd];
    cell.className = 'dg';
    cell.style.setProperty('--k', String(fromEnd));
    cell.style.setProperty('--d', old && DIGIT.test(old) ? old : '0');
    digits.push(cell);
    wheels.append(cell);
  });
  el.replaceChildren(real, wheels);
  el.classList.add('odo-on', 'is-rolling');
  void el.offsetWidth;
  for (const dg of digits) dg.style.setProperty('--d', dg.dataset.ch ?? '0');
  rollTimers.set(
    el,
    window.setTimeout(() => settle(el, text), 700 + 45 * digits.length + 80),
  );
}

function setText(el: Element | null, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

function initPrices(host: HTMLElement): void {
  const strings = JSON.parse(host.dataset.strings ?? '{}') as Strings;
  const est = strings.estimate;
  const billingInputs = Array.from(host.querySelectorAll<HTMLInputElement>('input[data-billing]'));
  const range = host.querySelector<HTMLInputElement>('input[data-athletes]');
  const rangeBox = host.querySelector<HTMLElement>('[data-range]');
  const ticks = Array.from(host.querySelectorAll<HTMLElement>('[data-tick]'));
  const live = host.querySelector<HTMLElement>('[data-live]');
  const lastBand = athleteBands.length - 1;

  const panel = host.querySelector<HTMLElement>('[data-est]');
  const lines = host.querySelector<HTMLElement>('[data-lines]');
  const total = host.querySelector<HTMLElement>('[data-total]');
  const totalLabel = host.querySelector<HTMLElement>('[data-total-lbl]');
  const setupRow = host.querySelector<HTMLElement>('[data-setup]');
  const setupAmount = host.querySelector<HTMLElement>('[data-setup-amt]');
  const estCta = host.querySelector<HTMLAnchorElement>('[data-est-cta]');
  const estLive = host.querySelector<HTMLElement>('[data-est-live]');
  const useButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-use]'));
  const coachSwitch = host.querySelector<HTMLButtonElement>('[data-sw="coach"]');
  const appSwitch = host.querySelector<HTMLButtonElement>('[data-sw="app"]');
  const aiSwitch = host.querySelector<HTMLButtonElement>('[data-sw="ai"]');
  const coachNote = host.querySelector<HTMLElement>('[data-coach-note]');
  const qtyOut = host.querySelector<HTMLOutputElement>('[data-qty]');
  const stepButtons = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-step]'));

  const region: Region = detectRegion(window.location.search);
  let billing: Billing = billingInputs.find((i) => i.checked)?.value === 'annual' ? 'annual' : 'monthly';
  let index = Math.min(lastBand, Math.max(0, Number(range?.value ?? athleteBands.indexOf(defaultBand))));
  let plan: PlanKey = 'core';
  let coachOn = false;
  let qty = 1;
  let appOn = false;
  let aiOn = false;
  let lastTotal = '';

  const athletes = () => athleteBands[index];
  const coachAllowed = () => plan === 'core' || plan === 'performance';

  function renderLines(rows: Row[], animate: boolean): void {
    if (!lines) return;
    const existing = new Map<string, HTMLElement>();
    for (const el of Array.from(lines.children) as HTMLElement[]) existing.set(el.dataset.k ?? '', el);
    const wanted = new Set<string>(rows.map((r) => r.key));

    for (const row of rows) {
      let el = existing.get(row.key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'el';
        el.dataset.k = row.key;
        const inner = document.createElement('div');
        const line = document.createElement('div');
        line.className = 'r';
        line.append(document.createElement('span'), document.createElement('span'));
        inner.append(line);
        el.append(inner);
        const after = ROW_ORDER.indexOf(row.key);
        const next = Array.from(lines.children).find((c) => ROW_ORDER.indexOf((c as HTMLElement).dataset.k as Row['key']) > after);
        lines.insertBefore(el, next ?? null);
        if (animate && !isReduced()) {
          el.classList.add('out');
          void el.offsetWidth;
          el.classList.remove('out');
        }
        existing.set(row.key, el);
      } else if (el.classList.contains('out')) {
        el.classList.remove('out');
      }
      const spans = el.querySelectorAll('.r > span');
      setText(spans[0], row.label);
      setText(spans[1], row.value);
    }

    for (const [key, el] of existing) {
      if (wanted.has(key) || el.classList.contains('out')) continue;
      if (!animate || isReduced()) {
        el.remove();
        continue;
      }
      el.classList.add('out');
      window.setTimeout(() => {
        if (el.classList.contains('out')) el.remove();
      }, 420);
    }
  }

  function planRow(band: ReturnType<typeof bandFor>): { row: Row; amount: number; custom: boolean } {
    const perMonth = (monthly: number, yearly: number) => (billing === 'annual' ? yearly : monthly);
    if (plan === 'core' || plan === 'performance') {
      const price = band[plan];
      const amount = perMonth(price.monthly, price.annualMonthly);
      return {
        row: {
          key: 'plan',
          label: fill(est.planRow, { plan: strings[plan], athletes: band.athletes.toLocaleString('en-US') }),
          value: `${usd(amount)}${strings.unit}${billing === 'annual' ? ` (${est.yearly})` : ''}`,
        },
        amount,
        custom: false,
      };
    }
    if (plan === 'federations') {
      return { row: { key: 'plan', label: strings.federations, value: strings.federationsPrice }, amount: 0, custom: true };
    }
    return { row: { key: 'plan', label: strings.free, value: `${usd(free.monthly)}${strings.unit}` }, amount: free.monthly, custom: false };
  }

  function renderEstimate(animate: boolean, announce: boolean): void {
    if (!panel) return;
    const band = bandFor(region, athletes());
    const base = planRow(band);
    const rows: Row[] = [base.row];
    let sum = base.amount;
    const coachCount = coachOn && coachAllowed() ? qty : 0;
    if (coachCount > 0) {
      const amount = addOns.extraCoach[region] * coachCount;
      sum += amount;
      rows.push({ key: 'coach', label: fill(est.coachRow, { qty: String(coachCount) }), value: `${usd(amount)}${strings.unit}` });
    }
    if (appOn) {
      sum += addOns.brandedApp.monthly;
      rows.push({ key: 'app', label: strings.appName, value: `${usd(addOns.brandedApp.monthly)}${strings.unit}` });
    }
    if (aiOn) rows.push({ key: 'ai', label: strings.creditsName, value: strings.creditsPrice });

    renderLines(rows, animate);
    const totalText = base.custom ? strings.federationsPrice : usd(sum);
    const label = base.custom ? est.custom : est.perMonth;
    setText(totalLabel, aiOn ? `${label} ${est.plusCredits}` : label);
    setNumber(total, totalText, animate);
    if (setupRow) setupRow.hidden = !appOn;
    setText(setupAmount, usd(addOns.brandedApp.setup));

    if (estCta) {
      estCta.href = strings.links[plan];
      estCta.textContent = strings.cta[plan];
    }

    if (animate && totalText !== lastTotal && !isReduced()) {
      panel.classList.remove('bump');
      void panel.offsetWidth;
      panel.classList.add('bump');
      window.setTimeout(() => panel.classList.remove('bump'), 520);
    }
    lastTotal = totalText;

    if (announce && estLive) {
      const amount = sum.toLocaleString('en-US');
      const parts = [
        base.custom
          ? fill(est.liveCustom, { plan: strings[plan] })
          : fill(est.live, { plan: strings[plan], amount }),
      ];
      if (appOn) parts.push(fill(est.liveSetup, { setup: usd(addOns.brandedApp.setup) }));
      if (aiOn) parts.push(est.liveCredits);
      estLive.textContent = parts.join('. ');
    }
  }

  function renderAddons(): void {
    const allowed = coachAllowed();
    if (coachSwitch) {
      const on = coachOn && allowed;
      coachSwitch.setAttribute('aria-checked', String(on));
      coachSwitch.disabled = !allowed;
      coachSwitch.closest<HTMLElement>('.addon')?.setAttribute('data-on', String(on));
    }
    if (coachNote) {
      const reason = plan === 'free' || plan === 'federations' ? strings.coachUnavailable[plan] : '';
      coachNote.textContent = reason;
      coachNote.hidden = allowed;
    }
    if (appSwitch) {
      appSwitch.setAttribute('aria-checked', String(appOn));
      appSwitch.closest<HTMLElement>('.addon')?.setAttribute('data-on', String(appOn));
    }
    if (aiSwitch) {
      aiSwitch.setAttribute('aria-checked', String(aiOn));
      aiSwitch.closest<HTMLElement>('.addon')?.setAttribute('data-on', String(aiOn));
    }
    setText(qtyOut, String(qty));
    for (const button of stepButtons) {
      const next = qty + Number(button.dataset.step);
      button.setAttribute('aria-disabled', String(next < 1 || next > MAX_COACHES));
    }
    for (const button of useButtons) button.setAttribute('aria-pressed', String(button.dataset.use === plan));
  }

  function render(announce: boolean): void {
    const count = athletes();
    const band = bandFor(region, count);
    host.dataset.region = region;
    host.dataset.billing = billing;
    host.dataset.athletes = String(band.athletes);

    if (rangeBox) rangeBox.style.setProperty('--f', String(index / lastBand));
    for (const tick of ticks) tick.classList.toggle('on', Number(tick.dataset.tick) === index);
    const countLabel = band.athletes.toLocaleString('en-US');
    setText(host.querySelector('[data-ath-label]'), countLabel);
    setText(host.querySelector('[data-coach-label]'), fill(strings.coachesLabel, { coaches: String(band.coaches) }));
    range?.setAttribute('aria-valuetext', fill(strings.valueText, { athletes: countLabel, coaches: String(band.coaches) }));

    const parts: string[] = [];
    for (const key of ['core', 'performance'] as const) {
      const price = band[key];
      const monthly = billing === 'annual' ? price.annualMonthly : price.monthly;
      setNumber(host.querySelector(`[data-amount="${key}"]`), usd(monthly), announce);
      const card = host.querySelector(`.pcard--${key}`);
      setText(card?.querySelector('[data-meta]') ?? null, fill(strings.meta, { athletes: countLabel, coaches: String(band.coaches) }));
      setText(
        card?.querySelector('[data-billed]') ?? null,
        billing === 'annual' ? fill(strings.billedYearly, { total: usd(price.annualYearly) }) : strings.billedMonthly,
      );
      parts.push(
        fill(billing === 'annual' ? strings.liveYearly : strings.live, {
          plan: strings[key],
          amount: monthly.toLocaleString('en-US'),
        }),
      );
    }

    // The extra-coach price follows the region only, never the toggle.
    for (const el of host.querySelectorAll('[data-extra-coach]')) {
      setText(el, usd(addOns.extraCoach[region]));
    }

    renderAddons();
    renderEstimate(announce, false);

    if (announce && live) live.textContent = parts.join('. ');
  }

  function renderChoice(): void {
    renderAddons();
    renderEstimate(true, true);
  }

  for (const input of billingInputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      billing = input.value === 'annual' ? 'annual' : 'monthly';
      render(true);
    });
  }
  range?.addEventListener('input', () => {
    index = Math.min(lastBand, Math.max(0, Number(range.value)));
    render(true);
  });
  for (const tick of ticks) {
    tick.addEventListener('click', () => {
      if (!range) return;
      range.value = tick.dataset.tick ?? String(index);
      range.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  for (const button of useButtons) {
    button.addEventListener('click', () => {
      plan = button.dataset.use as PlanKey;
      renderChoice();
    });
  }
  coachSwitch?.addEventListener('click', () => {
    if (!coachAllowed()) return;
    coachOn = !coachOn;
    renderChoice();
  });
  appSwitch?.addEventListener('click', () => {
    appOn = !appOn;
    renderChoice();
  });
  aiSwitch?.addEventListener('click', () => {
    aiOn = !aiOn;
    renderChoice();
  });
  for (const button of stepButtons) {
    button.addEventListener('click', () => {
      const next = qty + Number(button.dataset.step);
      if (next < 1 || next > MAX_COACHES) return;
      qty = next;
      renderChoice();
    });
  }

  // The spotlight on a plan card follows the pointer.
  host.addEventListener('pointermove', (event) => {
    if (isReduced()) return;
    const card = (event.target as Element).closest<HTMLElement>('.pcard');
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty('--sx', `${Math.round(event.clientX - box.left)}px`);
    card.style.setProperty('--sy', `${Math.round(event.clientY - box.top)}px`);
  });

  // One handler for every "More info" button and every FAQ question: it toggles the panel it controls.
  host.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-reveal-btn]');
    if (!button) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.getElementById(button.getAttribute('aria-controls') ?? '')?.classList.toggle('open', open);
  });

  // The estimate's background drift is a CSS loop with no script clock, so it follows the shared autoplayer through
  // the data-ap mirror (pricing.css): it moves only while the panel is on screen, the tab is visible, reduced motion is
  // off and neither the pointer nor focus is inside it.
  if (panel) autoplayer(panel, { play: () => {}, pause: () => {} });

  render(false);
}

if (root) {
  startKit();
  initPrices(root);
  root.removeAttribute('data-fallback');
  root.setAttribute('data-ready', '');
}
