// Proof (DESIGN-4 M11): the quote's words light up one by one when it is half on screen.
// The HTML is fully lit; this only dims it when it will animate it, so no script and reduced motion both read the full quote.
import { $, $$, autoplayer, isReduced } from '../motion/kit';

const START_MS = 200;
const STAGGER_MS = 130;

export function initProof() {
  const quote = $('[data-quote]');
  if (!quote || isReduced()) return;
  const words = $$('.wd', quote);
  let timers: number[] = [];
  quote.dataset.litReady = '';

  autoplayer(quote, {
    threshold: 0.5,
    play: () => {
      words
        .filter((w) => !w.classList.contains('lit'))
        .forEach((w, k) => timers.push(window.setTimeout(() => w.classList.add('lit'), START_MS + k * STAGGER_MS)));
    },
    pause: () => {
      timers.forEach(clearTimeout);
      timers = [];
      // leaving the page or the screen resumes where it stopped; a pointer or reduced motion must never leave the quote dim
      const why = quote.dataset.apWhy;
      if (why !== 'offscreen' && why !== 'hidden') words.forEach((w) => w.classList.add('lit'));
    },
  });
}
