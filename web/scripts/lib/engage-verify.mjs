// Post-build checks for the five Platform pages (messaging, guardian portal, teams, custom-branded apps,
// integrations) in both languages. verify-dist.mjs calls verifyEngagePages once with its `fail` collector.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLinks } from './engage-links.mjs';
import { verifyEngageMedia } from './engage-media-guard.mjs';
import { BRANDED, EDU, fmt } from './pricing-oracle.mjs';

const copySource = fileURLToPath(new URL('../../src/i18n/pages/engage.ts', import.meta.url));

const origin = 'https://stadioralabs.com';
const slugs = ['messaging', 'guardian-portal', 'teams', 'custom-branded-apps', 'integrations'];

export const engagePages = slugs.flatMap((slug) => [
  { slug, lang: 'en', file: `platform/${slug}/index.html`, path: `/platform/${slug}/`, alt: `/es/platform/${slug}/` },
  { slug, lang: 'es', file: `es/platform/${slug}/index.html`, path: `/es/platform/${slug}/`, alt: `/platform/${slug}/` },
]);

const count = (html, re) => (html.match(re) ?? []).length;
const text = (html) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

// Claims that Aria does not back up. Each one needs code evidence before it may appear on a page.
const forbidden = [
  [/scheduled messages?|mensajes? programados?/i, 'scheduled messages'],
  [/payments?\b|pagos?\b/i, 'payments'],
  [/hydration|hidrataci[oó]n/i, 'hydration'],
  [/tennis|tenis\b/i, 'tennis'],
  [/progress photos?|fotos? de progreso/i, 'progress photos'],
  [/self[- ]serve|autoservicio/i, 'self-serve app builder'],
  [/all (your )?(wearables|devices)|todos tus (dispositivos|wearables)/i, 'all-wearables claim'],
  [/\b(HIPAA|FERPA|COPPA)\b/, 'compliance claim'],
  [/(\b\d[\d,.]*\+|\b(over|more than|trusted by|m[aá]s de|conf[ií]an)\s+\d[\d,.]*)\s*(users|schools|athletes|coaches|teams|usuarios|escuelas|atletas|entrenadores|equipos)/i, 'user or customer count'],
  [/★|⭐|\b\d(\.\d)? ?(stars|estrellas)\b/i, 'rating'],
];
const competitors = /everfit|trainerize|trainheroic|teambuildr|truecoach|sportsengine|teamsnap/i;
const integrationBrands = /garmin|strava|polar/i;

// DESIGN-2 section 0.4: call CTAs go to /contact/?topic=call and "Talk to us" to /contact/?topic=question.
const callLabel = /^(book a call( for your school)?|book a school call|agenda una llamada( para tu colegio| escolar)?)$/i;
const talkLabel = /^(talk to us|habla con nosotros)$/i;

/** `pending` is a Map that checkLinks fills with the routes other open PRs own; the caller prints it. */
export function verifyEngagePages({ dist, fail, pending = new Map() }) {
  // Translations hold words and {tokens}, never amounts: those come from src/data/prices.ts.
  for (const [n, line] of readFileSync(copySource, 'utf8').split('\n').entries()) {
    if (/\$\s?\d|\d\s?(USD|dólares|dollars)/i.test(line)) fail(`src/i18n/pages/engage.ts:${n + 1}: a price in the copy ("${line.trim().slice(0, 60)}"); use a {token} filled from src/data/prices.ts`);
  }
  for (const page of engagePages) {
    const path = join(dist, page.file);
    if (!existsSync(path)) {
      fail(`${page.file}: missing`);
      continue;
    }
    const html = readFileSync(path, 'utf8');
    const copy = text(html);
    const tag = (re, what) => {
      if (!re.test(html)) fail(`${page.file}: missing ${what}`);
    };
    const canonical = `${origin}${page.path}`;
    const en = `${origin}/platform/${page.slug}/`;
    const es = `${origin}/es/platform/${page.slug}/`;

    tag(new RegExp(`<html[^>]*\\blang="${page.lang}"`), `html lang="${page.lang}"`);
    tag(/<title>[^<]{10,}<\/title>/, 'title');
    tag(/<meta name="description" content="[^"]{40,}"/, 'meta description');
    tag(new RegExp(`<link rel="canonical" href="${canonical}"`), 'canonical');
    for (const [hreflang, href] of [
      ['en', en],
      ['es', es],
      ['x-default', en],
    ]) {
      tag(new RegExp(`<link rel="alternate" hreflang="${hreflang}" href="${href}"`), `hreflang ${hreflang}`);
    }
    for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) tag(new RegExp(`<meta property="${prop}"`), prop);
    tag(new RegExp(`<meta property="og:url" content="${canonical}"`), `og:url ${canonical}`);
    tag(/<meta name="twitter:card" content="summary_large_image"/, 'twitter:card');

    if (count(html, /<h1[\s>]/g) !== 1) fail(`${page.file}: expected exactly one h1`);
    if (count(html, /<main[\s>]/g) !== 1) fail(`${page.file}: expected exactly one main`);
    if (count(html, /<h1[\s>]/g) === 1 && !/<h1[^>]*id="page-title"/.test(html)) fail(`${page.file}: the h1 must carry id="page-title"`);

    for (const [re, what] of [
      [/data-placeholder/, 'data-placeholder'],
      [/placeholder/i, 'the word "placeholder"'],
      [/photo--missing/, 'an unfilled photo slot'],
      [/lorem ipsum/i, 'lorem ipsum'],
      [/\bTODO\b/, 'TODO'],
      [/href="#"/, 'an empty "#" link'],
    ]) {
      if (re.test(html)) fail(`${page.file}: contains ${what}`);
    }

    for (const [re, what] of forbidden) {
      if (re.test(copy)) fail(`${page.file}: contains an unsupported claim (${what})`);
    }
    if (competitors.test(html)) fail(`${page.file}: contains a competitor name`);
    // Garmin, Strava and Polar are named once, as plain text with no logo and no date, and only on Integrations.
    if (integrationBrands.test(copy) && page.slug !== 'integrations') fail(`${page.file}: names Garmin, Strava or Polar outside Integrations`);
    if (page.slug === 'integrations') {
      const coming = copy.match(/(coming|pr[oó]ximamente)[:\s][^.]{0,70}(garmin|strava|polar)[^.]{0,40}/i)?.[0] ?? '';
      if (!coming) fail(`${page.file}: the "Coming" line for Garmin, Strava and Polar is missing`);
      if (/20\d\d|Q[1-4]|\bsoon\b|pronto|\bweeks?\b|\bmonths?\b/i.test(coming)) fail(`${page.file}: dates or promises a launch for Garmin, Strava or Polar`);
      if (/<img[^>]*(garmin|strava|polar)/i.test(html)) fail(`${page.file}: shows a Garmin, Strava or Polar logo`);
      for (const needle of ['Apple Health', 'Health Connect']) if (!copy.includes(needle)) fail(`${page.file}: does not name ${needle}`);
    }
    // Prices come from src/data/prices.ts (the one table /pricing also reads) and are checked against the hand-typed
    // oracle, so a wrong table entry fails here. The HTML holds the US rate; LatAm rates exist only in the script bundle.
    if (page.slug === 'custom-branded-apps') {
      const addon = text(html.match(/<p\b[^>]*\bdata-addon\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
      if (!addon.includes(fmt(BRANDED.monthly)) || !addon.includes(fmt(BRANDED.setup))) fail(`${page.file}: the add-on line "${addon.trim()}" does not show ${fmt(BRANDED.monthly)} monthly and ${fmt(BRANDED.setup)} setup`);
    }
    if (page.slug === 'teams') {
      const price = text(html.match(/<strong\b[^>]*\bdata-school="price"[^>]*>([\s\S]*?)<\/strong>/)?.[1] ?? '').trim();
      const athletes = text(html.match(/<span\b[^>]*\bdata-school="athletes"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '').trim();
      if (price !== fmt(EDU.us[0])) fail(`${page.file}: the schools price in the HTML is "${price}", expected the US high-school rate ${fmt(EDU.us[0])}`);
      if (athletes !== '100') fail(`${page.file}: the schools teaser shows "${athletes}" athletes, expected 100`);
      if (copy.includes(fmt(EDU.latam[0]))) fail(`${page.file}: the LatAm schools price ${fmt(EDU.latam[0])} is in the HTML; it belongs in the script bundle only`);
    }

    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\salt(=|\s|\/?>)/.test(m[0])) fail(`${page.file}: img without alt: ${m[0].slice(0, 80)}`);
    }
    for (const m of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
      if (!/\brel="[^"]*noopener/.test(m[0])) fail(`${page.file}: target=_blank link without noopener`);
    }

    const prefix = page.lang === 'es' ? '/es' : '';
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const href = m[1].match(/\shref="([^"]*)"/)?.[1] ?? '';
      const label = text(m[2]).trim();
      if (callLabel.test(label) && href !== `${prefix}/contact/?topic=call`) fail(`${page.file}: "${label}" goes to ${href}, expected ${prefix}/contact/?topic=call`);
      if (talkLabel.test(label) && href !== `${prefix}/contact/?topic=question`) fail(`${page.file}: "${label}" goes to ${href}, expected ${prefix}/contact/?topic=question`);
    }
    if (/bookings\.cloud\.microsoft/.test(html)) fail(`${page.file}: links to the external booking page; calls to action use the contact page`);

    checkLinks({ dist, page, html, fail, pending });

    // No words baked into any clip or poster, and the right clip in every slot (WebM, MP4, poster, no src on the <video>).
    verifyEngageMedia({ html, file: page.file, slug: page.slug, dist, fail });

    // The language switch and the hreflang pair must point at each other.
    if (!html.includes(`href="${page.alt}"`)) fail(`${page.file}: no link to the ${page.lang === 'en' ? 'Spanish' : 'English'} version`);
  }
}
