// Every URL that stadioralabs.com serves today (GitHub Pages building the repo root), and what the Astro build does with it.
// Source: the tracked files at the repo root of `main` at the time of the cutover work, plus the old sitemap.xml.
//
//   carried   the file ships unchanged (apart from the fixes in the cutover PR) from web/public, at the same URL
//   built     the Astro build produces it
//   redirect  a static HTML stub (meta refresh + canonical, no script) that sends visitors to `to`
//   retired   deliberately not carried: it is not linked from anything that survives. Each group says why.
//
// scripts/lib/cutover-verify.mjs fails the build when a `carried`, `built` or `redirect` URL is missing from dist/, when a
// `redirect` stub does not point at its target, or when a file at the repo root is neither listed here nor ignored below.
// To retire another URL, add it to `retired` with a reason in the PR: a missing URL is never silent.

const names = (dir, files) => files.map((f) => `${dir}${f}`);

// The API page (EN and ES) and the two legal pages are built by Astro and keep their flat .html URLs (the flatHtml step in astro.config.mjs).
export const built = ['/', '/index.html', '/404.html', '/api.html', '/api-es.html', '/privacy.html', '/terms.html'];

export const redirects = [
  { url: '/team.html', to: '/about/' },
  { url: '/team-es.html', to: '/es/about/' },
  { url: '/index-es.html', to: '/es/' },
  // Hidden until the new investor deck is final. The pages are kept in web/archive/investors/ (outside the build).
  { url: '/investors.html', to: '/' },
  { url: '/investors-es.html', to: '/es/' },
];

export const carried = [
  '/connect.html',
  '/lead-magnet.html',
  '/lead-magnet-es.html',
  '/anthony/',
  '/anthony/index.html',
  '/ian/',
  '/ian/index.html',
  '/sitemap.xml',
  '/robots.txt',
  '/videos/api.mp4',
  ...names('/stadioralabs info/', [
    'Anthony Rugama.jpg',
    'Aria Intelligence.png',
    'Color Palette + Mini Brand System.png',
    'Ecosystem Brand Overview.png',
    'Logo Sytem + Clear Space.png',
    'Platform Variants.png',
    'Stadiora Brand Document.png',
    'StadioraLabs Brands Document.png',
    'Stadiora_logo - Copy.png',
    'Stadiora_logo.png',
    'aria12_logo.jpg',
    'aria_app_mock.png',
    'aria_coaches_dashboard.webp',
    'aria_coaches_logo.png',
    'aria_logo.png',
    'favicon.png',
    'fitmg_app_mock.png',
    'fitmg_logo.webp',
    'ian Rowe.jpeg',
    'stadiora_labs_logo - Copy.png',
    'stadiora_labs_logo - white.png',
    'stadiora_labs_logo - white.webp',
    'stadiora_labs_logo.png',
    'thinktank_logo.png',
    'una_logo.png',
  ]),
];

export const retired = [
  {
    reason: 'Only the old home page used these; the new home has its own media, and nothing carried or built links to them.',
    urls: [
      '/aria-app.webp',
      '/bg-aria.webp',
      '/bg-aria12.webp',
      '/bg-fitmg.webp',
      '/engine-dashboard.webp',
      '/fitmg-app.jpg',
      '/hero-ai.webp',
      '/phone-aria.webp',
      '/phone-aria12.webp',
      '/phone-fitmg.webp',
      '/phone-rwa.webp',
      '/videos/aria-12.mp4',
      '/videos/aria.mp4',
      '/videos/fitmg.mp4',
      '/videos/hero.mp4',
      '/videos/stadiora.mp4',
    ],
  },
  {
    reason: 'Portraits and deck images of the old team page. /team.html and /team-es.html redirect to /about/, which carries its own portraits.',
    urls: names('/assets/deck-v2/', [
      'anthony_c.png',
      'anthony_c.webp',
      'brand_icon.png',
      'ian_c.png',
      'ian_c.webp',
      'joel_c.png',
      'joel_c.webp',
      'karla_c.png',
      'karla_c.webp',
      'qr_android.png',
      'qr_ios.png',
      'shot_home.png',
      'shot_home.webp',
      'shot_intelligence.png',
      'shot_intelligence.webp',
      'shot_rehab.png',
    ]),
  },
  {
    reason: 'The AUGE logo was removed from the site at the owner\'s request: no page may show it, so its artwork is not served.',
    urls: ['/stadioralabs info/auge_logo.svg'],
  },
  {
    reason: 'Internal working files that were served only because Jekyll publishes everything at the repo root. Neither is linked from any page.',
    urls: ['/brand/positioning.md', '/scripts/optimize-deck-assets.py'],
  },
];

// Files at the repo root that are not URLs of the site (repo plumbing, or the build's own input).
export const notUrls = ['.gitattributes', '.gitignore', '_config.yml', 'CNAME', 'web', '.github', '.git'];

/** Every URL path (decoded) that is live today and must be accounted for. */
export const liveUrls = () => [...built, ...redirects.map((r) => r.url), ...carried, ...retired.flatMap((g) => g.urls)];
