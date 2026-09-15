/* Das Hausprogramm, das ohne Internet läuft: Pixelfilm und eigene Stücke. */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const INSEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'static', 'lernwelt');

function laden(datei, zusatz = {}) {
  const kontext = {
    window: {}, document: { addEventListener() {} },
    localStorage: { getItem: () => null, setItem() {} },
    Math, Object, Array, String, JSON, ...zusatz
  };
  vm.createContext(kontext);
  vm.runInContext(fs.readFileSync(path.join(INSEL, datei), 'utf8'), kontext);
  return kontext.window;
}

/* Zeichenkontext-Attrappe: zählt, statt zu malen. */
function stiftAttrappe() {
  const c = {
    striche: 0, texte: [],
    fillStyle: '', font: '', textAlign: '', globalAlpha: 1,
    fillRect() { c.striche++; },
    measureText: (t) => ({ width: t.length * 7 }),
    fillText: (t) => c.texte.push(t)
  };
  return c;
}

test('der Film hat Szenen und eine vernünftige Länge', () => {
  const w = laden('kurzfilm.js');
  const szenen = w.Kurzfilm.szenen();
  assert.ok(szenen.length >= 4, 'zu wenige Szenen');
  assert.ok(w.Kurzfilm.dauer() >= 30 && w.Kurzfilm.dauer() <= 180,
            'Länge unpassend: ' + w.Kurzfilm.dauer());
  for (const s of szenen) assert.ok(s.dauer > 0 && s.titel, JSON.stringify(s));
});

test('jede Sekunde des Films lässt sich zeichnen', () => {
  const w = laden('kurzfilm.js');
  const c = stiftAttrappe();
  const gesehen = new Set();
  for (let t = 0; t < w.Kurzfilm.dauer(); t += 0.5) {
    const szene = w.Kurzfilm.malen(c, t);
    assert.ok(szene, 'keine Szene bei Sekunde ' + t);
    gesehen.add(szene);
  }
  assert.equal(gesehen.size, w.Kurzfilm.szenen().length, 'nicht alle Szenen kommen vor');
  assert.ok(c.striche > 1000, 'es wurde kaum etwas gezeichnet');
  assert.ok(c.texte.some((t) => /HONIGTOPF/.test(t)) && c.texte.some((t) => /ENDE/.test(t)));
  assert.equal(w.Kurzfilm.malen(c, w.Kurzfilm.dauer() + 1), null, 'nach dem Ende ist Schluss');
});

test('das Hauskonzert kennt alle Stücke der Insel', () => {
  const w = laden('musik.js');
  const liste = w.Musik.liste();
  assert.ok(liste.length >= 10, 'zu wenige Stücke: ' + liste.length);
  for (const s of liste) { assert.ok(s.id); assert.ok(s.name); }
  assert.equal(new Set(liste.map((s) => s.id)).size, liste.length, 'doppelte Kennungen');
});

test('der Saal wählt ohne Netz das Hausprogramm und bucht die Marke wie sonst', () => {
  const quelle = fs.readFileSync(path.join(INSEL, 'saal', 'index.html'), 'utf8');
  assert.match(quelle, /Offline\.netzPruefen/, 'das Netz wird nicht geprüft');
  assert.match(quelle, /if \(imNetz\) \{ videosZeigen\(\); return; \}/, 'kein Umschalten aufs Hausprogramm');
  assert.match(quelle, /hauskino|hauskonzert/, 'Hausprogramm fehlt');
  /* Die Marke läuft weiter über raumOeffnen — offline wie online genau einmal. */
  const oeffnen = quelle.match(/\$\('oeffnen'\)\.onclick[\s\S]{0,400}/)[0];
  assert.match(oeffnen, /Insel\.raumOeffnen/);
  assert.equal((oeffnen.match(/raumOeffnen/g) || []).length, 1, 'die Marke darf nur einmal gebucht werden');
});
