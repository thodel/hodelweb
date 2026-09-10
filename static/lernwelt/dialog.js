/* ============================================================
   Lerninsel — Gespräche
   Ein Kasten, der stehen bleibt, bis er weggeklickt wird.
   Mehrere Sätze werden nacheinander durchgeklickt.
   Wird von der Insel und von allen Innenräumen benutzt.
   ============================================================ */
(function (global) {
  'use strict';

  var el = null, werEl = null, wasEl = null, knopfEl = null, zaehlerEl = null;
  var zeilen = [], i = 0, fertig = null, offenSeit = 0;

  function bauen() {
    el = document.getElementById('dialog');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dialog';
      el.innerHTML =
        '<div class="kasten">' +
        '<div class="wer"></div><div class="was"></div>' +
        '<button class="weiter"></button><div class="zaehler"></div></div>';
      document.body.appendChild(el);
    }
    werEl = el.querySelector('.wer');
    wasEl = el.querySelector('.was');
    knopfEl = el.querySelector('.weiter');
    zaehlerEl = el.querySelector('.zaehler');
    if (!zaehlerEl) {
      zaehlerEl = document.createElement('div');
      zaehlerEl.className = 'zaehler';
      el.querySelector('.kasten').appendChild(zaehlerEl);
    }
    /* Klick irgendwohin blättert weiter — auch auf den Kasten selbst. */
    el.addEventListener('click', function (e) { e.preventDefault(); weiter(); });
    el.addEventListener('touchend', function (e) { e.preventDefault(); weiter(); }, { passive: false });
  }

  function malen() {
    wasEl.innerHTML = zeilen[i] || '';
    var letzte = i >= zeilen.length - 1;
    knopfEl.textContent = letzte ? 'Alles klar ✓' : 'Weiter ▸';
    zaehlerEl.textContent = zeilen.length > 1 ? (i + 1) + ' von ' + zeilen.length : '';
  }

  function weiter() {
    /* Kurze Sperre, damit derselbe Tastendruck nicht gleich weiterblättert. */
    if (Date.now() - offenSeit < 220) return;
    i++;
    if (i >= zeilen.length) { schliessen(); return; }
    offenSeit = Date.now();
    malen();
  }

  function schliessen() {
    if (!el) return;
    el.classList.remove('auf');
    zeilen = [];
    var f = fertig; fertig = null;
    if (f) f();
  }

  var Dialog = {
    /* zeigen('Name', 'Satz')  oder  zeigen('Name', ['Satz 1', 'Satz 2'], beiEnde) */
    zeigen: function (wer, text, beiEnde) {
      if (!el) bauen();
      zeilen = Array.isArray(text) ? text.slice() : [text];
      if (!zeilen.length) return;
      i = 0;
      fertig = beiEnde || null;
      werEl.textContent = wer || '';
      werEl.style.display = wer ? '' : 'none';
      offenSeit = Date.now();
      malen();
      el.classList.add('auf');
    },
    offen: function () { return !!(el && el.classList.contains('auf')); },
    weiter: weiter,
    schliessen: schliessen
  };

  /* Tastatur: Leertaste, Enter oder E blättern weiter, Escape schliesst. */
  document.addEventListener('keydown', function (e) {
    if (!Dialog.offen()) return;
    var k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); schliessen(); return; }
    if (k === 'enter' || k === ' ' || k === 'e') { e.preventDefault(); weiter(); }
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bauen);
  else bauen();

  global.Dialog = Dialog;
})(window);
