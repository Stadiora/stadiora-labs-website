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
- `summary.json`: results of `node scripts/evidence.mjs --engage-only` (128 checks, all passing) with the measured contrast numbers.
