// A small HTML tag scanner for the build guards. It walks the markup the way a browser tokenizes it, so what it returns is
// what is ACTIVE on the page: tags inside comments, <script>, <style>, <textarea>, <title> and <noscript> (with scripting
// enabled) are skipped, not matched.
// (The guards used to match raw text, so `<!-- <meta name="robots" content="noindex"> -->` passed as a noindex tag.)
// No regular expression strips anything here; every skip is an explicit index search.

const rawText = new Set(['script', 'style', 'textarea', 'title', 'noscript', 'xmp', 'iframe', 'noembed']);
const space = (c) => c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === '\f';
const letter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');

const decodeAttr = (v) =>
  v
    .split('&quot;').join('"')
    .split('&#39;').join("'")
    .split('&lt;').join('<')
    .split('&gt;').join('>')
    .split('&amp;').join('&');

/** Every start tag outside comments and raw-text elements; raw-text tags also carry contentStart/contentEnd offsets. */
export function scanTags(html) {
  const tags = [];
  const lower = html.toLowerCase();
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    const next = html[lt + 1] ?? '';
    if (next === '!' || next === '?' || next === '/') {
      // A doctype or other declaration, a processing instruction or an end tag: skip to its '>'.
      const end = html.indexOf('>', lt + 1);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    if (!letter(next)) {
      // A literal '<' in text (as in "Response < 5 ms"): it opens nothing, so step past it alone and keep scanning.
      // Skipping to the next '>' here would swallow the following real tag.
      i = lt + 1;
      continue;
    }
    let p = lt + 1;
    while (p < html.length && !space(html[p]) && html[p] !== '>' && html[p] !== '/') p++;
    const name = lower.slice(lt + 1, p);
    const attrs = {};
    for (;;) {
      while (p < html.length && (space(html[p]) || html[p] === '/')) p++;
      if (p >= html.length || html[p] === '>') break;
      const start = p;
      while (p < html.length && !space(html[p]) && html[p] !== '=' && html[p] !== '>' && html[p] !== '/') p++;
      const key = lower.slice(start, p);
      while (p < html.length && space(html[p])) p++;
      let value = '';
      if (html[p] === '=') {
        p++;
        while (p < html.length && space(html[p])) p++;
        const quote = html[p];
        if (quote === '"' || quote === "'") {
          const end = html.indexOf(quote, p + 1);
          value = html.slice(p + 1, end === -1 ? html.length : end);
          p = end === -1 ? html.length : end + 1;
        } else {
          const from = p;
          while (p < html.length && !space(html[p]) && html[p] !== '>') p++;
          value = html.slice(from, p);
        }
      }
      if (key && !(key in attrs)) attrs[key] = decodeAttr(value);
    }
    const tag = { name, attrs };
    tags.push(tag);
    i = p + 1;
    if (rawText.has(name)) {
      const end = lower.indexOf(`</${name}`, i);
      tag.contentStart = i;
      tag.contentEnd = end === -1 ? html.length : end;
      i = end === -1 ? html.length : end;
    }
  }
  return tags;
}

/** The content of every active `<meta name="robots">`, lower-cased. */
export const robotsDirectives = (html) =>
  scanTags(html)
    .filter((t) => t.name === 'meta' && (t.attrs.name ?? '').toLowerCase() === 'robots')
    .map((t) => (t.attrs.content ?? '').toLowerCase());

/** True when an active robots meta tag carries `noindex`. */
export const isNoindex = (html) => robotsDirectives(html).some((content) => content.split(',').some((d) => d.trim() === 'noindex'));

/** The element ids a fragment can land on: `id` on any element and `name` on an anchor. */
export const fragmentTargets = (html) => {
  const ids = new Set();
  for (const { name, attrs } of scanTags(html)) {
    if (attrs.id) ids.add(attrs.id);
    if (name === 'a' && attrs.name) ids.add(attrs.name);
  }
  return ids;
};
