/*
 * The site chrome, in one place.
 *
 *   node scripts/chrome.mjs --write   rewrite the nav and footer of every page
 *   node scripts/chrome.mjs --check   fail if any page has drifted
 *
 * Every page marks two regions:
 *
 *   <!-- sl-chrome:nav --> ... <!-- /sl-chrome:nav -->
 *   <!-- sl-chrome:footer --> ... <!-- /sl-chrome:footer -->
 *
 * The blocks between those markers are generated from this file, so nav and
 * footer markup cannot drift apart across eleven pages and two languages.
 * Edit the chrome here, run --write, commit the result. The rendered HTML
 * stays in the repo, so GitHub Pages still serves plain static files and no
 * build step runs at deploy time.
 *
 * PAGES carries only what genuinely differs per page: language, which nav
 * item is current, and the twin the language toggle points at. Two pages
 * carry an extra: the investors overview needs its Confidential badge, and it
 * is the only opt-in slot in the chrome. --check compares the generated block
 * to the file byte for byte, so an extra can never quietly become a fork.
 *
 * Facts on this page trace to issue #2. Store URLs come from STYLE.md.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, readdir } from 'node:fs/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const APP_STORE = 'https://apps.apple.com/us/app/run-with-aria/id6760048203';
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.runwitharia.mobile';
const LINKEDIN = 'https://www.linkedin.com/company/stadioralabs';
const CONTACT = 'mailto:info@stadioralabs.com';
/* The 1276x298 PNG source is 87 KB and renders at 26 to 28px tall, twice per page,
   on every page. This 360x84 WebP derivative is 11 KB and covers 3x density at the
   largest render. Intrinsic width and height are on the tag so the browser reserves
   the right box before the file arrives, per STYLE.md rule 5. */
const LOGO = './stadioralabs%20info/stadiora_labs_logo%20-%20white.webp';
const LOGO_W = 360;
const LOGO_H = 84;

/* Stroke icons, per STYLE.md rule 6. The Apple glyph is the one exception the
   system already makes, it reads as a solid mark at 22px. */
const ICON_APPLE =
  '<path d="M16.9 13.2c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.9-3.1-.8-1.6 0-3 .9-3.8 2.4-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3.1-.7 1.4 0 1.8.7 3.1.7 1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.8z"/><path d="M14.6 6.3c.6-.8 1.1-1.9 1-3-.9 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z"/>';
const ICON_PLAY = '<path d="M5.6 3.4l12.9 8.6-12.9 8.6z"/>';
const ICON_LINKEDIN =
  '<path d="M4 9h3v11H4z"/><circle cx="5.5" cy="5.5" r="1.7"/><path d="M11 20V9"/><path d="M11 13.5a4 4 0 018 0V20"/>';
const ICON_MENU = '<path d="M4 7h16M4 12h16M4 17h16"/>';
const ICON_CLOSE = '<path d="M6 6l12 12M18 6L6 18"/>';

/* ---------- Language packs -------------------------------------------------
   Only the strings and the routes change between EN and ES. The markup that
   wraps them is shared, which is what makes structural parity checkable. */
const L = {
  en: {
    home: './index.html',
    ecosystem: './index.html#ecosystem',
    engine: './index.html#engine',
    team: './index.html#team',
    download: './index.html#download',
    api: './api.html',
    investors: './investors.html',
    check: './lead-magnet.html',
    privacy: './privacy.html',
    terms: './terms.html',
    legalHreflang: '',
    nav: {
      home: 'Home',
      ecosystem: 'Ecosystem',
      api: 'Aria Intelligence',
      investors: 'Investors',
      cta: 'Free check',
      open: 'Open menu',
      close: 'Close menu',
      skip: 'Skip to content',
    },
    store: { appleKicker: 'Download on the', playKicker: 'Get it on' },
    footer: {
      tag: 'Stadiora Labs builds the Aria Intelligence engine and the apps that run on it, for athletes and for the coaches who work with them.',
      products: 'Products',
      aria: 'Run with Aria',
      coaches: 'Aria for Coaches',
      aria12: 'Aria 12',
      apiLink: 'Aria Intelligence',
      company: 'Company',
      engine: 'The engine',
      team: 'Team',
      investors: 'Investors',
      contact: 'Contact',
      start: 'Start',
      check: 'Free performance check',
      download: 'Download the app',
      home: 'Home',
      linkedin: 'Stadiora Labs on LinkedIn',
      copy: '\u00a9 2026 Stadiora Labs. Built in Latin America and the United States.',
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      attrib:
        'App Store is a service mark of Apple Inc. Google Play and the Google Play logo are trademarks of Google LLC.',
      langLabel: 'Language',
    },
  },
  es: {
    home: './index-es.html',
    ecosystem: './index-es.html#ecosystem',
    engine: './index-es.html#engine',
    team: './index-es.html#team',
    download: './index-es.html#download',
    api: './api-es.html',
    investors: './investors-es.html',
    check: './lead-magnet-es.html',
    /* Privacy and Terms are published in English only. The links carry
       hreflang="en" so the change of language is announced. */
    privacy: './privacy.html',
    terms: './terms.html',
    legalHreflang: ' hreflang="en"',
    nav: {
      home: 'Inicio',
      ecosystem: 'Ecosistema',
      api: 'Aria Intelligence',
      investors: 'Inversores',
      cta: 'Chequeo gratis',
      open: 'Abrir men\u00fa',
      close: 'Cerrar men\u00fa',
      skip: 'Saltar al contenido',
    },
    store: { appleKicker: 'Desc\u00e1rgala en el', playKicker: 'Cons\u00edguela en' },
    footer: {
      tag: 'Stadiora Labs construye el motor Aria Intelligence y las apps que corren sobre \u00e9l, para atletas y para quienes los entrenan.',
      products: 'Productos',
      aria: 'Run with Aria',
      coaches: 'Aria for Coaches',
      aria12: 'Aria 12',
      apiLink: 'Aria Intelligence',
      company: 'Compa\u00f1\u00eda',
      engine: 'El motor',
      team: 'Qui\u00e9nes somos',
      investors: 'Inversores',
      contact: 'Contacto',
      start: 'Empieza',
      check: 'Chequeo de rendimiento gratis',
      download: 'Descarga la app',
      home: 'Inicio',
      linkedin: 'Stadiora Labs en LinkedIn',
      copy: '\u00a9 2026 Stadiora Labs. Hecho en Am\u00e9rica Latina y Estados Unidos.',
      privacy: 'Pol\u00edtica de privacidad',
      terms: 'T\u00e9rminos de uso',
      attrib:
        'App Store es una marca de servicio de Apple Inc. Google Play y el logotipo de Google Play son marcas comerciales de Google LLC.',
      langLabel: 'Idioma',
    },
  },
};

/* ---------- Pages -----------------------------------------------------------
   current  which canonical nav item gets aria-current, '' for none
   twin     where the language toggle sends the reader
   twinLang the language of that twin, drives hreflang on the toggle
   badge    optional text for the one opt-in nav slot */
const PAGES = [
  { file: 'index.html', lang: 'en', current: 'home', twin: './index-es.html', twinLang: 'es' },
  { file: 'index-es.html', lang: 'es', current: 'home', twin: './index.html', twinLang: 'en' },
  { file: 'api.html', lang: 'en', current: 'api', twin: './api-es.html', twinLang: 'es' },
  { file: 'api-es.html', lang: 'es', current: 'api', twin: './api.html', twinLang: 'en' },
  {
    file: 'investors.html',
    lang: 'en',
    current: 'investors',
    twin: './investors-es.html',
    twinLang: 'es',
    badge: 'Confidential',
  },
  {
    file: 'investors-es.html',
    lang: 'es',
    current: 'investors',
    twin: './investors.html',
    twinLang: 'en',
    badge: 'Confidencial',
  },
  { file: 'lead-magnet.html', lang: 'en', current: 'check', twin: './lead-magnet-es.html', twinLang: 'es' },
  { file: 'lead-magnet-es.html', lang: 'es', current: 'check', twin: './lead-magnet.html', twinLang: 'en' },
  /* Privacy, Terms and 404 have no Spanish twin. The toggle still ships so
     the chrome stays identical, and it routes to the Spanish home page. */
  { file: 'privacy.html', lang: 'en', current: '', twin: './index-es.html', twinLang: 'es' },
  { file: 'terms.html', lang: 'en', current: '', twin: './index-es.html', twinLang: 'es' },
  { file: '404.html', lang: 'en', current: '', twin: '/index-es.html', twinLang: 'es', rootAbsolute: true },
];

const cur = (page, key) => (page.current === key ? ' aria-current="page"' : '');

/* Language toggle. EN sits left of ES on every page so the control does not
   reorder itself when you switch language. */
const langToggle = (page, indent, label = '') => {
  const active = `<span class="sl-lang__btn is-active" aria-current="true">${page.lang.toUpperCase()}</span>`;
  const twin = `<a class="sl-lang__btn" href="${page.twin}" hreflang="${page.twinLang}">${page.twinLang.toUpperCase()}</a>`;
  const [first, second] = page.lang === 'en' ? [active, twin] : [twin, active];
  const attr = label ? ` aria-label="${label}"` : '';
  return `${indent}<div class="sl-lang"${attr}>
${indent}  ${first}
${indent}  ${second}
${indent}</div>`;
};

const navBlock = (page) => {
  const t = L[page.lang];
  const n = t.nav;
  const links = [
    ['home', t.home, n.home],
    ['ecosystem', t.ecosystem, n.ecosystem],
    ['api', t.api, n.api],
    ['investors', t.investors, n.investors],
  ];
  const list = (indent) =>
    links.map(([key, href, label]) => `${indent}<li><a href="${href}"${cur(page, key)}>${label}</a></li>`).join('\n');
  const badgeBar = page.badge ? `\n        <span class="sl-chrome-badge sl-nav__collapse">${page.badge}</span>` : '';
  const badgeFoot = page.badge ? `\n    <span class="sl-chrome-badge">${page.badge}</span>` : '';

  return `<a class="sl-skip" href="#main">${n.skip}</a>

<nav class="sl-nav">
  <div class="sl-container">
    <div class="sl-nav__inner">
      <a class="sl-nav__logo" href="${t.home}">
        <img src="${LOGO}" width="${LOGO_W}" height="${LOGO_H}" decoding="async" alt="Stadiora Labs">
      </a>
      <ul class="sl-nav__links">
${list('        ')}
      </ul>
      <div class="sl-nav__actions">${badgeBar}
        <a class="sl-btn sl-btn--primary sl-nav__collapse" href="${t.check}"${cur(page, 'check')}>${n.cta}</a>
${langToggle(page, '        ')}
      </div>
      <button class="sl-nav__toggle" type="button" aria-controls="sl-menu"
              aria-label="${n.open}" data-label-open="${n.open}" data-label-close="${n.close}">
        <svg class="sl-nav__icon-open" viewBox="0 0 24 24" aria-hidden="true">${ICON_MENU}</svg>
        <svg class="sl-nav__icon-close" viewBox="0 0 24 24" aria-hidden="true">${ICON_CLOSE}</svg>
      </button>
    </div>
  </div>
</nav>

<div class="sl-nav__menu" id="sl-menu">
  <ul class="sl-nav__menu-links">
${list('    ')}
  </ul>
  <div class="sl-nav__menu-foot">${badgeFoot}
    <a class="sl-btn sl-btn--primary sl-btn--block" href="${t.check}"${cur(page, 'check')}>${n.cta}</a>
  </div>
</div>`;
};

const footerBlock = (page) => {
  const t = L[page.lang];
  const f = t.footer;
  const s = t.store;
  return `<footer class="sl-footer">
  <div class="sl-container">
    <div class="sl-footer__grid">
      <div class="sl-footer__brand">
        <img src="${LOGO}" width="${LOGO_W}" height="${LOGO_H}" loading="lazy" decoding="async" alt="Stadiora Labs">
        <p class="sl-footer__tag">${f.tag}</p>
        <div class="sl-stores">
          <a class="sl-store" href="${APP_STORE}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true">${ICON_APPLE}</svg>
            <span class="sl-store__text">
              <span class="sl-store__kicker">${s.appleKicker}</span>
              <span class="sl-store__name">App Store</span>
            </span>
          </a>
          <a class="sl-store" href="${GOOGLE_PLAY}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PLAY}</svg>
            <span class="sl-store__text">
              <span class="sl-store__kicker">${s.playKicker}</span>
              <span class="sl-store__name">Google Play</span>
            </span>
          </a>
        </div>
        <div class="sl-footer__social">
          <a href="${LINKEDIN}" target="_blank" rel="noopener" aria-label="${f.linkedin}">
            <svg viewBox="0 0 24 24" aria-hidden="true">${ICON_LINKEDIN}</svg>
          </a>
        </div>
      </div>
      <div>
        <p class="sl-footer__title">${f.products}</p>
        <ul class="sl-footer__links">
          <li><a href="${t.ecosystem}">${f.aria}</a></li>
          <li><a href="${t.ecosystem}">${f.coaches}</a></li>
          <li><a href="${t.ecosystem}">${f.aria12}</a></li>
          <li><a href="${t.api}">${f.apiLink}</a></li>
        </ul>
      </div>
      <div>
        <p class="sl-footer__title">${f.company}</p>
        <ul class="sl-footer__links">
          <li><a href="${t.engine}">${f.engine}</a></li>
          <li><a href="${t.team}">${f.team}</a></li>
          <li><a href="${t.investors}">${f.investors}</a></li>
          <li><a href="${CONTACT}">${f.contact}</a></li>
        </ul>
      </div>
      <div>
        <p class="sl-footer__title">${f.start}</p>
        <ul class="sl-footer__links">
          <li><a href="${t.check}">${f.check}</a></li>
          <li><a href="${t.download}">${f.download}</a></li>
          <li><a href="${t.home}">${f.home}</a></li>
        </ul>
      </div>
    </div>
    <div class="sl-footer__bottom">
      <p class="sl-footer__copy">${f.copy}</p>
      <div class="sl-footer__legal">
        <a href="${t.privacy}"${t.legalHreflang}>${f.privacy}</a>
        <a href="${t.terms}"${t.legalHreflang}>${f.terms}</a>
${langToggle(page, '        ', f.langLabel)}
      </div>
    </div>
    <p class="sl-footer__attrib">${f.attrib}</p>
  </div>
</footer>`;
};

const region = (name) => ({
  open: `<!-- sl-chrome:${name} -->`,
  close: `<!-- /sl-chrome:${name} -->`,
});

/* 404.html is the one page that cannot use ./ paths.
 *
 * GitHub Pages serves 404.html for any unmatched path, in place, without a
 * redirect. The browser therefore resolves relative URLs against the path the
 * visitor asked for, not against the file. On /investors/ a ./ reference
 * becomes /investors/styles/site.css, which does not exist, and the visitor
 * gets unstyled HTML with every link pointing into a directory that is not
 * there. Only the root-level case works, which is the easy case to miss.
 *
 * Root-absolute paths fix it at every depth. They are used instead of a
 * <base href> because <base> needs the production origin hardcoded, which
 * would make the page load live assets when served from a local static
 * server or any preview host. The site is served from the root of a domain,
 * so a leading / always resolves the same way.
 *
 * Rewriting here rather than in a second template keeps 404.html on the same
 * generated chrome as the other ten pages. --check applies the same rewrite,
 * so drift is still caught byte for byte. If a page is ever added that is
 * also served from an unpredictable path, give it rootAbsolute too, and keep
 * its own head references root-absolute by hand.
 */
const rootAbsolute = (block) => block.replace(/(href|src)="\.\//g, '$1="/');

const replaceRegion = (html, name, body) => {
  const { open, close } = region(name);
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start === -1 || end === -1) throw new Error(`missing sl-chrome:${name} markers`);
  return html.slice(0, start + open.length) + '\n' + body + '\n' + html.slice(end);
};

const readRegion = (html, name) => {
  const { open, close } = region(name);
  const start = html.indexOf(open);
  const end = html.indexOf(close);
  if (start === -1 || end === -1) return null;
  return html.slice(start + open.length, end).replace(/^\n/, '').replace(/\n$/, '');
};

const run = async () => {
  const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--write') ? 'write' : null;
  if (!mode) {
    console.error('usage: node scripts/chrome.mjs --write | --check');
    process.exit(2);
  }

  /* Every page in the repo must be listed here, otherwise a new page could
     ship its own hand rolled chrome and the check would still pass. */
  const onDisk = (await readdir(root)).filter((f) => f.endsWith('.html')).sort();
  const listed = PAGES.map((p) => p.file).sort();
  const missing = onDisk.filter((f) => !listed.includes(f));
  if (missing.length) {
    console.error(`unlisted pages, add them to PAGES: ${missing.join(', ')}`);
    process.exit(1);
  }

  let failures = 0;
  for (const page of PAGES) {
    const path = join(root, page.file);
    const html = await readFile(path, 'utf8');
    const want = { nav: navBlock(page), footer: footerBlock(page) };
    if (page.rootAbsolute) {
      want.nav = rootAbsolute(want.nav);
      want.footer = rootAbsolute(want.footer);
    }

    if (mode === 'write') {
      let next = html;
      for (const name of ['nav', 'footer']) next = replaceRegion(next, name, want[name]);
      if (next !== html) await writeFile(path, next);
      console.log(`${next === html ? 'unchanged' : 'wrote    '} ${page.file}`);
      continue;
    }

    for (const name of ['nav', 'footer']) {
      const got = readRegion(html, name);
      if (got === null) {
        console.error(`FAIL ${page.file} ${name}: markers missing`);
        failures += 1;
      } else if (got !== want[name]) {
        console.error(`FAIL ${page.file} ${name}: drifted from scripts/chrome.mjs`);
        failures += 1;
      } else {
        console.log(`ok   ${page.file} ${name}`);
      }
    }
  }

  if (failures) {
    console.error(`\n${failures} chrome region(s) drifted. Run: node scripts/chrome.mjs --write`);
    process.exit(1);
  }
  if (mode === 'check') console.log(`\nnav and footer identical across ${PAGES.length} pages`);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
