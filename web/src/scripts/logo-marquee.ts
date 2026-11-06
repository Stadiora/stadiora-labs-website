// Logo marquees that are not inside another autoplayer host (the About partners strip) get their own, so keyboard
// focus, offscreen, a hidden tab and reduced motion are all reported on the marquee as data-ap and stop the loop through
// logo-marquee.css. The home hero band is part of the #hero host and does not opt in.
import { $$, autoplayer } from './motion/kit';

export function initLogoMarquees() {
  for (const m of $$<HTMLElement>('[data-logo-marquee]')) autoplayer(m, { threshold: 0.1, play: () => {}, pause: () => {} });
}
