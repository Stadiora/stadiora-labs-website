/* Shared mobile nav for stadioralabs.com.

   Load once per page. The class that drives the mobile nav layout has to be
   on <html> before first paint, otherwise the page paints the no-script
   fallback and then jumps, so set it inline in <head> and load this file
   with defer:

     <script>document.documentElement.className += ' sl-js';</script>
     <script src="./scripts/nav.js" defer></script>

   This file sets the class again as a safety net for a page that forgets the
   inline line. That path still works, it just repaints.

   Markup contract, see STYLE.md section 4:
     button.sl-nav__toggle[aria-controls="<id>"] inside .sl-nav
     div#<id>.sl-nav__menu holding the links and any calls to action

   Labels. The toggle's accessible name changes between open and closed, so
   both strings come from the page, in the page's own language:
     aria-label         the closed name, and the name before this file runs
     data-label-open    the closed name, defaults to the authored aria-label
     data-label-close   the open name, omit it and the name never changes
   No user-facing string is hard coded here, so a Spanish page that fills
   these in never announces English.
*/
(function () {
  'use strict';

  document.documentElement.classList.add('sl-js');

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]),' +
                  ' select:not([disabled]), textarea:not([disabled]),' +
                  ' [tabindex]:not([tabindex="-1"])';

  function focusable(container) {
    var found = container.querySelectorAll(FOCUSABLE);
    var out = [];
    for (var i = 0; i < found.length; i++) {
      var box = found[i].getBoundingClientRect();
      if (box.width || box.height) out.push(found[i]);
    }
    return out;
  }

  function wire(toggle) {
    var menu = document.getElementById(toggle.getAttribute('aria-controls') || '');
    if (!menu) return;

    var labelOpen = toggle.getAttribute('data-label-open') || toggle.getAttribute('aria-label');
    var labelClose = toggle.getAttribute('data-label-close');
    var lastFocus = null;

    menu.setAttribute('role', menu.getAttribute('role') || 'dialog');
    if (labelOpen && !menu.getAttribute('aria-label') && !menu.getAttribute('aria-labelledby')) {
      menu.setAttribute('aria-label', labelOpen);
    }

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    /* The toggle is the close control but sits outside the drawer in the DOM,
       so the tab cycle is the drawer's own items followed by the toggle. */
    function cycle() {
      return focusable(menu).concat([toggle]);
    }

    function setOpen(open, moveFocus) {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('sl-menu-open', open);
      if (open) menu.setAttribute('aria-modal', 'true');
      else menu.removeAttribute('aria-modal');

      /* Only touch the name when the page supplied both halves. An authored
         aria-label with no data-label-close is left exactly as written. */
      if (labelOpen && labelClose) {
        toggle.setAttribute('aria-label', open ? labelClose : labelOpen);
      }

      if (!moveFocus) return;
      if (open) {
        lastFocus = document.activeElement;
        /* The links inside the panel are visibility hidden until the .is-open
           transition lands, and a hidden element refuses focus. A layout flush
           is not enough: it settles geometry, not the pending visibility flip,
           so focusing here leaves the caret on the toggle, outside an
           aria-modal dialog. Wait for the first link to be focusable. */
        whenFocusable(cycle()[0]);
      } else {
        /* body is not a real restore target. Safari does not focus a button on
           click, so the element recorded when the drawer opened can be the body
           itself, and restoring to it drops the keyboard position instead of
           returning it. Treat that as no target and go back to the toggle. */
        var back = lastFocus && lastFocus !== document.body && document.contains(lastFocus)
          ? lastFocus
          : toggle;
        lastFocus = null;
        if (back && back.focus) back.focus();
      }
    }

    /* Focuses the element once it is actually able to take focus. The panel and
       the links inside it do not turn visible on the same frame: the panel
       resolves first and the inherited value reaches the links a frame later,
       so watching the panel means focusing a link that is still hidden, which
       the browser refuses. Watch the target itself. Reading the computed value
       rather than listening for transitionend keeps this right under
       prefers-reduced-motion, where there is no transition and no event. The
       cap stops the loop if the panel is closed again mid-open. */
    function whenFocusable(el) {
      var raf = window.requestAnimationFrame || function (fn) { return window.setTimeout(fn, 16); };
      var tries = 0;

      (function step() {
        if (!el || !menu.classList.contains('is-open') || !document.contains(el)) return;
        if (tries > 30 || window.getComputedStyle(el).visibility === 'visible') {
          el.focus();
          return;
        }
        tries++;
        raf(step);
      })();
    }

    /* Tab is driven entirely from the cycle rather than left to the DOM. The
       toggle sits before the drawer in source order, so natural tabbing from
       the last drawer item would fall through to the page behind it. */
    function onTab(e) {
      var items = cycle();
      if (!items.length) return;
      e.preventDefault();
      var at = items.indexOf(document.activeElement);
      var next;
      if (at === -1) next = e.shiftKey ? items.length - 1 : 0;
      else next = (at + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[next].focus();
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen(), true);
    });

    menu.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) setOpen(false, false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape' || e.key === 'Esc') setOpen(false, true);
      else if (e.key === 'Tab') onTab(e);
    });

    var wide = window.matchMedia('(min-width: 861px)');
    var onWide = function (e) {
      if (e.matches && isOpen()) setOpen(false, false);
    };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);

    setOpen(false, false);
  }

  function init() {
    var toggles = document.querySelectorAll('.sl-nav__toggle[aria-controls]');
    for (var i = 0; i < toggles.length; i++) wire(toggles[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
