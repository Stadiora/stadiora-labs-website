# Evidence for PR #28

Screenshot evidence for "feat(web): pricing page, EN and ES (R57, not live until cutover)".
This branch holds images only and is never merged.

- `mocks/`: the approved design mocks (`pricing.png` desktop, `pricing-phone.png` phone).
- `built/`: raw captures from `node scripts/evidence.mjs` (headless Chromium, static build, reduced motion).
  - `pricing-<locale>-<scheme>-<width>-<region>.png`: full page. The region comes from `?region=us|latam`. The browser time zone was America/New_York.
  - `state-annual-500-us-<width>.png`: annual billing at 500 athletes, full page.
  - `state-annual-1000-{us,latam}-plans-<width>.png`: the plans section, annual billing at 1000 athletes.
  - `state-modal-{addon-extra-coach,addon-branded-app,addon-credits,education-rates}-<width>.png`: the dialogs, EN with `?region=latam` (so the education rates are the LatAm ones).
  - `state-modal-education-rates-es-<width>.png`: the ES education-rates dialog, US region.
  - `state-faq-open-<width>.png`: the FAQ with two answers open.
  - `state-focus-{select,cta}-<width>.png`: the keyboard focus ring on the athlete select and on the first plan CTA.
  - `state-fallback-{top,plans}-<width>.png`: JavaScript on but the pricing script blocked (route aborted), after the 2.5 s failsafe, `?region=latam` with a US time zone: the note, no controls or dialog triggers, US monthly prices for 100 athletes.
- `compare/top-en-light-{1440,390}-us.png`: the top of the built page, cropped to the mock's proportions (1440x960 and 390x585).
- `summary.json`: the 63 pricing check results and the measured numbers. The full run (home, nav and pricing) was 263/263. Round 1 fixes (head `2478158`) updated this branch; captures that did not change are byte-identical to round 0.
