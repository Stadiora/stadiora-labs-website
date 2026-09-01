/* Free performance check, shared engine for lead-magnet.html and
   lead-magnet-es.html.

   The engine holds no user facing string. Every word comes from the page, in
   the page's own language, through window.SL_CHECK, which has to be defined
   before this file runs. That is what keeps the English and Spanish funnels
   on exactly the same logic while their copy stays independent.

     <script src="./scripts/check.js" defer></script>

   Data contract, see either lead magnet page for a filled in example:

     SL_CHECK.ui        strings the engine writes into the shell
     SL_CHECK.paths     one entry per role and sport combination, keyed
                        "<role>-<sport>", matching the data-role and
                        data-sport attributes on the choice buttons

   A path carries:
     scoreLabel   label above the score bar
     skip         indices of questions that set context but do not score
     green        score at or above which the result is the green tier
     yellow       score at or above which the result is the yellow tier
     questions    [{ q, options: [{ label, detail, score, weak, vars }] }]
     tiers        { green|yellow|red: { label, headline, sub, rec, urgency } }
     strong       insights shown when no weak signal was picked
     cta          { kicker, headline, body, storeLabel, note, secondary }

   Placeholders. A tier string may contain {name}. The engine fills it from
   the vars object on whichever option the visitor chose, so personalisation
   is data, not code, and both languages get it for free.

   Markup contract, ids the page must provide:
     check-step  check-fill  check-back  check-restart
     s-intro  s-role  s-sport  s-question  s-results
     check-qlabel  check-qtext  check-options  check-next  check-results
   Choice buttons carry data-role or data-sport. The screens live in the
   page so the static copy is crawlable, the engine only swaps which one is
   visible and renders the questions and the result.
*/
(function () {
  'use strict';

  var DATA = window.SL_CHECK;
  if (!DATA || !DATA.paths) return;

  var UI = DATA.ui || {};
  var ICON_WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  var ICON_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var ICON_APPLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.4Z"/><path d="M14.5 5.4c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.7-1.3Z"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3.1v17.8c0 .8.9 1.3 1.6.9l14.2-8.9c.6-.4.6-1.4 0-1.8L6.6 2.2C5.9 1.8 5 2.3 5 3.1Z"/><path d="m5.8 2.4 9.8 9.6-9.8 9.6"/></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>';
  var ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  var S = {
    role: null,
    sport: null,
    path: null,
    answers: [],
    qi: 0,
    pending: null,
    history: ['s-intro'],
    screen: 's-intro'
  };

  function el(id) { return document.getElementById(id); }

  /* Escapes anything that came from the page data before it goes back into
     the DOM as markup. The data is authored, not user supplied, but the
     result card is built as a string, so it gets escaped anyway. */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fill(template, vars) {
    return String(template == null ? '' : template).replace(/\{(\w+)\}/g, function (whole, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole;
    });
  }

  function scoredIndices(path) {
    var skip = path.skip || [];
    var out = [];
    for (var i = 0; i < path.questions.length; i++) {
      if (skip.indexOf(i) === -1) out.push(i);
    }
    return out;
  }

  function maxScore(path) {
    return scoredIndices(path).reduce(function (total, i) {
      var best = path.questions[i].options.reduce(function (top, o) {
        return Math.max(top, o.score);
      }, 0);
      return total + best;
    }, 0);
  }

  /* ---- screens ---------------------------------------------------------- */

  function show(id, push) {
    var current = document.querySelector('.check__screen.is-active');
    if (current) current.classList.remove('is-active');
    var next = el(id);
    next.classList.add('is-active');
    if (push !== false) S.history.push(id);
    S.screen = id;
    updateMeta();
    updateBack();
    next.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    if (S.history.length <= 1) return;
    S.history.pop();
    show(S.history[S.history.length - 1], false);
  }

  function updateBack() {
    var btn = el('check-back');
    if (!btn) return;
    var hide = S.history.length <= 1 || S.screen === 's-results';
    btn.hidden = hide;
    var wrap = btn.parentNode;
    if (wrap && wrap.children.length === 1) wrap.hidden = hide;
  }

  function updateMeta() {
    var step = el('check-step');
    var fillBar = el('check-fill');
    var label = '';
    var pct = 4;

    if (S.screen === 's-role') { label = fill(UI.step, { n: 1, total: 3 }); pct = 12; }
    else if (S.screen === 's-sport') { label = fill(UI.step, { n: 2, total: 3 }); pct = 24; }
    else if (S.screen === 's-results') { label = UI.done || ''; pct = 100; }
    else if (S.screen === 's-question' && S.path) {
      var total = DATA.paths[S.path].questions.length;
      label = fill(UI.question, { n: S.qi + 1, total: total });
      pct = 24 + Math.round(((S.qi + 1) / total) * 70);
    }

    if (step) step.textContent = label;
    if (fillBar) {
      fillBar.style.width = pct + '%';
      var meter = fillBar.parentNode;
      if (meter && meter.setAttribute) meter.setAttribute('aria-valuenow', String(pct));
    }
  }

  /* ---- role and sport --------------------------------------------------- */

  function choose(group, value, nextScreen) {
    var buttons = document.querySelectorAll('[data-' + group + ']');
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute('data-' + group) === value;
      buttons[i].classList.toggle('is-selected', on);
      buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    window.setTimeout(nextScreen, 180);
  }

  /* ---- questions -------------------------------------------------------- */

  function loadQuestion() {
    var path = DATA.paths[S.path];
    var q = path.questions[S.qi];
    var total = path.questions.length;
    var last = S.qi === total - 1;

    el('check-qlabel').textContent = fill(UI.question, { n: S.qi + 1, total: total });
    el('check-qtext').textContent = q.q;
    el('check-options').innerHTML = q.options.map(function (o, i) {
      return '<button type="button" class="check__opt" data-index="' + i + '" aria-pressed="false">' +
        '<span class="check__opt-mark" aria-hidden="true"></span>' +
        '<span class="check__opt-text">' +
          '<span class="check__opt-label">' + esc(o.label) + '</span>' +
          (o.detail ? '<span class="check__opt-detail">' + esc(o.detail) + '</span>' : '') +
        '</span>' +
      '</button>';
    }).join('');

    var next = el('check-next');
    next.disabled = true;
    next.innerHTML = esc(last ? UI.results : UI.next) + ICON_ARROW;
    S.pending = null;
    updateMeta();
  }

  function pick(button) {
    var options = el('check-options').querySelectorAll('.check__opt');
    for (var i = 0; i < options.length; i++) {
      var on = options[i] === button;
      options[i].classList.toggle('is-selected', on);
      options[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    S.pending = Number(button.getAttribute('data-index'));
    el('check-next').disabled = false;
  }

  function advance() {
    if (S.pending === null) return;
    S.answers[S.qi] = S.pending;

    var path = DATA.paths[S.path];
    if (S.qi < path.questions.length - 1) {
      S.qi++;
      loadQuestion();
      var screen = el('s-question');
      screen.classList.remove('is-active');
      void screen.offsetWidth;
      screen.classList.add('is-active');
      screen.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      results();
    }
  }

  /* ---- result ----------------------------------------------------------- */

  function chosen(path) {
    return path.questions.map(function (q, i) { return q.options[S.answers[i]]; });
  }

  function storeRow(cta) {
    var stores = DATA.stores || {};
    return '<div class="sl-stores check__stores">' +
      '<a class="sl-store" href="' + esc(stores.iosUrl) + '" target="_blank" rel="noopener">' +
        ICON_APPLE +
        '<span class="sl-store__text">' +
          '<span class="sl-store__kicker">' + esc(stores.iosKicker) + '</span>' +
          '<span class="sl-store__name">' + esc(stores.iosName) + '</span>' +
        '</span>' +
      '</a>' +
      '<a class="sl-store" href="' + esc(stores.androidUrl) + '" target="_blank" rel="noopener">' +
        ICON_PLAY +
        '<span class="sl-store__text">' +
          '<span class="sl-store__kicker">' + esc(stores.androidKicker) + '</span>' +
          '<span class="sl-store__name">' + esc(stores.androidName) + '</span>' +
        '</span>' +
      '</a>' +
    '</div>';
  }

  function results() {
    var path = DATA.paths[S.path];
    var picked = chosen(path);
    var vars = {};
    var score = 0;
    var i;

    for (i = 0; i < picked.length; i++) {
      if (picked[i] && picked[i].vars) {
        for (var key in picked[i].vars) {
          if (Object.prototype.hasOwnProperty.call(picked[i].vars, key)) vars[key] = picked[i].vars[key];
        }
      }
    }
    var scored = scoredIndices(path);
    for (i = 0; i < scored.length; i++) score += picked[scored[i]].score;

    var top = maxScore(path);
    var pct = top ? Math.round((score / top) * 100) : 0;
    var tierName = score >= path.green ? 'green' : score >= path.yellow ? 'yellow' : 'red';
    var tier = path.tiers[tierName];

    var weak = [];
    for (i = 0; i < scored.length; i++) {
      var w = picked[scored[i]].weak;
      if (w) weak.push(w);
    }
    var insights = weak.length
      ? weak.slice(0, 3).map(function (text) {
          return '<li class="check__insight check__insight--' + tierName + '">' + ICON_WARN + '<span>' + esc(text) + '</span></li>';
        })
      : (path.strong || []).slice(0, 3).map(function (text) {
          return '<li class="check__insight check__insight--green">' + ICON_OK + '<span>' + esc(text) + '</span></li>';
        });

    var cta = path.cta;
    var secondary = cta.secondary
      ? '<div class="check__secondary">' +
          '<p class="check__secondary-text">' + esc(cta.secondary.body) + '</p>' +
          '<a class="sl-btn sl-btn--ghost" href="' + esc(cta.secondary.href) + '">' + ICON_MAIL + esc(cta.secondary.label) + '</a>' +
        '</div>'
      : '';

    el('check-results').innerHTML =
      '<article class="check__result check__result--' + tierName + '">' +
        '<p class="check__badge"><span class="check__dot" aria-hidden="true"></span>' + esc(tier.label) + '</p>' +
        '<h2 class="sl-h2 check__headline">' + esc(tier.headline) + '</h2>' +
        '<p class="sl-lead">' + esc(fill(tier.sub, vars)) + '</p>' +
        '<div class="check__score">' +
          '<p class="check__score-head"><span class="sl-label">' + esc(path.scoreLabel) + '</span><span class="check__score-pct">' + pct + '%</span></p>' +
          '<div class="check__score-track" role="img" aria-label="' + esc(path.scoreLabel) + ' ' + pct + '%">' +
            '<span class="check__score-fill" style="width:' + pct + '%"></span>' +
          '</div>' +
        '</div>' +
        '<p class="check__rec"><span class="sl-label check__rec-label">' + esc(UI.recommendation) + '</span>' + esc(fill(tier.rec, vars)) + '</p>' +
        (insights.length ? '<ul class="check__insights">' + insights.join('') + '</ul>' : '') +
        '<p class="check__note">' + esc(fill(tier.urgency, vars)) + '</p>' +
      '</article>' +
      '<section class="check__cta" aria-labelledby="check-cta-title">' +
        '<p class="sl-label check__cta-kicker">' + esc(cta.kicker) + '</p>' +
        '<h2 class="sl-h3" id="check-cta-title">' + esc(cta.headline) + '</h2>' +
        '<p class="sl-muted">' + esc(cta.body) + '</p>' +
        '<p class="sl-label check__store-label">' + esc(cta.storeLabel) + '</p>' +
        storeRow(cta) +
        '<p class="check__fineprint sl-small">' + esc(cta.note) + '</p>' +
        secondary +
      '</section>';

    show('s-results');
  }

  /* ---- wiring ----------------------------------------------------------- */

  function init() {
    var start = el('check-start');
    if (start) start.addEventListener('click', function () { show('s-role'); });

    var back0 = el('check-back');
    if (back0) back0.addEventListener('click', back);

    var restart = el('check-restart');
    if (restart) restart.addEventListener('click', function () { window.location.reload(); });

    document.addEventListener('click', function (e) {
      var target = e.target.closest ? e.target.closest('[data-role], [data-sport], .check__opt') : null;
      if (!target) return;

      if (target.hasAttribute('data-role')) {
        S.role = target.getAttribute('data-role');
        choose('role', S.role, function () { show('s-sport'); });
      } else if (target.hasAttribute('data-sport')) {
        S.sport = target.getAttribute('data-sport');
        S.path = S.role + '-' + S.sport;
        S.answers = [];
        S.qi = 0;
        choose('sport', S.sport, function () {
          loadQuestion();
          show('s-question');
        });
      } else {
        pick(target);
      }
    });

    var next = el('check-next');
    if (next) next.addEventListener('click', advance);

    updateMeta();
    updateBack();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
