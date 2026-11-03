// Pricing page behaviour: region, billing toggle, athlete selector, price rendering, dialogs.
// Everything here is an enhancement. The HTML already holds the US monthly prices for 100 athletes.
import { bandFor, defaultBand, education, addOns, usd, type Billing, type Region } from '../data/pricing';
import { detectRegion } from '../data/region';

interface Strings {
  billedMonthly: string;
  billedYearly: string;
  meta: string;
  live: string;
  liveYearly: string;
  core: string;
  performance: string;
}

const root = document.querySelector<HTMLElement>('[data-pricing]');

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

function timeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function setText(el: Element | null, text: string, roll: boolean): void {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  if (!roll) return;
  el.classList.remove('is-rolling');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-rolling');
  window.setTimeout(() => el.classList.remove('is-rolling'), 300);
}

function initPrices(host: HTMLElement): void {
  const strings = JSON.parse(host.dataset.strings ?? '{}') as Strings;
  const billingInputs = Array.from(host.querySelectorAll<HTMLInputElement>('input[data-billing]'));
  const athletesSelect = host.querySelector<HTMLSelectElement>('select[data-athletes]');
  const live = host.querySelector<HTMLElement>('[data-live]');

  const region: Region = detectRegion(window.location.search, timeZone());
  let billing: Billing = billingInputs.find((i) => i.checked)?.value === 'annual' ? 'annual' : 'monthly';
  let athletes = Number(athletesSelect?.value ?? defaultBand);

  function render(announce: boolean): void {
    const band = bandFor(region, athletes);
    host.dataset.region = region;
    host.dataset.billing = billing;
    host.dataset.athletes = String(band.athletes);

    const parts: string[] = [];
    for (const plan of ['core', 'performance'] as const) {
      const price = band[plan];
      const monthly = billing === 'annual' ? price.annualMonthly : price.monthly;
      setText(host.querySelector(`[data-amount="${plan}"]`), usd(monthly), announce);
      const card = host.querySelector(`.pcard--${plan}`);
      setText(
        card?.querySelector('[data-meta]') ?? null,
        fill(strings.meta, { athletes: band.athletes.toLocaleString('en-US'), coaches: String(band.coaches) }),
        false,
      );
      setText(
        card?.querySelector('[data-billed]') ?? null,
        billing === 'annual' ? fill(strings.billedYearly, { total: usd(price.annualYearly) }) : strings.billedMonthly,
        false,
      );
      parts.push(
        fill(billing === 'annual' ? strings.liveYearly : strings.live, {
          plan: strings[plan],
          amount: monthly.toLocaleString('en-US'),
        }),
      );
    }

    // Education rates and the extra-coach price follow the region only, never the toggle.
    const rates = education[region];
    setText(host.querySelector('[data-schools-from]'), usd(Math.min(...rates.map((r) => r.monthly))), false);
    for (const rate of rates) {
      setText(host.querySelector(`[data-edu-rate="${rate.key}"]`), usd(rate.monthly), false);
    }
    for (const el of host.querySelectorAll('[data-extra-coach]')) {
      setText(el, usd(addOns.extraCoach[region]), false);
    }

    if (announce && live) live.textContent = parts.join('. ');
  }

  for (const input of billingInputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      billing = input.value === 'annual' ? 'annual' : 'monthly';
      render(true);
    });
  }
  athletesSelect?.addEventListener('change', () => {
    athletes = Number(athletesSelect.value);
    render(true);
  });

  render(false);
  host.setAttribute('data-ready', '');
}

function initDialogs(host: HTMLElement): void {
  let opener: HTMLElement | null = null;
  const tabbable =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  host.addEventListener('click', (event) => {
    const target = event.target as Element;
    const trigger = target.closest<HTMLElement>('[data-open-modal]');
    if (trigger) {
      const dialog = document.getElementById(trigger.dataset.openModal ?? '');
      if (dialog instanceof HTMLDialogElement && !dialog.open) {
        opener = trigger;
        dialog.showModal();
      }
      return;
    }
    const closer = target.closest('[data-modal-close]');
    if (closer) {
      closer.closest('dialog')?.close();
      return;
    }
    if (target instanceof HTMLDialogElement && target.hasAttribute('data-modal')) {
      const box = target.getBoundingClientRect();
      const inside =
        event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      if (!inside) target.close();
    }
  });

  // Keep Tab and Shift+Tab inside the open dialog.
  host.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const dialog = (event.target as Element).closest<HTMLDialogElement>('dialog[open]');
    if (!dialog) return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(tabbable)).filter((el) => el.getClientRects().length > 0);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // `close` does not bubble, so listen in the capture phase. Hand focus back to the button that opened it.
  host.addEventListener(
    'close',
    () => {
      opener?.focus();
      opener = null;
    },
    true,
  );
}

if (root) {
  initPrices(root);
  initDialogs(root);
}
