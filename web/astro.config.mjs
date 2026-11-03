import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
    sitemap({
      // The case-study index is noindex until there is a real story to show, so it stays out of the sitemap.
      filter: (page) => !page.includes('/resources/case-studies/'),
      i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } },
    }),
  ],
  image: {
    // Hero art is already art-directed; keep the encoders predictable.
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
