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
        /* Flush the style change first. The panel is visibility hidden until
           .is-open lands, and a hidden element cannot take focus. */
        void menu.offsetHeight;
        var first = cycle()[0];
        if (first) first.focus();
      } else {
        var back = lastFocus && document.contains(lastFocus) ? lastFocus : toggle;
        lastFocus = null;
        if (back && back.focus) back.focus();
      }
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
