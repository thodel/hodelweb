// Spiellogik der Lerninsel (insel.js) ohne Browser: Leiter, Honig, Bären,
// Schatzkarte, Ruderboot, Schatz, Tagesauftrag. Aufruf:
//   node --test tests/lernwelt/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const WURZEL = new URL('../../', import.meta.url);

function frisch(namen) {
  const speicher = new Map();
  const localStorage = {
    getItem: (k) => (speicher.has(k) ? speicher.get(k) : null),
    setItem: (k, v) => speicher.set(k, String(v)),
    removeItem: (k) => speicher.delete(k),
    key: (i) => [...speicher.keys()][i],
    get length() { return speicher.size; }
  };
  const sessionStorage = { ...localStorage };
  /* Eigenes Math je Kontext, damit ein festgenagelter Zufall nicht in den nächsten Test schwappt. */
  const ctx = { window: {}, localStorage, sessionStorage, Date, Math: Object.create(Math), JSON, console };
  ctx.window.LERNWELT_NAMEN = namen || undefined;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('static/lernwelt/insel.js', WURZEL), 'utf8'), ctx);
  vm.runInContext(readFileSync(new URL('static/lernwelt/uebungen.js', WURZEL), 'utf8'), ctx);
  return { Insel: ctx.window.Insel, Uebungen: ctx.window.Uebungen, ctx };
}

test('Leiter und Honig: ohne Leiter nichts, mit Leiter drei Töpfe, Baum braucht Pause', () => {
  const { Insel } = frisch();
  const st = Insel.stand('A'); st.muenzen = 100; Insel._speichern('A', st);
  assert.equal(Insel.honigErnten('b1', 'A').grund, 'leiter');
  assert.equal(Insel.leiterKaufen('A').ok, true);
  assert.equal(Insel.muenzen('A'), 100 - Insel.oekonomie.leiterPreis);
  assert.equal(Insel.leiterKaufen('A').grund, 'schon');
  assert.equal(Insel.honigErnten('b1', 'A').ok, true);
  assert.equal(Insel.honigErnten('b1', 'A').grund, 'leer');
  assert.ok(Insel.bienenbaumRest('b1', 'A') > 0);
  assert.equal(Insel.honigErnten('b2', 'A').ok, true);
  assert.equal(Insel.honigErnten('b3', 'A').ok, true);
  assert.equal(Insel.honig('A'), 3);
  assert.equal(Insel.honigErnten('b4', 'A').grund, 'voll');
});

test('Honig auf dem Stein beruhigt den Bären 15 Minuten — auch mit Süssigkeiten', () => {
  const { Insel } = frisch();
  const st = Insel.stand('A'); st.honig = 1; st.suessigkeiten = 5; Insel._speichern('A', st);
  assert.equal(Insel.baerRuhig('brumm', 'A'), false);
  const r = Insel.honigLegen('h-brumm', 'A');
  assert.equal(r.ok, true);
  assert.equal(r.baer, 'brumm');
  assert.equal(Insel.honig('A'), 0);
  assert.equal(Insel.baerRuhig('brumm', 'A'), true);
  assert.equal(Insel.baerRuhig('tatze', 'A'), false);
  assert.ok(Insel.baerRuhigRest('brumm', 'A') > 14 * 60 && Insel.baerRuhigRest('brumm', 'A') <= 15 * 60);
  assert.equal(Insel.suessigkeiten('A'), 5, 'die Süssigkeiten bleiben');
  assert.equal(Insel.honigLegen('h-brumm', 'A').grund, 'keiner');
});

test('Schatzkarte kostet 500, danach Ruderfahrt und Schatz genau einmal', () => {
  const { Insel, ctx } = frisch();
  const st = Insel.stand('A'); st.muenzen = 520; Insel._speichern('A', st);
  assert.equal(Insel.schatzkarteKaufen('A').ok, true);
  assert.equal(Insel.muenzen('A'), 20);
  assert.equal(Insel.schatzkarteKaufen('A').grund, 'schon');

  vm.runInContext('Math.random = () => 0.99', ctx);
  let r = Insel.rudern('hin', 'A');
  assert.equal(r.gekapert, false);
  assert.equal(Insel.schatzinselStand('A').dort, true);

  const schatz = Insel.schatzHeben('A', 10);          /* Leihschaufel */
  assert.equal(schatz.ok, true);
  assert.equal(Insel.muenzen('A'), 20 - 10 + Insel.oekonomie.schatzinselSchatz);
  assert.equal(Insel.marken('A'), Insel.oekonomie.schatzinselMarken);
  assert.equal(Insel.schatzHeben('A').grund, 'leer');

  r = Insel.rudern('zurueck', 'A');
  assert.equal(r.gekapert, false);
  assert.equal(Insel.schatzinselStand('A').dort, false);
  assert.equal(Insel.ankunftAbholen('A').id, 'ruderboot');
});

test('Gekapert beim Rudern: Piraten setzen einen später an der Felsenbucht ab', () => {
  const { Insel, ctx } = frisch();
  vm.runInContext('Math.random = () => 0.01', ctx);
  const r = Insel.rudern('hin', 'A');
  assert.equal(r.gekapert, true);
  assert.equal(Insel.gekapert('A'), true);
  assert.equal(Insel.piratenStand('A').ziel, 'ruderboot');
  assert.equal(Insel.piratenStand('A').sets.length, 0);
  Insel.piratenFreilassen('A');
  assert.equal(Insel.piratenStand('A').sets.length, 0, 'auch frei bleibt die Liste da');
  assert.equal(Insel.ankunftAbholen('A').an, 'in der Felsenbucht');
});

test('ohne Karte kein Schatz', () => {
  const { Insel } = frisch();
  assert.equal(Insel.schatzHeben('A').grund, 'karte');
});

test('Tagesauftrag nimmt zuerst Übungen, die noch Münzen bringen', () => {
  const { Insel, Uebungen } = frisch();
  const katalog = Insel.katalogAus(Uebungen, 'J');
  /* Alle bis auf drei als abgeholt markieren. */
  const rest = katalog.slice(0, 3);
  katalog.slice(3).forEach((k) => Insel.melden({ fach: k.fach, set: k.set, schwierigkeit: 'leicht', pct: 95, who: 'J' }));
  const a = Insel.tagesauftrag(katalog, 'J');
  const ids = a.sets.map((s) => s.fach + ':' + s.set).sort();
  assert.deepEqual(ids, rest.map((k) => k.fach + ':' + k.set).sort());
});

test('alte Spielstände ohne alle Felder stolpern nicht', () => {
  const { Insel, ctx } = frisch();
  ctx.localStorage.setItem('lerninsel.v2', JSON.stringify({ A: { muenzen: 7 } }));
  assert.equal(Insel.muenzStatus('mathe', 'einmaleins', 'leicht', 'A').art, 'neu');
  assert.equal(Insel.muenzen('A'), 7);
  assert.equal(Insel.hinweisGuthaben('A'), 0);
});

test('jede Übung liefert gültige, abwechslungsreiche Aufgaben', () => {
  const { Uebungen } = frisch();
  const alle = Uebungen.alle;
  assert.ok(alle.length >= 110, 'mindestens 110 Sets, hat ' + alle.length);
  const ids = new Set();
  for (const s of alle) {
    const schluessel = s.fach + ':' + s.id;
    assert.ok(!ids.has(schluessel), 'doppelt: ' + schluessel);
    ids.add(schluessel);
    const gesehen = new Set();
    for (let i = 0; i < 300; i++) {
      const a = s.gen();
      assert.ok(a && a.frage && a.antwort !== undefined && String(a.antwort) !== '', schluessel + ': leere Aufgabe');
      assert.ok(!/undefined|NaN/.test(String(a.frage) + String(a.antwort)), schluessel + ': ' + a.frage);
      if (a.typ === 'wahl') {
        assert.ok(a.optionen.indexOf(a.antwort) >= 0, schluessel + ': Antwort fehlt in den Optionen');
        assert.equal(new Set(a.optionen).size, a.optionen.length, schluessel + ': doppelte Option');
      }
      gesehen.add(a.paar ? 'P' + a.paar : a.frage + '|' + a.antwort);
    }
    assert.ok(gesehen.size >= 10, schluessel + ': nur ' + gesehen.size + ' verschiedene Aufgaben');
  }
});

test('Klasse 4 und 6 haben in jedem Fach Nachschub bekommen', () => {
  const { Uebungen } = frisch();
  for (const [fach, min4, min6] of [['mathe', 15, 20], ['deutsch', 14, 10], ['englisch', 12, 10], ['nmg', 7, 9]]) {
    assert.ok(Uebungen.fuer(fach, 4).eigene.length >= min4, fach + ' Klasse 4');
    assert.ok(Uebungen.fuer(fach, 6).eigene.length >= min6, fach + ' Klasse 6');
  }
  assert.ok(Uebungen.fuer('franzoesisch', 6).eigene.length >= 10);
  assert.equal(Uebungen.fuer('franzoesisch', 4).eigene.length, 0);
});
