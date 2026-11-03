// Evidence: the price teasers on the solutions pages (high-school rate on Schools, Core "from" price on Coaches and
// Clubs) show what /pricing shows, for every way a region can be chosen: browser time zone and ?region=.
// Expected amounts come from pricing-oracle.mjs (typed by hand), not from src/data/prices.ts, so the table, the
// teaser and /pricing are three independent witnesses.
import { EDU, ORACLE, fmt } from './pricing-oracle.mjs';

const localized = (locale, path) => (locale === 'es' ? `/es${path}` : path);

// [time zone, query, region it must pick | null when only agreement with /pricing is asserted]
const cases = [
  ['America/New_York', '', 'us'],
  ['America/New_York', '?region=us', 'us'],
  ['America/New_York', '?region=latam', 'latam'],
  ['America/Mexico_City', '', 'latam'],
  ['America/Mexico_City', '?region=latam', 'latam'],
  ['America/Mexico_City', '?region=us', 'us'],
  ['America/Bogota', '', 'latam'],
  ['America/Argentina/Buenos_Aires', '', 'latam'],
  ['America/Sao_Paulo', '', 'latam'],
  ['America/Puerto_Rico', '', 'us'],
  ['Europe/Madrid', '', 'us'],
  ['Atlantic/Stanley', '', null],
  ['America/New_York', '?region=LATAM', null],
  ['America/Mexico_City', '?region=Us', null],
];

// Core "from" is quoted for the smallest size on /pricing; the high-school rate for the school size shown in its table.
const CORE_SIZE = 25;
const teasers = [
  { name: 'schools', path: '/solutions/schools/', key: 'highSchool', want: (region) => fmt(EDU[region][0]) },
  { name: 'coaches', path: '/solutions/coaches/', key: 'coreFrom', want: (region) => fmt(ORACLE[region][CORE_SIZE][1]) },
  { name: 'clubs', path: '/solutions/teams-and-clubs/', key: 'coreFrom', want: (region) => fmt(ORACLE[region][CORE_SIZE][1]) },
];

const readTeaser = () =>
  [...document.querySelectorAll('[data-region-price]')].map((e) => ({
    key: e.dataset.regionPrice,
    price: e.textContent.trim(),
    line: e.parentElement.textContent.replace(/\s+/g, ' ').trim(),
  }));

const readPricing = () => ({
  region: document.querySelector('[data-pricing]')?.dataset.region ?? null,
  coreAthletes: document.querySelector('select[data-athletes]')?.value ?? null,
  core: document.querySelector('[data-amount="core"]')?.textContent.trim() ?? null,
  schoolsFrom: document.querySelector('[data-schools-from]')?.textContent.trim() ?? null,
  highSchool: document.querySelector('[data-edu-rate="highSchool"]')?.textContent.trim() ?? null,
  highSchoolAthletes: document.querySelector('[data-edu-rate="highSchool"]')?.previousElementSibling?.textContent.trim() ?? null,
});

const hasCount = (line, price, count) => new RegExp(`(^|\\D)${count}(\\D|$)`).test(line.replace(price, ' '));

export async function solutionsPriceChecks({ open, check }) {
  for (const locale of ['en', 'es']) {
    const bad = Object.fromEntries(teasers.map((t) => [t.name, []]));
    for (const [timezoneId, search, expected] of cases) {
      const label = `${timezoneId}${search}`;
      const pricingPage = await open({ width: 1440, height: 900, timezoneId }, `${localized(locale, '/pricing/')}${search}`);
      await pricingPage.waitForSelector('[data-pricing][data-ready]', { state: 'attached', timeout: 4000 });
      await pricingPage.selectOption('select[data-athletes]', String(CORE_SIZE));
      const pricing = await pricingPage.evaluate(readPricing);
      await pricingPage.context().close();
      const region = expected ?? pricing.region;

      for (const t of teasers) {
        const page = await open({ width: 1440, height: 900, timezoneId }, `${localized(locale, t.path)}${search}`);
        const found = (await page.evaluate(readTeaser)).filter((x) => x.key === t.key);
        await page.context().close();
        const want = t.key === 'highSchool' ? pricing.highSchool : pricing.core;
        const wantCount = t.key === 'highSchool' ? pricing.highSchoolAthletes : pricing.coreAthletes;
        if (found.length !== 1) bad[t.name].push(`${label}: ${found.length} ${t.key} teasers`);
        for (const f of found) {
          if (f.price !== want) bad[t.name].push(`${label}: teaser ${f.price}, /pricing ${want}`);
          if (t.name !== 'clubs' && !hasCount(f.line, f.price, wantCount)) bad[t.name].push(`${label}: teaser line "${f.line}" does not state ${wantCount} athletes`);
          if (f.price !== t.want(region)) bad[t.name].push(`${label}: teaser ${f.price}, expected ${t.want(region)} for ${region}`);
        }
        if (t.key === 'highSchool' && pricing.schoolsFrom !== pricing.highSchool) bad[t.name].push(`${label}: /pricing Schools card ${pricing.schoolsFrom} differs from its high-school row ${pricing.highSchool}`);
        if (expected && pricing.region !== expected) bad[t.name].push(`${label}: /pricing picked ${pricing.region}, expected ${expected}`);
      }
    }
    for (const t of teasers) {
      check(
        'solutions-region',
        `${localized(locale, t.path)}: the ${t.key === 'highSchool' ? 'high-school' : 'Core from'} teaser equals /pricing's for ${cases.length} region inputs (time zones, ?region=us, ?region=latam, odd casing)`,
        bad[t.name].length === 0,
        bad[t.name].slice(0, 3).join('; '),
      );
    }
  }

  // No JavaScript: the server renders the US price, and the LatAm price is not in the HTML at all.
  for (const t of teasers) {
    const page = await open({ width: 1440, height: 900, js: false, timezoneId: 'America/Mexico_City' }, t.path);
    const html = await page.content();
    const found = (await page.evaluate(readTeaser)).filter((x) => x.key === t.key);
    await page.context().close();
    check(
      'solutions-region',
      `${t.path} without JavaScript: the US price is served and no LatAm price is in the HTML`,
      found.length === 1 && found[0].price === t.want('us') && !/data-latam|data-us/.test(html) && !html.includes(`>${t.want('latam')}<`),
      JSON.stringify(found),
    );
  }
}
