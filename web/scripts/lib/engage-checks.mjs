// Evidence checks for the five Platform pages, EN and ES. Called from evidence.mjs with its page opener,
// check recorder and screenshot helpers.
//   node scripts/evidence.mjs --engage-only          (these checks plus screenshots)
//   node scripts/evidence.mjs --engage-only --checks-only
import { contrastProbe } from './contrast.mjs';
import { engagePages } from './engage-verify.mjs';

const widths = [390, 1024, 1280, 1440];

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

  for (const p of engagePages) {
    const label = `${p.lang}/${names[p.slug]}`;

    // 1. No horizontal overflow at the four widths the brief names.
    for (const width of widths) {
      const page = await open({ width, height: width < 500 ? 844 : 900, reduced: true, mobile: width < 500 }, p.path);
      await settle(page);
      const o = await page.evaluate(overflowProbe);
      check(group, `${label}: no horizontal overflow at ${width}px`, o.scrollWidth <= o.vw && o.wideCount === 0, `scrollWidth ${o.scrollWidth} vs ${o.vw}${o.wideCount ? `, wide: ${o.wide.join('; ')}` : ''}`);
      if (width === 1440) {
        const a = await page.evaluate(a11yProbe);
        check(group, `${label}: every image has an alt attribute`, a.noAlt.length === 0, a.noAlt.join(', '));
        check(group, `${label}: nothing focusable sits inside aria-hidden`, a.hiddenTabCount === 0, a.hiddenTab.join('; '));
        check(group, `${label}: one h1 and no skipped heading level`, a.h1 === 1 && a.skipped.length === 0, a.skipped.join('; '));
        check(group, `${label}: page problems (console errors, 4xx, failed requests)`, page.problems.length === 0, page.problems.slice(0, 3).join('; '));
      }
      await page.context().close();
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

    // Messaging: the three chat bubbles arrive in order and all end visible.
    {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/messaging/`);
      await page.locator('[data-chat]').scrollIntoViewIfNeeded();
      await sleep(1700);
      const state = await page.evaluate(() => {
        const bubbles = [...document.querySelectorAll('[data-chat] .bubble')];
        return { total: bubbles.length, shown: bubbles.filter((b) => b.classList.contains('is-in') && getComputedStyle(b).opacity === '1').length };
      });
      check(group, `${lang}/messaging: chat bubbles play in and all ${state.total} end visible`, state.total === 3 && state.shown === 3, `${state.shown}/${state.total}`);
      if (!checksOnly) await shot(page, `engage-${lang}-messaging-chat-played`, { fullPage: false });
      await page.context().close();

      const reduced = await open({ width: 1440, height: 900, reduced: true }, `${base}/platform/messaging/`);
      const all = await reduced.evaluate(() => [...document.querySelectorAll('[data-chat] .bubble')].every((b) => getComputedStyle(b).opacity === '1'));
      check(group, `${lang}/messaging: with reduced motion every bubble is visible at once`, all);
      await reduced.context().close();
    }

    // Guardian: child switcher Sofia/Mateo, by click and by arrow keys; inactive panel is inert.
    {
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

    // Teams: school price is US by default and LatAm with ?region=latam.
    {
      const read = async (query, init) => {
        const page = await open({ width: 1440, height: 900, init }, `${base}/platform/teams/${query}`);
        await settle(page);
        const price = await page.evaluate(() => document.querySelector('[data-region-price]')?.textContent?.trim());
        const us = await page.evaluate(() => document.querySelector('[data-region-price]')?.dataset.us);
        const latam = await page.evaluate(() => document.querySelector('[data-region-price]')?.dataset.latam);
        if (!checksOnly && query) await shot(page, `engage-${lang}-teams-latam`, { fullPage: false, clip: { x: 0, y: 0, width: 1440, height: 900 } });
        await page.context().close();
        return { price, us, latam };
      };
      const us = await read('');
      const latam = await read('?region=latam');
      const forcedUs = await read('?region=us');
      check(group, `${lang}/teams: school price defaults to the US price`, us.price === us.us && us.us === '$99', JSON.stringify(us));
      check(group, `${lang}/teams: ?region=latam shows the LatAm price`, latam.price === latam.latam && latam.latam === '$69', JSON.stringify(latam));
      check(group, `${lang}/teams: ?region=us forces the US price`, forcedUs.price === '$99', JSON.stringify(forcedUs));
      const bogota = await read('', () => {
        const real = Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions = function () {
          return { ...real.call(this), timeZone: 'America/Bogota' };
        };
      });
      check(group, `${lang}/teams: a Bogota time zone shows the LatAm price`, bogota.price === '$69', JSON.stringify(bogota));
    }

    // Teams: the reports anchor exists, so the shared reports route lands on the right tile.
    {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/teams/#reports`);
      await settle(page);
      const exists = await page.evaluate(() => Boolean(document.getElementById('reports')));
      check(group, `${lang}/teams: #reports anchor exists`, exists);
      await page.context().close();
    }

    // Integrations: Coming line has no links and no logos.
    {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/integrations/`);
      const coming = await page.evaluate(() => {
        const p = [...document.querySelectorAll('p')].find((x) => /garmin/i.test(x.textContent));
        return { text: p?.textContent?.trim() ?? '', links: p?.querySelectorAll('a, img, svg').length ?? -1 };
      });
      check(group, `${lang}/integrations: Garmin, Strava and Polar are plain text, no links or logos`, coming.links === 0 && /garmin.*strava.*polar/i.test(coming.text), JSON.stringify(coming));
      await page.context().close();
    }

    // Branded: the fan shows the four apps.
    {
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/custom-branded-apps/`);
      const apps = await page.evaluate(() => [...document.querySelectorAll('.fan__item')].map((li) => li.querySelector('.bp__name')?.textContent?.trim()));
      check(group, `${lang}/branded: four named example apps in the fan`, apps.length === 4 && apps.every(Boolean), apps.join(' | '));
      await page.context().close();
    }
  }
}
