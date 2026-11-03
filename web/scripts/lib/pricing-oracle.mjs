// The price oracle. These numbers are typed in by hand from the epic (Stadiora/Aria#16544) and DECISIONS #3 to #5,
// NOT read back from src/data/prices.ts, so a wrong edit to the table fails against them. Used by `npm run verify`
// (table, copy and the built HTML) and by the evidence checks (the rendered page). To change a price on purpose,
// edit src/data/prices.ts and this file in the same commit.
import { tokensOf } from '../../src/lib/template.ts';

// athletes -> [coaches, Core monthly, Performance monthly]
export const ORACLE = {
  us: { 25: [2, 79, 119], 50: [3, 129, 199], 100: [5, 199, 299], 250: [8, 349, 529], 500: [10, 499, 749], 1000: [15, 799, 1199] },
  latam: { 25: [2, 49, 79], 50: [3, 79, 119], 100: [5, 129, 199], 250: [8, 229, 349], 500: [10, 350, 529], 1000: [15, 550, 829] },
};
// high school (100), college department (250), college / university (500)
export const EDU = { us: [99, 149, 299], latam: [69, 99, 199] };
export const EXTRA_COACH = { us: 20, latam: 10 };
export const BRANDED = { monthly: 99, setup: 499 };
export const FREE = { monthly: 0, coaches: 1, athletes: 10 };
export const ANNUAL_PERCENT = 10;
export const DEFAULT_BAND = 100;

export const annual = (monthly) => Math.floor((monthly * (100 - ANNUAL_PERCENT)) / 100);
export const fmt = (n) => `$${n.toLocaleString('en-US')}`;
export const sizes = Object.keys(ORACLE.us).map(Number);

/** Every dollar amount that may show for a region (Core, Performance, education, extra coach). */
export const everyAmount = (region) => {
  const out = new Set([EXTRA_COACH[region], ...EDU[region]]);
  for (const [, core, perf] of Object.values(ORACLE[region])) for (const m of [core, perf]) out.add(m).add(annual(m)).add(annual(m) * 12);
  return out;
};
/** Amounts that are the same in both regions. */
export const sharedAmounts = new Set([FREE.monthly, BRANDED.monthly, BRANDED.setup]);

/** The table against the oracle. Returns a list of problems, empty when they agree. */
export function tableProblems({ bands, education, addOns, athleteBands, free, annualDiscountPercent, prices }) {
  const bad = [];
  for (const region of ['us', 'latam']) {
    for (const band of bands[region]) {
      const [coaches, core, perf] = ORACLE[region][band.athletes] ?? [];
      const want = [coaches, core, perf, annual(core), annual(perf), annual(core) * 12, annual(perf) * 12];
      const got = [band.coaches, band.core.monthly, band.performance.monthly, band.core.annualMonthly, band.performance.annualMonthly, band.core.annualYearly, band.performance.annualYearly];
      if (want.join() !== got.join()) bad.push(`${region} ${band.athletes}: want ${want} got ${got}`);
    }
    const edu = education[region].map((r) => r.monthly);
    if (edu.join() !== EDU[region].join()) bad.push(`${region} education ${edu}`);
    if (addOns.extraCoach[region] !== EXTRA_COACH[region]) bad.push(`${region} extra coach ${addOns.extraCoach[region]}, want ${EXTRA_COACH[region]}`);
    if (prices.coreFrom[region] !== ORACLE[region][25][1]) bad.push(`${region} prices.coreFrom ${prices.coreFrom[region]}`);
    if (prices.highSchool[region] !== EDU[region][0]) bad.push(`${region} prices.highSchool ${prices.highSchool[region]}`);
  }
  if (addOns.brandedApp.monthly !== BRANDED.monthly) bad.push(`branded app monthly fee is ${addOns.brandedApp.monthly}, want ${BRANDED.monthly}`);
  if (addOns.brandedApp.setup !== BRANDED.setup) bad.push(`branded app setup fee is ${addOns.brandedApp.setup}, want ${BRANDED.setup}`);
  if (athleteBands.join() !== sizes.join()) bad.push(`athlete bands ${athleteBands}`);
  if (free.monthly !== FREE.monthly || free.coaches !== FREE.coaches || free.athletes !== FREE.athletes) bad.push(`free plan ${JSON.stringify(free)}`);
  if (annualDiscountPercent !== ANNUAL_PERCENT) bad.push(`annual discount ${annualDiscountPercent}%`);
  return bad;
}

// Tokens the page substitutes into copy, by the fields that carry them.
const ALLOWED_TOKENS = new Set(['percent', 'athletes', 'coaches', 'monthly', 'setup', 'amount', 'total', 'plan']);
const REQUIRED_TOKENS = {
  'controls.annualSaves': ['percent'],
  'controls.noScript': ['athletes'],
  'plans.free.line': ['athletes', 'coaches'],
  'addons.extraCoach.priceLine': ['amount'],
  'addons.brandedApp.price': ['monthly', 'setup'],
  'addons.brandedApp.priceLine': ['monthly', 'setup'],
  'price.meta': ['athletes', 'coaches'],
  'price.billedYearly': ['total'],
  'price.live': ['amount', 'plan'],
  'price.liveYearly': ['amount', 'plan'],
};

function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (const [i, v] of value.entries()) yield* strings(v, `${path}[${i}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* strings(v, path ? `${path}.${k}` : k);
}

/** Copy holds words and {tokens}, never numbers. Returns a list of problems. */
export function copyProblems({ en, es }) {
  const bad = [];
  const flat = { en: new Map(strings(en)), es: new Map(strings(es)) };
  for (const locale of ['en', 'es']) {
    for (const [path, text] of flat[locale]) {
      // "1:1" is the name of a feature (one-to-one chat), not a quantity.
      if (/\d/.test(text.replaceAll('1:1', '')) || text.includes('$')) bad.push(`${locale} ${path} has a number or amount typed into the copy: "${text.slice(0, 60)}"`);
      for (const token of tokensOf(text)) if (!ALLOWED_TOKENS.has(token)) bad.push(`${locale} ${path} uses an unknown token {${token}}`);
    }
  }
  for (const [path, text] of flat.en) {
    const other = flat.es.get(path);
    if (other === undefined) {
      bad.push(`es is missing ${path}`);
      continue;
    }
    if ([...tokensOf(text)].sort().join() !== [...tokensOf(other)].sort().join()) bad.push(`${path}: en and es use different tokens`);
  }
  for (const [path, want] of Object.entries(REQUIRED_TOKENS)) {
    for (const locale of ['en', 'es']) {
      const got = [...new Set(tokensOf(flat[locale].get(path) ?? ''))].sort().join();
      if (got !== [...want].sort().join()) bad.push(`${locale} ${path} should use {${want.join('}, {')}} but uses "${got}"`);
    }
  }
  return bad;
}

/**
 * Reads the custom-branded app fee out of rendered text by the words next to each amount: the amount before "/mo",
 * "/mes", "per month" or "al mes" is the monthly fee; the one before "setup" or "de configuración" is the setup fee.
 * This checks where each amount sits, not only that both amounts are somewhere on the line.
 */
export function brandedFromText(text) {
  const grab = (re) => re.exec(text)?.[1] ?? null;
  return {
    monthly: grab(/(\$[\d,]+)\s*(?:\/mo\b|\/mes\b|per month|al mes)/),
    setup: grab(/(\$[\d,]+)\s+(?:setup|de configuración)/),
  };
}
