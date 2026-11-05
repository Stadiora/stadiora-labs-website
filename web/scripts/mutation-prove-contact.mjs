// Mutation proof for the contact checks:  node scripts/mutation-prove-contact.mjs [id ...]
// Each payload breaks one rule in the SOURCE (a copy of the file is kept and restored), builds that into its own folder,
// and runs the gate that is meant to catch it. A payload only counts when
//   - it really changed the file (the search text is found exactly once and the replacement differs), and
//   - the gate fails, and the failing assertion is the one the payload targets (`expect`).
// Commit before running: the run refuses a dirty tree, so the head SHA printed with the table names exactly what was proven.
// The table goes to stdout (Markdown) and to MUTATION_TABLE_OUT when set. Exit code 1 when any payload survives.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('..', import.meta.url));
const run = (cmd, args, env = {}) => spawnSync(cmd, args, { cwd: web, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const git = (...args) => execFileSync('git', args, { cwd: web, encoding: 'utf8' }).trim();

const sha = git('rev-parse', 'HEAD');
if (git('status', '--porcelain')) {
  console.error('mutation-prove: the working tree is not clean. Commit first, so the table names the head it ran on.');
  process.exit(2);
}


const work = resolve(process.env.MUTATION_WORK ?? `${tmpdir()}/contact-mutation-${process.pid}`);
mkdirSync(work, { recursive: true });
const keep = resolve(work, 'originals');
const distFor = (name) => resolve(web, `dist-mut-${name}`);

// gate -> how to run it and how to read a failure from it.
const gates = {
  contact: { label: 'evidence --contact-only', cmd: ['node', ['scripts/evidence.mjs', '--contact-only', '--checks-only']], fails: (out) => out.split('\n').filter((l) => l.startsWith('FAIL')), source: 'scripts/lib/contact-checks.mjs' },
  lead: { label: 'cutover-checks', cmd: ['node', ['scripts/cutover-checks.mjs']], fails: (out) => out.split('\n').filter((l) => l.startsWith('FAIL')), source: 'scripts/cutover-checks.mjs' },
  logos: { label: 'evidence --logos-only', cmd: ['node', ['scripts/evidence.mjs', '--logos-only', '--checks-only']], fails: (out) => out.split('\n').filter((l) => l.startsWith('FAIL')), source: 'scripts/lib/logo-marquee-checks.mjs' },
  verify: { label: 'verify', cmd: ['node', ['scripts/verify-dist.mjs']], fails: (out) => out.split('\n').filter((l) => /^ {2}- /.test(l)), source: null },
};
// verify-dist keeps its assertions in two files; the line is looked up in both.
const verifySources = ['scripts/lib/verify-solutions.mjs', 'scripts/lib/cutover-verify.mjs'];

const CF = 'src/scripts/contact-form.ts';
const LM = 'public/lead-magnet.html';
const LMES = 'public/lead-magnet-es.html';
const mutations = [
  // ---- the form never shows success on a non-202 response
  { id: 'M01', rule: 'success only on 202', file: CF, find: "if (res.status === 202) return 'ok';", put: "if (res.ok) return 'ok';", gate: 'contact', expect: 'is a failure, never a success' },
  { id: 'M02', rule: 'success only on 202', file: CF, find: "} catch {\n    return 'unavailable';", put: "} catch {\n    return 'ok';", gate: 'contact', expect: 'is a failure, never a success' },
  { id: 'M03', rule: 'success only on 202', file: CF, find: "if (res.status === 429) return 'limited';", put: "if (res.status === 429) return 'limited';\n    if (res.status === 503) return 'ok';", gate: 'contact', expect: 'is a failure, never a success' },
  { id: 'M04', rule: 'distinct 400/429/503 messages', file: CF, find: "if (res.status === 429) return 'limited';", put: "if (res.status === 429) return 'invalid';", gate: 'contact', expect: 'each get their own message' },
  { id: 'M05', rule: 'failure keeps the direct contacts', file: CF, find: "show('fail', messages[outcome], true);", put: "show('fail', messages[outcome], false);", gate: 'contact', expect: 'is a failure, never a success' },
  { id: 'M06', rule: 'sent text is the approved text', file: 'src/i18n/pages/contact.ts', find: "ok: 'Your message was sent. Thank you, we will reply to the email you gave.',", put: "ok: 'Thank you, your message is in good hands.',", gate: 'verify', expect: 'the success message must be exactly' },
  // ---- the honeypot and startedAt are always sent, and the fill time is respected
  { id: 'M07', rule: 'honeypot always sent', file: CF, find: "      website: field('website').value,\n", put: '', gate: 'contact', expect: 'every post carries the honeypot' },
  { id: 'M08', rule: 'startedAt always sent', file: CF, find: '      startedAt: openedAt,\n', put: '', gate: 'contact', expect: 'every post carries the honeypot' },
  { id: 'M09', rule: '3 s minimum fill time', file: CF, find: 'if (wait > 0) await', put: 'if (wait > 1e9) await', gate: 'contact', expect: 'every post carries the honeypot' },
  { id: 'M10', rule: 'startedAt is the form-open time', file: CF, find: '      startedAt: openedAt,', put: '      startedAt: Date.now(),', gate: 'contact', expect: 'every post carries the honeypot' },
  { id: 'M11', rule: 'honeypot present in the page', file: 'src/components/pages/ContactPage.astro', find: '<div class="hp" inert>', put: '<div class="hp-gone" inert>', gate: 'verify', expect: 'the honeypot input "website" must be present and inert' },
  // ---- payload shape, validation, topic
  { id: 'M12', rule: 'invalid form posts nothing', file: CF, find: '      field(invalid).focus();\n      return;', put: '      field(invalid).focus();', gate: 'contact', expect: 'posts nothing' },
  { id: 'M13', rule: 'invalid email is rejected', file: CF, find: 'const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/;', put: 'const EMAIL = /.*/;', gate: 'contact', expect: 'an invalid email is rejected on its own' },
  { id: 'M14', rule: '?topic=question preselects', file: CF, find: 'const initial = radios.find((r) => r.value === requested);', put: 'const initial = radios.find((r) => r.value === `${requested}-x`);', gate: 'contact', expect: '?topic=question preselects' },
  { id: 'M15', rule: 'the topic travels with the post', file: CF, find: "      topic: isCall ? 'demo' : 'question',", put: "      topic: 'demo',", gate: 'contact', expect: 'posts topic "question"' },
  { id: 'M15b', rule: 'a call goes out as the endpoint value, not as the page name', file: CF, find: "      topic: isCall ? 'demo' : 'question',", put: "      topic: isCall ? 'call' : 'question',", gate: 'contact', expect: "posts the endpoint's wire value for a call" },
  { id: 'M16', rule: 'athletes omitted when unset', file: CF, find: "if (isCall && value('athletes'))", put: "if (isCall)", gate: 'contact', expect: 'athletes is left out' },
  { id: 'M17', rule: 'role is an endpoint value', file: 'src/i18n/pages/contact.ts', find: "{ value: 'school-admin', label: 'School administrator' }", put: "{ value: 'School administrator', label: 'School administrator' }", gate: 'verify', expect: 'role values must be exactly' },
  { id: 'M18', rule: 'the form posts to the live endpoint', file: 'src/data/site.ts', find: "contactApi: 'https://api.runwitharia.com/api/public/website-contact'", put: "contactApi: 'https://api.runwitharia.com/api/public/website-contacts'", gate: 'verify', expect: 'form endpoint must be exactly' },
  { id: 'M19', rule: 'no mailto path on the form', file: 'src/components/pages/ContactPage.astro', find: '        data-contact-form\n', put: '        data-contact-form\n        action="mailto:anthony@stadioralabs.com"\n', gate: 'verify', expect: 'the form must not carry an action' },
  // ---- the burst is decoration after a 202 only
  { id: 'M20', rule: 'burst only after a 202', file: 'src/scripts/solutions/contact.ts', find: "if (status.dataset.state !== 'ok' || isReduced()) return;", put: "if (status.dataset.state === 'busy' || isReduced()) return;", gate: 'contact', expect: 'never burst' },
  { id: 'M21', rule: 'no burst under reduced motion', file: 'src/scripts/solutions/contact.ts', find: "if (status.dataset.state !== 'ok' || isReduced()) return;", put: "if (status.dataset.state !== 'ok') return;", gate: 'contact', expect: 'under reduced motion there is no burst' },
  // ---- the quiz / lead-magnet form (EN and ES)
  { id: 'M22', rule: 'quiz: success only on 202 (EN)', file: LM, find: 'if (code === 202) {', put: 'if (code >= 200 && code < 300) {', gate: 'lead', expect: 'a plain message with the direct contacts, no success' },
  { id: 'M23', rule: 'quiz: success only on 202 (ES)', file: LMES, find: 'if (code === 202) {', put: 'if (code >= 200 && code < 300) {', gate: 'lead', expect: 'a plain message with the direct contacts, no success' },
  { id: 'M24', rule: 'quiz: honeypot always sent (EN)', file: LM, find: '    website: honeypot.value,\n', put: '', gate: 'lead', expect: 'every post carries the honeypot' },
  { id: 'M25', rule: 'quiz: startedAt always sent (ES)', file: LMES, find: ',\n    startedAt: OPENED_AT', put: '', gate: 'lead', expect: 'every post carries the honeypot' },
  { id: 'M26', rule: 'quiz: 3 s minimum fill time (EN)', file: LM, find: 'const wait = MIN_FILL_MS + 250 - (Date.now() - OPENED_AT);', put: 'const wait = 0;', gate: 'lead', expect: 'a post made right after the page opens' },
  { id: 'M27', rule: 'quiz: 3 s minimum fill time (ES)', file: LMES, find: 'const wait = MIN_FILL_MS + 250 - (Date.now() - OPENED_AT);', put: 'const wait = 0;', gate: 'lead', expect: 'a post made right after the page opens' },
  { id: 'M28', rule: 'quiz: distinct 400/429/503 messages (EN)', file: LM, find: "code === 429 ? MSG.limited : MSG.unavailable", put: "code === 429 ? MSG.invalid : MSG.unavailable", gate: 'lead', expect: 'each get their own message' },
  // ---- both regions, with tel:, mailto: and wa.me links
  { id: 'M29', rule: 'US phone link in the footer and contact page', file: 'src/data/site.ts', find: "tel: '+18592859529'", put: "tel: '+18592859520'", gate: 'verify', expect: 'is missing the contact link tel:+18592859529', at: 'the footer is missing the contact link' },
  { id: 'M30', rule: 'LatAm WhatsApp link in the footer and contact page', file: 'src/data/site.ts', find: "whatsapp: 'https://wa.me/50660419069' }", put: "whatsapp: 'https://wa.me/50660419060' }", gate: 'verify', expect: 'is missing the contact link https://wa.me/50660419069', at: 'the footer is missing the contact link' },
  { id: 'M31', rule: 'US email on connect.html', file: 'public/connect.html', find: 'href="mailto:ian@stadioralabs.com"', put: 'href="mailto:ian@stadioralabs.co"', gate: 'verify', expect: '/connect.html is missing the contact link mailto:ian@stadioralabs.com', at: '/connect.html is missing the contact link' },
  // ---- the About partners strip is the shared, moving logo marquee
  { id: 'M32', rule: 'About marquee loops seamlessly (second set present)', file: 'src/components/ui/LogoMarquee.astro', find: '[false, true].map((copy) => (', put: '(host ? [false] : [false, true]).map((copy) => (', gate: 'logos', expect: 'about partners @1440 light: two sets, the second aria-hidden', at: 'two sets, the second aria-hidden, inert and without alt text' },
  { id: 'M33', rule: 'About marquee pauses offscreen', file: 'src/styles/logo-marquee.css', find: ".logo-marquee[data-ap='off'] .marquee-track {", put: ".logo-marquee[data-ap='off-never'] .marquee-track {", gate: 'logos', expect: 'scrolling the unit out of view stops everything in it', src: 'scripts/lib/solutions-motion-checks.mjs', at: 'stops everything in it (loops' },
  { id: 'M34', rule: 'About marquee uses the theme-correct logo variant', file: 'src/components/ui/LogoMarquee.astro', find: 'class="only-light" src={`/logos/${l.slug}-mono-dark.${l.ext}`}', put: 'class="only-light" src={`/logos/${l.slug}-mono-light.${l.ext}`}', gate: 'logos', expect: 'about partners @1440 light: every visible mark is the dark variant', at: 'every visible mark is the' },
];

const only = process.argv.slice(2);
const todo = mutations.filter((m) => !only.length || only.includes(m.id));

// The line (1-based) of the first source line that holds the fragment, as "file:line".
const lineOf = (files, fragment) => {
  for (const file of files) {
    const at = readFileSync(resolve(web, file), 'utf8').split('\n').findIndex((l) => l.includes(fragment));
    if (at >= 0) return `${file}:${at + 1}`;
  }
  return '(not found)';
};

const build = (dist) => {
  const r = run('npx', ['astro', 'build', '--outDir', dist]);
  if (r.status !== 0) throw new Error(`astro build failed:\n${(r.stdout + r.stderr).slice(-1500)}`);
};
const runGate = (name, dist) => {
  const { cmd } = gates[name];
  const r = run(cmd[0], cmd[1], { DIST_DIR: dist });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

const rows = [];
let survived = 0;

// A clean build must pass every gate, or a "failure" below proves nothing.
const baselineDist = distFor('baseline');
console.error(`baseline build at ${sha.slice(0, 9)}`);
build(baselineDist);
for (const name of [...new Set(todo.map((m) => m.gate))]) {
  const g = runGate(name, baselineDist);
  if (g.status !== 0) {
    rmSync(baselineDist, { recursive: true, force: true });
    console.error(`the unmutated head fails ${gates[name].label}; nothing is proven.\n${gates[name].fails(g.out).join('\n')}`);
    process.exit(2);
  }
  console.error(`baseline ${gates[name].label}: pass`);
}

for (const m of todo) {
  const path = resolve(web, m.file);
  const backup = resolve(keep, m.file);
  mkdirSync(dirname(backup), { recursive: true });
  copyFileSync(path, backup);
  const before = readFileSync(path, 'utf8');
  const row = { ...m };
  try {
    const hits = before.split(m.find).length - 1;
    if (hits !== 1) throw new Error(`the search text was found ${hits} times in ${m.file}, expected exactly 1`);
    const after = before.replace(m.find, () => m.put);
    if (after === before) throw new Error('the payload did not change the file');
    writeFileSync(path, after);
    if (readFileSync(path, 'utf8') === before) throw new Error('the file on disk is unchanged after the payload');

    const dist = distFor(m.id);
    build(dist);
    const g = runGate(m.gate, dist);
    const fails = gates[m.gate].fails(g.out);
    const hit = fails.find((l) => l.includes(m.expect));
    row.changed = true;
    row.caught = g.status !== 0 && Boolean(hit);
    row.assertion = (hit ?? fails[0] ?? '(the gate passed)').replace(/^FAIL\s+|^ {2}- /, '').replace(/\s+/g, ' ').slice(0, 150);
    row.line = hit ? lineOf(m.src ? [m.src] : gates[m.gate].source ? [gates[m.gate].source] : verifySources, m.at ?? m.expect) : '-';
  } catch (e) {
    row.changed = false;
    row.caught = false;
    row.assertion = `ERROR: ${e.message.split('\n')[0]}`;
    row.line = '-';
  } finally {
    rmSync(distFor(m.id), { recursive: true, force: true });
    copyFileSync(backup, path);
  }
  if (readFileSync(path, 'utf8') !== before) throw new Error(`could not restore ${m.file}`);
  if (!row.caught) survived++;
  rows.push(row);
  console.error(`${m.id} ${row.caught ? 'caught' : 'SURVIVED'}  ${m.rule}`);
}

if (git('status', '--porcelain')) throw new Error('the tree is dirty after the battery; a file was not restored');
rmSync(work, { recursive: true, force: true });
rmSync(baselineDist, { recursive: true, force: true });

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
const table = [
  `Mutation battery on head \`${sha}\` (clean tree, every payload verified to change its file and restored afterwards).`,
  '',
  '| # | Rule protected | File mutated | Gate | Result | Failing assertion | Check at |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${esc(r.rule)} | \`${r.file}\` | ${gates[r.gate].label} | ${r.caught ? 'caught' : '**SURVIVED**'} | ${esc(r.assertion)} | ${r.line === '-' ? '-' : `\`${r.line}\``} |`),
  '',
  `${rows.length - survived}/${rows.length} payloads caught.`,
].join('\n');
console.log(table);
if (process.env.MUTATION_TABLE_OUT) writeFileSync(process.env.MUTATION_TABLE_OUT, `${table}\n`);
process.exit(survived ? 1 : 0);
