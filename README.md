# Evidence for PR #27

Screenshot evidence for "feat(web): Astro foundation and new home (R57, not live until cutover)".
This branch holds images only and is never merged.

- `mocks/`: the approved design mocks (home-1 to home-5, home-phone, nav-megamenu).
- `built/`: raw captures from `npm run evidence` at the fix round A head (headless Chromium 1248, static build).
  - `sec-<section>-<locale>-<scheme>-<width>.png`: one section at 1440 or 390 px.
  - `state-*.png`: interactive states (menus, hero words, tabs, dialog, drawer).
  - `full-<locale>-<scheme>-<width>.png`: full-page captures.
- `compare/fixA-<item>-{mock,before,after}.png`: matching crops of the approved mock, the round 1 build and the fix round A build, used for the tables in the fix round A PR comment. Items: `hero-1`, `hero-es`, `hero-2`, `ai`, `brand`, `apps`, `logos`, `load`.
- `summary.json`: the 96 check results and the measured numbers for fix round A.
- `round-1/`: the previous evidence (`built/`, `compare/`, `summary.json`, 68 checks) at PR head b840c44. Earlier comments link to it by commit SHA, so those links keep working.
