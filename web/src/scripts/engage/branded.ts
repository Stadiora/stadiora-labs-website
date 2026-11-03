// Custom-branded apps: the hero phone re-skins through Demo Gym and the four apps (colour, mark, name, photo)
// while the side phones and chips follow. One autoplayer on the phone, paused by hover, focus, offscreen and a
// hidden tab. The markup is the first brand, which is what reduced motion shows.
import { $, $$, autoplayer, isReduced, scramble, startKit } from '../motion/kit';

interface Brand {
  n: string;
  m: string;
  c: string;
  i: string;
}

startKit();

function morph() {
  const stage = $<HTMLElement>('[data-ap-stage]');
  const phone = stage && $<HTMLElement>('[data-morph]', stage);
  const scr = phone && $<HTMLElement>('[data-app]', phone);
  const nm = phone && $<HTMLElement>('[data-app-name]', phone);
  const mk = phone && $<HTMLElement>('[data-app-mk]', phone);
  const im = phone && $<HTMLElement>('[data-app-img]', phone);
  if (!stage || !phone || !scr || !nm || !mk || !im) return;
  let brands: Brand[] = [];
  try {
    brands = JSON.parse(stage.dataset.brands ?? '[]');
  } catch {
    return;
  }
  if (brands.length < 2) return;
  const chips = $$<HTMLElement>('.flychip', stage);
  const sides = $$<HTMLElement>('.ap-side', stage);
  chips.forEach((c) => c.style.setProperty('--bc', brands[0].c));
  let i = 0;
  let timer = 0;

  const paint = (n: number, animate: boolean) => {
    const b = brands[n];
    scr.style.setProperty('--bc', b.c);
    mk.textContent = b.m;
    nm.textContent = b.n;
    delete nm.dataset.orig;
    nm.removeAttribute('aria-label');
    im.style.setProperty('--img', b.i);
    sides.forEach((sd, k) => {
      const sb = brands[(n + (k ? 1 : brands.length - 1)) % brands.length];
      const sc = $<HTMLElement>('.app-scr', sd);
      if (!sc) return;
      sc.style.setProperty('--bc', sb.c);
      const smk = $('.mk', sc);
      const san = $('.an', sc);
      if (smk) smk.textContent = sb.m;
      if (san) san.textContent = sb.n;
      $<HTMLElement>('.hl', sc)?.style.setProperty('--img', sb.i);
    });
    chips.forEach((c, k) => {
      c.style.setProperty('--bc', b.c);
      if (animate) c.animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], { duration: 500, delay: k * 90, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    });
  };

  const go = () => {
    i = (i + 1) % brands.length;
    paint(i, true);
    scramble(nm, 500);
    scr.animate([{ clipPath: 'circle(0% at 50% 30%)' }, { clipPath: 'circle(140% at 50% 30%)' }], { duration: 700, easing: 'cubic-bezier(.7,0,.2,1)' });
  };

  autoplayer(phone, {
    within: stage,
    threshold: 0.3,
    play: () => {
      timer = window.setInterval(go, 2600);
    },
    pause: () => {
      clearInterval(timer);
      // Turning on reduced motion mid-session returns to the first brand, the finished still.
      if (isReduced() && i !== 0) {
        i = 0;
        paint(0, false);
      }
    },
  });
}

morph();
