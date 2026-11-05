// Four pillars: kit autotabs drives the tabs and clips; this adds the open text panel, the accent colour and the live
// cards drawn over each (text-free) clip. The cards' timelines are one group on the tab clock: they restart whenever a
// tab starts and run, pause and settle with the tabs. The markup is the finished frame.
import { $, $$, autotabs, group, isReduced, tl, type Frame } from '../motion/kit';

const O = 'opacity';
const T = 'transform';
const SP = 'cubic-bezier(.34,1.56,.64,1)';
const EASE = 'cubic-bezier(.2,.7,.2,1)';
// A tab picked by hand while the tabs are paused (pointer or focus inside) shows the cards once they have all arrived.
const ARRIVED = 5.6;

function buildScenes(root: HTMLElement, dur: number) {
  const E = (scene: string, n: string) => $<HTMLElement>(`[data-scene="${scene}"] [data-el="${n}"]`, root);
  const f = (...a: Frame[]) => a;
  const pop = (el: HTMLElement | null, t: number, from = 'translateY(40px) scale(.9)') =>
    tl(el, dur, f([0, { [O]: 0, [T]: from }], [t, {}], [t + 0.5, { [O]: 1, [T]: 'translateY(0px) scale(1)' }, SP]));
  const count = (el: HTMLElement | null, at: number, to: number, end: number) => tl(el, dur, f([0, { '--n': 0 }], [at, {}], [end, { '--n': to }, EASE]));

  const training = () => {
    const rows = [0, 1, 2, 3].map((k) => pop(E('training', `row${k}`), 0.9 + k * 0.2, 'translateX(40px) scale(.9)'));
    return [
      pop(E('training', 'plan'), 0.3, 'translateX(80px) scale(.94)'),
      ...rows,
      tl(E('training', 'cur'), dur, f([0, { [O]: 0, [T]: 'translate(1000px,700px) scale(1)' }], [1.6, {}], [1.9, { [O]: 1 }], [2.6, { [T]: 'translate(1130px,545px) scale(1)' }], [2.8, { [T]: 'translate(1130px,545px) scale(.8)' }], [3.0, { [T]: 'translate(1130px,545px) scale(1)' }], [3.6, { [O]: 0 }])),
      tl(E('training', 'send'), dur, f([0, { [T]: 'scale(1)', background: '#08132B' }], [2.75, {}], [2.85, { [T]: 'scale(.92)', background: '#0077A8' }], [3.05, { [T]: 'scale(1)' }])),
      pop(E('training', 'toast'), 3.1, 'translateY(40px) scale(.8)'),
      pop(E('training', 'coach'), 0.6, 'translateX(-40px)'),
    ];
  };
  const nutrition = () => [
    tl(E('nutrition', 'snap'), dur, f([0, { [O]: 0 }], [0.7, {}], [1.0, { [O]: 1 }])),
    pop(E('nutrition', 'est'), 3.0, 'translateX(-60px) scale(.9)'),
    count(E('nutrition', 'kc'), 3.2, 640, 4.4),
    ...[0, 1, 2].map((k) => tl(E('nutrition', `m${k}`), dur, f([0, { [T]: 'scaleX(0)' }], [3.4 + k * 0.2, {}], [4.4 + k * 0.2, { [T]: 'scaleX(1)' }]))),
    pop(E('nutrition', 'logged'), 4.8, 'translateY(40px) scale(.8)'),
  ];
  const readiness = () => [
    pop(E('readiness', 'rd'), 0.3, 'translateY(50px) scale(.9)'),
    tl(E('readiness', 'ring'), dur, f([0, { '--v': 0 }], [0.6, {}], [2.2, { '--v': 82 }, EASE])),
    count(E('readiness', 'rn'), 0.6, 82, 2.2),
    pop(E('readiness', 'sl'), 1.4, 'translateX(60px)'),
    ...$$<HTMLElement>('[data-scene="readiness"] .pm-bars i', root).map((b, k) => tl(b, dur, f([0, { [T]: 'scaleY(0)' }], [1.7 + k * 0.1, {}], [2.4 + k * 0.1, { [T]: 'scaleY(1)' }, SP]))),
    pop(E('readiness', 'mood'), 2.8, 'translateY(40px)'),
    tl(E('readiness', 'good'), dur, f([0, { [T]: 'scale(1)', background: '#ffffff', color: '#08132B' }], [3.8, {}], [3.95, { [T]: 'scale(.92)' }], [4.2, { [T]: 'scale(1.06)', background: '#08132B', color: '#ffffff' }, SP], [4.5, { [T]: 'scale(1)' }])),
    pop(E('readiness', 'br'), 0.8, 'translateX(-40px)'),
    tl(E('readiness', 'bc'), dur, f([0, { [T]: 'scale(.7)' }], [1.75, { [T]: 'scale(1.15)' }, 'ease-in-out'], [3.5, { [T]: 'scale(.7)' }, 'ease-in-out'], [5.25, { [T]: 'scale(1.15)' }, 'ease-in-out'], [7, { [T]: 'scale(.7)' }, 'ease-in-out'])),
  ];
  const team = () => [
    pop(E('team', 'pl'), 0.3, 'translateX(80px) scale(.94)'),
    tl(E('team', 'jc'), dur, f([0, { strokeDashoffset: 1 }], [0.7, {}], [2.3, { strokeDashoffset: 0 }, 'cubic-bezier(.4,0,.2,1)'])),
    count(E('team', 'jn'), 1.0, 41, 2.3),
    pop(E('team', 'ro'), 2.0, 'translateY(50px)'),
    ...[0, 1, 2, 3].map((k) => pop(E('team', `rr${k}`), 2.4 + k * 0.22, 'translateX(30px)')),
    pop(E('team', 'md'), 1.0, 'translateX(-40px)'),
  ];
  return [...training(), ...nutrition(), ...readiness(), ...team()];
}

export function initPillars() {
  const root = $<HTMLElement>('#pillars [data-autotabs]');
  if (!root) return;
  const tabs = $$<HTMLElement>('[role="tab"]', root);
  const panels = $$<HTMLElement>('.pil-panel', root);
  const scenes = $$<HTMLElement>('.pm-scene', root);
  const media = $<HTMLElement>('.pil-media', root);
  const dur = (Number(root.dataset.at) || 7000) / 1000;

  // Same host and threshold as the tabs, so the cards and the tabs always start and stop together.
  const cards = group(root, dur, () => buildScenes(root, dur), { threshold: 0.35 });

  let restart = false;
  // autotabs selects the first tab as it starts, so listen first.
  root.addEventListener('at:change', (e) => {
    const { i } = (e as CustomEvent<{ i: number }>).detail;
    panels.forEach((p, k) => p.classList.toggle('on', k === i));
    scenes.forEach((s, k) => s.classList.toggle('on', k === i));
    const color = tabs[i]?.dataset.color;
    if (color) media?.style.setProperty('--pc', color);
    if (isReduced()) return;
    restart = !cards.ap?.running;
    cards.seek(restart ? ARRIVED : 0);
  });
  // The tab clock restarts from 0 when a paused host resumes, so the cards do too.
  new MutationObserver(() => {
    if (restart && root.dataset.ap === 'on') {
      restart = false;
      cards.seek(0);
    }
  }).observe(root, { attributes: true, attributeFilter: ['data-ap'] });
  autotabs(root);
}
