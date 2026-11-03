// Brand strip "SPORT" moment: retro images swap inside the letter O with a thermal glitch
// and a pixel spray; the letters scramble on hover. Static first image under reduced motion.
import { $, $$, autoplayer, isReduced, onMotionChange, scramble } from '../motion/kit';

const NEON = ['#00BEF3', '#8B5CF6', '#FF4D5E', '#34D399', '#FFFFFF'];
const EVERY = 2200;

export function initBrand() {
  const card = $<HTMLElement>('#brand .bs-card');
  const owin = $<HTMLElement>('[data-brand-o]');
  const giant = $<HTMLElement>('#brand .giant');
  const area = $<HTMLElement>('#brand .bs-right');
  if (!card || !owin || !giant || !area) return;
  const imgs = $$<HTMLImageElement>('[data-brand-img]', owin);
  const th = $<HTMLElement>('.th', owin);
  const px = $<HTMLCanvasElement>('.px', owin);
  const ctx = px?.getContext('2d');
  if (!imgs.length || !th || !px || !ctx) return;

  const W = px.width;
  const H = px.height;
  let k = 0;
  let timer = 0;
  const timeouts = new Set<number>();
  let spray = 0;
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timeouts.delete(id);
      fn();
    }, ms);
    timeouts.add(id);
  };

  const blocks = (n: number) => {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = NEON[(Math.random() * NEON.length) | 0];
      ctx.globalAlpha = 0.55 + Math.random() * 0.45;
      ctx.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 2 + ((Math.random() * 10) | 0), 1 + ((Math.random() * 4) | 0));
    }
    ctx.globalAlpha = 1;
  };
  const warm = (img: HTMLImageElement) => {
    if (img.dataset.thermal) new Image().src = img.dataset.thermal;
  };
  const show = (n: number) => {
    imgs[k].classList.remove('on');
    imgs[k].setAttribute('aria-hidden', 'true');
    k = n;
    imgs[k].classList.add('on');
    imgs[k].removeAttribute('aria-hidden');
  };

  const swap = () => {
    const nx = (k + 1) % imgs.length;
    th.style.backgroundImage = `url(${imgs[nx].dataset.thermal ?? ''})`;
    owin.classList.remove('glitch');
    void owin.offsetWidth;
    owin.classList.add('glitch');
    giant.classList.add('dim');
    let f = 0;
    window.clearInterval(spray);
    spray = window.setInterval(() => {
      blocks(28 - f * 3);
      if (++f > 8) {
        window.clearInterval(spray);
        ctx.clearRect(0, 0, W, H);
      }
    }, 60);
    later(() => show(nx), 200);
    later(() => giant.classList.remove('dim'), 360);
    later(() => warm(imgs[(nx + 1) % imgs.length]), 700);
  };

  autoplayer(card, {
    threshold: 0.3,
    play: () => {
      warm(imgs[(k + 1) % imgs.length]);
      timer = window.setInterval(swap, EVERY);
    },
    pause: () => {
      window.clearInterval(timer);
      window.clearInterval(spray);
      timeouts.forEach((id) => window.clearTimeout(id));
      timeouts.clear();
      // Settle any half-finished swap so the O never freezes mid-glitch.
      owin.classList.remove('glitch');
      giant.classList.remove('dim');
      ctx.clearRect(0, 0, W, H);
    },
  });

  // Letters cycle glyphs then land, left to right (scramble is a no-op under reduced motion).
  const letters = $$<HTMLElement>('[data-g]', giant);
  area.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || isReduced()) return;
    letters.forEach((l, i) => window.setTimeout(() => scramble(l, 520), i * 70));
  });

  // Reduced motion mid-swap: the autoplayer has stopped the cycle; the O settles on the first image (the one the page
  // ships) and any letter mid-scramble lands.
  onMotionChange((reduced) => {
    if (!reduced) return;
    if (k !== 0) show(0);
    for (const l of letters) {
      if (l.dataset.orig) l.textContent = l.dataset.orig;
      delete l.dataset.scrambling;
    }
  });
}
