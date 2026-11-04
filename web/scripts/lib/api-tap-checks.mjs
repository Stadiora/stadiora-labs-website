// Tap targets on the API and legal pages at 390px, light and dark, judged by hit testing, not by the element's own rectangle.
//   A standalone link or control (inline links in running text are exempt, as in the home guard) passes when a 44x44 box centred on
//   it lands on it everywhere: a 5x5 grid of points, corners included, must hit the control or something inside it. A pseudo-element
//   hit area counts (it belongs to its element when hit-tested); a neighbour or an overlay that steals part of the box does not.
//   Controls covered: the code tabs and Replay on the API page; on the legal pages the document switch, every contents link, the
//   reading-theme button and Print in the opened phone contents list, and the copy-link anchors (invisible until hover, still tappable).
const group = 'api-tap';

export const pages = [
  { path: '/api.html', tag: 'api-en', must: ['.code-tabs button', '.code-replay'] },
  { path: '/api-es.html', tag: 'api-es', must: ['.code-tabs button', '.code-replay'] },
  { path: '/privacy.html', tag: 'privacy', legal: true, must: ['.lg-switch a', '.toc-list a', '.toc-theme', '.toc-print', '.anchor'] },
  { path: '/terms.html', tag: 'terms', legal: true, must: ['.lg-switch a', '.toc-list a', '.toc-theme', '.toc-print', '.anchor'] },
];

const SELECTOR = 'main a[href], main button, main [role="tab"], main summary, main input, main select, main textarea, .lg-switch a, .toc a, .toc button, .anchor';

/** In page: every standalone control that is rendered, with how much of its 44x44 box it owns. */
export const probe = async ({ selector, must }) => {
  const hidden = (e) => {
    for (let n = e; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      // The copy-link anchor is at opacity 0 until hover or focus; it is still a target.
      const faded = parseFloat(cs.opacity) === 0 && !n.matches('.anchor');
      if (cs.display === 'none' || cs.visibility === 'hidden' || faded) return true;
      if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert') || n.hasAttribute('hidden')) return true;
    }
    return false;
  };
  const label = (e) => `${e.tagName.toLowerCase()}${e.classList.length ? `.${e.classList[0]}` : ''}`;
  const offsets = [-21.5, -11, 0, 11, 21.5];
  const rows = [];
  let inline = 0;
  for (const e of new Set(document.querySelectorAll(selector))) {
    if (hidden(e)) continue;
    if (getComputedStyle(e).display === 'inline' && !e.matches('.anchor')) {
      inline++;
      continue;
    }
    e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(r));
    const rect = e.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let miss = 0;
    let thief = '';
    for (const dy of offsets) {
      for (const dx of offsets) {
        const hit = document.elementFromPoint(cx + dx, cy + dy);
        if (!hit || !(hit === e || e.contains(hit))) {
          miss++;
          thief ||= `${hit?.tagName.toLowerCase()}.${hit?.className} at ${dx},${dy}`;
        }
      }
    }
    rows.push({ sel: label(e), covers: must.filter((m) => e.matches(m)), name: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28), w: Math.round(rect.width * 10) / 10, h: Math.round(rect.height * 10) / 10, miss, thief });
  }
  return { rows, inline };
};

export async function apiTapChecks({ open, check, sleep, settle }) {
  for (const p of pages) {
    for (const scheme of ['light', 'dark']) {
      const page = await open({ width: 390, height: 844, mobile: true, scheme }, p.path);
      await settle(page);
      // Sections reveal as they scroll in; walk the page once so every control is rendered before it is judged.
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 500) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await sleep(60);
      }
      await sleep(1100);
      const closed = await page.evaluate(probe, { selector: SELECTOR, must: p.must });
      let all = closed.rows;
      if (p.legal) {
        // The phone contents list: open it and judge the links, the theme button and Print inside it.
        await page.locator('.toc-mob').click();
        await sleep(400);
        // Open, the contents panel sits over the page, so only the controls inside it are judged in this state.
        all = [...all, ...(await page.evaluate(probe, { selector: '.toc-list a, .toc-tools a, .toc-tools button', must: p.must })).rows];
      }
      const bad = all.filter((r) => r.miss > 0);
      const need = p.must.filter((m) => !all.some((r) => r.covers.includes(m)));
      check(
        group,
        `${p.tag} ${scheme} 390px: every standalone control owns a 44x44 hit area (${all.length} judged, ${closed.inline} inline exempt)`,
        all.length >= 3 && bad.length === 0 && need.length === 0,
        bad.length ? `short: ${bad.slice(0, 8).map((r) => `${r.sel} "${r.name}" ${r.w}x${r.h} (${r.miss}/25 points off, taken by ${r.thief})`).join('; ')}` : need.length ? `controls not found: ${need.join(', ')}` : `smallest rect ${Math.min(...all.map((r) => r.w))}x${Math.min(...all.map((r) => r.h))}, every 44x44 box owned`,
      );
      await page.context().close();
    }
  }
}
