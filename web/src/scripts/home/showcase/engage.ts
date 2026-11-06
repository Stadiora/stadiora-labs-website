// Engage panel (DESIGN-4 M16): four phone scenes (chat, feed, broadcast, announcement) behind auto-advancing
// tabs. Each scene is a 7.6 s set of paused, once-only timelines that share one autoplayer with the tabs, so
// keyboard focus, offscreen and hidden-tab pause both together. Counters animate the registered `--n` integer
// (shown by a CSS counter) so they pause with everything else. The still markup is the finished scene.
import { $, $$, autoplayer, autotabs, isReduced, onMotionChange, tl, type Frame } from '../../motion/kit';

const O = 'opacity';
const T = 'transform';
const SP = 'cubic-bezier(.34,1.56,.64,1)';
const DUR = 7.6;

export function initEngage() {
  const root = $<HTMLElement>('#engage .en-grid');
  if (!root) return;
  const scenes = $$<HTMLElement>('.ph-scn', root);
  const bubbles = $$<HTMLElement>('[data-bubble]', root);
  const bars = $$<HTMLElement>('[role="tab"]', root).map((t) => $<HTMLElement>('.at-bar i', t)!);
  const f = (...a: Frame[]) => a;
  const once = { once: true };

  const inMsg = (el: HTMLElement | null, t: number) => tl(el, DUR, f([0, { [O]: 0, [T]: 'translateY(14px) scale(.96)' }], [t, {}], [t + 0.35, { [O]: 1, [T]: 'translateY(0) scale(1)' }, SP], [DUR, {}]), once);
  const typing = (el: HTMLElement | null, a: number, b: number) =>
    tl(el, DUR, f([0, { [O]: 0, maxHeight: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '-8px' }], [a, {}], [a + 0.2, { [O]: 1, maxHeight: '40px', paddingTop: '12px', paddingBottom: '12px', marginTop: '0px' }], [b - 0.15, {}], [b, { [O]: 0, maxHeight: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '-8px' }], [DUR, {}]), once);
  const count = (el: HTMLElement | null, to: number, at: number, ms: number) => tl(el, DUR, f([0, { '--n': 0 }], [at, {}], [Math.min(at + ms / 1000, DUR - 0.1), { '--n': to }, 'cubic-bezier(.2,.7,.2,1)'], [DUR, {}]), once);

  const build: Record<string, (s: HTMLElement) => (Animation | null)[]> = {
    chat: (s) => {
      const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, s);
      return [inMsg(E('m1'), 0.2), typing(E('t1'), 0.8, 2.2), inMsg(E('m2'), 2.2), typing(E('t2'), 3.0, 4.5), inMsg(E('m3'), 4.5)];
    },
    feed: (s) => {
      const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, s);
      const reacts = $$<HTMLElement>('.tn', s);
      return [
        inMsg(E('p1'), 0.2),
        ...reacts.map((r, k) => count(r, Number(r.style.getPropertyValue('--to')), 0.9, 1400 + k * 300)),
        tl(E('rc1'), DUR, f([0, { [T]: 'scale(1)' }], [1.2, {}], [1.4, { [T]: 'scale(1.35)' }], [1.7, { [T]: 'scale(1)' }, SP], [DUR, {}]), once),
        inMsg(E('p2'), 3.0),
      ];
    },
    bc: (s) => {
      const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, s);
      return [
        inMsg(E('b1'), 0.2),
        tl(E('bp'), DUR, f([0, { [T]: 'scaleX(0)' }], [0.8, {}], [2.6, { [T]: 'scaleX(1)' }, 'cubic-bezier(.4,0,.2,1)'], [DUR, {}]), once),
        count(E('bn'), 18, 0.8, 1800),
        tl(E('bs1'), DUR, f([0, { [O]: 1 }], [2.5, {}], [2.7, { [O]: 0 }], [DUR, {}]), once),
        tl(E('bs2'), DUR, f([0, { [O]: 0 }], [2.5, {}], [2.7, { [O]: 1 }], [DUR, {}]), once),
        inMsg(E('b2'), 3.0),
        inMsg(E('b3'), 3.8),
      ];
    },
    ann: (s) => {
      const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, s);
      return [
        tl(E('a1'), DUR, f([0, { [O]: 0, [T]: 'translateY(-60px) rotate(-4deg)' }], [0.2, {}], [0.75, { [O]: 1, [T]: 'translateY(0) rotate(0deg)' }, SP], [DUR, {}]), once),
        count($<HTMLElement>('.tn', E('a2')!), 64, 1.0, 1600),
        inMsg(E('a3'), 2.8),
      ];
    },
  };

  let anims: Animation[] = [];
  let ap: ReturnType<typeof autoplayer> | null = null;

  const run = (i: number) => {
    anims.forEach((a) => a.cancel());
    anims = [];
    const s = scenes[i];
    const kind = s.dataset.scn ?? '';
    bubbles.forEach((b) => b.classList.toggle('on', b.dataset.bubble === kind));
    if (isReduced()) return;
    const bubble = bubbles.find((b) => b.dataset.bubble === kind);
    anims = [
      ...build[kind](s),
      tl(bubble ?? null, DUR, f([0, { [O]: 0, translate: '0 20px', scale: 0.85 }], [1.8, {}], [2.4, { [O]: 1, translate: '0 0', scale: 1 }, SP], [DUR, {}]), once),
    ].filter((a): a is Animation => !!a);
    // Not running (keyboard focus, offscreen): show the finished scene; resuming restarts it in step with the tab clock.
    if (ap?.running) anims.forEach((a) => a.play());
    else anims.forEach((a) => (a.currentTime = DUR * 1000));
  };

  ap = autoplayer(root, {
    threshold: 0.35,
    play: () => anims.forEach((a) => a.play()),
    pause: () => anims.forEach((a) => a.pause()),
  });
  const tabs = autotabs(root);
  const fillBars = (i: number) => bars.forEach((b, k) => (b.style.transform = k === i ? 'scaleX(1)' : 'scaleX(0)'));
  root.addEventListener('at:change', (e) => {
    const { i } = (e as CustomEvent<{ i: number }>).detail;
    if (isReduced()) fillBars(i);
    run(i);
  });
  // Reduced motion mid-scene: the timelines are cancelled (the markup is the finished scene) and the open tab's bar is full;
  // back to motion, the open scene starts again.
  onMotionChange((reduced) => {
    if (reduced) fillBars(tabs.index);
    run(tabs.index);
  });
  if (isReduced()) bars[0].style.transform = 'scaleX(1)';
  else run(0);
}
