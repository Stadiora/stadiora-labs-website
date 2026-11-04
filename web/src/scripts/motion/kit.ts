// Floodlight motion kit (DESIGN-4 section 5). Small, dependency-free primitives the home sections build on.
// Rules every primitive follows:
//  - Reduced motion is checked live; nothing autoplays or loops under it and every effect has a still state.
//  - An autoplayer runs only while its host is on screen, the tab is visible, and the pointer and focus are
//    elsewhere. The state is mirrored to data-ap / data-ap-why (and the hover/focus element is marked
//    data-ap-scope) so the guards can assert it.
//  - Only transform, opacity and clip-path animate (plus short filter swaps).

const RMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;

export const isReduced = () => RMQ.matches;
export const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => scope.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) => [...scope.querySelectorAll<T>(sel)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const narrow = window.matchMedia('(max-width: 640px)');

function syncReduced() {
  root.classList.toggle('rm', RMQ.matches);
}
syncReduced();

// Scenes that keep state of their own (timelines, timers, swapped words) register here to jump to their still frame
// when the preference flips to reduced, and to pick motion up again when it flips back. They run after every
// autoplayer has refreshed (the `kit:motion-change` event), so a handler sees the final running/paused state.
const motionHandlers: ((reduced: boolean) => void)[] = [];
export function onMotionChange(fn: (reduced: boolean) => void) {
  motionHandlers.push(fn);
}
RMQ.addEventListener('change', () => {
  syncReduced();
  document.dispatchEvent(new CustomEvent('kit:motion-change'));
  for (const fn of motionHandlers) fn(RMQ.matches);
});

// CSS autoplayers (marquee, mesh, orbits, glows) have no script clock to pause, so a hidden tab stops them through
// html.tab-hidden (floodlight.css). It reads document.hidden, the same source the autoplayers use.
function syncHidden() {
  root.classList.toggle('tab-hidden', document.hidden);
}
syncHidden();
document.addEventListener('visibilitychange', syncHidden);

/* ---------- autoplayer: one rule for everything that moves on its own ---------- */
export interface AutoplayerOptions {
  play: (ap: Autoplayer) => void;
  pause: (ap: Autoplayer) => void;
  /** Share of the host that must be visible before it runs. */
  threshold?: number;
  /** Element whose hover and focus pause the host (defaults to the host). */
  within?: HTMLElement;
  /**
   * Stops a scene that animates through transitions and WAAPI as well as timers. While the host is paused the elements
   * matching `hold` keep their in-flight transitions and one-shot animations where they are and carry on from there;
   * those matching `settle` jump to their end state (text that has to stay readable under the pointer). CSS loops
   * (animation-iteration-count: infinite) are not touched: they stop through their own [data-ap="off"] rules.
   */
  freeze?: { hold?: string; settle?: string; scope?: HTMLElement };
}
export interface Autoplayer {
  readonly running: boolean;
  refresh: () => void;
  /** setTimeout on the host's clock: pausing keeps the time left, resuming carries on. `flush` runs it at once on pause instead. */
  later: (fn: () => void, ms: number, flush?: boolean) => void;
}
interface Pending {
  fn: () => void;
  left: number;
  at: number;
  id: number;
  flush: boolean;
}

export function autoplayer(host: HTMLElement, opts: AutoplayerOptions): Autoplayer {
  const within = opts.within ?? host;
  // Marks the element whose hover and focus pause this host, so the guards can find it.
  within.setAttribute('data-ap-scope', '');
  const seen = { visible: false, hover: false, focus: false };
  let running = false;
  let first = true;
  const pending = new Set<Pending>();
  const held = new Set<Animation>();

  const arm = (t: Pending) => {
    t.at = performance.now();
    t.id = window.setTimeout(() => {
      pending.delete(t);
      t.id = 0;
      t.fn();
    }, t.left);
  };
  // Pausing keeps the timers' remaining time and stops the matching in-flight animations where they are.
  const hold = () => {
    const now = performance.now();
    for (const t of pending) {
      if (!t.id) continue;
      window.clearTimeout(t.id);
      t.id = 0;
      t.left = Math.max(0, t.left - (now - t.at));
    }
    for (let more = true; more; ) {
      more = false;
      for (const t of [...pending]) {
        if (!t.flush) continue;
        pending.delete(t);
        t.fn();
        more = true;
      }
    }
    const f = opts.freeze;
    if (!f) return;
    for (const a of (f.scope ?? host).getAnimations({ subtree: true })) {
      const el = (a.effect as KeyframeEffect | null)?.target;
      if (!(el instanceof Element) || a.playState !== 'running' || a.effect?.getComputedTiming().iterations === Infinity) continue;
      if (f.settle && el.matches(f.settle)) a.finish();
      else if (f.hold && el.matches(f.hold)) {
        a.pause();
        held.add(a);
      }
    }
  };
  const release = () => {
    for (const a of held) if (a.playState === 'paused') a.play();
    held.clear();
    for (const t of pending) if (!t.id) arm(t);
  };

  const refresh = () => {
    const why = RMQ.matches ? 'reduced' : document.hidden ? 'hidden' : !seen.visible ? 'offscreen' : seen.hover ? 'hover' : seen.focus ? 'focus' : '';
    const want = why === '';
    host.dataset.ap = want ? 'on' : 'off';
    if (why) host.dataset.apWhy = why;
    else delete host.dataset.apWhy;
    if (want !== running || (first && !want)) {
      running = want;
      if (want) {
        release();
        opts.play(self);
      } else {
        opts.pause(self);
        hold();
      }
    }
    first = false;
  };
  const self: Autoplayer = {
    get running() {
      return running;
    },
    refresh,
    later(fn, ms, flush = false) {
      const t: Pending = { fn, left: ms, at: 0, id: 0, flush };
      pending.add(t);
      if (running) arm(t);
    },
  };

  new IntersectionObserver(
    (entries) => {
      seen.visible = entries[entries.length - 1].isIntersecting;
      refresh();
    },
    { threshold: opts.threshold ?? 0.25 },
  ).observe(host);
  within.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    seen.hover = true;
    refresh();
  });
  within.addEventListener('pointerleave', () => {
    seen.hover = false;
    refresh();
  });
  within.addEventListener('focusin', () => {
    seen.focus = true;
    refresh();
  });
  within.addEventListener('focusout', (e) => {
    if (e.relatedTarget instanceof Node && within.contains(e.relatedTarget)) return;
    seen.focus = false;
    refresh();
  });
  document.addEventListener('visibilitychange', refresh);
  document.addEventListener('kit:motion-change', refresh);
  refresh();
  return self;
}

/* ---------- video clips: WebM + MP4 + poster, preload="none", start on visibility ---------- */
// Sources taken out of a clip that was sent back to its poster; playVideo puts them back when the clip should run again.
const parked = new WeakMap<HTMLVideoElement, Element[]>();

export function playVideo(v: HTMLVideoElement) {
  if (RMQ.matches) return;
  const sources = parked.get(v);
  if (sources) {
    parked.delete(v);
    v.append(...sources);
  }
  const p = v.play();
  if (p) p.catch(() => {});
}

/**
 * Back to the poster: nothing decoded, currentTime 0, no playback. Chromium refetches a clip on `load()` even with
 * preload="none", so a clip that had data is reset with its sources taken out (readyState 0 stays) and gets them back in playVideo.
 */
function settleVideo(v: HTMLVideoElement) {
  v.pause();
  if (v.dataset.poster) {
    v.poster = v.dataset.poster;
    delete v.dataset.poster;
  }
  if (v.readyState > 0 || v.currentTime > 0) {
    const sources = $$<HTMLElement>('source', v);
    if (sources.length) {
      parked.set(v, sources);
      sources.forEach((x) => x.remove());
    }
    v.load();
  }
}

function initVideos() {
  onMotionChange((reduced) => {
    if (reduced) $$<HTMLVideoElement>('video[data-clip]').forEach(settleVideo);
  });
  for (const v of $$<HTMLVideoElement>('video[data-clip]')) {
    v.muted = true;
    v.setAttribute('muted', '');
    // A clip inside a tab panel only plays while its panel is the active one.
    const panel = v.closest<HTMLElement>('[data-panel]');
    const active = () => !panel || panel.classList.contains('on') || panel.hasAttribute('data-active');
    // Hover and focus pause the clip through the surface the user can actually reach: an explicit
    // `data-ap-within` selector (decorative clips that cannot be hovered themselves), else the tab group or frame around it.
    const within =
      (v.dataset.apWithin ? document.querySelector<HTMLElement>(v.dataset.apWithin) : null) ??
      v.closest<HTMLElement>('[data-autotabs]') ??
      v.closest<HTMLElement>('.media-frame') ??
      v;
    autoplayer(v, {
      within,
      threshold: 0.2,
      play: () => {
        if (active()) playVideo(v);
      },
      pause: () => v.pause(),
    });
  }
}

/* ---------- deferred posters and images near the viewport ---------- */
function initDeferred() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement & { poster?: string; src?: string };
        if (el.dataset.poster) {
          (el as HTMLVideoElement).poster = el.dataset.poster;
          delete el.dataset.poster;
        }
        if (el.dataset.src) {
          el.src = el.dataset.src;
          delete el.dataset.src;
        }
        io.unobserve(el);
      }
    },
    { rootMargin: '900px 0px' },
  );
  $$('[data-poster],[data-src]').forEach((el) => io.observe(el));
}

/* ---------- reveals, counters, section on/off ---------- */
function initReveal() {
  const targets = $$('.rv,.rv-mask,.lines');
  if (RMQ.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -6% 0px' },
    );
    targets.forEach((el) => io.observe(el));
  }

  const counters = $$('.count');
  if (!RMQ.matches) {
    const cio = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('go');
          cio.unobserve(e.target);
        }
      },
      { threshold: 0.4 },
    );
    counters.forEach((el) => cio.observe(el));
  }
}

/** Replays the CSS counters inside a scope (used when a panel changes). */
export function recount(scope: ParentNode) {
  if (RMQ.matches) return;
  for (const c of $$('.count', scope)) {
    c.classList.remove('go');
    void c.offsetWidth;
    c.classList.add('go');
  }
}

function initSections() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) e.target.classList.toggle('is-off', !e.isIntersecting);
    },
    { rootMargin: '120px 0px' },
  );
  $$('[data-section]').forEach((s) => io.observe(s));
}

/* ---------- auto-advancing tabs with progress bars ---------- */
export interface AutoTabs {
  select: (n: number, user?: boolean) => void;
  readonly index: number;
}

export function autotabs(rootEl: HTMLElement): AutoTabs {
  const tabs = $$<HTMLElement>('[role="tab"]', rootEl);
  const panels = $$<HTMLElement>('[data-panel]', rootEl);
  const dur = Number(rootEl.dataset.at) || 6000;
  const bars = tabs.map((t) => $<HTMLElement>('.at-bar i', t));
  let i = 0;
  let elapsed = 0;
  let last = 0;
  let raf = 0;
  rootEl.style.setProperty('--at', `${dur}ms`);

  const select = (n: number, user = false) => {
    i = (n + tabs.length) % tabs.length;
    elapsed = 0;
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', k === i ? 'true' : 'false');
      t.tabIndex = k === i ? 0 : -1;
      t.classList.toggle('is-active', k === i);
      const bar = bars[k];
      if (bar) bar.style.transform = 'scaleX(0)';
    });
    panels.forEach((p, k) => {
      p.classList.toggle('on', k === i);
      p.toggleAttribute('data-active', k === i);
      for (const v of $$<HTMLVideoElement>('video[data-clip]', p)) {
        if (k === i && ap.running) {
          v.currentTime = 0;
          playVideo(v);
        } else v.pause();
      }
    });
    rootEl.dispatchEvent(new CustomEvent('at:change', { detail: { i, user } }));
  };

  const loop = (t: number) => {
    const dt = last ? Math.min(t - last, 100) : 0;
    last = t;
    elapsed += dt;
    if (elapsed >= dur) select(i + 1);
    const bar = bars[i];
    if (bar) bar.style.transform = `scaleX(${clamp(elapsed / dur, 0, 1)})`;
    raf = requestAnimationFrame(loop);
  };

  const ap = autoplayer(rootEl, {
    threshold: 0.35,
    play: () => {
      last = 0;
      raf = requestAnimationFrame(loop);
      for (const v of $$<HTMLVideoElement>('video[data-clip]', panels[i] ?? rootEl)) playVideo(v);
    },
    pause: () => {
      cancelAnimationFrame(raf);
      for (const v of $$<HTMLVideoElement>('video[data-clip]', rootEl)) v.pause();
    },
  });

  tabs.forEach((t, k) => {
    t.addEventListener('click', () => select(k, true));
    t.addEventListener('keydown', (e) => {
      const step = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
      if (step) {
        e.preventDefault();
        select(i + step, true);
        tabs[i].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        select(0, true);
        tabs[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        select(tabs.length - 1, true);
        tabs[i].focus();
      }
    });
  });
  select(0);
  // With reduced motion the tabs are still fully usable by hand; the bars just stay full.
  return {
    select,
    get index() {
      return i;
    },
  };
}

/* ---------- timelines (WAAPI): frames [[sec, {props}, easing?], ...] carry state forward ---------- */
export type Frame = [number, Record<string, string | number>, string?];
export function tl(el: Element | null, dur: number, frames: Frame[], opt: { once?: boolean } = {}): Animation | null {
  if (!el) return null;
  const keys = new Set<string>();
  frames.forEach((f) => Object.keys(f[1]).forEach((k) => keys.add(k)));
  const first: Record<string, string | number> = {};
  keys.forEach((k) => {
    first[k] = frames.find((f) => k in f[1])![1][k];
  });
  let state = { ...first };
  const kf: Keyframe[] = [];
  frames.forEach(([t, props, easing]) => {
    state = { ...state, ...props };
    kf.push({ ...state, offset: clamp(t / dur, 0, 1), easing: easing || 'cubic-bezier(.2,.7,.2,1)' });
  });
  if ((kf[0].offset as number) > 0) kf.unshift({ ...kf[0], offset: 0, easing: 'linear' });
  if ((kf[kf.length - 1].offset as number) < 1) kf.push({ ...kf[kf.length - 1], offset: 1 });
  const a = el.animate(kf, { duration: dur * 1000, iterations: opt.once ? 1 : Infinity, fill: 'both' });
  a.pause();
  return a;
}

/** A set of timelines on one clock. Plays only while the host is in view and not hovered or focused. */
export interface Group {
  anims: Animation[];
  time: () => number;
  seek: (sec: number) => void;
  ap: Autoplayer | null;
}
export function group(host: HTMLElement, dur: number, build: () => (Animation | null)[], opt: { threshold?: number; within?: HTMLElement } = {}): Group {
  const g: Group = { anims: [], time: () => 0, seek: () => {}, ap: null };
  const mount = () => {
    g.anims = RMQ.matches ? [] : build().filter((a): a is Animation => !!a);
  };
  mount();
  g.seek = (sec) => g.anims.forEach((a) => (a.currentTime = sec * 1000));
  g.time = () => (g.anims[0] ? ((Number(g.anims[0].currentTime) || 0) / 1000) % dur : 0);
  g.ap = autoplayer(host, {
    threshold: opt.threshold ?? 0.3,
    within: opt.within,
    play: () => g.anims.forEach((a) => a.play()),
    pause: () => g.anims.forEach((a) => a.pause()),
  });
  // The base CSS is the finished frame, so cancelling the timelines settles the scene; moving back builds a fresh set.
  onMotionChange(() => {
    g.anims.forEach((a) => a.cancel());
    mount();
    if (g.ap?.running) g.anims.forEach((a) => a.play());
  });
  return g;
}

/* ---------- text scramble ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
export function scramble(el: HTMLElement, ms = 650) {
  if (RMQ.matches || el.dataset.scrambling) return;
  el.dataset.scrambling = '1';
  const orig = el.dataset.orig || (el.dataset.orig = el.textContent || '');
  if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', orig);
  const t0 = performance.now();
  const step = (t: number) => {
    if (!el.dataset.scrambling) return; // cancelled by its owner
    const p = RMQ.matches ? 1 : clamp((t - t0) / ms, 0, 1);
    el.textContent = [...orig].map((c, k) => (c === ' ' || k < p * orig.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join('');
    if (p < 1) requestAnimationFrame(step);
    else {
      el.textContent = orig;
      delete el.dataset.scrambling;
    }
  };
  requestAnimationFrame(step);
}

function initScramble() {
  for (const el of $$('[data-scramble]')) el.addEventListener('pointerenter', () => scramble(el, 800));
  for (const el of $$('[data-scramble-self]')) {
    const host = el.closest<HTMLElement>('a,button') ?? el;
    for (const ev of ['pointerenter', 'focus']) host.addEventListener(ev, () => scramble(el, 520));
  }
}

/* ---------- parallax float, tilt, magnet ---------- */
function initPointerFx() {
  const depth = $$('[data-depth]');
  let mx = 0;
  let pending = false;
  const run = () => {
    pending = false;
    if (RMQ.matches) return;
    const vh = innerHeight;
    for (const el of depth) {
      const host = el.closest('[data-section]') ?? el.parentElement;
      if (host?.classList.contains('is-off')) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const d = Number(el.dataset.depth);
      el.style.setProperty('--py', `${(-((r.top + r.height / 2 - vh / 2) / vh) * d * 1.6).toFixed(1)}px`);
      el.style.setProperty('--px', `${(mx * d * 0.5).toFixed(1)}px`);
    }
  };
  const queue = () => {
    if (pending || RMQ.matches) return;
    pending = true;
    requestAnimationFrame(run);
  };
  if (depth.length) {
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        mx = e.clientX / innerWidth - 0.5;
        queue();
      },
      { passive: true },
    );
    queue();
  }
  for (const c of $$('[data-tilt] > *')) {
    c.addEventListener('pointermove', (e) => {
      if (RMQ.matches) return;
      const r = c.getBoundingClientRect();
      const pe = e as PointerEvent;
      c.style.setProperty('--ry', `${((pe.clientX - r.left) / r.width - 0.5) * 8}deg`);
      c.style.setProperty('--rx', `${-((pe.clientY - r.top) / r.height - 0.5) * 8}deg`);
    });
    c.addEventListener('pointerleave', () => {
      c.style.setProperty('--ry', '0deg');
      c.style.setProperty('--rx', '0deg');
    });
  }
  for (const b of $$('[data-magnet]')) {
    b.addEventListener('pointermove', (e) => {
      if (RMQ.matches) return;
      const r = b.getBoundingClientRect();
      const pe = e as PointerEvent;
      b.style.setProperty('--mx', `${((pe.clientX - r.left) / r.width - 0.5) * 14}px`);
      b.style.setProperty('--my', `${((pe.clientY - r.top) / r.height - 0.5) * 10}px`);
    });
    b.addEventListener('pointerleave', () => {
      b.style.setProperty('--mx', '0px');
      b.style.setProperty('--my', '0px');
    });
  }
  // Under reduced motion nothing floats, tilts or pulls: drop whatever offsets the pointer left behind.
  onMotionChange((reduced) => {
    if (!reduced) return;
    for (const el of depth) {
      el.style.removeProperty('--px');
      el.style.removeProperty('--py');
    }
    for (const c of $$('[data-tilt] > *')) {
      c.style.removeProperty('--rx');
      c.style.removeProperty('--ry');
    }
    for (const b of $$('[data-magnet]')) {
      b.style.removeProperty('--mx');
      b.style.removeProperty('--my');
    }
  });
}

/* ---------- fit fixed-size stages to their frame ---------- */
function initFit() {
  const fit = (host: HTMLElement) => {
    const stage = host.firstElementChild as HTMLElement | null;
    const fitH = Number(host.dataset.fitH);
    // Narrow screens scale a stage to the frame height and pan across it; with reduced motion nothing pans, so the
    // whole stage is fitted to the width instead and centred in the frame.
    const panned = Boolean(fitH) && narrow.matches && !RMQ.matches;
    const k = panned ? host.clientHeight / fitH : host.clientWidth / Number(host.dataset.fit);
    stage?.style.setProperty('--k', k.toFixed(4));
    if (stage && fitH && narrow.matches && RMQ.matches) stage.style.translate = `0px ${Math.max(0, (host.clientHeight - fitH * k) / 2).toFixed(1)}px`;
    else stage?.style.removeProperty('translate');
  };
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) fit(e.target as HTMLElement);
  });
  const hosts = $$<HTMLElement>('[data-fit]');
  hosts.forEach((h) => ro.observe(h));
  // The fit depends on the preference as well as the size, and a preference change does not resize anything.
  onMotionChange(() => hosts.forEach(fit));
}

/** Phone "camera pan": scale the stage to the frame height and follow the action. */
export function pan(host: HTMLElement, dur: number, keys: [number, number][]): Animation | null {
  if (RMQ.matches || !narrow.matches) return null;
  const fit = $<HTMLElement>('[data-fit]', host);
  const stage = fit?.firstElementChild;
  if (!fit || !stage) return null;
  const k = fit.clientHeight / Number(fit.dataset.fitH);
  const W = fit.clientWidth;
  return tl(
    stage,
    dur,
    keys.map(([t, c]) => [t, { translate: `${(W / 2 - c * k).toFixed(1)}px 0px` }, 'cubic-bezier(.65,0,.35,1)'] as Frame),
  );
}

/** Count a number up in JS (for values a CSS counter cannot reach). */
export function countTo(el: HTMLElement | null, to: number, ms = 1200, from = 0) {
  if (!el) return;
  if (RMQ.matches) {
    el.textContent = String(to);
    return;
  }
  const t0 = performance.now();
  const step = (t: number) => {
    const p = clamp((t - t0) / ms, 0, 1);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Whether an element is on screen right now. */
export const inView = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < innerHeight;
};

let started = false;
/** Idempotent: the home entry calls this once, after the section modules have registered. */
export function startKit() {
  if (started) return;
  started = true;
  initReveal();
  initSections();
  initDeferred();
  initVideos();
  initScramble();
  initPointerFx();
  initFit();
}
