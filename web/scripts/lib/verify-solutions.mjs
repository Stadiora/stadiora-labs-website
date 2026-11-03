// Post-build checks for the solutions, resources and company pages (EN and ES). Called from verify-dist.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT_EMAIL, approvedNote, approvedOpening, findDeliveryClaims } from './contact-contract.mjs';

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

      // Region-aware prices: the server renders the US price, and both prices travel as data attributes.
      for (const m of html.matchAll(/<[a-z]+[^>]*data-region-price[^>]*>/g)) {
        need(/data-us="\$\d+"/.test(m[0]) && /data-latam="\$\d+"/.test(m[0]), `region price missing data-us/data-latam: ${m[0].slice(0, 80)}`);
      }

      if (route.path === '/contact/') {
        need(/<form[^>]*action="mailto:/.test(html), 'form must fall back to mailto');
        need(count(html, /<input[^>]*type="radio"[^>]*name="topic"/g) === 2, 'two topic radios');

        // Honest contact: nothing is delivered from the page. The post-submit status must be the approved text,
        // word for word (contact-contract.mjs), and no text or script may claim a delivery, receipt or reply time.
        let payload = null;
        try {
          payload = JSON.parse(decodeEntities(/\bdata-mail="([^"]*)"/.exec(html)?.[1] ?? ''));
        } catch {
          payload = null;
        }
        need(payload?.opening === approvedOpening[lang], `post-submit status must be exactly "${approvedOpening[lang]}", found ${JSON.stringify(payload?.opening)}`);
        need(payload?.to === CONTACT_EMAIL, `mail recipient must be exactly ${CONTACT_EMAIL}, found ${JSON.stringify(payload?.to)}`);
        for (const what of findDeliveryClaims(String(payload?.opening ?? ''), lang)) need(false, `post-submit status claims receipt or delivery: ${what}`);
        const text = pageText(html);
        need(text.includes(approvedNote[lang]), `mailto note must read exactly "${approvedNote[lang]}"`);
        for (const what of findDeliveryClaims(text, lang)) need(false, `page text claims receipt or delivery: ${what}`);
        for (const script of pageScripts(html, dist)) {
          for (const what of findDeliveryClaims(script, lang)) need(false, `a script on the page claims receipt or delivery: ${what}`);
        }
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
