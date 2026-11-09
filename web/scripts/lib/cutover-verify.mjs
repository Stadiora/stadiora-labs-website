// Cutover guards on dist/. The new build replaces what stadioralabs.com serves today, so this file fails the build when:
//   - a URL that is live today is neither in dist/, nor a redirect stub, nor on the documented retired list (live-urls.mjs);
//   - a file at the repo root (the old site, still there until the post-cutover cleanup) or an old sitemap.xml entry is not
//     accounted for in that list;
//   - a redirect stub is not a script-free meta refresh with a canonical link to its target;
//   - a carried page refers to a local file that is not in dist/ (the connect.html video was one);
//   - the SEO contract is broken: sitemap, robots.txt, canonical and hreflang on every page, one OG card per page type that exists;
//   - a page links to another page of the site that is not in the build, or to a #fragment that has no id on the target (a link
//     to a redirect stub with a fragment counts: the refresh drops the fragment);
//   - the carried pages lost a fix from the cutover PR (noindex, lead form honesty, hidden investor links/content, CNAME).
// Markup is read with scripts/lib/html-scan.mjs, which skips comments and script/style text, so a tag that is only inside a
// comment is not active and does not count.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { built, carried, liveUrls, notUrls, redirects, retired } from './live-urls.mjs';
import { isNoindex, scanTags } from './html-scan.mjs';
import { internalLinks, linkProblems } from './link-guard.mjs';
import { pendingRoutes } from './engage-links.mjs';
import { CONTACT_ENDPOINT, MIN_FILL_MS, contactHrefs, contacts, missingContactHrefs } from './contact-contract.mjs';

const origin = 'https://stadioralabs.com';
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const read = (path) => readFileSync(path, 'utf8');
const decode = (p) => {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
};

/** dist/ file that answers a URL path (decoded). A trailing slash means its index.html. */
export const fileFor = (dist, urlPath) => join(dist, urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

// Pages that must stay out of search results and out of the sitemap.
export const noindexPages = ['/anthony/index.html', '/ian/index.html'];
// Carried legacy pages that are indexed: canonical, listed in the sitemap.
const indexableLegacy = ['/connect.html', '/api.html', '/api-es.html', '/lead-magnet.html', '/lead-magnet-es.html', '/privacy.html', '/terms.html'];
const hreflangPairs = { '/api.html': ['/api.html', '/api-es.html'], '/api-es.html': ['/api.html', '/api-es.html'], '/lead-magnet.html': ['/lead-magnet.html', '/lead-magnet-es.html'], '/lead-magnet-es.html': ['/lead-magnet.html', '/lead-magnet-es.html'] };

const ogTypeFor = (urlPath) => {
  const route = urlPath.replace(/^\/es(?=\/)/, '') || '/';
  if (route === '/') return 'home';
  const first = route.split('/')[1];
  return ['platform', 'solutions', 'pricing'].includes(first) ? first : 'company';
};

export function verifyCutover({ dist, fail, root = repoRoot }) {
  // ------------------------------------------------------------------ 1. every live URL is accounted for
  const missing = [];
  for (const url of [...built, ...redirects.map((r) => r.url), ...carried]) {
    if (!existsSync(fileFor(dist, url))) missing.push(url);
  }
  for (const url of missing) {
    fail(`cutover: ${url} is live today but missing from the build. Carry it in web/public, redirect it, or add it to \`retired\` with a reason in scripts/lib/live-urls.mjs`);
  }

  const listed = new Set(liveUrls());
  const listedFile = (rel) => {
    const url = `/${rel.split(sep).join('/')}`;
    return listed.has(url) || (url.endsWith('/index.html') && listed.has(url.slice(0, -'index.html'.length)));
  };

  // ------------------------------------------------------------------ 2. the old site at the repo root is fully listed
  if (existsSync(join(root, 'index.html'))) {
    const top = readdirSync(root).filter((n) => !notUrls.includes(n));
    for (const name of top) {
      const full = join(root, name);
      const files = statSync(full).isDirectory() ? walk(full) : [full];
      for (const file of files) {
        const rel = relative(root, file);
        if (!listedFile(rel)) fail(`cutover: /${rel.split(sep).join('/')} exists at the repo root (live today) but is not in scripts/lib/live-urls.mjs`);
      }
    }
    const oldMap = join(root, 'sitemap.xml');
    if (existsSync(oldMap)) {
      for (const [, loc] of read(oldMap).matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const path = decode(new URL(loc).pathname);
        if (!listed.has(path)) fail(`cutover: old sitemap.xml lists ${loc}, which is not in scripts/lib/live-urls.mjs`);
      }
    }
  }

  // ------------------------------------------------------------------ 3. redirect stubs
  for (const { url, to } of redirects) {
    const file = fileFor(dist, url);
    if (!existsSync(file)) continue;
    const html = read(file);
    if (!new RegExp(`<meta http-equiv="refresh" content="0; url=${to.replace(/[\\/.]/g, '\\$&')}">`).test(html)) fail(`cutover: ${url} must be a meta refresh to ${to}`);
    if (!html.includes(`<link rel="canonical" href="${origin}${to}">`)) fail(`cutover: ${url} must carry a canonical link to ${origin}${to}`);
    if (/<script\b/i.test(html)) fail(`cutover: ${url} must not need JavaScript`);
    if (!existsSync(fileFor(dist, to))) fail(`cutover: ${url} redirects to ${to}, which is not in the build`);
  }

  // ------------------------------------------------------------------ 4. CNAME
  const cname = join(dist, 'CNAME');
  if (!existsSync(cname)) fail('cutover: dist/CNAME is missing; the Pages artifact would drop the custom domain');
  else if (read(cname).trim() !== 'stadioralabs.com') fail(`cutover: dist/CNAME must be stadioralabs.com, found "${read(cname).trim()}"`);

  // ------------------------------------------------------------------ 5. carried pages keep working: local refs resolve
  const carriedPages = carried.filter((u) => u.endsWith('.html'));
  for (const url of carriedPages) {
    const file = fileFor(dist, url);
    if (!existsSync(file)) continue;
    const html = read(file);
    const base = posix.dirname(url);
    const refs = scanTags(html).flatMap((t) => [t.attrs.src, t.attrs.href, t.attrs.poster]).filter((r) => r !== undefined);
    for (const ref of new Set(refs)) {
      if (!ref || /^(#|https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) continue;
      const clean = decode(ref.split(/[?#]/)[0]);
      if (!clean) continue;
      const target = clean.startsWith('/') ? clean : posix.normalize(posix.join(base, clean));
      if (!existsSync(fileFor(dist, target))) fail(`cutover: ${url} refers to ${ref}, which is not in the build`);
    }
  }
  if (existsSync(fileFor(dist, '/connect.html')) && /(?:src|href)\s*=\s*["'][^"']*monitors\.mp4/i.test(read(fileFor(dist, '/connect.html')))) {
    fail('cutover: connect.html still refers to videos/monitors.mp4, which never shipped');
  }

  // ------------------------------------------------------------------ 6. noindex pages
  for (const url of noindexPages) {
    const file = fileFor(dist, url);
    if (existsSync(file) && !isNoindex(read(file))) fail(`cutover: ${url} has no active <meta name="robots"> with noindex (a tag inside a comment does not count)`);
  }

  // ------------------------------------------------------------------ 7. lead form honesty
  for (const url of ['/lead-magnet.html', '/lead-magnet-es.html']) {
    const file = fileFor(dist, url);
    if (!existsSync(file)) continue;
    const html = read(file);
    if (/web3forms|PASTE_ACCESS_KEY_HERE/i.test(html)) fail(`cutover: ${url} still refers to Web3Forms; the lead form posts to ${CONTACT_ENDPOINT}`);
    if (!html.includes(`'${CONTACT_ENDPOINT}'`)) fail(`cutover: ${url} must post to ${CONTACT_ENDPOINT}`);
    if (/mailto:[^'"]*\?/.test(html)) fail(`cutover: ${url} must not hand the visitor a pre-filled mailto as the way to send`);
    if (!/code === 202\) \{/.test(html)) fail(`cutover: ${url} must show success only when the endpoint answers exactly 202`);
    if (!/website: honeypot\.value/.test(html) || !/startedAt: OPENED_AT/.test(html)) fail(`cutover: ${url} must always send the honeypot (website) and startedAt fields`);
    if (!new RegExp(`MIN_FILL_MS = ${MIN_FILL_MS};`).test(html)) fail(`cutover: ${url} must wait out the ${MIN_FILL_MS} ms minimum fill time`);
  }
  // connect.html reaches LatAm by WhatsApp, so the page carries no separate tel: link for it.
  if (existsSync(fileFor(dist, '/connect.html'))) {
    for (const href of missingContactHrefs(read(fileFor(dist, '/connect.html')), contactHrefs.filter((h) => h !== `tel:${contacts.latam.tel}`))) fail(`cutover: /connect.html is missing the contact link ${href}`);
  }

  // ------------------------------------------------------------------ 8. investor pages are hidden until the new deck is final
  // The URLs are redirect stubs (live-urls.mjs); nothing in the build may link to them or carry the old content.
  for (const file of walk(dist)) {
    const url = `/${relative(dist, file).split(sep).join('/')}`;
    const bytes = readFileSync(file);
    if (bytes.subarray(0, 4096).includes(0)) continue;
    const html = bytes.toString('utf8');
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (/Investor Overview|Resumen para Inversores/i.test(html) || /150\+\s+(?:Athletes on the Platform|Atletas en la Plataforma)/i.test(text)) fail(`cutover: ${url} carries investor-page content`);
    if (file.endsWith('.html') && internalLinks(html, url).some(({ path }) => /^\/investors(?:-es)?(?:\.html)?\/?$/i.test(path))) fail(`cutover: ${url} links to a hidden investor page`);
  }
  for (const [url, notice] of [
    ['/investors.html', 'Stadiora Labs This page moved to stadioralabs.com .'],
    ['/investors-es.html', 'Stadiora Labs Esta p\u00e1gina se movi\u00f3 a stadioralabs.com/es/ .'],
  ]) {
    const file = fileFor(dist, url);
    if (!existsSync(file)) continue;
    const text = read(file).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text !== notice) fail(`cutover: ${url} must contain only the redirect notice`);
  }

  // ------------------------------------------------------------------ 9. SEO: pages, sitemap, robots
  const pages = walk(dist)
    .filter((f) => f.endsWith(`${sep}index.html`) && !f.includes(`${sep}_astro${sep}`))
    .map((f) => ({ file: f, url: `/${relative(dist, f).split(sep).join('/').replace(/index\.html$/, '')}` }))
    .filter((p) => !noindexPages.includes(`${p.url}index.html`) && !p.url.startsWith('/anthony/') && !p.url.startsWith('/ian/'));

  const sitemapIndex = join(dist, 'sitemap.xml');
  const sitemap0 = join(dist, 'sitemap-0.xml');
  let sitemapUrls = new Set();
  if (!existsSync(sitemap0)) fail('cutover: sitemap-0.xml is missing');
  else sitemapUrls = new Set([...read(sitemap0).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  if (existsSync(sitemapIndex) && !read(sitemapIndex).includes(`${origin}/sitemap-0.xml`)) fail('cutover: /sitemap.xml must list sitemap-0.xml, the generated sitemap');

  const abs = (p) => `${origin}${p}`;
  const twin = (url) => (url.startsWith('/es/') ? url.slice(3) : `/es${url}`);
  for (const { file, url } of pages) {
    const html = read(file);
    const noindex = isNoindex(html);
    const tag = `${url} (${relative(dist, file)})`;
    if (!noindex) {
      if (!sitemapUrls.has(abs(url))) fail(`cutover: ${tag} is indexable but not in the sitemap`);
      if (!html.includes(`<link rel="canonical" href="${abs(url)}"`)) fail(`cutover: ${tag} needs a canonical link to itself`);
      const en = url.startsWith('/es/') ? twin(url) : url;
      const es = url.startsWith('/es/') ? url : twin(url);
      for (const [lang, href] of [['en', en], ['es', es], ['x-default', en]]) {
        if (!html.includes(`<link rel="alternate" hreflang="${lang}" href="${abs(href)}"`)) fail(`cutover: ${tag} needs hreflang ${lang} -> ${abs(href)}`);
      }
      const og = `/og/${ogTypeFor(url)}-${url.startsWith('/es/') ? 'es' : 'en'}.png`;
      if (!html.includes(`<meta property="og:image" content="${abs(og)}"`)) fail(`cutover: ${tag} needs og:image ${og}`);
      if (!existsSync(join(dist, og))) fail(`cutover: ${og} is not in dist (run node scripts/og.mjs)`);
    } else if (sitemapUrls.has(abs(url))) {
      fail(`cutover: ${tag} is noindex but listed in the sitemap`);
    }
  }
  for (const url of sitemapUrls) {
    const path = decode(new URL(url).pathname);
    if (!existsSync(fileFor(dist, path))) fail(`cutover: sitemap lists ${url}, which is not in the build`);
  }
  for (const url of indexableLegacy) {
    if (!sitemapUrls.has(abs(url))) fail(`cutover: ${url} should be in the sitemap`);
    const file = fileFor(dist, url);
    if (!existsSync(file)) continue;
    const html = read(file);
    if (!html.includes(`<link rel="canonical" href="${abs(url)}">`)) fail(`cutover: ${url} needs a canonical link to itself`);
    for (const alt of hreflangPairs[url] ?? []) {
      const lang = alt.includes('-es') ? 'es' : 'en';
      if (!html.includes(`<link rel="alternate" hreflang="${lang}" href="${abs(alt)}">`)) fail(`cutover: ${url} needs hreflang ${lang} -> ${abs(alt)}`);
    }
    if (!/<meta name="description" content="[^"]{40,}"/.test(html)) fail(`cutover: ${url} needs a meta description`);
    if (url === '/connect.html') {
      const og = scanTags(html).find((t) => t.name === 'meta' && t.attrs.property === 'og:image')?.attrs.content;
      if (og !== abs('/og/company-en.png')) fail(`cutover: ${url} needs og:image ${abs('/og/company-en.png')}, found ${og ?? 'none'}`);
    }
  }
  for (const url of [...noindexPages, ...redirects.map((r) => r.url), '/404.html']) {
    if (sitemapUrls.has(abs(url))) fail(`cutover: ${url} must not be in the sitemap`);
  }
  for (const url of ['/anthony/', '/ian/']) if (sitemapUrls.has(abs(url))) fail(`cutover: ${url} must not be in the sitemap`);

  const robots = join(dist, 'robots.txt');
  if (existsSync(robots)) {
    const text = read(robots);
    if (!text.includes(`Sitemap: ${origin}/sitemap.xml`)) fail('cutover: robots.txt must point at the sitemap');
    // Disallow blocks crawling, not indexing, so a disallowed noindex page is never read and the tag never binds.
    if (/^\s*Disallow:\s*\S/im.test(text.replace(/^#.*$/gm, ''))) fail('cutover: robots.txt must not Disallow anything; the noindex tags only bind when crawlers can read the pages');
  }

  // The 404: served for every unknown URL, so it has no canonical of its own and must stay out of search results.
  const nf = join(dist, '404.html');
  if (existsSync(nf)) {
    const html = read(nf);
        if (!isNoindex(html)) fail('cutover: 404.html must be noindex');
    if (scanTags(html).some((t) => t.name === 'link' && (t.attrs.rel ?? '').toLowerCase() === 'canonical')) fail('cutover: 404.html must not carry a canonical link');
  }

  // ------------------------------------------------------------------ 10. internal links reach a page, and a #fragment reaches an id
  // Every built page is read. The carried legacy pages and the redirect stubs get no allowance: after the cutover nothing of
  // theirs may point at a page or a section that the new build does not have. The built pages may link to a route another open PR
  // owns (the `pendingRoutes` of the Platform link guard, reported by verify); anything else missing is a failure.
  const strict = new Set([...carried, ...redirects.map((r) => r.url)]);
  const pending = new Set();
  for (const route of pendingRoutes.keys()) pending.add(route).add(`/es${route}`);
  const everyPage = walk(dist)
    .filter((f) => f.endsWith('.html') && !f.includes(`${sep}_astro${sep}`))
    .map((f) => ({ url: `/${relative(dist, f).split(sep).join('/')}`, html: read(f) }));
  for (const [group, pages, allow] of [
    ['carried or redirect', everyPage.filter((p) => strict.has(p.url) || strict.has(p.url.replace(/index\.html$/, ''))), new Set()],
    ['built', everyPage.filter((p) => !strict.has(p.url) && !strict.has(p.url.replace(/index\.html$/, ''))), pending],
  ]) {
    for (const problem of linkProblems({ dist, pages, pending: allow })) fail(`cutover: ${problem} (${group} page)`);
  }
}
