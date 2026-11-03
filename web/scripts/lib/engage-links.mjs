// Link guard for the Platform pages. Every internal href on the ten pages (header and footer included) must
// resolve to a page that is built into dist/, a legacy page that exists at the repo root (it ships unchanged at
// cutover), an element id on the same or the target page, or a route in `pendingRoutes`.
//
// `pendingRoutes` is the explicit list of routes that other open PRs own. They are not in this branch's dist/,
// so they are reported as "pending" in the verify output instead of passing silently, and a typo of one of them
// (say /solutions/schoools/) still fails. When one of those PRs merges and the page is built, the entry turns
// into a normal pass and can be deleted.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

const pr28 = 'PR #28 (pricing)';
const pr30 = 'PR #30 (solutions, about, contact, case studies)';
const pr31 = 'PR #31 (platform coach pages)';
const unowned = 'no open PR (linked by the foundation nav and footer, status "planned" in data/site.ts)';

export const pendingRoutes = new Map([
  ['/pricing/', pr28],
  ['/solutions/coaches/', pr30],
  ['/solutions/teams-and-clubs/', pr30],
  ['/solutions/schools/', pr30],
  ['/solutions/athletes/', pr30],
  ['/about/', pr30],
  ['/contact/', pr30],
  ['/resources/case-studies/', pr30],
  ['/platform/programs/', pr31],
  ['/platform/nutrition/', pr31],
  ['/platform/readiness/', pr31],
  ['/platform/power-lab/', pr31],
  ['/help/', unowned],
]);

const contactTopics = new Set(['demo', 'question']);
const unescape = (s) => s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const withoutLocale = (path) => path.replace(/^\/es(?=\/)/, '') || '/';

const builtPage = (dist, path) => {
  const candidates = path.endsWith('/') ? [join(dist, path, 'index.html')] : [join(dist, path), join(dist, path, 'index.html'), join(dist, `${path}.html`)];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
};

/** Checks one built page. `pending` collects route -> { owner, pages } for the verify summary. */
export function checkLinks({ dist, page, html, fail, pending }) {
  const hrefs = [...html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)].map((m) => unescape(m[1]));
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  for (const href of new Set(hrefs)) {
    if (/^(https?:|mailto:|tel:)/i.test(href)) continue;

    if (href.startsWith('#')) {
      if (href.length > 1 && !ids.has(href.slice(1))) fail(`${page.file}: link ${href} points at an id that is not on the page`);
      continue;
    }
    if (!href.startsWith('/')) {
      fail(`${page.file}: link "${href}" is not absolute; use a root-relative path`);
      continue;
    }

    const url = new URL(href, 'https://stadioralabs.com');
    const path = url.pathname;

    // A page in one language must link to the same language, except for the language switch itself.
    const isFile = /\.[a-z0-9]+$/i.test(path);
    if (!isFile && href !== page.alt) {
      const spanish = path === '/es' || path.startsWith('/es/');
      if (page.lang === 'es' && !spanish) fail(`${page.file}: Spanish page links to the English route ${href}`);
      if (page.lang === 'en' && spanish) fail(`${page.file}: English page links to the Spanish route ${href}`);
    }

    const route = withoutLocale(path);
    if (route === '/contact/' && !contactTopics.has(url.searchParams.get('topic') ?? '')) {
      fail(`${page.file}: link ${href} goes to the contact page without ?topic=demo or ?topic=question`);
    }

    const target = builtPage(dist, path);
    if (target) {
      if (url.hash.length > 1) {
        const targetIds = new Set([...readFileSync(target, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
        if (!targetIds.has(url.hash.slice(1))) fail(`${page.file}: link ${href} points at an id that is not on ${path}`);
      }
      continue;
    }

    // Legacy standalone pages (api.html, connect.html, ...) are served unchanged from the repo root at cutover.
    if (isFile && existsSync(join(repoRoot, path))) continue;

    const owner = pendingRoutes.get(route);
    if (owner) {
      const entry = pending.get(route) ?? { owner, pages: new Set() };
      entry.pages.add(page.file);
      pending.set(route, entry);
      continue;
    }

    fail(`${page.file}: link ${href} does not resolve to a built page, a legacy page or a documented cross-lane route (scripts/lib/engage-links.mjs)`);
  }
}

/** One line per pending route for the verify output. */
export function pendingReport(pending) {
  return [...pending.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, { owner, pages }]) => `  pending ${route} (+ /es${route}): owned by ${owner}; linked from ${pages.size} Platform pages`);
}
