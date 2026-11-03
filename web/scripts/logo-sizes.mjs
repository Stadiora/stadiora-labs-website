// Measures the ink (alpha) area of each client logo and prints the rendered height that gives every mark
// the same optical area, clamped so no logo gets absurdly small, tall or wide.
// Run from web/: `node scripts/logo-sizes.mjs`. Paste the result into src/data/logos.ts (`h`).
import { readdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const dir = new URL('../public/logos/', import.meta.url);
const files = (await readdir(dir)).filter((f) => /-mono-dark\.(svg|png)$/.test(f));

const TARGET_AREA = Number(process.argv[2] ?? 3000); // px² of optical area at 1x
const MIN_H = 36;
const MAX_H = 64;
const MAX_W = 180;

const browser = await chromium.launch();
const page = await browser.newPage();
const rows = [];
for (const file of files) {
  const ext = file.endsWith('.svg') ? 'svg' : 'png';
  const mime = ext === 'svg' ? 'image/svg+xml' : 'image/png';
  const data = (await readFile(new URL(file, dir))).toString('base64');
  const m = await page.evaluate(
    async ({ src }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const H = 256;
      const W = Math.round((H * img.naturalWidth) / img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);
      let ink = 0;
      let x0 = W;
      let x1 = 0;
      let y0 = H;
      let y1 = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const a = data[(y * W + x) * 4 + 3] / 255;
          if (a > 0.05) {
            ink += a;
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
          }
        }
      }
      return { W, H, ink, box: [x0, y0, x1, y1] };
    },
    { src: `data:${mime};base64,${data}` },
  );
  const slug = file.replace(/-mono-dark\.\w+$/, '');
  const [x0, y0, x1, y1] = m.box;
  const boxArea = (x1 - x0 + 1) * (y1 - y0 + 1);
  // Optical area: the geometric mean of the ink and its bounding box. Pure ink area would blow up thin wordmarks;
  // pure bounding box is the "equal height" look this replaces. It scales with the square of the render height.
  const optical = Math.sqrt(m.ink * boxArea);
  const idealH = 256 * Math.sqrt(TARGET_AREA / optical);
  const aspect = m.W / m.H;
  const h = Math.round(Math.min(MAX_H, MAX_W / aspect, Math.max(MIN_H, idealH)));
  const area = Math.round(optical * (h / 256) ** 2);
  rows.push({ slug, ext, aspect: Number(aspect.toFixed(2)), inkCoverage: Number((m.ink / (m.W * m.H)).toFixed(2)), padding: `${x0},${y0}-${m.W - x1},${m.H - y1}`, idealH: Math.round(idealH), h, widthAtH: Math.round(h * aspect), opticalAreaAtH: area });
}
await browser.close();
console.table(rows);
console.log(JSON.stringify(Object.fromEntries(rows.map((r) => [r.slug, r.h]))));
