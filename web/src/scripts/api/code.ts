// The code sample types itself: request → sending → response. One requestAnimationFrame loop, owned by the kit's
// autoplayer: it is cancelled (not just ignored) while the block is off screen, under keyboard focus, in a hidden tab or
// under reduced motion. Reduced motion, and a keyboard-activated tab, show both samples complete; a mouse click on a tab selects it and the typing carries on from there.
import { $, $$, autoplayer, isReduced, onMotionChange } from '../motion/kit';

type Tok = [string, string];
const C = 'tk-c';
const K = 'tk-k';
const S = 'tk-s';
const N = 'tk-n';
const T = 'tk-t';
const P = 'tk-p';
const q = (c: string, t: string): Tok => [c, t];

interface Strings {
  cReq: string;
  cRes: string;
  typing: string;
  sending: string;
  receiving: string;
  ready: string;
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const len = (L: Tok[][]) => L.reduce((a, l) => a + l.reduce((b, s) => b + s[1].length, 0) + 1, 0);
const lineOf = (L: Tok[][], k: number) => {
  let n = 0;
  for (let i = 0; i < L.length; i++) {
    n += L[i].reduce((b, s) => b + s[1].length, 0) + 1;
    if (k < n) return i;
  }
  return L.length;
};

function render(L: Tok[][], k: number, caret: boolean, hl?: Set<number>) {
  let left = k;
  let out = '';
  for (let i = 0; i < L.length; i++) {
    if (left <= 0 && i > 0) break;
    let line = '';
    for (const [c, t] of L[i]) {
      if (left <= 0) break;
      const part = t.slice(0, left);
      left -= part.length;
      line += `<span class="${c}">${esc(part)}</span>`;
    }
    const done = left > 0;
    left -= 1;
    const last = !done || i === L.length - 1 || left <= 0;
    out += `<span class="ln${hl && hl.has(i) && done ? ' hl' : ''}">${line}${caret && last ? '<i class="caret"></i>' : ''}</span>`;
    if (!done) break;
  }
  return out;
}

export function initCode() {
  const box = $('[data-code]');
  if (!box) return;
  const raw = $('[data-code-strings]', box)?.textContent;
  if (!raw) return;
  const str: Strings = JSON.parse(raw);

  const REQ: Tok[][] = [
    [q(C, str.cReq)],
    [q(P, '{')],
    [q(P, '  '), q(K, '"athlete_id"'), q(P, ': '), q(S, '"ATH_8821"'), q(P, ',')],
    [q(P, '  '), q(K, '"sport"'), q(P, ': '), q(S, '"track_field"'), q(P, ',')],
    [q(P, '  '), q(K, '"signals"'), q(P, ': {')],
    [q(P, '    '), q(K, '"training_load_7d"'), q(P, ': '), q(N, '84'), q(P, ',')],
    [q(P, '    '), q(K, '"recovery_score"'), q(P, ': '), q(N, '58'), q(P, ',')],
    [q(P, '    '), q(K, '"sleep_hours"'), q(P, ': '), q(N, '6.4'), q(P, ',')],
    [q(P, '    '), q(K, '"wellness_score"'), q(P, ': '), q(N, '6'), q(P, ',')],
    [q(P, '    '), q(K, '"hrv_delta"'), q(P, ': '), q(N, '-6.2'), q(P, ',')],
    [q(P, '    '), q(K, '"session_rpe_last"'), q(P, ': '), q(N, '8.5'), q(P, ',')],
    [q(P, '    '), q(K, '"days_since_rest"'), q(P, ': '), q(N, '5')],
    [q(P, '  }')],
    [q(P, '}')],
  ];
  const RES: Tok[][] = [
    [q(C, str.cRes)],
    [q(P, '{')],
    [q(P, '  '), q(K, '"athlete_id"'), q(P, ': '), q(S, '"ATH_8821"'), q(P, ',')],
    [q(P, '  '), q(K, '"availability"'), q(P, ': '), q(T, '"MODIFIED"'), q(P, ',')],
    [q(P, '  '), q(K, '"readiness_index"'), q(P, ': '), q(N, '54'), q(P, ',')],
    [q(P, '  '), q(K, '"classification"'), q(P, ': '), q(S, '"Reduced Load Session"'), q(P, ',')],
    [q(P, '  '), q(K, '"recommendation"'), q(P, ': '), q(S, '"Technical work only. Cap volume at 60%. No max-intensity efforts today."'), q(P, ',')],
    [q(P, '  '), q(K, '"flags"'), q(P, ': [')],
    [q(P, '    '), q(S, '"elevated_cumulative_load"'), q(P, ',')],
    [q(P, '    '), q(S, '"hrv_below_7d_baseline"'), q(P, ',')],
    [q(P, '    '), q(S, '"sleep_deficit_detected"')],
    [q(P, '  ],')],
    [q(P, '  '), q(K, '"coach_attention"'), q(P, ': '), q(T, 'true'), q(P, ',')],
    [q(P, '  '), q(K, '"confidence"'), q(P, ': '), q(N, '0.91'), q(P, ',')],
    [q(P, '  '), q(K, '"primary_signal"'), q(P, ': '), q(S, '"hrv_delta"')],
    [q(P, '}')],
  ];
  // Which bullet each response line lights up (1: any mix of signals, 2: classification and advice, 3: which signals drove it).
  const LIT_RES: Record<number, number> = { 5: 2, 6: 2, 7: 3, 13: 2, 14: 3 };
  const HL_RES = new Set([3, 5, 6, 13]);

  const panes = { req: $('[data-pane="req"] code', box)!, res: $('[data-pane="res"] code', box)! };
  const tabs = $$<HTMLButtonElement>('[data-ct]', box);
  const list = $$('[data-how-list] li');
  const state = $('[data-code-state]', box)!;
  const show = (which: string) => {
    tabs.forEach((t) => {
      const on = t.dataset.ct === which;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    $$('[data-pane]', box).forEach((p) => (p.hidden = p.dataset.pane !== which));
  };
  const lit = (set: Set<number>) => list.forEach((li) => li.classList.toggle('lit', set.has(Number(li.dataset.k))));
  const full = () => {
    panes.req.innerHTML = render(REQ, 1e9, false);
    panes.res.innerHTML = render(RES, 1e9, false, HL_RES);
  };

  let manual = isReduced();
  let el = 0;
  let prevPhase = '';
  let raf = 0;
  let last = 0;

  const settle = () => {
    full();
    show('req');
    lit(new Set([1, 2, 3, 4]));
    box.classList.remove('is-sending');
    state.textContent = '';
  };
  full();
  show('req');

  tabs.forEach((t, i) => {
    t.addEventListener('click', (e) => {
      // A mouse click selects the tab and the typing carries on from the start of its phase; a keyboard activation takes over for good.
      if (!manual && e.detail > 0) {
        el = t.dataset.ct === 'res' ? 0.6 + tReq + 0.5 + tSend : 0.6;
        prevPhase = '';
        box.classList.remove('is-sending');
        step(0);
        return;
      }
      manual = true;
      stop();
      full();
      show(t.dataset.ct!);
      box.classList.remove('is-sending');
      state.textContent = '';
      lit(new Set(t.dataset.ct === 'res' ? [2, 3, 4] : [1]));
    });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const n = tabs[(i + 1) % 2];
        n.click();
        n.focus();
      }
    });
  });

  const LR = len(REQ);
  const LS = len(RES);
  const vReq = 95;
  const vRes = 150;
  const tReq = LR / vReq;
  const tSend = 1.3;
  const tRes = LS / vRes;
  const tHold = 4.6;
  const TOT = 0.6 + tReq + 0.5 + tSend + tRes + tHold;

  function step(dt: number) {
    el = (el + dt) % TOT;
    let s = el;
    let phase: string;
    if (s < 0.6) phase = 'idle';
    else if ((s -= 0.6) < tReq + 0.5) phase = 'req';
    else if ((s -= tReq + 0.5) < tSend) phase = 'send';
    else if ((s -= tSend) < tRes) phase = 'res';
    else phase = 'hold';
    if (phase === 'idle' || phase === 'req') {
      const k = phase === 'idle' ? 0 : Math.floor(Math.min(s, tReq) * vReq);
      show('req');
      panes.req.innerHTML = render(REQ, k, true);
      panes.res.innerHTML = '';
      box!.classList.remove('is-sending');
      state.textContent = str.typing;
      lit(new Set(lineOf(REQ, k) >= 5 ? [1] : []));
    } else if (phase === 'send') {
      if (prevPhase !== 'send') {
        panes.req.innerHTML = render(REQ, 1e9, false);
        box!.classList.add('is-sending');
        state.textContent = str.sending;
      }
    } else {
      const k = phase === 'hold' ? 1e9 : Math.floor(s * vRes);
      if (prevPhase === 'send') box!.classList.remove('is-sending');
      show('res');
      panes.res.innerHTML = render(RES, k, true, HL_RES);
      const ln = lineOf(RES, k);
      const on = new Set([1]);
      for (const [l, b] of Object.entries(LIT_RES)) if (ln > Number(l)) on.add(b);
      if (phase === 'hold') on.add(4);
      lit(on);
      state.textContent = phase === 'hold' ? str.ready : str.receiving;
    }
    prevPhase = phase;
  }

  function frame(t: number) {
    const dt = last ? Math.min(t - last, 100) / 1000 : 0;
    last = t;
    step(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || manual) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const ap = autoplayer(box, { threshold: 0.3, play: start, pause: stop });

  $('[data-replay]', box)?.addEventListener('click', () => {
    if (isReduced()) return;
    manual = false;
    el = 0;
    prevPhase = '';
    if (ap.running) start();
  });

  onMotionChange((reduced) => {
    stop();
    if (reduced) {
      manual = true;
      settle();
    } else {
      manual = false;
      el = 0;
      prevPhase = '';
      if (ap.running) start();
    }
  });
  if (manual) settle();
}
