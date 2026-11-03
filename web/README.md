# stadioralabs.com, Astro rebuild (R57)

Not live. GitHub Pages still serves the static HTML at the repo root from `main`; nothing in `web/` is
published until the cutover. The root `_config.yml` excludes `web/` from Pages' Jekyll build (Jekyll treats
the `---` frontmatter of `.astro` files as invalid YAML and fails the build); `npm run verify` checks this.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run check      # astro check (types and templates)
npm run verify     # asserts the built pages: SEO tags, hreflang, OG, no placeholders, budgets, Jekyll exclusion
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
- Platform pages (`src/pages/{,es/}platform/{messaging,guardian-portal,teams,custom-branded-apps,integrations}/`): thin
  wrappers around `src/components/engage/*Page.astro`; all copy is in `src/i18n/pages/engage.ts` (EN and ES, ES typed against EN).
  Every claim on them is backed by Aria code, see the PR's claims table. `scripts/lib/engage-verify.mjs` (run by `npm run verify`)
  fails the build on an unbacked claim, a user or customer count, a competitor name, "all wearables", a demo call to action that
  does not go to `/contact/?topic=demo` (or "Talk to us" to `?topic=question`), or an internal link that does not resolve.
  The link guard (`scripts/lib/engage-links.mjs`) checks every internal href on the ten pages against `dist/`, the legacy pages at
  the repo root and the element ids it points at. Routes that other open PRs own (`pendingRoutes`: solutions, about,
  contact, case studies, the coach pages) are an explicit list and are printed as `pending` by `npm run verify`, never passed
  silently; a typo of one of them fails. Delete an entry when its PR has merged. `scripts/lib/engage-checks.mjs` (run by
  `evidence`) covers overflow and clipped text (`clip-probe.mjs`) at 390/1024/1280/1440, WCAG AA in both themes, alt text,
  heading order, the Guardian child switcher and that Teams and `/pricing/` show the same schools price for the same visitor
  (`?region=us|latam`, ten time zones, a missing one).
  Prices on these pages are not typed into the copy: the Teams schools teaser and the Branded add-on line are rendered from
  `src/data/prices.ts` (`education`, `addOns`) with `{tokens}` in `engage.ts`, and the Teams script picks the region with
  `detectRegion` from `src/lib/region.ts`, the same two modules `/pricing/` uses. `npm run verify` fails on a dollar amount in
  `engage.ts`, and on a rendered price that disagrees with the oracle in `scripts/lib/pricing-oracle.mjs`.
- Design tokens: `src/styles/tokens.css` (light and dark). Text accent on light is `#0077A8`; `#00BEF3` is decorative only.
- Photos: drop a file named after its slot into `src/assets/photos/`; `src/data/photo-alt.json` holds EN and ES alt text.
  A missing slot renders a labelled placeholder and `npm run verify` fails on it.
- Platform Coach pages (`src/pages/{,es/}platform/{programs,nutrition,readiness,power-lab}/`): thin wrappers around
  `src/components/coach/{programs,nutrition,readiness,power-lab}/*Page.astro`; all copy is in `src/i18n/pages/` (EN and ES, ES typed
  against EN) and the shared parts are in `src/components/coach/` and `src/styles/coach.css`. `scripts/lib/platform-coach-verify.mjs`
  (run by `npm run verify`) fails the build on an unbacked claim, a competitor name, a missing "estimates" or "not a medical check"
  footnote, a broken hreflang pair or a missing demo link. `scripts/lib/platform-coach-checks.mjs` (run by `evidence`) covers overflow,
  sideways clipping and overlapping text at 390/1024/1280/1440, WCAG AA in both themes, alt text, heading order, the keyboard walk,
  the accordion and hover-reveal behaviour, the count-up and a no-JavaScript render.
- Motion: markup is server-rendered in its final state. `html.js` enables animation, `prefers-reduced-motion`
  keeps the static state, and every moving element has a pause control.
- Fonts (Sora, Inter; SIL OFL, licences in `src/assets/fonts/`) are self-hosted woff2 files and preloaded.
