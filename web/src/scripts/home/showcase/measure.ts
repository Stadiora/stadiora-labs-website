// Measure panel (DESIGN-4 M15): the tabs auto-advance; each slide recounts its numbers and redraws its rings.
import { $, $$, autotabs, isReduced, onMotionChange, recount } from '../../motion/kit';

export function initMeasure() {
  const root = $<HTMLElement>('#measure .ms-grid');
  if (!root) return;
  const slides = $$<HTMLElement>('.ms-slide', root);
  const bars = $$<HTMLElement>('[role="tab"]', root).map((t) => $<HTMLElement>('.at-bar i', t)!);
  const tabs = autotabs(root);
  // The kit zeroes every bar on select; with no autoplay the active one stays full.
  const fillBars = (i: number) => bars.forEach((b, k) => (b.style.transform = k === i ? 'scaleX(1)' : 'scaleX(0)'));
  onMotionChange((reduced) => {
    if (reduced) fillBars(tabs.index);
  });
  root.addEventListener('at:change', (e) => {
    const { i } = (e as CustomEvent<{ i: number }>).detail;
    if (isReduced()) {
      fillBars(i);
      return;
    }
    const s = slides[i];
    recount(s);
    for (const r of $$<HTMLElement>('.dring.draw', s)) {
      r.style.animation = 'none';
      void r.offsetWidth;
      r.style.animation = '';
    }
  });
  if (isReduced()) bars[0].style.transform = 'scaleX(1)';
}
