// Accessibility checks for the five Platform pages that read what a browser and an assistive technology actually get, not
// classes or attributes: the live demo's selected panel must be visible AND in the accessibility tree with its content, and
// every standalone link and control must be a 44px target at 390px. Called from engageChecks (scripts/lib/engage-checks.mjs).
import { engagePages } from './engage-verify.mjs';

const group = 'engage-a11y';

const names = {
  messaging: 'messaging',
  'guardian-portal': 'guardian',
  teams: 'teams',
  'custom-branded-apps': 'branded',
  integrations: 'integrations',
};

// In page: standalone links and controls inside <main> (inline links in running text are exempt, as in the home guard)
// that render under 44px in either direction.
const targetProbe = () => {
  const hidden = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
      if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert') || n.hasAttribute('hidden')) return true;
    }
    return false;
  };
  const rows = [];
  let inline = 0;
  for (const e of document.querySelectorAll('main a[href], main button, main [role="tab"], main summary, main input, main select, main textarea, main [role="button"]')) {
    if (hidden(e)) continue;
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (getComputedStyle(e).display === 'inline') {
      inline++;
      continue;
    }
    rows.push({ name: (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\s+/g, ' ').slice(0, 36), w: Math.round(rect.width * 10) / 10, h: Math.round(rect.height * 10) / 10 });
  }
  const small = rows.filter((r) => r.w < 44 || r.h < 44);
  return { checked: rows.length, inline, small: small.slice(0, 8), smallCount: small.length };
};

// With Playwright's role queries, a tabpanel that is display:none, visibility:hidden or under aria-hidden is not found at all.
// `selected` is the tab's own aria-controls target; the panel's text must show up in its accessibility snapshot.
const panelState = async (page, tabs) => {
  const panels = page.getByRole('tabpanel');
  const count = await panels.count();
  const controlled = await page.evaluate((sel) => {
    const t = document.querySelector(`${sel}[aria-selected="true"]`);
    return t ? t.getAttribute('aria-controls') : null;
  }, tabs);
  const first = count ? panels.first() : null;
  const id = first ? await first.getAttribute('id') : null;
  const visible = first ? await first.isVisible() : false;
  const snapshot = first ? await first.ariaSnapshot() : '';
  const text = first ? ((await first.evaluate((el) => [...el.querySelectorAll('*')].filter((n) => !n.children.length).map((n) => n.textContent.trim()).find((t) => t.length >= 10 && !/^[\d\s.:%/-]+$/.test(t)))) ?? '') : '';
  return { count, controlled, id, visible, text, listed: Boolean(text) && snapshot.includes(text.slice(0, 16)), snapshotLines: snapshot.split('\n').length };
};

export async function engageA11yChecks({ open, check, sleep, settle }) {
  const only = process.env.ENGAGE_ONLY?.split(',');
  const on = (slug) => !only || only.includes(slug);

  for (const lang of ['en', 'es']) {
    const base = lang === 'en' ? '' : '/es';

    // The live demos: the selected panel is exposed to assistive technology, shown, and carries its content; the others are not exposed.
    for (const [slug, tabs, label] of [
      ['messaging', '.eg-live [role="tab"]', 'messaging'],
      ['guardian-portal', '[role="tab"]', 'guardian'],
    ]) {
      if (!on(slug)) continue;
      const page = await open({ width: 1440, height: 900 }, `${base}/platform/${slug}/`);
      await settle(page);
      const total = await page.locator(tabs).count();
      for (let k = 0; k < total; k++) {
        if (k) {
          await page.locator(tabs).nth(k).click();
          await sleep(500);
        }
        const s = await panelState(page, tabs);
        const ok = s.count === 1 && s.visible && s.id === s.controlled && s.listed;
        check(group, `${lang}/${label}: tab ${k + 1} of ${total} selected, its panel is visible, the only tabpanel in the accessibility tree, and its text is in the snapshot`, ok, JSON.stringify(s));
      }
      await page.context().close();
    }

    // Tap targets at 390 on every page.
    for (const p of engagePages.filter((x) => x.lang === lang && on(x.slug))) {
      const page = await open({ width: 390, height: 844, reduced: true, mobile: true }, p.path);
      await settle(page);
      const t = await page.evaluate(targetProbe);
      check(group, `${lang}/${names[p.slug]}: every standalone link and control in main is at least 44x44 at 390px (${t.checked} checked, ${t.inline} inline in text exempt)`, t.checked >= 3 && t.smallCount === 0, t.small.map((r) => `${r.name} ${r.w}x${r.h}`).join('; '));
      await page.context().close();
    }
  }
}
