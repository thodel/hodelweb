/* Die Bremse gegen vergessene Dateien: Alles, was die Insel lädt, muss im
   Precache stehen — sonst fehlt es unterwegs, und niemand merkt es vorher. */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const INSEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'static', 'lernwelt');

const AUSNAHMEN = new Set([
  '/lernwelt/eigene/listen.js',   // entsteht erst auf dem Server (Dokumenten-Pipeline)
  '/lernwelt/sw.js',              // den Service Worker verwaltet der Browser selbst
  '/lernwelt/sw-liste.js'         // lädt der Service Worker per importScripts
]);
/* Liegt ausserhalb der Insel: Links auf andere Teile der Seite. */
const AUSSEN = /^\/(andrin|joris|extercises|hfls|vlm)\//;

function liste() {
  const kontext = { self: {} };
  vm.createContext(kontext);
  vm.runInContext(fs.readFileSync(path.join(INSEL, 'sw-liste.js'), 'utf8'), kontext);
  return { dateien: new Set(kontext.self.LERNWELT_DATEIEN), version: kontext.self.LERNWELT_VERSION };
}

function quellen() {
  const raus = [];
  const gehen = (ordner) => {
    for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
      const p = path.join(ordner, e.name);
      if (e.isDirectory()) gehen(p);
      else if (/\.(html|js)$/.test(e.name) && e.name !== 'sw-liste.js') raus.push(p);
    }
  };
  gehen(INSEL);
  return raus;
}

function verweise(text) {
  const treffer = new Set();
  const muster = [
    /(?:src|href)\s*=\s*"([^"]+)"/g,
    /fetch\(\s*'([^']+)'/g,
    /fetch\(\s*"([^"]+)"/g,
    /'(\/lernwelt\/[^'"\s]+\.(?:js|css|json|png|webmanifest))'/g,
    /"(\/lernwelt\/[^'"\s]+\.(?:js|css|json|png|webmanifest))"/g
  ];
  for (const m of muster) {
    let t;
    while ((t = m.exec(text)) !== null) treffer.add(t[1]);
  }
  return [...treffer];
}

test('jede geladene Datei steht im Precache', () => {
  const { dateien } = liste();
  const fehlend = new Map();
  for (const datei of quellen()) {
    const text = fs.readFileSync(datei, 'utf8');
    for (const roh of verweise(text)) {
      if (!roh.startsWith('/')) continue;                 // relative Links und Anker
      if (roh.startsWith('//') || roh.includes('://')) continue;
      const pfad = roh.split('?')[0].split('#')[0];
      if (AUSSEN.test(pfad) || AUSNAHMEN.has(pfad)) continue;
      if (!pfad.startsWith('/lernwelt/') && pfad !== '/favicon-32x32.png') continue;
      if (!dateien.has(pfad)) {
        const wo = fehlend.get(pfad) || [];
        wo.push(path.relative(INSEL, datei));
        fehlend.set(pfad, wo);
      }
    }
  }
  assert.deepEqual([...fehlend.entries()], [], 'nicht im Precache: ' + JSON.stringify([...fehlend]));
});

test('jede Datei im Precache gibt es wirklich', () => {
  const { dateien } = liste();
  const fehlt = [];
  for (const url of dateien) {
    const rel = url === '/favicon-32x32.png' ? path.join('..', url) : url.replace('/lernwelt/', '');
    const p = path.join(INSEL, rel || '.');
    const ziel = url.endsWith('/') ? path.join(p, 'index.html') : p;
    if (!fs.existsSync(ziel)) fehlt.push(url);
  }
  assert.deepEqual(fehlt, []);
});

test('alle Seiten melden den Service Worker an', () => {
  const ohne = quellen()
    .filter((p) => p.endsWith('.html'))
    .filter((p) => !fs.readFileSync(p, 'utf8').includes('/lernwelt/offline.js'))
    .map((p) => path.relative(INSEL, p));
  assert.deepEqual(ohne, []);
});

test('Manifest ist gültig und vollständig im Precache', () => {
  const { dateien } = liste();
  const m = JSON.parse(fs.readFileSync(path.join(INSEL, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.start_url, '/lernwelt/');
  assert.equal(m.scope, '/lernwelt/');
  assert.ok(m.icons.length >= 2);
  for (const icon of m.icons) {
    assert.ok(fs.existsSync(path.join(INSEL, icon.src.replace('/lernwelt/', ''))), icon.src + ' fehlt');
    assert.ok(dateien.has(icon.src), icon.src + ' nicht im Precache');
  }
  assert.ok(dateien.has('/lernwelt/manifest.webmanifest'));
  assert.ok(dateien.has('/lernwelt/icon/insel-180.png'), 'Apple-Touch-Icon fehlt im Precache');
});
