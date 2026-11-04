// Use cases: rows auto-advance every 6.2 s (a progress bar under the open row) while the photo crossfades.
// One requestAnimationFrame accumulator owned by the kit's autoplayer: it is cancelled while the block is off screen,
// hovered, focused, in a hidden tab or under reduced motion. Reduced motion keeps rows manual, the bar full.
// The photo's 7 s scale is a CSS transition, not the frame loop, so the autoplayer's freeze holds it in place while paused
// (and settles the crossfade and the pop-ups, which carry text, to their end state).
import { $, $$, autoplayer, clamp, type Autoplayer, isReduced, onMotionChange } from '../motion/kit';

export function initUseCases() {
  const root = $('[data-uc]');
  if (!root) return;
  const rows = $$('[data-uc-row]', root);
  const figs = $$('[data-uc-fig]', root);
  const btns = rows.map((r) => $('button', r)!);
  const bars = rows.map((r) => $('.at-bar i', r)!);
  const dur = Number(root.dataset.at) || 6000;
  let i = 0;
  let el = 0;
  let last = 0;
  let raf = 0;
  let ap: Autoplayer | undefined;

  const load = (f: HTMLElement) => {
    const im = $<HTMLImageElement>('img[data-src]', f);
    if (im) {
      im.src = im.dataset.src!;
      delete im.dataset.src;
    }
  };
  const paint = () => {
    bars.forEach((b, k) => (b.style.transform = `scaleX(${k === i ? (isReduced() ? 1 : clamp(el / dur, 0, 1)) : 0})`));
  };
  const sel = (n: number) => {
    i = (n + rows.length) % rows.length;
    el = 0;
    rows.forEach((r, k) => {
      r.classList.toggle('open', k === i);
      btns[k].setAttribute('aria-expanded', String(k === i));
    });
    figs.forEach((f, k) => {
      f.classList.toggle('on', k === i);
      if (k === i || k === (i + 1) % figs.length) load(f);
    });
    paint();
    ap?.hold();
  };

  const frame = (t: number) => {
    const dt = last ? Math.min(t - last, 100) : 0;
    last = t;
    el += dt;
    if (el >= dur) sel(i + 1);
    else paint();
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf || isReduced()) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  btns.forEach((b, k) => b.addEventListener('click', () => sel(k)));
  ap = autoplayer(root, { threshold: 0.25, play: start, pause: stop, freeze: { hold: '.uc-fig img', settle: '.uc-fig, .uc-pop' } });
  onMotionChange(() => paint());
  sel(0);
}
