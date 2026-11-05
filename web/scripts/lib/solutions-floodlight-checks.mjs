// Browser checks for the Floodlight restyle of the Solutions, Resources and company pages (EN and ES).
// Called from evidence.mjs after solutions-checks.mjs, which keeps layout, contrast, targets, forms and the screenshots.
// This file proves the motion contract and the Floodlight anatomy in Chromium:
//   - the hero, the stage and the final are on the dark stage with the display face, in both locales;
//   - nothing that moves keeps moving under reduced motion, and the hero loops stop on hover;
//   - solutions-motion-checks.mjs measures the rendered movement of every autoplayer unit under hover, focus, offscreen and a hidden tab;
//   - the About "A" window, the clubs feed, the athletes morph and the coaches clip move, and rest on their still frame;
//   - the contact topic thumb glides, the submit burst is decoration;
//   - no text is cut off by a clipping ancestor.
import { clipProbe } from './clip-probe.mjs';
import { solutionsMotionChecks } from './solutions-motion-checks.mjs';
import { solutionsPixelContrastChecks } from './solutions-pixel-contrast.mjs';

const pages = [
  ['schools', '/solutions/schools/'],
  ['coaches', '/solutions/coaches/'],
  ['clubs', '/solutions/teams-and-clubs/'],
  ['athletes', '/solutions/athletes/'],
  ['case-studies', '/resources/case-studies/'],
  ['about', '/about/'],
  ['contact', '/contact/'],
];
const localized = (locale, path) => (locale === 'es' ? `/es${path}` : path);
// The hero covers the top-left corner of every page, so the pointer rests on the fixed header, outside every autoplayer scope.
const park = async (page) => {
  const box = await page.locator('header a').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
};
const everyPage = pages.flatMap(([name, path]) => ['en', 'es'].map((locale) => ({ name, locale, path: localized(locale, path), label: `${locale}${path}` })));

// Runs in the page: the shared anatomy of a Floodlight page.
const anatomy = () => {
  const lum = (rgb) => {
    const [r, g, b] = (rgb.match(/[\d.]+/g) ?? [255, 255, 255]).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const hero = document.querySelector('.sx-hero');
  const h1 = hero?.querySelector('h1');
  const final = document.querySelector('.sx-final');
  const footer = document.querySelector('footer');
  const mesh = hero?.querySelector('.mesh');
  const heroBox = hero?.getBoundingClientRect();
  const meshBox = mesh?.getBoundingClientRect();
  return {
    heroDark: hero ? lum(getComputedStyle(hero).backgroundColor) < 0.05 : false,
    h1Size: h1 ? Number.parseFloat(getComputedStyle(h1).fontSize) : 0,
    h1Display: Boolean(h1?.classList.contains('d')),
    meshCovers: Boolean(heroBox && meshBox && meshBox.width >= heroBox.width - 1 && meshBox.height >= heroBox.height - 1),
    blobs: mesh ? mesh.querySelectorAll('i.b').length : 0,
    orbits: hero ? hero.querySelectorAll('.orbits ellipse').length : 0,
    finalDark: final ? lum(getComputedStyle(final).backgroundColor) < 0.05 : false,
    finalClip: Boolean(final?.querySelector('video[data-clip]')),
    finalBeforeFooter: Boolean(final && footer && final.getBoundingClientRect().bottom <= footer.getBoundingClientRect().top + 1),
    stages: [...document.querySelectorAll('.impact')].length,
  };
};

export async function solutionsFloodlightChecks({ open, settle: settleRaw, check, sleep }) {
  const settle = async (page) => {
    await settleRaw(page);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
  };

  // ---------------------------------------------------------- anatomy and clipping, every page in both locales
  for (const { label, path } of everyPage) {
    const page = await open({ width: 1440, height: 900, scheme: 'light', reduced: true }, path);
    await settle(page);
    const a = await page.evaluate(anatomy);
    const bad = [];
    if (!a.heroDark) bad.push('hero is not on the dark stage in the light theme');
    if (a.h1Size < 56) bad.push(`H1 is ${a.h1Size}px, below the display size`);
    if (!a.h1Display) bad.push('H1 does not use the display face');
    if (!a.meshCovers || a.blobs < 3) bad.push(`the mesh does not cover the hero with its light blobs (${a.blobs} blobs)`);
    if (a.orbits < 2) bad.push(`${a.orbits} orbit rings in the hero`);
    if (!a.finalDark || !a.finalClip || !a.finalBeforeFooter) bad.push(`final CTA: dark ${a.finalDark}, clip ${a.finalClip}, before footer ${a.finalBeforeFooter}`);
    if (a.stages < 3 && !/case-studies/.test(path)) bad.push(`${a.stages} dark surfaces`);
    check('solutions-floodlight', `${label}: Floodlight anatomy (dark mesh hero with orbits, display H1, night-stadium final) holds in the light theme`, bad.length === 0, bad.join('; ') || JSON.stringify(a));
    await page.context().close();

    const cuts = [];
    let checked = 0;
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ]) {
      const p = await open({ width, height, scheme: 'dark', reduced: true, mobile: width < 500 }, path);
      await settle(p);
      const k = await p.evaluate(clipProbe);
      checked += k.checked;
      if (k.cutCount) cuts.push(`@${width}: ${k.cut.slice(0, 3).join('; ')}`);
      await p.context().close();
    }
    check('solutions-floodlight', `${label}: no text is cut off at 1440 and 390 px`, cuts.length === 0, cuts.join(' | ') || `${checked} text boxes checked`);
  }

  // ---------------------------------------------------------- hero word swap: moves, rests under reduced motion, stops on hover
  for (const [name, path] of [
    ['schools', '/solutions/schools/'],
    ['coaches', '/solutions/coaches/'],
  ]) {
    const word = (page) => page.evaluate(() => document.querySelector('[data-sx-word][data-active]')?.textContent ?? '');

    const rm = await open({ width: 1440, height: 900, reduced: true }, path);
    await settle(rm);
    const rmState = await rm.evaluate(() => ({ ap: document.querySelector('[data-sx-hero]').dataset.ap, why: document.querySelector('[data-sx-hero]').dataset.apWhy }));
    const rm0 = await word(rm);
    await sleep(3600);
    const rm1 = await word(rm);
    check('solutions-floodlight', `${name}: under reduced motion the swap line rests on its first word and the hero autoplayer is off (reduced)`, rm0 === rm1 && rmState.ap === 'off' && rmState.why === 'reduced', JSON.stringify({ rm0, rm1, rmState }));
    await rm.context().close();

    const mo = await open({ width: 1440, height: 900 }, path);
    await settle(mo);
    await park(mo);
    const w0 = await word(mo);
    await sleep(3800);
    const w1 = await word(mo);
    const on = await mo.evaluate(() => document.querySelector('[data-sx-hero]').dataset.ap);
    check('solutions-floodlight', `${name}: with motion allowed the swap line changes word and the autoplayer is on`, w0 !== w1 && on === 'on', JSON.stringify({ w0, w1, on }));

    const box = await mo.locator('[data-sx-copy] .sx-h1').boundingBox();
    await mo.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(500);
    const h0 = await word(mo);
    const hover = await mo.evaluate(() => ({ ap: document.querySelector('[data-sx-hero]').dataset.ap, why: document.querySelector('[data-sx-hero]').dataset.apWhy }));
    await sleep(3600);
    const h1 = await word(mo);
    check('solutions-floodlight', `${name}: hovering the hero copy pauses the swap line (autoplayer off, hover)`, h0 === h1 && hover.ap === 'off' && hover.why === 'hover', JSON.stringify({ h0, h1, hover }));
    await mo.context().close();
  }

  // ---------------------------------------------------------- coaches clip plays with motion, rests as a poster under reduced motion
  {
    const rm = await open({ width: 1440, height: 900, reduced: true }, '/solutions/coaches/');
    await settle(rm);
    await sleep(800);
    const rmClip = await rm.evaluate(() => {
      const v = document.querySelector('.sx-clip video[data-clip]');
      return v ? { paused: v.paused, t: v.currentTime, poster: Boolean(v.poster || v.dataset.poster) } : null;
    });
    check('solutions-floodlight', 'coaches: the hero clip does not play under reduced motion and has a poster', Boolean(rmClip) && rmClip.paused && rmClip.t === 0 && rmClip.poster, JSON.stringify(rmClip));
    await rm.context().close();

    const mo = await open({ width: 1440, height: 900 }, '/solutions/coaches/');
    await settle(mo);
    await park(mo);
    await mo.waitForFunction(() => document.querySelector('.sx-clip video[data-clip]')?.currentTime > 0.3, null, { timeout: 8000 }).catch(() => {});
    const moClip = await mo.evaluate(() => {
      const v = document.querySelector('.sx-clip video[data-clip]');
      return v ? { paused: v.paused, t: v.currentTime } : null;
    });
    check('solutions-floodlight', 'coaches: the hero clip plays when visible and motion is allowed', Boolean(moClip) && !moClip.paused && moClip.t > 0.3, JSON.stringify(moClip));
    await mo.context().close();
  }

  // ---------------------------------------------------------- clubs team feed
  for (const locale of ['en', 'es']) {
    const path = localized(locale, '/solutions/teams-and-clubs/');
    const running = (page) =>
      page.evaluate(() => {
        const host = document.querySelector('[data-sx-feed]');
        return document.getAnimations().filter((a) => a.playState === 'running' && host?.contains(a.effect?.target)).length;
      });
    const rm = await open({ width: 1440, height: 900, reduced: true }, path);
    await settle(rm);
    await rm.locator('[data-sx-feed]').scrollIntoViewIfNeeded();
    await sleep(600);
    const rmCount = await running(rm);
    await rm.context().close();
    const mo = await open({ width: 1440, height: 900 }, path);
    await settle(mo);
    await mo.locator('[data-sx-feed]').scrollIntoViewIfNeeded();
    await park(mo);
    await sleep(900);
    const moCount = await running(mo);
    await mo.context().close();
    check('solutions-floodlight', `${locale} clubs: the team feed plays when visible and does nothing under reduced motion`, moCount > 0 && rmCount === 0, JSON.stringify({ motion: moCount, reduced: rmCount }));
  }

  // ---------------------------------------------------------- athletes morph
  {
    const text = (page) => page.evaluate(() => document.querySelector('[data-morph]')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
    const rm = await open({ width: 1440, height: 900, reduced: true }, '/solutions/athletes/');
    await settle(rm);
    const r0 = await text(rm);
    await sleep(3200);
    const r1 = await text(rm);
    await rm.context().close();
    const mo = await open({ width: 1440, height: 900 }, '/solutions/athletes/');
    await settle(mo);
    await park(mo);
    const m0 = await text(mo);
    await sleep(3400);
    const m1 = await text(mo);
    const decorative = await mo.evaluate(() => {
      const m = document.querySelector('.sx-morph');
      return Boolean(m?.matches('[aria-hidden="true"]')) && Boolean(document.querySelector('[data-morph]')?.closest('[aria-hidden="true"]'));
    });
    await mo.context().close();
    check('solutions-floodlight', 'athletes: the app morph changes brand with motion allowed, holds its first brand under reduced motion and is hidden from assistive tech', m0 !== m1 && r0 === r1 && decorative, JSON.stringify({ m0, m1, r0, r1, decorative }));
  }

  // ---------------------------------------------------------- about: the A window drifts and rests
  for (const locale of ['en', 'es']) {
    const path = localized(locale, '/about/');
    const probe = (page) =>
      page.evaluate(() => {
        const a = document.querySelector('.sx-a');
        const g = a?.querySelector('.sx-a__glyph');
        const dot = a?.querySelector('.sx-a__dot');
        return {
          role: a?.getAttribute('role'),
          named: Boolean(a?.getAttribute('aria-label')),
          glyph: g ? getComputedStyle(g).animationName : '',
          dot: dot ? getComputedStyle(dot).animationName : '',
          pos: g ? getComputedStyle(g).backgroundPosition : '',
        };
      });
    const rm = await open({ width: 1440, height: 900, reduced: true }, path);
    await settle(rm);
    const r = await probe(rm);
    await rm.context().close();
    const mo = await open({ width: 1440, height: 900 }, path);
    await settle(mo);
    await park(mo);
    await mo.waitForFunction(() => document.querySelector('.sx-hero')?.dataset.ap === 'on', null, { timeout: 5000 }).catch(() => {});
    const m0 = await probe(mo);
    let m1 = m0;
    for (let waited = 0; waited < 4000 && m1.pos === m0.pos; waited += 400) {
      await sleep(400);
      m1 = await probe(mo);
    }
    await mo.context().close();
    check(
      'solutions-floodlight',
      `${locale} about: the "A" window is one named image, drifts with motion allowed and stands still under reduced motion`,
      m0.role === 'img' && m0.named && m0.glyph !== 'none' && m0.dot !== 'none' && m0.pos !== m1.pos && r.glyph === 'none' && r.dot === 'none',
      JSON.stringify({ m0, m1, r }),
    );
  }

  // ---------------------------------------------------------- rendered motion under hover, focus, offscreen and a hidden tab
  await solutionsMotionChecks({ open, settle, check, sleep });

  // ---------------------------------------------------------- contrast measured on the composited pixels, at rest and in motion
  await solutionsPixelContrastChecks({ open, settle, check, sleep });
}
