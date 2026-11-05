import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const web = fileURLToPath(new URL('../', import.meta.url));
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { cwd: web, env, encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `${command} terminated: ${result.signal}`);
  return result;
};
const git = (...args) => {
  const result = run('git', args);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
const head = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain'), '', 'Run the battery on a clean committed tree');
const hash = (content) => createHash('sha256').update(content).digest('hex');
function treeHash(dir) {
  const contents = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    contents.push([entry.name, entry.isDirectory() ? treeHash(path) : hash(readFileSync(path))]);
  }
  return hash(JSON.stringify(contents));
}

const home = 'index.html';
const pricing = 'pricing/index.html';
const esPricing = 'es/pricing/index.html';
const contact = 'contact/index.html';
const cases = [
  { name: 'Demo in title', file: home, needle: '<title>', insert: '<title>Demo ', match: 'Demo' },
  { name: '[PREVIEW] in title', file: home, needle: '<title>', insert: '<title>[PREVIEW] ', match: '[PREVIEW]' },
  { name: 'Demo in meta description', file: home, needle: '<meta name="description" content="', insert: '<meta name="description" content="Demo ', match: 'Demo' },
  { name: 'Demo in visible text', file: pricing, html: '<p>Demo</p>', match: 'Demo' },
  { name: 'Preview in sr-only span', file: pricing, html: '<span class="sr-only">Preview</span>', match: 'Preview' },
  { name: 'Demo in aria-label', file: pricing, html: '<span aria-label="Demo"></span>', match: 'Demo' },
  { name: 'topic=demo in href', file: home, html: '<a href="/contact/?topic=demo">Contact</a>', match: 'demo' },
  { name: 'demo-x CSS class', file: pricing, html: '<p class="demo-x">Contact</p>', match: 'demo' },
  { name: 'x-preview.png file name', file: 'x-preview.png', content: 'image', match: 'preview', where: 'file name' },
  { name: 'Vista previa in ES text', file: esPricing, html: '<p>Vista previa</p>', match: 'Vista previa' },
  { name: 'Datos de demostración in ES text', file: esPricing, html: '<p>Datos de demostración</p>', match: 'demostraci' },
  { name: "Visible topic: 'demo' on contact", file: contact, html: "<p>topic: 'demo'</p>", match: 'demo' },
  { name: 'Visible {demo:"call"} on contact', file: contact, html: '<p>{demo:"call"}</p>', match: 'demo' },
  { name: 'Alias in contact data attribute', file: contact, html: '<p data-alias=\'{demo:"call"}\'>Contact</p>', match: 'demo' },
  { name: 'Alias in script on another page', file: pricing, html: '<script type="module">const alias={demo:"call"};</script>', match: 'demo' },
  { name: "topic: 'demo' in unrelated _astro JS", file: '_astro/wording-canary.js', content: "const payload={topic: 'demo'};", match: 'demo' },
  { name: 'Demonstration in sr-only paragraph', file: home, html: '<p class="sr-only">Demonstration of the AI program builder.</p>', match: 'Demo' },
  { name: 'Book a demonstration in visible text', file: pricing, html: '<p>Book a demonstration for your school</p>', match: 'demo' },
  { name: 'Alias in noscript on contact', file: contact, html: '<noscript>{demo:"call"}</noscript>', match: 'demo' },
  { name: 'Alias in script nested in noscript', file: contact, html: '<noscript><script type="module">const alias={demo:"call"};document.querySelector("[data-contact-form]");</script></noscript>', match: 'demo' },
  { name: 'Alias in commented-out script', file: contact, html: '<!-- <script type="module">const alias={demo:"call"};document.querySelector("[data-contact-form]");</script> -->', match: 'demo' },
  { name: 'Alias in script-shaped data attribute', file: contact, html: '<p data-code=\'<script type="module">const alias={demo:"call"};document.querySelector("[data-contact-form]");</script>\'>Contact</p>', match: 'demo' },
  { name: 'Alias in unrelated _astro JS', file: '_astro/wording-canary.js', content: 'const alias={demo:"call"};document.querySelector("[data-contact-form]");', match: 'demo' },
  { name: 'demonstrate is not a legal-word exemption', file: pricing, html: '<p>demonstrate</p>', match: 'demo' },
  { name: 'demonstrated suffix is not a whole word', file: pricing, html: '<p>demonstratedness</p>', match: 'demo' },
  { name: 'demostrado prefix is not a whole word', file: esPricing, html: '<p>predemostrado</p>', match: 'demo' },
  { name: 'control: demonstrated in privacy text', file: 'privacy.html', html: '<p>demonstrated</p>', green: true },
  { name: 'control: demostrado in ES text', file: esPricing, html: '<p>demostrado</p>', green: true },
  { name: 'control: demostrar and demostró', file: esPricing, html: '<p>demostrar demostró</p>', green: true },
  { name: 'control: clean-tree identity', green: true },
];

const scratch = mkdtempSync(join(tmpdir(), 'r57-wording-'));
const dist = join(web, 'dist');
const copy = join(scratch, 'dist');
const results = [];
const identity = treeHash(dist);
try {
  cpSync(dist, copy, { recursive: true });
  assert.equal(treeHash(copy), identity, 'Copied dist must be identical');
  for (const test of cases) {
    const path = test.file ? join(copy, test.file) : null;
    const before = path && existsSync(path) ? readFileSync(path) : null;
    let editedHash = null;
    try {
      if (path) {
        const original = before?.toString('utf8') ?? '';
        const needle = test.needle ?? '</body>';
        const edited = test.content ?? original.replace(needle, test.insert ?? `${test.html}</body>`);
        if (test.content === undefined) assert.ok(original.includes(needle), `${test.name}: anchor missing`);
        assert.notEqual(edited, original, `${test.name}: edit did not land`);
        mkdirSync(join(path, '..'), { recursive: true });
        writeFileSync(path, edited);
        assert.equal(readFileSync(path, 'utf8'), edited, `${test.name}: content mismatch`);
        editedHash = hash(readFileSync(path));
        assert.notEqual(editedHash, hash(before ?? ''), `${test.name}: unchanged hash`);
      } else {
        assert.equal(treeHash(copy), identity, 'Identity control must be unchanged');
      }
      const verified = run('npm', ['run', 'verify'], { ...process.env, DIST_DIR: copy });
      const output = verified.stdout + verified.stderr;
      const failures = output.split('\n').filter((line) => /^\s+- /.test(line));
      const guardFailures = failures.filter((line) => line.includes('no-demo-wording:'));
      assert.equal(verified.status, test.green ? 0 : 1, `${test.name}\n${output}`);
      if (test.green) {
        assert.equal(guardFailures.length, 0, output);
      } else {
        assert.ok(guardFailures.some((line) => line.includes(`no-demo-wording: ${test.file} (`) && line.includes(`"${test.match}"`) && (!test.where || line.includes(`(${test.where})`))), `${test.name}: expected guard assertion missing\n${output}`);
        assert.equal(failures.length, guardFailures.length, `${test.name}: failed outside the wording guard\n${output}`);
      }
      results.push({ name: test.name, file: test.file ?? null, beforeHash: before ? hash(before) : null, editedHash, status: verified.status, assertions: guardFailures, result: test.green ? 'green control' : 'red: wording guard' });
    } finally {
      if (path && before) writeFileSync(path, before);
      else if (path) rmSync(path);
    }
  }
  assert.equal(treeHash(copy), identity, 'All copied mutations must be restored');
  assert.equal(treeHash(dist), identity, 'Real dist must remain unchanged');
  assert.equal(git('rev-parse', 'HEAD'), head, 'Head changed during the battery');
  assert.equal(git('status', '--porcelain'), '', 'Tree changed during the battery');
  const out = join(web, '.evidence');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'no-demo-wording-battery.json'), `${JSON.stringify({ head, distHash: identity, results }, null, 2)}\n`);
  console.log(`Head: ${head}\n${results.length}/${cases.length} behaved as required; ${results.filter((r) => r.status === 1).length} guard failures, ${results.filter((r) => r.status === 0).length} green controls.\n`);
  console.log('| # | Mutation / control | Result |');
  console.log('|---|---|---|');
  results.forEach((result, index) => console.log(`| ${index + 1} | ${result.name} | ${result.result} |`));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
