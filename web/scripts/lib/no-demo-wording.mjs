// No demo or preview wording anywhere in the shipped site (owner rule, R57). Walks every file in dist/ after the build and
// fails, naming the file and the match, when it finds (case-insensitive) `demo`, `demostraci`, `preview`, `vista previa` or
// `[preview]` in: the <title>, meta/OG/Twitter tags, visible text, sr-only text, any attribute value (aria-label, alt, title,
// href, src, id, class, data-*), JSON-LD, sitemap/robots/XML/txt, CSS, client JS, or any FILE NAME. The raw text of each
// file is scanned, so nothing a reader, a crawler or someone viewing the page source can see is skipped.
// Only these whole unrelated words are tolerated: `demonstrated` (legal text), `demostrar`, `demostrado`, `demostró`.
// `demonstration`, `demonstrate` and `demostración` are NOT tolerated.
// NOT COVERED: a static scan cannot see text composed at runtime, for example by String.fromCharCode.
// Run alone: `node scripts/lib/no-demo-wording.mjs [distDir]`.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTags } from './html-scan.mjs';

const BANNED = /\[preview\]|vista previa|preview|demostraci|demo/gi;
const LEGAL_WORDS = /(?<![\p{L}\p{N}_])(?:demonstrated|demostrar|demostrado|demostró)(?![\p{L}\p{N}_])/giu;

// Pin the actual statements, not object-shaped fragments. A compiler change must deliberately update these expectations.
// Each site must occur exactly once in its own file and in the script containing its real lookup/request.
const contactSites = [
  { name: 'contact legacy alias', statement: 'var e={demo:`call`},t=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/,n=15e3;', request: 'b=e[y]??y,x=p.find(e=>e.value===b)' },
  {
    name: 'contact POST body',
    statement: 'let y={topic:l?`demo`:`question`,name:c(`name`),email:c(`email`),role:c(`role`),message:c(`message`),locale:o,page:window.location.pathname,website:m(`website`).value,startedAt:u};',
    request: 'let b=await r(a,y);',
  },
];
const leadSite = (locale) => ({
  name: 'lead POST body',
  statement: `const body = {
    topic: 'demo',
    name: 'Early access request',
    email: email,
    role: path.startsWith('coach') ? 'coach' : 'athlete',
    organization: label,
    message: ${locale === 'en' ? '`Early access request from the readiness check.\\nProduct interest: ${label}`' : '`Solicitud de acceso anticipado desde la evaluación.\\nProducto de interés: ${label}`'},
    locale: LOCALE,
    page: window.location.pathname,
    website: honeypot.value,
    startedAt: OPENED_AT
  };`,
  request: "fetch(CONTACT_API, {\n        method: 'POST',",
});
const expectedSites = new Map([
  ['contact/index.html', contactSites],
  ['es/contact/index.html', contactSites],
  ['lead-magnet.html', [leadSite('en')]],
  ['lead-magnet-es.html', [leadSite('es')]],
]);

const wordingMatches = (text) => {
  const legalAt = new Set([...text.matchAll(LEGAL_WORDS)].map((m) => m.index));
  return [...text.matchAll(BANNED)].filter((m) => !legalAt.has(m.index));
};

const isBinary = (buf) => buf.subarray(0, 4096).includes(0);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const snippet = (text, index, length) => {
  const from = Math.max(0, index - 30);
  return text.slice(from, index + length + 30).replace(/\s+/g, ' ').trim();
};

/** Every problem in a dist/ tree as `{ file, where, match, context }`, and how many allowlisted matches were used. */
export function scanDist(dist) {
  const root = resolve(dist);
  const problems = [];
  const seenFiles = new Set();
  let allowedUsed = 0;
  for (const path of walk(root)) {
    const rel = relative(root, path).split(sep).join('/');
    for (const m of wordingMatches(rel)) problems.push({ file: rel, where: 'file name', match: m[0], context: rel });
    const buf = readFileSync(path);
    if (isBinary(buf)) continue;
    const text = buf.toString('utf8');
    const allowedAt = new Set();
    const sites = expectedSites.get(rel);
    if (sites) {
      seenFiles.add(rel);
      const scripts = scanTags(text).filter((tag) => tag.name === 'script' && !('src' in tag.attrs));
      for (const site of sites) {
        const hits = [];
        for (const tag of scripts) {
          const script = text.slice(tag.contentStart, tag.contentEnd);
          const contact = rel.endsWith('contact/index.html');
          const requestSite = contact
            ? tag.attrs.type === 'module' && script.includes('a=n.dataset.endpoint??``') && script.includes('fetch(e,{method:`POST`') && script.includes('document.querySelectorAll(`[data-contact-form]`)') && text.includes('data-endpoint="https://api.runwitharia.com/api/public/website-contact"')
            : script.includes("const CONTACT_API = 'https://api.runwitharia.com/api/public/website-contact';") && script.includes('body: JSON.stringify(body)');
          if (!requestSite || !script.includes(site.request)) continue;
          for (let at = script.indexOf(site.statement); at !== -1; at = script.indexOf(site.statement, at + site.statement.length)) {
            hits.push(tag.contentStart + at + site.statement.indexOf('demo'));
          }
        }
        if (hits.length === 1) allowedAt.add(hits[0]);
        else problems.push({ file: rel, where: site.name, match: site.name, context: `expected exactly 1 designated statement, found ${hits.length}` });
      }
    }
    for (const m of wordingMatches(text)) {
      if (allowedAt.has(m.index)) {
        allowedUsed++;
        continue;
      }
      problems.push({ file: rel, where: `line ${lineOf(text, m.index)}`, match: m[0], context: snippet(text, m.index, m[0].length) });
    }
  }
  for (const [file, sites] of expectedSites) {
    if (!seenFiles.has(file)) for (const site of sites) problems.push({ file, where: site.name, match: site.name, context: 'missing expected file/site' });
  }
  return { problems, allowedUsed };
}

export function verifyNoDemoWording({ dist, fail }) {
  const { problems } = scanDist(dist);
  for (const p of problems) fail(`no-demo-wording: ${p.file} (${p.where}): "${p.match}" in "${p.context}"`);
  return problems.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? fileURLToPath(new URL('../../dist/', import.meta.url));
  const { problems, allowedUsed } = scanDist(dist);
  for (const p of problems) console.error(`no-demo-wording: ${p.file} (${p.where}): "${p.match}" in "${p.context}"`);
  if (problems.length) {
    console.error(`no-demo-wording: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
    process.exit(1);
  }
  console.log(`no-demo-wording: ok (${allowedUsed} allowlisted match${allowedUsed === 1 ? '' : 'es'})`);
}
