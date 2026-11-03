// FROM / TO word swaps in the "for every coach" heading (DESIGN-4 M13). Each list cycles on its own clock
// (the second row is offset) through an autoplayer, so hovering or focusing the heading, scrolling away
// or hiding the tab stops it. The words are stacked in one grid cell, so no measuring is needed.
import { $, $$, autoplayer } from '../../motion/kit';

export function initSwaps() {
  const heading = $<HTMLElement>('#showcase h2');
  $$<HTMLElement>('#showcase [data-swap]').forEach((sw, si) => {
    const words = $$<HTMLElement>(':scope > span', sw);
    if (words.length < 2) return;
    let i = words.findIndex((w) => w.classList.contains('on'));
    if (i < 0) i = 0;
    let timer = 0;
    const step = () => {
      const out = words[i];
      out.classList.remove('on');
      out.classList.add('off');
      setTimeout(() => out.classList.remove('off'), 700);
      i = (i + 1) % words.length;
      words[i].classList.add('on');
      timer = window.setTimeout(step, 3000);
    };
    autoplayer(sw, {
      within: heading ?? sw,
      threshold: 0.25,
      play: () => {
        timer = window.setTimeout(step, 3000 + si * 1500);
      },
      pause: () => clearTimeout(timer),
    });
  });
}
