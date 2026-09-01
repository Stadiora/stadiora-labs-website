/*
 * Builds the branded Open Graph images from the brand tokens.
 *
 *   node scripts/make-og.mjs
 *
 * Writes assets/og/og-default.png (English) and assets/og/og-default-es.png
 * (Spanish), both 1200 by 630, the size Facebook, LinkedIn, Slack, WhatsApp
 * and X all read. Nothing here is hand painted. The card is HTML rendered in
 * headless Chrome against styles/site.css, so a token change in the stylesheet
 * lands in the card the next time this runs.
 *
 * Every line of copy on the card traces to issue #2. Do not add a claim here
 * that is not already on a page.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'assets', 'og');

const CARDS = [
  {
    file: 'og-default.png',
    lang: 'en',
    eyebrow: 'AI coaching for athletes',
    title: 'Sport buries athletes in data.<br>Aria turns it into <em>today\u2019s decision</em>.',
    facts: ['150+ athletes', 'App Store and Google Play', 'stadioralabs.com'],
  },
  {
    file: 'og-default-es.png',
    lang: 'es',
    eyebrow: 'Entrenamiento con IA para atletas',
    title: 'El deporte entierra al atleta en datos.<br>Aria los convierte en <em>la decisi\u00f3n de hoy</em>.',
    facts: ['M\u00e1s de 150 atletas', 'App Store y Google Play', 'stadioralabs.com'],
  },
];

const card = (data, css, logo) => `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<style>${css}</style>
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: var(--sl-ink-900);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 68px 72px;
    position: relative;
  }
  /* Cyan bloom, the same gesture the hero sections use */
  body::before {
    content: '';
    position: absolute;
    inset: -30% -10% auto -25%;
    height: 150%;
    background:
      radial-gradient(48% 52% at 18% 8%, rgba(0, 184, 212, 0.30), transparent 70%),
      radial-gradient(40% 46% at 88% 96%, rgba(139, 92, 246, 0.13), transparent 72%);
  }
  .og { position: relative; }
  .og__head { display: flex; align-items: center; gap: 20px; }
  .og__head img { height: 46px; width: auto; }
  .og__eyebrow {
    font-family: var(--sl-font-mono);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: var(--sl-tracking-label);
    text-transform: uppercase;
    color: var(--sl-cyan);
    padding-left: 20px;
    border-left: 1px solid var(--sl-cyan-line);
  }
  .og__title {
    font-family: var(--sl-font-display);
    font-size: 52px;
    font-weight: 700;
    line-height: 1.14;
    letter-spacing: var(--sl-tracking-display);
    color: var(--sl-white);
    margin: 0;
  }
  .og__title em { font-style: normal; color: var(--sl-cyan-bright); }
  .og__foot {
    display: flex;
    gap: 26px;
    align-items: center;
    font-family: var(--sl-font-mono);
    font-size: 19px;
    color: var(--sl-text-muted);
  }
  .og__foot span + span::before {
    content: '\\00B7';
    margin-right: 26px;
    color: var(--sl-cyan);
  }
  .og__rule { height: 3px; width: 96px; background: var(--sl-cyan); margin-bottom: 34px; }
</style>
</head>
<body>
  <div class="og og__head">
    <img src="${logo}" alt="">
    <span class="og__eyebrow">${data.eyebrow}</span>
  </div>
  <div class="og">
    <div class="og__rule"></div>
    <p class="og__title">${data.title}</p>
  </div>
  <div class="og og__foot">${data.facts.map((f) => `<span>${f}</span>`).join('')}</div>
</body>
</html>`;

const run = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  // Inline the stylesheet so the card never depends on a running server, and
  // drop the @import line because the card links the same fonts itself. The
  // URL carries semicolons inside the weight list, so match to end of line.
  const css = (await readFile(join(root, 'styles', 'site.css'), 'utf8')).replace(/^@import .*$/m, '');
  const logo = `data:image/png;base64,${(
    await readFile(join(root, 'stadioralabs info', 'stadiora_labs_logo - white.png'))
  ).toString('base64')}`;

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    for (const data of CARDS) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
      await page.setContent(card(data, css, logo), { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      const path = join(OUT_DIR, data.file);
      await page.screenshot({ path, type: 'png' });
      console.log(`wrote ${path}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
