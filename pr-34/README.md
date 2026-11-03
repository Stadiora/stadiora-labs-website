# Evidence for PR #34

Screenshots and recordings for "Floodlight: Platform Engage pages (messaging, guardian portal, teams, custom-branded apps, integrations), EN and ES". This branch holds images and video only and is never merged.

- `stills/<page>/<locale>-<scheme>-<width>/`: `00-full.jpg` (whole page), `01-hero.jpg`, one `NN-section.jpg` per later section, `99-footer.jpg`. Pages: `messaging`, `guardian`, `teams`, `branded`, `integrations`. EN and ES, light and dark, 1440 and 390. Taken with reduced motion on, so every scene is settled and clips show their posters.
- `motion/<page>-desktop.mp4`: Playwright recording of a slow full scroll of the English light page at 1440x900 with motion on, encoded with ffmpeg. `motion/messaging-phone.mp4` is the same at 390x844.
- Current as of PR head `6e6fc5d` (after merging the home lane's round-1 fixes). All 264 stills and six recordings were re-captured there; the 16 Integrations hero and whole-page stills changed with the home's new orbit layout and the other 248 are pixel-identical (at most 0.05% of pixels differ by more than 24 levels), so only those 16 files and the recordings were replaced.
