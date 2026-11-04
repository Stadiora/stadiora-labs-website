// Athletes hero morph: the white-label phone puts on each athlete app in turn (colour, mark, name, photo, today's
// session and status), the side phones and the label list follow. One autoplayer on the phone; hovering or focusing
// the stage pauses it. The server-rendered state is the first app, which is also the reduced-motion state.
import { $, $$, autoplayer, scramble, type Autoplayer } from '../motion/kit';

interface Brand {
  n: string;
  m: string;
  c: string;
  f: string;
  i: string;
  k: string;
  t: string;
  s: string;
  st: string;
}

const EASE = 'cubic-bezier(.7,0,.2,1)';
const CYCLE_MS = 2600;

export function initMorph() {
  const stage = $<HTMLElement>('[data-sx-morph]');
  const phone = stage && $<HTMLElement>('[data-morph]', stage);
  const scr = phone && $<HTMLElement>('[data-app]', phone);
  if (!stage || !phone || !scr) return;
  let brands: Brand[] = [];
  try {
    brands = JSON.parse(stage.dataset.brands ?? '[]');
  } catch {
    return;
  }
  if (brands.length < 2) return;
  const set = (sel: string, text: string) => {
    const el = $<HTMLElement>(sel, scr);
    if (el) el.textContent = text;
  };
  const name = $<HTMLElement>('[data-app-name]', scr)!;
  const img = $<HTMLElement>('[data-app-img]', scr)!;
  const sides = $$<HTMLElement>('.sx-ms', stage);
  const labs = $$<HTMLElement>('[data-sx-ap-labels] [data-ap-lab]');
  let i = 0;
  let ap: Autoplayer;
  let armed = false;
  const arm = () => {
    if (armed) return;
    armed = true;
    ap.later(cycle, CYCLE_MS);
  };
  const cycle = () => {
    armed = false;
    arm();
    go();
  };

  const go = () => {
    i = (i + 1) % brands.length;
    const b = brands[i];
    scr.style.setProperty('--bc', b.c);
    scr.style.setProperty('--fg', b.f);
    set('[data-app-mk]', b.m);
    delete name.dataset.orig;
    name.removeAttribute('aria-label');
    name.textContent = b.n;
    scramble(name, 500);
    set('[data-app-k]', b.k);
    set('[data-app-t]', b.t);
    set('[data-app-s]', b.s);
    set('[data-app-st]', b.st);
    img.style.setProperty('--img', b.i);
    labs.forEach((l, k) => l.classList.toggle('on', k === i));
    sides.forEach((sd, k) => {
      const sb = brands[(i + (k ? 1 : brands.length - 1)) % brands.length];
      const sc = $<HTMLElement>('.sx-scr', sd)!;
      sc.style.setProperty('--bc', sb.c);
      sc.style.setProperty('--fg', sb.f);
      $('.mk', sc)!.textContent = sb.m;
      $('.an', sc)!.textContent = sb.n;
      $<HTMLElement>('.hl', sc)!.style.setProperty('--img', sb.i);
    });
    scr.animate([{ clipPath: 'circle(0% at 50% 30%)' }, { clipPath: 'circle(140% at 50% 30%)' }], { duration: 700, easing: EASE });
  };

  autoplayer(phone, {
    within: stage,
    threshold: 0.3,
    // the brand reveal and colour change are short one-shot animations: a pause lets them finish, and a half-scrambled name drops to its final text
    freeze: { settle: '.sx-scr, .sx-scr *, .sx-aplab', scope: stage },
    play: (a) => {
      ap = a;
      arm();
    },
    pause: () => {
      if (!name.dataset.scrambling) return;
      delete name.dataset.scrambling;
      name.textContent = brands[i].n;
    },
  });
}
