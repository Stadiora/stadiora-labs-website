// Internal-link guard: every link on a page that points at stadioralabs.com must reach a page that exists in the build, and a
// #fragment must match an id on that page. A link to a redirect stub with a fragment is a failure too: the meta refresh
// drops the fragment, so the visitor lands at the top of the new page (that is how the carried API footer broke).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fragmentTargets, scanTags } from './html-scan.mjs';

const hosts = new Set(['stadioralabs.com', 'www.stadioralabs.com']);
const decode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** The file in dist/ that answers a path the way GitHub Pages does: the file itself, a directory's index.html, or `path.html`. */
export function fileForPath(dist, path) {
  const exact = join(dist, path);
  const isFile = (f) => existsSync(f) && statSync(f).isFile();
  if (!path.endsWith('/') && isFile(exact)) return exact;
  for (const candidate of [join(exact, 'index.html'), `${exact}.html`]) if (isFile(candidate)) return candidate;
  return null;
}

/** Links of a page that stay on the site: `{ href, path, hash }`, with `path` resolved against the page URL. */
export function internalLinks(html, pageUrl) {
  const links = [];
  for (const { name, attrs } of scanTags(html)) {
    if ((name !== 'a' && name !== 'area') || attrs.href === undefined) continue;
    const href = attrs.href.trim();
    if (!href) continue;
    let url;
    try {
      url = new URL(href, `https://stadioralabs.com${pageUrl}`);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || !hosts.has(url.hostname)) continue;
    links.push({ href, path: decode(url.pathname), hash: decode(url.hash.slice(1)) });
  }
  return links;
}

/**
 * Problems for the given pages ({ url, html }) against dist/. `pending` is a set of paths that are owned by an open PR and
 * allowed to be missing for now (the Platform pages' /help/ link); a pending path never excuses a fragment.
 */
export function linkProblems({ dist, pages, pending = new Set() }) {
  const problems = [];
  const cache = new Map();
  const load = (file) => {
    if (!cache.has(file)) {
      const html = readFileSync(file, 'utf8');
      const tags = scanTags(html);
      const refresh = tags.some((t) => t.name === 'meta' && (t.attrs['http-equiv'] ?? '').toLowerCase() === 'refresh');
      cache.set(file, { refresh, ids: fragmentTargets(html) });
    }
    return cache.get(file);
  };
  for (const { url, html } of pages) {
    const seen = new Set();
    for (const { href, path, hash } of internalLinks(html, url)) {
      if (seen.has(href)) continue;
      seen.add(href);
      const file = fileForPath(dist, path);
      if (!file) {
        if (!pending.has(path) && !pending.has(`${path}/`)) problems.push(`${url} links to ${href}, but ${path} is not in the build`);
        continue;
      }
      if (!hash || hash === 'top') continue;
      if (!file.endsWith('.html')) continue;
      const target = load(file);
      if (target.refresh) problems.push(`${url} links to ${href}, but ${path} is a redirect stub and the redirect drops the #${hash} fragment; link to the new page's own section`);
      else if (!target.ids.has(hash)) problems.push(`${url} links to ${href}, but ${path} has no element with id "${hash}"`);
    }
  }
  return problems;
}
