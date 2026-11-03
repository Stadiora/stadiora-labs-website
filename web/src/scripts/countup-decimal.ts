// Counts decimal numbers up when they scroll into view: [data-countup-dec="38.4"][data-decimals="1"].
// The server-rendered text is already the final value, so this only adds the motion.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const lang = document.documentElement.lang || 'en';

function run(el: HTMLElement) {
  const target = Number(el.dataset.countupDec);
  const decimals = Number(el.dataset.decimals ?? 0);
  if (reduced || !Number.isFinite(target)) return;
  const fmt = new Intl.NumberFormat(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const duration = Number(el.dataset.duration ?? 900);
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.max(0, Math.min(1, (now - start) / duration));
    el.textContent = fmt.format(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  el.textContent = fmt.format(0);
  requestAnimationFrame(tick);
}

const nodes = document.querySelectorAll<HTMLElement>('[data-countup-dec]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target as HTMLElement);
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.5 },
  );
  nodes.forEach((n) => io.observe(n));
}

export {};
