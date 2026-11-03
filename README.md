# Evidence for PR #27

Screenshot evidence for "feat(web): Astro foundation and new home (R57, not live until cutover)".
This branch holds images only and is never merged.

- `mocks/`: the approved design mocks (home-1 to home-5, home-phone, nav-megamenu).
- `built/`: raw captures from `npm run evidence` (headless Chromium 1248, static build).
  - `sec-<section>-<locale>-<scheme>-<width>.png`: one section at 1440 or 390 px.
  - `state-*.png`: interactive states (menus, hero words, tabs, dialog, drawer).
  - `full-<locale>-<scheme>-<width>.png`: full-page captures.
- `compare/`: sections stacked in mock order, used for the mock vs built tables in the PR comment.
- `summary.json`: the 68 check results and the measured numbers.
