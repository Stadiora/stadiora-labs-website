// Neon pixel mosaic (DESIGN-4 M13): the photo resolves from coarse duotone blocks to sharp, then glitches
// back, with neon cells and scan lines on top. It runs at ~20 fps under an autoplayer; under reduced motion
// it draws one still frame (sharp, tinted, a few fixed cells, no scan lines).
import { $, autoplayer, isReduced, onMotionChange } from '../../motion/kit';

const NEON = ['#FF4D5E', '#8B5CF6', '#00BEF3', '#34D399', '#FF4D5E', '#F472B6'];

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initMosaic() {
  const mos = $<HTMLElement>('#showcase [data-mosaic]');
  const cv = mos && $<HTMLCanvasElement>('canvas', mos);
  const img = mos && $<HTMLImageElement>('img', mos);
  const ctx = cv?.getContext('2d');
  if (!mos || !cv || !img || !ctx) return;
  const W = cv.width;
  const H = cv.height;
  type Layers = { t32: HTMLCanvasElement; t16: HTMLCanvasElement; t8: HTMLCanvasElement; sharp: HTMLCanvasElement };
  let layers: Layers | null = null;
  let cells: [number, number, string, number][] = [];
  let lastCells = 0;
  let raf = 0;
  let last = 0;

  const layer = (b: number, tint: boolean) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d')!;
    const s = document.createElement('canvas');
    s.width = Math.ceil(W / b);
    s.height = Math.ceil(H / b);
    const sx = s.getContext('2d')!;
    const r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const iw = img.naturalWidth * r;
    const ih = img.naturalHeight * r;
    sx.drawImage(img, (W - iw) / 2 / b, (H - ih) / 2 / b, iw / b, ih / b);
    if (tint) {
      const d = sx.getImageData(0, 0, s.width, s.height);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
        const [a, z] = l < 0.5 ? [[4, 10, 26], [139, 92, 246]] : [[139, 92, 246], [0, 190, 243]];
        const f = l < 0.5 ? l * 2 : (l - 0.5) * 2;
        p[i] = a[0] + (z[0] - a[0]) * f;
        p[i + 1] = a[1] + (z[1] - a[1]) * f;
        p[i + 2] = a[2] + (z[2] - a[2]) * f;
      }
      sx.putImageData(d, 0, 0);
    }
    x.imageSmoothingEnabled = false;
    x.drawImage(s, 0, 0, W, H);
    return c;
  };

  const draw = (now: number, still: boolean) => {
    if (!layers) return;
    const rnd = still ? seeded(7) : Math.random;
    const t = still ? 5 : (now / 1000) % 8;
    const L = t < 1.6 ? layers.t32 : t < 2.6 ? layers.t16 : t < 3.4 ? layers.t8 : layers.sharp;
    ctx.globalAlpha = 1;
    ctx.drawImage(L, 0, 0);
    if (t >= 3.4 && t < 7.2) {
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#0B1730';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    if (t > 7.2) {
      for (let i = 0; i < 10; i++) {
        const y = (rnd() * H) | 0;
        const h = 6 + ((rnd() * 24) | 0);
        ctx.drawImage(layers.t16, 0, y, W, h, (rnd() - 0.5) * 60, y, W, h);
      }
    }
    if (still || now - lastCells > 110) {
      lastCells = now;
      cells = [];
      const g = 32;
      const band = t < 3.4 ? 1 : 0.45;
      for (let i = 0; i < 70 * band; i++) {
        cells.push([Math.floor(Math.pow(rnd(), 0.6) * W / g) * g, Math.floor((rnd() * H) / g) * g, NEON[(rnd() * NEON.length) | 0], rnd()]);
      }
    }
    for (const [x, y, c, a] of cells) {
      ctx.globalAlpha = 0.35 + a * 0.55;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 32, 32);
      if (a > 0.7) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#02060F';
        for (let j = 0; j < 4; j++) ctx.fillRect(x + 4 + j * 7, y + 6, 3, 20);
      }
    }
    if (!still) {
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#34D399' : '#00BEF3';
        ctx.fillRect(((now / 9 + i * 137) % W) | 0, 0, 2, H);
      }
    }
    ctx.globalAlpha = 1;
  };

  const loop = (now: number) => {
    if (now - last > 48) {
      last = now;
      draw(now, false);
    }
    raf = requestAnimationFrame(loop);
  };

  const ap = autoplayer(mos, {
    threshold: 0.2,
    play: () => {
      if (layers) raf = requestAnimationFrame(loop);
    },
    pause: () => cancelAnimationFrame(raf),
  });

  // Reduced motion mid-run: the canvas keeps the last animated frame until it is redrawn as the still one.
  onMotionChange((reduced) => {
    if (reduced) draw(performance.now(), true);
  });

  const build = () => {
    layers = { t32: layer(32, true), t16: layer(16, true), t8: layer(8, true), sharp: layer(1, false) };
    draw(performance.now(), isReduced());
    mos.classList.add('ready');
    if (ap.running) raf = requestAnimationFrame(loop);
  };
  if (img.complete && img.naturalWidth) build();
  else img.addEventListener('load', build, { once: true });
}
