# stadioralabs.com, Astro rebuild (R57)

Not live until the Pages cutover (see "Cutover" below). GitHub Pages still serves the static HTML at the repo root
from `main` (legacy Jekyll build); nothing in `web/` is published until Pages is switched to the Actions deploy.
The root `_config.yml` excludes `web/` from that Jekyll build (Jekyll treats the `---` frontmatter of `.astro` files as
invalid YAML and fails the build); `npm run verify` checks this.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run check      # astro check (types and templates)
npm run verify     # asserts the built pages: SEO tags, hreflang, OG, no placeholders, budgets, Jekyll exclusion
npm run cutover-checks   # Playwright: redirects without JS, the 404, every carried page loads, the investor pages and cards carry an active noindex, the API footer links land, the lead form (EN and ES); `-- --shots <dir>` saves screenshots
npm run evidence   # needs a build; Playwright screenshots, interaction checks and measured budgets in .evidence/
node scripts/evidence.mjs --coach-only   # just the Platform Coach pages, EN and ES (see below); add --checks-only to skip screenshots
node scripts/evidence.mjs --nav-only   # just the header checks: geometry 1025 to 1440, panel height, drawer and panel focus
node scripts/evidence.mjs --pricing-only   # just /pricing/ and /es/pricing/: prices, region, the live estimate, the motion (odometer in the accessibility tree, the estimate loop, the iris ring), reveals, fallback, layout, contrast, tab walk; add --checks-only to skip the screenshots, and --pricing-group=estimate (data, region, prices, behaviour, reveals, estimate, motion, fallback, layout, contrast, links) to run one group, e.g. in a loop to look for flakes
node scripts/evidence.mjs --engage-only # just the Platform page checks and motion guards, EN and ES (see below); add --checks-only to skip screenshots
node scripts/evidence.mjs --engage-motion-only --checks-only # just the Platform motion guards; ENGAGE_ONLY=teams,integrations narrows the pages
```

- Pages: `/` and `/pricing/` (EN), `/es/` and `/es/pricing/` (ES). Copy lives in `src/i18n/{en,es}.ts`; `es.ts` is typed against `en.ts`, so `astro check` flags a missing key. Page copy lives in `src/i18n/pages/` (`pricing.ts`: EN and ES typed together).
- Pricing: one typed table holds every number: `src/data/prices.ts` (bands, education, add-ons, Free, the annual percentage; the annual figure is stored too). Page copy holds `{tokens}` and never a digit; `src/lib/template.ts` fills them. The region comes from the browser time zone (`src/lib/region.ts`, an allow-list of LatAm zones; Puerto Rico and anything unknown are US); `?region=latam` or `?region=us` overrides it for testing. US prices are in the HTML; LatAm prices exist only in the script bundle, so a US visitor never has them in the DOM. If the pricing script does not arrive within 2.5 s the page shows its fallback (`data-fallback`, not `data-ready`): US, monthly, 100 athletes, controls, switches and the estimate hidden, a note, every "More info" panel open. Without JavaScript at all the page looks the same. To change a price, edit `prices.ts`, then the oracle in `scripts/lib/pricing-oracle.mjs`, which holds the numbers typed in by hand (`npm run verify` and the evidence run both fail until the two agree).
- Prices on other pages (home teaser, solutions, company): import from the shared modules instead of copying numbers or zone lists.

  ```ts
  import { prices, usd } from '../data/prices';        // prices.coreFrom.us, prices.highSchool.latam, usd(n)
  import { detectRegion } from '../lib/region';        // server: detectRegion('', 'America/New_York'); client: detectRegion(window.location.search)
  ```

  `prices.coreFrom` and `prices.highSchool` are derived from the table, so they cannot drift. `src/components/pricing/` is for the pricing page only.
- Solutions (schools, coaches, teams-and-clubs, athletes), Resources (case studies), About and Contact exist in EN and ES.
  Copy is in `src/i18n/pages/*.ts`, page bodies in `src/components/pages/`, and `src/pages/**` are thin route files.
  `npm run verify` and `npm run evidence` cover them (`scripts/lib/verify-solutions.mjs`, `scripts/lib/solutions-checks.mjs`).
  Their price teasers come from `src/data/prices.ts` and `src/lib/region.ts` (the same table and detector as `/pricing/`, nothing is copied). The HTML ships the US price, so no-JS visitors see it; the script swaps in the LatAm price. The evidence run checks each teaser against `/pricing/` for `?region=us`, `?region=latam` and the time zones in between.
- Case studies: the production page is an honest "coming soon" state, noindex and out of the sitemap. Placeholder cards and a
  sample story page render only under `npm run dev`, and the build never emits them.
- Contact posts to the live endpoint `POST https://api.runwitharia.com/api/public/website-contact` (Aria app-backend; contract in
  Stadiora/Aria PR #16610; CORS allows only stadioralabs.com and www). The page shows "sent" only on a 202; a 400, a 429, a 503, any
  other status and a network failure each show their own message plus the direct email and WhatsApp links. Every post carries the
  honeypot (`website`, empty) and `startedAt`, and waits out the endpoint's 3 s minimum fill time. The endpoint, roles, contacts and
  the approved "sent" sentence (EN and ES) are written out in `scripts/lib/contact-contract.mjs`, independent of `src/`; verify and
  evidence compare the page with it, so editing that copy means editing the contract too. The browser checks intercept the endpoint
  (`scripts/lib/contact-route.mjs`): no test sends real email. `node scripts/evidence.mjs --contact-only` runs just those checks.
- Both regions are listed on Contact, in the footer and on `public/connect.html` (US: Ian Rowe; LatAm: Anthony, WhatsApp). The data is
  in `src/data/site.ts` (`contacts`).
- `node scripts/mutation-prove-contact.mjs` (clean tree only) breaks each contact rule in the source, rebuilds, and proves the gate that
  protects it fails on the intended assertion; it prints the table with the head SHA.
- Solutions, Resources, About and Contact in Floodlight (DESIGN-4 section 6): every page runs on `src/layouts/SolutionsPage.astro`
  (the foundation, the motion kit and `src/styles/solutions/solutions.css`; everything in the lane is prefixed `sx-`). The hero is
  `src/components/solutions/SxHero.astro` (impact, mesh, orbits, display H1; the Schools and Coaches swap line is one sentence for a
  screen reader and its visible words are `aria-hidden`), every page ends on `FinalNight.astro` (night-stadium clip, HTML title) and
  the dark footer. Copy for the added strings is in `src/i18n/pages/solutions-fx.ts` (EN and ES). Page scripts are in
  `src/scripts/solutions/` (`index.ts` starts them, then the kit): `swap.ts` (hero word swap), `feed.ts` (clubs team feed),
  `morph.ts` (athletes app morph), `contact.ts` (topic thumb, submit burst). Each one only animates away from the finished still
  frame, uses `autoplayer()` (so it stops on hover, focus, off screen, in a hidden tab and under reduced motion) and never writes
  copy: the contact burst is ten decorative dots that fire only after a 202, and the status text is checked against `contact-contract.mjs`.
  The Coaches hero clip is `public/solutions/media/sx-coaches.{webm,mp4,webp}` (lane clips are named `sx-*`, carry no words, and
  follow the clip markup and budget above; the home clips `night-stadium`, `ai-bg`, `engage-bg`, `tile-chalk`, `tile-hurdler`
  and `reel` are the only other text-free clips, and the `pillar-*` clips have titles baked in, so a page may not use them).
  `scripts/lib/solutions-floodlight-verify.mjs` (run by `npm run verify`) fails the build on a missing mesh or orbits, an H1
  that is not the display face, too few dark surfaces, a final that is not on the night-stadium clip or sits after the footer,
  a swap line a screen reader cannot read as one sentence,
  decoration that is neither `aria-hidden` nor a labelled image, a burst that carries text, a pre-rendered status or a topic
  control that is not two radios. Its media part is `solutions-media-guard.mjs`: every `<video>` has its WebM source, its MP4
  source and its poster checked one by one against the text-free list and against the clip that slot is meant to play (the hero,
  the stage or the final band), and a `src` on the `<video>` itself, a missing source or an unlisted file fails; the mutation
  proofs are a `src` of `pillar-training.mp4` on the opening tag, both sources swapped for the `pillar-training` pair with the
  poster kept, and the final MP4 swapped for `ai-bg`, each of which must make `npm run verify` exit 1.
  `scripts/lib/solutions-floodlight-checks.mjs` (run by `evidence`) drives Chromium: the
  Floodlight anatomy in the light theme, text cut off by a clipping ancestor at 390 and 1440 (`clip-probe.mjs`), the swap line
  moving, resting under reduced motion and pausing on hover, the coaches clip, the clubs feed, the athletes morph, the About "A"
  window and the contact thumb, burst and approved status text. It also runs two measuring modules, both on rendered pixels:
  `solutions-motion-checks.mjs` samples the transforms, boxes and clip times of every hover scope (the hero, conveyors, stages,
  morph, feed) while it runs, while the pointer is over it, while focus is inside it, offscreen and in a hidden tab (a flag is
  never read, so a CSS override that keeps a conveyor moving fails), and `solutions-pixel-contrast.mjs` takes five photographs
  (real ink, hidden, black, white, and isolated black text on white). It compares sampled glyph interiors with the hidden-ink
  backdrop, using 4.5:1 or 3:1 for large text. The configured cases are 390/1440, EN/ES and light/dark, with reduced-motion stills,
  five animation phases, six shared-clock times in orbit sections, and the four athlete apps. Transitions are suppressed only
  during each measurement and restored after real ink has resolved; production button styling is unchanged.

  **Pixel-contrast coverage boundary.** PR #35's committed-head mutation table uses these proof IDs; claims are limited to
  those payloads and variants, not arbitrary paint-order analysis:

  | Proof ID | Covered regression |
  | --- | --- |
  | `front-text-erase` | Athletes EN/light/1440: erase the existing app name after moving it in front of the phone as a z-index 10 sibling; the ordinary exported guard fails. |
  | `descendant-erase` | Same variant: erase the name inside the front phone; the ordinary exported guard fails. |
  | `dot-half`, `dot-opaque` | Coaches EN/light/1440: reviewed foreground dots at half/full opacity fail the ordinary exported moving assertion. |
  | `transition-restored` | Removing measurement transition suppression destabilizes repeated frozen About ES/dark/390 "Inversionistas" ratios; the clean control stays near 18.42:1. |
  | `identity` | Unchanged guard: the scoped athlete/coaches checks and repeated About measurements pass. |

  **NOT COVERED:** the fanned `.sx-morph > .sx-ms.l1` and `.r1` phone subtrees (even their visible text), the explicit
  `PURE_DECORATION` selectors, hidden/near-transparent/1px-clipped text, nodes with no qualifying sampled pixels, arbitrary
  overlays or layouts, and motion between sampled frames. There is no rectangle exemption around the front `.dphone`.
  The solid/gradient/faded canaries remain checks, not broader mutation-coverage claims.
  `solutions-checks.mjs` still owns overflow, overlap, contrast,
  target size, forms and prices; its overlap probe now reads a tight display line by its line box, and ignores `.sr` text.
- Platform pages (`src/pages/{,es/}platform/{messaging,guardian-portal,teams,custom-branded-apps,integrations}/`): thin
  wrappers around `src/components/engage/*Page.astro`; all copy is in `src/i18n/pages/engage.ts` (EN and ES, ES typed against EN).
  Every claim on them is backed by Aria code, see the PR's claims table. `scripts/lib/engage-verify.mjs` (run by `npm run verify`)
  fails the build on an unbacked claim, a user or customer count, a competitor name, "all wearables", a demo call to action that
  does not go to `/contact/?topic=demo` (or "Talk to us" to `?topic=question`), or an internal link that does not resolve.
  The link guard (`scripts/lib/engage-links.mjs`) checks every internal href on the ten pages against `dist/`, the legacy pages
  carried in `public/` (resolved against `dist/`) and the element ids it points at. Routes that other open PRs own (`pendingRoutes`: the coach pages, help) are an explicit list and are printed as `pending` by `npm run verify`, never passed
  silently; a typo of one of them fails. Delete an entry when its PR has merged. A `/contact/` link in the page body must carry `?topic=demo` or `?topic=question`; the footer and nav link to the plain page. `scripts/lib/engage-checks.mjs` (run by
  `evidence`) covers overflow and clipped text (`clip-probe.mjs`) at 390/1024/1280/1440, WCAG AA in both themes, alt text,
  heading order, the live Messaging phone and the Guardian child switcher (tab ARIA, click and arrow keys) and that Teams and
  `/pricing/` show the same schools price for the same visitor (`?region=us|latam`, ten time zones, a missing one). The clip
  check also sweeps 16 widths from 360 to 1600 px on all five pages. Three more guards read what a browser really produces:
  `engage-a11y-checks.mjs` (the selected Messaging and Guardian tabpanel is visible and in the accessibility tree with its text,
  and every standalone link and control in `main` is 44 x 44 or larger at 390 px), `engage-heading-contrast.mjs` (sampled
  `.grad-text` glyph-interior contrast; see "Heading contrast proof" below)
  and `engage-media-guard.mjs` (every `<video>` in the built HTML is judged on its own `src`, every `<source>` and its poster against
  the text-free list and the clip of its slot; `npm run verify` runs it).
- Platform page look (Floodlight, R57 VB-3): every page is an `.impact` hero (`EngageHero`, split, overlap or orbit variant) with a
  live HTML stage on the right, at least one dark `.show.impact` stage, the shared `AlsoInAria` links and the `EngageFinal` call to
  action on the `night-stadium` clip. Styles are `src/styles/engage/{base,messaging,guardian,teams,branded,integrations}.css`
  (`eg-` prefixed classes; the foundation and home CSS stay untouched) and scripts `src/scripts/engage/*.ts`. Everything that moves
  goes through the motion kit (`src/scripts/motion/kit.ts`: `autoplayer`, `autotabs`, `group`, `tl`), so it starts on screen, pauses
  on hover, focus, off screen and in a hidden tab, and is a finished still under reduced motion. No clip with words baked into the
  picture is used (`pillar-*` and `planner-demo` stay on the home); the demo UIs are HTML. `scripts/lib/engage-motion-checks.mjs`
  guards all of that: the Floodlight frame, text-free clips, every autoplayer (start, off screen, hover, focus, resume), a hidden tab,
  the live reduced-motion flip, finished stills, the tab sets rotating, the Teams rail and the planner, the Branded morph and the
  Integrations chips. `engage-movement-checks.mjs` (called from it) checks real movement, not `data-ap` flags: for every autoplayer it
  takes the clocks of the animations and transitions in its scope, its text and markup and the time of its clips, and requires that
  nothing advances for 1.4 s after a pause (pointer, focus, off screen, hidden tab, reduced motion switched on mid-run) and that it
  moves again afterwards; the Branded morph must also settle on one brand under reduced motion at any point of a swap. The page chrome
  that is not an autoplayer (`.mesh`, `.orbits`, `.grad-text`) is out of scope, as in the Coach guard. `.rv-mask` elements never get `.in` (an IntersectionObserver ignores an element whose own clip-path hides it),
  so a reveal that clips an element observes a wrapper `.rv` and clips its child.
  Prices on these pages are not typed into the copy: the Teams schools teaser and the Branded add-on line are rendered from
  `src/data/prices.ts` (`education`, `addOns`) with `{tokens}` in `engage.ts`, and the Teams script picks the region with
  `detectRegion` from `src/lib/region.ts`, the same two modules `/pricing/` uses. `npm run verify` fails on a dollar amount in
  `engage.ts`, and on a rendered price that disagrees with the oracle in `scripts/lib/pricing-oracle.mjs`.

- Design tokens (Floodlight, DESIGN-4): `src/styles/tokens.css`. Light is the default and the toggle is kept; the `.impact` sections (hero,
  dark stages, final CTA, footer) are dark in both themes, and `.reading` panels follow the page theme. Text uses the `*-ink` tokens
  (`--cyan-ink` is `#0077A8` on light); the vivid brand colours are fills and decoration only. `floodlight.css` holds the shared
  Floodlight components (glass pill nav styles, buttons, reveal, mesh and orbit motif, marquee), `motion.css` the reduced-motion rules.
- Photos: drop a file named after its slot into `src/assets/photos/`; `src/data/photo-alt.json` holds EN and ES alt text.
  A missing slot renders a labelled placeholder and `npm run verify` fails on it.
- Platform Coach pages (`src/pages/{,es/}platform/{programs,nutrition,readiness,power-lab}/`): thin wrappers (they pass `hero` to `Base`
  for the transparent nav) around `src/components/coach/{programs,nutrition,readiness,power-lab}/*Page.astro`; all copy is in
  `src/i18n/pages/` (EN and ES, ES typed against EN). Every page is the Floodlight pattern: `CoachHero` (dark `.impact` hero with mesh,
  orbits and a moving clip or live HTML stage on the right, with HTML overlay words from i18n), one or more dark `.cf-stage.impact` stages,
  `AlsoInAria` and `CoachFinal` (the home closing band over the `night-stadium` clip). The product screens (`StepFlow`, `Accordion`,
  `HoverRevealRow`, `ChartBaseline`, the phone and browser frames) are unchanged in content; `Accordion` has an `overlay` slot for live
  cards over its stage. Styles: the Floodlight layer is `src/styles/coach/cf.css` (every selector starts `cf-` or `.cf-page`), the
  product-screen styles stay in `src/styles/coach.css`. Scripts: `src/scripts/coach/index.ts` (imported by `CoachHero`) starts the AI
  demo and the motion kit, and `stages.ts` runs the kit's `autoplayer()` on every `[data-cf-stage]` host. A hidden tab pauses every loop
  through the kit's `html.tab-hidden`. Add new coach motion as CSS keyframes inside a `[data-cf-stage]` (hero frame, accordion root,
  scan stage, programs send stage, open `StepFlow`): `cf.css` pauses everything in it while its `data-ap` is `off` (hover, focus, off
  screen, reduced motion). An accordion's backdrop clip carries `data-ap-within="#<id>-acc"`, so the accordion buttons pause the clip
  too. Other coach motion goes through the kit's `.rv`, `.lines`, `.count` and `[data-depth]`/`[data-tilt]`.
- Coach clips are `public/home/media/coach-{programs,nutrition,readiness,powerlab}.{webm,mp4,webp}`: text-free, rendered by
  `node scripts/clips/render.mjs` from `scripts/clips/stages/*.html` (stage HTML over the photos in `scripts/clips/src/`; needs
  Playwright and ffmpeg). Never use the clips with words in the picture (`pillar-*`, `ai-demo`, `planner-demo`) on these pages.
- Coach guards: `scripts/lib/platform-coach-verify.mjs` (run by `npm run verify`) fails the build on an unbacked claim, a competitor
  name, a missing "estimates" or "not a medical check" footnote, a broken hreflang pair or a missing demo link;
  `scripts/lib/platform-coach-floodlight.mjs` (called from it) fails on a page without the dark hero, mesh, orbits, a dark stage, the
  `night-stadium` closing band, its own moving hero clip, an opening ¿ or ¡ in Spanish, a stage host without `data-cf-stage` or an
  `data-ap-within` that points nowhere, and on a coach stylesheet without its no-JS, reduced-motion and stage-pause rules.
  `scripts/lib/coach-media-guard.mjs` (called from it) reads every `<video>`: its WebM, MP4 and poster must be one text-free clip
  (the shared `TEXT_FREE_MEDIA` list in `home-verify.mjs`; a new clip stem goes there once it is checked) and each slot must play the
  expected clip (hero `coach-<page>`, final `night-stadium`, stage clips as listed in the module).
  `scripts/lib/platform-coach-checks.mjs` (run by `evidence`) covers overflow,
  sideways clipping and overlapping text at 390/1024/1280/1440, WCAG AA in both themes (the shared `contrast.mjs` probe, with no
  exclusions: the AI demo stage is measured at rest and, by `coach-contrast-checks.mjs`, at 17 frames of its 12 s timeline plus a
  canary that must be caught), alt text, heading order, the keyboard walk, the accordion and hover-reveal behaviour, the count-up,
  the motion contract (no endless CSS loop far off screen, none in a hidden tab, none under reduced motion, and, by
  `coach-motion-checks.mjs`, every moving stage and accordion clip held still under the pointer and under keyboard focus and moving
  again afterwards) and a no-JavaScript render.
- Motion library: `src/scripts/motion/kit.ts` (small TypeScript, no dependencies). Anything that moves on its own is an `autoplayer()`
  (or a `group()`, `autotabs()` or a `video[data-clip]`, which use it): it runs only while on screen, with the tab visible, with no
  pointer hovering and no focus inside its scope, and never under `prefers-reduced-motion`. It mirrors its state to `data-ap`
  (`on`/`off`) and `data-ap-why` (`reduced`, `hidden`, `offscreen`, `hover`, `focus`), and marks the hover/focus element with
  `data-ap-scope`; the guards read those attributes. Markup is server-rendered in its finished state; the base CSS is the still frame
  and JS only animates. Reduced motion: no autoplay, no loops, posters instead of clips, smooth scrolling off.
- Home page (`src/components/home/Home.astro`): hero, AI program, pillars, brand strip, showcase, proof and final reel, EN and ES.
  Copy is in `src/i18n/pages/home-*.ts`, section styles in `src/styles/home/`, section scripts in `src/scripts/home/` (entry `index.ts`).
- Home clips live in `public/home/media/` as WebM + MP4 + WebP poster (`<video muted playsinline loop preload="none" data-clip>`, the kit
  applies the poster near the viewport and plays on visibility). Budget: 1.6 MB per clip, posters 120 KB; `npm run verify` enforces
  it (`scripts/lib/home-verify.mjs`) together with the clip markup contract and broken `/home/*` references. Photos for the home are in
  `public/home/img/` (WebP).
- Fonts (Archivo variable for display, Inter variable for text, JetBrains Mono variable for labels; SIL OFL, licences in
  `src/assets/fonts/`) are self-hosted woff2 files; Archivo and Inter are preloaded.

## Heading contrast proof

`scripts/lib/engage-heading-contrast.mjs` compares real, hidden-span, white-text and black-text captures with the
orbit dots still visible. The white/black difference selects fully covered glyph pixels and their four neighbours;
the assertion uses the minimum real/backdrop ratio, not a percentile. Runner configuration: the five Engage pages,
EN/ES, 390/1440 px, reduced motion in both themes and five seeded motion-on frames in dark mode. The threshold is
3:1 for large text, 4.5:1 otherwise.

Mutation-proven claims are deliberately narrow. Proof pointers are the named rows in the
[PR #34 round-3 author mutation table](https://github.com/Stadiora/stadiora-labs-website/pull/34), recorded against
the committed head with content comparisons, restoration checks and assertion lines taken from runtime stacks:

- `reviewer-dot`: enlarging the Spanish Teams closing dots to `r: 150px` at desktop with motion on fails the minimum
  contrast assertion; their rendered backdrop is not exempted.
- `round2-dark-stop`: the `#081223` stop at 87.40856–89.24949% on that heading fails the same minimum assertion;
  a small lost glyph is not forgiven as a percentile.
- `mobile-orbit-rollback`: restoring the closing orbit's old vertical position fails the mobile minimum assertion.
  The phone layout moves the orbit paths down toward the actions; it does not hide or pause the dots.
- `desktop-orbit-rollback`: restoring the inherited SVG width clamp fails the desktop Messaging minimum assertion.
  Removing that clamp lets the 120% orbit canvas stay centred instead of shifting its paths across the title.
- `identity`: unchanged built CSS passes all 12 Teams checks.

**NOT COVERED:** an exhaustive minimum over animation time, other browsers or widths, antialiased glyph edges,
non-`.grad-text` text, the small-text 4.5:1 branch, or every possible style/media/stacking regression. Clean checks
on the other configured pages and themes are samples, not mutation proof for those cases.

## Cutover (R57 lane C)

Every URL that answers on stadioralabs.com today must still answer after the switch. `scripts/lib/live-urls.mjs` is the
manifest: `built` (Astro pages), `redirects`, `carried` (copied into `public/`), `retired` (each with a reason) and `notUrls`
(repo files that were never URLs). `scripts/lib/cutover-verify.mjs`, run by `npm run verify`, fails when a live URL is missing
from `dist/`, when a root file or old sitemap entry is in no group, and checks the rest of the cutover contract below. The root
files are compared while the root `index.html` still exists; delete the legacy root once Pages is on Actions.

- Carried at the same URLs (`public/`): `investors(.es).html` (noindex), `connect.html` (its dead `monitors.mp4` element is
  removed; it has a canonical and an OG image and is in the sitemap, as the public link hub), `privacy.html`, `terms.html`, `api(-es).html`, `lead-magnet(-es).html`, `anthony/`, `ian/`, `stadioralabs info/`,
  `videos/api.mp4`, `CNAME`, `robots.txt` and `sitemap.xml` (a sitemap index pointing at the generated `sitemap-0.xml`).
  Edit them in place; they are static HTML and are not part of the Astro design system.
- Links on every page: `scripts/lib/link-guard.mjs` (run by `npm run verify`) fails on any link to stadioralabs.com (relative, root-relative
  or absolute, with or without a `#fragment`) whose page is not in the build, whose fragment has no matching id on the target page, or
  that points at a redirect stub with a fragment (the meta refresh drops it). The carried pages and stubs get no allowance; built pages
  may still link to the routes in `pendingRoutes` (`/help/`). The API footers map Aria 12 to `/solutions/athletes/`, Aria for Coaches to
  `/solutions/coaches/`, Our Mission to `/about/` and The Engine to `/platform/programs/` (each with its `/es/` twin).
- Markup guards read tags with `scripts/lib/html-scan.mjs`, which skips comments and script/style text: a `<meta name="robots">` inside
  a comment is not active, so it does not count as noindex.
- Redirect stubs (meta refresh, canonical, no script): `team.html` to `/about/`, `team-es.html` to `/es/about/`,
  `index-es.html` to `/es/`, `index-preview.html` to `/`. They are out of the sitemap.
- `src/pages/404.astro`: one bilingual page (GitHub Pages cannot pick a language per path), noindex, no canonical.
- Lead form (`lead-magnet*.html`): posts to the same contact endpoint (topic demo, role from the quiz path, honeypot and `startedAt`,
  3 s wait). "On the list" shows only on a 202; any other answer keeps a usable button and shows a message with the direct contacts.
- SEO: canonical and hreflang on the carried pages that have a pair, per-type OG cards (`public/og/{home,platform,solutions,pricing,company}-{en,es}.png`,
  rendered by `node scripts/og.mjs`), and a sitemap that lists every indexable page and none of the noindex, redirect or 404 pages.
- Deploy: `.github/workflows/pages-deploy.yml` builds, verifies and deploys `web/dist`. Both jobs run only while the repository
  variable `PAGES_FROM_ACTIONS` is `true`, so merging does nothing until the cutover. It is `workflow_dispatch` plus push to `main`.
- Cutover: merge, set `PAGES_FROM_ACTIONS=true`, set Settings > Pages > Source to GitHub Actions, run the workflow, smoke the URLs.
  Rollback: set Source back to Deploy from a branch (`main`, `/`); the legacy root files are still there. Unset the variable.
