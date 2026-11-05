// Stages that only loop in CSS (the Coaches "day with Aria" step rings) still get a pause unit: the shared kit autoplayer
// sets data-ap on the stage, the stage's own [data-ap="off"] rule stops its loops, and keyboard focus, offscreen and a hidden
// tab all use the same switch as every other autoplayer.
import { $$, autoplayer } from '../motion/kit';

export function initStages() {
  for (const stage of $$('[data-sx-stage]')) autoplayer(stage, { threshold: 0.2, play: () => {}, pause: () => {} });
}
