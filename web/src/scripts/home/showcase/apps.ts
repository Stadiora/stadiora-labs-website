// Custom-apps morph (DESIGN-4 M17): the white-label phone re-skins through each brand (colour, mark, name,
// photo), the side phones and chips follow, and the label list highlights the active app. One autoplayer on
// the phone, paused by hovering or focusing the stage. The still markup is the first brand.
import { $, $$, autoplayer, scramble } from '../../motion/kit';

interface Brand {
  n: string;
  m: string;
  c: string;
  i: string;
}

export function initApps() {
  const stage = $<HTMLElement>('#apps [data-ap-stage]');
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
  const labs = $$<HTMLElement>('#apps .ap-lab');
  const chips = $$<HTMLElement>('.flychip', stage);
  const sides = $$<HTMLElement>('.ap-side', stage);
  let i = 0;
  let timer = 0;

  const go = () => {
    i = (i + 1) % brands.length;
    const b = brands[i];
    scr.style.setProperty('--bc', b.c);
    mk.textContent = b.m;
    nm.textContent = b.n;
    delete nm.dataset.orig;
    nm.removeAttribute('aria-label');
    scramble(nm, 500);
    im.style.setProperty('--img', b.i);
    labs.forEach((l, k) => l.classList.toggle('on', k === i));
    sides.forEach((sd, k) => {
      const sb = brands[(i + (k ? 1 : brands.length - 1)) % brands.length];
      const sc = $<HTMLElement>('.app-scr', sd)!;
      sc.style.setProperty('--bc', sb.c);
      $('.mk', sc)!.textContent = sb.m;
      $('.an', sc)!.textContent = sb.n;
      $<HTMLElement>('.hl', sc)!.style.setProperty('--img', sb.i);
    });
    chips.forEach((c, k) => {
      c.style.setProperty('--bc', b.c);
      c.animate([{ scale: 1 }, { scale: 1.12 }, { scale: 1 }], { duration: 500, delay: k * 90, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    });
    scr.animate([{ clipPath: 'circle(0% at 50% 30%)' }, { clipPath: 'circle(140% at 50% 30%)' }], { duration: 700, easing: 'cubic-bezier(.7,0,.2,1)' });
  };

  autoplayer(phone, {
    within: stage,
    threshold: 0.3,
    play: () => {
      timer = window.setInterval(go, 2600);
    },
    pause: () => clearInterval(timer),
  });
}
