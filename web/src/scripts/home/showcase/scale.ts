// The scale rail is a CSS marquee (two identical sets, the second aria-hidden and inert). The autoplayer only
// mirrors the pause rules to data-ap so keyboard focus, offscreen and hidden tabs stop it like everything else.
import { $, autoplayer } from '../../motion/kit';

export function initScale() {
  const rail = $<HTMLElement>('#scale [data-rail]');
  if (!rail) return;
  autoplayer(rail, { threshold: 0.1, play: () => {}, pause: () => {} });
}
