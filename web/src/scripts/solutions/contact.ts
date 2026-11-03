// Contact page extras, all visual: the topic thumb glides only after the first paint, a ring of dots bursts from the
// submit button when the form's own status line fills in, and the photo's drift pauses like every other loop.
// This file never writes text; the only status text is the approved "opening your email app" line from contact-form.ts.
import { $, autoplayer, isReduced } from '../motion/kit';

export function initContact() {
  const form = $<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const seg = $('.seg', form);
  requestAnimationFrame(() => requestAnimationFrame(() => seg?.setAttribute('data-ready', '')));

  const status = $('[data-status]', form);
  const burst = $('.sx-burst', form);
  if (status && burst) {
    new MutationObserver(() => {
      if (!status.textContent?.trim() || isReduced()) return;
      burst.classList.remove('go');
      void burst.offsetWidth;
      burst.classList.add('go');
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }

  const side = $('[data-sx-contact]');
  if (side) autoplayer(side, { play: () => {}, pause: () => {} });
}
