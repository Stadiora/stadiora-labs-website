// Post-build checks for /pricing/ and /es/pricing/. Called from verify-dist.mjs with dist/ and its `fail` recorder.
// Node type-strips the .ts imports, so the checks read the same price table the page is built from.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addOns, bands, education } from '../../src/data/pricing.ts';

const pages = [
  { file: 'pricing/index.html', lang: 'en', canonical: 'https://stadioralabs.com/pricing/', og: '/og/home-en.png' },
  { file: 'es/pricing/index.html', lang: 'es', canonical: 'https://stadioralabs.com/es/pricing/', og: '/og/home-es.png' },
];

const count = (html, re) => (html.match(re) ?? []).length;

// Dollar amounts that exist only in the LatAm table. They must never be in the HTML: LatAm numbers ship in the
// script bundle and reach the DOM only for a visitor whose time zone is in the LatAm list.
function latamOnlyAmounts() {
  const collect = (region) => {
    const out = new Set([addOns.extraCoach[region], ...education[region].map((r) => r.monthly)]);
    for (const band of bands[region]) {
      for (const plan of [band.core, band.performance]) out.add(plan.monthly).add(plan.annualMonthly).add(plan.annualYearly);
    }
    return out;
  };
  const shared = collect('us').add(addOns.brandedApp.monthly).add(addOns.brandedApp.setup);
  return [...collect('latam')].filter((n) => !shared.has(n));
}

export function verifyPricing(dist, report) {
  let problems = 0;
  const fail = (msg) => {
    problems++;
    report(msg);
  };
  const latamOnly = latamOnlyAmounts();

  for (const page of pages) {
    const path = join(dist, page.file);
    if (!existsSync(path)) {
      fail(`${page.file}: missing`);
      continue;
    }
    const html = readFileSync(path, 'utf8');
    const tag = (re, what) => {
      if (!re.test(html)) fail(`${page.file}: missing ${what}`);
    };

    tag(new RegExp(`<html[^>]*\\blang="${page.lang}"`), `html lang="${page.lang}"`);
    tag(/<title>[^<]{10,}<\/title>/, 'title');
    tag(/<meta name="description" content="[^"]{40,}"/, 'meta description');
    tag(new RegExp(`<link rel="canonical" href="${page.canonical}"`), 'canonical');
    for (const [hreflang, href] of [
      ['en', 'https://stadioralabs.com/pricing/'],
      ['es', 'https://stadioralabs.com/es/pricing/'],
      ['x-default', 'https://stadioralabs.com/pricing/'],
    ]) {
      tag(new RegExp(`<link rel="alternate" hreflang="${hreflang}" href="${href}"`), `hreflang ${hreflang}`);
    }
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) tag(new RegExp(`<meta property="${prop}"`), prop);
    tag(new RegExp(`<meta property="og:image" content="https://stadioralabs.com${page.og}"`), `og:image ${page.og}`);
    tag(/<meta name="twitter:card" content="summary_large_image"/, 'twitter:card');
    if (!existsSync(join(dist, page.og))) fail(`${page.file}: ${page.og} is not in dist`);

    if (count(html, /<h1[\s>]/g) !== 1) fail(`${page.file}: expected exactly one h1`);
    if (count(html, /<main[\s>]/g) !== 1) fail(`${page.file}: expected exactly one main`);
    if (count(html, /<li class="pcard /g) !== 5) fail(`${page.file}: expected five plan cards`);
    if (count(html, /<details\b/g) !== 7) fail(`${page.file}: expected seven FAQ items`);

    // Prices: the server HTML is the no-JS state (US, monthly, 100 athletes) and carries no other region's number.
    tag(/data-amount="core"[^>]*>\$199</, 'Core $199 in the no-JS state');
    tag(/data-amount="performance"[^>]*>\$299</, 'Performance $299 in the no-JS state');
    const text = html.replace(/<script\b[\s\S]*?<\/script>/g, '');
    for (const amount of latamOnly) {
      const re = new RegExp(`\\$${amount.toLocaleString('en-US').replace(',', '\\,')}(?![\\d,])`);
      if (re.test(text)) fail(`${page.file}: LatAm-only amount $${amount} is in the HTML`);
    }

    // Every "more info" button points at a dialog that exists and has a name.
    for (const m of html.matchAll(/data-open-modal="([^"]+)"/g)) {
      if (!new RegExp(`<dialog[^>]*\\bid="${m[1]}"`).test(html)) fail(`${page.file}: data-open-modal="${m[1]}" has no dialog`);
    }
    for (const m of html.matchAll(/<dialog\b[^>]*>/g)) {
      if (!/aria-labelledby="[^"]+"/.test(m[0])) fail(`${page.file}: dialog without aria-labelledby`);
    }
    if (!/aria-current="page"[^>]*href="[^"]*pricing\/"|href="[^"]*pricing\/"[^>]*aria-current="page"/.test(html)) {
      fail(`${page.file}: the Pricing nav link is not marked aria-current`);
    }

    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        JSON.parse(m[1]);
      } catch {
        fail(`${page.file}: invalid JSON-LD`);
      }
    }

    for (const [re, what] of [
      [/data-placeholder/, 'data-placeholder'],
      [/placeholder/i, 'the word "placeholder"'],
      [/photo--missing/, 'an unfilled photo slot'],
      [/lorem ipsum/i, 'lorem ipsum'],
      [/\bTODO\b/, 'TODO'],
      [/everfit|trainerize|trainheroic/i, 'competitor names'],
      [/garmin|strava|polar flow/i, 'unsupported integration claims'],
      [/\bunlimited\b|\billimitad[oa]s?\b/i, 'an "unlimited" claim'],
      [/href="#"/, 'a dead link'],
    ]) {
      if (re.test(html)) fail(`${page.file}: contains ${what}`);
    }

    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\salt(=|\s|\/?>)/.test(m[0])) fail(`${page.file}: img without alt: ${m[0].slice(0, 80)}`);
    }
  }

  if (problems === 0) console.log('verify-pricing: ok (/pricing/ and /es/pricing/: SEO, hreflang, no other-region prices in the HTML, dialogs named)');
}
