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
node scripts/evidence.mjs --nav-only   # just the header checks: geometry 1025 to 1440, panel height, drawer and panel focus
node scripts/evidence.mjs --pricing-only   # just /pricing/ and /es/pricing/: prices, region, dialogs, layout, contrast, tab walk; add --checks-only to skip the screenshots
```

- Pages: `/` and `/pricing/` (EN), `/es/` and `/es/pricing/` (ES). Copy lives in `src/i18n/{en,es}.ts`; `es.ts` is typed against `en.ts`, so `astro check` flags a missing key. Page copy lives in `src/i18n/pages/` (`pricing.ts`: EN and ES typed together).
- Pricing: every number is in `src/data/pricing.ts` (nothing is computed from a formula except the annual figure, which is stored too). The region comes from the browser time zone (`src/data/region.ts`, an allow-list of LatAm zones; Puerto Rico and anything unknown are US); `?region=latam` or `?region=us` overrides it for testing. US prices are in the HTML; LatAm prices exist only in the script bundle, so a US visitor never has them in the DOM. Without JavaScript the page shows US monthly prices for 100 athletes with the controls hidden. To change a price, edit `pricing.ts`, then update the oracle in `scripts/lib/pricing-checks.mjs` (the evidence run fails until both agree).
- Design tokens: `src/styles/tokens.css` (light and dark). Text accent on light is `#0077A8`; `#00BEF3` is decorative only.
- Photos: drop a file named after its slot into `src/assets/photos/`; `src/data/photo-alt.json` holds EN and ES alt text.
  A missing slot renders a labelled placeholder and `npm run verify` fails on it.
- Motion: markup is server-rendered in its final state. `html.js` enables animation, `prefers-reduced-motion`
  keeps the static state, and every moving element has a pause control.
- Fonts (Sora, Inter; SIL OFL, licences in `src/assets/fonts/`) are self-hosted woff2 files and preloaded.
