# Evidence for PR #29

Screenshot evidence for "feat(web): Platform pages: messaging, guardian portal, teams, custom-branded apps, integrations (R57, EN + ES)".
This branch holds images only and is never merged.

- `mocks/<page>.png`: the approved design mocks (`design/final-2/feature-*.png`), desktop only; there are no phone mocks for these five pages.
- `built/<page>-<locale>-<scheme>-<width>.png`: full-page captures of the static build (headless Chromium, fonts settled, lazy images loaded). Pages: `messaging`, `guardian-portal`, `teams`, `custom-branded-apps`, `integrations`. 40 files: 5 pages x EN/ES x light/dark x 1440/390.
- `built/state-*.png`: interactive states, 1440x900 viewport, EN and ES.
  - `state-messaging-chat-played-<locale>`: the chat tile after the bubbles have played in.
  - `state-guardian-mateo-<locale>`: the "What families see" switcher on the second child.
  - `state-teams-latam-<locale>`: `/platform/teams/?region=latam`, school price $69.
- `compare/top-<page>-en-light-1440.png`: the top of the built page, cropped to the mock's 3:2 proportions (1440x960).
- `summary.json`: results of `node scripts/evidence.mjs --engage-only` on the original head `58c467a` (128 checks, all passing) with the measured contrast numbers.

## Round 1 fix (code head `7e8ea3b`)

`built/`, `compare/` and `summary.json` above are from the original head (`58c467a`) and are kept for the record. Where a section changed in the fix round, `round1/` has the final UI. Headless Chromium, reduced motion, 2x, fonts settled, lazy images loaded, time zone of the host.

- `round1/before/`: the old build (`58c467a`), the clipping the review found.
  - `messaging-announcements-{en,es}-1280.png`: the Announcements tile at 1280 wide. The read times and the names are cut by the tile.
  - `teams-es-390.png`: the Teams panel in Spanish at 390 wide. The tab strip loses "Reportes" and the table scrolls sideways.
- `round1/after/`: the fixed build, same crops.
  - `teams-schools-{en,es}-{us,latam}-1280.png`: the schools teaser on Teams with `?region=us` and `?region=latam`. The amount is now read from the shared price table (`src/data/prices.ts`) and the shared region code (`src/lib/region.ts`).
- `round1/summary-engage.json`: the engage group of the full evidence run (196 of 196 pass; the whole run is 459 of 459), with the contrast numbers for the five pages.

What these images cannot show: where the demo and "Talk to us" buttons go, and whether every link resolves. Those are asserted in `npm run verify` (`scripts/lib/engage-verify.mjs`, `scripts/lib/engage-links.mjs`).
