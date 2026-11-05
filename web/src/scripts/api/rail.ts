// Capability rail: vertical scroll drives a horizontal track while the section is pinned (wide screens, motion allowed).
// Below 900px, or with reduced motion, there is no pin: the cards are a native swipe row or a wrapped grid.
import { $, $$, clamp, isReduced, onMotionChange } from '../motion/kit';

export function initRail() {
  const pin = $('[data-cap]');
  const track = $('[data-cap-track]');
  if (!pin || !track) return;
  const sticky = $('.cap-sticky', pin)!;
  const idx = $('[data-cap-i]', pin);
  const bar = $('.cap-foot', pin);
  const cards = $$('.cc', track);
  const wide = matchMedia('(min-width: 901px)');

  // The cursor glow follows the pointer inside each card.
  for (const c of cards) {
    c.addEventListener('pointermove', (e) => {
      const b = c.getBoundingClientRect();
      c.style.setProperty('--sx', e.clientX - b.left + 'px');
      c.style.setProperty('--sy', e.clientY - b.top + 'px');
    });
  }

  const pinned = () => wide.matches && !isReduced();
  let shift = 0;
  let queued = false;
  const update = () => {
    queued = false;
    if (!pinned()) return;
    const rc = pin.getBoundingClientRect();
    const p = clamp(-rc.top / Math.max(1, rc.height - sticky.offsetHeight), 0, 1);
    track.style.setProperty('--tx', (-p * shift).toFixed(1) + 'px');
    bar?.style.setProperty('--cp', p.toFixed(4));
    if (idx) idx.textContent = String(Math.min(cards.length, 1 + Math.floor(p * cards.length * 0.999))).padStart(2, '0');
  };
  const ask = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  const size = () => {
    if (!pinned()) {
      pin.style.height = '';
      track.style.removeProperty('--tx');
      return;
    }
    shift = Math.max(0, track.scrollWidth - innerWidth);
    pin.style.height = sticky.offsetHeight + shift + 'px';
    update();
  };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', size);
  wide.addEventListener('change', size);
  onMotionChange(size);
  document.fonts?.ready.then(size);
  size();
}
