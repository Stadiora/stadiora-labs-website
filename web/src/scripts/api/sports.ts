// Sport strip: the headline word swaps every 2.6 s (letters blur out and slide in) and the chips follow.
// The timer belongs to the kit's autoplayer: pausing clears it and keeps the time that was left, so a swap that was
// half way finishes on resume. Reduced motion keeps the first word and chip.
import { $, $$, autoplayer, onMotionChange } from '../motion/kit';

export function initSports() {
  const host = $('[data-sports]');
  const word = $('[data-sp-word]');
  const idx = $('[data-sp-idx]');
  const raw = $('[data-sp-strings]')?.textContent;
  if (!host || !word || !idx || !raw) return;
  const W: string[] = JSON.parse(raw).words;
  const chips = $$('[data-sp-chips] li:not(.any)');
  const total = String(W.length).padStart(2, '0');
  let i = 0;

  const spans = (t: string, cls: string) =>
    [...t].map((c, j) => `<span class="ch ${cls}" style="--j:${j}">${c === ' ' ? '&nbsp;' : c.replace('&', '&amp;')}</span>`).join('');
  const set = (n: number, anim: boolean) => {
    i = n;
    chips.forEach((c, k) => c.classList.toggle('on', k === i));
    idx.textContent = `${String(i + 1).padStart(2, '0')} / ${total}`;
    word.innerHTML = spans(W[i], anim ? 'sp-in' : '');
  };
  set(0, false);

  let timer = 0;
  let pending: (() => void) | null = null;
  let remaining = 0;
  let armedAt = 0;
  let running = false;
  const arm = () => {
    armedAt = performance.now();
    timer = window.setTimeout(() => {
      const f = pending;
      pending = null;
      f?.();
    }, remaining);
  };
  const schedule = (f: () => void, ms: number) => {
    pending = f;
    remaining = ms;
    if (running) arm();
  };
  const tick = () => {
    const n = word.children.length;
    $$('.ch', word).forEach((c) => {
      c.classList.remove('sp-in');
      c.classList.add('sp-out');
    });
    schedule(() => {
      set((i + 1) % W.length, true);
      schedule(tick, 2600);
    }, 260 + n * 10);
  };

  autoplayer(host, {
    threshold: 0.2,
    within: $('.sp-h', host) ?? host,
    play: () => {
      running = true;
      if (!pending) schedule(tick, 2600);
      else arm();
    },
    pause: () => {
      running = false;
      clearTimeout(timer);
      if (pending) remaining = Math.max(0, remaining - (performance.now() - armedAt));
    },
  });

  onMotionChange((reduced) => {
    if (reduced) {
      clearTimeout(timer);
      pending = null;
      set(0, false);
    }
  });
}
