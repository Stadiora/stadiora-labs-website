// Evidence checks and screenshots for the solutions, resources and company pages (schools, coaches, clubs,
// athletes, case studies, about, contact; EN and ES). Called from evidence.mjs with its page opener and recorders.
import { mkdir } from 'node:fs/promises';
import { solutionsPriceChecks } from './solutions-price-checks.mjs';

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
const everyPage = pages.flatMap(([name, path]) => ['en', 'es'].map((locale) => ({ name, locale, path: localized(locale, path), label: `${locale}${path}` })));

// Runs in the page: horizontal overflow, plus any text that paints over other text.
const layout = () => {
  const vw = document.documentElement.clientWidth;
  const overflow = document.documentElement.scrollWidth - vw;
  const shown = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      if (n.hasAttribute('inert') || n.hasAttribute('hidden') || n.tagName === 'TEMPLATE') return false;
    }
    return true;
  };
  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const e = node.parentElement;
    if (!node.textContent.trim() || !e || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(e.tagName)) continue;
    if (!shown(e) || e.closest('.skip-link, .sr-only, .sr, [data-decorative]') || getComputedStyle(e).position === 'fixed') continue;
    // Closed <details> bodies and text cut off by an overflow:hidden ancestor are not painted.
    const closed = e.closest('details:not([open])');
    if (closed && !e.closest('summary')) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    // A tight display line (line-height under the font's own height) paints well inside its content area: judge it by its ink.
    const cs0 = getComputedStyle(e);
    const lineHeight = Number.parseFloat(cs0.lineHeight);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs0.fontStyle} ${cs0.fontWeight} ${cs0.fontSize} ${cs0.fontFamily}`;
    const m = ctx.measureText(cs0.textTransform === 'uppercase' ? node.textContent.toUpperCase() : node.textContent);
    for (const r of range.getClientRects()) {
      const tight = lineHeight > 0 && lineHeight < r.height;
      const top = tight ? r.top + (m.fontBoundingBoxAscent - m.actualBoundingBoxAscent) : r.top;
      const bottom = tight ? r.bottom - (m.fontBoundingBoxDescent - m.actualBoundingBoxDescent) : r.bottom;
      let box = { left: r.left, right: r.right, top, bottom };
      for (let n = e.parentElement; n && n !== document.documentElement && box; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        const c = n.getBoundingClientRect();
        box = { left: Math.max(box.left, c.left), right: Math.min(box.right, c.right), top: Math.max(box.top, c.top), bottom: Math.min(box.bottom, c.bottom) };
        if (box.right <= box.left || box.bottom <= box.top) box = null;
      }
      if (!box || box.right - box.left < 2 || box.bottom - box.top < 2) continue;
      runs.push({ e, text: node.textContent.trim().slice(0, 28), left: box.left, right: box.right, top: box.top + window.scrollY, bottom: box.bottom + window.scrollY });
    }
  }
  const overlaps = [];
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const a = runs[i];
      const b = runs[j];
      if (a.e === b.e || a.e.contains(b.e) || b.e.contains(a.e)) continue;
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 2 && y > 2) overlaps.push(`"${a.text}" x "${b.text}" (${x.toFixed(0)}x${y.toFixed(0)}px)`);
    }
  }
  return { overflow, overlaps: overlaps.slice(0, 6), overlapCount: overlaps.length, runs: runs.length };
};

// Runs in the page: where the offending elements are, for the failure detail.
const wide = () => {
  const vw = document.documentElement.clientWidth;
  return [...document.querySelectorAll('body *')]
    .filter((e) => e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== 'fixed' && e.getClientRects().length)
    .slice(0, 4)
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`);
};

// Tab through the whole page. Report any stop with no focus indicator, and any stop that is not actually visible.
async function focusProblems(page, stops = 220) {
  const missing = [];
  const hidden = [];
  let seen = 0;
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      // A transparent radio laid over its label is a standard pattern: the label's text is the visible control.
      const overlay = e.matches('input[type="radio"], input[type="checkbox"]') && parseFloat(cs.opacity) === 0 && r.width >= 44 && r.height >= 44 ? e.nextElementSibling : null;
      const shown = overlay ? getComputedStyle(overlay) : cs;
      const outline = shown.outlineStyle !== 'none' && parseFloat(shown.outlineWidth) >= 2;
      const ring = shown.boxShadow !== 'none';
      const unseen = !overlay && (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) || Boolean(e.closest('[aria-hidden="true"], [inert]'));
      return { name: `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''} "${(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24)}"`, ok: outline || ring, unseen };
    });
    if (!info) break;
    seen++;
    if (!info.ok) missing.push(info.name);
    if (info.unseen) hidden.push(info.name);
  }
  return { seen, missing, hidden };
}

export async function solutionsChecks({ open, settle: settleRaw, check, sleep, metrics, measure, outDir, checksOnly }) {
  // settle() ends with scrollTo(0, 0), which global.css turns into a smooth scroll that is still running when a check
  // starts measuring; a sticky header then reads as overlapping the first section. Finish at the top before measuring.
  const settle = async (page) => {
    await settleRaw(page);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await page.waitForFunction(() => window.scrollY === 0);
  };

  const shotsDir = `${outDir}solutions/`;
  await mkdir(shotsDir, { recursive: true });

  // ---------------------------------------------------------- layout at four widths, console, requests
  for (const { label, path } of everyPage) {
    const problems = [];
    for (const [width, height] of [
      [390, 844],
      [1024, 768],
      [1280, 800],
      [1440, 900],
    ]) {
      const page = await open({ width, height, reduced: true, mobile: width < 500 }, path);
      await settle(page);
      const l = await page.evaluate(layout);
      if (l.overflow > 0) problems.push(`${width}px: overflows by ${l.overflow}px (${(await page.evaluate(wide)).join(', ')})`);
      if (l.overlapCount) problems.push(`${width}px: ${l.overlapCount} text overlaps, e.g. ${l.overlaps.slice(0, 3).join('; ')}`);
      if (width === 1440) problems.push(...page.problems.map((p) => `request/console: ${p}`));
      await page.context().close();
    }
    check('solutions-layout', `${label}: no horizontal overflow and no overlapping text at 390, 1024, 1280 and 1440`, problems.length === 0, problems.join(' | '));
  }

  // ---------------------------------------------------------- contrast and hit targets
  for (const { label, path } of everyPage) {
    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 1440, height: 900, scheme, reduced: true }, path);
      await settle(page);
      const c = await page.evaluate(measure.contrast);
      check('solutions-contrast', `${label} ${scheme}: text meets WCAG AA (4.5:1, 3:1 large)`, c.failCount === 0, `${c.checked} text nodes, lowest ${c.min.toFixed(2)}:1${c.failCount ? `, failing: ${JSON.stringify(c.fails)}` : ''}; ${c.skippedImage} over images skipped`);
      metrics[`contrast-${label}-${scheme}`] = { checked: c.checked, lowest: Number(c.min.toFixed(2)) };
      await page.context().close();
    }
    const mobile = await open({ width: 390, height: 844, reduced: true, mobile: true }, path);
    await settle(mobile);
    const t = await mobile.evaluate(measure.targets);
    check('solutions-targets', `${label} at 390: every button, tab and block link is >= 44px`, t.smallCount === 0, `${t.checked} controls, smallest ${t.minW}x${t.minH}${t.smallCount ? `, under: ${JSON.stringify(t.small)}` : ''}`);
    await mobile.context().close();
  }

  // ---------------------------------------------------------- accessibility: alt text, landmarks, focus, no-JS
  for (const { label, path } of everyPage) {
    const page = await open({ width: 1440, height: 900, reduced: true }, path);
    const facts = await page.evaluate(() => ({
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      emptyAltInContent: [...document.images].filter((i) => i.getAttribute('alt') === '' && !i.closest('[aria-hidden="true"]') && i.closest('main')).length,
      h1: document.querySelectorAll('h1').length,
      main: document.querySelectorAll('main').length,
      lang: document.documentElement.lang,
    }));
    check('solutions-a11y', `${label}: every image has alt, one h1, one main, lang set`, facts.noAlt === 0 && facts.h1 === 1 && facts.main === 1 && Boolean(facts.lang), JSON.stringify(facts));
    const focus = await focusProblems(page);
    check('solutions-a11y', `${label}: all ${focus.seen} tab stops show a focus indicator`, focus.missing.length === 0 && focus.seen > 10, focus.missing.slice(0, 5).join('; '));
    check('solutions-a11y', `${label}: nothing tabbable is hidden (zero size, invisible, aria-hidden or inert)`, focus.hidden.length === 0, focus.hidden.slice(0, 5).join('; '));
    await page.context().close();

    const plain = await open({ width: 1440, height: 900, js: false }, path);
    const noJs = await plain.evaluate(() => {
      const hiddenReveal = [...document.querySelectorAll('[data-reveal]')].filter((e) => parseFloat(getComputedStyle(e).opacity) === 0).length;
      const h1 = document.querySelector('h1');
      return { hiddenReveal, h1: Boolean(h1 && h1.getBoundingClientRect().height > 0), jsClass: document.documentElement.classList.contains('js') };
    });
    check('solutions-nojs', `${label} without JavaScript: content is visible (no reveal blanks)`, noJs.hiddenReveal === 0 && noJs.h1 && !noJs.jsClass, JSON.stringify(noJs));
    await plain.context().close();
  }

  // ---------------------------------------------------------- region pricing: teasers equal /pricing (solutions-price-checks.mjs)
  await solutionsPriceChecks({ open, check });

  // ---------------------------------------------------------- clubs: squad tabs by keyboard and click
  for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, localized(locale, '/solutions/teams-and-clubs/'));
    await settle(page);
    const state = () =>
      page.evaluate(() => {
        const tabs = [...document.querySelectorAll('.squad__tabs [role="tab"]')];
        return {
          selected: tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'),
          focused: tabs.findIndex((t) => t === document.activeElement),
          count: tabs.length,
          activePanels: [...document.querySelectorAll('.squad__panel[data-active]')].length,
          inertPanels: [...document.querySelectorAll('.squad__panel[inert]')].length,
          tabindex: tabs.map((t) => t.tabIndex).join(','),
        };
      });
    const first = await state();
    await page.locator('.squad__tabs [role="tab"]').nth(first.selected).focus();
    await page.keyboard.press('Home');
    const home = await state();
    await page.keyboard.press('ArrowRight');
    const right = await state();
    await page.keyboard.press('End');
    const end = await state();
    await page.keyboard.press('ArrowRight');
    const wrapped = await state();
    await page.locator('.squad__tabs [role="tab"]').nth(2).click();
    const clicked = await state();
    const ok =
      first.count >= 3 &&
      home.selected === 0 && home.focused === 0 &&
      right.selected === 1 && right.focused === 1 &&
      end.selected === first.count - 1 &&
      wrapped.selected === 0 &&
      clicked.selected === 2 && clicked.activePanels === 1 && clicked.inertPanels === first.count - 1;
    check('solutions-tabs', `${locale} clubs: squad tabs work by arrow keys, Home, End, wrap and click; one active panel, the rest inert`, ok, JSON.stringify({ first, right, end, wrapped, home, clicked }));
    await page.context().close();
  }

  // ---------------------------------------------------------- case studies: outcome chips
  for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, localized(locale, '/resources/case-studies/'));
    await settle(page);
    const chips = page.locator('[data-outcome]');
    const n = await chips.count();
    const pressed = () => page.evaluate(() => [...document.querySelectorAll('[data-outcome]')].map((c) => c.getAttribute('aria-pressed')).join(','));
    const initial = await pressed();
    await chips.nth(2).click();
    const afterClick = await pressed();
    const url = page.url();
    const emptyShown = await page.locator('[data-outcome-empty]').isVisible();
    const filterText = (await page.locator('[data-empty-outcome]').innerText()).trim();
    await page.keyboard.press('Tab');
    await chips.first().click();
    const reset = await pressed();
    const resetUrl = page.url();
    check(
      'solutions-chips',
      `${locale} case studies: ${n} outcome chips are single-select, keep state in ?outcome=, and show an honest empty state`,
      n === 6 && initial.startsWith('true,false') && afterClick === 'false,false,true,false,false,false' && /[?&]outcome=team/.test(url) && emptyShown && filterText.length > 10 && reset.startsWith('true,') && !/outcome=/.test(resetUrl),
      JSON.stringify({ initial, afterClick, url, emptyShown, filterText, reset }),
    );
    await page.context().close();

    const direct = await open({ width: 1440, height: 900, reduced: true }, `${localized(locale, '/resources/case-studies/')}?outcome=overload`);
    const preset = await direct.evaluate(() => [...document.querySelectorAll('[data-outcome]')].map((c) => c.getAttribute('aria-pressed')).join(','));
    check('solutions-chips', `${locale} case studies: ?outcome=overload preselects the matching chip`, preset === 'false,false,false,false,false,true', preset);
    await direct.context().close();
  }

  // ---------------------------------------------------------- about: team popovers
  for (const locale of ['en', 'es']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, localized(locale, '/about/'));
    await settle(page);
    const people = page.locator('details[data-person]');
    const count = await people.count();
    const open_ = () => page.evaluate(() => [...document.querySelectorAll('details[data-person]')].filter((d) => d.open).length);
    await people.nth(0).locator('summary').click();
    const one = await open_();
    await people.nth(3).locator('summary').click();
    const two = await open_();
    const secondOpen = await people.nth(3).evaluate((d) => d.open);
    await page.keyboard.press('Escape');
    const afterEsc = await open_();
    const focusBack = await page.evaluate(() => document.activeElement?.tagName === 'SUMMARY');
    await people.nth(1).locator('summary').click();
    await page.mouse.click(8, 300);
    const afterOutside = await open_();
    await people.nth(2).locator('summary').click();
    await people.nth(2).locator('[data-person-close]').click();
    const afterClose = await open_();
    check(
      'solutions-about',
      `${locale} about: ${count} team cards; one bio open at a time; Escape, outside click and Close dismiss it; focus returns to the card`,
      count === 12 && one === 1 && two === 1 && secondOpen && afterEsc === 0 && focusBack && afterOutside === 0 && afterClose === 0,
      JSON.stringify({ count, one, two, secondOpen, afterEsc, focusBack, afterOutside, afterClose }),
    );
    await page.context().close();
  }

  // ---------------------------------------------------------- screenshots
  if (checksOnly) return;
  const shotPages = everyPage;
  for (const { name, locale, path } of shotPages) {
    for (const scheme of ['light', 'dark']) {
      for (const [width, height] of [
        [1440, 900],
        [390, 844],
      ]) {
        const page = await open({ width, height, scheme, reduced: true, mobile: width < 500 }, path);
        await settle(page);
        await page.addStyleTag({ content: '.nav{position:absolute!important}' });
        await page.screenshot({ path: `${shotsDir}${name}-${locale}-${scheme}-${width}.jpg`, type: 'jpeg', quality: 82, fullPage: true });
        await page.context().close();
      }
    }
  }

  // Interactive states
  {
    const page = await open({ width: 1440, height: 900, reduced: true }, '/solutions/teams-and-clubs/');
    await settle(page);
    for (const [i, id] of [[0, 'first'], [1, 'second'], [2, 'third']]) {
      await page.locator('.squad__tabs [role="tab"]').nth(i).click();
      await sleep(400);
      await page.locator('.squad').first().screenshot({ path: `${shotsDir}interaction-clubs-tab-${id}.jpg`, type: 'jpeg', quality: 82 });
    }
    await page.context().close();
  }
  {
    const page = await open({ width: 1440, height: 900, reduced: true }, '/resources/case-studies/');
    await settle(page);
    await page.locator('[data-outcome]').nth(2).click();
    await sleep(400);
    await page.locator('.cs').first().screenshot({ path: `${shotsDir}interaction-case-studies-chip-selected.jpg`, type: 'jpeg', quality: 82 });
    await page.context().close();
  }
  {
    const page = await open({ width: 1440, height: 900, reduced: true }, '/about/');
    await settle(page);
    await page.locator('details[data-person] summary').nth(1).scrollIntoViewIfNeeded();
    await page.locator('details[data-person] summary').nth(1).click();
    await sleep(400);
    await page.screenshot({ path: `${shotsDir}interaction-about-popover-open.jpg`, type: 'jpeg', quality: 82 });
    await page.context().close();
  }
  for (const topic of ['demo', 'question']) {
    const page = await open({ width: 1440, height: 900, reduced: true }, `/contact/?topic=${topic}`);
    await settle(page);
    await sleep(300);
    await page.screenshot({ path: `${shotsDir}interaction-contact-topic-${topic}.jpg`, type: 'jpeg', quality: 82 });
    await page.context().close();
  }
  {
    const page = await open({ width: 1440, height: 900, timezoneId: 'America/Mexico_City' }, '/solutions/coaches/');
    await settle(page);
    await page.screenshot({ path: `${shotsDir}interaction-coaches-latam-prices.jpg`, type: 'jpeg', quality: 82, fullPage: true });
    await page.context().close();
  }
}
