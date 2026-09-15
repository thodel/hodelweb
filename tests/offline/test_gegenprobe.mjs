/* Ein Test, der nie rot wird, ist keiner. Hier fehlt absichtlich eine Datei
   im Precache — der Offline-Fall muss daran scheitern. */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swLaden, antwort } from './sw_umgebung.mjs';

const INSEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'static', 'lernwelt');

/** Kopiert sw.js mit einer Liste, aus der eine Datei entfernt wurde. */
function luecke(fehlend) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swluecke-'));
  fs.copyFileSync(path.join(INSEL, 'sw.js'), path.join(tmp, 'sw.js'));
  const liste = fs.readFileSync(path.join(INSEL, 'sw-liste.js'), 'utf8')
    .split('\n').filter((z) => !z.includes("'" + fehlend + "'")).join('\n');
  fs.writeFileSync(path.join(tmp, 'sw-liste.js'), liste);
  return tmp;
}

test('fehlt eine Datei im Precache, scheitert sie offline', async () => {
  const wurzel = luecke('/lernwelt/uebungen.js');
  const netz = async (req) => antwort('inhalt von ' + new URL(req.url ?? req, 'https://test.local').pathname);
  const sw = swLaden(wurzel, netz);
  await sw.ausloesen('install');

  /* Jetzt kein Netz mehr. */
  const kaputt = async () => { throw new Error('kein Netz'); };
  sw.kontext.fetch = kaputt;
  sw.self.fetch = kaputt;

  const seite = await sw.ausloesen('fetch', {
    request: new Request('https://test.local/lernwelt/')
  });
  assert.ok(seite, 'die Insel selbst muss aus dem Cache kommen');

  await assert.rejects(
    sw.ausloesen('fetch', { request: new Request('https://test.local/lernwelt/uebungen.js') }),
    /kein Netz/,
    'die vergessene Datei müsste offline fehlschlagen — sonst prüft der Test nichts'
  );
  fs.rmSync(wurzel, { recursive: true, force: true });
});

test('mit vollständiger Liste kommt dieselbe Datei offline aus dem Cache', async () => {
  const netz = async (req) => antwort('inhalt von ' + new URL(req.url ?? req, 'https://test.local').pathname);
  const sw = swLaden(INSEL, netz);
  await sw.ausloesen('install');
  const kaputt = async () => { throw new Error('kein Netz'); };
  sw.kontext.fetch = kaputt;
  sw.self.fetch = kaputt;
  const res = await sw.ausloesen('fetch', { request: new Request('https://test.local/lernwelt/uebungen.js') });
  assert.match(await res.text(), /uebungen\.js/);
});
