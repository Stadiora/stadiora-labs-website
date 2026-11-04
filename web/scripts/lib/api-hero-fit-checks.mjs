// The phone hero must fit its column. At 390px the engine stack (three signals, orb, decision card, demo badge) sits in the hero
// grid's content box. A longer Spanish demo badge once inherited white-space:nowrap and stretched the stack to 516px; the page
// scrollWidth stayed 390 (the hero clips), so overflow of the document proves nothing. This check measures the hero's own boxes:
// the stack and every box inside it must lie inside the column, and the words a reader needs must not be cut by their own box.
const group = 'api-hero-fit';

const probe = () => {
  // Layout geometry, not a moment of the show: the reading highlight scales a signal by a few percent for a moment.
  const calm = document.createElement('style');
  calm.textContent = '.eng-host,.eng-host *{animation:none!important;transition:none!important;transform:none!important;scale:none!important}';
  document.head.append(calm);
  const host = document.querySelector('.eng-host');
  const parent = host.parentElement;
  const pr = parent.getBoundingClientRect();
  const ps = getComputedStyle(parent);
  const col = { l: pr.left + parseFloat(ps.paddingLeft), r: pr.right - parseFloat(ps.paddingRight) };
  const tol = 0.5;
  const outside = [];
  for (const e of [host, ...host.querySelectorAll('*')]) {
    const r = e.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.left < col.l - tol || r.right > col.r + tol) outside.push(`${e.tagName.toLowerCase()}${e.classList.length ? `.${e.classList[0]}` : ''} ${r.left.toFixed(1)}..${r.right.toFixed(1)}`);
  }
  const words = [...host.querySelectorAll('.sig[data-ph] b, .sig[data-ph] span, .sig[data-ph] small, .dec-score small, .dec-t, .dec-r, .dec-flags span, .dec-foot span, .badge-demo, .dec-k, .eng-status span')];
  const cut = words
    .filter((e) => e.getClientRects().length && getComputedStyle(e).display !== 'none')
    .filter((e) => e.scrollWidth > e.clientWidth + 1)
    .map((e) => `${e.tagName.toLowerCase()}.${e.classList[0] ?? ''} "${e.textContent.trim().slice(0, 24)}" ${e.scrollWidth}>${e.clientWidth}`);
  const seen = (sel) => [...host.querySelectorAll(sel)].filter((e) => e.getClientRects().length).length;
  return { col, host: host.getBoundingClientRect().width, outside, cut, signals: seen('.sig[data-ph]'), score: seen('.dec-score'), reason: seen('.dec-r'), coach: seen('.dec-foot > span'), flags: seen('.dec-flags span'), badge: seen('.badge-demo') };
};

export async function apiHeroFitChecks({ open, check, sleep, settle }) {
  for (const [lang, path] of [['en', '/api.html'], ['es', '/api-es.html']]) {
    for (const width of [390, 360]) {
      const page = await open({ width, height: 844, mobile: true }, path);
      await settle(page);
      await sleep(1500);
      const r = await page.evaluate(probe);
      const present = r.signals === 3 && r.score === 1 && r.reason === 1 && r.coach === 2 && r.flags >= 1 && r.badge === 1;
      check(
        group,
        `${lang} ${width}px: the hero stack and every box in it sit inside their ${(r.col.r - r.col.l).toFixed(0)}px column, and no label or sentence is cut`,
        present && r.outside.length === 0 && r.cut.length === 0,
        !present ? `parts rendered: signals ${r.signals}, score ${r.score}, reason ${r.reason}, coach ${r.coach}, flags ${r.flags}, badge ${r.badge}` : r.outside.length ? `outside the column: ${r.outside.slice(0, 6).join('; ')}` : r.cut.length ? `cut: ${r.cut.slice(0, 4).join('; ')}` : `stack ${r.host.toFixed(1)}px in column ${r.col.l.toFixed(1)}..${r.col.r.toFixed(1)}`,
      );
      await page.context().close();
    }
  }
}
