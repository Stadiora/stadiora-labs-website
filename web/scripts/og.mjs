// Renders the 1200x630 Open Graph cards into public/og/. Run by hand after copy or photo changes:
//   node scripts/og.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFile(new URL(p, `file://${root}/`));
const b64 = async (p, type) => `data:${type};base64,${(await read(p)).toString('base64')}`;

const cards = {
  en: { lead: 'The coaching platform for', word: 'coaches and teams', tag: 'Training, nutrition, readiness and messaging in one place.' },
  es: { lead: 'La plataforma de coaching para', word: 'entrenadores y equipos', tag: 'Entrenamiento, nutrición, readiness y mensajes en un solo lugar.' },
};

const [sora, inter, logo, photo] = await Promise.all([
  b64('src/assets/fonts/sora-latin-wght-normal.woff2', 'font/woff2'),
  b64('src/assets/fonts/inter-latin-wght-normal.woff2', 'font/woff2'),
  b64('src/assets/brand/logo-white.png', 'image/png'),
  b64('src/assets/photos/h1-coaches-big.webp', 'image/webp'),
]);

const html = (c) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Sora;src:url(${sora}) format('woff2');font-weight:100 800}
@font-face{font-family:Inter;src:url(${inter}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#08132b;color:#fff;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.logo{position:absolute;left:72px;top:64px;width:260px}
h1{position:absolute;left:72px;top:196px;width:620px;font-family:Sora,sans-serif;font-weight:700;font-size:50px;line-height:1.12;letter-spacing:-.01em}
h1 em{display:block;font-style:normal;text-wrap:balance}
h1 span{display:inline-block;padding-bottom:10px;border-bottom:5px solid #00bef3}
p{position:absolute;left:72px;bottom:64px;width:560px;font-size:24px;line-height:34px;color:#c3cbe0}
.photo{position:absolute;right:72px;top:72px;width:384px;height:486px;border-radius:20px;background:url(${photo}) center/cover}
.card{position:absolute;right:340px;bottom:96px;width:210px;padding:16px 20px 18px;border-radius:16px;background:#fff;color:#08132b;font-size:14px;box-shadow:0 12px 32px rgba(0,0,0,.35)}
.card b{display:block;margin-top:2px;font-family:Sora,sans-serif;font-size:48px;line-height:54px}
.card i{display:inline-block;width:9px;height:9px;margin-right:7px;border-radius:50%;background:#26c485}
</style>
<img class="logo" src="${logo}" alt="">
<h1><em>${c.lead}</em><span>${c.word}</span></h1>
<p>${c.tag}</p>
<div class="photo"></div>
<div class="card">Readiness<b>82</b><i></i>${c.lead.startsWith('The') ? 'Ready to train' : 'Listo para entrenar'}</div>`;

await mkdir(new URL('public/og/', `file://${root}/`), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [locale, c] of Object.entries(cards)) {
  await page.setContent(html(c));
  await page.evaluate(() => document.fonts.ready);
  await writeFile(new URL(`public/og/home-${locale}.png`, `file://${root}/`), await page.screenshot({ type: 'png' }));
  console.log(`og/home-${locale}.png`);
}
await browser.close();
