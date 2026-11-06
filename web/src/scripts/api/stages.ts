// Pause controller for the page's own CSS loops (floating numbers, card visuals, the hub orbits, the live dot). Each moving
// stage is one unit carrying data-api-stage. The kit's autoplayer decides for the whole unit when it may run and mirrors that
// to data-ap on it; api.css pauses every loop inside while data-ap is "off": keyboard focus, off screen, in a hidden tab,
// or reduced motion. Stages that also run script (engine, code, sports, use cases) set data-ap through their own autoplayer.
import { $$, autoplayer } from '../motion/kit';

const OWN = new Set(['engine', 'code', 'sports', 'uc']);

export function initStages() {
  for (const host of $$('[data-api-stage]')) {
    if (OWN.has(host.dataset.apiStage ?? '')) continue;
    // The loops are CSS, so the autoplayer only keeps the state: play and pause have nothing to call.
    autoplayer(host, { threshold: 0.15, play: () => {}, pause: () => {} });
  }
}
