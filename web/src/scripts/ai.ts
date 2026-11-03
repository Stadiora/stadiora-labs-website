// AI program to calendar demo, a 9s loop: type the prompt (1.2s), rows assemble (2s), the card shrinks
// and springs onto the Thursday slot (700ms), sessions fill their days (70ms stagger), hold 3s.
// Starts when 40% of the panel is in view and stops when it leaves. Reduced motion keeps the final state.
const panel = document.querySelector<HTMLElement>('[data-ai-panel]');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (panel && !reduced.matches) {
  const typed = panel.querySelector<HTMLElement>('[data-ai-typed]')!;
  const full = typed.dataset.full ?? '';
  const program = panel.querySelector<HTMLElement>('[data-ai-program]')!;
  const slot = panel.querySelector<HTMLElement>('[data-ai-slot]')!;
  const pauseBtn = panel.querySelector<HTMLButtonElement>('[data-ai-pause]');

  panel.querySelectorAll<HTMLElement>('[data-ai-row]').forEach((el, i) => el.style.setProperty('--i', String(i)));
  panel.querySelectorAll<HTMLElement>('[data-ai-event]').forEach((el, i) => el.style.setProperty('--i', String(i)));
  panel.setAttribute('data-anim', '');

  const CYCLE = 9000;
  let timers: number[] = [];
  let typingTimer = 0;
  let fly: HTMLElement | null = null;
  let inView = false;
  let userPaused = false;

  const at = (ms: number, fn: () => void) => {
    timers.push(window.setTimeout(fn, ms));
  };

  const stopAll = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers = [];
    window.clearInterval(typingTimer);
    fly?.remove();
    fly = null;
  };

  const finalState = () => {
    stopAll();
    typed.textContent = full;
    typed.classList.remove('is-typing');
    panel.removeAttribute('data-fade');
    panel.removeAttribute('data-flying');
    panel.removeAttribute('data-pressed');
    panel.setAttribute('data-phase', '2');
  };

  const launch = () => {
    const p = panel.getBoundingClientRect();
    const from = program.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    fly?.remove();
    const clone = program.cloneNode(true) as HTMLElement;
    clone.removeAttribute('data-ai-program');
    clone.querySelectorAll('[data-ai-row]').forEach((n) => n.removeAttribute('data-ai-row'));
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('ai__fly');
    Object.assign(clone.style, {
      left: `${from.left - p.left}px`,
      top: `${from.top - p.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
    });
    panel.appendChild(clone);
    fly = clone;
    const scale = Math.min(0.6, to.width / from.width);
    const dx = to.left - from.left + (to.width - from.width * scale) / 2;
    const dy = to.top - from.top + 4;
    clone.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1 },
      ],
      { duration: 700, easing: 'cubic-bezier(.34, 1.4, .64, 1)', fill: 'forwards' },
    );
    panel.setAttribute('data-flying', '');
  };

  const cycle = () => {
    stopAll();
    panel.removeAttribute('data-fade');
    panel.removeAttribute('data-phase');
    panel.removeAttribute('data-flying');
    panel.removeAttribute('data-pressed');
    typed.textContent = '';
    typed.classList.add('is-typing');

    const t0 = performance.now();
    typingTimer = window.setInterval(() => {
      const n = Math.ceil(full.length * Math.min(1, (performance.now() - t0) / 1200));
      typed.textContent = full.slice(0, n);
    }, 30);

    at(1200, () => {
      window.clearInterval(typingTimer);
      typed.textContent = full;
      typed.classList.remove('is-typing');
      panel.setAttribute('data-phase', '1');
    });
    at(3200, () => panel.setAttribute('data-pressed', ''));
    at(3400, () => {
      panel.removeAttribute('data-pressed');
      launch();
    });
    at(4100, () => {
      panel.setAttribute('data-phase', '2');
      panel.removeAttribute('data-flying');
      if (fly) {
        const old = fly;
        old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => old.remove();
        fly = null;
      }
    });
    at(CYCLE - 450, () => panel.setAttribute('data-fade', ''));
    at(CYCLE, cycle);
  };

  const sync = () => {
    if (inView && !userPaused) cycle();
    else if (userPaused) finalState();
    else stopAll();
  };

  // Until the panel is first seen it shows the finished state (same as no-JS).
  finalState();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting;
        if (next === inView) return;
        inView = next;
        sync();
      },
      { threshold: 0.4 },
    ).observe(panel);
  }

  pauseBtn?.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', (userPaused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause) ?? '');
    sync();
  });

  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      userPaused = true;
      finalState();
    }
  });
}

export {};
