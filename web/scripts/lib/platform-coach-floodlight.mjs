// Floodlight structure guards for the four Platform "Coach" pages (DESIGN-4): what every page must carry and what it must not.
// platform-coach-verify.mjs calls verifyCoachFloodlight once per built page and verifyCoachStyles once per run.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Clips with words rendered into the picture: they cannot be translated, so no coach page may play them.
const bakedTextClips = /^(pillar-[\w-]+|ai-demo|planner-demo)$/;
const sectionOpen = /<section\b[^>]*\bclass="([^"]*)"[^>]*>/g;

const hasClass = (classes, name) => classes.split(/\s+/).includes(name);

export function verifyCoachFloodlight({ html, file, slug, lang, fail }) {
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
    // The right-hand media must move: a clip for this page, not a still image.
    const clip = heroHtml.match(/<video\b[^>]*\bdata-clip\b[^>]*\bposter="\/home\/media\/([\w-]+)\.webp"/)?.[1];
    const want = `coach-${slug.replace('-', '')}`; // power-lab renders as coach-powerlab
    if (clip !== want) fail(`${file}: the hero media must be the moving clip ${want} (found ${clip ?? 'no video'})`);
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

  for (const [, name] of html.matchAll(/<video\b[\s\S]*?<source\b[^>]*\bsrc="\/home\/media\/([\w-]+)\.webm"/g)) {
    if (bakedTextClips.test(name)) fail(`${file}: plays ${name}, a clip with text baked into the picture (overlay words must be HTML, EN and ES)`);
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
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)) fail('cf.css: no prefers-reduced-motion block (loops must stop for reduced motion)');
}
