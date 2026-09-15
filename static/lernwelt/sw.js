/* ============================================================
   Lerninsel — Service Worker: die Insel ohne Internet.

   Beim ersten Besuch werden alle Dateien aus sw-liste.js in einen Cache
   gelegt, der die Version im Namen trägt. Danach kommt die Insel zuerst
   aus dem Cache und startet auch ohne Netz sofort.

   Veränderliche Dateien (die Listen der Dokumenten-Pipeline, das
   Videoprogramm) werden aus dem Cache beantwortet und im Hintergrund
   erneuert. Fremde Herkunft, POST und alles ausserhalb von /lernwelt/
   fasst der Service Worker nicht an — YouTube läuft unverändert.
   ============================================================ */
'use strict';
importScripts('/lernwelt/sw-liste.js');

var CACHE = 'lerninsel-' + self.LERNWELT_VERSION;
/* Diese Dateien entstehen ausserhalb des Repos und dürfen veralten, aber
   nie fehlen: zuerst aus dem Cache, dann im Hintergrund erneuern. */
var DYNAMISCH = ['/lernwelt/eigene/listen.js', '/lernwelt/videos.json'];
var stand = { fertig: 0, gesamt: self.LERNWELT_DATEIEN.length, fehler: [] };
/* Der Browser beendet einen Service Worker zwischendurch; ein Zähler im
   Speicher wäre danach weg. Das Ergebnis des Vorladens liegt darum im Cache. */
var MARKE = '/lernwelt/__stand';

function unsere(url) {
  return url.origin === self.location.origin &&
         (url.pathname.indexOf('/lernwelt/') === 0 || url.pathname === '/favicon-32x32.png');
}

function melden(nachricht) {
  return self.clients.matchAll({ includeUncontrolled: true }).then(function (alle) {
    alle.forEach(function (c) { c.postMessage(nachricht); });
  });
}

/* Eine Datei nach der anderen: fehlt eine, scheitert nicht alles andere.
   Ohne Anmeldung (401) wird nichts abgelegt — der Passwortschutz bleibt. */
function vorladen() {
  return caches.open(CACHE).then(function (cache) {
    stand = { fertig: 0, gesamt: self.LERNWELT_DATEIEN.length, fehler: [] };
    return self.LERNWELT_DATEIEN.reduce(function (kette, url) {
      return kette.then(function () {
        return fetch(new Request(url, { credentials: 'same-origin', cache: 'reload' }))
          .then(function (antwort) {
            if (antwort.ok) return cache.put(url, antwort);
            stand.fehler.push(url + ' (' + antwort.status + ')');
          })
          .catch(function (e) { stand.fehler.push(url + ' (' + e.message + ')'); })
          .then(function () {
            stand.fertig++;
            if (stand.fertig % 5 === 0) melden({
              typ: 'lernwelt-stand', version: self.LERNWELT_VERSION, fertig: stand.fertig,
              gesamt: stand.gesamt, abgeschlossen: false, fehler: []
            });
          });
      });
    }, Promise.resolve()).then(function () {
      return cache.put(MARKE, new Response(JSON.stringify({ fehler: stand.fehler }),
                                           { headers: { 'Content-Type': 'application/json' } }));
    }).then(function () { return bericht().then(melden); });
  });
}

/* Was liegt wirklich im Cache? Die Marke sagt, ob das Vorladen durch ist. */
function bericht() {
  var gesamt = self.LERNWELT_DATEIEN.length;
  return caches.open(CACHE).then(function (cache) {
    return cache.match(MARKE);
  }).then(function (marke) {
    if (!marke) {
      return { typ: 'lernwelt-stand', version: self.LERNWELT_VERSION, fertig: stand.fertig,
               gesamt: gesamt, abgeschlossen: false, fehler: stand.fehler.slice(0, 5) };
    }
    return marke.json().then(function (m) {
      var fehler = (m && m.fehler) || [];
      return { typ: 'lernwelt-stand', version: self.LERNWELT_VERSION,
               fertig: gesamt - fehler.length, gesamt: gesamt,
               abgeschlossen: true, fehler: fehler.slice(0, 5) };
    });
  });
}

self.addEventListener('install', function (e) {
  e.waitUntil(vorladen());
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (namen) {
        return Promise.all(namen.map(function (n) {
          if (n.indexOf('lerninsel-') === 0 && n !== CACHE) return caches.delete(n);
        }));
      })
      .then(function () { return self.clients.claim(); })
      .then(function () { return bericht().then(melden); })
  );
});

/* Cache zuerst: was drin ist, kommt sofort — auch ohne Netz. */
function ausCache(req) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (treffer) {
      if (treffer) return treffer;
      return fetch(req).then(function (antwort) {
        if (antwort.ok && antwort.type === 'basic') cache.put(req, antwort.clone());
        return antwort;
      }).catch(function (e) {
        /* Eine unbekannte Seite ohne Netz: lieber die Insel als ein Fehlerbild. */
        if (req.mode === 'navigate') {
          return cache.match('/lernwelt/').then(function (insel) {
            if (insel) return insel;
            throw e;
          });
        }
        throw e;
      });
    });
  });
}

/* Aus dem Cache antworten und im Hintergrund erneuern. Der Minutenstempel
   an listen.js (?t=…) darf dabei nicht stören, darum ignoreSearch. */
function cacheUndErneuern(req) {
  var pfad = new URL(req.url).pathname;
  return caches.open(CACHE).then(function (cache) {
    return cache.match(pfad, { ignoreSearch: true }).then(function (treffer) {
      var netz = fetch(new Request(req.url, { credentials: 'same-origin', cache: 'reload' }))
        .then(function (antwort) {
          if (antwort.ok) cache.put(pfad, antwort.clone());
          return antwort;
        })
        .catch(function () { return null; });
      if (treffer) return treffer;
      return netz.then(function (frisch) {
        return frisch || new Response('/* offline, noch nichts im Cache */',
                                      { status: 504, headers: { 'Content-Type': 'text/plain' } });
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (!unsere(url)) return;                       /* YouTube und der Rest der Seite */
  if (DYNAMISCH.indexOf(url.pathname) >= 0) { e.respondWith(cacheUndErneuern(req)); return; }
  e.respondWith(ausCache(req));
});

self.addEventListener('message', function (e) {
  var daten = e.data || {};
  if (daten.typ === 'lernwelt-stand') e.waitUntil(bericht().then(melden));
  if (daten.typ === 'lernwelt-uebernehmen') self.skipWaiting();
});
