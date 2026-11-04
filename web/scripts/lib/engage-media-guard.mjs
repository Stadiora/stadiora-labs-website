// Media guard for the five Platform pages (messaging, guardian portal, teams, custom-branded apps, integrations): no words baked
// into any playable file, and the right clip in every slot. A clip with text in the picture cannot be translated, so every file a
// page can load must be on the text-free list, and every video must carry the same clip in each place the browser can read it
// from: the <video>'s own src (none allowed: it would override the sources), every <source> (WebM then MP4, nothing else), the
// poster, and what the browser actually plays (`currentSrc`).
// The same judge runs twice: on the built HTML here (verify-dist.mjs, through engage-verify.mjs) and on the live DOM in the
// browser (engage-motion-checks.mjs), so a script that swaps a source at runtime is caught as well as a markup edit.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEXT_FREE_MEDIA } from './home-verify.mjs';

// The text-free list is the home's (scripts/lib/home-verify.mjs): it holds a hash of every clip's WebM, MP4 and poster, and
// verifyHomeMedia fails a clip that is not listed or whose content changed. This guard adds what that cannot see: which clips an
// engage page actually loads, and that each slot plays the right one.

/** The clip each page's hero plays (null: the hero has no video). Every page closes with FINAL_CLIP. */
export const HERO_CLIP = {
  messaging: 'engage-bg',
  'guardian-portal': 'tile-hurdler',
  teams: 'night-stadium',
  'custom-branded-apps': null,
  integrations: null,
};
export const FINAL_CLIP = 'night-stadium';

const mediaFile = /^\/home\/media\/([\w-]+)\.(webm|mp4|webp)$/;
const sameType = { webm: 'video/webm', mp4: 'video/mp4' };
const stemOf = (url, ext) => {
  const m = String(url ?? '').split(/[?#]/)[0].match(mediaFile);
  return m && (!ext || m[2] === ext) ? m[1] : null;
};

/**
 * Judge one video. `v` is { ownSrc, sources: [{ src, type }], poster, currentSrc? } and `want` is the clip its slot must play.
 * Returns the list of problems (empty: fine). `exists(path)` is optional (the static run passes a dist lookup).
 */
export function judgeVideo(v, want, exists = null) {
  const out = [];
  if (v.ownSrc !== null && v.ownSrc !== undefined) out.push(`sets src="${v.ownSrc}" on the <video> element, which overrides its validated <source> children; use the paired WebM/MP4 <source> elements only`);
  const exts = v.sources.map((s) => String(s.src ?? '').split(/[?#]/)[0].split('.').pop());
  if (v.sources.length !== 2 || exts[0] !== 'webm' || exts[1] !== 'mp4') out.push(`needs exactly two sources, WebM then MP4 (found ${v.sources.map((s) => s.src).join(', ') || 'none'})`);
  for (const s of v.sources) {
    const ext = String(s.src ?? '').split(/[?#]/)[0].split('.').pop();
    const stem = stemOf(s.src);
    if (!stem) out.push(`source ${s.src} is not under /home/media`);
    else if (!(stem in TEXT_FREE_MEDIA)) out.push(`source ${s.src} is not declared text-free`);
    else if (stem !== want) out.push(`source ${s.src} is the wrong clip for this slot (want ${want})`);
    if (sameType[ext] && s.type !== sameType[ext]) out.push(`${ext} source declares type "${s.type}" (want ${sameType[ext]})`);
    if (exists && s.src && !exists(s.src)) out.push(`source ${s.src} is not in dist`);
  }
  const poster = stemOf(v.poster, 'webp');
  if (!poster) out.push(`has no .webp poster under /home/media (found ${v.poster || 'none'})`);
  else if (!(poster in TEXT_FREE_MEDIA)) out.push(`poster ${v.poster} is not declared text-free`);
  else if (poster !== want) out.push(`poster ${v.poster} is the wrong clip for this slot (want ${want})`);
  else if (exists && !exists(v.poster)) out.push(`poster ${v.poster} is not in dist`);
  if (v.currentSrc) {
    const path = (() => {
      try {
        return new URL(v.currentSrc).pathname;
      } catch {
        return v.currentSrc;
      }
    })();
    const stem = stemOf(path);
    if (!stem || !(stem in TEXT_FREE_MEDIA) || stem !== want) out.push(`plays ${path}, not the ${want} clip`);
  }
  return out;
}

const sectionOpen = /<(?:section|footer)\b[^>]*\bclass="([^"]*)"[^>]*>/g;
const hasClass = (classes, name) => classes.split(/\s+/).includes(name);
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** Every <video> of the built page with the files it can load and the slot it sits in (hero, final or stage). */
export function readVideos(html) {
  const sections = [...html.matchAll(sectionOpen)].map((m) => ({ classes: m[1], at: m.index }));
  return [...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].map((m) => {
    const open = m[0].match(/<video\b[^>]*>/)[0];
    const owner = sections.filter((s) => s.at < m.index).pop();
    const kind = !owner ? 'none' : hasClass(owner.classes, 'eg-hero') ? 'hero' : hasClass(owner.classes, 'final') ? 'final' : 'stage';
    return {
      kind,
      // A deferred clip names its poster in data-poster until it is near the screen.
      poster: attr(open, 'poster') ?? attr(open, 'data-poster'),
      ownSrc: attr(open, 'src') ?? null,
      sources: [...m[0].matchAll(/<source\b[^>]*>/g)].map((s) => ({ src: attr(s[0], 'src'), type: attr(s[0], 'type') })),
    };
  });
}

export function verifyEngageMedia({ html, file, slug, dist, fail }) {
  // 1. Anything under /home/media the page names, however it is loaded, must be a declared text-free clip.
  for (const [ref, stem] of new Set([...html.matchAll(/\/home\/media\/([\w-]+)\.(?:webm|mp4|webp)\b/g)].map((m) => [m[0], m[1]]))) {
    if (!(stem in TEXT_FREE_MEDIA)) fail(`${file}: loads ${ref}, which is not declared text-free (words baked into a clip cannot be translated; overlay words must be HTML, EN and ES)`);
  }

  // 2. Every video, judged in full, and in the slot it sits in.
  const videos = readVideos(html);
  const wanted = { hero: HERO_CLIP[slug], final: FINAL_CLIP };
  const exists = (p) => existsSync(join(dist, p));
  for (const v of videos) {
    const want = wanted[v.kind];
    if (!want) {
      fail(`${file}: a ${v.kind} video is not expected on this page`);
      continue;
    }
    for (const problem of judgeVideo(v, want, exists)) fail(`${file}: ${v.kind} video ${problem}`);
  }
  const count = (kind) => videos.filter((v) => v.kind === kind).length;
  if (count('hero') !== (HERO_CLIP[slug] ? 1 : 0)) fail(`${file}: the hero needs ${HERO_CLIP[slug] ? `one ${HERO_CLIP[slug]} video` : 'no video'} (found ${count('hero')})`);
  if (count('final') !== 1) fail(`${file}: needs exactly one closing video (found ${count('final')})`);
}
