/* ============================================================
   Lerninsel — gemeinsamer Spielstand (Fortschritt, Münzen, Marken)
   Speichert ausschliesslich im Browser (localStorage).
   Es werden keine Daten an den Server oder an Dritte geschickt.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY_WHO = 'lerninsel.who';
  var KEY_DATA = 'lerninsel.v2';

  /* ---- Kinder & Klassenstufen (Lehrplan 21, Zyklus 2) ---- */
  var KINDER = {
    Joris:  { klasse: 4, jacke: ['#b03b3b', '#8a2c2c'], emoji: '🧑‍🎤' },
    Andrin: { klasse: 6, jacke: ['#3b6fb0', '#2c5289'], emoji: '🧑‍🚀' },
    Gast:   { klasse: 5, jacke: ['#3d8f57', '#2d6f42'], emoji: '🐵' }
  };

  var FAECHER = {
    mathe:    { name: 'Mathematik', kurz: 'Mathe',    emoji: '🧮', ort: 'Rechenturm' },
    deutsch:  { name: 'Deutsch',    kurz: 'Deutsch',  emoji: '✏️', ort: 'Schreiberhütte' },
    englisch: { name: 'English',    kurz: 'Englisch', emoji: '🏴‍☠️', ort: 'Piratenschiff' },
    nmg:      { name: 'Natur, Mensch, Gesellschaft', kurz: 'NMG', emoji: '🌍', ort: 'Aussichtsberg' }
  };

  /* ---- Wirtschaft ---- */
  var OEKONOMIE = {
    muenzenLeicht: 5,       /* einmalig, wenn eine leichte Übung geschafft ist */
    muenzenLeichtSchwach: 2,/* einmalig, aber unter 60 % */
    muenzenSchwer: 8,       /* pro Versuch, solange noch nicht gemeistert */
    meisterBonus: 15,       /* einmalig beim Meistern einer schweren Übung */
    meisterAb: 80,          /* ab diesem Prozentwert gilt eine Übung als gemeistert */
    mindestensFuerMuenzen: 50, /* darunter gibt es keine Münzen */
    markePreis: 25,         /* Münzen pro Marke */
    raumKosten: 1           /* Marken pro Raumbesuch */
  };

  var RAEUME = {
    kino:  { name: 'Kino', emoji: '🎬', beschreibung: 'Sport-Videos' },
    musik: { name: 'Musikhütte', emoji: '🎵', beschreibung: 'Musik-Videos' }
  };

  /* ---------------- Speicher ---------------- */
  function readRaw(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeRaw(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
  function load() {
    try { return JSON.parse(readRaw(KEY_DATA, '{}')) || {}; } catch (e) { return {}; }
  }
  function save(data) { return writeRaw(KEY_DATA, JSON.stringify(data)); }

  function leererSpielstand() {
    return { muenzen: 0, marken: 0, uebungen: {}, besuche: {}, seit: Date.now() };
  }

  var Insel = {
    kinder: KINDER,
    faecher: FAECHER,
    raeume: RAEUME,
    oekonomie: OEKONOMIE,

    /* ---------------- Spieler ---------------- */
    who: function () {
      var w = readRaw(KEY_WHO, 'Gast');
      return KINDER[w] ? w : 'Gast';
    },
    setWho: function (name) { if (KINDER[name]) writeRaw(KEY_WHO, name); },
    klasse: function (who) { return (KINDER[who || this.who()] || KINDER.Gast).klasse; },

    stand: function (who) {
      var data = load();
      var k = who || this.who();
      if (!data[k]) data[k] = leererSpielstand();
      return data[k];
    },
    _speichern: function (who, stand) {
      var data = load();
      data[who || this.who()] = stand;
      save(data);
    },

    muenzen: function (who) { return this.stand(who).muenzen || 0; },
    marken: function (who) { return this.stand(who).marken || 0; },

    /* ---------------- Übungen ---------------- */
    /* Ergebnis einer Übung melden.
       opts = { fach, set, titel, schwierigkeit: 'leicht'|'schwer', pct }
       Rückgabe: { muenzen, gemeistert, ersteMal, grund } */
    melden: function (opts) {
      var who = opts.who || this.who();
      var stand = this.stand(who);
      var id = opts.fach + ':' + opts.set;
      var pct = Math.max(0, Math.min(100, Math.round(opts.pct || 0)));
      var schwer = opts.schwierigkeit === 'schwer';

      var e = stand.uebungen[id] || (stand.uebungen[id] = {
        fach: opts.fach, set: opts.set, titel: opts.titel || opts.set,
        schwierigkeit: opts.schwierigkeit || 'leicht',
        versuche: 0, best: 0, gemeistert: false, bezahlt: false, muenzenTotal: 0
      });

      var warGemeistert = e.gemeistert;
      e.versuche++;
      e.zuletzt = pct;
      e.wann = Date.now();
      if (pct > e.best) e.best = pct;

      var verdient = 0, grund = '';

      if (pct < OEKONOMIE.mindestensFuerMuenzen) {
        grund = 'Unter ' + OEKONOMIE.mindestensFuerMuenzen + ' % gibt es keine Münzen.';
      } else if (!schwer) {
        /* Leichte Übung: nur beim ersten Mal Münzen */
        if (!e.bezahlt) {
          verdient = pct >= 60 ? OEKONOMIE.muenzenLeicht : OEKONOMIE.muenzenLeichtSchwach;
          e.bezahlt = true;
          grund = 'Zum ersten Mal geschafft!';
        } else {
          grund = 'Diese Übung hast du schon abgeholt — probier eine Knacknuss.';
        }
        if (pct >= OEKONOMIE.meisterAb) e.gemeistert = true;
      } else {
        /* Schwere Übung: Münzen pro Versuch, bis sie gemeistert ist */
        if (warGemeistert) {
          grund = 'Schon gemeistert — hier gibt es keine Münzen mehr.';
        } else if (pct >= OEKONOMIE.meisterAb) {
          verdient = OEKONOMIE.muenzenSchwer + OEKONOMIE.meisterBonus;
          e.gemeistert = true;
          grund = 'Gemeistert! Bonus kassiert.';
        } else {
          verdient = OEKONOMIE.muenzenSchwer;
          grund = 'Weiter üben — bis ' + OEKONOMIE.meisterAb + ' % gibt es jedes Mal Münzen.';
        }
      }

      e.muenzenTotal += verdient;
      stand.muenzen = (stand.muenzen || 0) + verdient;
      this._speichern(who, stand);

      return {
        muenzen: verdient,
        gesamtMuenzen: stand.muenzen,
        gemeistert: e.gemeistert,
        neuGemeistert: e.gemeistert && !warGemeistert,
        ersteMal: e.versuche === 1,
        best: e.best,
        grund: grund
      };
    },

    uebung: function (fach, set, who) {
      return this.stand(who).uebungen[fach + ':' + set] || null;
    },
    uebungenImFach: function (fach, who) {
      var alle = this.stand(who).uebungen, out = [];
      for (var k in alle) if (alle[k].fach === fach) out.push(alle[k]);
      return out;
    },

    /* Sterne pro Fach: 1 je gemeisterter Übung, maximal 3 */
    sterne: function (fach, who) {
      var n = 0;
      this.uebungenImFach(fach, who).forEach(function (u) { if (u.gemeistert) n++; });
      return Math.min(3, n);
    },
    sterneGesamt: function (who) {
      var self = this, sum = 0;
      Object.keys(FAECHER).forEach(function (f) { sum += self.sterne(f, who); });
      return sum;
    },
    fachAngefangen: function (fach, who) {
      return this.uebungenImFach(fach, who).length > 0;
    },
    alleFaecherGeschafft: function (who) {
      var self = this, ok = true;
      Object.keys(FAECHER).forEach(function (f) { if (!self.sterne(f, who)) ok = false; });
      return ok;
    },

    /* ---------------- Kiosk: Münzen → Marken ---------------- */
    markeKaufen: function (anzahl, who) {
      anzahl = Math.max(1, anzahl || 1);
      var stand = this.stand(who);
      var preis = OEKONOMIE.markePreis * anzahl;
      if ((stand.muenzen || 0) < preis) return { ok: false, fehlt: preis - (stand.muenzen || 0) };
      stand.muenzen -= preis;
      stand.marken = (stand.marken || 0) + anzahl;
      this._speichern(who, stand);
      return { ok: true, marken: stand.marken, muenzen: stand.muenzen };
    },

    /* ---------------- Räume ---------------- */
    /* Marke einlösen: öffnet den Raum für diesen Besuch (Tab-Sitzung). */
    raumOeffnen: function (raum, who) {
      if (!RAEUME[raum]) return { ok: false };
      var stand = this.stand(who);
      if ((stand.marken || 0) < OEKONOMIE.raumKosten) return { ok: false, fehlt: OEKONOMIE.raumKosten - (stand.marken || 0) };
      stand.marken -= OEKONOMIE.raumKosten;
      stand.besuche[raum] = (stand.besuche[raum] || 0) + 1;
      this._speichern(who, stand);
      try { sessionStorage.setItem('lerninsel.offen.' + raum, String(Date.now())); } catch (e) {}
      return { ok: true, marken: stand.marken };
    },
    raumOffen: function (raum) {
      try { return !!sessionStorage.getItem('lerninsel.offen.' + raum); } catch (e) { return false; }
    },
    raumSchliessen: function (raum) {
      try { sessionStorage.removeItem('lerninsel.offen.' + raum); } catch (e) {}
    },

    zuruecksetzen: function (who) {
      var data = load();
      delete data[who || this.who()];
      save(data);
    },

    /* ---------------- Kleine Helfer für Übungsseiten ---------------- */
    hudLeiste: function (parent) {
      var el = document.createElement('div');
      el.style.cssText =
        'display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;' +
        'font:700 13px/1 ui-monospace,Menlo,Consolas,monospace;margin:0 0 14px;';
      var who = this.who();
      el.innerHTML =
        '<span style="background:#1e293b;border:2px solid #334155;border-radius:8px;padding:7px 10px;color:#e2e8f0">' +
          (KINDER[who] ? KINDER[who].emoji : '🙂') + ' ' + who + ' · ' + this.klasse(who) + '. Klasse</span>' +
        '<span style="background:#1e293b;border:2px solid #fbbf24;border-radius:8px;padding:7px 10px;color:#fbbf24">🪙 ' +
          this.muenzen(who) + '</span>' +
        '<span style="background:#1e293b;border:2px solid #a78bfa;border-radius:8px;padding:7px 10px;color:#c4b5fd">🎟️ ' +
          this.marken(who) + '</span>' +
        '<a href="/lernwelt/" style="background:#1e3a5f;border:2px solid #fde68a;border-radius:8px;padding:7px 10px;color:#fde68a;text-decoration:none">🏝️ Insel</a>';
      if (parent) parent.appendChild(el);
      return el;
    }
  };

  /* Rückwärtskompatibel zur ersten Fassung */
  Insel.award = function (fach, pct, who) {
    return Insel.melden({ fach: fach, set: 'klassisch', titel: FAECHER[fach] ? FAECHER[fach].name : fach,
      schwierigkeit: 'schwer', pct: pct, who: who });
  };
  Insel.stars = function (fach, who) { return Insel.sterne(fach, who); };
  Insel.totalStars = function (who) { return Insel.sterneGesamt(who); };
  Insel.progress = function (who) { return Insel.stand(who).uebungen; };

  global.Insel = Insel;
})(window);
