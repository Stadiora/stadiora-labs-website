# Evidence for PR #31

Screenshot evidence for "feat(web): Platform Coach pages: Programs, Nutrition, Readiness, Power Lab, EN and ES (R57, not live until cutover)".
This branch holds images only and is never merged.

- `mocks/<page>.png`: the approved design mocks (`design/final/feature-programs.png`, `design/final-2/feature-{nutrition,readiness,readiness-phone,powerlab}.png`).
- `built/<page>-<locale>-<scheme>-<width>.png`: full-page captures of the static build (headless Chromium, fonts settled, lazy images loaded, every scroll-reveal block revealed, default motion). Pages: `programs`, `nutrition`, `readiness`, `power-lab`. 32 files: 4 pages x EN/ES x light/dark x 1440/390. Taken with a tall viewport rather than Playwright's `fullPage`, which draws the clipped hover-card phones on Readiness.
- `built/state-*.png`: interactive states.
  - `state-programs-en-light-1440-accordion-<n>`, `state-programs-en-dark-390-accordion-<n>`: each accordion row open, with its screen.
  - `state-readiness-en-light-1440-accordion-<n>`, `state-readiness-es-dark-1440-accordion-<n>`: the same for Readiness (six rows).
  - `state-readiness-{en-light,es-dark}-1440-hover-<n>`: each "A calmer mind" card hovered, phone risen.
  - `state-readiness-en-light-1440-reduced-motion-cards`: the same cards with reduced motion (phone shown under each label).
- `compare/<page>-en-light-1440.png`: the built page cropped to the part the mock shows (Programs 0-1300 px, Nutrition 0-1226 px, Readiness 588-2464 px, Power Lab 0-1316 px). The mocks pack the hero and first section into one 3:2 frame, so these are taller than 3:2.
- `summary.json`: the 186 coach checks from `node scripts/evidence.mjs --coach-only` (all passing) with the measured contrast numbers.
