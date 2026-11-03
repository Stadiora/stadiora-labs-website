// Retro stack: every 2400ms the front card lifts, tilts and slides to the back (200ms + 400ms).
// Pauses on hover/focus, when offscreen, or when the user presses the pause button.
// Reduced motion keeps the front card only (handled in CSS) and this script does nothing.
const root = document.querySelector<HTMLElement>('[data-retro]');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (root && !reduced.matches) {
  const cards = Array.from(root.querySelectorAll<HTMLElement>('.retro__card'));
  const pauseBtn = document.querySelector<HTMLButtonElement>('[data-retro-pause]');
  const count = cards.length;
  let timer = 0;
  let liftTimer = 0;
  let inView = false;
  let hovering = false;
  let userPaused = false;

  const pos = cards.map((_, i) => i);
  const setPos = () => cards.forEach((card, i) => card.setAttribute('data-pos', String(pos[i])));

  const advance = () => {
    const front = cards[pos.indexOf(0)];
    front.classList.add('is-lift');
    liftTimer = window.setTimeout(() => {
      front.classList.remove('is-lift');
      for (let i = 0; i < count; i++) pos[i] = (pos[i] - 1 + count) % count;
      setPos();
    }, 200);
  };

  const stop = () => {
    window.clearInterval(timer);
    window.clearTimeout(liftTimer);
    timer = 0;
    cards.forEach((c) => c.classList.remove('is-lift'));
  };
  const sync = () => {
    stop();
    if (inView && !document.hidden && !hovering && !userPaused) timer = window.setInterval(advance, 2400);
  };

  root.addEventListener('pointerenter', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse') return;
    hovering = true;
    sync();
  });
  root.addEventListener('pointerleave', () => {
    hovering = false;
    sync();
  });
  document.addEventListener('visibilitychange', sync);

  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', (userPaused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause) ?? '');
    sync();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.3 },
    ).observe(root);
  }
}

export {};
