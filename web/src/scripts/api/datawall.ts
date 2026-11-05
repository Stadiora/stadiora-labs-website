// Data → decision: scrolling through the pinned section scrubs a wall of raw numbers into one card (--q, 0 → 1).
// The scrub follows the scroll position, so nothing runs by itself; the wall's slow float is CSS inside the data-api-stage
// unit and stops with it. Reduced motion shows the finished frame (the card, no wall).
import { $, clamp, isReduced, onMotionChange } from '../motion/kit';

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export function initDataWall() {
  const pin = $('[data-dw]');
  const field = $('[data-dw-field]');
  const sticky = pin && $('.dw-sticky', pin);
  if (!pin || !field || !sticky) return;

  // A fixed seed so the wall is the same on every load and in every recording.
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const r = (n: number) => Math.floor(rnd() * n);
  const gens: (() => string)[] = [
    () => `HR ${55 + r(40)}`,
    () => `HRV ${30 + r(50)} ms`,
    () => `${(5 + rnd() * 4).toFixed(1)} h sleep`,
    () => `RPE ${3 + r(7)}`,
    () => `${(2 + rnd() * 9).toFixed(1)} km`,
    () => `load ${200 + r(500)}`,
    () => `SpO₂ ${94 + r(5)}%`,
    () => `${(36 + rnd()).toFixed(1)} °C`,
    () => `${r(24)}:${String(r(60)).padStart(2, '0')}`,
    () => `${(rnd() * 2 - 1).toFixed(2)}`,
    () => `acc ${(rnd() * 3).toFixed(2)} g`,
    () => `${1000 + r(9000)} steps`,
    () => `mood ${1 + r(9)}/10`,
    () => `${40 + r(160)} W`,
    () => `soreness ${r(10)}`,
    () => `vmax ${(6 + rnd() * 4).toFixed(2)}`,
  ];
  const N = matchMedia('(max-width: 640px)').matches ? 34 : 64;
  const spans: [HTMLElement, number, number][] = [];
  for (let i = 0; i < N; i++) {
    const s = document.createElement('span');
    const inner = document.createElement('i');
    inner.textContent = gens[i % gens.length]();
    const big = i % 7 === 3;
    if (big) s.classList.add('big');
    s.style.setProperty('--fz', (big ? 26 + r(16) : 12 + r(9)) + 'px');
    inner.style.setProperty('--fd', (5 + rnd() * 5).toFixed(1) + 's');
    inner.style.setProperty('--fdl', (-rnd() * 6).toFixed(1) + 's');
    inner.style.setProperty('--fx', (rnd() * 16 - 8).toFixed(0) + 'px');
    inner.style.setProperty('--fy', (rnd() * 16 - 8).toFixed(0) + 'px');
    if (i % 9 === 0) s.classList.add('hot');
    s.appendChild(inner);
    field.appendChild(s);
    spans.push([s, rnd(), rnd()]);
  }
  const nEl = $('[data-dw-n]');
  if (nEl) nEl.textContent = String(N);

  // A loose grid with jitter, so the wall reads as "lots of data".
  const layout = () => {
    const w = field.clientWidth / 2;
    const h = field.clientHeight / 2;
    const cols = 8;
    spans.forEach(([s, a, b], i) => {
      const cx = ((i % cols) + 0.5) / cols * 2 - 1;
      const cy = (Math.floor(i / cols) + 0.5) / Math.ceil(N / cols) * 2 - 1;
      s.style.setProperty('--dx', ((cx + (a - 0.5) * 0.2) * w * 0.96).toFixed(0));
      s.style.setProperty('--dy', ((cy + (b - 0.5) * 0.25) * h * 0.92).toFixed(0));
    });
  };
  layout();
  addEventListener('resize', layout);

  let visible = false;
  let queued = false;
  const update = () => {
    queued = false;
    if (isReduced()) {
      sticky.style.setProperty('--q', '1');
      return;
    }
    const rc = pin.getBoundingClientRect();
    const p = clamp(-rc.top / Math.max(1, rc.height - innerHeight), 0, 1);
    sticky.style.setProperty('--q', ease(clamp(p * 1.18, 0, 1)).toFixed(4));
  };
  const ask = () => {
    if (queued || !visible) return;
    queued = true;
    requestAnimationFrame(update);
  };
  new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    if (visible) ask();
  }).observe(pin);
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  onMotionChange(update);
  update();
}
