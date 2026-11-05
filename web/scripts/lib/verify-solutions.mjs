// Post-build checks for the solutions, resources and company pages (EN and ES). Called from verify-dist.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT_ENDPOINT, athleteRanges, approvedSuccess, contacts, findDeliveryClaims, missingContactHrefs, roles } from './contact-contract.mjs';
import { EDU, FREE, ORACLE, fmt } from './pricing-oracle.mjs';

// What the teasers must show for US visitors (and no-JavaScript visitors): Core from at 25 athletes, high school at 100.
const teaserUs = { coreFrom: fmt(ORACLE.us[25][1]), highSchool: fmt(EDU.us[0]) };
const teaserAthletes = { coreFrom: 25, highSchool: 100 };

const ORIGIN = 'https://stadioralabs.com';

// path is the English path; the Spanish page lives under /es.
const routes = [
  { path: '/solutions/schools/' },
  { path: '/solutions/coaches/' },
  { path: '/solutions/teams-and-clubs/' },
  { path: '/solutions/athletes/' },
  { path: '/resources/case-studies/', noindex: true },
  { path: '/about/' },
  { path: '/contact/' },
];

const files = (path, lang) => (lang === 'en' ? path : `/es${path}`);
const count = (html, re) => (html.match(re) ?? []).length;

// Words and claims the build must never ship (DECISIONS.md: no unshipped features, no competitor material).
const banned = [
  [/everfit|trainerize|trainheroic/i, 'competitor names'],
  [/garmin|strava|polar flow/i, 'unsupported integration claims'],
  [/lorem ipsum/i, 'lorem ipsum'],
  [/\bTODO\b/, 'TODO'],
  [/photo--missing/, 'an unfilled photo slot'],
  [/data-placeholder/, 'data-placeholder'],
  [/\bAI coach\b/i, '"AI coach"'],
  [/\breplaces? (your|the) coach/i, 'a claim that Aria replaces coaches'],
  [/progress photos?/i, 'progress photos (not shipped)'],
  [/scheduled messages?/i, 'scheduled messages (not shipped)'],
  [/\btennis\b/i, 'tennis (not shipped)'],
  [/hydration/i, 'hydration (not shipped)'],
];

const decodeEntities = (s) =>
  s
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

// The page's own text: markup, scripts and styles removed, entities decoded.
const pageText = (html) =>
  decodeEntities(
    html
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  );

// Every script the page runs: inline bodies and the local files it links.
const pageScripts = (html, dist) => {
  const bodies = [...html.matchAll(/<script\b(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="(\/[^"]+)"/g)) {
    const file = join(dist, m[1]);
    if (existsSync(file)) bodies.push(readFileSync(file, 'utf8'));
  }
  return bodies;
};

export function verifySolutions({ dist, fail }) {
  for (const route of routes) {
    for (const lang of ['en', 'es']) {
      const file = files(route.path, lang);
      const rel = `${file.replace(/^\//, '')}index.html`;
      const full = join(dist, rel);
      if (!existsSync(full)) {
        fail(`${rel}: missing`);
        continue;
      }
      const html = readFileSync(full, 'utf8');
      const need = (ok, what) => {
        if (!ok) fail(`${rel}: ${what}`);
      };

      need(new RegExp(`<html[^>]*\\blang="${lang}"`).test(html), `html lang="${lang}"`);
      need(/<title>[^<]{10,}<\/title>/.test(html), 'title of at least 10 characters');
      need(/<meta name="description" content="[^"]{40,}"/.test(html), 'meta description of at least 40 characters');
      need(html.includes(`<link rel="canonical" href="${ORIGIN}${file}"`), `canonical ${ORIGIN}${file}`);
      for (const [hreflang, path] of [
        ['en', route.path],
        ['es', `/es${route.path}`],
        ['x-default', route.path],
      ]) {
        need(html.includes(`<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${path}"`), `hreflang ${hreflang}`);
      }
      for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) need(html.includes(`<meta property="${prop}"`), prop);
      const ogImage = /<meta property="og:image" content="https:\/\/stadioralabs\.com([^"]+)"/.exec(html)?.[1];
      need(Boolean(ogImage) && existsSync(join(dist, ogImage ?? '')), `og:image ${ogImage ?? '(none)'} is not in dist`);

      need(count(html, /<h1[\s>]/g) === 1, 'expected exactly one h1');
      need(count(html, /<main[\s>]/g) === 1, 'expected exactly one main');
      for (const m of html.matchAll(/<img\b[^>]*>/g)) need(/\salt(=|\s|\/?>)/.test(m[0]), `img without alt: ${m[0].slice(0, 80)}`);

      // Form placeholder attributes are legitimate, so they are removed before looking for the word itself.
      const withoutAttrs = html.replace(/\splaceholder="[^"]*"/g, '');
      need(!/placeholder/i.test(withoutAttrs), 'contains the word "placeholder"');
      for (const [re, what] of banned) need(!re.test(html), `contains ${what}`);

      const robots = /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? '';
      if (route.noindex) need(/noindex/.test(robots), 'must be noindex until a real case study exists');
      else need(!/noindex/.test(robots), 'must be indexable');

      // Price teasers: the server renders the US value and the count it is quoted for, both read from the shared table
      // (src/data/prices.ts) and compared here with the oracle typed in pricing-oracle.mjs. LatAm values are not in the HTML.
      need(!/\sdata-(us|latam)=/.test(html), 'region prices must not carry data-us / data-latam attributes (LatAm prices come from the shared table in the script bundle)');
      for (const m of html.matchAll(/<span class="rprice" data-region-price="(\w+)"[^>]*>([^<]*)<\/span>([^<]*)/g)) {
        const [, key, shown, after] = m;
        need(shown === teaserUs[key], `${key} teaser shows ${shown}, expected ${teaserUs[key]}`);
        const quoted = /\d+/.exec(after)?.[0];
        if (route.path === '/solutions/schools/' || route.path === '/solutions/coaches/') need(Number(quoted) === teaserAthletes[key], `${key} teaser quotes ${quoted} athletes, expected ${teaserAthletes[key]}`);
      }

      // Both regions' contact details sit in every page's footer.
      const footer = /<footer\b[\s\S]*<\/footer>/.exec(html)?.[0] ?? '';
      for (const href of missingContactHrefs(footer)) need(false, `the footer is missing the contact link ${href}`);
      for (const contact of Object.values(contacts)) need(footer.includes(contact.name), `the footer is missing the full contact name ${contact.name}`);
      const organization = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((data) => data['@type'] === 'Organization');
      const points = organization?.contactPoint ?? [];
      need(points.length === 2, 'Organization JSON-LD must publish exactly two regional contacts');
      for (const [region, contact] of Object.entries(contacts)) {
        need(points.some((point) => point['@type'] === 'ContactPoint' && point.name === contact.name && point.email === contact.email && point.telephone === contact.tel && point.areaServed === (region === 'us' ? 'US' : 'Latin America')), `Organization JSON-LD is missing the shared ${region} contact name, email, phone or areaServed`);
      }

      if (route.path === '/contact/') {
        for (const contact of Object.values(contacts)) need(pageText(html).includes(contact.name), `the page is missing the full contact name ${contact.name}`);
        for (const href of missingContactHrefs(html)) need(false, `the page is missing the contact link ${href}`);

        // The form posts to the live endpoint, with no mailto action to fall back on. The honest-contact contract is in
        // contact-contract.mjs: the endpoint, the role and athlete values, the honeypot, and the only success sentence.
        const form = /<form\b[^>]*data-contact-form[^>]*>/.exec(html)?.[0] ?? '';
        need(Boolean(form), 'the contact form is missing');
        need(decodeEntities(/\bdata-endpoint="([^"]*)"/.exec(form)?.[1] ?? '') === CONTACT_ENDPOINT, `form endpoint must be exactly ${CONTACT_ENDPOINT}`);
        need(!/\saction=/.test(form), 'the form must not carry an action (no mailto or page-reload path)');
        need(count(html, /<input[^>]*type="radio"[^>]*name="topic"/g) === 2, 'two topic radios');
        const optionValues = (id) => [...(new RegExp(`<select[^>]*id="${id}"[\\s\\S]*?</select>`).exec(html)?.[0] ?? '').matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
        need(JSON.stringify(optionValues('f-role')) === JSON.stringify(roles), `role values must be exactly ${roles.join(', ')}, found ${optionValues('f-role').join(', ')}`);
        need(JSON.stringify(optionValues('f-athletes')) === JSON.stringify(athleteRanges), `athlete values must be exactly ${athleteRanges.join(', ')}`);
        need(/<div class="hp" inert[^>]*>[\s\S]*?<input[^>]*name="website"/.test(html), 'the honeypot input "website" must be present and inert');

        // The message for each outcome ships as data. Success reads exactly as approved; the failures claim nothing.
        let payload = null;
        try {
          payload = JSON.parse(decodeEntities(/\bdata-send="([^"]*)"/.exec(form)?.[1] ?? ''));
        } catch {
          payload = null;
        }
        need(payload?.ok === approvedSuccess[lang], `the success message must be exactly "${approvedSuccess[lang]}", found ${JSON.stringify(payload?.ok)}`);
        for (const key of ['invalid', 'limited', 'unavailable']) {
          for (const what of findDeliveryClaims(String(payload?.[key] ?? ''), lang)) need(false, `the ${key} message claims receipt or delivery: ${what}`);
        }
        need(new Set(['invalid', 'limited', 'unavailable'].map((k) => payload?.[k])).size === 3, 'the 400, 429 and 503 messages must be three different messages');
        const text = pageText(html);
        for (const what of findDeliveryClaims(text, lang)) need(false, `page text claims receipt or delivery: ${what}`);
        for (const script of pageScripts(html, dist)) {
          for (const what of findDeliveryClaims(script, lang)) need(false, `a script on the page claims receipt or delivery: ${what}`);
        }
      }

      need(!/\{(price|athletes|coaches)\}/.test(html), 'an unfilled {price}, {athletes} or {coaches} token');

      if (route.path === '/solutions/coaches/') {
        // The Free plan limits come from the shared table; the oracle holds them typed by hand.
        const limits = new RegExp(`\\b${FREE.coaches} (coach|entrenador), (up to|hasta) ${FREE.athletes} (athletes|atletas)`);
        need(limits.test(pageText(html)), `Free plan line must state ${FREE.coaches} coach and ${FREE.athletes} athletes`);
        need(new RegExp(`<meta name="description" content="[^"]*${FREE.coaches} (coach|entrenador) (and up to|y hasta) ${FREE.athletes} (athletes|atletas)`).test(html), 'meta description must state the Free plan limits');
      }

      if (route.path === '/solutions/schools/' && lang === 'en') {
        for (const line of ['Guardians give consent for minors', 'Athletes choose what each coach sees', "Admins can't override consent"]) {
          need(html.replaceAll('&#39;', "'").includes(line), `exact consent line missing: ${line}`);
        }
      }

      if (route.path === '/about/') {
        // DECISIONS #15: all twelve people, and never a generated portrait for those without a photo.
        need(count(html, /<details class="[^"]*person/g) === 12, 'expected 12 team members');
      }
    }
  }

  // The placeholder story template is dev only: no story page may be emitted.
  for (const dir of ['resources/case-studies', 'es/resources/case-studies']) {
    const full = join(dist, dir);
    if (!existsSync(full)) continue;
    const html = readFileSync(join(full, 'index.html'), 'utf8');
    if (/Placeholder|XX\b/.test(html.replace(/\splaceholder="[^"]*"/g, ''))) fail(`${dir}/index.html: dev placeholder content shipped`);
    if (existsSync(join(full, 'sample-story'))) fail(`${dir}/sample-story: the dev-only story page was built`);
  }

  // noindex pages must stay out of the sitemap.
  const sitemap = join(dist, 'sitemap-0.xml');
  if (existsSync(sitemap) && /case-studies/.test(readFileSync(sitemap, 'utf8'))) fail('sitemap-0.xml: lists the noindex case-study index');
}
