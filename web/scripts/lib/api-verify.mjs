// Build guards for the API and legal pages: the URL contract (flat files, one sitemap entry, language switch pair) and the API
// honesty rules (not available yet, early access by email only, no fake signup, never "replaces coaches").
// Runs from verify-dist.mjs. Failure messages start with a stable assertion id, which the mutation battery reports.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scanTags } from './html-scan.mjs';

const origin = 'https://stadioralabs.com';
const FLAT = ['api.html', 'api-es.html', 'privacy.html', 'terms.html'];
const MAIL = 'mailto:api@stadioralabs.com?subject=Aria%20Intelligence%20API%20early%20access';

// The two lines the design removed because they over-claimed, and the wording that implies Aria replaces coaches.
const BANNED = [
  [/removing guesswork/i, 'the removed return-to-play over-claim'],
  [/highest-risk decisions/i, 'the removed return-to-play over-claim'],
  [/replacing gut feel/i, 'the removed "replaces gut feel" line'],
  [/(?:replace|replaces|replacing|instead of)\s+(?:your |the |human )?(?:coach|coaches|trainers|staff)\b/i, 'wording that implies Aria replaces coaches'],
];

const plain = (html) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

export function verifyApiPages({ dist, fail }) {
  // ---- URL contract: the four flat files, and no folder form that would 301 or duplicate them
  for (const f of FLAT) {
    if (!existsSync(join(dist, f)) || !statSync(join(dist, f)).isFile()) fail(`urls.flat-file: ${f} is not a flat file in dist (the post-build step must move ${f}/index.html to ${f})`);
    if (existsSync(join(dist, f, 'index.html'))) fail(`urls.no-folder: dist/${f}/index.html exists; ${f} would be served from two URLs`);
  }
  for (const entry of readdirSync(dist)) {
    if (/\.html$/.test(entry) && statSync(join(dist, entry)).isDirectory()) fail(`urls.no-folder: dist/${entry}/ is a directory named like a page`);
  }
  const sitemaps = readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f));
  const urls = sitemaps.flatMap((f) => [...readFileSync(join(dist, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  for (const f of FLAT) {
    const n = urls.filter((u) => u === `${origin}/${f}`).length;
    if (n !== 1) fail(`urls.sitemap-once: ${origin}/${f} is listed ${n} times in the sitemap, expected exactly once`);
  }
  if (urls.some((u) => /\.html\/$/.test(u))) fail('urls.sitemap-once: the sitemap lists a trailing-slash .html URL');

  // ---- the language switch on the API page goes to the sibling file, not to /es/
  const read = (f) => (existsSync(join(dist, f)) && statSync(join(dist, f)).isFile() ? readFileSync(join(dist, f), 'utf8') : '');
  const en = read('api.html');
  const es = read('api-es.html');
  const hrefOf = (html, lang) => scanTags(html).find((t) => t.name === 'a' && t.attrs.hreflang === lang && t.attrs.lang === lang)?.attrs.href;
  if (hrefOf(en, 'es') !== '/api-es.html') fail(`urls.lang-switch: /api.html switches to ${hrefOf(en, 'es') ?? 'nothing'}, expected /api-es.html`);
  if (hrefOf(es, 'en') !== '/api.html') fail(`urls.lang-switch: /api-es.html switches to ${hrefOf(es, 'en') ?? 'nothing'}, expected /api.html`);
  const alt = (html, lang) => scanTags(html).find((t) => t.name === 'link' && t.attrs.rel === 'alternate' && t.attrs.hreflang === lang)?.attrs.href;
  for (const [name, html] of [['api.html', en], ['api-es.html', es]]) {
    if (alt(html, 'en') !== `${origin}/api.html` || alt(html, 'es') !== `${origin}/api-es.html`) fail(`urls.hreflang: ${name} needs hreflang en -> /api.html and es -> /api-es.html`);
  }

  // ---- API honesty
  for (const [name, html, ask, lang] of [['api.html', en, '/contact/?topic=question', 'en'], ['api-es.html', es, '/es/contact/?topic=question', 'es']]) {
    if (!html) continue;
    const tags = scanTags(html);
    const mails = tags.filter((t) => t.name === 'a' && (t.attrs.href ?? '').startsWith('mailto:api@stadioralabs.com'));
    if (!mails.some((t) => t.attrs.href === MAIL)) fail(`api.honest.early-access: ${name} has no early-access link ${MAIL} (early access is email to api@stadioralabs.com)`);
    const forms = tags.filter((t) => ['form', 'input', 'textarea', 'select'].includes(t.name)).length;
    if (forms) fail(`api.honest.no-signup: ${name} has ${forms} form fields; there is no signup, early access is an email`);
    if (!tags.some((t) => t.name === 'a' && t.attrs.href === ask)) fail(`api.honest.ask: ${name} needs an "Ask a question" link to ${ask}`);
    const text = plain(html);
    const unavailable = lang === 'en' ? /not (?:open|available)[^.]{0,60}yet|not live yet|not callable today/i : /no está (?:abierta|disponible)[^.]{0,60}(?:todavía|aún)|aún no|todavía no/i;
    if (!unavailable.test(text)) fail(`api.honest.unavailable: ${name} must say the API is not available yet`);
    for (const [re, what] of BANNED) if (re.test(text)) fail(`api.honest.claims: ${name} contains ${what}`);
  }
}
