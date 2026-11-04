// Pause controller for the coach pages' own CSS loops. Every moving stage (a hero media frame, the accordion with its
// buttons and stage, the scan stage, the plan-to-phone link, the step flow) is one unit that carries data-cf-stage. The
// kit's autoplayer decides for the whole unit at once when it may run, and mirrors that to data-ap on the unit; cf.css
// pauses every loop inside it while data-ap is "off": the unit is hovered or focused (so are its controls, because they
// sit inside it), off screen, in a hidden tab, or under reduced motion. Clips inside a stage use the same scope through
// data-ap-within, so the video and the CSS loops always stop and start together.
import { $$, autoplayer } from '../motion/kit';

export function initStages() {
  for (const host of $$<HTMLElement>('[data-cf-stage]')) {
    // The loops are CSS, so the autoplayer only keeps the state: play and pause have nothing to call.
    autoplayer(host, { threshold: 0.15, play: () => {}, pause: () => {} });
  }
}
