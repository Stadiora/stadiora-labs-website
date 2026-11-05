// No demo or preview wording anywhere in the shipped site (owner rule, R57). Walks every file in dist/ after the build and
// fails, naming the file and the match, when it finds (case-insensitive) `demo`, `demostraci`, `preview`, `vista previa` or
// `[preview]` in: the <title>, meta/OG/Twitter tags, visible text, sr-only text, any attribute value (aria-label, alt, title,
// href, src, id, class, data-*), JSON-LD, sitemap/robots/XML/txt, CSS, client JS, or any FILE NAME. The raw text of each
// file is scanned, so nothing a reader, a crawler or someone viewing the page source can see is skipped.
// Only these whole unrelated words are tolerated: `demonstrated` (legal text), `demostrar`, `demostrado`, `demostró`.
// `demonstration`, `demonstrate` and `demostración` are NOT tolerated.
// Run alone: `node scripts/lib/no-demo-wording.mjs [distDir]`.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTags } from './html-scan.mjs';

const BANNED = /\[preview\]|vista previa|preview|demostraci|demo/gi;
const LEGAL_WORDS = /(?<![\p{L}\p{N}_])(?:demonstrated|demostrar|demostrado|demostró)(?![\p{L}\p{N}_])/giu;

// Three exemptions, each one literal at one site in a <script> element, found with scanTags so comments, attributes, <noscript>
// and visible text can never use them. Nothing else is exempt: no other file, bundle or wire value.
//  1. The legacy alias `{demo:'call'}` in the inline contact-form module of each contact page.
//  2. The endpoint's fixed topic enum, in the same inline module, at the one place the POST body is built:
//     `{topic: <identifier> ? 'demo' : 'question', name:`. The backend accepts only `demo` or `question`, so the form maps its
//     `call` topic to `demo` there (a minified bundle writes the strings in backticks, so any quote style is read).
//  3. The same enum value in the plain inline script of each lead-magnet page, where its body is built:
//     `{topic: 'demo', name: 'Early access request'`. The lead pages are static HTML with no shared constant, and a neutral-named
//     constant would still put the literal in the file, so the exact site is the narrowest entry.
const CONTACT_PAGES = /^(?:es\/)?contact\/index\.html$/;
const LEGACY_ALIAS = /\{\s*demo\s*:\s*(['"`])call\1\s*\}/;
const CONTACT_WIRE = /\{\s*topic\s*:\s*[\w$]+\s*\?\s*(['"`])demo\1\s*:\s*(['"`])question\2\s*,\s*name\s*:/;
const LEAD_PAGES = /^lead-magnet(?:-es)?\.html$/;
const LEAD_WIRE = /\{\s*topic\s*:\s*(['"`])demo\1\s*,\s*name\s*:\s*(['"`])Early access request\2/;

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
  let allowedUsed = 0;
  for (const path of walk(root)) {
    const rel = relative(root, path).split(sep).join('/');
    for (const m of wordingMatches(rel)) problems.push({ file: rel, where: 'file name', match: m[0], context: rel });
    const buf = readFileSync(path);
    if (isBinary(buf)) continue;
    const text = buf.toString('utf8');
    const allowedAt = new Set();
    const allowAt = (script, tag, re) => {
      const hit = re.exec(script);
      if (hit) allowedAt.add(tag.contentStart + hit.index + hit[0].indexOf('demo'));
      return Boolean(hit);
    };
    if (CONTACT_PAGES.test(rel)) {
      for (const tag of scanTags(text)) {
        if (tag.name !== 'script' || tag.attrs.type !== 'module' || 'src' in tag.attrs) continue;
        const script = text.slice(tag.contentStart, tag.contentEnd);
        if (!script.includes('data-contact-form')) continue;
        const alias = allowAt(script, tag, LEGACY_ALIAS);
        const wire = allowAt(script, tag, CONTACT_WIRE);
        if (alias || wire) break;
      }
    } else if (LEAD_PAGES.test(rel)) {
      for (const tag of scanTags(text)) {
        if (tag.name !== 'script' || 'src' in tag.attrs) continue;
        if (allowAt(text.slice(tag.contentStart, tag.contentEnd), tag, LEAD_WIRE)) break;
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
