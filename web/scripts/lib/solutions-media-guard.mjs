// Media guard for the Solutions, Resources and company pages: no words baked into any file a <video> can load, and the
// right clip in every slot. A clip with text in the picture cannot be translated, so the WebM, the MP4 and the poster of
// every <video> are each checked on their own against the text-free list and against the clip the slot is meant to play.
// The MP4 is what Safari and older browsers play and the poster is what reduced motion shows, so neither is held to a lower
// standard than the WebM. A `src` on the <video> element itself would win over the validated <source> children, so it is refused.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEXT_FREE_MEDIA } from './home-verify.mjs';

// Clips that carry no words. A clip is added here only after someone has watched it end to end; the pillar-* clips have
// their titles baked into the picture, so a page that uses one cannot translate it. Clips under /home/media must also be
// on the home's hashed list (TEXT_FREE_MEDIA), which verifyHomeMedia checks byte for byte.
export const TEXT_FREE_CLIPS = new Set(['night-stadium', 'ai-bg', 'engage-bg', 'tile-chalk', 'tile-hurdler', 'reel', 'sx-coaches']);

// The clip each kind of slot plays on each page, one entry per <video> in that slot. Slots: the hero section, a stage
// section beyond it, and the final CTA band.
const NIGHT = ['night-stadium'];
export const SLOT_CLIPS = {
  '/solutions/schools/': { hero: [], stage: [], final: NIGHT },
  '/solutions/coaches/': { hero: ['sx-coaches'], stage: [], final: NIGHT },
  '/solutions/teams-and-clubs/': { hero: [], stage: ['engage-bg'], final: NIGHT },
  '/solutions/athletes/': { hero: [], stage: [], final: NIGHT },
  '/resources/case-studies/': { hero: [], stage: [], final: NIGHT },
  '/about/': { hero: [], stage: [], final: NIGHT },
  '/contact/': { hero: [], stage: [], final: NIGHT },
};

const mediaRef = /^\/(home|solutions)\/media\/([\w-]+)\.(webm|mp4|webp)$/;
const sameType = { webm: 'video/webm', mp4: 'video/mp4' };

// Attributes of one opening tag, lower-cased. The first occurrence of a name wins, as in the browser.
export function attrsOf(tag) {
  const out = new Map();
  for (const m of tag.matchAll(/\s([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!out.has(name)) out.set(name, m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

const hasClass = (classes, name) => classes.split(/\s+/).includes(name);

/** Every <video> on the page: its attributes, every <source> child and the kind of section it sits in. */
export function readVideos(html) {
  const sections = [...html.matchAll(/<section\b[^>]*\bclass="([^"]*)"[^>]*>/g)].map((m) => ({ classes: m[1], at: m.index }));
  return [...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].map((m) => {
    const open = m[0].match(/<video\b[^>]*>/)[0];
    const owner = sections.filter((s) => s.at < m.index).pop();
    return {
      kind: !owner ? 'none' : hasClass(owner.classes, 'sx-hero') ? 'hero' : hasClass(owner.classes, 'sx-final') ? 'final' : 'stage',
      attrs: attrsOf(open),
      sources: [...m[0].matchAll(/<source\b[^>]*>/g)].map((s) => attrsOf(s[0])),
    };
  });
}

export function verifySolutionsMedia({ html, file, path, dist, fail }) {
  const videos = readVideos(html);

  // 1. Anything under /home/media or /solutions/media the page names, however it is loaded, must be a text-free clip.
  for (const ref of new Set([...html.matchAll(/\/(?:home|solutions)\/media\/[\w-]+\.\w+/g)].map((x) => x[0]))) {
    const parts = mediaRef.exec(ref);
    if (!parts) fail(`${file}: references ${ref}, which is not a webm, mp4 or webp under /home/media or /solutions/media`);
    else if (!allowed(parts[1], parts[2])) fail(`${file}: loads ${ref}, which is not declared text-free (words baked into a clip cannot be translated; overlay words must be HTML, EN and ES)`);
  }

  // 2. Every video: each file on its own, then the three together.
  for (const v of videos) {
    const stems = [];
    const note = (what) => fail(`${file}: ${v.kind} video ${what}`);
    if (v.attrs.has('src')) note(`sets src="${v.attrs.get('src')}" on the <video> element, which overrides its validated <source> children; use the paired WebM/MP4 <source> elements only`);

    const file1 = (role, ext, url) => {
      const parts = url ? mediaRef.exec(url) : null;
      if (!parts) return note(`${role} ${url ?? '(none)'} is not a ${ext} under /home/media or /solutions/media`);
      if (parts[3] !== ext) return note(`${role} ${url} must be .${ext}`);
      if (!allowed(parts[1], parts[2])) note(`${role} ${url} is not on the text-free clip list (words belong in HTML, never in a clip)`);
      if (!existsSync(join(dist, url))) note(`${role} ${url} is not in dist`);
      stems.push({ role, stem: parts[2] });
    };

    for (const ext of ['webm', 'mp4']) {
      const list = v.sources.filter((s) => (s.get('src') ?? '').endsWith(`.${ext}`));
      if (list.length !== 1) {
        note(`needs exactly one .${ext} source (found ${list.length})`);
        continue;
      }
      if (list[0].get('type') !== sameType[ext]) note(`.${ext} source declares type "${list[0].get('type')}" (want ${sameType[ext]})`);
      file1(`.${ext} source`, ext, list[0].get('src'));
    }
    const stray = v.sources.filter((s) => !/\.(webm|mp4)$/.test(s.get('src') ?? ''));
    if (stray.length) note(`has a source that is neither WebM nor MP4: ${stray.map((s) => s.get('src') ?? '(no src)').join(', ')}`);

    // The hero names its poster outright; the clips further down defer it (data-poster) until they are near the screen.
    const posters = ['poster', 'data-poster'].filter((n) => v.attrs.has(n));
    if (!posters.length) note('has no poster');
    for (const n of posters) file1(n === 'poster' ? 'poster' : 'data-poster', 'webp', v.attrs.get(n));

    v.clip = new Set(stems.map((s) => s.stem)).size === 1 && stems.length === 3 ? stems[0].stem : null;
    if (stems.length === 3 && !v.clip) note(`mixes clips: WebM, MP4 and poster must be one clip (found ${stems.map((s) => `${s.role} ${s.stem}`).join(', ')})`);
    v.stems = stems;
  }

  // 3. The expected clip in each slot, checked against every file of every video in it.
  const slots = SLOT_CLIPS[path];
  if (!slots) return fail(`${file}: no expected clips are declared for ${path} in solutions-media-guard.mjs`);
  for (const kind of ['hero', 'stage', 'final']) {
    const here = videos.filter((v) => v.kind === kind);
    const want = slots[kind];
    if (here.length !== want.length) {
      fail(`${file}: the ${kind} slot has ${here.length} video${here.length === 1 ? '' : 's'}, expected ${want.length}${want.length ? ` (${want.join(', ')})` : ''}`);
      continue;
    }
    for (const v of here) for (const s of v.stems) if (!want.includes(s.stem)) fail(`${file}: the ${kind} video must play ${want.join(' / ')}, but its ${s.role} is ${s.stem}`);
    const got = here.map((v) => v.clip ?? '?').sort().join();
    if (got !== [...want].sort().join()) fail(`${file}: the ${kind} slot plays [${got}], expected [${want.join(', ')}]`);
  }
  if (videos.some((v) => v.kind === 'none')) fail(`${file}: a video sits outside every section`);
}

function allowed(dir, stem) {
  if (!TEXT_FREE_CLIPS.has(stem) || /^pillar-/.test(stem)) return false;
  return dir === 'home' ? stem in TEXT_FREE_MEDIA : stem.startsWith('sx-');
}
