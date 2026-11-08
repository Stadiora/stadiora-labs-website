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
// The plans on /pricing, in card order. Typed here, never read from the data or the page under test: pricing goes by
// athlete count only, so there is no education or school plan.
export const PLANS = ['free', 'core', 'performance', 'federations'];
export const EXTRA_COACH = { us: 20, latam: 10 };
export const BRANDED = { monthly: 99, setup: 499 };
export const FREE = { monthly: 0, coaches: 1, athletes: 10 };
export const ANNUAL_PERCENT = 10;
export const DEFAULT_BAND = 100;

export const annual = (monthly) => Math.floor((monthly * (100 - ANNUAL_PERCENT)) / 100);
export const fmt = (n) => `$${n.toLocaleString('en-US')}`;
export const sizes = Object.keys(ORACLE.us).map(Number);

/**
 * What the estimate panel must show, from this oracle alone. Core and Performance are the table price for the roster
 * (annual is 10% off, rounded down per month) plus each extra coach; Federations is custom; Free is zero. The custom-branded app adds its monthly fee to the total and its setup fee is
 * shown apart, once. Extra coaches only apply to Core and Performance. AI and video credits are never priced.
 */
export function estimateOracle({ region = 'us', athletes = DEFAULT_BAND, billing = 'monthly', plan = 'core', extraCoaches = 0, app = false } = {}) {
  const [, core, perf] = ORACLE[region][athletes];
  let monthly = 0;
  if (plan === 'core' || plan === 'performance') {
    const plain = plan === 'core' ? core : perf;
    monthly = (billing === 'annual' ? annual(plain) : plain) + extraCoaches * EXTRA_COACH[region];
  }
  if (app) monthly += BRANDED.monthly;
  return { monthly, setup: app ? BRANDED.setup : 0, custom: plan === 'federations' };
}

/** Every dollar amount that may show for a region (Core, Performance, extra coach). */
export const everyAmount = (region) => {
  const out = new Set([EXTRA_COACH[region]]);
  for (const [, core, perf] of Object.values(ORACLE[region])) for (const m of [core, perf]) out.add(m).add(annual(m)).add(annual(m) * 12);
  return out;
};
/** Amounts that are the same in both regions. */
export const sharedAmounts = new Set([FREE.monthly, BRANDED.monthly, BRANDED.setup]);

/** The table against the oracle. Takes the whole module, so a leftover export is a problem too. Returns a list of problems, empty when they agree. */
export function tableProblems(table) {
  const { bands, addOns, athleteBands, free, annualDiscountPercent, prices } = table;
  const bad = [];
  if ('education' in table) bad.push('src/data/prices.ts still exports education: pricing goes by athlete count only');
  if (Object.keys(prices).join() !== 'coreFrom') bad.push(`prices holds [${Object.keys(prices)}], want only coreFrom (no school or education price)`);
  for (const region of ['us', 'latam']) {
    for (const band of bands[region]) {
      const [coaches, core, perf] = ORACLE[region][band.athletes] ?? [];
      const want = [coaches, core, perf, annual(core), annual(perf), annual(core) * 12, annual(perf) * 12];
      const got = [band.coaches, band.core.monthly, band.performance.monthly, band.core.annualMonthly, band.performance.annualMonthly, band.core.annualYearly, band.performance.annualYearly];
      if (want.join() !== got.join()) bad.push(`${region} ${band.athletes}: want ${want} got ${got}`);
    }
    if (addOns.extraCoach[region] !== EXTRA_COACH[region]) bad.push(`${region} extra coach ${addOns.extraCoach[region]}, want ${EXTRA_COACH[region]}`);
    if (prices.coreFrom[region] !== ORACLE[region][25][1]) bad.push(`${region} prices.coreFrom ${prices.coreFrom[region]}`);
  }
  if (addOns.brandedApp.monthly !== BRANDED.monthly) bad.push(`branded app monthly fee is ${addOns.brandedApp.monthly}, want ${BRANDED.monthly}`);
  if (addOns.brandedApp.setup !== BRANDED.setup) bad.push(`branded app setup fee is ${addOns.brandedApp.setup}, want ${BRANDED.setup}`);
  if (athleteBands.join() !== sizes.join()) bad.push(`athlete bands ${athleteBands}`);
  if (free.monthly !== FREE.monthly || free.coaches !== FREE.coaches || free.athletes !== FREE.athletes) bad.push(`free plan ${JSON.stringify(free)}`);
  if (annualDiscountPercent !== ANNUAL_PERCENT) bad.push(`annual discount ${annualDiscountPercent}%`);
  return bad;
}

// Tokens the page substitutes into copy, by the fields that carry them.
const ALLOWED_TOKENS = new Set(['percent', 'athletes', 'coaches', 'monthly', 'setup', 'amount', 'total', 'plan', 'qty']);
const REQUIRED_TOKENS = {
  'controls.annualSaves': ['percent'],
  'controls.noScript': ['athletes'],
  'controls.coaches': ['coaches'],
  'controls.valueText': ['athletes', 'coaches'],
  'plans.free.line': ['athletes', 'coaches'],
  'addons.extraCoach.priceLine': ['amount'],
  'addons.brandedApp.price': ['monthly', 'setup'],
  'addons.brandedApp.priceLine': ['monthly', 'setup'],
  'price.meta': ['athletes', 'coaches'],
  'price.billedYearly': ['total'],
  'price.live': ['amount', 'plan'],
  'price.liveYearly': ['amount', 'plan'],
  'estimate.coachRow': ['qty'],
  'estimate.planRow': ['plan', 'athletes'],
  'estimate.live': ['amount', 'plan'],
  'estimate.liveCustom': ['plan'],
  'estimate.liveSetup': ['setup'],
  'final.lead': ['athletes'],
};

// What no shipped page may say any more, in the plan sense (the Schools solution page is about what schools get, not a plan).
// Prose, English and Spanish. "High schools and institutions" is the solution page's name and stays.
export const REMOVED_PLAN_TEXT = [
  [/(?<!high )schools and institutions/i, 'a "Schools and institutions" plan'],
  [/escuelas e instituciones/i, 'an "Escuelas e instituciones" plan'],
  [/\bschools? plans?\b/i, 'a schools plan'],
  [/\bplanes? (?:para|de) (?:escuelas|colegios)\b|\bplanes? escolares?\b/i, 'a plan for schools (es)'],
  [/\beducation(?:al)? (?:rates?|pricing|plans?)\b/i, 'education rates'],
  [/\btarifas? educativas?\b|\bprecios? para educaci[oó]n\b/i, 'education rates (es)'],
  [/\bschool pricing\b|\bprecios? para (?:escuelas|colegios)\b/i, 'school pricing'],
  [/every coach in the program|todos los entrenadores del programa/i, 'every coach in the program'],
];
// Markup, script and style identifiers that only served the schools card, its rates table or its estimate path.
export const REMOVED_PLAN_MARKUP = [
  'data-schools-from',
  'data-edu-rate',
  'education-rates',
  'pcard--schools',
  'data-plan="schools"',
  'data-use="schools"',
  'highSchool',
  'schoolsRow',
  'edu__n',
  'class="edu"',
];

/** Prose problems in one piece of text. `where` names it. */
export function removedTextProblems(text, where) {
  const bad = [];
  for (const [re, what] of REMOVED_PLAN_TEXT) {
    const hit = re.exec(text);
    if (hit) bad.push(`${where}: says ${what}: "${text.slice(Math.max(0, hit.index - 20), hit.index + hit[0].length + 20).replace(/\s+/g, ' ')}"`);
  }
  return bad;
}

/** Built output (HTML, JS or CSS) problems: removed identifiers and prose. */
export function removedBuildProblems(text, where) {
  const bad = removedTextProblems(text, where);
  for (const id of REMOVED_PLAN_MARKUP) if (text.includes(id)) bad.push(`${where}: still has \`${id}\``);
  return bad;
}

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
  // The plan list is stated here, not read from the copy under test: the use button plus the four plans, nothing else.
  for (const [locale, copy] of [['en', en], ['es', es]]) {
    const keys = Object.keys(copy.plans).sort().join();
    const want = ['use', ...PLANS].sort().join();
    if (keys !== want) bad.push(`${locale} plans are [${keys}], want [${want}]`);
    if ('education' in copy) bad.push(`${locale} still has an education block`);
    for (const path of flat[locale].keys()) if (/school|educat|edu\b/i.test(path)) bad.push(`${locale} ${path}: a schools or education key is still in the pricing copy`);
    for (const [path, text] of flat[locale]) bad.push(...removedTextProblems(text, `${locale} ${path}`));
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
