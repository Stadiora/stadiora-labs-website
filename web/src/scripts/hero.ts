// Hero word cycle: 2800ms steps, outgoing word blurs up, incoming rises, lane line animates to the new
// width, and the photo sets crossfade in sync. Photo sets 2 to 7 arrive in <template> elements and are
// materialised one step ahead so the next set is already loaded when it is shown.
const hero = document.querySelector<HTMLElement>('[data-hero]');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (hero && !reduced.matches) {
  const wordsBox = hero.querySelector<HTMLElement>('[data-hero-words]')!;
  const words = [...hero.querySelectorAll<HTMLElement>('.hero__word')];
  const slots = [...hero.querySelectorAll<HTMLElement>('[data-hero-slot]')];
  const pause = hero.querySelector<HTMLButtonElement>('[data-hero-pause]');
  const STEP = 2800;
  const count = words.length;

  let index = 0;
  let timer = 0;
  let userPaused = false;
  let hovering = false;
  let focused = false;
  let offscreen = false;

  const setLane = () => {
    wordsBox.style.setProperty('--lane-w', `${words[index].offsetWidth}px`);
  };

  const materialise = (i: number) => {
    for (const slot of slots) {
      const tpl = slot.querySelector<HTMLTemplateElement>(`template[data-set="${i}"]`);
      if (!tpl) continue;
      const frag = tpl.content.cloneNode(true) as DocumentFragment;
      frag.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager';
      });
      tpl.replaceWith(frag);
    }
  };

  const show = (next: number) => {
    const prev = index;
    index = next;
    const out = words[prev];
    out.removeAttribute('data-active');
    out.setAttribute('data-leaving', '');
    window.setTimeout(() => out.removeAttribute('data-leaving'), 460);
    words[next].setAttribute('data-active', '');
    setLane();

    for (const slot of slots) {
      slot.querySelector('[data-active]')?.removeAttribute('data-active');
      slot.querySelector(`.hero__ph[data-set="${next}"]`)?.setAttribute('data-active', '');
    }
    materialise((next + 1) % count);
  };

  const running = () => !userPaused && !hovering && !focused && !offscreen && !document.hidden;

  const schedule = () => {
    window.clearTimeout(timer);
    if (!running()) return;
    timer = window.setTimeout(() => {
      show((index + 1) % count);
      schedule();
    }, STEP);
  };

  materialise(1);
  setLane();
  requestAnimationFrame(() => wordsBox.classList.add('is-ready'));
  document.fonts?.ready.then(setLane);
  window.addEventListener('resize', setLane);

  const area = hero.querySelector<HTMLElement>('.hero__grid')!;
  area.addEventListener('pointerenter', (e) => {
    if ((e as PointerEvent).pointerType === 'mouse') {
      hovering = true;
      schedule();
    }
  });
  area.addEventListener('pointerleave', () => {
    hovering = false;
    schedule();
  });
  area.addEventListener('focusin', () => {
    focused = true;
    schedule();
  });
  area.addEventListener('focusout', (e) => {
    if (!area.contains((e as FocusEvent).relatedTarget as Node | null)) {
      focused = false;
      schedule();
    }
  });
  document.addEventListener('visibilitychange', schedule);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => {
        offscreen = !entry.isIntersecting;
        schedule();
      },
      { threshold: 0.2 },
    ).observe(hero);
  }

  pause?.addEventListener('click', () => {
    userPaused = !userPaused;
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', (userPaused ? pause.dataset.labelPlay : pause.dataset.labelPause) ?? '');
    schedule();
  });

  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      window.clearTimeout(timer);
      userPaused = true;
    }
  });

  schedule();
}

export {};
