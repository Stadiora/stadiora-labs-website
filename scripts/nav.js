/* Shared mobile nav for stadioralabs.com.

   Load once per page, in <head> with defer:
     <script src="./scripts/nav.js" defer></script>

   Markup contract, see STYLE.md section 4:
     button.sl-nav__toggle[aria-controls="<id>"] inside .sl-nav
     div#<id>.sl-nav__menu holding the links and any calls to action

   The script adds .sl-js to <html>. Without it the stylesheet keeps the nav
   links visible and wrapping, so every page stays navigable with no script.
*/
(function () {
  'use strict';

  document.documentElement.classList.add('sl-js');

  function wire(toggle) {
    var menu = document.getElementById(toggle.getAttribute('aria-controls') || '');
    if (!menu) return;

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open, moveFocus) {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('sl-menu-open', open);
      toggle.setAttribute(
        'aria-label',
        open ? toggle.getAttribute('data-label-close') || 'Close menu'
             : toggle.getAttribute('data-label-open') || 'Open menu'
      );
      if (!moveFocus) return;
      if (open) {
        var first = menu.querySelector('a, button');
        if (first) first.focus();
      } else if (menu.contains(document.activeElement)) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen(), true);
    });

    menu.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) setOpen(false, false);
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && isOpen()) setOpen(false, true);
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
