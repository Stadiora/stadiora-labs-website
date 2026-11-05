// No demo or preview wording anywhere in the shipped site (owner rule, R57). Walks every file in dist/ after the build and
// fails, naming the file and the match, when it finds (case-insensitive) `demo`, `demostraci`, `preview`, `vista previa` or
// `[preview]` in: the <title>, meta/OG/Twitter tags, visible text, sr-only text, any attribute value (aria-label, alt, title,
// href, src, id, class, data-*), JSON-LD, sitemap/robots/XML/txt, CSS, client JS, or any FILE NAME. The raw text of each
// file is scanned, so nothing a reader, a crawler or someone viewing the page source can see is skipped.
// Unrelated words are tolerated: `demonstrat*` (demonstrated compliance in the legal text) and Spanish `demostrar`,
// `demostrado`, `demostró`. `demostraci*` (demostración) is NOT tolerated: it means "demo".
// Run alone: `node scripts/lib/no-demo-wording.mjs [distDir]`.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BANNED = /\[preview\]|vista previa|preview|demostraci|demo(?!nstrat|strar|strad|stró)/gi;

// The allowlist has exactly two entries, each matched to its own site. The contact script ships inline in the two contact
// pages (or, if it grows, as an _astro chunk), and the minifier may switch the quote style, so all three quotes match.
const SCRIPT_FILES = /^(?:(?:es\/)?contact\/index\.html|_astro\/.*\.js)$/;
const ALLOWED = [
  {
    // The wire value of the contact endpoint's fixed `demo|question` enum, set where the POST body is built.
    what: "wire value topic: 'demo'",
    file: SCRIPT_FILES,
    site: /topic\s*:\s*(['"`])demo\1/g,
  },
  {
    // The old `?topic=demo` links keep opening the same form: the contact script maps the legacy name to `call`.
    what: 'legacy ?topic=demo alias',
    file: SCRIPT_FILES,
    needs: 'data-contact-form',
    site: /\{\s*demo\s*:\s*(['"`])call\1\s*\}/g,
  },
];

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
    for (const m of rel.matchAll(BANNED)) problems.push({ file: rel, where: 'file name', match: m[0], context: rel });
    const buf = readFileSync(path);
    if (isBinary(buf)) continue;
    const text = buf.toString('utf8');
    const allowedAt = new Set();
    for (const rule of ALLOWED) {
      if (!rule.file.test(rel) || (rule.needs && !text.includes(rule.needs))) continue;
      for (const site of text.matchAll(rule.site)) {
        for (const m of site[0].matchAll(BANNED)) allowedAt.add(site.index + m.index);
      }
    }
    for (const m of text.matchAll(BANNED)) {
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
