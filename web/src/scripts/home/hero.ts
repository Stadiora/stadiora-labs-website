// Hero (DESIGN-4 M3 + M4): the word swap and the photo conveyor step together; the side lanes loop in CSS.
// The page ships the first word and the whole conveyor as HTML; this only positions the centre lane, builds the
// next words and steps them. One autoplayer (host #hero, hover/focus on the copy) starts and stops the cycle.
import { $, $$, autoplayer, isReduced } from '../motion/kit';

const CYCLE_MS = 2800;
const EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

function buildWord(word: string, index: number): HTMLElement {
  const w = document.createElement('span');
  w.className = 'hero-w';
  w.dataset.heroWord = '';
  w.dataset.wordIndex = String(index);
  w.style.setProperty('--m', String(Math.max(word.replace(/ /g, '').length - 1, 1)));
  let k = 0;
  word.split(' ').forEach((part, i) => {
    if (i) {
      const sp = document.createElement('span');
      sp.className = 'hero-sp';
      sp.textContent = '\u00a0';
      sp.style.setProperty('--k', String(k));
      w.append(sp);
    }
    const group = document.createElement('span');
    group.className = 'hero-part';
    for (const ch of part) {
      const s = document.createElement('span');
      s.className = 'hero-ch';
      s.textContent = ch;
      s.style.setProperty('--k', String(k++));
      group.append(s);
    }
    w.append(group);
  });
  return w;
}

export function initHero() {
  const heroEl = $('#hero');
  const slotEl = $('[data-hero-words]');
  const copyEl = $('[data-hero-copy]');
  const colEl = $('[data-hero-col]');
  const cvEl = $('[data-hero-cv]');
  if (!heroEl || !slotEl || !copyEl || !colEl || !cvEl) return;
  // re-bound as plain HTMLElements so the narrowing holds inside the helper functions below
  const hero: HTMLElement = heroEl;
  const slot: HTMLElement = slotEl;
  const copy: HTMLElement = copyEl;
  const col: HTMLElement = colEl;
  const cv: HTMLElement = cvEl;

  const words: string[] = JSON.parse(slot.dataset.words ?? '[]');
  const toast = $('[data-toast]');
  const toasts: { title: string; text: string }[] = JSON.parse(toast?.dataset.toasts ?? '[]');
  const lane = col.parentElement as HTMLElement;
  const tiles = [...col.children] as HTMLElement[];
  const bigs = $$('[data-big]', col);
  let pos = 1; // block 0 is a clone of the last photo, block 1 is the first word's
  let wi = 0;
  let timer = 0;

  /** Centres the big tile of block `p` in the lane. */
  function place(p: number, animate: boolean) {
    const big = bigs[p];
    if (!big) return;
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
  const settle = () => place(pos, false);
  new ResizeObserver(settle).observe(lane);
  window.addEventListener('load', settle);
  document.fonts?.ready.then(settle);
  settle();
  warm(pos);

  const sweep = (big: HTMLElement) => {
    $<HTMLElement>('.hero-sweep', big)?.animate(
      [
        { transform: 'translateX(-100%)', opacity: 1 },
        { transform: 'translateX(100%)', opacity: 1 },
      ],
      { duration: 900, easing: EASE },
    );
  };

  function swapToast(i: number) {
    const t = toasts[i];
    if (!toast || !t) return;
    const b = $('b', toast);
    const s = $('span', toast);
    if (b) b.textContent = t.title;
    if (s) s.textContent = t.text;
    toast.animate(
      [
        { opacity: 0, transform: 'translateY(60%)', filter: 'blur(6px)' },
        { opacity: 1, transform: 'none', filter: 'none' },
      ],
      { duration: 600, easing: EASE },
    );
  }

  function swapWord(old: HTMLElement) {
    const next = buildWord(words[wi], wi);
    slot.append(next);
    next.style.setProperty('--r', String(old.offsetWidth / Math.max(next.offsetWidth, 1)));
    // the active marker moves in the same task, so there is never a moment without one
    delete old.dataset.active;
    next.dataset.active = '';
    old.classList.add('gone');
    next.classList.add('in');
    setTimeout(() => next.classList.remove('in'), 1500);
    setTimeout(() => old.remove(), 600);
  }

  function step() {
    const old = $('[data-hero-word][data-active]', slot);
    if (!old) return;
    wi = (wi + 1) % words.length;
    old.classList.add('out');
    setTimeout(() => {
      pos++;
      place(pos, true);
      warm(pos);
      sweep(bigs[pos]);
      if (pos === words.length + 1) {
        // the clone of the first photo is on screen: jump back to the real one without a transition
        setTimeout(() => {
          col.classList.add('snap');
          pos = 1;
          place(pos, false);
          requestAnimationFrame(() => requestAnimationFrame(() => col.classList.remove('snap')));
        }, 1250);
      }
    }, 120);
    setTimeout(() => {
      swapWord(old);
      swapToast(wi);
    }, 300);
  }

  autoplayer(hero, {
    within: copy,
    play: () => {
      window.clearInterval(timer);
      timer = window.setInterval(step, CYCLE_MS);
    },
    pause: () => window.clearInterval(timer),
  });

  // pointer parallax on the conveyor: mouse only, one frame at a time
  let raf = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || isReduced() || raf || hero.classList.contains('is-off')) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        cv.style.setProperty('--cvx', `${(e.clientX / innerWidth - 0.5) * -14}px`);
        cv.style.setProperty('--cvy', `${(e.clientY / innerHeight - 0.5) * -10}px`);
      });
    },
    { passive: true },
  );
}
