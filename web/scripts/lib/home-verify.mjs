// Post-build checks for the Floodlight home page (DESIGN-4 sections 5 and 7): clip budgets, the clip trio
// (WebM + MP4 + poster), the video markup contract and broken media references. Called from verify-dist.mjs.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const CLIP_BUDGET_BYTES = 1.6 * 1024 * 1024; // DESIGN-4 M17: "<=1.6 MB each"
export const POSTER_BUDGET_BYTES = 120 * 1024;

// Every home clip is on this list because it has no words, numbers or logos baked into the pixels: text in a video cannot be
// localized, so every label sits in HTML from the i18n modules (src/components/home/PillarScenes.astro and friends). The hash is
// over the WebM, MP4 and poster, so a swapped or re-rendered clip fails until someone checks it for text and updates the entry.
export const TEXT_FREE_MEDIA = {
  'ai-bg': '82d7531a7c3b2dde',
  'coach-nutrition': '61fa56060b9823e7',
  'coach-powerlab': '26ce09d55020648f',
  'coach-programs': '7ac1bf4edae39701',
  'coach-readiness': '1a9a26ad89bf81c1',
  'engage-bg': '648bdbedf0a8614a',
  'night-stadium': '62013905b740b5c4',
  'pillar-nutrition': '3e372fae7c626474',
  'pillar-readiness': '261596e3e8107ed6',
  'pillar-team': '9c3f9fb26a6f5788',
  'pillar-training': 'a93585da715cf727',
  'reel': '0ef4adc15937f891',
  'tile-chalk': '9d7a8c4ae586e09a',
  'tile-hurdler': '11e02e70048b6aeb',
};

export function mediaDigest(dir, stem) {
  const h = createHash('sha256');
  for (const ext of ['webm', 'mp4', 'webp']) h.update(readFileSync(join(dir, `${stem}.${ext}`)));
  return h.digest('hex').slice(0, 16);
}

export function verifyHomeMedia({ dist, fail }) {
  const dir = join(dist, 'home', 'media');
  if (!existsSync(dir)) {
    fail('home/media: missing (the home clips are served from dist/home/media)');
    return;
  }
  const files = readdirSync(dir);
  const stems = new Set(files.map((f) => f.replace(/\.(webm|mp4|webp)$/, '')));
  for (const stem of stems) {
    for (const ext of ['webm', 'mp4', 'webp']) {
      if (!files.includes(`${stem}.${ext}`)) fail(`home/media/${stem}: missing ${ext} (every clip ships WebM, MP4 and a WebP poster)`);
    }
  }
  for (const stem of stems) {
    const want = TEXT_FREE_MEDIA[stem];
    if (!want) {
      fail(`home/media/${stem}: not on the text-free list. Baked-in text cannot be localized: render it without words, move the words to HTML overlays, then add it to TEXT_FREE_MEDIA in scripts/lib/home-verify.mjs`);
      continue;
    }
    if (!['webm', 'mp4', 'webp'].every((ext) => files.includes(`${stem}.${ext}`))) continue;
    const got = mediaDigest(dir, stem);
    if (got !== want) fail(`home/media/${stem}: content changed (${got}, listed ${want}). Check the frames for baked-in text, then update TEXT_FREE_MEDIA`);
  }
  for (const stem of Object.keys(TEXT_FREE_MEDIA)) if (!stems.has(stem)) fail(`home/media/${stem}: on the text-free list but not shipped (remove the stale entry)`);
  for (const f of files) {
    const size = statSync(join(dir, f)).size;
    if (/\.(webm|mp4)$/.test(f) && size > CLIP_BUDGET_BYTES) fail(`home/media/${f}: ${(size / 1024 / 1024).toFixed(2)} MB is over the 1.6 MB clip budget`);
    if (/\.webp$/.test(f) && size > POSTER_BUDGET_BYTES) fail(`home/media/${f}: poster ${(size / 1024).toFixed(0)} KB is over ${POSTER_BUDGET_BYTES / 1024} KB`);
    if (!/\.(webm|mp4|webp)$/.test(f)) fail(`home/media/${f}: unexpected file type`);
  }
}

// The markup every home <video> must follow, checked on the built HTML of one page.
export function verifyHomeVideos({ dist, html, file, fail }) {
  const videos = [...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].map((m) => m[0]);
  for (const v of videos) {
    const open = v.match(/<video\b[^>]*>/)[0];
    const name = (v.match(/data-clip(?:="([^"]*)")?/)?.[1] || v.match(/\/home\/media\/([\w-]+)\./)?.[1] || '?').slice(0, 30);
    const at = `${file}: <video ${name}>`;
    if (!/\sdata-clip(\s|=|>)/.test(open)) fail(`${at} has no data-clip (the motion kit starts clips from it)`);
    if (/\sautoplay(\s|=|>)/.test(open)) fail(`${at} has autoplay (clips start on visibility, never on load)`);
    for (const attr of ['muted', 'playsinline', 'loop']) if (!new RegExp(`\\s${attr}(\\s|=|>)`).test(open)) fail(`${at} is missing ${attr}`);
    if (!/\spreload="none"/.test(open)) fail(`${at} must be preload="none"`);
    if (!/\s(data-)?poster="[^"]+"/.test(open)) fail(`${at} has no poster or data-poster`);
    const sources = [...v.matchAll(/<source\b[^>]*>/g)].map((m) => m[0]);
    const types = sources.map((s) => s.match(/type="([^"]+)"/)?.[1]);
    if (types.join() !== 'video/webm,video/mp4') fail(`${at} sources must be WebM first, then MP4 (found ${types.join(', ') || 'none'})`);
  }
  for (const m of html.matchAll(/\/home\/(?:media|img)\/[^"'\s,)]+/g)) {
    if (!existsSync(join(dist, m[0]))) fail(`${file}: references ${m[0]}, which is not in dist`);
  }
  return videos.length;
}

// Claims the product cannot back (brief: truth rules). Checked on the visible text of one built home page.
const CLAIMS = [
  [/scheduled messages|mensajes programados/i, 'a "scheduled messages" feature (it does not exist)'],
  [/\bin range\b|\ben rango\b/i, 'an "in range" claim'],
  [/\b(all|every|any) (wearables?|watches|devices)\b|\btod(os los|as las) (wearables|relojes|dispositivos)\b/i, 'a blanket wearable claim (only Apple Health and Health Connect sync)'],
  [/(trusted by|used by|join|confían en|usado por|únete a)\s+\d[\d,.]*\+?\s/i, 'an invented customer count'],
  [/\bcase study\b|\bestudio de caso\b/i, 'a case study (none exist)'],
];

export function verifyHomeClaims({ html, file, fail }) {
  const text = html
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  for (const [re, what] of CLAIMS) {
    const m = text.match(re);
    if (m) fail(`${file}: makes ${what}: "…${text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30)}…"`);
  }
}

export function homeHtml(dist, file) {
  return readFileSync(join(dist, file), 'utf8');
}

// Class names are global. A selector declared in two of the home stylesheets lets the later one silently rewrite the
// first (`.cal-grid` once did, and the planner calendar lost its week-label column). Scope the rule under its section.
export function verifyHomeSelectors({ root, fail }) {
  const files = [join(root, 'src/styles/floodlight.css'), ...readdirSync(join(root, 'src/styles/home')).filter((f) => f.endsWith('.css')).map((f) => join(root, 'src/styles/home', f))];
  const owners = new Map();
  for (const file of files) {
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    let depth = 0;
    let head = '';
    for (const ch of css) {
      if (ch === '{') {
        if (depth === 0 && !head.trim().startsWith('@')) {
          for (const sel of head.split(',')) {
            const s = sel.replace(/\s+/g, ' ').trim();
            if (s) owners.set(s, new Set([...(owners.get(s) ?? []), relative(root, file)]));
          }
        }
        depth++;
        head = '';
      } else if (ch === '}') {
        depth--;
        head = '';
      } else if (depth === 0) head += ch;
    }
  }
  for (const [sel, set] of owners) if (set.size > 1) fail(`${sel} is declared in ${[...set].join(' and ')}: scope one under its section so the two cannot collide`);
}
