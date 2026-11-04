// Post-build checks for /pricing/ and /es/pricing/. Called from verify-dist.mjs with dist/ and its `fail` recorder.
// Node type-strips the .ts imports, so the checks read the same price table and copy the page is built from, and
// compare them with the hand-typed oracle in pricing-oracle.mjs. The numbers in the table, the copy and the built
// HTML must all agree with the oracle, so a wrong fee fails `npm run verify` without a browser.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as prices from '../../src/data/prices.ts';
import { fill } from '../../src/lib/template.ts';
import { en, es } from '../../src/i18n/pages/pricing.ts';
import { BRANDED, EXTRA_COACH, FREE, ANNUAL_PERCENT, DEFAULT_BAND, brandedFromText, copyProblems, estimateOracle, fmt, tableProblems } from './pricing-oracle.mjs';

const { addOns, bands, education } = prices;
const copyFor = { en, es };

const pages = [
  { file: 'pricing/index.html', lang: 'en', canonical: 'https://stadioralabs.com/pricing/', og: '/og/pricing-en.png' },
  { file: 'es/pricing/index.html', lang: 'es', canonical: 'https://stadioralabs.com/es/pricing/', og: '/og/pricing-es.png' },
];

const count = (html, re) => (html.match(re) ?? []).length;

// The page text with every <script> body cut out. A scan helper for our own build output, not an HTML sanitizer.
function withoutScripts(html) {
  const lower = html.toLowerCase();
  let out = '';
  let at = 0;
  for (;;) {
    const open = lower.indexOf('<script', at);
    if (open < 0) return out + html.slice(at);
    out += html.slice(at, open);
    const close = lower.indexOf('</script>', open);
    if (close < 0) return out;
    at = close + '</script>'.length;
  }
}

// Plain text of an HTML fragment of our own build output: everything outside <...> pairs, entities left as they are.
function textOf(fragment) {
  let out = '';
  let inTag = false;
  for (const ch of fragment) {
    if (ch === '<') inTag = true;
    else if (ch === '>') inTag = false;
    else if (!inTag) out += ch;
  }
  return out.replaceAll('&#39;', "'").replaceAll('&amp;', '&').trim();
}

// The markup that follows the tag containing `marker`, up to the next `end`, or null. For a tag like
// `<p class="x" data-astro-cid-1>` pass `class="x"`; the result starts after that tag's closing `>`.
function inner(html, marker, end) {
  const at = html.indexOf(marker);
  const open = at < 0 ? -1 : html.indexOf('>', at);
  const to = open < 0 ? -1 : html.indexOf(end, open);
  return to < 0 ? null : html.slice(open + 1, to);
}

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

  for (const p of tableProblems(prices)) {
    fail(`price table (src/data/prices.ts) disagrees with the oracle (scripts/lib/pricing-oracle.mjs): ${p}`);
  }
  for (const p of copyProblems({ en, es })) fail(`pricing copy (src/i18n/pages/pricing.ts): ${p}`);

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
    if (count(html, /<div class="faq__item"/g) !== 7) fail(`${page.file}: expected seven FAQ items`);
    if (/<details\b|<dialog\b/.test(html)) fail(`${page.file}: a <details> or <dialog> is on the page; the FAQ and "More info" are button-driven reveals`);

    // Prices: the server HTML is the no-JS state (US, monthly, 100 athletes) and carries no other region's number.
    tag(/data-amount="core"[^>]*>\$199</, 'Core $199 in the no-JS state');
    tag(/data-amount="performance"[^>]*>\$299</, 'Performance $299 in the no-JS state');
    const text = withoutScripts(html);
    for (const amount of latamOnly) {
      const re = new RegExp(`\\$${amount.toLocaleString('en-US').replace(',', '\\,')}(?![\\d,])`);
      if (re.test(text)) fail(`${page.file}: LatAm-only amount $${amount} is in the HTML`);
    }

    // Amounts are server-rendered from the table. Read each one where it shows, by its marker and by the words next to
    // it, and compare with the oracle: a wrong monthly fee fails even if the setup fee is right.
    const copy = copyFor[page.lang];
    const brandedStrip = inner(html, 'data-addon="branded-app"', '</li>');
    const brandedPanel = inner(html, 'id="addon-branded-app"', '</li>');
    const extraStrip = inner(html, 'data-addon="extra-coach"', '</li>');
    const extraPanel = inner(html, 'id="addon-extra-coach"', '</li>');
    for (const [where, fragment, line] of [
      ['add-ons strip', brandedStrip, inner(brandedStrip ?? '', 'class="addon__price num"', '</p>')],
      ['branded-app panel', brandedPanel, inner(brandedPanel ?? '', 'class="addon__fact num"', '</p>')],
    ]) {
      if (fragment === null || line === null) {
        fail(`${page.file}: cannot find the custom-branded app fee in the ${where}`);
        continue;
      }
      const marked = (key) => new RegExp(`data-price="branded-${key}">([^<]*)<`).exec(fragment)?.[1];
      if (marked('monthly') !== fmt(BRANDED.monthly)) fail(`${page.file}: branded app monthly fee in the ${where} is ${marked('monthly')}, want ${fmt(BRANDED.monthly)}`);
      if (marked('setup') !== fmt(BRANDED.setup)) fail(`${page.file}: branded app setup fee in the ${where} is ${marked('setup')}, want ${fmt(BRANDED.setup)}`);
      const read = brandedFromText(textOf(line));
      if (read.monthly !== fmt(BRANDED.monthly)) fail(`${page.file}: the amount shown per month for the branded app in the ${where} is ${read.monthly}, want ${fmt(BRANDED.monthly)} ("${textOf(line)}")`);
      if (read.setup !== fmt(BRANDED.setup)) fail(`${page.file}: the amount shown as setup for the branded app in the ${where} is ${read.setup}, want ${fmt(BRANDED.setup)} ("${textOf(line)}")`);
    }
    for (const [where, fragment] of [['add-ons strip', extraStrip], ['extra-coach panel', extraPanel]]) {
      const got = fragment === null ? null : /data-extra-coach[^>]*>([^<]*)</.exec(fragment)?.[1];
      if (got !== fmt(EXTRA_COACH.us)) fail(`${page.file}: extra coach in the ${where} is ${got}, want ${fmt(EXTRA_COACH.us)} (US server render)`);
    }
    const freeText = textOf(inner(html, 'data-plan="free"', '<ul class="pcard__checks"') ?? '');
    if (!freeText.includes(fmt(FREE.monthly)) || !freeText.includes(fill(copy.plans.free.line, { coaches: String(FREE.coaches), athletes: String(FREE.athletes) }))) {
      fail(`${page.file}: the Free card does not show ${fmt(FREE.monthly)} and "${fill(copy.plans.free.line, { coaches: String(FREE.coaches), athletes: String(FREE.athletes) })}"`);
    }
    if (!textOf(inner(html, 'class="saves"', '</p>') ?? '').includes(fill(copy.controls.annualSaves, { percent: String(ANNUAL_PERCENT) }))) fail(`${page.file}: the annual saving is not ${ANNUAL_PERCENT}%`);
    if (!textOf(inner(html, 'class="controls-note"', '</p>') ?? '').includes(fill(copy.controls.noScript, { athletes: String(DEFAULT_BAND) }))) fail(`${page.file}: the fallback note does not name ${DEFAULT_BAND} athletes`);
    // The script's templates sit in an attribute (data-strings) and are meant to hold tokens; visible text must not.
    if (/\{(?:percent|athletes|coaches|monthly|setup|amount|total|plan)\}/.test(textOf(text))) fail(`${page.file}: an unfilled {token} is in the HTML`);

    // Every "More info" button and FAQ question is a disclosure: it starts collapsed and points at a reveal panel that
    // exists. Seven FAQ questions, three add-ons and the education rates make eleven.
    const disclosures = html.match(/<button\b[^>]*\bdata-reveal-btn\b[^>]*>/g) ?? [];
    if (disclosures.length !== 11) fail(`${page.file}: expected 11 disclosure buttons (7 FAQ, 3 add-ons, 1 education rates), found ${disclosures.length}`);
    for (const button of disclosures) {
      const target = /aria-controls="([^"]+)"/.exec(button)?.[1] ?? '';
      const panel = target ? new RegExp(`<div\\b[^>]*\\bid="${target}"[^>]*>`).exec(html)?.[0] : undefined;
      if (!panel || !/\bclass="reveal[\s"]/.test(panel)) fail(`${page.file}: a disclosure button points at "${target}", which is not a reveal panel`);
      if (!/aria-expanded="false"/.test(button)) fail(`${page.file}: a disclosure button does not start collapsed`);
    }

    // The add-on switches are real switches with a name, all off until the visitor turns one on, and the estimate
    // starts at Core for the default roster with nothing added.
    const switches = html.match(/<button\b[^>]*\brole="switch"[^>]*>/g) ?? [];
    if (switches.length !== 3 || switches.some((s) => !/aria-checked="false"/.test(s) || !/aria-label="[^"]+"/.test(s))) {
      fail(`${page.file}: expected three named add-on switches, all off`);
    }
    const startTotal = /data-total(?![-\w])[^>]*>([^<]*)</.exec(html)?.[1];
    const wantTotal = fmt(estimateOracle({}).monthly);
    if (startTotal !== wantTotal) fail(`${page.file}: the estimate starts at ${startTotal}, want ${wantTotal}`);
    const rangeTag = /<input\b[^>]*\btype="range"[^>]*>/.exec(html)?.[0] ?? '';
    if (!/\bmin="0"/.test(rangeTag) || !/\bmax="5"/.test(rangeTag) || !/aria-valuetext="[^"]+"/.test(rangeTag)) {
      fail(`${page.file}: the roster slider is missing, does not have six stops or has no spoken value`);
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

  if (problems === 0) console.log('verify-pricing: ok (/pricing/ and /es/pricing/: SEO, hreflang, no other-region prices in the HTML, reveals wired, switches named)');
}
