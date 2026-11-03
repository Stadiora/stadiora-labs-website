# Evidence for PR #34

Screenshots and recordings for "Floodlight: Platform Engage pages (messaging, guardian portal, teams, custom-branded apps, integrations), EN and ES". This branch holds images and video only and is never merged.

- `stills/<page>/<locale>-<scheme>-<width>/`: `00-full.jpg` (whole page), `01-hero.jpg`, one `NN-section.jpg` per later section, `99-footer.jpg`. Pages: `messaging`, `guardian`, `teams`, `branded`, `integrations`. EN and ES, light and dark, 1440 and 390. Taken with reduced motion on, so every scene is settled and clips show their posters.
- `motion/<page>-desktop.mp4`: Playwright recording of a slow full scroll of the English light page at 1440x900 with motion on, encoded with ffmpeg. `motion/messaging-phone.mp4` is the same at 390x844.
