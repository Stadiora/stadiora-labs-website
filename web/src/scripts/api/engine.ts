// Hero engine: signals flow into the orb and come out as one decision (10 s loop on the shared kit's group).
// Desktop is a fixed 640px stage scaled by the kit (--k). Phones get a stack (three signals in a row, the orb, the card)
// whose geometry comes from the layout, so the lines and pulses are re-read from the DOM whenever the size changes.
import { $, $$, group, narrow, tl } from '../motion/kit';

const NS = 'http://www.w3.org/2000/svg';
const SP = 'cubic-bezier(.34,1.56,.64,1)';
const IO = 'cubic-bezier(.7,0,.2,1)';
const OUT = 'cubic-bezier(.2,.7,.2,1)';

export function initEngine() {
  const host = $('.eng-host');
  const eng = $('[data-engine]');
  const svg = $<SVGSVGElement>('[data-lines]', eng ?? document);
  const orb = $('[data-orb]');
  if (!host || !eng || !svg || !orb) return;

  svg.innerHTML =
    '<defs><linearGradient id="engGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="640" y2="400"><stop offset="0" stop-color="#00BEF3"/><stop offset=".55" stop-color="#34D399"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>';
  const grad = $('#engGrad', svg);
  const sigs = $$('[data-sig]', eng);
  const ghosts: SVGPathElement[] = [];
  const lines: SVGPathElement[] = [];
  const pulses: HTMLElement[] = [];
  const glows: HTMLElement[] = [];
  for (const s of sigs) {
    const g = document.createElementNS(NS, 'path');
    g.setAttribute('class', 'ghost');
    svg.appendChild(g);
    ghosts.push(g);
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('pathLength', '1');
    svg.appendChild(p);
    lines.push(p);
    const dot = document.createElement('i');
    dot.className = 'pulse';
    eng.insertBefore(dot, orb);
    pulses.push(dot);
    const gl = document.createElement('i');
    gl.className = 'sig-in';
    s.appendChild(gl);
    glows.push(gl);
  }

  const status = $('[data-st-a]', eng);
  const tpl = status?.dataset.tpl ?? '';
  const num = (el: HTMLElement) => parseFloat(el.style.getPropertyValue('--x'));
  const numY = (el: HTMLElement) => parseFloat(el.style.getPropertyValue('--y'));

  // Where each signal's line starts and ends, in the stage's own pixels.
  function layout() {
    const phone = narrow.matches;
    let shown = 0;
    let W = 640;
    let H = 640;
    if (phone) {
      W = eng!.clientWidth;
      H = eng!.clientHeight;
    }
    svg!.setAttribute('viewBox', `0 0 ${W} ${H}`);
    grad?.setAttribute('x2', String(W));
    grad?.setAttribute('y2', String(phone ? H * 0.6 : 400));
    const ox = phone ? orb!.offsetLeft + orb!.offsetWidth / 2 : 320;
    const oy = phone ? orb!.offsetTop + orb!.offsetHeight / 2 : 250;
    sigs.forEach((s, i) => {
      const live = !phone || s.offsetWidth > 0;
      let d = '';
      if (live) {
        shown++;
        if (phone) {
          const x = s.offsetLeft + s.offsetWidth / 2;
          const y = s.offsetTop + s.offsetHeight;
          const m = (y + oy) / 2;
          d = `M${x},${y} C${x},${m} ${ox},${m} ${ox},${oy}`;
        } else {
          const x = num(s);
          const y = numY(s);
          d = `M${x},${y} Q${(x + ox) / 2},${y} ${ox},${oy}`;
        }
      }
      ghosts[i].setAttribute('d', d);
      lines[i].setAttribute('d', d);
      pulses[i].style.offsetPath = d ? `path('${d}')` : 'none';
      pulses[i].style.display = live ? '' : 'none';
      lines[i].style.display = ghosts[i].style.display = live ? '' : 'none';
    });
    if (status && tpl) status.textContent = tpl.replace('{n}', String(shown));
  }
  layout();
  narrow.addEventListener('change', layout);
  new ResizeObserver(layout).observe(eng);
  document.fonts?.ready.then(layout);

  const T = (n: number) => 0.5 + n * 0.34;
  group(host, 10, () => {
    const A: (Animation | null)[] = [];
    sigs.forEach((s, i) => {
      const t = T(i);
      A.push(tl(s, 10, [[0, { opacity: 0.85, scale: 1 }], [t, {}], [t + 0.18, { opacity: 1, scale: 1.08 }], [t + 0.6, { scale: 1 }], [9, { opacity: 1 }], [9.7, { opacity: 0.85 }]]));
      A.push(tl(glows[i], 10, [[0, { opacity: 0 }], [t, {}], [t + 0.18, { opacity: 1 }], [t + 0.9, { opacity: 0 }]]));
      A.push(tl(lines[i], 10, [[0, { strokeDashoffset: 1 }], [t + 0.1, {}, 'cubic-bezier(.4,0,.2,1)'], [t + 0.8, { strokeDashoffset: 0 }], [9, {}, IO], [9.7, { strokeDashoffset: 1 }]]));
      A.push(tl(pulses[i], 10, [[0, { offsetDistance: '0%', opacity: 0 }], [t + 0.1, {}], [t + 0.16, { opacity: 1 }, 'cubic-bezier(.5,0,.6,1)'], [t + 0.85, { offsetDistance: '100%' }], [t + 0.92, { opacity: 0 }]]));
    });
    A.push(tl(orb, 10, [[0, { scale: 1 }], [3.35, {}, OUT], [3.65, { scale: 1.32 }, SP], [4.5, { scale: 1 }]]));
    A.push(tl($('[data-shock]', eng), 10, [[0, { opacity: 0, scale: 0.7 }], [3.5, {}], [3.6, { opacity: 1, scale: 0.9 }, OUT], [4.6, { opacity: 0, scale: 2.6 }]]));
    A.push(tl(status, 10, [[0, { opacity: 0 }], [0.3, { opacity: 1 }], [3.4, {}], [3.7, { opacity: 0 }]]));
    A.push(tl($('[data-st-b]', eng), 10, [[0, { opacity: 0 }], [3.9, {}], [4.2, { opacity: 1 }], [9, {}], [9.4, { opacity: 0 }]]));
    A.push(tl($('[data-card]', eng), 10, [[0, { opacity: 0, translate: '0 36px', scale: 0.94 }], [3.9, {}, SP], [4.6, { opacity: 1, translate: '0 0', scale: 1 }], [9, {}, IO], [9.6, { opacity: 0, translate: '0 16px', scale: 0.98 }]]));
    A.push(tl($('[data-ring]', eng), 10, [[0, { '--p': 0 }], [4.3, {}, OUT], [5.6, { '--p': 54 }]]));
    A.push(tl($('[data-n]', eng), 10, [[0, { '--n': 0 }], [4.3, {}, OUT], [5.6, { '--n': 54 }]]));
    $$('[data-flag]', eng).forEach((f, j) => {
      const t = 5 + j * 0.2;
      A.push(tl(f, 10, [[0, { opacity: 0, translate: '0 8px', scale: 0.9 }], [t, {}, SP], [t + 0.45, { opacity: 1, translate: '0 0', scale: 1 }]]));
    });
    A.push(tl($('[data-coach]', eng), 10, [[0, { opacity: 0, translate: '0 6px' }], [6, {}, OUT], [6.45, { opacity: 1, translate: '0 0' }]]));
    return A;
  });
}
