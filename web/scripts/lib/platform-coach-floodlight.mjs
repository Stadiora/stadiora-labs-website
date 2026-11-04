// Floodlight structure guards for the four Platform "Coach" pages (DESIGN-4): what every page must carry and what it must not.
// platform-coach-verify.mjs calls verifyCoachFloodlight once per built page and verifyCoachStyles once per run.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyCoachMedia } from './coach-media-guard.mjs';

const sectionOpen = /<section\b[^>]*\bclass="([^"]*)"[^>]*>/g;

const hasClass = (classes, name) => classes.split(/\s+/).includes(name);

export function verifyCoachFloodlight({ html, file, slug, lang, dist, fail }) {
  // The transparent nav over a dark hero is switched on by the hero prop of Base.
  if (!/<body\b[^>]*\bdata-hero\b/.test(html)) fail(`${file}: body has no data-hero (the nav must sit transparent over the dark hero)`);

  const sections = [...html.matchAll(sectionOpen)].map((m) => ({ classes: m[1], at: m.index }));
  const hero = sections.find((s) => hasClass(s.classes, 'cf-hero'));
  if (!hero || !hasClass(hero.classes, 'impact')) {
    fail(`${file}: no dark .impact hero (section.cf-hero.impact)`);
  } else {
    const next = sections.find((s) => s.at > hero.at);
    const heroHtml = html.slice(hero.at, next?.at ?? html.length);
    if (!/class="mesh"/.test(heroHtml)) fail(`${file}: the hero has no .mesh background`);
    if (!/class="orbits"/.test(heroHtml)) fail(`${file}: the hero has no .orbits`);
    // The right-hand media must move: a video that starts on visibility, not a still image.
    if (!/<video\b[^>]*\bdata-clip\b/.test(heroHtml)) fail(`${file}: the hero media must be a moving clip (found no video[data-clip])`);
  }

  // Hero, one dark stage at least, and the closing call to action.
  const dark = sections.filter((s) => hasClass(s.classes, 'impact')).length;
  if (dark < 3) fail(`${file}: needs a dark hero, at least one dark stage and the dark closing band (found ${dark} .impact sections)`);

  const final = sections.find((s) => hasClass(s.classes, 'final'));
  if (!final) {
    fail(`${file}: no closing .final band`);
  } else if (!hasClass(final.classes, 'impact') || !/night-stadium\.webm/.test(html.slice(final.at, final.at + 1200))) {
    fail(`${file}: the closing band must be a dark .impact over the night-stadium clip`);
  }

  // Every file a video can load (WebM, MP4 fallback, poster) is declared text-free and is the clip this slot expects.
  verifyCoachMedia({ html, file, slug, dist, fail });

  // Pause contract: every moving unit is a [data-cf-stage] (scripts/coach/stages.ts), and a clip that follows a unit
  // through data-ap-within points at an element that exists. The pause itself is measured in the evidence checks.
  const tags = (re) => [...html.matchAll(re)].map((m) => m[0]);
  if (!/<[^>]*\bdata-cf-stage="hero"/.test(html)) fail(`${file}: the hero media frame is not a [data-cf-stage="hero"] (its chips and clip would keep moving under the pointer)`);
  for (const t of tags(/<[a-z][\w-]*\s[^>]*\bdata-accordion(?=[\s>=])[^>]*>/g)) {
    if (!/\bdata-cf-stage\b/.test(t)) fail(`${file}: an accordion is not a [data-cf-stage] (hovering or focusing its buttons would not pause its clip and loops)`);
  }
  for (const t of tags(/<video\s[^>]*\bdata-ap-within="#([^"]+)"[^>]*>/g)) {
    const id = t.match(/data-ap-within="#([^"]+)"/)[1];
    if (!new RegExp(`\\bid="${id}"`).test(html)) fail(`${file}: a clip follows #${id} for hover and focus, but nothing on the page has that id`);
  }

  // Spanish writes no opening inverted marks in headlines or buttons (owner house style).
  if (lang === 'es') {
    const visible = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
    const m = visible.match(/[¿¡]/);
    if (m) fail(`${file}: Spanish copy uses an opening ${m[0]} (house style leaves it out)`);
  }
}

// The coach layer is the only place where the no-JS and reduced-motion behaviour of the new components lives.
export function verifyCoachStyles({ root, fail }) {
  const path = join(root, 'src/styles/coach/cf.css');
  if (!existsSync(path)) return fail('src/styles/coach/cf.css: missing');
  const css = readFileSync(path, 'utf8');
  if (!/html:not\(\.js\)\s+\.cf-page\s+\.rv(?![\w-])/.test(css)) fail('cf.css: no no-JS fallback for .rv (reveals would stay hidden without scripts)');
  if (!/html:not\(\.js\)\s+\.cf-page\s+\.lines/.test(css)) fail('cf.css: no no-JS fallback for .lines (the headline would stay hidden without scripts)');
  if (!/\[data-cf-stage\]\[data-ap=['"]off['"]\][^{]*\{[^}]*animation-play-state:\s*paused\s*!important/.test(css)) fail('cf.css: no rule that pauses every loop inside a [data-cf-stage] while its data-ap is off (hover, focus, off screen, hidden tab)');
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) fail('cf.css: no prefers-reduced-motion block (loops must stop for reduced motion)');
}
