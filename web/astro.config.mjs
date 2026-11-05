import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';

// Pages named `x.html.astro` build to `x.html/index.html`; move them back so the URL stays `/x.html` (API and legal pages).
const flatHtml = () => ({
  name: 'flat-html',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const root = fileURLToPath(dir);
      for (const d of fs.readdirSync(root)) {
        if (!d.endsWith('.html') || !fs.statSync(root + d).isDirectory()) continue;
        const tmp = `${root}${d}.tmp`;
        fs.renameSync(`${root}${d}/index.html`, tmp);
        fs.rmSync(root + d, { recursive: true });
        fs.renameSync(tmp, root + d);
      }
    },
  },
});

export default defineConfig({
  site: 'https://stadioralabs.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    flatHtml(),
    sitemap({
      // The case-study index is noindex until there is a real story to show, so it stays out of the sitemap.
      filter: (page) => !page.includes('/resources/case-studies/') && !page.endsWith('/404/') && !/\.html\/$/.test(page),
      // The flat .html pages are listed here once (their directory-style twins are filtered above). The carried legacy pages that should be indexed (connect is the public link hub). Investors, the business cards and the redirect stubs stay out.
      customPages: ['connect.html', 'lead-magnet.html', 'lead-magnet-es.html', 'api.html', 'api-es.html', 'privacy.html', 'terms.html'].map((p) => `https://stadioralabs.com/${p}`),
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
    }),
  ],
  image: {
    // Hero art is already art-directed; keep the encoders predictable.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
