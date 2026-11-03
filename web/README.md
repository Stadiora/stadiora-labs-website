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
```

- Pages: `/` (EN) and `/es/`. Copy lives in `src/i18n/{en,es}.ts`; `es.ts` is typed against `en.ts`, so `astro check` flags a missing key.
- Design tokens: `src/styles/tokens.css` (light and dark). Text accent on light is `#0077A8`; `#00BEF3` is decorative only.
- Photos: drop a file named after its slot into `src/assets/photos/`; `src/data/photo-alt.json` holds EN and ES alt text.
  A missing slot renders a labelled placeholder and `npm run verify` fails on it.
- Motion: markup is server-rendered in its final state. `html.js` enables animation, `prefers-reduced-motion`
  keeps the static state, and every moving element has a pause control.
- Fonts (Sora, Inter; SIL OFL, licences in `src/assets/fonts/`) are self-hosted woff2 files and preloaded.
