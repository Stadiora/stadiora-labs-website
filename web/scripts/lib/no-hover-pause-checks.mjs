// Sitewide guard for the "a mouse never pauses anything" contract, on every page of the build: every sitemap URL (Astro
// pages, EN and ES) plus every page of web/public that ships as plain HTML (the legacy connect, investors, lead-magnet,
// team, privacy, terms and API pages, and the two personal folders). Two probes per page:
//  1. Styles: `document.styleSheets` is walked rule by rule (media, supports, layer, container and nested rules included)
//     and the RESOLVED declaration is read from the CSSOM, so `animation: x 1s paused` and `animation-play-state: paused`
//     are both caught. A rule whose selector mentions :hover, or :focus-within (focus by mouse click would pause it),
//     must not resolve animation-play-state to paused, and must not switch an animation off with `animation-name: none`.
//     Pause by keyboard focus is `:focus-visible` / `:has(:focus-visible)` and stays. Inline onmouse*/onpointer* attributes
//     must not touch animations either.
//  2. Pointer: a real mouse (page.mouse) is moved over the centre of the visible part of every running animation host
//     (`[data-ap]`) and of every `[data-ap-scope]`. No host that ran before may flip to data-ap="off", and no host may
//     report data-ap-why="hover".
// A third probe drives src/scripts/tabs.ts (a tab group with auto-advance) on the Teams and clubs pages, which ship none.
// Real counts are asserted at the end (rules inspected, rules that set a play state, hosts and scopes hovered), so a
// probe that matches nothing cannot pass.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const GROUP = 'no-hover-pause';

export async function distPages(distDir) {
  const found = [];
  const stubs = new Map();
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '_astro') continue;
        await walk(full);
      } else if (entry.name.endsWith('.html') && entry.name !== '404.html') {
        const rel = relative(distDir, full).split('\\').join('/');
        const path = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
        found.push(path);
        const html = await readFile(full, 'utf8');
        // a redirect stub leaves the page before it can be probed; it has no content, so it is read as text instead
        if (/http-equiv="refresh"/i.test(html) && html.length < 2000) stubs.set(path, html);
      }
    }
  };
  await walk(distDir);
  const sitemap = await readFile(join(distDir, 'sitemap-0.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return { pages: [...new Set([...urls, ...found])].sort(), sitemap: urls, stubs };
}

// Runs in the page. Returns what the stylesheets resolve to.
const styleProbe = () => {
  const out = { sheets: 0, unreadable: [], rules: 0, withPlayState: 0, hoverRules: 0, offenders: [], inline: [] };
  const hasPause = (style) => style.animationPlayState.split(',').some((v) => v.trim() === 'paused');
  const switchesOff = (style) => style.animationName.split(',').some((v) => v.trim() === 'none') && style.animationName !== '';
  const walk = (rules, chain) => {
    for (const rule of rules) {
      const own = rule.selectorText;
      const sel = own === undefined ? chain : chain ? `${chain} ${own}` : own;
      if (own !== undefined && rule.style) {
        out.rules++;
        const paused = hasPause(rule.style);
        if (paused) out.withPlayState++;
        const hov = sel.includes(':hover');
        if (hov) out.hoverRules++;
        const bad = (hov || sel.includes(':focus-within')) && (paused || switchesOff(rule.style));
        if (bad) out.offenders.push(`${sel.trim().slice(0, 140)} { ${paused ? 'animation-play-state: paused' : 'animation-name: none'} }`);
      }
      if (rule.cssRules && rule.cssRules.length) walk(rule.cssRules, own === undefined ? chain : sel);
    }
  };
  for (const sheet of document.styleSheets) {
    out.sheets++;
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      // the Google Fonts stylesheet is cross-origin and holds only @font-face rules
      if (!/^https:\/\/fonts\.googleapis\.com\//.test(sheet.href ?? '')) out.unreadable.push(sheet.href ?? 'inline');
      continue;
    }
    walk(rules, '');
  }
  for (const el of document.querySelectorAll('*')) {
    for (const attr of el.getAttributeNames()) {
      if (/^on(mouse|pointer)(enter|leave|over|out|move|down|up)$/.test(attr) && /pause|play-?state|animation|cancel\(/i.test(el.getAttribute(attr) ?? '')) out.inline.push(`${el.tagName.toLowerCase()}[${attr}]`);
    }
  }
  return out;
};

// Runs in the page: every autoplay host and pause scope, by a stable index.
const targets = () => {
  const label = (e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${typeof e.className === 'string' && e.className ? `.${e.className.trim().split(/\s+/)[0]}` : ''}`;
  const hosts = [...document.querySelectorAll('[data-ap]')];
  const scopes = [...document.querySelectorAll('[data-ap-scope]')];
  const all = [...new Set([...hosts, ...scopes])];
  all.forEach((e, i) => e.setAttribute('data-nhp', String(i)));
  return all.map((e, i) => ({ i, label: label(e), host: e.hasAttribute('data-ap'), scope: e.hasAttribute('data-ap-scope') }));
};

// Runs in the page: scroll the element to the middle of the screen and return the middle of its visible part.
const reveal = (i) => {
  const e = document.querySelector(`[data-nhp="${i}"]`);
  if (!e) return null;
  e.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  const r = e.getBoundingClientRect();
  const x0 = Math.max(r.left, 0);
  const x1 = Math.min(r.right, innerWidth);
  const y0 = Math.max(r.top, 0);
  const y1 = Math.min(r.bottom, innerHeight);
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;
  return { x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2) };
};

const states = () =>
  [...document.querySelectorAll('[data-ap]')].map((e) => ({
    key: e.getAttribute('data-nhp') ?? '',
    label: `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${typeof e.className === 'string' && e.className ? `.${e.className.trim().split(/\s+/)[0]}` : ''}`,
    ap: e.getAttribute('data-ap'),
    why: e.getAttribute('data-ap-why') ?? '',
  }));

// src/scripts/tabs.ts auto-advances only for a [data-tabs-auto] host and no shipped page sets one, so the probe switches it on
// before the script runs (an init script) and drives it with a real mouse and with keyboard focus.
const tabsInit = () => {
  const arm = () => document.querySelectorAll('[data-tabs]:not([data-tabs-auto])').forEach((e) => e.setAttribute('data-tabs-auto', '1500'));
  arm();
  new MutationObserver(arm).observe(document, { childList: true, subtree: true });
};
const selectedTab = (page) =>
  page.evaluate(() => {
    const t = [...document.querySelectorAll('[data-tabs] [role="tab"]')];
    return t.findIndex((e) => e.getAttribute('aria-selected') === 'true');
  });

// Exercise the modality change without moving focus: focusin alone cannot observe this.
async function keyboardTabsProbe({ page, path, check, sleep }) {
  const root = page.locator('[data-autotabs]').first();
  const tab = root.locator('[role="tab"]').nth(1);
  await tab.click();
  await sleep(350);
  const take = () => root.evaluate((e) => ({
    selected: [...e.querySelectorAll('[role="tab"]')].map((t) => t.getAttribute('aria-selected')),
    bars: [...e.querySelectorAll('.at-bar i')].map((b) => getComputedStyle(b).transform),
  }));
  const changes = async () => {
    const before = await take();
    await sleep(1400);
    return JSON.stringify(before) !== JSON.stringify(await take());
  };
  check(GROUP, `${path}: mouse-clicked tab keeps rendered progress moving`, !(await tab.evaluate((e) => e.matches(':focus-visible'))) && await changes());
  await page.keyboard.press('Enter');
  await sleep(150);
  check(GROUP, `${path}: a key on the mouse-focused tab holds rendered progress and selection still`, await tab.evaluate((e) => e === document.activeElement && e.matches(':focus-visible')) && !(await changes()));
  // Leave the entire pause scope with real Tab events, not blur(), then observe the progress again.
  for (let k = 0; k < 40 && await root.evaluate((e) => e.contains(document.activeElement)); k++) await page.keyboard.press('Tab');
  await tab.scrollIntoViewIfNeeded();
  await sleep(350);
  const outside = !(await root.evaluate((e) => e.contains(document.activeElement)));
  const resumed = await changes();
  check(GROUP, `${path}: Tab away from the mouse-then-keyboard tab resumes rendered progress`, outside && resumed, await root.evaluate((e) => `outside=${!e.contains(document.activeElement)}, ${e.dataset.ap}/${e.dataset.apWhy ?? ''}, active=${document.activeElement?.tagName}.${document.activeElement?.className}`));
  await tab.click();
  await page.keyboard.press('Enter');
  await sleep(150);
  await tab.click();
  await sleep(150);
  check(GROUP, `${path}: another mouse click on the same keyboard-visible tab resumes and clears its focus indicator`, await tab.evaluate((e) => e === document.activeElement && !e.matches(':focus-visible')) && await changes());
  await root.locator('[role="tab"]').first().focus();
  await sleep(150);
  check(GROUP, `${path}: programmatic focus after a mouse click keeps rendered progress moving`, !(await root.locator('[role="tab"]').first().evaluate((e) => e.matches(':focus-visible'))) && await changes());
}

async function tabsProbe({ open, sleep, path }) {
  const page = await open({ width: 1440, height: 900, init: tabsInit }, path);
  const out = { path, tabs: await page.evaluate(() => document.querySelectorAll('[data-tabs] [role="tab"]').length), auto: await page.evaluate(() => Number(document.querySelector('[data-tabs]')?.dataset.tabsAuto ?? 0)) };
  if (out.tabs < 2 || !out.auto) return { ...out, errors: ['no [data-tabs] host with two tabs to drive'] };
  const errors = [];
  const rect = () => page.evaluate(() => { const r = document.querySelector('[data-tabs]').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.evaluate(() => document.querySelector('[data-tabs]').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(600);
  const changesIn = async (ms) => {
    let last = await selectedTab(page);
    let n = 0;
    for (let t = 0; t < ms; t += 250) {
      await sleep(250);
      const now = await selectedTab(page);
      if (now !== last) n++;
      last = now;
    }
    return n;
  };
  const tabBox = async (i) => (await page.locator('[data-tabs] [role="tab"]').nth(i).boundingBox());
  out.control = await changesIn(4200);
  if (out.control < 1) errors.push('the cycle never advanced with no pointer and no focus (positive control)');
  const cur = await selectedTab(page);
  const b = await tabBox(cur);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
  out.hover = await changesIn(4200);
  if (out.hover < 1) errors.push('the cycle stopped with the mouse parked on its selected tab');
  const target = ((await selectedTab(page)) + 1) % out.tabs;
  const tb = await tabBox(target);
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
  await sleep(150);
  const picked = await selectedTab(page);
  if (picked !== target) errors.push(`a mouse click on tab ${target} did not select it (tab ${picked} is selected)`);
  await sleep(900);
  if ((await selectedTab(page)) !== target) errors.push('the clicked tab did not keep its full dwell (the cycle skipped it within 1.05 s of a 1.5 s dwell)');
  out.afterClick = await changesIn(4200);
  if (out.afterClick < 1) errors.push('the cycle stopped after a mouse click on a tab');
  const same = await tabBox(await selectedTab(page));
  await page.mouse.click(same.x + same.width / 2, same.y + same.height / 2);
  await page.keyboard.press('Shift');
  await sleep(150);
  out.sameFocus = await changesIn(2200);
  if (out.sameFocus !== 0) errors.push('a key on the mouse-focused tab did not hold the cycle');
  await page.mouse.click(same.x + same.width / 2, same.y + same.height / 2);
  out.sameClick = await changesIn(2200);
  if (out.sameClick < 1) errors.push('another mouse click on the same keyboard-visible tab did not resume the cycle');
  const again = await tabBox(await selectedTab(page));
  await page.mouse.click(again.x + again.width / 2, again.y + again.height / 2);
  await page.keyboard.press('Shift');
  for (let k = 0; k < 40 && await page.locator('[data-tabs]').evaluate((e) => e.contains(document.activeElement)); k++) await page.keyboard.press('Tab');
  out.tabAway = await changesIn(2200);
  if (out.tabAway < 1) errors.push('Tab away from the mouse-then-keyboard tab did not resume the cycle');
  await page.mouse.move(2, 2);
  await page.keyboard.press('Shift');
  await page.locator('[data-tabs] [role="tab"]').first().focus();
  await sleep(300);
  out.keyboard = await changesIn(4200);
  if (out.keyboard !== 0) errors.push(`keyboard focus on a tab did not hold the cycle (${out.keyboard} changes in 4.2 s)`);
  await page.context().close();
  return { ...out, errors };
}

export async function noHoverPauseChecks({ open, check, sleep, metrics, distDir, only }) {
  const { pages: all, sitemap, stubs } = await distPages(distDir);
  const pages = only ? all.filter((p) => only.includes(p)) : all;
  const totals = { pages: 0, stubs: 0, sheets: 0, rules: 0, withPlayState: 0, hoverRules: 0, hosts: 0, scopes: 0, hovered: 0, held: 0, idle: [] };
  const styleFails = [];
  const hoverFails = [];
  const whyFails = [];
  const errors = [];
  const perPage = {};

  for (const path of pages) {
    if (stubs.has(path)) {
      totals.pages++;
      totals.stubs++;
      const html = stubs.get(path);
      if (/<style|<link[^>]+stylesheet|<script|onmouse|onpointer|animation/i.test(html)) styleFails.push(`${path}: a redirect stub carries styles, script or animation`);
      continue;
    }
    let page;
    try {
      page = await open({ width: 1440, height: 900 }, path);
    } catch (e) {
      errors.push(`${path}: ${String(e.message).split('\n')[0]}`);
      continue;
    }
    totals.pages++;
    try {
      const style = await page.evaluate(styleProbe);
      totals.sheets += style.sheets;
      totals.rules += style.rules;
      totals.withPlayState += style.withPlayState;
      totals.hoverRules += style.hoverRules;
      for (const o of style.offenders) styleFails.push(`${path}: ${o}`);
      for (const u of style.unreadable) styleFails.push(`${path}: stylesheet ${u} cannot be read, so it cannot be checked`);
      for (const i of style.inline) styleFails.push(`${path}: inline ${i} touches an animation`);

      const list = await page.evaluate(targets);
      const hosts = list.filter((t) => t.host).length;
      const scopes = list.filter((t) => t.scope).length;
      totals.hosts += hosts;
      totals.scopes += scopes;
      let hovered = 0;
      for (const t of list) {
        const at = await page.evaluate(reveal, t.i);
        if (!at) {
          totals.idle.push(`${path} ${t.label}: no visible part to put the pointer on`);
          continue;
        }
        await page.mouse.move(2, 2);
        // a running host is on before the pointer arrives; the ones that are not (paused for another reason) are not the subject
        // the scroll above retriggers every host's visibility observer: read the states once they stop changing
        let before = [];
        let last = '';
        for (let k = 0; k < 12; k++) {
          await sleep(250);
          before = await page.evaluate(states);
          const now = JSON.stringify(before.map((s) => [s.key, s.ap, s.why]));
          if (now === last) break;
          last = now;
        }
        const running = new Set(before.filter((s) => s.ap === 'on').map((s) => s.key));
        await page.mouse.move(at.x, at.y, { steps: 4 });
        await sleep(450);
        await page.mouse.move(at.x + 6, at.y + 4, { steps: 3 });
        await sleep(250);
        const after = await page.evaluate(states);
        hovered++;
        for (const s of after) {
          if (s.why === 'hover') whyFails.push(`${path} ${s.label}: data-ap-why=hover under the pointer at ${t.label}`);
          if (running.has(s.key) && s.ap !== 'on') hoverFails.push(`${path} ${s.label}: data-ap went ${s.ap}${s.why ? `/${s.why}` : ''} with the mouse over ${t.label}`);
        }
        totals.held += running.size;
      }
      await page.mouse.move(2, 2);
      totals.hovered += hovered;
      perPage[path] = { hosts, scopes, hovered, rules: style.rules, playStateRules: style.withPlayState };
      if (['/', '/es/', '/platform/guardian-portal/', '/es/platform/guardian-portal/', '/platform/messaging/', '/es/platform/messaging/'].includes(path)) {
        await keyboardTabsProbe({ page, path, check, sleep });
      }
    } catch (e) {
      errors.push(`${path}: the probe could not finish: ${String(e.message).split('\n')[0]}`);
    }
    await page.context().close();
  }

  const tabPaths = pages.filter((p) => /\/solutions\/teams-and-clubs\/$/.test(p));
  const tabRuns = [];
  for (const path of tabPaths) tabRuns.push(await tabsProbe({ open, sleep, path }));
  const tabErrors = tabRuns.flatMap((r) => r.errors.map((e) => `${r.path}: ${e}`));

  const fmt = (xs) => xs.slice(0, 8).join('; ') + (xs.length > 8 ? `; +${xs.length - 8} more` : '');
  const pageCount = pages.length;
  check(GROUP, `every page loads (${pageCount} pages: ${sitemap.length} sitemap URLs plus the plain-HTML pages of web/public, EN and ES)`, errors.length === 0 && totals.pages === pageCount && (only || (pageCount >= 48 && sitemap.every((p) => pages.includes(p)))), errors.join('; ') || `${totals.pages} pages`);
  check(GROUP, 'stylesheets: no rule with :hover or :focus-within resolves animation-play-state to paused (or switches an animation off)', styleFails.length === 0, fmt(styleFails));
  check(GROUP, 'stylesheets: the walk read real rules (rules inspected, play-state rules and :hover rules all non-zero)', (only ? totals.rules > 0 : totals.rules > 20000 && totals.withPlayState >= 100 && totals.hoverRules >= 1000), `${totals.sheets} sheets, ${totals.rules} rules, ${totals.withPlayState} set a play state, ${totals.hoverRules} mention :hover`);
  check(GROUP, 'pointer: with the mouse over every running animation host and every [data-ap-scope], no host flips to data-ap="off"', hoverFails.length === 0, fmt(hoverFails));
  check(GROUP, 'pointer: no host reports data-ap-why=hover', whyFails.length === 0, fmt(whyFails));
  check(GROUP, 'pointer: the probe hovered real hosts (hosts, scopes and pointer placements all non-zero)', only ? totals.hovered > 0 : totals.hosts >= 150 && totals.scopes >= 120 && totals.hovered >= 200 && totals.held >= 350, `${totals.hosts} hosts, ${totals.scopes} scopes, ${totals.hovered} placements, ${totals.held} running hosts re-read after each`);
  check(GROUP, 'tabs.ts auto-advance: a parked mouse and a mouse click never stop the cycle, a clicked tab keeps its full dwell, keyboard focus holds it', tabErrors.length === 0 && tabRuns.length === tabPaths.length && (only ? true : tabRuns.length === 2), fmt(tabErrors) || tabRuns.map((r) => `${r.path}: ${r.tabs} tabs, ${r.control}/${r.hover}/${r.afterClick} changes (control/parked/after click), ${r.keyboard} under keyboard focus`).join('; '));
  check(GROUP, 'pointer: every host and scope had a visible part to put the pointer on', totals.idle.length === 0, fmt(totals.idle));
  metrics['no-hover-pause'] = { pages: totals.pages, tabs: tabRuns, ...Object.fromEntries(Object.entries(totals).filter(([k]) => k !== 'idle' && k !== 'pages')), perPage };
}
