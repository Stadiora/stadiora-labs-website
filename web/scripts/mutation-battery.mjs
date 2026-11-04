// Mutation battery for the API and legal page checks. Run it on a COMMITTED head with a clean tracked tree:
//   node scripts/mutation-battery.mjs [--only=<id>[,<id>]] [--out=<file.md>]
// Every mutation changes one thing the check is there to protect, builds that tree into a scratch folder (the real dist/ is never
// touched), runs the check's own runner, and requires it to FAIL at the named assertion. Each payload must really change the file
// (an edit that matches nothing is itself a failure, so a payload can never silently become a no-op), and every file is restored
// byte for byte in a finally block and compared by hash. A control run per runner first proves the unmutated head PASSES.
// The result is a markdown table with the head SHA, the failing assertion and the line of that assertion in its source.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(web, '..');
// A child of web/, like dist/: some guards locate web/ as `join(dist, '..')`.
const scratch = process.env.MUTATION_DIST ? resolve(process.env.MUTATION_DIST) : join(web, '.mutation-dist');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const only = arg('only')?.split(',');
const out = arg('out');

const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: web, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
const sha = (s) => createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------- runners (what a check is run with)
const RUNNERS = {
  verify: { args: ['scripts/verify-dist.mjs'], failLine: /^\s+- (.+)$/gm },
  cutover: { args: ['scripts/cutover-checks.mjs'], failLine: /^FAIL\s+(.+)$/gm },
  motion: { args: ['scripts/evidence.mjs', '--api-motion-only', '--checks-only'], failLine: /^FAIL\s+(.+)$/gm },
  canary: { args: ['scripts/evidence.mjs', '--api-contrast-only=canary', '--checks-only'], failLine: /^FAIL\s+(.+)$/gm },
  contrast: { args: ['scripts/evidence.mjs', '--api-contrast-only=api-en,1440,light', '--checks-only'], failLine: /^FAIL\s+(.+)$/gm },
  'contrast-dark': { args: ['scripts/evidence.mjs', '--api-contrast-only=api-en,1440,dark', '--checks-only'], failLine: /^FAIL\s+(.+)$/gm },
};

// ---------------------------------------------------------------- the mutations
// edits: [{ file, find, replace }] (find must occur exactly once). runner: key of RUNNERS. env: extra env for the run.
// expect: regex the failing output must match. at: { file, needle } locates the assertion in its source (first line with needle).
const M = [
  {
    id: 'legal-terms-word',
    what: 'Terms body: "may terminate" -> "can terminate" (one word)',
    edits: [{ file: 'src/legal/terms.body.html', find: 'may terminate your account', replace: 'can terminate your account' }],
    runner: 'verify',
    expect: /legal\.verbatim\.content: terms content/,
    at: { file: 'scripts/lib/legal-verbatim.mjs', needle: "check(`legal.verbatim.${key}`, a.length > 0 && a === z" },
  },
  {
    id: 'legal-privacy-word',
    what: 'Privacy body: one word changed',
    edits: [{ file: 'src/legal/privacy.body.html', find: 'We do not sell your personal data. We share', replace: 'We never sell your personal data. We share' }],
    runner: 'verify',
    expect: /legal\.verbatim\.content: privacy content/,
    at: { file: 'scripts/lib/legal-verbatim.mjs', needle: "check(`legal.verbatim.${key}`, a.length > 0 && a === z" },
  },
  {
    id: 'legal-notice-word',
    what: 'Terms notice: "decision-support tools" -> "decision-support instruments"',
    edits: [{ file: 'src/legal/terms.notice.html', find: 'decision-support tools, not medical devices', replace: 'decision-support instruments, not medical devices' }],
    runner: 'verify',
    expect: /legal\.verbatim\.notice: terms notice/,
    at: { file: 'scripts/lib/legal-verbatim.mjs', needle: "check(`legal.verbatim.${key}`, a.length > 0 && a === z" },
  },
  {
    id: 'legal-section-id',
    what: 'Privacy: section id s5 -> sec5 (old deep link breaks)',
    edits: [{ file: 'src/legal/privacy.body.html', find: 'id="s5"', replace: 'id="sec5"' }],
    runners: [
      { runner: 'verify', expect: /legal\.verbatim\.ids: privacy section ids/, at: { file: 'scripts/lib/legal-verbatim.mjs', needle: "check('legal.verbatim.ids'" } },
      { runner: 'cutover', expect: /flat-pages\] \/privacy\.html: the old deep links #s1 \.\.\. #s14 all reach a section/, at: { file: 'scripts/cutover-checks.mjs', needle: 'the old deep links #s1' } },
    ],
  },
  {
    id: 'url-lang-switch',
    what: 'The API language switch goes to /es/ instead of /api-es.html',
    edits: [{ file: 'src/i18n/index.ts', find: "'/api.html': { en: '/api.html', es: '/api-es.html' }", replace: "'/api.html': { en: '/api.html', es: '/es/' }" }],
    runner: 'verify',
    expect: /urls\.lang-switch: \/api\.html switches to/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: "fail(`urls.lang-switch: /api.html switches to" },
  },
  {
    id: 'url-sitemap-once',
    what: 'The sitemap stops listing /api.html',
    edits: [{ file: 'astro.config.mjs', find: "'lead-magnet-es.html', 'api.html', 'api-es.html'", replace: "'lead-magnet-es.html', 'api-es.html'" }],
    runner: 'verify',
    expect: /urls\.sitemap-once: https:\/\/stadioralabs\.com\/api\.html is listed 0 times/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'urls.sitemap-once: ${origin}/${f} is listed' },
  },
  {
    id: 'url-flat-file',
    what: 'The post-build step is switched off (api.html/index.html stays in a folder)',
    edits: [{ file: 'astro.config.mjs', find: "if (!d.endsWith('.html') ||", replace: "if (!d.endsWith('.htmlx') ||" }],
    runner: 'verify',
    expect: /urls\.flat-file: api\.html is not a flat file/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'urls.flat-file:' },
  },
  {
    id: 'honest-signup',
    what: 'A signup form is added to the API open section',
    edits: [{ file: 'src/components/api/ApiOpen.astro', find: '<div class="open-pills"', replace: '<form action="/x"><input type="email" name="e" /></form><div class="open-pills"' }],
    runner: 'verify',
    expect: /api\.honest\.no-signup: .*form fields/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'api.honest.no-signup:' },
  },
  {
    id: 'honest-mailto',
    what: 'Early access points to another address',
    edits: [{ file: 'src/components/api/links.ts', find: 'mailto:api@stadioralabs.com', replace: 'mailto:sales@stadioralabs.com' }],
    runner: 'verify',
    expect: /api\.honest\.early-access: .*has no early-access link/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'api.honest.early-access:' },
  },
  {
    id: 'honest-ask',
    what: '"Ask a question" points somewhere else',
    edits: [{ file: 'src/components/api/links.ts', find: "'/contact/?topic=question'", replace: "'/contact/'" }],
    runner: 'verify',
    expect: /api\.honest\.ask: .*needs an "Ask a question" link/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'api.honest.ask:' },
  },
  {
    id: 'honest-over-claim',
    what: 'The removed over-claiming line comes back ("replacing gut feel")',
    edits: [{ file: 'src/i18n/pages/api.ts', find: 'Opens your email app to api@stadioralabs.com.', replace: 'Opens your email app to api@stadioralabs.com, replacing gut feel.' }],
    runner: 'verify',
    expect: /api\.honest\.claims: .*replaces gut feel/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'api.honest.claims:' },
  },
  {
    id: 'honest-replace-coach',
    what: 'Copy says Aria replaces coaches',
    edits: [{ file: 'src/i18n/pages/api.ts', find: 'Opens your email app to api@stadioralabs.com.', replace: 'Opens your email app to api@stadioralabs.com. Aria replaces coaches.' }],
    runner: 'verify',
    expect: /api\.honest\.claims: .*implies Aria replaces coaches/,
    at: { file: 'scripts/lib/api-verify.mjs', needle: 'api.honest.claims:' },
  },
  {
    id: 'pause-css',
    what: 'The stage pause rule runs the loops instead of pausing them',
    edits: [{ file: 'src/styles/api.css', find: "[data-api-stage][data-ap='off'] :not(.count),\n", replace: "[data-api-stage][data-ap='off'] .never,\n" }],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'en:card#3' },
    expect: /\[api-motion\] en card#3: (mouse over it|a hidden tab|scrolled off screen it) stops everything in it/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'mouse over it stops everything in it' },
  },
  {
    id: 'pause-sports',
    what: 'The sports strip ignores its pause (timer keeps running)',
    edits: [{ file: 'src/scripts/api/sports.ts', find: '      running = false;\n      clearTimeout(timer);', replace: '      running = true;' }],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'en:sports' },
    expect: /\[api-motion\] en sports#\d+: .*stops everything in it/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'mouse over it stops everything in it' },
  },
  {
    id: 'pause-code',
    what: 'The code sample never stops typing',
    edits: [{ file: 'src/scripts/api/code.ts', find: 'const ap = autoplayer(box, { threshold: 0.3, play: start, pause: stop });', replace: 'const ap = autoplayer(box, { threshold: 0.3, play: start, pause: () => {} });' }],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'en:code' },
    expect: /\[api-motion\] en code#\d+: .*stops everything in it/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'mouse over it stops everything in it' },
  },
  {
    id: 'pause-usecases',
    what: 'The use-case rotation never stops',
    edits: [{ file: 'src/scripts/api/usecases.ts', find: "autoplayer(root, { threshold: 0.25, play: start, pause: stop });", replace: "autoplayer(root, { threshold: 0.25, play: start, pause: () => {} });" }],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'en:uc' },
    expect: /\[api-motion\] en uc#\d+: .*stops everything in it/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'a hidden tab stops everything in it' },
  },
  {
    id: 'pause-loose-loop',
    what: 'An endless loop is added outside any stage',
    edits: [{ file: 'src/styles/api.css', find: '.q li span{', replace: '.cap-head .eyebrow{animation:dwFloat 3s linear infinite}\n.q li span{' }],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'none' },
    expect: /\[api-motion\] (en|es): every endless loop in the page content sits inside a stage that pauses/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'every endless loop in the page content sits inside a stage that pauses' },
  },
  {
    id: 'reduced-loops',
    what: 'Reduced motion no longer stops the endless loops (the page rule and the shared kit rule are both removed)',
    edits: [
      { file: 'src/styles/api.css', find: '.rm .g-fg,.rm .g-tiers .on,', replace: '.rm .never,.rm .g-tiers .on,' },
      { file: 'src/styles/motion.css', find: '    animation-iteration-count: 1 !important;\n', replace: '' },
    ],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'none' },
    expect: /\[api-reduced\] (en|es): no endless loop runs in the content/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'no endless loop runs in the content' },
  },
  {
    id: 'reduced-wall',
    what: 'The data wall ignores reduced motion (script and style both)',
    edits: [
      { file: 'src/scripts/api/datawall.ts', find: '    if (isReduced()) {\n      sticky.style.setProperty', replace: '    if (false) {\n      sticky.style.setProperty' },
      { file: 'src/styles/api.css', find: '.rm .dw-sticky{position:relative;height:auto;min-height:0;padding-bottom:40px;--q:1!important}', replace: '.rm .dw-sticky{position:relative;height:auto;min-height:0;padding-bottom:40px}' },
    ],
    runner: 'motion',
    env: { API_MOTION_STAGE: 'none' },
    expect: /\[api-reduced\] (en|es): the data wall shows the finished frame/,
    at: { file: 'scripts/lib/api-motion-checks.mjs', needle: 'the data wall shows the finished frame' },
  },
  {
    id: 'contrast-note',
    what: 'The sports note text goes pale (#5BA9C9)',
    edits: [{ file: 'src/styles/api.css', find: '.sp-note{', replace: '.sp-note{color:#5BA9C9!important;' }],
    runner: 'contrast',
    expect: /\[page-contrast\] api-en 1440 light: every painted text node meets AA over its glyph pixels/,
    at: { file: 'scripts/lib/page-contrast-checks.mjs', needle: 'every painted text node meets AA over its glyph pixels' },
  },
  {
    id: 'contrast-gradient',
    what: 'The hero gradient heading gets a dark violet stop (#4c1d95) on a dark hero',
    edits: [{ file: 'src/styles/seam.css', find: '#00bef3 0%, #34d399 25%, #a78bfa 50%, #34d399 75%, #00bef3 100%);\n  background-size', replace: '#00bef3 0%, #34d399 25%, #4c1d95 50%, #34d399 75%, #00bef3 100%);\n  background-size' }],
    runner: 'contrast-dark',
    expect: /\[page-contrast\] api-en 1440 dark: every painted text node meets AA over its glyph pixels/,
    at: { file: 'scripts/lib/page-contrast-checks.mjs', needle: 'every painted text node meets AA over its glyph pixels' },
  },
  {
    id: 'oracle-percentile',
    what: 'The oracle forgives the worst glyph pixels (only the strongest-coverage pixels are judged)',
    edits: [{ file: 'scripts/lib/glyph-contrast.mjs', find: 'if (ratio < min) {', replace: 'if (ratio < min && ratio > 1.4) {' }],
    runner: 'canary',
    expect: /\[page-contrast\] oracle canary: a word over a band that is ~1:1/,
    at: { file: 'scripts/lib/page-contrast-checks.mjs', needle: 'a word over a band that is ~1:1' },
  },
  {
    id: 'oracle-skip-gradient',
    what: 'The oracle skips gradient-text nodes (a blanket exemption)',
    edits: [{ file: 'scripts/lib/glyph-contrast.mjs', find: "if (e.closest('[data-decorative]')) continue;", replace: "if (e.closest('[data-decorative], .grad-text')) continue;" }],
    runner: 'canary',
    expect: /\[page-contrast\] oracle canary: a gradient heading faded into its backdrop is caught/,
    at: { file: 'scripts/lib/page-contrast-checks.mjs', needle: 'a gradient heading faded into its backdrop is caught' },
  },
];

// ---------------------------------------------------------------- machinery
const lineOf = ({ file, needle }) => {
  const lines = readFileSync(join(web, file), 'utf8').split('\n');
  const i = lines.findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error(`assertion needle not found in ${file}: ${needle}`);
  return `${file}:${i + 1}`;
};

const build = () => {
  rmSync(scratch, { recursive: true, force: true });
  const r = sh('npx', ['astro', 'build', '--outDir', scratch]);
  if (r.status !== 0) throw new Error(`astro build failed:\n${(r.stdout + r.stderr).slice(-1500)}`);
};

const run = (runner, env = {}) => {
  const r = sh('node', RUNNERS[runner].args, { env: { ...process.env, DIST_DIR: scratch, ...env } });
  const text = `${r.stdout}\n${r.stderr}`;
  const fails = [...text.matchAll(RUNNERS[runner].failLine)].map((m) => m[1].trim());
  return { status: r.status, fails, text };
};

const apply = (edit) => {
  const path = join(web, edit.file);
  const before = readFileSync(path, 'utf8');
  let after;
  if (edit.regex) {
    const re = new RegExp(edit.find);
    if (!re.test(before)) throw new Error(`payload matches nothing in ${edit.file}: /${edit.find}/`);
    after = before.replace(re, edit.replace);
  } else {
    const n = before.split(edit.find).length - 1;
    if (n !== 1) throw new Error(`payload must match exactly once in ${edit.file}, matched ${n}: ${edit.find.slice(0, 70)}`);
    after = before.replace(edit.find, () => edit.replace);
    for (const extra of edit.also ?? []) {
      const m = after.split(extra.find).length - 1;
      if (m !== 1) throw new Error(`companion payload must match exactly once in ${edit.file}, matched ${m}: ${extra.find.slice(0, 70)}`);
      after = after.replace(extra.find, () => extra.replace);
    }
  }
  if (after === before || sha(after) === sha(before)) throw new Error(`payload did not change ${edit.file}`);
  writeFileSync(path, after);
  return { path, before };
};

// ---------------------------------------------------------------- run
const status = sh('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: repo }).stdout.trim();
if (status) {
  console.error(`The tracked tree is not clean; commit first.\n${status}`);
  process.exit(2);
}
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
mkdirSync(scratch, { recursive: true });
const selected = M.filter((m) => !only || only.includes(m.id));
const rows = [];
let bad = 0;

// Control: the unmutated head must pass every runner used below (otherwise a "fail" proves nothing).
const used = [...new Set(selected.flatMap((m) => (m.runners ?? [m]).map((r) => r.runner)))];
build();
const controls = {};
for (const r of used) {
  const env = r === 'motion' ? { API_MOTION_STAGE: 'none' } : {};
  const c = run(r, env);
  controls[r] = c.status === 0;
  console.log(`control ${r}: ${c.status === 0 ? 'PASS' : 'FAIL'}${c.status === 0 ? '' : `\n${c.fails.slice(0, 5).join('\n')}`}`);
  if (c.status !== 0) bad++;
}

for (const m of selected) {
  const saved = [];
  const t0 = Date.now();
  let verdict = 'FAIL-AS-EXPECTED';
  const details = [];
  try {
    for (const e of m.edits) saved.push(apply(e));
    build();
    for (const r of m.runners ?? [{ runner: m.runner, expect: m.expect, at: m.at }]) {
      const res = run(r.runner, { ...(m.env ?? {}), ...(r.runner === 'motion' && !m.env ? { API_MOTION_STAGE: 'none' } : {}) });
      const hit = res.fails.find((f) => r.expect.test(f));
      if (res.status === 0 || !hit) {
        verdict = 'MISSED';
        details.push({ runner: r.runner, assertion: res.status === 0 ? 'the run PASSED' : `failed elsewhere: ${res.fails.slice(0, 2).join(' | ').slice(0, 160)}`, line: lineOf(r.at) });
      } else details.push({ runner: r.runner, assertion: hit, line: lineOf(r.at) });
    }
  } catch (error) {
    verdict = 'ERROR';
    details.push({ runner: '-', assertion: String(error.message).split('\n')[0], line: '-' });
  } finally {
    for (const s of saved.reverse()) writeFileSync(s.path, s.before);
  }
  const clean = sh('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: repo }).stdout.trim() === '';
  if (!clean) {
    console.error('RESTORE FAILED: the tree differs from HEAD after the mutation');
    process.exit(3);
  }
  if (verdict !== 'FAIL-AS-EXPECTED') bad++;
  for (const d of details) rows.push({ id: m.id, what: m.what, ...d, verdict, secs: Math.round((Date.now() - t0) / 1000) });
  console.log(`${verdict.padEnd(17)} ${m.id}  ${details.map((d) => `${d.runner}: ${d.assertion.slice(0, 110)} @ ${d.line}`).join(' ; ')}  (${Math.round((Date.now() - t0) / 1000)}s)`);
}
rmSync(scratch, { recursive: true, force: true });

const esc = (s) => String(s).replace(/\|/g, '\\|');
const table = [
  `Head: \`${head}\``,
  '',
  '| # | Mutation | Runner | Failing assertion | Assertion line | Result |',
  '|---|----------|--------|-------------------|----------------|--------|',
  ...rows.map((r, i) => `| ${i + 1} | ${esc(r.what)} | ${r.runner} | \`${esc(r.assertion.slice(0, 170))}\` | ${r.line} | ${r.verdict === 'FAIL-AS-EXPECTED' ? 'caught' : r.verdict} |`),
  '',
  `Controls (unmutated head): ${Object.entries(controls).map(([k, v]) => `${k} ${v ? 'PASS' : 'FAIL'}`).join(', ')}`,
].join('\n');
console.log(`\n${table}`);
if (out) writeFileSync(out, `${table}\n`);
process.exit(bad ? 1 : 0);
