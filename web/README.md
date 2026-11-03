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
node scripts/evidence.mjs --pricing-only   # just /pricing/ and /es/pricing/: prices, region, dialogs, fallback, layout, contrast, tab walk; add --checks-only to skip the screenshots, and --pricing-group=dialogs (data, region, prices, behaviour, dialogs, fallback, layout, contrast, links) to run one group, e.g. in a loop to look for flakes
```

- Pages: `/` and `/pricing/` (EN), `/es/` and `/es/pricing/` (ES). Copy lives in `src/i18n/{en,es}.ts`; `es.ts` is typed against `en.ts`, so `astro check` flags a missing key. Page copy lives in `src/i18n/pages/` (`pricing.ts`: EN and ES typed together).
- Pricing: one typed table holds every number: `src/data/prices.ts` (bands, education, add-ons, Free, the annual percentage; the annual figure is stored too). Page copy holds `{tokens}` and never a digit; `src/lib/template.ts` fills them. The region comes from the browser time zone (`src/lib/region.ts`, an allow-list of LatAm zones; Puerto Rico and anything unknown are US); `?region=latam` or `?region=us` overrides it for testing. US prices are in the HTML; LatAm prices exist only in the script bundle, so a US visitor never has them in the DOM. If the pricing script does not arrive within 2.5 s the page shows its fallback (`data-fallback`, not `data-ready`): US, monthly, 100 athletes, controls and dialog triggers hidden, a note, dialog content inline. Without JavaScript at all the page looks the same. To change a price, edit `prices.ts`, then the oracle in `scripts/lib/pricing-oracle.mjs`, which holds the numbers typed in by hand (`npm run verify` and the evidence run both fail until the two agree).
- Prices on other pages (home teaser, solutions, company): import from the shared modules instead of copying numbers or zone lists.

  ```ts
  import { prices, usd } from '../data/prices';        // prices.coreFrom.us, prices.highSchool.latam, usd(n)
  import { detectRegion } from '../lib/region';        // server: detectRegion('', 'America/New_York'); client: detectRegion(window.location.search)
  ```

- Pages: `/` (EN) and `/es/`. Copy lives in `src/i18n/{en,es}.ts`; `es.ts` is typed against `en.ts`, so `astro check` flags a missing key.
- Solutions (schools, coaches, teams-and-clubs, athletes), Resources (case studies), About and Contact exist in EN and ES.
  Copy is in `src/i18n/pages/*.ts`, page bodies in `src/components/pages/`, and `src/pages/**` are thin route files.
  `npm run verify` and `npm run evidence` cover them (`scripts/lib/verify-solutions.mjs`, `scripts/lib/solutions-checks.mjs`).
- Prices: `src/lib/region.ts` picks US or LatAm from the browser timezone (`?region=us|latam` overrides). The HTML always
  ships the US price, so no-JS visitors see it.
- Case studies: the production page is an honest "coming soon" state, noindex and out of the sitemap. Placeholder cards and a
  sample story page render only under `npm run dev`, and the build never emits them.
- Contact has no form endpoint yet: a valid submit opens the visitor's email app (mailto) and never claims a message was sent.
  The approved post-submit status (EN and ES) is written out in `scripts/lib/contact-contract.mjs`, independent of
  `src/i18n/pages/contact.ts`; verify and evidence compare the page with it word for word, so editing that copy means
  editing the contract too.
- Design tokens: `src/styles/tokens.css` (light and dark). Text accent on light is `#0077A8`; `#00BEF3` is decorative only.
- Photos: drop a file named after its slot into `src/assets/photos/`; `src/data/photo-alt.json` holds EN and ES alt text.
  A missing slot renders a labelled placeholder and `npm run verify` fails on it.
- Motion: markup is server-rendered in its final state. `html.js` enables animation, `prefers-reduced-motion`
  keeps the static state, and every moving element has a pause control.
- Fonts (Sora, Inter; SIL OFL, licences in `src/assets/fonts/`) are self-hosted woff2 files and preloaded.
