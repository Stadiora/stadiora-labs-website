// Scroll reveal for [data-reveal], plus one-shot triggers for [data-ring] and [data-countup].
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function onceInView(selector: string, run: (el: HTMLElement) => void, threshold = 0.25) {
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  if (!nodes.length) return;
  if (!('IntersectionObserver' in window)) {
    nodes.forEach(run);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target as HTMLElement);
        io.unobserve(entry.target);
      }
    },
    { threshold, rootMargin: '0px 0px -6% 0px' },
  );
  nodes.forEach((n) => io.observe(n));
}

onceInView('[data-reveal]', (el) => el.classList.add('is-in'), 0.15);
onceInView('[data-ring]', (el) => el.classList.add('is-drawn'));

onceInView('[data-countup]', (el) => {
  const target = Number(el.dataset.countup);
  if (reduced || !Number.isFinite(target)) return;
  const duration = Number(el.dataset.duration ?? 600);
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick);
  };
  el.textContent = '0';
  requestAnimationFrame(tick);
});

export {};
