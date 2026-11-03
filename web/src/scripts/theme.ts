const root = document.documentElement;

const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

function sync() {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    const label = current() === 'dark' ? button.dataset.labelLight : button.dataset.labelDark;
    if (label) button.setAttribute('aria-label', label);
  });
}

document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest<HTMLElement>('[data-theme-toggle]');
  if (!button) return;
  const next = current() === 'dark' ? 'light' : 'dark';
  const apply = () => {
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage can be blocked; the choice still applies for this page view.
    }
    sync();
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply();
    return;
  }
  // Circular reveal from the toggle (DESIGN-4 section 5): the new theme grows out of the button.
  const r = button.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const transition = doc.startViewTransition(apply);
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {});
});

sync();

export {};
