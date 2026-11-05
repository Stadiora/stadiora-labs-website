// Legal pages (/privacy.html, /terms.html): scroll-spy contents with per-section progress, a reading ring, a copy-link
// anchor on each heading, back to top, and the phone contents bar. The document text is server-rendered and never touched
// here: nothing hides it, moves it or fades it in, so search-in-page and the old #s1…#s17 links work without script.
import { $, $$, clamp, isReduced, startKit } from './motion/kit';

const art = $('[data-article]');
if (art) {
  const secs = $$('.doc-section', art);
  const links = $$('[data-toc]');
  const box = $('[data-toc-box]')!;
  const cur = $('[data-toc-current]')!;
  const pct = $('[data-pct]')!;
  const ring = $('[data-ring]')!;
  const tt = $('[data-tt]')!;
  const totop = $('[data-totop]')!;
  const toast = $('[data-toast]')!;
  const behavior = () => (isReduced() ? 'auto' : 'smooth');

  // Privacy | Terms switch: the thumb sits under the current document.
  const sw = $('.lg-switch');
  const on = sw && $('[aria-current="page"]', sw);
  const thumb = () => {
    if (!sw || !on) return;
    sw.style.setProperty('--tl', on.offsetLeft + 'px');
    sw.style.setProperty('--tw', on.offsetWidth + 'px');
  };
  thumb();
  document.fonts?.ready.then(thumb);
  addEventListener('resize', thumb);

  // A # link on each heading copies the section URL. It is chrome added here, so the text itself stays as written.
  let toastT = 0;
  const say = (m: string) => {
    toast.textContent = m;
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = window.setTimeout(() => toast.classList.remove('on'), 2200);
  };
  for (const s of secs) {
    const h = $('h2', s);
    if (!h) continue;
    const n = s.id.replace('s', '');
    const a = document.createElement('a');
    a.className = 'anchor';
    a.href = '#' + s.id;
    a.textContent = '#';
    a.setAttribute('aria-label', 'Copy link to section ' + n);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', '#' + s.id);
      s.scrollIntoView({ behavior: behavior() });
      const copy = navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject();
      copy.then(
        () => say('Link to section ' + n + ' copied'),
        () => say('Section ' + n + ' link is in the address bar'),
      );
    });
    h.appendChild(a);
  }

  // Scroll-spy: the active section is the last one whose top passed the reading line (34% of the viewport).
  let active = -1;
  let queued = false;
  const spy = () => {
    queued = false;
    const line = innerHeight * 0.34;
    const ar = art.getBoundingClientRect();
    const total = clamp((line - ar.top) / (ar.height - line * 0.5), 0, 1);
    let a = 0;
    secs.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const p = clamp((line - r.top) / r.height, 0, 1);
      if (r.top <= line) a = i;
      links[i].style.setProperty('--sp', p.toFixed(3));
      links[i].classList.toggle('done', p >= 0.999);
    });
    if (a !== active) {
      active = a;
      links.forEach((l, i) => {
        l.classList.toggle('is-active', i === a);
        if (i === a) l.setAttribute('aria-current', 'location');
        else l.removeAttribute('aria-current');
      });
      secs.forEach((s, i) => s.classList.toggle('is-active', i === a));
      const l = links[a];
      cur.textContent = $('.tn', l)!.textContent + '. ' + $('.tt', l)!.textContent;
      // Keep the active item visible inside a long contents list without moving the page.
      const nav = l.closest('nav');
      if (nav && getComputedStyle(nav).display !== 'none') {
        const lt = l.offsetTop;
        const nh = nav.clientHeight;
        if (lt < nav.scrollTop + 40 || lt > nav.scrollTop + nh - 60) nav.scrollTo({ top: lt - nh / 2, behavior: behavior() });
      }
    }
    const pc = Math.round(total * 100);
    pct.textContent = pc + '%';
    ring.style.setProperty('--pc', String(pc));
    tt.style.setProperty('--pc', String(pc));
    box.style.setProperty('--pcx', total.toFixed(4));
    totop.classList.toggle('on', scrollY > innerHeight * 0.9);
  };
  const ask = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(spy);
  };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);

  // Phone: the contents is a sticky bar that opens into the list.
  const tg = $('[data-toc-toggle]')!;
  const close = () => {
    box.classList.remove('open');
    tg.setAttribute('aria-expanded', 'false');
  };
  tg.addEventListener('click', () => {
    const o = !box.classList.contains('open');
    box.classList.toggle('open', o);
    tg.setAttribute('aria-expanded', String(o));
  });
  links.forEach((l) => l.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && box.classList.contains('open')) {
      close();
      tg.focus();
    }
  });

  // Back to top: focus returns to the page top for keyboard users.
  for (const b of [totop, $('[data-top-link]')!]) {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: behavior() });
      history.replaceState(null, '', location.pathname + location.search);
      const main = $('#main')!;
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    });
  }
  $('[data-print]')?.addEventListener('click', (e) => {
    e.preventDefault();
    print();
  });

  spy();
  document.fonts?.ready.then(spy);
}
startKit();
