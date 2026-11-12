// Guards the hidden state of the pricing page (SHOW_PRICING=false in src/data/site.ts), on the built dist/:
//   - /pricing/ and /es/pricing/ are small redirect stubs to the contact page of the same locale (meta refresh, canonical, noindex);
//   - no page links to the pricing URLs, and the stubs themselves link only to contact;
//   - the pricing URLs are not in any sitemap;
//   - no page shows a price amount (a "$" followed by a digit).
// While the flag is true the guard prints a note and checks nothing: the pricing-page guards in pricing-verify.mjs take over.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { internalLinks } from './link-guard.mjs';
import { isNoindex, scanTags } from './html-scan.mjs';
import { showPricing, skipNote } from './pricing-flag.mjs';

const origin = 'https://stadioralabs.com';
const stubs = [
  { url: '/pricing/', to: '/contact/', lang: 'en' },
  { url: '/es/pricing/', to: '/es/contact/', lang: 'es' },
];
// The Terms page caps liability at "one hundred US dollars (USD $100)". That is legal text, not a price, and it is checked verbatim elsewhere.
const liabilityCap = /one hundred US dollars \(USD \$100\)/g;
const isPricingPath = (path) => /^\/(?:es\/)?pricing(?:\/(?:index\.html)?)?$/i.test(path);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

export function verifyPricingHidden({ dist, fail }) {
  if (showPricing) {
    console.log('verify-pricing-hidden: SHOW_PRICING=true, the pricing page is published, nothing to check');
    return;
  }
  const problems = [];
  const report = (msg) => problems.push(`pricing hidden: ${msg}`);

  // 1. the stubs
  const stubFiles = new Set();
  for (const { url, to, lang } of stubs) {
    const file = join(dist, url, 'index.html');
    stubFiles.add(file);
    if (!existsSync(file)) {
      report(`${url} is not in the build`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    const tags = scanTags(html);
    const refresh = tags.find((t) => t.name === 'meta' && (t.attrs['http-equiv'] ?? '').toLowerCase() === 'refresh');
    if (!refresh || !new RegExp(`^\\s*0\\s*;\\s*url=${to}\\s*$`, 'i').test(refresh.attrs.content ?? '')) report(`${url} must meta-refresh to ${to}`);
    const canonical = tags.find((t) => t.name === 'link' && t.attrs.rel === 'canonical');
    if (canonical?.attrs.href !== `${origin}${to}`) report(`${url} must have canonical ${origin}${to}, found ${canonical?.attrs.href ?? 'none'}`);
    if (!isNoindex(html)) report(`${url} must be noindex`);
    if (!new RegExp(`<html[^>]*\\blang="${lang}"`).test(html)) report(`${url} must be lang="${lang}"`);
    if (tags.some((t) => t.name === 'main' || t.name === 'h1' || t.name === 'script')) report(`${url} must be a bare redirect stub, not the pricing page`);
    const targets = internalLinks(html, url).map((l) => l.path);
    if (targets.length !== 1 || targets[0] !== to) report(`${url} must link only to ${to}, found [${targets}]`);
  }

  // 2. no link to a pricing URL anywhere else, 4. no price amount on any page
  let pages = 0;
  for (const file of walk(dist)) {
    if (!/\.html$/.test(file) || stubFiles.has(file)) continue;
    pages++;
    const url = `/${relative(dist, file).split(sep).join('/')}`;
    const html = readFileSync(file, 'utf8');
    for (const { href } of internalLinks(html, url).filter(({ path }) => isPricingPath(path))) report(`${url} links to ${href}`);
    for (const m of html.replace(liabilityCap, '').matchAll(/.{0,30}\$\s*\d.{0,20}/g)) report(`${url} shows a price amount: ${m[0].replace(/\s+/g, ' ').trim()}`);
  }
  if (pages < 30) report(`only ${pages} pages scanned, the scan is not looking at the build`);

  // 3. not in any sitemap
  let sitemaps = 0;
  for (const name of readdirSync(dist).filter((n) => /^sitemap.*\.xml$/.test(n))) {
    sitemaps++;
    for (const m of readFileSync(join(dist, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (isPricingPath(new URL(m[1]).pathname)) report(`${name} lists ${m[1]}`);
    }
  }
  if (!sitemaps) report('no sitemap in the build');

  for (const p of problems) fail(p);
  if (!problems.length) console.log(`verify-pricing-hidden: ok (pricing hidden: 2 redirect stubs, no pricing links or $ amounts in ${pages} pages, not in ${sitemaps} sitemaps)`);
}
