// Post-build checks for the Floodlight restyle of the Solutions, Resources and company pages (EN and ES).
// Called from verify-dist.mjs after verify-solutions.mjs, which keeps the content, SEO and honesty checks.
// Everything here is about the shared Floodlight anatomy (DESIGN-4 section 6) and the motion contract:
//   - every page has the mesh-and-orbits hero, an impact stage beyond it, and the night-stadium final;
//   - clips follow the clip markup, stay inside the budget and never carry baked-in words;
//   - the swap line reads as one sentence to a screen reader;
//   - decoration is hidden from assistive tech, and the contact burst can never carry a message.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TEXT_FREE_CLIPS, verifySolutionsMedia } from './solutions-media-guard.mjs';

const routes = [
  { name: 'schools', path: '/solutions/schools/', swap: true, stage: true },
  { name: 'coaches', path: '/solutions/coaches/', swap: true, stage: true },
  { name: 'clubs', path: '/solutions/teams-and-clubs/', stage: true },
  { name: 'athletes', path: '/solutions/athletes/', stage: true },
  // the case-studies list lives on the dark hero itself
  { name: 'case studies', path: '/resources/case-studies/', stage: false },
  { name: 'about', path: '/about/', stage: true },
  { name: 'contact', path: '/contact/', stage: true },
];

const CLIP_BUDGET_BYTES = 1.6 * 1024 * 1024;
const POSTER_BUDGET_BYTES = 120 * 1024;

const decode = (s) => s.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
const textOf = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

export function verifySolutionsFloodlight({ dist, fail }) {
  // ---- the lane's own clips (public/solutions/media): WebM, MP4 and a WebP poster each, inside the budget
  const mediaDir = join(dist, 'solutions', 'media');
  if (!existsSync(mediaDir)) fail('solutions/media: missing (the lane clips are served from dist/solutions/media)');
  else {
    const files = readdirSync(mediaDir);
    for (const stem of new Set(files.map((f) => f.replace(/\.(webm|mp4|webp)$/, '')))) {
      if (!stem.startsWith('sx-')) fail(`solutions/media/${stem}: lane clips are named sx-*`);
      if (!TEXT_FREE_CLIPS.has(stem)) fail(`solutions/media/${stem}: not on the text-free list in solutions-media-guard.mjs`);
      for (const ext of ['webm', 'mp4', 'webp']) if (!files.includes(`${stem}.${ext}`)) fail(`solutions/media/${stem}: missing ${ext}`);
    }
    for (const f of files) {
      const size = statSync(join(mediaDir, f)).size;
      if (/\.(webm|mp4)$/.test(f) && size > CLIP_BUDGET_BYTES) fail(`solutions/media/${f}: ${(size / 1024 / 1024).toFixed(2)} MB is over the 1.6 MB clip budget`);
      if (/\.webp$/.test(f) && size > POSTER_BUDGET_BYTES) fail(`solutions/media/${f}: poster ${(size / 1024).toFixed(0)} KB is over ${POSTER_BUDGET_BYTES / 1024} KB`);
    }
  }

  for (const route of routes) {
    for (const lang of ['en', 'es']) {
      const file = lang === 'en' ? route.path : `/es${route.path}`;
      const rel = `${file.replace(/^\//, '')}index.html`;
      const full = join(dist, rel);
      if (!existsSync(full)) continue; // verify-solutions.mjs already reports a missing page
      const html = readFileSync(full, 'utf8');
      const need = (ok, what) => {
        if (!ok) fail(`${rel}: ${what}`);
      };

      // ---- anatomy: hero (mesh, then orbits, then the H1 at display size), impact stage, night-stadium final
      need(/<section[^>]*class="[^"]*\bsx-hero\b[^"]*\bimpact\b[^"]*"[^>]*>\s*<div class="mesh"[^>]*>(?:\s*<i\b[^>]*><\/i>)*\s*<\/div>\s*<div class="orbits"/.test(html), 'the hero must be an impact section that opens with the mesh, then the orbits');
      need(/<h1 class="d [^"]*sx-h1/.test(html), 'the H1 must use the display face (class d)');
      const impacts = (html.match(/class="[^"]*\bimpact\b/g) ?? []).length;
      need(impacts >= (route.stage ? 3 : 2), `expected at least ${route.stage ? 'three' : 'two'} impact (dark) surfaces, found ${impacts}`);
      const final = /<section class="[^"]*\bsx-final\b[^"]*\bimpact\b[^"]*"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
      need(final.includes('/home/media/night-stadium.webm') && final.includes('/home/media/night-stadium.mp4'), 'the final CTA must sit on the night-stadium clip');
      need(/<h2 class="d d1 lines"/.test(final), 'the final CTA title must be an h2 at D1');
      need(final !== '' && html.indexOf(final) < html.indexOf('<footer'), 'the final CTA must come before the footer');

      // ---- clips: markup here; every file of every <video> against the text-free list and the slot's clip in the media guard
      verifySolutionsMedia({ html, file: rel, path: route.path, dist, fail });
      let nth = 0;
      for (const m of html.matchAll(/<video\b[\s\S]*?<\/video>/g)) {
        const tag = /<video\b[^>]*>/.exec(m[0])[0];
        const at = `<video #${++nth}>`;
        need(/\sdata-clip(\s|=|>)/.test(tag), `${at} has no data-clip`);
        need(!/\sautoplay(\s|=|>)/.test(tag), `${at} has autoplay`);
        for (const attr of ['muted', 'playsinline', 'loop']) need(new RegExp(`\\s${attr}(\\s|=|>)`).test(tag), `${at} is missing ${attr}`);
        need(/\spreload="none"/.test(tag), `${at} must be preload="none"`);
        need(/\s(data-)?poster="[^"]+"/.test(tag), `${at} has no poster`);
        // on the clip itself, or on the frame that wraps it (the opening tag sits just before the clip)
        need(/aria-hidden="true"/.test(tag) || /aria-hidden="true"[^<]*>\s*$/.test(html.slice(Math.max(0, m.index - 160), m.index)), `${at} is decoration and must be aria-hidden`);
      }
      for (const m of html.matchAll(/\/(?:home|solutions)\/media\/[\w-]+\.(?:webm|mp4|webp)/g)) need(existsSync(join(dist, m[0])), `references ${m[0]}, which is not in dist`);

      // ---- the swap line is one sentence for a screen reader, and its visible words are hidden from it
      if (route.swap) {
        const swap = /<p[^>]*data-sx-swap[^>]*data-words="([^"]*)"[^>]*>([\s\S]*?)<\/p>/.exec(html);
        need(Boolean(swap), 'the swap line is missing');
        if (swap) {
          const words = JSON.parse(decode(swap[1]));
          const sr = /<span class="sr">([\s\S]*?)<\/span>/.exec(swap[2])?.[1] ?? '';
          need(words.length >= 3, 'the swap line needs at least three words');
          for (const w of words) need(decode(sr).toLowerCase().includes(w.toLowerCase()), `the screen-reader sentence must contain "${w}"`);
          need(/^\s*<span class="sr">[^<]*<\/span>\s*<span aria-hidden="true">[\s\S]*data-sx-word/.test(swap[2]), 'the visible swap words must sit in one aria-hidden span right after the screen-reader sentence');
        }
      }

      // ---- decoration: hidden from assistive tech, or one image with a name
      for (const m of html.matchAll(/<[a-z]+\b[^>]*\sdata-decorative[^>]*>/g)) {
        need(/aria-hidden="true"/.test(m[0]) || (/role="img"/.test(m[0]) && /aria-label="[^"]+"/.test(m[0])), `a data-decorative element is neither aria-hidden nor a labelled image: ${m[0].slice(0, 80)}`);
      }

      if (route.path === '/contact/') {
        // The burst is decoration: no words in it, and no pre-rendered success text anywhere.
        const burst = /<span class="sx-burst"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/.exec(html);
        need(Boolean(burst), 'the submit burst is missing');
        need(textOf(burst?.[1] ?? '') === '', 'the submit burst must carry no text');
        need(/<span class="sx-burst"[^>]*aria-hidden="true"/.test(html), 'the submit burst must be aria-hidden');
        const status = /<p class="form__status"[^>]*data-status[^>]*>([\s\S]*?)<\/p>/.exec(html);
        need(Boolean(status) && textOf(status[1]) === '', 'the status line must be empty until a submit (no pre-rendered success state)');
        need(/role="status"/.test(status?.[0] ?? ''), 'the status line must stay a polite live region');
        need((html.match(/<input[^>]*type="radio"[^>]*name="topic"/g) ?? []).length === 2, 'the topic control must stay two real radio inputs');
      }
    }
  }
}
