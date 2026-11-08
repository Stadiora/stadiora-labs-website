// Evidence checks for the five Platform pages, EN and ES. Called from evidence.mjs with its page opener,
// check recorder and screenshot helpers.
//   node scripts/evidence.mjs --engage-only          (these checks plus screenshots)
//   node scripts/evidence.mjs --engage-only --checks-only
import { clipProbe } from './clip-probe.mjs';
import { contrastProbe } from './contrast.mjs';
import { engageA11yChecks } from './engage-a11y-checks.mjs';
import { engageHeadingContrast } from './engage-heading-contrast.mjs';
import { engagePages } from './engage-verify.mjs';
import { EDU, fmt } from './pricing-oracle.mjs';

const widths = [390, 1024, 1280, 1440];
// Every page carries a live demo (a phone, a panel, an orbit) that loses its minimum width between the four
// required widths, so the clipping check also sweeps all five.
const sweepWidths = [360, 414, 480, 600, 720, 900, 1100, 1180, 1181, 1240, 1280, 1320, 1360, 1400, 1440, 1600];
const sweepPages = ['messaging', 'guardian', 'teams', 'branded', 'integrations'];

const names = {
  messaging: 'messaging',
  'guardian-portal': 'guardian',
  teams: 'teams',
  'custom-branded-apps': 'branded',
  integrations: 'integrations',
};

// In page: anything wider than the viewport that no ancestor clips, and the first few offenders.
const overflowProbe = () => {
  const vw = document.documentElement.clientWidth;
  const clipped = (e) => {
    for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).overflowX !== 'visible') return true;
    }
    return false;
  };
  const wide = [];
  for (const e of document.body.querySelectorAll('*')) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > vw + 0.5 || r.left < -0.5) {
      if (!clipped(e)) wide.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
  }
  return { vw, scrollWidth: document.documentElement.scrollWidth, wide: wide.slice(0, 6), wideCount: wide.length };
};

// In page: images without alt, focusable elements under aria-hidden (a keyboard user lands on something a
// screen reader cannot see), heading order. Elements the browser cannot focus (visibility:hidden, display:none) are fine.
const a11yProbe = () => {
  const noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.currentSrc.slice(-40));
  const focusable = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')].filter(
    (e) => !e.matches('[disabled], [tabindex="-1"]') && !e.closest('[inert]') && getComputedStyle(e).visibility !== 'hidden' && e.getClientRects().length > 0,
  );
  const hiddenTab = focusable.filter((e) => e.closest('[aria-hidden="true"]')).map((e) => `${e.tagName.toLowerCase()} ${String(e.className).split(' ')[0] || e.textContent.trim().slice(0, 20)}`);
  const h1 = document.querySelectorAll('h1').length;
  const skipped = [];
  let last = 0;
  for (const h of document.querySelectorAll('main h1, main h2, main h3, main h4')) {
    const level = Number(h.tagName[1]);
    if (last && level > last + 1) skipped.push(`${h.tagName} after H${last}: ${h.textContent.trim().slice(0, 30)}`);
    last = level;
  }
  return { noAlt, hiddenTab: hiddenTab.slice(0, 8), hiddenTabCount: hiddenTab.length, h1, skipped };
};

export async function engageChecks({ open, check, shot, sleep, settle, checksOnly, metrics }) {
  const group = 'engage';
  // ENGAGE_ONLY=messaging,teams runs just those pages (used to mutation-prove one guard quickly); unset runs all.
  const only = process.env.ENGAGE_ONLY?.split(',');
  const on = (slug) => !only || only.includes(slug);

  for (const p of engagePages.filter((x) => on(x.slug))) {
    const label = `${p.lang}/${names[p.slug]}`;

    // 1. No horizontal overflow at the four widths the brief names.
    for (const width of widths) {
      const page = await open({ width, height: width < 500 ? 844 : 900, reduced: true, mobile: width < 500 }, p.path);
      await settle(page);
      const o = await page.evaluate(overflowProbe);
      check(group, `${label}: no horizontal overflow at ${width}px`, o.scrollWidth <= o.vw && o.wideCount === 0, `scrollWidth ${o.scrollWidth} vs ${o.vw}${o.wideCount ? `, wide: ${o.wide.join('; ')}` : ''}`);
      const k = await page.evaluate(clipProbe);
      check(group, `${label}: no visible text is cut off by a clipping ancestor at ${width}px`, k.cutCount === 0, `${k.checked} text elements${k.cutCount ? `, cut: ${k.cut.join('; ')}` : ''}`);
      if (width === 1440) {
        const a = await page.evaluate(a11yProbe);
        check(group, `${label}: every image has an alt attribute`, a.noAlt.length === 0, a.noAlt.join(', '));
        check(group, `${label}: nothing focusable sits inside aria-hidden`, a.hiddenTabCount === 0, a.hiddenTab.join('; '));
        check(group, `${label}: one h1 and no skipped heading level`, a.h1 === 1 && a.skipped.length === 0, a.skipped.join('; '));
        check(group, `${label}: page problems (console errors, 4xx, failed requests)`, page.problems.length === 0, page.problems.slice(0, 3).join('; '));
      }
      await page.context().close();
    }

    // 1b. The same clipping check at in-between widths for the pages that wrap their demo content.
    if (sweepPages.includes(names[p.slug])) {
      const failures = [];
      for (const width of sweepWidths) {
        const page = await open({ width, height: width < 500 ? 844 : 900, reduced: true, mobile: width < 500 }, p.path);
        await settle(page);
        const k = await page.evaluate(clipProbe);
        if (k.cutCount) failures.push(`${width}px: ${k.cut.slice(0, 2).join('; ')}`);
        await page.context().close();
      }
      check(group, `${label}: no visible text is cut off at ${sweepWidths.length} widths from ${sweepWidths[0]} to ${sweepWidths.at(-1)}px`, failures.length === 0, failures.join(' | '));
    }

    // 2. WCAG AA in both themes, aria-hidden demo text included.
    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 1440, height: 900, scheme, reduced: true }, p.path);
      await settle(page);
      const c = await page.evaluate(contrastProbe, { includeAriaHidden: true });
      check(group, `${label}/${scheme}: text meets WCAG AA (4.5:1, 3:1 large)`, c.failCount === 0, `${c.checked} text nodes, lowest ${c.min.toFixed(2)}:1${c.failCount ? `, failing: ${JSON.stringify(c.fails)}` : ''}; ${c.skippedImage} over images skipped`);
      metrics[`contrast-${label}-${scheme}`] = { checked: c.checked, lowest: Number(c.min.toFixed(2)), overImagesSkipped: c.skippedImage };
      await page.context().close();
    }
  }

  // 3. Interactions, English and Spanish.
  for (const lang of ['en', 'es']) {
    const base = lang === 'en' ? '' : '/es';

    // Messaging: the live phone is one autotabs set of four scenes. Reduced motion shows the first scene finished;
    // by hand a click and the arrow keys switch scenes, and the tab ARIA follows.
    if (on('messaging')) {
      const reduced = await open({ width: 1440, height: 900, reduced: true }, `${base}/platform/messaging/`);
      await settle(reduced);
      const fin = await reduced.evaluate(() => {
        const msgs = [...document.querySelectorAll('#eg-p0 .dmsg')];
        return { total: msgs.length, shown: msgs.filter((m) => getComputedStyle(m).opacity === '1').length, why: document.querySelector('.eg-live')?.getAttribute('data-ap-why') };
      });
      check(group, `${lang}/messaging: with reduced motion the first scene shows every message at once`, fin.total >= 3 && fin.shown === fin.total && fin.why === 'reduced', JSON.stringify(fin));
      await reduced.context().close();

      const page = await open({ width: 1440, height: 900 }, `${base}/platform/messaging/`);
      await settle(page);
      const read = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.eg-live [role="tab"]')].map((t) => {
            const panel = document.getElementById(t.getAttribute('aria-controls'));
            return { sel: t.getAttribute('aria-selected'), tab: t.tabIndex, on: panel?.classList.contains('on'), role: panel?.getAttribute('role'), by: panel?.getAttribute('aria-labelledby') === t.id };
          }),
        );
      let s = await read();
      check(group, `${lang}/messaging: the live phone has four tabs, each controlling a labelled tabpanel`, s.length === 4 && s.every((x) => x.role === 'tabpanel' && x.by), JSON.stringify(s));
      check(group, `${lang}/messaging: the first scene is selected and visible at load`, s[0]?.sel === 'true' && s[0].on && s.slice(1).every((x) => x.sel === 'false' && !x.on && x.tab === -1), JSON.stringify(s));
      await page.locator('.eg-live [role="tab"]').nth(2).click();
      await sleep(500);
      s = await read();
      check(group, `${lang}/messaging: a click on the third tab swaps the scene`, s[2].sel === 'true' && s[2].on && !s[0].on, JSON.stringify(s));
      if (!checksOnly) {
        await page.locator('.eg-live').scrollIntoViewIfNeeded();
        await sleep(2200);
        await shot(page, `engage-${lang}-messaging-broadcast`, { fullPage: false });
      }
      await page.locator('.eg-live [role="tab"]').nth(2).focus();
      await page.keyboard.press('ArrowRight');
      await sleep(400);
      s = await read();
      check(group, `${lang}/messaging: ArrowRight moves to the fourth scene`, s[3].sel === 'true' && s[3].on && !s[2].on, JSON.stringify(s));
      await page.keyboard.press('Home');
      await sleep(400);
      s = await read();
      check(group, `${lang}/messaging: Home returns to the first scene`, s[0].sel === 'true' && s[0].on, JSON.stringify(s));
      await page.context().close();
    }

    // Guardian: child switcher Sofia/Mateo, by click and by arrow keys; inactive panel is inert.
    if (on('guardian-portal')) {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/guardian-portal/`);
      await settle(page);
      const tabs = page.locator('[role="tab"]');
      check(group, `${lang}/guardian: two child tabs`, (await tabs.count()) === 2, String(await tabs.count()));
      const read = () =>
        page.evaluate(() => {
          const t = [...document.querySelectorAll('[role="tab"]')];
          return t.map((x) => ({ sel: x.getAttribute('aria-selected'), tab: x.tabIndex, panelInert: document.getElementById(x.getAttribute('aria-controls'))?.hasAttribute('inert') }));
        });
      let s = await read();
      check(group, `${lang}/guardian: first child is selected, second panel is inert`, s[0].sel === 'true' && s[1].sel === 'false' && s[0].panelInert === false && s[1].panelInert === true, JSON.stringify(s));
      await tabs.nth(1).click();
      await sleep(500);
      s = await read();
      check(group, `${lang}/guardian: click on the second child swaps the panel`, s[1].sel === 'true' && s[0].panelInert === true && s[1].panelInert === false, JSON.stringify(s));
      if (!checksOnly) {
        await page.locator('.how__stage').scrollIntoViewIfNeeded();
        await sleep(400);
        await shot(page, `engage-${lang}-guardian-mateo`, { fullPage: false });
      }
      await tabs.nth(1).focus();
      await page.keyboard.press('ArrowLeft');
      await sleep(400);
      s = await read();
      check(group, `${lang}/guardian: ArrowLeft returns to the first child`, s[0].sel === 'true' && s[1].sel === 'false', JSON.stringify(s));
      const mateo = await page.evaluate(() => document.querySelector('[role="tabpanel"]:not([inert])')?.textContent?.trim().slice(0, 40) ?? '');
      check(group, `${lang}/guardian: the active panel has content`, mateo.length > 5, mateo);
      await page.context().close();
    }

    // Teams and Pricing read the same price table and region code (src/data/prices.ts, src/lib/region.ts), so for the
    // same visitor they must show the same schools price. Expected values come from the hand-typed oracle, not the table.
    if (on('teams')) {
      const read = async (path, { timezoneId, init } = {}) => {
        const page = await open({ width: 1440, height: 900, timezoneId, init }, path);
        const teams = path.includes('/platform/teams/');
        if (!teams) await page.waitForSelector('[data-pricing][data-ready]', { state: 'attached', timeout: 4000 }).catch(() => {});
        const got = await page.evaluate((isTeams) => {
          const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;
          return isTeams
            ? { price: text('[data-school="price"]'), athletes: text('[data-school="athletes"]') }
            : { price: text('[data-edu-rate="highSchool"]'), from: text('[data-schools-from]') };
        }, teams);
        if (!checksOnly && teams && path.endsWith('?region=latam')) {
          const box = await page.locator('section[aria-labelledby="schools-title"]').boundingBox();
          if (box) await shot(page, `engage-${lang}-teams-schools-latam`, { fullPage: true, clip: { x: 0, y: box.y + (await page.evaluate(() => scrollY)), width: 1440, height: box.height } });
        }
        await page.context().close();
        return got;
      };
      const cases = [
        ['?region=us', 'us', { query: '?region=us' }],
        ['?region=latam', 'latam', { query: '?region=latam' }],
        ['New York time zone, no query', 'us', { timezoneId: 'America/New_York' }],
        ['a ?region=us override beats a Bogota time zone', 'us', { query: '?region=us', timezoneId: 'America/Bogota' }],
        ['a ?region=nonsense is ignored (Bogota time zone)', 'latam', { query: '?region=nonsense', timezoneId: 'America/Bogota' }],
        ['missing time zone', 'us', { init: () => { Intl.DateTimeFormat.prototype.resolvedOptions = () => ({}); } }],
        // Zones the first version of this page got wrong (its own list was shorter than the Pricing lane's).
        ...[
          ['Pacific/Galapagos', 'latam'],
          ['Pacific/Easter', 'latam'],
          ['America/Nassau', 'latam'],
          ['America/Catamarca', 'latam'],
          ['America/Bogota', 'latam'],
          ['America/Santiago', 'latam'],
          ['America/Havana', 'latam'],
          ['America/Puerto_Rico', 'us'],
          ['America/St_Thomas', 'us'],
          ['Europe/Madrid', 'us'],
        ].map(([zone, region]) => [`${zone} time zone`, region, { timezoneId: zone }]),
      ];
      for (const [name, region, { query = '', ...visitor }] of cases) {
        const want = fmt(EDU[region][0]);
        const teams = await read(`${base}/platform/teams/${query}`, visitor);
        const pricing = await read(`${base}/pricing/${query}`, visitor);
        const ok = teams.price === want && pricing.price === want && pricing.from === want && teams.athletes === '100';
        check(group, `${lang}: Teams and Pricing both show the ${region === 'us' ? 'US' : 'LatAm'} schools price ${want} for ${name}`, ok, JSON.stringify({ teams, pricing }));
      }
    }

    // Teams: the reports anchor exists, so the shared reports route lands on the right tile.
    if (on('teams')) {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/teams/#reports`);
      await settle(page);
      const exists = await page.evaluate(() => Boolean(document.getElementById('reports')));
      check(group, `${lang}/teams: #reports anchor exists`, exists);
      await page.context().close();
    }

    // Integrations: Coming line has no links and no logos.
    if (on('integrations')) {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/integrations/`);
      const coming = await page.evaluate(() => {
        const p = [...document.querySelectorAll('p')].find((x) => /garmin/i.test(x.textContent));
        return { text: p?.textContent?.trim() ?? '', links: p?.querySelectorAll('a, img, svg').length ?? -1 };
      });
      check(group, `${lang}/integrations: Garmin, Strava and Polar are plain text, no links or logos`, coming.links === 0 && /garmin.*strava.*polar/i.test(coming.text), JSON.stringify(coming));
      await page.context().close();
    }

    // Branded: the fan shows the three apps.
    if (on('custom-branded-apps')) {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/custom-branded-apps/`);
      const apps = await page.evaluate(() => [...document.querySelectorAll('.fan__item')].map((li) => li.querySelector('.bp__name')?.textContent?.trim()));
      check(group, `${lang}/branded: the fan shows Run with Aria, Aria 12 and FitMG, in that order`, JSON.stringify(apps) === JSON.stringify(['Run with Aria', 'Aria 12', 'FitMG']), apps.join(' | '));
      await page.context().close();
    }
  }

  // The home bundle stays as the home lane built it. An engage component that imports a styles/home/*.css sheet makes
  // the bundler split it out of Home.css into a stylesheet both pages link: one more render-blocking request on the
  // home and a layout shift in the mobile CLS guard (0.12). Engage pages pull those sheets in through
  // styles/engage/home-*.css (CSS @import), so no stylesheet other than the global Base is shared with the home.
  for (const lang of ['en', 'es']) {
    const base = lang === 'en' ? '' : '/es';
    const page = await open({ width: 1440, height: 900, reduced: true }, `${base}/`);
    const shared = await page.evaluate(
      async ({ home, others }) => {
        const sheets = async (path) => {
          const doc = new DOMParser().parseFromString(await (await fetch(path)).text(), 'text/html');
          return [...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href').split('/').pop());
        };
        const homeSheets = await sheets(home);
        const out = [];
        for (const path of others) {
          for (const s of await sheets(path)) if (homeSheets.includes(s) && !s.startsWith('Base.')) out.push(`${s} (${path})`);
        }
        return { homeSheets, out };
      },
      { home: `${base}/`, others: engagePages.filter((x) => x.lang === lang).map((x) => x.path) },
    );
    check(group, `${lang}: no stylesheet is shared between the home and the engage pages except the global Base`, shared.out.length === 0, shared.out.length ? `shared: ${shared.out.join(', ')}` : `home links ${shared.homeSheets.join(', ')}`);
    await page.context().close();
  }

  // Review round 1 (PR #34): what the accessibility tree exposes, 44 px targets, and the contrast of the gradient headings on the
  // composited pixels (scripts/lib/engage-a11y-checks.mjs, engage-heading-contrast.mjs).
  await engageA11yChecks({ open, check, sleep, settle });
  await engageHeadingContrast({ open, check, settle, metrics });
}
