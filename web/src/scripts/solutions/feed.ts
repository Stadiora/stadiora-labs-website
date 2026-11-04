// The clubs team-feed phone: the finished feed is the markup; this loops a short 8 s story over it (announcement,
// fixture, availability), one clock per squad, and follows the squad tabs so the phone always shows the squad on
// screen. It plays only while the phone is in view and not hovered or focused (the kit autoplayer).
import { $, $$, group, tl, type Frame } from '../motion/kit';

const DUR = 8;
const O = 'opacity';
const T = 'transform';
const SP = 'cubic-bezier(.34,1.56,.64,1)';
const f = (...a: Frame[]) => a;

const pop = (el: HTMLElement | null, t: number) =>
  tl(el, DUR, f([0, { [O]: 0, [T]: 'translateY(14px) scale(.96)' }], [t, {}], [t + 0.35, { [O]: 1, [T]: 'translateY(0) scale(1)' }, SP], [6.9, {}], [7.5, { [O]: 0, [T]: 'translateY(-10px) scale(1)' }], [DUR, {}]));
const count = (el: HTMLElement | null, at: number, ms: number) =>
  tl(el, DUR, f([0, { '--n': 0 }], [at, {}], [at + ms / 1000, { '--n': Number(el?.style.getPropertyValue('--to') ?? 0) }, 'cubic-bezier(.2,.7,.2,1)'], [DUR, {}]));

export function initFeed() {
  const host = $<HTMLElement>('[data-sx-feed]');
  if (!host) return;
  const panes = $$<HTMLElement>('[data-feed]', host);
  const build = (pane: HTMLElement) => {
    const E = (n: string) => $<HTMLElement>(`[data-el="${n}"]`, pane);
    return [
      pop(E('a'), 0.3),
      tl(E('ap'), DUR, f([0, { [T]: 'scaleX(0)' }], [0.8, {}], [2.6, { [T]: 'scaleX(1)' }, 'cubic-bezier(.4,0,.2,1)'], [DUR, {}])),
      count(E('rn'), 0.8, 1800),
      pop(E('f'), 1.4),
      pop(E('v'), 2.4),
      ...$$<HTMLElement>('.sqf__avail .tn', pane).map((n, i) => count(n, 2.8, 1000 + i * 250)),
    ];
  };
  const g = group(host, DUR, () => panes.flatMap(build), { threshold: 0.3 });

  const show = (id: string) => {
    panes.forEach((p) => p.toggleAttribute('data-on', p.dataset.feed === id));
    g.seek(0);
  };
  const tabs = $<HTMLElement>('.squad [data-tabs]');
  if (!tabs) return;
  new MutationObserver(() => {
    const on = $<HTMLElement>('.squad__panel[data-active]', tabs);
    const id = on?.id.replace('squad-panel-', '');
    if (id && !$(`[data-feed="${id}"][data-on]`, host)) show(id);
  }).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
}
