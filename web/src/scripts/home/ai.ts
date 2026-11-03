// AI program builder: the 12 s "ask -> draft -> slam into the calendar" story.
// Base CSS is the finished frame; this builds the paused timelines on one clock (kit group)
// and keeps the three step indicators in sync with that clock.
import { $, $$, clamp, group, pan, tl } from '../motion/kit';

const DUR = 12;
const RANGES: [number, number][] = [
  [0, 3.0],
  [3.0, 6.6],
  [6.6, 11.4],
];
const O = 'opacity';
const T = 'transform';
const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
const SLAM = 'cubic-bezier(.55,0,.1,1)';

export function initAi() {
  const host = $<HTMLElement>('[data-tl-host="ai"]');
  if (!host) return;
  const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, host);

  const g = group(host, DUR, () => [
    tl(E('ask'), DUR, [
      [0, { [O]: 0, [T]: 'translate(0,40px) scale(.94)', filter: 'blur(8px)' }],
      [0.7, { [O]: 1, [T]: 'translate(0,0) scale(1)', filter: 'blur(0px)' }],
      [5.8, {}],
      [6.4, { [O]: 0, [T]: 'translate(-60px,0) scale(.96)', filter: 'blur(6px)' }],
      [12, {}],
    ]),
    tl(E('orb'), DUR, [[0, { [T]: 'scale(.6)' }], [0.9, { [T]: 'scale(1)' }, SPRING], [2.75, {}], [3.0, { [T]: 'scale(1.35)' }], [3.4, { [T]: 'scale(1)' }, SPRING], [12, {}]]),
    tl(E('ty1'), DUR, [[0, { clipPath: 'inset(0 100% 0 0)' }], [0.8, {}, 'steps(32)'], [1.9, { clipPath: 'inset(0 0% 0 0)' }], [12, {}]]),
    tl(E('ty2'), DUR, [[0, { clipPath: 'inset(0 100% 0 0)' }], [1.9, {}, 'steps(38)'], [2.8, { clipPath: 'inset(0 0% 0 0)' }], [12, {}]]),
    tl(E('gen'), DUR, [[0, { [T]: 'scale(1)', filter: 'brightness(1)' }], [2.8, {}], [2.95, { [T]: 'scale(.9)', filter: 'brightness(1.4)' }], [3.15, { [T]: 'scale(1)', filter: 'brightness(1)' }], [12, {}]]),
    tl(E('prog'), DUR, [
      [0, { [O]: 0, [T]: 'translate(80px,0) scale(.96)', filter: 'blur(10px)' }],
      [3.1, {}],
      [3.6, { [O]: 1, [T]: 'translate(0,0) scale(1)', filter: 'blur(0px)' }],
      [5.9, {}],
      [6.5, { [T]: 'translate(-200px,40px) scale(.62)' }, 'cubic-bezier(.6,0,.4,1)'],
      [6.95, { [T]: 'translate(-366px,92px) scale(.3)' }, SLAM],
      [7.05, { [O]: 0, [T]: 'translate(-366px,96px) scale(.26)' }],
      [12, {}],
    ]),
    ...['r1', 'r2', 'r3', 'r4'].map((r, k) => tl(E(r), DUR, [[0, { [O]: 0, [T]: 'translateX(24px)' }], [3.5 + k * 0.16, {}], [3.9 + k * 0.16, { [O]: 1, [T]: 'translateX(0)' }], [12, {}]])),
    tl(E('add'), DUR, [[0, { [T]: 'scale(1)', background: '#08132B' }], [4.9, {}], [5.3, { background: '#0077A8' }], [5.55, { [T]: 'scale(.95)' }], [5.75, { [T]: 'scale(1)' }], [12, {}]]),
    tl(E('cal'), DUR, [
      [0, { [O]: 0, [T]: 'translate(0,30px) scale(1.04)', filter: 'blur(10px)' }],
      [6.2, {}],
      [6.85, { [O]: 1, [T]: 'translate(0,0) scale(1)', filter: 'blur(0px)' }],
      [6.95, { [T]: 'translate(0,6px) scale(1)' }],
      [7.05, { [T]: 'translate(-6px,-3px) scale(1)' }],
      [7.15, { [T]: 'translate(5px,2px) scale(1)' }],
      [7.3, { [T]: 'translate(0,0) scale(1)' }],
      [11.3, {}],
      [11.9, { [O]: 0, [T]: 'translate(0,-20px) scale(.98)', filter: 'blur(6px)' }],
      [12, {}],
    ]),
    tl(E('shock'), DUR, [[0, { [O]: 0, [T]: 'scale(.2)' }], [6.95, {}], [7.0, { [O]: 1 }], [7.7, { [O]: 0, [T]: 'scale(7)' }, 'cubic-bezier(.2,.7,.2,1)'], [12, {}]]),
    tl(E('flash'), DUR, [[0, { [O]: 0 }], [6.95, {}], [7.05, { [O]: 1 }], [7.8, { [O]: 0 }], [12, {}]]),
    ...['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'].map((s, k) =>
      tl(E(s), DUR, [[0, { [O]: 0, [T]: 'translateY(14px) scale(.85)' }], [7.05 + k * 0.08, {}], [7.45 + k * 0.08, { [O]: 1, [T]: 'translateY(0) scale(1)' }, SPRING], [12, {}]]),
    ),
    tl(E('toast'), DUR, [[0, { [O]: 0, [T]: 'translateY(30px)' }], [8.1, {}], [8.6, { [O]: 1, [T]: 'translateY(0)' }, SPRING], [11.2, {}], [11.6, { [O]: 0 }], [12, {}]]),
    pan(host, DUR, [[0, 244], [3.0, 244], [3.6, 693], [5.9, 693], [6.9, 250], [8.3, 250], [9.6, 560], [11.4, 560], [12, 244]]),
  ]);

  // Reduced motion: nothing animates and the static finished frame stays.
  if (!g.anims.length) {
    host.dataset.ap = 'off';
    host.dataset.apWhy = 'reduced';
    return;
  }

  const stepsEl = $<HTMLElement>('[data-steps="ai"]');
  const steps = stepsEl ? $$<HTMLElement>('.ai-step', stepsEl) : [];
  if (!stepsEl || !steps.length) return;
  const bars = steps.map((s) => $<HTMLElement>('.at-bar i', s));
  stepsEl.classList.add('is-live');

  const render = () => {
    const t = g.time();
    steps.forEach((s, k) => {
      const [a, b] = RANGES[k];
      const on = t >= a && t < b;
      s.classList.toggle('on', on);
      if (on) s.setAttribute('aria-current', 'step');
      else s.removeAttribute('aria-current');
      bars[k]?.style.setProperty('--p', String(clamp((t - a) / (b - a), 0, 1)));
    });
  };

  // The clock only advances while the autoplayer says "on": sample it then, and once on every change.
  let raf = 0;
  const loop = () => {
    render();
    raf = host.dataset.ap === 'on' ? requestAnimationFrame(loop) : 0;
  };
  const sync = () => {
    render();
    if (host.dataset.ap === 'on' && !raf) raf = requestAnimationFrame(loop);
  };
  new MutationObserver(sync).observe(host, { attributes: true, attributeFilter: ['data-ap'] });
  sync();
}
