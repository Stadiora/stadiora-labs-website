# Evidence for PR #34

Screenshots and recordings for "Floodlight: Platform Engage pages (messaging, guardian portal, teams, custom-branded apps, integrations), EN and ES". This branch holds images and video only and is never merged.

- `stills/<page>/<locale>-<scheme>-<width>/`: `00-full.jpg` (whole page), `01-hero.jpg`, one `NN-section.jpg` per later section, `99-footer.jpg`. Pages: `messaging`, `guardian`, `teams`, `branded`, `integrations`. EN and ES, light and dark, 1440 and 390. Taken with reduced motion on, so every scene is settled and clips show their posters.
- `motion/<page>-desktop.mp4`: Playwright recording of a slow full scroll of the English light page at 1440x900 with motion on, encoded with ffmpeg. `motion/messaging-phone.mp4` is the same at 390x844.
- Current as of PR head `b90ec70` (review round 1 fixes `f08b6f4`, then `main` merged again with the Pricing page #36). All 264 stills and six recordings were captured there. 190 stills differ from the capture before round 1 (all 40 whole-page and all 40 hero stills carry the new soft scrim behind the heading and the lighter lane word, as does the closing band of every page); the merge with #36 changed no still (264 of 264 byte-identical to the capture at `f08b6f4`). The recordings were re-recorded after the merge because the header's shadow changed.
