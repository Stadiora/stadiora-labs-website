// Post-build checks on dist/. Fails the build when something that must never ship is present.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { verifyPricing } from './lib/pricing-verify.mjs';
import { pendingReport } from './lib/engage-links.mjs';
import { engagePages, verifyEngagePages } from './lib/engage-verify.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
const fail = (msg) => errors.push(msg);

const pages = [
  { file: 'index.html', lang: 'en', canonical: 'https://stadioralabs.com/', og: '/og/home-en.png' },
  { file: 'es/index.html', lang: 'es', canonical: 'https://stadioralabs.com/es/', og: '/og/home-es.png' },
];

const count = (html, re) => (html.match(re) ?? []).length;

for (const page of pages) {
  const path = join(dist, page.file);
  if (!existsSync(path)) {
    fail(`${page.file}: missing`);
    continue;
  }
  const html = readFileSync(path, 'utf8');
  const tag = (re, what) => {
    if (!re.test(html)) fail(`${page.file}: missing ${what}`);
  };

  tag(new RegExp(`<html[^>]*\\blang="${page.lang}"`), `html lang="${page.lang}"`);
  tag(/<title>[^<]{10,}<\/title>/, 'title');
  tag(/<meta name="description" content="[^"]{40,}"/, 'meta description');
  tag(new RegExp(`<link rel="canonical" href="${page.canonical}"`), 'canonical');
  for (const [hreflang, href] of [
    ['en', 'https://stadioralabs.com/'],
    ['es', 'https://stadioralabs.com/es/'],
    ['x-default', 'https://stadioralabs.com/'],
  ]) {
    tag(new RegExp(`<link rel="alternate" hreflang="${hreflang}" href="${href}"`), `hreflang ${hreflang}`);
  }
  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) tag(new RegExp(`<meta property="${prop}"`), prop);
  tag(new RegExp(`<meta property="og:image" content="https://stadioralabs.com${page.og}"`), `og:image ${page.og}`);
  tag(/<meta name="twitter:card" content="summary_large_image"/, 'twitter:card');
  if (!existsSync(join(dist, page.og))) fail(`${page.file}: ${page.og} is not in dist`);

  if (count(html, /<h1[\s>]/g) !== 1) fail(`${page.file}: expected exactly one h1`);
  if (count(html, /<main[\s>]/g) !== 1) fail(`${page.file}: expected exactly one main`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      fail(`${page.file}: invalid JSON-LD`);
    }
  }

  // Dev-only placeholders and unfilled photo slots must not reach the build.
  for (const [re, what] of [
    [/data-placeholder/, 'data-placeholder'],
    [/placeholder/i, 'the word "placeholder"'],
    [/photo--missing/, 'an unfilled photo slot'],
    [/lorem ipsum/i, 'lorem ipsum'],
    [/\bTODO\b/, 'TODO'],
    [/everfit|trainerize|trainheroic/i, 'competitor names'],
    [/garmin|strava|polar flow/i, 'unsupported integration claims'],
  ]) {
    if (re.test(html)) fail(`${page.file}: contains ${what}`);
  }

  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt(=|\s|\/?>)/.test(m[0])) fail(`${page.file}: img without alt: ${m[0].slice(0, 80)}`);
  }
}

verifyPricing(dist, fail);
const pendingLinks = new Map();
verifyEngagePages({ dist, fail, pending: pendingLinks });

if (!existsSync(join(dist, 'sitemap-index.xml'))) fail('sitemap-index.xml: missing');

// Budgets from DESIGN.md section 7: hero photos 180 KB, videos 1.5 MB, per delivered file.
const assets = join(dist, '_astro');
if (existsSync(assets)) {
  for (const name of readdirSync(assets)) {
    const size = statSync(join(assets, name)).size;
    if (/\.(mp4|webm)$/.test(name) && size > 1.5 * 1024 * 1024) fail(`_astro/${name}: video over 1.5 MB`);
    if (/\.(png|jpe?g)$/.test(name) && size > 400 * 1024) fail(`_astro/${name}: raster over 400 KB`);
    if (/^h\d-.*\.(avif|webp)$/.test(name) && size > 180 * 1024) fail(`_astro/${name}: hero photo over 180 KB`);
  }
}

// Cutover guard: Pages still runs Jekyll over the repo root, and web/*.astro files are invalid front matter.
// Parse _config.yml and assert the real `exclude` setting: a top-level `exclude` list that contains web, and no
// `include` entry that would bring it back (Jekyll lets `include` win over `exclude`).
const jekyllConfig = join(fileURLToPath(new URL('../../', import.meta.url)), '_config.yml');
const jekyllNames = (list) => (Array.isArray(list) ? list.filter((v) => typeof v === 'string').map((v) => v.replace(/\/+$/, '')) : []);
if (!existsSync(jekyllConfig)) {
  fail('_config.yml is missing at the repo root: Jekyll would build web/ and fail the Pages deploy');
} else {
  let config;
  let parsed = false;
  try {
    config = parse(readFileSync(jekyllConfig, 'utf8'));
    parsed = true;
  } catch (error) {
    fail(`_config.yml is not valid YAML (duplicate keys included): ${error.message.split('\n')[0]}`);
  }
  // Every successful parse is checked: a scalar, list or empty root (e.g. `false`) is not a Jekyll config mapping.
  if (parsed && (config === null || typeof config !== 'object' || Array.isArray(config))) {
    fail('_config.yml: the root must be a mapping with an `exclude` list that contains `web`');
  } else if (parsed) {
    if (!Array.isArray(config.exclude) || !jekyllNames(config.exclude).includes('web')) {
      fail('_config.yml: `exclude` must be a list that contains `web`, or the Pages Jekyll build fails on web/**/*.astro');
    }
    if (jekyllNames(config.include).includes('web')) {
      fail('_config.yml: `include` lists `web`, which overrides `exclude` and puts web/ back into the Jekyll build');
    }
  }
}

for (const line of pendingReport(pendingLinks)) console.log(line);
if (errors.length) {
  console.error(`verify-dist: ${errors.length} problem${errors.length === 1 ? '' : 's'}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`verify-dist: ok (${pages.length} home pages + ${engagePages.length} platform pages, hreflang, OG, sitemap, no placeholders)`);
