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
npm run cutover-checks   # Playwright: redirects without JS, the 404, every carried page loads, the lead form (EN and ES); `-- --shots <dir>` saves screenshots
npm run evidence   # needs a build; Playwright screenshots, interaction checks and measured budgets in .evidence/
node scripts/evidence.mjs --coach-only   # just the Platform Coach pages, EN and ES (see below); add --checks-only to skip screenshots
node scripts/evidence.mjs --nav-only   # just the header checks: geometry 1025 to 1440, panel height, drawer and panel focus
node scripts/evidence.mjs --pricing-only   # just /pricing/ and /es/pricing/: prices, region, dialogs, fallback, layout, contrast, tab walk; add --checks-only to skip the screenshots, and --pricing-group=dialogs (data, region, prices, behaviour, dialogs, fallback, layout, contrast, links) to run one group, e.g. in a loop to look for flakes
node scripts/evidence.mjs --engage-only # just the Platform page checks, EN and ES (see below); add --checks-only to skip screenshots
```

- Pages: `/` and `/pricing/` (EN), `/es/` and `/es/pricing/` (ES). Copy lives in `src/i18n/{en,es}.ts`; `es.ts` is typed against `en.ts`, so `astro check` flags a missing key. Page copy lives in `src/i18n/pages/` (`pricing.ts`: EN and ES typed together).
- Pricing: one typed table holds every number: `src/data/prices.ts` (bands, education, add-ons, Free, the annual percentage; the annual figure is stored too). Page copy holds `{tokens}` and never a digit; `src/lib/template.ts` fills them. The region comes from the browser time zone (`src/lib/region.ts`, an allow-list of LatAm zones; Puerto Rico and anything unknown are US); `?region=latam` or `?region=us` overrides it for testing. US prices are in the HTML; LatAm prices exist only in the script bundle, so a US visitor never has them in the DOM. If the pricing script does not arrive within 2.5 s the page shows its fallback (`data-fallback`, not `data-ready`): US, monthly, 100 athletes, controls and dialog triggers hidden, a note, dialog content inline. Without JavaScript at all the page looks the same. To change a price, edit `prices.ts`, then the oracle in `scripts/lib/pricing-oracle.mjs`, which holds the numbers typed in by hand (`npm run verify` and the evidence run both fail until the two agree).
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
- Contact has no form endpoint yet: a valid submit opens the visitor's email app (mailto) and never claims a message was sent.
  The approved post-submit status (EN and ES) is written out in `scripts/lib/contact-contract.mjs`, independent of
  `src/i18n/pages/contact.ts`; verify and evidence compare the page with it word for word, so editing that copy means
  editing the contract too.
- Platform pages (`src/pages/{,es/}platform/{messaging,guardian-portal,teams,custom-branded-apps,integrations}/`): thin
  wrappers around `src/components/engage/*Page.astro`; all copy is in `src/i18n/pages/engage.ts` (EN and ES, ES typed against EN).
  Every claim on them is backed by Aria code, see the PR's claims table. `scripts/lib/engage-verify.mjs` (run by `npm run verify`)
  fails the build on an unbacked claim, a user or customer count, a competitor name, "all wearables", a demo call to action that
  does not go to `/contact/?topic=demo` (or "Talk to us" to `?topic=question`), or an internal link that does not resolve.
  The link guard (`scripts/lib/engage-links.mjs`) checks every internal href on the ten pages against `dist/`, the legacy pages
  carried in `public/` (resolved against `dist/`) and the element ids it points at. Routes that other open PRs own (`pendingRoutes`: the coach pages, help) are an explicit list and are printed as `pending` by `npm run verify`, never passed
  silently; a typo of one of them fails. Delete an entry when its PR has merged. A `/contact/` link in the page body must carry `?topic=demo` or `?topic=question`; the footer and nav link to the plain page. `scripts/lib/engage-checks.mjs` (run by
  `evidence`) covers overflow and clipped text (`clip-probe.mjs`) at 390/1024/1280/1440, WCAG AA in both themes, alt text,
  heading order, the Guardian child switcher and that Teams and `/pricing/` show the same schools price for the same visitor
  (`?region=us|latam`, ten time zones, a missing one).
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

## Cutover (R57 lane C)

Every URL that answers on stadioralabs.com today must still answer after the switch. `scripts/lib/live-urls.mjs` is the
manifest: `built` (Astro pages), `redirects`, `carried` (copied into `public/`), `retired` (each with a reason) and `notUrls`
(repo files that were never URLs). `scripts/lib/cutover-verify.mjs`, run by `npm run verify`, fails when a live URL is missing
from `dist/`, when a root file or old sitemap entry is in no group, and checks the rest of the cutover contract below. The root
files are compared while the root `index.html` still exists; delete the legacy root once Pages is on Actions.

- Carried at the same URLs (`public/`): `investors(.es).html` (noindex), `connect.html` (its dead `monitors.mp4` element is
  removed), `privacy.html`, `terms.html`, `api(-es).html`, `lead-magnet(-es).html`, `anthony/`, `ian/`, `stadioralabs info/`,
  `videos/api.mp4`, `CNAME`, `robots.txt` and `sitemap.xml` (a sitemap index pointing at the generated `sitemap-0.xml`).
  Edit them in place; they are static HTML and are not part of the Astro design system.
- Redirect stubs (meta refresh, canonical, no script): `team.html` to `/about/`, `team-es.html` to `/es/about/`,
  `index-es.html` to `/es/`, `index-preview.html` to `/`. They are out of the sitemap.
- `src/pages/404.astro`: one bilingual page (GitHub Pages cannot pick a language per path), noindex, no canonical.
- Lead form (`lead-magnet*.html`): without a Web3Forms key it opens the visitor's email app (mailto) and says so with the approved
  wording, and never claims success. With a key it reports success only for `response.ok` and `success === true`; anything else
  shows an error and a usable button. Set `WEB3FORMS_KEY` in both files when a key exists.
- SEO: canonical and hreflang on the carried pages that have a pair, per-type OG cards (`public/og/{home,platform,solutions,pricing,company}-{en,es}.png`,
  rendered by `node scripts/og.mjs`), and a sitemap that lists every indexable page and none of the noindex, redirect or 404 pages.
- Deploy: `.github/workflows/pages-deploy.yml` builds, verifies and deploys `web/dist`. Both jobs run only while the repository
  variable `PAGES_FROM_ACTIONS` is `true`, so merging does nothing until the cutover. It is `workflow_dispatch` plus push to `main`.
- Cutover: merge, set `PAGES_FROM_ACTIONS=true`, set Settings > Pages > Source to GitHub Actions, run the workflow, smoke the URLs.
  Rollback: set Source back to Deploy from a branch (`main`, `/`); the legacy root files are still there. Unset the variable.
