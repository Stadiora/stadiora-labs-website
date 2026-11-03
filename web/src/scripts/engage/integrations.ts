// Integrations: sleep, steps and workouts flow from the two phone sources into the Aria hub on a loop. The
// markup is the still (chips sit by their source), which is what reduced motion shows.
import { $, $$, group, startKit, tl, type Frame } from '../motion/kit';

const O = 'opacity';
const T = 'transform';
const f = (...a: Frame[]) => a;

startKit();

const host = $<HTMLElement>('.eg-ih');
if (host) {
  const DUR = 9;
  // The first satellite's centre is (--ax, --ay) from the orbit centre and the second is the mirror image (see integrations.css).
  const from = { a: 1, b: -1 } as const;
  group(
    host,
    DUR,
    () => [
      ...$$<HTMLElement>('.eg-dchip', host).map((el, i) => {
        const k = from[el.dataset.from === 'b' ? 'b' : 'a'];
        const at = 0.4 + i * 2.8;
        const t = (s: number) => `translate(calc(var(--ax) * ${k * s}),calc(var(--ay) * ${k * s})) scale(${0.7 + 0.3 * s})`;
        return tl(el, DUR, f([0, { [O]: 0, [T]: t(1) }], [at, {}], [at + 0.4, { [O]: 1 }], [at + 0.9, {}], [at + 2.1, { [T]: t(0), [O]: 1 }], [at + 2.4, { [O]: 0 }], [DUR, {}]));
      }),
      tl($('.hub', host), DUR, f([0, { [T]: 'scale(1)' }], [2.4, {}], [2.7, { [T]: 'scale(1.1)' }], [3.1, { [T]: 'scale(1)' }], [5.2, {}], [5.5, { [T]: 'scale(1.1)' }], [5.9, { [T]: 'scale(1)' }], [8, {}], [8.3, { [T]: 'scale(1.1)' }], [8.7, { [T]: 'scale(1)' }], [DUR, {}])),
    ],
    { within: host },
  );
}
