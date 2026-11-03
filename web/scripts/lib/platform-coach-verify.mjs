// Post-build checks for the four Platform "Coach" pages (programs, nutrition, readiness, power lab) in both
// languages. verify-dist.mjs calls verifyCoachPages once with its `fail` collector; evidence reads coachSlugs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyCoachFloodlight, verifyCoachStyles } from './platform-coach-floodlight.mjs';

const origin = 'https://stadioralabs.com';
export const coachSlugs = ['programs', 'nutrition', 'readiness', 'power-lab'];

export const coachPages = coachSlugs.flatMap((slug) => [
  { slug, lang: 'en', file: `platform/${slug}/index.html`, path: `/platform/${slug}/`, alt: `/es/platform/${slug}/`, og: '/og/home-en.png' },
  { slug, lang: 'es', file: `es/platform/${slug}/index.html`, path: `/es/platform/${slug}/`, alt: `/platform/${slug}/`, og: '/og/home-es.png' },
]);

const count = (html, re) => (html.match(re) ?? []).length;
const text = (html) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

// Claims Aria does not back up (or that the brief rules out). Each needs code evidence before it may appear.
const forbidden = [
  [/scheduled messages?|mensajes? programados?/i, 'scheduled messages'],
  [/\bpayments?\b|\bpagos?\b/i, 'payments'],
  [/hydration|hidrataci[oó]n/i, 'hydration'],
  [/supplements?|suplementos?/i, 'supplements'],
  [/tennis|tenis\b/i, 'tennis'],
  [/progress photos?|fotos? de progreso/i, 'progress photos'],
  [/custom (tasks?|habits?)|(tareas|h[aá]bitos) personalizad/i, 'custom tasks or habits'],
  [/lab[- ]grade|grado de laboratorio/i, 'lab-grade'],
  [/\bvalidat(ed|ion)\b|\bvalidad[oa]s?\b|\bvalidaci[oó]n\b/i, 'validated'],
  [/force[- ]plate (accura|grade|qualit|level|equivalent|precis)|(precisi[oó]n|exactitud) de (una )?plataforma de fuerza/i, 'force-plate accuracy'],
  [/diagnos(is|e|tic)|diagn[oó]stic/i, 'diagnosis'],
  [/clearance|cleared to (play|train|return)|autorizad[oa] para (jugar|entrenar|volver)/i, 'medical clearance'],
  [/\b(HIPAA|FERPA|COPPA)\b/, 'compliance claim'],
  [/(\b\d[\d,.]*\+|\b(over|more than|trusted by|m[aá]s de|conf[ií]an)\s+\d[\d,.]*)\s*(users|schools|athletes|coaches|teams|usuarios|escuelas|atletas|entrenadores|equipos)/i, 'user or customer count'],
  [/★|⭐|\b\d(\.\d)? ?(stars|estrellas)\b/i, 'rating'],
  [/all (your )?(wearables|devices)|todos tus (dispositivos|wearables)/i, 'all-wearables claim'],
];
const competitors = /everfit|trainerize|trainheroic|teambuildr|truecoach|sportsengine|teamsnap/i;
const integrationBrands = /garmin|strava|polar/i;

// What each page must keep saying: estimates are labelled as estimates, readiness is a guide, journals stay private.
// The meal-photo result card (MealPopCard) must carry a visible, locale-correct estimate pill in its header.
const mealCardLabel = { en: 'Estimate', es: 'Estimado' };

const mustSay = {
  'power-lab': [/estimates from video, not a force plate|estimados a partir de video, no de una plataforma de fuerza/i, 'the "estimates from video" footnote'],
  readiness: [/not a medical check|no un chequeo m[eé]dico/i, 'the "not a medical check" footnote'],
};

export function verifyCoachPages({ dist, fail }) {
  let problems = 0;
  const failHere = (msg) => {
    problems++;
    fail(msg);
  };
  for (const page of coachPages) {
    const path = join(dist, page.file);
    if (!existsSync(path)) {
      failHere(`${page.file}: missing`);
      continue;
    }
    const html = readFileSync(path, 'utf8');
    const copy = text(html);
    const tag = (re, what) => {
      if (!re.test(html)) failHere(`${page.file}: missing ${what}`);
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
    tag(new RegExp(`<meta property="og:image" content="${origin}${page.og}"`), `og:image ${page.og}`);
    tag(/<meta name="twitter:card" content="summary_large_image"/, 'twitter:card');
    if (!existsSync(join(dist, page.og))) failHere(`${page.file}: ${page.og} is not in dist`);

    if (count(html, /<h1[\s>]/g) !== 1) failHere(`${page.file}: expected exactly one h1`);
    if (count(html, /<main[\s>]/g) !== 1) failHere(`${page.file}: expected exactly one main`);

    for (const [re, what] of [
      [/data-placeholder/, 'data-placeholder'],
      [/placeholder/i, 'the word "placeholder"'],
      [/photo--missing/, 'an unfilled photo slot'],
      [/lorem ipsum/i, 'lorem ipsum'],
      [/\bTODO\b/, 'TODO'],
      [/href="#"/, 'an empty "#" link'],
    ]) {
      if (re.test(html)) failHere(`${page.file}: contains ${what}`);
    }
    for (const [re, what] of forbidden) {
      if (re.test(copy)) failHere(`${page.file}: contains an unsupported claim (${what})`);
    }
    if (competitors.test(html)) failHere(`${page.file}: contains a competitor name`);
    if (integrationBrands.test(copy)) failHere(`${page.file}: names Garmin, Strava or Polar (only the Integrations page may)`);

    const [re, what] = mustSay[page.slug] ?? [];
    if (re && !re.test(copy)) failHere(`${page.file}: is missing ${what}`);

    if (page.slug === 'nutrition') {
      const head = html.match(/<div class="mp__head[^"]*"[^>]*>([\s\S]*?)<\/div>/);
      const pill = head && [...head[1].matchAll(/<span\b[^>]*class="[^"]*\bco-pill\b[^"]*"[^>]*>([^<]*)<\/span>/g)].map((m) => m[1].trim());
      if (!pill?.includes(mealCardLabel[page.lang])) {
        failHere(`${page.file}: the meal photo result card (.mp__head) is missing its visible "${mealCardLabel[page.lang]}" label`);
      }
    }

    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\salt(=|\s|\/?>)/.test(m[0])) failHere(`${page.file}: img without alt: ${m[0].slice(0, 80)}`);
    }
    for (const m of html.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/g)) {
      if (!/\brel="[^"]*noopener/.test(m[0])) failHere(`${page.file}: target=_blank link without noopener`);
    }

    verifyCoachFloodlight({ html, file: page.file, slug: page.slug, lang: page.lang, dist, fail: failHere });

    // The language switch and the hreflang pair must point at each other.
    if (!html.includes(`href="${page.alt}"`)) failHere(`${page.file}: no link to the ${page.lang === 'en' ? 'Spanish' : 'English'} version`);
    // Every page offers a demo and a free start; the demo link carries its topic.
    if (!/href="[^"]*topic=demo/.test(html)) failHere(`${page.file}: no "Book a demo" link with topic=demo`);
  }
  verifyCoachStyles({ root: join(dist, '..'), fail: failHere });
  if (!problems) console.log(`verify-dist: ${coachPages.length} platform coach pages ok (SEO, hreflang pair, claims guard, alt text, Floodlight structure)`);
}
