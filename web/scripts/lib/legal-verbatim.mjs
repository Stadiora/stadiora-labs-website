// Proves the Privacy and Terms text is verbatim. The built pages (dist/privacy.html, dist/terms.html) are compared part by
// part with the frozen legacy pages (scripts/fixtures/legacy-*.html, byte-copies of the pages that were in web/public), on
// whitespace-normalised text. Offline: no browser, no network. A tag-balanced reader of both files, no HTML parser needed.
// Runs from verify-dist.mjs. Every failure message starts with a stable assertion id, which the mutation battery reports.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtures = fileURLToPath(new URL('../fixtures/', import.meta.url));

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', mdash: '—', ndash: '–', rarr: '→', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    if (!(e in NAMED)) throw new Error(`unknown entity ${m}`);
    return NAMED[e];
  });

/** A small DOM: `{ name, attrs, kids }` elements and `{ text }` nodes. Comments are dropped, script and style are skipped. */
export function parseHtml(html) {
  const root = { name: '#root', attrs: {}, kids: [] };
  const stack = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    const textEnd = lt === -1 ? html.length : lt;
    if (textEnd > i) top().kids.push({ text: decode(html.slice(i, textEnd)) });
    if (lt === -1) break;
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    const next = html[lt + 1] ?? '';
    if (next === '!' || next === '?') {
      i = html.indexOf('>', lt) + 1 || html.length;
      continue;
    }
    if (next === '/') {
      const end = html.indexOf('>', lt);
      const name = html.slice(lt + 2, end).trim().toLowerCase();
      let k = stack.length - 1;
      while (k > 0 && stack[k].name !== name) k--;
      if (k > 0) stack.length = k;
      i = end + 1;
      continue;
    }
    if (!/[a-z]/i.test(next)) {
      top().kids.push({ text: '<' });
      i = lt + 1;
      continue;
    }
    // A start tag: read to the closing '>', honouring quoted attribute values.
    let p = lt + 1;
    let quote = '';
    while (p < html.length) {
      const c = html[p];
      if (quote) {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '>') break;
      p++;
    }
    const raw = html.slice(lt + 1, p);
    const name = raw.match(/^[^\s/>]+/)[0].toLowerCase();
    const attrs = {};
    for (const m of raw.slice(name.length).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
    }
    const el = { name, attrs, kids: [] };
    top().kids.push(el);
    i = p + 1;
    if (RAW.has(name)) {
      const end = html.toLowerCase().indexOf(`</${name}`, i);
      i = end === -1 ? html.length : html.indexOf('>', end) + 1;
    } else if (!VOID.has(name) && !raw.endsWith('/')) stack.push(el);
  }
  return root;
}

const classes = (el) => (el.attrs.class ?? '').split(/\s+/).filter(Boolean);
export function find(node, test, out = []) {
  for (const k of node.kids ?? []) {
    if (k.name) {
      if (test(k)) out.push(k);
      find(k, test, out);
    }
  }
  return out;
}
export const textOf = (node) => (node.text !== undefined ? node.text : (node.kids ?? []).map(textOf).join(''));
const N = (s) => s.replace(/\s+/g, ' ').trim();
const hasClass = (c) => (el) => classes(el).includes(c);
const one = (nodes, what) => {
  if (nodes.length < 1) throw new Error(`${what} not found`);
  return nodes[0];
};

/** The parts of a legacy page (original selectors). */
export function readLegacy(html) {
  const dom = parseHtml(html);
  const hero = one(find(dom, (e) => e.attrs.id === 'hero'), '#hero');
  const notice = one(find(hero, (e) => hasClass('health-notice')(e) || hasClass('medical-notice')(e)), 'the medical notice');
  const content = one(find(dom, hasClass('doc-content')), '.doc-content');
  return {
    title: textOf(one(find(dom, hasClass('doc-title')), '.doc-title')),
    eyebrow: textOf(one(find(dom, hasClass('doc-eyebrow')), '.doc-eyebrow')),
    meta: find(dom, hasClass('doc-meta-item')).map(textOf),
    notice: textOf(notice),
    toc: find(one(find(dom, hasClass('toc-links')), '.toc-links'), (e) => e.name === 'a').map(textOf),
    content: textOf(content),
    links: [...find(content, (e) => e.name === 'a'), ...find(notice, (e) => e.name === 'a')].map((a) => a.attrs.href),
    ids: find(dom, (e) => /^s\d+$/.test(e.attrs.id ?? '')).map((e) => e.attrs.id),
  };
}

/** The same parts of a built page (data-v hooks); the runtime-only `.anchor` chrome is excluded. */
export function readBuilt(html) {
  const dom = parseHtml(html);
  const v = (name) => one(find(dom, (e) => e.attrs['data-v'] === name), `[data-v=${name}]`);
  const notice = v('notice');
  const content = v('content');
  return {
    title: textOf(v('title')),
    eyebrow: textOf(v('eyebrow')),
    meta: find(v('meta'), (e) => e.name === 'li').map(textOf),
    notice: textOf(notice),
    toc: find(v('toc'), (e) => e.attrs['data-toc']).map((a) => `${textOf(one(find(a, hasClass('tn')), '.tn'))}. ${textOf(one(find(a, hasClass('tt')), '.tt'))}`),
    content: textOf(content),
    links: [...find(content, (e) => e.name === 'a' && !classes(e).includes('anchor')), ...find(notice, (e) => e.name === 'a')].map((a) => a.attrs.href),
    ids: find(dom, (e) => /^s\d+$/.test(e.attrs.id ?? '')).map((e) => e.attrs.id),
  };
}

const firstDiff = (a, z) => {
  let i = 0;
  while (i < a.length && a[i] === z[i]) i++;
  return `first difference at character ${i}: legacy «${a.slice(Math.max(0, i - 30), i + 50)}» built «${z.slice(Math.max(0, i - 30), i + 50)}»`;
};

// Floors that stop a reader failure from passing as "both sides empty".
const EXPECT = { privacy: { sections: 14, words: 1500 }, terms: { sections: 17, words: 2500 } };

/** Compares one document. `check(id, pass, detail)` records every assertion; ids are stable (the mutation battery reports them). */
export function compareLegal(doc, legacyHtml, builtHtml, check) {
  let src;
  let out;
  try {
    src = readLegacy(legacyHtml);
    out = readBuilt(builtHtml);
  } catch (error) {
    check(`legal.verbatim.read`, false, `${doc}: ${error.message}`);
    return;
  }
  const words = N(src.content).split(' ').length;
  check('legal.verbatim.baseline', words >= EXPECT[doc].words && src.ids.length === EXPECT[doc].sections, `${doc}: the legacy baseline has ${words} words and ${src.ids.length} sections`);
  for (const key of ['title', 'eyebrow', 'notice', 'content']) {
    const a = N(src[key]);
    const z = N(out[key]);
    check(`legal.verbatim.${key}`, a.length > 0 && a === z, `${doc} ${key}: ${a === z ? '' : firstDiff(a, z)}`);
  }
  for (const key of ['meta', 'toc']) {
    const a = src[key].map(N);
    const z = out[key].map(N);
    check(`legal.verbatim.${key}`, a.length > 0 && JSON.stringify(a) === JSON.stringify(z), `${doc} ${key}: ${firstDiff(JSON.stringify(a), JSON.stringify(z))}`);
  }
  const la = JSON.stringify([...src.links].sort());
  const lz = JSON.stringify([...out.links].sort());
  check('legal.verbatim.links', la === lz, `${doc} links: ${firstDiff(la, lz)}`);
  // Old deep links (#s1 … #sN) keep working: every legacy section id exists in the built page.
  check('legal.verbatim.ids', JSON.stringify(src.ids) === JSON.stringify(out.ids), `${doc} section ids: legacy ${src.ids.join(',')} built ${out.ids.join(',')}`);
}

export function verifyLegalVerbatim({ dist, fail }) {
  for (const doc of ['privacy', 'terms']) {
    const legacy = join(fixtures, `legacy-${doc}.html`);
    const built = join(dist, `${doc}.html`);
    if (!existsSync(legacy) || !existsSync(built)) {
      fail(`legal.verbatim.files: ${!existsSync(legacy) ? legacy : built} is missing`);
      continue;
    }
    compareLegal(doc, readFileSync(legacy, 'utf8'), readFileSync(built, 'utf8'), (id, pass, detail) => {
      if (!pass) fail(`${id}: ${detail}`);
    });
  }
}
