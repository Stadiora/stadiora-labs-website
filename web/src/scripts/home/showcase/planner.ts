// Planner stage (DESIGN-4 M14): one 12 s group. A planned session is dragged into week 3, the load steps
// up week by week, one athlete's plan changes, and the update is sent. The step buttons follow the clock
// and seek it. The still markup is the finished frame; the timelines only run (or, under reduced motion,
// only seek) once they exist.
import { $, $$, clamp, group, isReduced, onMotionChange, pan, tl, type Frame, type Group } from '../../motion/kit';

const O = 'opacity';
const T = 'transform';
const SP = 'cubic-bezier(.34,1.56,.64,1)';
const DUR = 12;
const RANGES: [number, number][] = [
  [0, 3.6],
  [3.6, 6.4],
  [6.4, 9.2],
  [9.2, 12],
];
const REST = '0 4px 12px -8px rgba(8,19,43,.3)';

function buildPlanner(host: HTMLElement) {
  const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, host);
  const drag = E('drag')!;
  const cur = E('cur')!;
  const app = $<HTMLElement>('.pl-app', host)!;
  const src = E('srcblk')!;
  const at = (el: HTMLElement): [number, number] => [app.offsetLeft + el.offsetLeft, app.offsetTop + el.offsetTop];
  const [sx, sy] = at(src);
  const [tx, ty] = at(E('w3b')!);
  const [px3, py3] = at(E('w3a')!);
  E('w3b')!.classList.add('ghost');
  drag.style.left = '0';
  drag.style.top = '0';
  drag.style.width = `${src.offsetWidth}px`;
  drag.style.transform = `translate(${tx}px,${ty}px)`;
  cur.style.left = '0';
  cur.style.top = '0';
  const person = E('person')!;
  person.style.left = `${px3 - 60}px`;
  person.style.top = `${py3 + 150}px`;
  const P = (x: number, y: number, s = 1, r = 0) => `translate(${x}px,${y}px) scale(${s}) rotate(${r}deg)`;
  const f = (...a: Frame[]) => a;
  return [
    tl(drag, DUR, f([0, { [O]: 0, [T]: P(sx, sy), boxShadow: REST }], [0.9, {}], [1.1, { [O]: 1 }], [1.4, { [T]: P(sx + 8, sy - 12, 1.06, -2), boxShadow: '0 30px 50px -14px rgba(8,19,43,.6)' }], [2.6, { [T]: P(tx, ty - 12, 1.06, 2) }, 'cubic-bezier(.6,0,.3,1)'], [2.9, { [T]: P(tx, ty), boxShadow: REST }, SP], [11.4, {}], [11.9, { [O]: 0 }], [12, {}])),
    tl(cur, DUR, f([0, { [O]: 0, [T]: 'translate(420px,470px) scale(1)' }], [0.6, { [O]: 1 }], [1.0, { [T]: `translate(${sx + 120}px,${sy + 40}px) scale(1)` }], [1.4, { [T]: `translate(${sx + 128}px,${sy + 28}px) scale(.85)` }], [2.6, { [T]: `translate(${tx + 120}px,${ty + 28}px) scale(.85)` }, 'cubic-bezier(.6,0,.3,1)'], [2.9, { [T]: `translate(${tx + 120}px,${ty + 40}px) scale(1)` }], [3.6, {}], [4.2, { [T]: 'translate(800px,200px)' }], [6.6, {}], [7.4, { [T]: 'translate(660px,170px) scale(.9)' }], [7.7, { [T]: 'translate(660px,170px) scale(1)' }], [9.2, {}], [9.9, { [T]: 'translate(900px,500px)' }], [10.3, { [O]: 0 }], [12, {}])),
    ...['b2', 'b3', 'b4'].map((b, k) => tl(E(b), DUR, f([0, { [O]: 0, [T]: 'scale(0)' }], [3.8 + k * 0.32, {}], [4.2 + k * 0.32, { [O]: 1, [T]: 'scale(1)' }, SP], [11.4, {}], [11.9, { [O]: 0 }], [12, {}]))),
    ...['w2a', 'w3a', 'w4a'].map((b, k) =>
      tl(E(b), DUR, f([0, { '--a': '0deg', boxShadow: REST }], [3.8 + k * 0.32, {}], [4.3 + k * 0.32, { boxShadow: '0 0 0 4px rgba(139,92,246,.18),0 16px 30px -12px rgba(139,92,246,.6)' }], [6.4, { '--a': '360deg', boxShadow: REST }], [12, { '--a': '720deg' }])),
    ),
    tl(E('pop'), DUR, f([0, { [O]: 0, [T]: 'translateY(24px) scale(.92)' }], [4.6, {}], [5.0, { [O]: 1, [T]: 'translateY(0) scale(1)' }, SP], [6.4, {}], [6.7, { [O]: 0, [T]: 'translateY(-10px) scale(.96)' }], [12, {}])),
    ...$$('.pl-bars i', host).map((b, k) => tl(b, DUR, f([0, { [T]: 'scaleY(0)' }], [4.8 + k * 0.12, {}], [5.4 + k * 0.12, { [T]: 'scaleY(1)' }, SP], [12, {}]))),
    tl(E('w3a'), DUR, f([0, { outline: '0px solid rgba(255,77,94,0)' }], [7.6, {}], [7.8, { outline: '3px solid rgba(255,77,94,1)' }], [9.2, {}], [9.5, { outline: '0px solid rgba(255,77,94,0)' }], [12, {}])),
    tl(person, DUR, f([0, { [O]: 0, [T]: 'translate(0px,30px) scale(.9)' }], [7.7, {}], [8.1, { [O]: 1, [T]: 'translate(0px,0px) scale(1)' }, SP], [9.2, {}], [9.5, { [O]: 0 }], [12, {}])),
    tl(E('send'), DUR, f([0, { [O]: 0, [T]: 'translateY(30px) scale(.9)' }], [9.6, {}], [10.0, { [O]: 1, [T]: 'translateY(0) scale(1)' }, SP], [11.4, {}], [11.9, { [O]: 0 }], [12, {}])),
    pan(host, DUR, [
      [0, 330],
      [1.2, 330],
      [2.8, 560],
      [3.8, 560],
      [4.6, 800],
      [6.4, 800],
      [7.4, 580],
      [9.2, 580],
      [9.8, 820],
      [11.6, 820],
      [12, 330],
    ]),
  ];
}

/** Undoes what `buildPlanner` wrote to the markup, so the still frame is the same one a page loaded with reduced motion shows. */
function unbuildPlanner(host: HTMLElement) {
  const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, host);
  E('w3b')?.classList.remove('ghost');
  for (const n of ['drag', 'cur', 'person']) {
    const el = E(n);
    for (const p of ['left', 'top', 'width', 'transform']) el?.style.removeProperty(p);
  }
}

export function initPlanner() {
  const host = $<HTMLElement>('#plan [data-tl-host="planner"]');
  const box = $<HTMLElement>('#plan [data-steps="planner"]');
  if (!host || !box) return;
  const steps = $$<HTMLElement>('.pl-step', box);
  const bars = steps.map((s) => $<HTMLElement>('.at-bar i', s)!);
  let manual: Animation[] | null = null;
  let g: Group | null = null;

  const time = () => {
    if (!isReduced()) return g?.time() ?? 0;
    return manual?.[0] ? (Number(manual[0].currentTime) || 0) / 1000 : 0;
  };
  const paint = () => {
    const t = time();
    steps.forEach((s, k) => {
      const [a, b] = RANGES[k];
      const on = t >= a && t < b;
      s.classList.toggle('on', on);
      if (on) s.setAttribute('aria-current', 'step');
      else s.removeAttribute('aria-current');
      bars[k].style.setProperty('--p', String(clamp((t - a) / (b - a), 0, 1)));
    });
  };
  // Back to the finished frame: no step highlighted, every bar full (the base CSS).
  const clear = () => {
    box.classList.remove('live');
    steps.forEach((s, k) => {
      s.classList.remove('on');
      s.removeAttribute('aria-current');
      bars[k].style.removeProperty('--p');
    });
  };
  const seek = (sec: number) => {
    if (isReduced()) {
      // Still frame by default; the steps still work by hand, building the timelines on first use.
      manual ??= buildPlanner(host).filter((a): a is Animation => !!a);
      manual.forEach((a) => (a.currentTime = sec * 1000));
    } else g?.seek(sec);
    box.classList.add('live');
    paint();
  };

  steps.forEach((s) => s.addEventListener('click', () => seek(Number(s.dataset.seek))));

  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(() => {
    g = group(host, DUR, () => buildPlanner(host));
    let raf = 0;
    const loop = () => {
      if (isReduced()) {
        raf = 0;
        return;
      }
      paint();
      raf = host.dataset.ap === 'on' ? requestAnimationFrame(loop) : 0;
    };
    const watch = () => {
      if (!isReduced() && host.dataset.ap === 'on' && !raf) raf = requestAnimationFrame(loop);
    };
    new MutationObserver(watch).observe(host, { attributes: true, attributeFilter: ['data-ap'] });
    onMotionChange((reduced) => {
      manual?.forEach((a) => a.cancel());
      manual = null;
      if (reduced) {
        unbuildPlanner(host);
        clear();
      } else {
        box.classList.add('live');
        paint();
        watch();
      }
    });
    if (!isReduced()) {
      box.classList.add('live');
      paint();
      watch();
    }
  });
}
