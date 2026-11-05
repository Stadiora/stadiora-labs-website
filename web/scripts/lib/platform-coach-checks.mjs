// Evidence checks for the Platform "Coach" feature pages (programs, nutrition, readiness, power lab), EN and ES.
//   node scripts/evidence.mjs --coach-only            (these checks and their screenshots)
//   node scripts/evidence.mjs --coach-only --checks-only
// Called from evidence.mjs with its page opener, check recorder and screenshot helpers.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { coachSlugs } from './platform-coach-verify.mjs';
import { contrastProbe } from './contrast.mjs';
import { coachAiContrastChecks } from './coach-contrast-checks.mjs';
import { coachMotionChecks } from './coach-motion-checks.mjs';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const widths = [
  [390, 844],
  [1024, 800],
  [1280, 800],
  [1440, 900],
];
const locales = ['en', 'es'];
const pathOf = (slug, locale) => `${locale === 'es' ? '/es' : ''}/platform/${slug}/`;

// Scroll each [data-reveal] block into view (the page-wide scroll in evidence.mjs can outrun the IntersectionObserver
// on a busy machine) and return how many never revealed.
async function revealAll(page, sleep) {
  for (let pass = 0; pass < 4; pass++) {
    const left = await page.evaluate(async () => {
      for (const n of document.querySelectorAll('[data-reveal]:not(.is-in)')) {
        // Instant: the page scrolls smoothly, and a smooth scroll that is still running when the wait ends leaves the block unobserved.
        n.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 150));
      }
      return document.querySelectorAll('[data-reveal]:not(.is-in)').length;
    });
    if (!left) break;
  }
  const stuck = await page.evaluate(() => document.querySelectorAll('[data-reveal]:not(.is-in)').length);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1500);
  return stuck;
}

// Routes the foundation registry marks `planned` (src/data/site.ts) belong to later slices and 404 until they land.
const planned = new Set(
  [...readFileSync(fileURLToPath(new URL('../../src/data/site.ts', import.meta.url)), 'utf8').matchAll(/path: '([^']+)', status: 'planned'/g)].flatMap((m) => [m[1], `/es${m[1]}`]),
);

// ---- in-page measurements (each runs in the browser; no closures over node scope) ----

// Horizontal overflow of the document, content clipped sideways inside a box, and overlapping text.
export const layout = () => {
  const visible = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    }
    return true;
  };
  const label = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? `.${e.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  const doc = document.documentElement;
  const out = { overflow: doc.scrollWidth - doc.clientWidth, clipped: [], overlaps: [], texts: 0 };

  // A box clips sideways when its own text runs past it, or a child other than a photo does. Photos are
  // allowed to overrun: they are cover-cropped (and zoomed) on purpose.
  const media = (c) => /^(PICTURE|IMG|SVG|VIDEO|CANVAS)$/i.test(c.tagName);
  for (const e of document.querySelectorAll('main *')) {
    const cs = getComputedStyle(e);
    if (!(cs.overflowX === 'hidden' || cs.overflowX === 'clip') || e.clientWidth <= 1 || e.scrollWidth <= e.clientWidth + 1 || !visible(e)) continue;
    const box = e.getBoundingClientRect();
    const spill = [...e.children].some((c) => {
      if (media(c) || !c.getClientRects().length) return false;
      const r = c.getBoundingClientRect();
      return r.right > box.right + 1 || r.left < box.left - 1;
    });
    // Empty aria-hidden boxes (the Floodlight mesh, glow blobs) are decoration that bleeds on purpose; they hold no content to clip.
    if (!e.textContent.trim() && e.closest('[aria-hidden="true"]')) continue;
    if (e.children.length === 0 || spill) out.clipped.push(`${label(e)} ${e.scrollWidth}>${e.clientWidth}`);
  }

  // Text boxes, cut down to the part an ancestor's overflow lets through.
  const boxes = [];
  const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    const e = node.parentElement;
    if (!e || !visible(e)) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    let { left, right, top, bottom } = range.getBoundingClientRect();
    if (right - left < 1 || bottom - top < 1) continue;
    for (let a = e; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const clipX = cs.overflowX !== 'visible';
      const clipY = cs.overflowY !== 'visible';
      if (!clipX && !clipY) continue;
      const r = a.getBoundingClientRect();
      if (clipX) {
        left = Math.max(left, r.left);
        right = Math.min(right, r.right);
      }
      if (clipY) {
        top = Math.max(top, r.top);
        bottom = Math.min(bottom, r.bottom);
      }
    }
    if (right - left < 1 || bottom - top < 1) continue;
    // Display type (.d) is set at line-height .88: its text boxes reach past the line box, so allow 20% of the size.
    const display = e.closest('.d');
    boxes.push({ e, left, right, top, bottom, text: node.textContent.trim().slice(0, 24), slack: display ? 0.2 * parseFloat(getComputedStyle(display).fontSize) : 0 });
  }
  out.texts = boxes.length;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      // 2px of slack: line boxes of tightly leaded text legitimately touch.
      if (x > 2 && y > Math.max(2, a.slack, b.slack)) out.overlaps.push(`"${a.text}" x "${b.text}" (${Math.round(x)}x${Math.round(y)})`);
    }
  }
  out.overlaps = out.overlaps.slice(0, 8);
  out.clipped = out.clipped.slice(0, 8);
  return out;
};

// Alt text, heading order, and focusable elements a screen reader cannot reach.
export const semantics = () => {
  const out = { noAlt: [], headingJumps: [], h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main').length, hiddenFocusable: [], badLabels: [] };
  for (const img of document.images) if (!img.hasAttribute('alt')) out.noAlt.push(img.currentSrc.slice(-40));
  let prev = 0;
  for (const h of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    if (!h.getClientRects().length || h.closest('[aria-hidden="true"]')) continue;
    const level = Number(h.tagName[1]);
    if (prev && level > prev + 1) out.headingJumps.push(`h${prev} to h${level}: ${h.textContent.trim().slice(0, 30)}`);
    prev = level;
  }
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';
  for (const e of document.querySelectorAll(sel)) {
    if (e.tabIndex < 0 || e.disabled || !e.getClientRects().length) continue;
    if (getComputedStyle(e).visibility === 'hidden') continue;
    const hidden = e.closest('[aria-hidden="true"], [inert]');
    if (hidden) out.hiddenFocusable.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)} in ${hidden.tagName.toLowerCase()}`);
  }
  for (const e of document.querySelectorAll('a[href], button')) {
    if (!e.getClientRects().length || e.closest('[aria-hidden="true"], [inert]')) continue;
    const name = (e.getAttribute('aria-label') || e.textContent || '').trim();
    if (!name) out.badLabels.push(`${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)}`);
  }
  return out;
};

// Internal links in the page body, header and footer. The language switch points at the other locale on purpose.
const links = () =>
  [...document.querySelectorAll('main a[href], header a[href], footer a[href]')]
    .filter((a) => !a.closest('.langswitch'))
    .map((a) => a.getAttribute('href'))
    .filter((h) => h.startsWith('/'));

// Walks the page with the Tab key and reports where focus lands somewhere it should not.
async function tabWalk(page) {
  const problems = [];
  let steps = 0;
  let first = null;
  for (; steps < 160; steps++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return { body: true };
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const ring = cs.boxShadow !== 'none';
      return {
        id: `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)}`,
        size: r.width > 0 && r.height > 0,
        hidden: Boolean(e.closest('[aria-hidden="true"], [inert]')),
        indicator: outline || ring,
        focusVisible: e.matches(':focus-visible'),
      };
    });
    if (s.body) break;
    if (first === null) first = s.id;
    else if (s.id === first && steps > 2) break;
    if (!s.size) problems.push(`${s.id} has no box`);
    if (s.hidden) problems.push(`${s.id} is inside aria-hidden or inert`);
    if (s.focusVisible && !s.indicator) problems.push(`${s.id} shows no focus indicator`);
  }
  return { steps, problems: [...new Set(problems)].slice(0, 8), trapped: steps >= 160 };
}

export async function platformCoachChecks({ open, check, shot, el, sleep, settle, checksOnly, metrics, server, browser, outDir }) {
  // ---- 1. layout, semantics, contrast, links and console health on every page
  for (const slug of coachSlugs) {
    for (const locale of locales) {
      const path = pathOf(slug, locale);
      const tag = `${locale}/${slug}`;

      for (const [width, height] of widths) {
        const page = await open({ width, height, reduced: true, mobile: width < 500 }, path);
        await settle(page);
        const g = await page.evaluate(layout);
        check('coach-layout', `${tag} ${width}: no horizontal overflow, no sideways clipping, no overlapping text`, g.overflow <= 0 && g.clipped.length === 0 && g.overlaps.length === 0, `overflow ${g.overflow}px, ${g.texts} text boxes${g.clipped.length ? `, clipped: ${g.clipped.join('; ')}` : ''}${g.overlaps.length ? `, overlaps: ${g.overlaps.join('; ')}` : ''}`);
        if (width === 1440 || width === 390) {
          check('coach-console', `${tag} ${width}: no console errors, failed or 4xx requests`, page.problems.length === 0, page.problems.slice(0, 3).join(' | '));
        }
        await page.context().close();
      }

      for (const scheme of ['light', 'dark']) {
        for (const [width, height] of [widths[0], widths[3]]) {
          const page = await open({ width, height, scheme, reduced: true, mobile: width < 500 }, path);
          await settle(page);
          // The shared probe (also used by the home and engage checks) knows the fixed nav over a dark hero, visually hidden text and
          // [data-decorative]. Aria-hidden demo screens are measured too, since sighted users read them, and so is the whole AI demo
          // stage: nothing on a page is exempt unless the element itself carries [data-decorative].
          const c = await page.evaluate(contrastProbe, { includeAriaHidden: true });
          check('coach-contrast', `${tag} ${scheme} ${width}: text meets WCAG AA (4.5:1, 3:1 large)`, c.failCount === 0, `${c.checked} text nodes, lowest ${c.min.toFixed(2)}:1${c.failCount ? `, failing: ${JSON.stringify(c.fails)}` : ''}; ${c.skippedImage} over images skipped`);
          metrics[`coach-contrast-${slug}-${locale}-${scheme}-${width}`] = { checked: c.checked, lowest: Number(c.min.toFixed(2)) };
          if (scheme === 'light' && width === 1440) {
            const s = await page.evaluate(semantics);
            check('coach-a11y', `${tag}: one h1, one main, every img has alt, no skipped heading level`, s.h1 === 1 && s.main === 1 && s.noAlt.length === 0 && s.headingJumps.length === 0, `h1 ${s.h1}, main ${s.main}${s.noAlt.length ? `, no alt: ${s.noAlt.join(', ')}` : ''}${s.headingJumps.length ? `, ${s.headingJumps.join('; ')}` : ''}`);
            check('coach-a11y', `${tag}: nothing focusable is hidden from assistive tech, every link and button has a name`, s.hiddenFocusable.length === 0 && s.badLabels.length === 0, `${s.hiddenFocusable.slice(0, 4).join('; ')} ${s.badLabels.slice(0, 4).join('; ')}`.trim());
            const hrefs = await page.evaluate(links);
            const unique = [...new Set(hrefs)];
            const pathOnly = (h) => h.split(/[?#]/)[0];
            const exists = (h) => {
              const clean = pathOnly(h);
              const file = clean.endsWith('/') ? `${clean}index.html` : clean;
              return existsSync(`${dist}${decodeURIComponent(file.slice(1))}`);
            };
            const broken = unique.filter((h) => !exists(h) && !planned.has(pathOnly(h)));
            check('coach-links', `${tag}: every internal link resolves in dist (carried legacy pages included), or is a planned route`, broken.length === 0, broken.join(', '));
            metrics[`coach-planned-links-${slug}-${locale}`] = unique.filter((h) => !exists(h) && planned.has(pathOnly(h))).length;
            if (locale === 'es') {
              // Legacy pages (.html) are shared by both languages; every other internal page link must carry /es/.
              const wrong = unique.filter((h) => !/^\/es\//.test(h) && !/\.\w+(\?|#|$)/.test(pathOnly(h)) && pathOnly(h) !== '/');
              check('coach-links', `${tag}: internal page links stay in Spanish`, wrong.length === 0, wrong.slice(0, 6).join(', '));
            }
            const call = hrefs.filter((h) => h.includes('topic=call'));
            check('coach-links', `${tag}: "Book a call" goes to the contact form with topic=call`, call.length > 0 && call.every((h) => /(connect\.html|\/contact\/)$/.test(pathOnly(h))), `${call.length} links: ${[...new Set(call)].join(', ')}`);
          }
          await page.context().close();
        }
      }

      // Keyboard: Tab through the whole page.
      {
        const page = await open({ width: 1440, height: 900 }, path);
        await settle(page);
        const t = await tabWalk(page);
        check('coach-keyboard', `${tag}: Tab walk visits ${t.steps} stops, none hidden, boxless or without a focus ring, no trap`, t.problems.length === 0 && !t.trapped, t.problems.join('; '));
        await page.context().close();
      }

      // No JavaScript: the content is still there and nothing waits on a reveal.
      {
        const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        await page.goto(server.url + path, { waitUntil: 'load' });
        const s = await page.evaluate(() => ({
          h1: document.querySelector('h1')?.getBoundingClientRect().height > 0,
          faded: [...document.querySelectorAll('main [data-reveal]')].filter((e) => parseFloat(getComputedStyle(e).opacity) < 1).length,
          text: document.querySelector('main').innerText.length,
        }));
        check('coach-nojs', `${tag}: renders without JavaScript (h1 visible, no content stuck faded)`, s.h1 && s.faded === 0 && s.text > 400, `${s.text} characters, ${s.faded} faded`);
        await context.close();
      }
    }
  }

  // The AI demo on the programs page: canary and every frame of its timeline (the rest-state probe above sees only some cards).
  await coachAiContrastChecks({ open, check, sleep, settle });

  // ---- 2. interactions (motion on)
  // Pointer, mouse click and keyboard-focus behaviour, measured on rendered values for every moving stage on every page.
  await coachMotionChecks({ open, check, sleep, settle, metrics });
  for (const locale of locales) {
    // Accordions: programs and readiness.
    for (const slug of ['programs', 'readiness']) {
      const page = await open({ width: 1440, height: 900 }, pathOf(slug, locale));
      await settle(page);
      const acc = page.locator('[data-accordion]').first();
      const n = await acc.locator('.acc__btn').count();
      await acc.scrollIntoViewIfNeeded();
      let ok = true;
      const notes = [];
      for (let i = 0; i < n; i++) {
        await acc.locator('.acc__btn').nth(i).click();
        await sleep(120);
        const s = await acc.evaluate((root, idx) => {
          const items = [...root.querySelectorAll('.acc__item')];
          const screens = [...root.querySelectorAll('.acc__screen')];
          return {
            expanded: items.map((it) => it.querySelector('.acc__btn').getAttribute('aria-expanded')),
            open: items.filter((it) => it.hasAttribute('data-open')).length,
            active: screens.map((sc, k) => (sc.hasAttribute('data-active') ? k : -1)).filter((k) => k >= 0),
            inert: items.map((it) => it.querySelector('.acc__panel').inert),
            idx,
          };
        }, i);
        const good = s.expanded.every((v, k) => (v === 'true') === (k === i)) && s.open === 1 && s.active.length === 1 && s.active[0] === i && s.inert.every((v, k) => v === (k !== i));
        if (!good) {
          ok = false;
          notes.push(`row ${i}: ${JSON.stringify(s)}`);
        }
      }
      check('coach-accordion', `${locale}/${slug}: each of ${n} rows opens alone, drives the stage screen and un-inerts its panel`, ok && n >= 4, notes.join(' | '));
      await acc.locator('.acc__btn').nth(n - 1).click();
      await acc.locator('.acc__btn').nth(n - 1).click();
      check('coach-accordion', `${locale}/${slug}: clicking the open row keeps it open`, (await acc.locator('.acc__btn').nth(n - 1).getAttribute('aria-expanded')) === 'true');
      await acc.locator('.acc__btn').nth(0).focus();
      await page.keyboard.press('ArrowDown');
      const down = await page.evaluate(() => document.activeElement?.id ?? '');
      await page.keyboard.press('End');
      const end = await page.evaluate(() => document.activeElement?.id ?? '');
      await page.keyboard.press('Home');
      const home = await page.evaluate(() => document.activeElement?.id ?? '');
      check('coach-accordion', `${locale}/${slug}: ArrowDown, End and Home move focus between row headers`, /-h-1$/.test(down) && new RegExp(`-h-${n - 1}$`).test(end) && /-h-0$/.test(home), `${down} ${end} ${home}`);
      await page.context().close();
    }

    // Hover-reveal cards (readiness).
    {
      const path = pathOf('readiness', locale);
      const page = await open({ width: 1440, height: 900 }, path);
      await settle(page);
      const row = page.locator('[data-hrr]').first();
      const cards = row.locator('[data-hrc]');
      const n = await cards.count();
      await row.scrollIntoViewIfNeeded();
      const states = [];
      for (let i = 0; i < n; i++) {
        await cards.nth(i).hover();
        await sleep(150);
        const on = await cards.evaluateAll((cs, k) => cs.map((c, j) => c.classList.contains('is-open') === (j === k)), i);
        states.push(on.every(Boolean));
      }
      await page.mouse.move(2, 2);
      await sleep(150);
      const none = await cards.evaluateAll((cs) => cs.every((c) => !c.classList.contains('is-open')));
      check('coach-hover', `${locale}/readiness: hovering each of ${n} cards opens only that card and leaving closes it`, n === 3 && states.every(Boolean) && none, states.join(','));
      await cards.nth(0).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      const focusOpen = await cards.nth(0).evaluate((c) => c.classList.contains('is-open'));
      await page.keyboard.press('Escape');
      const escClosed = await cards.nth(0).evaluate((c) => !c.classList.contains('is-open'));
      check('coach-hover', `${locale}/readiness: keyboard focus opens a card and Escape closes it`, focusOpen && escClosed, `open ${focusOpen}, closed ${escClosed}`);
      await page.context().close();

      const narrow = await open({ width: 390, height: 844, mobile: true }, path);
      await settle(narrow);
      const s = await narrow.evaluate(() => {
        const r = document.querySelector('[data-hrr]');
        return { tab: r.tabIndex, role: r.getAttribute('role'), label: r.getAttribute('aria-label'), cardTab: [...r.querySelectorAll('[data-hrc]')].filter((c) => c.tabIndex >= 0).length, scroll: r.scrollWidth > r.clientWidth };
      });
      check('coach-hover', `${locale}/readiness 390: the row scrolls as one labelled focus stop, cards are not tab stops`, s.tab === 0 && s.role === 'group' && Boolean(s.label) && s.cardTab === 0 && s.scroll, JSON.stringify(s));
      await narrow.context().close();

      // Reduced motion on a wide screen: the three cards fill the row, nothing scrolls, so the row is not a tab stop.
      const still = await open({ width: 1440, height: 900, reduced: true }, path);
      await settle(still);
      await sleep(300);
      const f = await still.evaluate(() => {
        const r = document.querySelector('[data-hrr]');
        const box = r.getBoundingClientRect();
        const cs = [...r.querySelectorAll('[data-hrc]')].map((c) => c.getBoundingClientRect());
        return { gap: Math.round(box.right - cs[cs.length - 1].right), n: cs.length, scroll: r.scrollWidth > r.clientWidth + 1, tab: r.tabIndex, cardTab: [...r.querySelectorAll('[data-hrc]')].filter((c) => c.tabIndex >= 0).length };
      });
      check('coach-hover', `${locale}/readiness 1440 reduced motion: cards fill the row, no scroll, no stray tab stop`, f.n === 3 && f.gap <= 8 && !f.scroll && f.tab < 0 && f.cardTab === 0, JSON.stringify(f));
      await still.context().close();
    }

    // Motion contract: endless CSS loops run only for blocks on screen, stop in a hidden tab, and do not exist under reduced motion.
    for (const slug of coachSlugs) {
      const loops = () =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.('main'))
          .map((a) => {
            const t = a.effect.target;
            const host = t.closest('section, footer');
            const r = host?.getBoundingClientRect();
            const near = !r || (r.bottom > -600 && r.top < innerHeight + 600);
            return { name: a.animationName, near, el: `${t.tagName.toLowerCase()}.${String(t.className).split(/\s+/)[0]}` };
          });
      const page = await open({ width: 1440, height: 900 }, pathOf(slug, locale));
      await settle(page);
      await sleep(400);
      const onScreen = await page.evaluate(loops);
      const far = onScreen.filter((l) => !l.near);
      check('coach-motion', `${locale}/${slug}: no endless CSS loop runs in a block that is far off screen`, far.length === 0, `${onScreen.length} running, off screen: ${far.slice(0, 4).map((l) => `${l.name} on ${l.el}`).join(', ')}`);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await sleep(300);
      const hidden = await page.evaluate(loops);
      check('coach-motion', `${locale}/${slug}: a hidden tab stops every endless CSS loop`, hidden.length === 0, `${hidden.length} still running: ${hidden.slice(0, 4).map((l) => `${l.name} on ${l.el}`).join(', ')}`);
      await page.context().close();
      const still = await open({ width: 1440, height: 900, reduced: true }, pathOf(slug, locale));
      await settle(still);
      await sleep(300);
      const rm = await still.evaluate(() => ({ loops: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity && a.effect.target?.closest?.('main')).length, playing: [...document.querySelectorAll('video')].filter((v) => !v.paused).length }));
      check('coach-motion', `${locale}/${slug} reduced motion: no endless CSS loop and no playing video`, rm.loops === 0 && rm.playing === 0, JSON.stringify(rm));
      await still.context().close();
    }

    // Power lab count-up: the HTML already holds the final value, every frame of the motion stays between 0 and
    // that value (a first frame stamped before the start time once ran negative), and it lands on the value.
    {
      const file = `${dist}${pathOf('power-lab', locale).slice(1)}index.html`;
      const served = [...readFileSync(file, 'utf8').matchAll(/data-countup-dec="([^"]+)"[^>]*>([^<]*)</g)].map((m) => ({ target: Number(m[1]), text: m[2].trim() }));
      const watch = () => {
        window.__cu = [];
        new MutationObserver(() => {
          document.querySelectorAll('[data-countup-dec]').forEach((e, i) => window.__cu.push({ i, text: e.textContent.trim() }));
        }).observe(document, { subtree: true, childList: true, characterData: true });
      };
      const page = await open({ width: 1440, height: 900, init: watch }, pathOf('power-lab', locale));
      await settle(page);
      await page.locator('[data-countup-dec]').first().scrollIntoViewIfNeeded();
      await sleep(1800);
      const { seen, after } = await page.evaluate(() => ({ seen: window.__cu, after: [...document.querySelectorAll('[data-countup-dec]')].map((e) => e.textContent.trim()) }));
      const num = (t) => Number(t.replace(',', '.'));
      const outOfRange = seen.filter((s) => num(s.text) < 0 || num(s.text) > served[s.i].target + 1e-9);
      const decimalMark = locale === 'es' ? ',' : '.';
      const sameMark = served.every((s) => !/\d[.,]\d/.test(s.text) || s.text.includes(decimalMark));
      check('coach-countup', `${locale}/power-lab: ${served.length} count-ups never leave 0..target, end on the server-rendered value, "${decimalMark}" separator`, served.length >= 2 && outOfRange.length === 0 && sameMark && JSON.stringify(after) === JSON.stringify(served.map((s) => s.text)), `served ${served.map((s) => s.text).join(' ')}, after ${after.join(' ')}, ${seen.length} frames seen, out of range: ${outOfRange.slice(0, 3).map((s) => s.text).join(' ')}`);
      await page.context().close();
    }
  }

  // ---- 3. screenshots: every page, both locales, both themes, both viewports, plus interactive states
  if (checksOnly) return;
  for (const slug of coachSlugs) {
    for (const locale of locales) {
      for (const scheme of ['light', 'dark']) {
        for (const [width, height] of [widths[3], widths[0]]) {
          const page = await open({ width, height, scheme, mobile: width < 500 }, pathOf(slug, locale));
          await settle(page);
          const stuck = await revealAll(page, sleep);
          check('coach-reveal', `${slug}/${locale} ${scheme} ${width}: every scroll-reveal block reveals once scrolled to`, stuck === 0, `${stuck} stuck`);
          // A tall viewport, not `fullPage`: Playwright's beyond-viewport capture draws the clipped hover-card phones.
          const full = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
          await page.setViewportSize({ width, height: full });
          await sleep(900);
          await shot(page, `coach-${slug}-${locale}-${scheme}-${width}`);
          await page.context().close();
        }
      }
    }
  }
  {
    // The reduced-motion layout of the hover-reveal cards (the phone shows under each label).
    const page = await open({ width: 1440, height: 900, reduced: true }, pathOf('readiness', 'en'));
    await settle(page);
    const row = page.locator('[data-hrr]').first();
    await row.scrollIntoViewIfNeeded();
    await el(page, '[data-hrr]', 'coach-readiness-en-light-1440-reduced-motion-cards');
    await page.context().close();
  }
  for (const [slug, locale, scheme, width, height] of [
    ['programs', 'en', 'light', 1440, 900],
    ['programs', 'en', 'dark', 390, 844],
    ['readiness', 'en', 'light', 1440, 900],
    ['readiness', 'es', 'dark', 1440, 900],
  ]) {
    const page = await open({ width, height, scheme, mobile: width < 500 }, pathOf(slug, locale));
    await settle(page);
    const acc = page.locator('[data-accordion]').first();
    await acc.scrollIntoViewIfNeeded();
    await sleep(800);
    const n = await acc.locator('.acc__btn').count();
    for (let i = 0; i < n; i++) {
      await acc.locator('.acc__btn').nth(i).click();
      await sleep(700);
      await acc.screenshot({ path: `${outDir}coach-${slug}-${locale}-${scheme}-${width}-accordion-${i}.png` });
    }
    await page.context().close();
  }
  for (const [locale, scheme] of [
    ['en', 'light'],
    ['es', 'dark'],
  ]) {
    const page = await open({ width: 1440, height: 900, scheme }, pathOf('readiness', locale));
    await settle(page);
    const row = page.locator('[data-hrr]').first();
    await row.scrollIntoViewIfNeeded();
    const cards = row.locator('[data-hrc]');
    for (let i = 0; i < (await cards.count()); i++) {
      await cards.nth(i).hover();
      await sleep(700);
      await el(page, '[data-hrr]', `coach-readiness-${locale}-${scheme}-1440-hover-${i}`);
    }
    await page.context().close();
  }
}
