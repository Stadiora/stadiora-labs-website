// Use-case panels: what a screen reader can reach has to follow aria-expanded, and the open/close transition has to survive.
//   For every row, opened by a click: once the transition is over the opened panel is rendered and reachable, every other
//   panel is out of the accessibility tree (visibility:hidden), and each button's aria-expanded matches that. While the panel opens
//   its height is between closed and open, so the visual transition is still there.
const group = 'api-uc-a11y';

export async function apiUseCaseA11yChecks({ open, check, sleep, settle }) {
  for (const [lang, path] of [['en', '/api.html'], ['es', '/api-es.html']]) {
    const page = await open({ width: 1440, height: 900 }, path);
    await settle(page);
    await page.locator('[data-uc]').scrollIntoViewIfNeeded();
    await sleep(600);
    const state = () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-uc-row]')].map((r) => {
          const body = r.querySelector('.uc-body');
          const btn = r.querySelector('button[aria-expanded]');
          return { expanded: btn.getAttribute('aria-expanded') === 'true', visibility: getComputedStyle(body).visibility, h: Math.round(body.firstElementChild.getBoundingClientRect().height * 10) / 10 };
        }),
      );
    const rows = await state();
    let ok = true;
    let why = '';
    let mid = null;
    for (let k = 0; k < rows.length; k++) {
      const before = await state();
      await page.locator('[data-uc-row] button').nth(k).click();
      if (!before[k].expanded) {
        await sleep(110);
        mid = (await state())[k];
        const full = await (async () => {
          await sleep(700);
          return (await state())[k];
        })();
        if (!(mid.h > 0 && mid.h < full.h)) {
          ok = false;
          why ||= `row ${k + 1}: the panel did not open through a transition (height ${mid.h} mid-way, ${full.h} open)`;
        }
      } else await sleep(800);
      const now = await state();
      now.forEach((s, i) => {
        const want = i === k;
        if (s.expanded !== want || (s.visibility === 'visible') !== want || (want && s.h <= 0)) {
          ok = false;
          why ||= `after opening row ${k + 1}, row ${i + 1}: aria-expanded ${s.expanded}, visibility ${s.visibility}, height ${s.h}`;
        }
      });
    }
    check(group, `${lang}: the panels exposed to a screen reader follow aria-expanded, and opening still transitions`, ok && rows.length >= 4, ok ? `${rows.length} rows, each opened in turn: only the open one is reachable` : why);
    await page.context().close();
  }
}
