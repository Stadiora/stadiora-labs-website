// Hero word swap (M3) and the conveyor step it drives (M4) on the Solutions pages. Re-implements the home hero
// pattern under the sx- prefix: the swap line cycles its words, and where a centre conveyor lane exists it steps
// one block per word. The server-rendered state is word 1 (the still frame); nothing here runs under reduced motion.
// Every timer runs on the kit autoplayer's clock (ap.later) and the conveyor's transitions are held by it, so one pause
// (keyboard focus, offscreen, hidden tab) stops the words, the lanes and the photos together.
import { $, $$, autoplayer, isReduced, type Autoplayer } from '../motion/kit';

const CYCLE_MS = 2800;
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
// What a pause holds: the centre conveyor's transitions (step, Ken Burns, tile fades, parallax). What it settles: the
// word slot and its letters, so a headline held by keyboard focus is never left half blurred.
const FREEZE = { hold: '.sx-cv, .sx-cv *', settle: '.sx-slot, .sx-slot *' };

function buildWord(word: string, index: number): HTMLElement {
  const w = document.createElement('span');
  w.className = 'sx-w';
  w.dataset.sxWord = '';
  w.dataset.wordIndex = String(index);
  w.style.setProperty('--m', String(Math.max(word.replace(/ /g, '').length - 1, 1)));
  let k = 0;
  word.split(' ').forEach((part, i) => {
    if (i) {
      const sp = document.createElement('span');
      sp.className = 'sx-sp';
      sp.textContent = '\u00a0';
      sp.style.setProperty('--k', String(k));
      w.append(sp);
    }
    const group = document.createElement('span');
    group.className = 'sx-part';
    for (const ch of part) {
      const s = document.createElement('span');
      s.className = 'sx-ch';
      s.textContent = ch;
      s.style.setProperty('--k', String(k++));
      group.append(s);
    }
    w.append(group);
  });
  return w;
}

function initHeroSwap(hero: HTMLElement) {
  const swap = $('[data-sx-swap]', hero);
  const slot = $('[data-sx-slot]', hero);
  const copy = $('[data-sx-copy]', hero);
  const cv = $('[data-sx-cv]', hero);
  if (!copy) return;
  if (!swap && $('[data-sx-loop]', hero)) {
    // a CSS-only loop (the About "A" window) is paused by the autoplayer like every other loop
    autoplayer(hero, { play: () => {}, pause: () => {}, freeze: FREEZE });
    return;
  }
  if (!swap || !slot) {
    // a conveyor without a swap (clubs) only loops in CSS; the autoplayer still pauses it on keyboard focus, offscreen and hidden tabs
    if (cv) autoplayer(hero, { within: copy, play: () => {}, pause: () => {}, freeze: FREEZE });
    return;
  }
  const words: string[] = JSON.parse(swap.dataset.words ?? '[]');
  if (words.length < 2) return;

  const col = $('[data-sx-col]', hero);
  const lane = col?.parentElement ?? null;
  const tiles = col ? ([...col.children] as HTMLElement[]) : [];
  const bigs = col ? $$('[data-big]', col) : [];
  let pos = 1; // block 0 is a clone of the last photo, block 1 is the first word's
  let wi = 0;
  let ap: Autoplayer;
  let armed = false;
  // `flush` timers finish at once on a pause (a word half-way out must not leave the line blank); the rest wait with it.
  const later = (fn: () => void, ms: number, flush = false) => ap.later(fn, ms, flush);

  /** Centres the big tile of block `p` in the lane. */
  function place(p: number, animate: boolean) {
    const big = bigs[p];
    if (!col || !lane || !big) return;
    col.classList.toggle('anim', animate);
    col.style.setProperty('--y', `${(lane.clientHeight / 2 - (big.offsetTop + big.offsetHeight / 2)).toFixed(1)}px`);
    tiles.forEach((t, k) => t.classList.toggle('on', Math.floor(k / 3) === p));
  }
  /** Fetches the next blocks before the lane steps onto them (lazy images in a clipped lane would pop in late). */
  function warm(p: number) {
    for (let b = p; b <= p + 2 && b < bigs.length; b++) {
      for (const t of tiles.slice(b * 3, b * 3 + 3)) {
        const img = $<HTMLImageElement>('img', t);
        if (img && img.loading === 'lazy') img.loading = 'eager';
      }
    }
  }
  if (col && lane) {
    const settle = () => place(pos, false);
    new ResizeObserver(settle).observe(lane);
    window.addEventListener('load', settle);
    document.fonts?.ready.then(settle);
    settle();
    warm(pos);
  }

  const sweep = (big: HTMLElement | undefined) => {
    if (!big || isReduced()) return;
    $<HTMLElement>('.sx-sweep', big)?.animate(
      [
        { transform: 'translateX(-100%)', opacity: 1 },
        { transform: 'translateX(100%)', opacity: 1 },
      ],
      { duration: 900, easing: EASE },
    );
  };

  /** Pins the slot to the old word's width, then eases it to the new word's, so the text after it glides instead of jumping. */
  function swapWord(old: HTMLElement) {
    const next = buildWord(words[wi], wi);
    if (!slot!.style.width) {
      slot!.style.width = `${old.offsetWidth}px`;
      void slot!.offsetWidth;
    }
    slot!.append(next);
    slot!.style.width = `${next.offsetWidth}px`;
    delete old.dataset.active;
    next.dataset.active = '';
    next.classList.add('in');
    later(() => next.classList.remove('in'), 1500, true);
    later(() => old.remove(), 600, true);
  }

  function step() {
    const old = $('[data-sx-word][data-active]', slot!);
    if (!old) return;
    wi = (wi + 1) % words.length;
    old.classList.add('out');
    if (col) {
      later(() => {
        pos++;
        place(pos, true);
        warm(pos);
        sweep(bigs[pos]);
        if (pos === words.length + 1) {
          // the clone of the first photo is on screen: jump back to the real one without a transition
          later(() => {
            col.classList.add('snap');
            pos = 1;
            place(pos, false);
            requestAnimationFrame(() => requestAnimationFrame(() => col.classList.remove('snap')));
          }, 1250);
        }
      }, 120);
    }
    later(() => swapWord(old), 300, true);
  }

  const cycle = () => {
    armed = false;
    arm();
    step();
  };
  const arm = () => {
    if (armed) return;
    armed = true;
    later(cycle, CYCLE_MS);
  };
  ap = autoplayer(hero, {
    within: copy,
    play: (a) => {
      ap = a;
      arm();
    },
    pause: () => {},
    freeze: FREEZE,
  });

  // pointer parallax on the conveyor: mouse only, one frame at a time
  if (cv) {
    let raf = 0;
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse' || isReduced() || raf || hero.dataset.ap !== 'on') return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          cv.style.setProperty('--cvx', `${(e.clientX / innerWidth - 0.5) * -14}px`);
          cv.style.setProperty('--cvy', `${(e.clientY / innerHeight - 0.5) * -10}px`);
        });
      },
      { passive: true },
    );
  }
}

export function initSwap() {
  $$('[data-sx-hero]').forEach(initHeroSwap);
}
