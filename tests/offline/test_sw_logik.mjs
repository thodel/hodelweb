/* Was legt der Service Worker in den Cache, was nicht, und was liefert er
   ohne Netz? Läuft ohne Browser gegen eine nachgebaute Umgebung. */
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swLaden, antwort } from './sw_umgebung.mjs';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'static', 'lernwelt');

/** Netz-Attrappe: Antworten je Pfad, zählt die Abrufe. */
function netzBauen(regeln = {}) {
  const abrufe = [];
  const netz = async (req) => {
    const url = new URL(typeof req === 'string' ? req : req.url, 'https://test.local');
    abrufe.push(url.pathname + url.search);
    const regel = regeln[url.pathname];
    if (regel === undefined) return antwort('inhalt von ' + url.pathname);
    if (typeof regel === 'function') return regel(url);
    if (regel === 'fehler') throw new Error('kein Netz');
    return regel;
  };
  netz.abrufe = abrufe;
  return netz;
}

test('Vorladen legt jede Datei der Liste ab', async () => {
  const netz = netzBauen();
  const sw = swLaden(WURZEL, netz);
  await sw.ausloesen('install');
  const cache = await sw.caches.open('lerninsel-' + sw.kontext.self.LERNWELT_VERSION);
  const dateien = cache.adressen.filter((a) => a !== '/lernwelt/__stand');
  assert.equal(dateien.length, sw.kontext.self.LERNWELT_DATEIEN.length);
  for (const url of sw.kontext.self.LERNWELT_DATEIEN) assert.ok(cache.adressen.includes(url), url + ' fehlt');
});

test('ohne Anmeldung (401) wird nichts gecacht', async () => {
  const netz = netzBauen({ '/lernwelt/insel.js': antwort('Zugang verweigert', 401) });
  const sw = swLaden(WURZEL, netz);
  await sw.ausloesen('install');
  const cache = await sw.caches.open('lerninsel-' + sw.kontext.self.LERNWELT_VERSION);
  assert.ok(!cache.adressen.includes('/lernwelt/insel.js'));
  const letzte = sw.nachrichten[sw.nachrichten.length - 1];
  assert.ok(letzte.fehler.some((f) => f.includes('insel.js') && f.includes('401')));
});

test('eine unerreichbare Datei stoppt das Vorladen nicht', async () => {
  const netz = netzBauen({ '/lernwelt/musik.js': 'fehler' });
  const sw = swLaden(WURZEL, netz);
  await sw.ausloesen('install');
  const cache = await sw.caches.open('lerninsel-' + sw.kontext.self.LERNWELT_VERSION);
  assert.equal(cache.adressen.filter((a) => a !== '/lernwelt/__stand').length,
               sw.kontext.self.LERNWELT_DATEIEN.length - 1);
  assert.ok(cache.adressen.includes('/lernwelt/'));
});

test('Aktivieren räumt alte Fassungen weg', async () => {
  const sw = swLaden(WURZEL, netzBauen());
  await sw.caches.open('lerninsel-uralt');
  await sw.caches.open('etwas-anderes');
  await sw.ausloesen('install');
  await sw.ausloesen('activate');
  const namen = await sw.caches.keys();
  assert.ok(!namen.includes('lerninsel-uralt'));
  assert.ok(namen.includes('etwas-anderes'), 'fremde Caches bleiben unberührt');
});

test('Seite kommt ohne Netz aus dem Cache, Abfrageparameter egal', async () => {
  const netz = netzBauen();
  const sw = swLaden(WURZEL, netz);
  await sw.ausloesen('install');
  const offline = netzBauen({});
  sw.kontext.fetch = async () => { throw new Error('kein Netz'); };
  sw.self.fetch = sw.kontext.fetch;
  const res = await sw.ausloesen('fetch', {
    request: new Request('https://test.local/lernwelt/uebung/?fach=mathe&set=einmaleins')
  });
  assert.ok(res, 'keine Antwort');
  assert.match(await res.text(), /uebung/);
  assert.equal(offline.abrufe.length, 0);
});

test('fremde Herkunft und POST bleiben unangetastet', async () => {
  const sw = swLaden(WURZEL, netzBauen());
  await sw.ausloesen('install');
  const youtube = await sw.ausloesen('fetch', {
    request: new Request('https://www.youtube-nocookie.com/embed/abc')
  });
  assert.equal(youtube, null, 'YouTube darf der Service Worker nicht anfassen');
  const post = await sw.ausloesen('fetch', {
    request: new Request('https://test.local/lernwelt/uebung/', { method: 'POST' })
  });
  assert.equal(post, null);
});

test('veränderliche Dateien: Cache zuerst, Erneuern im Hintergrund, 404 bleibt draussen', async () => {
  let inhalt = 'window.LERNWELT_LISTEN={listen:[1]}';
  const netz = netzBauen({ '/lernwelt/eigene/listen.js': () => antwort(inhalt) });
  const sw = swLaden(WURZEL, netz);
  await sw.ausloesen('install');

  const erste = await sw.ausloesen('fetch', {
    request: new Request('https://test.local/lernwelt/eigene/listen.js?t=1')
  });
  assert.match(await erste.text(), /listen:\[1\]/);

  inhalt = 'window.LERNWELT_LISTEN={listen:[1,2]}';
  await sw.ausloesen('fetch', { request: new Request('https://test.local/lernwelt/eigene/listen.js?t=2') });
  await new Promise((r) => setTimeout(r, 20));
  const dritte = await sw.ausloesen('fetch', {
    request: new Request('https://test.local/lernwelt/eigene/listen.js?t=3')
  });
  assert.match(await dritte.text(), /listen:\[1,2\]/, 'Erneuern im Hintergrund hat nicht gegriffen');

  const cache = await sw.caches.open('lerninsel-' + sw.kontext.self.LERNWELT_VERSION);
  const eintraege = cache.adressen.filter((a) => a.includes('listen.js'));
  assert.equal(eintraege.length, 1, 'Minutenstempel darf den Cache nicht aufblähen: ' + eintraege);

  const leer = swLaden(WURZEL, netzBauen({ '/lernwelt/eigene/listen.js': antwort('weg', 404) }));
  await leer.ausloesen('install');
  const v = await leer.ausloesen('fetch', {
    request: new Request('https://test.local/lernwelt/eigene/listen.js?t=9')
  });
  assert.equal(v.status, 404);
  const c2 = await leer.caches.open('lerninsel-' + leer.kontext.self.LERNWELT_VERSION);
  assert.ok(!c2.adressen.some((a) => a.includes('listen.js')), '404 darf nicht in den Cache');
});

test('nach einem Neustart weiss der Service Worker, dass alles geladen ist', async () => {
  const sw = swLaden(WURZEL, netzBauen());
  await sw.ausloesen('install');
  /* Neustart: neue Instanz, gleicher Cache — der Zähler im Speicher ist weg. */
  const frisch = swLaden(WURZEL, netzBauen());
  frisch.caches.speicher = sw.caches.speicher;
  await frisch.ausloesen('message', { data: { typ: 'lernwelt-stand' } });
  await new Promise((r) => setTimeout(r, 10));
  const letzte = frisch.nachrichten[frisch.nachrichten.length - 1];
  assert.equal(letzte.abgeschlossen, true);
  assert.equal(letzte.fertig, letzte.gesamt);
});

test('Nachricht «übernehmen» schaltet die neue Fassung frei', async () => {
  const sw = swLaden(WURZEL, netzBauen());
  await sw.ausloesen('message', { data: { typ: 'lernwelt-uebernehmen' } });
  assert.equal(sw.self.uebernommen, true);
});
