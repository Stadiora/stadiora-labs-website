// Contact page extras, all visual: the topic thumb glides only after the first paint, a ring of dots bursts from the
// submit button when the form reports a real send (data-state="ok" on the status line, which contact-form.ts sets only
// on a 202), and the photo's drift pauses like every other loop. This file never writes text.
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
      if (status.dataset.state !== 'ok' || isReduced()) return;
      burst.classList.remove('go');
      void burst.offsetWidth;
      burst.classList.add('go');
    }).observe(status, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
  }

  const side = $('[data-sx-contact]');
  if (side) autoplayer(side, { play: () => {}, pause: () => {} });
}
