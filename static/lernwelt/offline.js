/* ============================================================
   Lerninsel — offline: Service Worker anmelden und anzeigen, wie es steht.

   Jede Seite der Insel lädt diese Datei. Sie meldet den Service Worker an,
   zeigt unten rechts ein kleines Zeichen («lädt», «offline bereit»,
   «neue Fassung») und stellt window.Offline für die Räume bereit, die
   Internet brauchen (Kino, Musikhütte).
   ============================================================ */
(function (global) {
  'use strict';

  var zustand = { lage: 'aus', fertig: 0, gesamt: 0, version: null, fehler: [] };
  var el = null, warte = null;

  function zeichen() {
    if (el) return el;
    el = document.createElement('div');
    el.id = 'offline-zeichen';
    el.style.cssText =
      'position:fixed;right:10px;bottom:10px;z-index:9999;' +
      'font:700 11px/1.3 ui-monospace,Menlo,Consolas,monospace;' +
      'background:rgba(15,23,42,.92);color:#cbd5e1;border:2px solid #334155;' +
      'border-radius:10px;padding:6px 9px;cursor:default;opacity:.85;' +
      'max-width:60vw;text-align:center';
    document.body.appendChild(el);
    return el;
  }

  function zeigen() {
    if (!document.body) return;
    var k = zeichen();
    var offline = !navigator.onLine;
    if (zustand.lage === 'neu') {
      k.innerHTML = '⬇️ Neue Fassung ist da';
      k.style.borderColor = '#38bdf8';
      k.style.color = '#7dd3fc';
      k.style.cursor = 'pointer';
      k.style.opacity = '1';
      k.onclick = uebernehmen;
      return;
    }
    k.onclick = null;
    k.style.cursor = 'default';
    if (zustand.lage === 'laedt') {
      k.textContent = '⏳ für unterwegs laden … ' + zustand.fertig + '/' + zustand.gesamt;
      k.style.borderColor = '#fbbf24';
      k.style.color = '#fbbf24';
      k.style.opacity = '1';
    } else if (zustand.lage === 'bereit') {
      k.textContent = offline ? '⚓ offline — alles da' : '⚓ offline bereit';
      k.style.borderColor = offline ? '#4ade80' : '#334155';
      k.style.color = offline ? '#86efac' : '#94a3b8';
      k.style.opacity = offline ? '1' : '.55';
    } else {
      k.textContent = offline ? '🌐 kein Netz' : '🌐 online';
      k.style.borderColor = offline ? '#f87171' : '#334155';
      k.style.color = offline ? '#fca5a5' : '#64748b';
      k.style.opacity = offline ? '1' : '.45';
    }
    if (zustand.fehler.length) k.title = 'Nicht geladen: ' + zustand.fehler.join(', ');
  }

  function uebernehmen() {
    if (!warte) return;
    warte.postMessage({ typ: 'lernwelt-uebernehmen' });
    /* Sobald der neue Service Worker übernimmt, einmal neu laden. */
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      location.reload();
    });
  }

  function anmelden() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.typ !== 'lernwelt-stand') return;
      zustand.version = d.version;
      zustand.fertig = d.fertig;
      zustand.gesamt = d.gesamt;
      zustand.fehler = d.fehler || [];
      zustand.lage = d.abgeschlossen ? 'bereit' : 'laedt';
      zeigen();
    });
    navigator.serviceWorker.register('/lernwelt/sw.js', { scope: '/lernwelt/' }).then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) { warte = reg.waiting; zustand.lage = 'neu'; }
      else if (reg.active && navigator.serviceWorker.controller) { zustand.lage = 'bereit'; }
      else { zustand.lage = 'laedt'; }
      zeigen();
      reg.addEventListener('updatefound', function () {
        var neu = reg.installing;
        if (!neu) return;
        neu.addEventListener('statechange', function () {
          if (neu.state !== 'installed') return;
          if (navigator.serviceWorker.controller) { warte = neu; zustand.lage = 'neu'; }
          else { zustand.lage = 'bereit'; }
          zeigen();
        });
      });
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ typ: 'lernwelt-stand' });
      }
    }).catch(function () { zustand.lage = 'aus'; zeigen(); });
  }

  /* Für Kino und Musikhütte: gibt es wirklich Netz? navigator.onLine sagt nur,
     ob ein Kabel dran ist. Darum ein kurzer Griff nach draussen — auf eine
     Adresse ausserhalb von /lernwelt/, die der Service Worker nicht bedient. */
  function netzPruefen(frist) {
    if (!navigator.onLine) return Promise.resolve(false);
    var abbruch = new AbortController();
    var uhr = setTimeout(function () { abbruch.abort(); }, frist || 2500);
    return fetch('/?netz=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: abbruch.signal })
      .then(function (a) { clearTimeout(uhr); return a.ok || a.status === 401; })
      .catch(function () { clearTimeout(uhr); return false; });
  }

  global.Offline = {
    zustand: function () { return zustand; },
    netzPruefen: netzPruefen,
    imNetz: function () { return navigator.onLine; },
    zeigen: zeigen
  };

  window.addEventListener('online', zeigen);
  window.addEventListener('offline', zeigen);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', anmelden);
  else anmelden();
})(window);
