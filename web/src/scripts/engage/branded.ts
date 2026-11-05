// Custom-branded apps: the hero phone re-skins through Your Gym and the four apps (colour, mark, name, photo)
// while the side phones and chips follow. One autoplayer on the phone, paused by hover, focus, offscreen and a
// hidden tab: a pause holds the swap that is in flight (the reveal, the chip pulses, the name scramble) and the
// countdown to the next one, and resuming carries on from there. The markup is the first brand, which is what
// reduced motion shows, also when it is switched on in the middle of a swap.
import { $, $$, autoplayer, isReduced, onMotionChange, startKit } from '../motion/kit';

interface Brand {
  n: string;
  m: string;
  c: string;
  i: string;
}

startKit();

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
const INTERVAL = 2600;

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

  const paint = (n: number, animate: boolean) => {
    const b = brands[n];
    scr.style.setProperty('--bc', b.c);
    mk.textContent = b.m;
    nm.textContent = b.n;
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

  // The name scrambles into place on its own clock, so pausing can hold it mid-word and settling can end it.
  const scrambler = (el: HTMLElement, text: string, ms: number) => {
    let elapsed = 0;
    let last = 0;
    let raf = 0;
    let live = true;
    const frame = (t: number) => {
      elapsed += last ? Math.min(t - last, 100) : 0;
      last = t;
      if (elapsed >= ms) {
        end();
        return;
      }
      const p = elapsed / ms;
      el.textContent = [...text].map((c, k) => (c === ' ' || k < p * text.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      last = 0;
    };
    const end = () => {
      stop();
      live = false;
      el.textContent = text;
    };
    return {
      play: () => {
        if (live) raf = requestAnimationFrame(frame);
      },
      pause: stop,
      end,
    };
  };

  let scramble: ReturnType<typeof scrambler> | null = null;
  // Animations of the stage (the circular reveal, the chip pulses and any colour transition in flight) that a pause stopped.
  let held: Animation[] = [];
  let due = INTERVAL;
  let armedAt = 0;
  let timer = 0;
  let armed = false;

  const go = () => {
    scramble?.end();
    i = (i + 1) % brands.length;
    paint(i, true);
    scramble = scrambler(nm, brands[i].n, 500);
    scramble.play();
    scr.animate([{ clipPath: 'circle(0% at 50% 30%)' }, { clipPath: 'circle(140% at 50% 30%)' }], { duration: 700, easing: 'cubic-bezier(.7,0,.2,1)' });
  };
  const arm = () => {
    armed = true;
    armedAt = performance.now();
    timer = window.setTimeout(() => {
      armed = false;
      due = INTERVAL;
      go();
      arm();
    }, due);
  };
  const disarm = () => {
    if (!armed) return;
    armed = false;
    clearTimeout(timer);
    due = Math.max(0, due - (performance.now() - armedAt));
  };

  // Reduced motion, also switched on mid-swap: end the swap where it stands, then show one brand (the first, as the markup does)
  // across the phone, the side phones, the chips and the name.
  const settle = () => {
    disarm();
    scramble?.end();
    scramble = null;
    held = [];
    stage.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    i = 0;
    due = INTERVAL;
    paint(0, false);
  };
  onMotionChange((reduced) => {
    if (reduced) settle();
  });

  autoplayer(phone, {
    within: stage,
    threshold: 0.3,
    play: () => {
      if (isReduced()) return;
      arm();
      scramble?.play();
      for (const a of held) if (a.playState === 'paused') a.play();
      held = [];
    },
    pause: () => {
      disarm();
      scramble?.pause();
      const running = stage.getAnimations({ subtree: true }).filter((a) => a.playState === 'running');
      running.forEach((a) => a.pause());
      held = [...held, ...running];
    },
  });
}

morph();
