/* ============================================================
   Lerninsel — Tablet
   Ergänzt tablet.css: Safari auf dem iPad startet bei langem Druck trotzdem
   manchmal eine Textauswahl (und zeigt Kopieren/Ausschneiden). Hier wird
   das Auswählen und das Kontextmenü unterdrückt — ausser in Eingabefeldern.
   ============================================================ */
(function () {
  'use strict';
  function eingabe(el) {
    while (el && el !== document) {
      var t = el.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable) return true;
      el = el.parentNode;
    }
    return false;
  }
  document.addEventListener('selectstart', function (e) {
    if (!eingabe(e.target)) e.preventDefault();
  });
  document.addEventListener('contextmenu', function (e) {
    if (!eingabe(e.target)) e.preventDefault();
  });
  /* Ist doch einmal etwas markiert worden, gleich wieder aufheben. */
  document.addEventListener('touchend', function (e) {
    if (eingabe(e.target)) return;
    var s = window.getSelection && window.getSelection();
    if (s && s.rangeCount && String(s).length) s.removeAllRanges();
  }, { passive: true });
})();
