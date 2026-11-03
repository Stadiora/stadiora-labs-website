// Four pillars: kit autotabs drives the tabs and clips; this adds the open text panel and the accent colour.
import { $, $$, autotabs } from '../motion/kit';

export function initPillars() {
  const root = $<HTMLElement>('#pillars [data-autotabs]');
  if (!root) return;
  const tabs = $$<HTMLElement>('[role="tab"]', root);
  const panels = $$<HTMLElement>('.pil-panel', root);
  const media = $<HTMLElement>('.pil-media', root);

  // autotabs selects the first tab as it starts, so listen first.
  root.addEventListener('at:change', (e) => {
    const { i } = (e as CustomEvent<{ i: number }>).detail;
    panels.forEach((p, k) => p.classList.toggle('on', k === i));
    const color = tabs[i]?.dataset.color;
    if (color) media?.style.setProperty('--pc', color);
  });
  autotabs(root);
}
