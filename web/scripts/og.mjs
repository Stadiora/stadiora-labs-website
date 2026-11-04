// Renders the 1200x630 Open Graph cards into public/og/. Run by hand after copy or photo changes:
//   node scripts/og.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFile(new URL(p, `file://${root}/`));
const b64 = async (p, type) => `data:${type};base64,${(await read(p)).toString('base64')}`;

// One card per page type and language. The text is real HTML in the real fonts, so Spanish accents render correctly.
// `photo` is a file in src/assets/photos; `readiness` adds the floating readiness card (home only).
export const cards = {
  home: {
    photo: 'h1-coaches-big.webp',
    readiness: true,
    en: { lead: 'The coaching platform for', word: 'coaches and teams', tag: 'Training, nutrition, readiness and messaging in one place.', readiness: 'Readiness', status: 'Ready to train' },
    es: { lead: 'La plataforma de coaching para', word: 'entrenadores y equipos', tag: 'Entrenamiento, nutrición, preparación y mensajes en un solo lugar.', readiness: 'Preparación', status: 'Listo para entrenar' },
  },
  platform: {
    photo: 's2-coaches.webp',
    en: { lead: 'One platform for', word: 'training and readiness', tag: 'Programs, nutrition, readiness and messaging that coaches and athletes share.' },
    es: { lead: 'Una plataforma para', word: 'entrenamiento y preparación', tag: 'Programas, nutrición, preparación y mensajes que comparten entrenadores y atletas.' },
  },
  solutions: {
    photo: 'h2-academies-big.webp',
    en: { lead: 'Built for', word: 'coaches, clubs and schools', tag: 'From a single athlete to a whole program.' },
    es: { lead: 'Hecha para', word: 'entrenadores, clubes y escuelas', tag: 'Desde un solo atleta hasta un programa completo.' },
  },
  pricing: {
    photo: 'p4-team-coaching.webp',
    en: { lead: 'Plans for', word: 'athletes, coaches and teams', tag: 'See what each plan includes.' },
    es: { lead: 'Planes para', word: 'atletas, entrenadores y equipos', tag: 'Mira qué incluye cada plan.' },
  },
  company: {
    photo: 'c1-about-track.webp',
    en: { lead: 'Meet', word: 'Stadiora Labs', tag: 'Who we are, what we build and how to reach us.' },
    es: { lead: 'Conoce a', word: 'Stadiora Labs', tag: 'Quiénes somos, qué construimos y cómo contactarnos.' },
  },
};

const [archivo, inter, logo] = await Promise.all([
  b64('src/assets/fonts/archivo-var.woff2', 'font/woff2'),
  b64('src/assets/fonts/inter-var.woff2', 'font/woff2'),
  b64('src/assets/brand/logo-white.png', 'image/png'),
]);

const html = (c, photo, withCard) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Archivo;src:url(${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
@font-face{font-family:Inter;src:url(${inter}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#08132b;color:#fff;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.logo{position:absolute;left:72px;top:64px;width:260px}
h1{position:absolute;left:72px;top:196px;width:620px;font-family:Archivo,sans-serif;font-weight:800;font-stretch:88%;font-size:54px;line-height:1.12;letter-spacing:-.01em}
h1 em{display:block;font-style:normal;text-wrap:balance}
h1 span{display:inline-block;padding-bottom:10px;border-bottom:5px solid #00bef3}
p{position:absolute;left:72px;bottom:64px;width:560px;font-size:24px;line-height:34px;color:#c3cbe0}
.photo{position:absolute;right:72px;top:72px;width:384px;height:486px;border-radius:20px;background:url(${photo}) center/cover}
.card{position:absolute;right:340px;bottom:96px;width:210px;padding:16px 20px 18px;border-radius:16px;background:#fff;color:#08132b;font-size:14px;box-shadow:0 12px 32px rgba(0,0,0,.35)}
.card b{display:block;margin-top:2px;font-family:Archivo,sans-serif;font-weight:800;font-stretch:80%;font-size:52px;line-height:54px}
.card i{display:inline-block;width:9px;height:9px;margin-right:7px;border-radius:50%;background:#26c485}
</style>
<img class="logo" src="${logo}" alt="">
<h1><em>${c.lead}</em><span>${c.word}</span></h1>
<p>${c.tag}</p>
<div class="photo"></div>
${withCard ? `<div class="card">${c.readiness}<b>82</b><i></i>${c.status}</div>` : ''}`;

await mkdir(new URL('public/og/', `file://${root}/`), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [type, card] of Object.entries(cards)) {
  const photo = await b64(`src/assets/photos/${card.photo}`, 'image/webp');
  for (const locale of ['en', 'es']) {
    await page.setContent(html(card[locale], photo, card.readiness));
    await page.evaluate(() => document.fonts.ready);
    await writeFile(new URL(`public/og/${type}-${locale}.png`, `file://${root}/`), await page.screenshot({ type: 'png' }));
    console.log(`og/${type}-${locale}.png`);
  }
}
await browser.close();
