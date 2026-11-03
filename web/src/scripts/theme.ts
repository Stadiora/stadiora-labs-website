const root = document.documentElement;

const current = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

function sync() {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    const label = current() === 'dark' ? button.dataset.labelLight : button.dataset.labelDark;
    if (label) button.setAttribute('aria-label', label);
  });
}

document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest('[data-theme-toggle]');
  if (!button) return;
  const next = current() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    // Storage can be blocked; the choice still applies for this page view.
  }
  sync();
});

sync();

export {};
