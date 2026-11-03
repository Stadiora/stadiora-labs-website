# Evidence for PR #27

Screenshot evidence for "feat(web): Astro foundation and new home (R57, not live until cutover)".
This branch holds images only and is never merged.

- `mocks/`: the approved design mocks (home-1 to home-5, home-phone, nav-megamenu).
- `built/`: raw captures from `npm run evidence` at the fix round B head (headless Chromium 1248, static build).
  - `sec-<section>-<locale>-<scheme>-<width>.png`: one section at 1440 or 390 px.
  - `state-*.png`: interactive states (menus, hero words, tabs, dialog, drawer). New in round B:
    `state-nav-{en,es}-{1100,1280,1440}` (the header at three widths),
    `state-mega-es-1280x700`, `state-mega-es-1280x600` (panel at the top, footer CTA pinned) and `state-mega-es-1280x600-end` (scrolled to the last link),
    `state-drawer-focus-es-390` and `state-drawer-focus-en-1100` (drawer open, focus ring on the first item),
    `state-drawer-platform-es-1100x600` (Platform group scrolled to its last link and the footer CTA inside the drawer).
  - `full-<locale>-<scheme>-<width>.png`: full-page captures.
- `compare/fixB-<item>-{before,after}.png`: the same view at the reviewed head 7d69463 and at the fix round B head, for the tables in the fix round B PR comment. Items: `nav-es-1100`, `nav-es-1280`, `nav-en-1185`, `mega-es-1280x600`, `drawer-es-390`; `mega-es-1100x600-before` and `drawer-platform-es-1100x600-after` (below 1280 the nav is now the drawer).
- `compare/fixB-nav-checks-reviewed-head-7d69463.json`: the 102 `--nav-only` results from running the new checks against the reviewed head (52 fail).
- `summary.json`: the 200 check results and the measured numbers for fix round B.
- `round-a/`: the fix round A evidence (`built/`, `compare/fixA-*`, `summary.json`, 96 checks) at PR head 87a531b. Earlier comments link to it by commit SHA, so those links keep working.
- `round-1/`: the first evidence (`built/`, `compare/`, `summary.json`, 68 checks) at PR head b840c44.
