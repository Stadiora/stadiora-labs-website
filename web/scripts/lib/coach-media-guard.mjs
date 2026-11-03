// Media guard for the Platform "Coach" pages: no words baked into any playable file, and the right clip in every slot.
// A clip with text in the picture cannot be translated, so every file a page can load must be on the text-free list,
// and every video must carry the same clip in all three of its files (WebM, MP4 and poster). The MP4 is the fallback
// Safari and older browsers play, so it is held to the same rule as the WebM.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEXT_FREE_MEDIA } from './home-verify.mjs';

// The text-free list is the home's (scripts/lib/home-verify.mjs): it holds a hash of every clip's WebM, MP4 and poster, and
// verifyHomeMedia fails a clip that is not listed or whose content changed. This guard adds what that cannot see: which
// clips a coach page actually loads, and that each slot plays the right one.

const heroClip = (slug) => `coach-${slug.replace('-', '')}`; // power-lab renders as coach-powerlab

// Every other clip a page plays, one entry per <video> (the AI program stage and the accordion backdrops).
const stageClips = {
  programs: ['ai-bg', 'ai-bg'],
  nutrition: [],
  readiness: ['ai-bg'],
  'power-lab': [],
};

const sectionOpen = /<(?:section|footer)\b[^>]*\bclass="([^"]*)"[^>]*>/g;
const hasClass = (classes, name) => classes.split(/\s+/).includes(name);
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const mediaFile = /\/home\/media\/([\w-]+)\.(webm|mp4|webp)\b/;

/** Every <video> on the page with the files it can load and the kind of section it sits in. */
export function readVideos(html) {
  const sections = [...html.matchAll(sectionOpen)].map((m) => ({ classes: m[1], at: m.index }));
  return [...html.matchAll(/<video\b[\s\S]*?<\/video>/g)].map((m) => {
    const open = m[0].match(/<video\b[^>]*>/)[0];
    const owner = sections.filter((s) => s.at < m.index).pop();
    const kind = !owner ? 'none' : hasClass(owner.classes, 'cf-hero') ? 'hero' : hasClass(owner.classes, 'final') ? 'final' : 'stage';
    return {
      kind,
      // The hero names its poster outright; the clips further down defer it (data-poster) until they are near the screen.
      poster: attr(open, 'poster') ?? attr(open, 'data-poster'),
      sources: [...m[0].matchAll(/<source\b[^>]*>/g)].map((s) => ({ src: attr(s[0], 'src'), type: attr(s[0], 'type') })),
    };
  });
}

const sameType = { webm: 'video/webm', mp4: 'video/mp4' };

export function verifyCoachMedia({ html, file, slug, dist, fail }) {
  // 1. Anything under /home/media the page names, however it is loaded, must be a declared text-free clip.
  for (const [ref, stem] of new Set([...html.matchAll(new RegExp(mediaFile, 'g'))].map((m) => [m[0], m[1]]))) {
    if (!(stem in TEXT_FREE_MEDIA)) fail(`${file}: loads ${ref}, which is not declared text-free (words baked into a clip cannot be translated; overlay words must be HTML, EN and ES)`);
  }

  // 2. Every video: WebM, MP4 and poster exist, say what they claim, and are one and the same clip.
  const videos = readVideos(html);
  for (const v of videos) {
    const stems = new Set();
    const note = (what) => fail(`${file}: ${v.kind} video ${what}`);
    for (const ext of ['webm', 'mp4']) {
      const list = v.sources.filter((s) => s.src?.endsWith(`.${ext}`));
      if (list.length !== 1) {
        note(`needs exactly one .${ext} source (found ${list.length})`);
        continue;
      }
      const m = list[0].src.match(mediaFile);
      if (!m) note(`.${ext} source ${list[0].src} is not under /home/media`);
      else stems.add(m[1]);
      if (list[0].type !== sameType[ext]) note(`.${ext} source declares type "${list[0].type}" (want ${sameType[ext]})`);
      if (list[0].src && !existsSync(join(dist, list[0].src))) note(`.${ext} source ${list[0].src} is not in dist`);
    }
    const stray = v.sources.filter((s) => !/\.(webm|mp4)$/.test(s.src ?? ''));
    if (stray.length) note(`has a source that is neither WebM nor MP4: ${stray.map((s) => s.src).join(', ')}`);
    const poster = v.poster?.match(mediaFile);
    if (!poster || poster[2] !== 'webp') note(`has no .webp poster (found ${v.poster ?? 'none'})`);
    else {
      stems.add(poster[1]);
      if (!existsSync(join(dist, v.poster))) note(`poster ${v.poster} is not in dist`);
    }
    if (stems.size > 1) note(`mixes clips: WebM, MP4 and poster must be one clip (found ${[...stems].join(' + ')})`);
    v.clip = stems.size === 1 ? [...stems][0] : null;
  }

  // 3. The expected clip in each slot: this page's own hero, the shared stage clips, the closing night-stadium.
  const of = (kind) => videos.filter((v) => v.kind === kind);
  const want = heroClip(slug);
  const hero = of('hero');
  if (hero.length !== 1) fail(`${file}: needs exactly one hero video (found ${hero.length})`);
  else if (hero[0].clip !== want) fail(`${file}: the hero must play ${want} in WebM, MP4 and poster (found ${hero[0].clip ?? 'a mix of clips'})`);
  const final = of('final');
  if (final.length !== 1) fail(`${file}: needs exactly one closing video (found ${final.length})`);
  else if (final[0].clip !== 'night-stadium') fail(`${file}: the closing band must play night-stadium in WebM, MP4 and poster (found ${final[0].clip ?? 'a mix of clips'})`);
  const stages = of('stage').map((v) => v.clip ?? '?').sort();
  const expected = [...stageClips[slug]].sort();
  if (stages.join() !== expected.join()) fail(`${file}: stage videos are [${stages.join(', ')}], expected [${expected.join(', ')}]`);
  if (of('none').length) fail(`${file}: a video sits outside every section`);
}
