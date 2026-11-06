// Guardian page: a hero stage that cycles three family cards over the clip, and the "what families see" phone
// whose child switcher is an autotabs set. Switching plays that child's screen in (card by card, then the
// form stamp). Everything pauses together on keyboard focus, offscreen and hidden tab; the markup is the
// finished screen, which is what reduced motion shows.
import { $, $$, autoplayer, autotabs, group, isReduced, startKit, tl, type Frame } from '../motion/kit';

const O = 'opacity';
const T = 'transform';
const SP = 'cubic-bezier(.34,1.56,.64,1)';
const f = (...a: Frame[]) => a;

function hero() {
  const host = $<HTMLElement>('.eg-gh');
  if (!host) return;
  const DUR = 8;
  const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, host);
  const card = (el: HTMLElement | null, at: number) =>
    tl(el, DUR, f([0, { [O]: 0, [T]: 'translateY(26px) scale(.92)' }], [at, {}, SP], [at + 0.55, { [O]: 1, [T]: 'translateY(0) scale(1)' }], [7.2, {}], [7.8, { [O]: 0, [T]: 'translateY(-10px) scale(.98)' }], [DUR, {}]));
  group(
    host,
    DUR,
    () => [
      card(E('c1'), 0.3),
      card(E('c2'), 1.3),
      card(E('c3'), 2.3),
      tl(E('c4'), DUR, f([0, { [O]: 0, [T]: 'scale(2.4) rotate(-14deg)' }], [3.3, {}, SP], [3.8, { [O]: 1, [T]: 'scale(1) rotate(0deg)' }], [7.2, {}], [7.8, { [O]: 0 }], [DUR, {}])),
    ],
    { within: host },
  );
}

function how() {
  const root = $<HTMLElement>('.how__stage[data-autotabs]');
  if (!root) return;
  const panels = $$<HTMLElement>('[data-panel]', root);
  const bars = $$<HTMLElement>('[role="tab"]', root).map((t) => $<HTMLElement>('.at-bar i', t)!);
  const DUR = 3;
  const once = { once: true };
  let anims: Animation[] = [];
  let ap: ReturnType<typeof autoplayer> | null = null;
  let cur = 0;

  const item = (el: HTMLElement | null, at: number) => tl(el, DUR, f([0, { [O]: 0, [T]: 'translateY(16px) scale(.96)' }], [at, {}, SP], [at + 0.5, { [O]: 1, [T]: 'translateY(0) scale(1)' }], [DUR, {}]), once);

  const run = (i: number) => {
    anims.forEach((a) => a.cancel());
    anims = [];
    if (isReduced()) return;
    const s = panels[i];
    const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, s);
    anims = [
      item(E('k'), 0.05),
      item(E('w'), 0.3),
      item(E('m'), 0.6),
      item(E('f'), 0.9),
      tl(E('s'), DUR, f([0, { [T]: 'scale(1)' }], [1.4, {}, SP], [1.8, { [T]: 'scale(1.5)' }], [2.2, { [T]: 'scale(1)' }], [DUR, {}]), once),
    ].filter((a): a is Animation => !!a);
    if (ap?.running) anims.forEach((a) => a.play());
    else anims.forEach((a) => (a.currentTime = DUR * 1000));
  };

  ap = autoplayer(root, {
    threshold: 0.35,
    play: () => anims.forEach((a) => a.play()),
    pause: () => anims.forEach((a) => a.pause()),
  });
  autotabs(root);
  const still = () => bars.forEach((b, k) => (b.style.transform = k === cur ? 'scaleX(1)' : 'scaleX(0)'));
  root.addEventListener('at:change', (e) => {
    cur = (e as CustomEvent<{ i: number }>).detail.i;
    panels.forEach((p, k) => (p.inert = k !== cur));
    if (isReduced()) still();
    run(cur);
  });
  document.addEventListener('kit:motion-change', () => {
    if (isReduced()) {
      anims.forEach((a) => a.cancel());
      anims = [];
      still();
    } else run(cur);
  });
  if (isReduced()) still();
  else run(0);
}

startKit();
hero();
how();
