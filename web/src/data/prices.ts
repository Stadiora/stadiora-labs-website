// The one price table for the whole site. Every amount, count and percentage shown on /pricing comes from
// here, and so do the "from" prices that other pages teaser (see `prices` at the bottom). Translations hold
// words and {tokens}, never numbers. Nothing is computed from a formula.
// Sources: epic Stadiora/Aria#16544 (Core bands, education rates, add-ons) and DECISIONS #3 to #5
// (Free tier, Performance prices, LatAm education rates). Annual is 10% off, rounded down to a whole
// dollar per month; the yearly total is that monthly figure times 12. All prices are USD.
// Region detection lives in src/lib/region.ts.
// Only type-level syntax here (no runtime imports): the evidence and verify scripts load this file directly.

export type Region = 'us' | 'latam';
export type Billing = 'monthly' | 'annual';

export const athleteBands = [25, 50, 100, 250, 500, 1000] as const;
export type AthleteBand = (typeof athleteBands)[number];
export const defaultBand: AthleteBand = 100;

export interface PlanPrice {
  /** USD per month, billed monthly. */
  monthly: number;
  /** USD per month when paid yearly. */
  annualMonthly: number;
  /** USD per year when paid yearly. */
  annualYearly: number;
}

export interface Band {
  athletes: AthleteBand;
  /** Coaches included at this size. */
  coaches: number;
  core: PlanPrice;
  performance: PlanPrice;
}

export const bands: Record<Region, readonly Band[]> = {
  us: [
    { athletes: 25, coaches: 2, core: { monthly: 79, annualMonthly: 71, annualYearly: 852 }, performance: { monthly: 119, annualMonthly: 107, annualYearly: 1284 } },
    { athletes: 50, coaches: 3, core: { monthly: 129, annualMonthly: 116, annualYearly: 1392 }, performance: { monthly: 199, annualMonthly: 179, annualYearly: 2148 } },
    { athletes: 100, coaches: 5, core: { monthly: 199, annualMonthly: 179, annualYearly: 2148 }, performance: { monthly: 299, annualMonthly: 269, annualYearly: 3228 } },
    { athletes: 250, coaches: 8, core: { monthly: 349, annualMonthly: 314, annualYearly: 3768 }, performance: { monthly: 529, annualMonthly: 476, annualYearly: 5712 } },
    { athletes: 500, coaches: 10, core: { monthly: 499, annualMonthly: 449, annualYearly: 5388 }, performance: { monthly: 749, annualMonthly: 674, annualYearly: 8088 } },
    { athletes: 1000, coaches: 15, core: { monthly: 799, annualMonthly: 719, annualYearly: 8628 }, performance: { monthly: 1199, annualMonthly: 1079, annualYearly: 12948 } },
  ],
  latam: [
    { athletes: 25, coaches: 2, core: { monthly: 49, annualMonthly: 44, annualYearly: 528 }, performance: { monthly: 79, annualMonthly: 71, annualYearly: 852 } },
    { athletes: 50, coaches: 3, core: { monthly: 79, annualMonthly: 71, annualYearly: 852 }, performance: { monthly: 119, annualMonthly: 107, annualYearly: 1284 } },
    { athletes: 100, coaches: 5, core: { monthly: 129, annualMonthly: 116, annualYearly: 1392 }, performance: { monthly: 199, annualMonthly: 179, annualYearly: 2148 } },
    { athletes: 250, coaches: 8, core: { monthly: 229, annualMonthly: 206, annualYearly: 2472 }, performance: { monthly: 349, annualMonthly: 314, annualYearly: 3768 } },
    { athletes: 500, coaches: 10, core: { monthly: 350, annualMonthly: 315, annualYearly: 3780 }, performance: { monthly: 529, annualMonthly: 476, annualYearly: 5712 } },
    { athletes: 1000, coaches: 15, core: { monthly: 550, annualMonthly: 495, annualYearly: 5940 }, performance: { monthly: 829, annualMonthly: 746, annualYearly: 8952 } },
  ],
};

export interface EducationRate {
  key: 'highSchool' | 'department' | 'college';
  athletes: number;
  /** USD per month. */
  monthly: number;
}

/** Education rates for Schools and institutions. Every coach in the program is included. */
export const education: Record<Region, readonly EducationRate[]> = {
  us: [
    { key: 'highSchool', athletes: 100, monthly: 99 },
    { key: 'department', athletes: 250, monthly: 149 },
    { key: 'college', athletes: 500, monthly: 299 },
  ],
  latam: [
    { key: 'highSchool', athletes: 100, monthly: 69 },
    { key: 'department', athletes: 250, monthly: 99 },
    { key: 'college', athletes: 500, monthly: 199 },
  ],
};

export const addOns = {
  /** USD per month for each coach beyond the ones included. Does not apply to Schools plans. */
  extraCoach: { us: 20, latam: 10 } satisfies Record<Region, number>,
  /** Custom-branded app: USD per month plus a one-time setup fee. Same in both regions. */
  brandedApp: { monthly: 99, setup: 499 },
} as const;

/** The Free plan: no card, so the price is zero. */
export const free = { monthly: 0, coaches: 1, athletes: 10 } as const;

/** Annual billing takes this percentage off Core and Performance (the annual fields above already include it). */
export const annualDiscountPercent = 10;

export function bandFor(region: Region, athletes: number): Band {
  return bands[region].find((b) => b.athletes === athletes) ?? bands[region].find((b) => b.athletes === defaultBand)!;
}

/** `1199` -> `$1,199`. */
export function usd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

/**
 * Starting prices that other pages (Teams, Schools, Solutions) teaser, derived from the table above so they
 * can never drift from /pricing. Monthly USD per region: `prices.coreFrom[region]`.
 */
export const prices = {
  /** Core at the smallest size. */
  coreFrom: { us: bands.us[0].core.monthly, latam: bands.latam[0].core.monthly },
  /** Schools and institutions, high-school rate. */
  highSchool: { us: education.us[0].monthly, latam: education.latam[0].monthly },
} as const;

export type PriceKey = keyof typeof prices;
