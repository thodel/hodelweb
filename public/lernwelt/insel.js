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
    raumKosten: 1,          /* Marken pro Raumbesuch */
    wettEinsatz: 10,        /* Münzen, die eine Wette kostet */
    wettGewinn: 25,         /* Münzen bei gewonnener Wette */
    wettSiegeMax: 3         /* so oft lässt sich eine Figur schlagen */
  };

  /* ---- Aussehen: erste Zusammenstellung gratis, jedes weitere Teil kostet ---- */
  var GARDEROBE = {
    haut:   { name: 'Hautfarbe', preis: 0, werte: [
      ['#f2c8a0', 'hell'], ['#e0ac7e', 'mittel'], ['#b97a4f', 'goldbraun'], ['#7c4a2d', 'dunkel'] ] },
    haar:   { name: 'Haarfarbe', preis: 5, werte: [
      ['#5b3a1e', 'braun'], ['#1f2937', 'schwarz'], ['#d9a441', 'blond'], ['#a8391f', 'rot'],
      ['#8b5cf6', 'lila'], ['#e2e8f0', 'weiss'] ] },
    shirt:  { name: 'Shirt', preis: 5, werte: [
      ['#3b6fb0', 'blau'], ['#b03b3b', 'rot'], ['#3d8f57', 'grün'], ['#b45309', 'orange'],
      ['#7e22ce', 'lila'], ['#0f766e', 'türkis'], ['#1f2937', 'schwarz'], ['#e2e8f0', 'weiss'] ] },
    hose:   { name: 'Hose', preis: 5, werte: [
      ['#2f4d7a', 'jeans'], ['#374151', 'grau'], ['#4d3b2a', 'braun'], ['#166534', 'oliv'],
      ['#7f1d1d', 'dunkelrot'], ['#111827', 'schwarz'] ] },
    schuhe: { name: 'Schuhe', preis: 5, werte: [
      ['#1f2937', 'schwarz'], ['#f8fafc', 'weiss'], ['#b45309', 'braun'], ['#dc2626', 'rot'] ] }
  };
  var AVATAR_STANDARD = { haut: '#f2c8a0', haar: '#5b3a1e', shirt: '#3b6fb0', hose: '#2f4d7a', schuhe: '#1f2937' };

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
    return { muenzen: 0, marken: 0, uebungen: {}, besuche: {}, npc: {}, wette: null, seit: Date.now() };
  }

  var Insel = {
    garderobe: GARDEROBE,
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

      /* Läuft eine Wette in diesem Fach? */
      var wettErgebnis = null;
      var w = stand.wette;
      if (w && w.fach === opts.fach) {
        var gewonnen = pct > w.ziel;
        if (!stand.npc) stand.npc = {};
        if (!stand.npc[w.npc]) stand.npc[w.npc] = { siege: 0, niederlagen: 0 };
        if (gewonnen) {
          stand.muenzen += w.gewinn;
          stand.npc[w.npc].siege++;
        } else {
          stand.npc[w.npc].niederlagen++;
        }
        wettErgebnis = {
          gewonnen: gewonnen, name: w.name, npc: w.npc, ziel: w.ziel,
          einsatz: w.einsatz, gewinn: gewonnen ? w.gewinn : 0, erreicht: pct
        };
        stand.wette = null;
      }

      this._speichern(who, stand);

      return {
        muenzen: verdient,
        gesamtMuenzen: stand.muenzen,
        gemeistert: e.gemeistert,
        neuGemeistert: e.gemeistert && !warGemeistert,
        ersteMal: e.versuche === 1,
        best: e.best,
        grund: grund,
        wette: wettErgebnis
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

    /* ---------------- Wetten gegen die Inselbewohner ---------------- */
    npcStand: function (npcId, who) {
      var stand = this.stand(who);
      if (!stand.npc) stand.npc = {};
      if (!stand.npc[npcId]) stand.npc[npcId] = { siege: 0, niederlagen: 0 };
      return stand.npc[npcId];
    },

    /* Zielwert, den die Figur behauptet — steigt mit jeder Niederlage. */
    npcZiel: function (npcId, basis, who) {
      var n = this.npcStand(npcId, who);
      return Math.min(95, basis + 5 * n.siege);
    },
    npcWettetNoch: function (npcId, who) {
      return this.npcStand(npcId, who).siege < OEKONOMIE.wettSiegeMax;
    },

    offeneWette: function (who) {
      return this.stand(who).wette || null;
    },

    /* w = { npc, name, fach, ziel } */
    wetteAnnehmen: function (w, who) {
      var stand = this.stand(who);
      if (stand.wette) return { ok: false, grund: 'Du hast schon eine Wette laufen.' };
      if ((stand.muenzen || 0) < OEKONOMIE.wettEinsatz) {
        return { ok: false, grund: 'Dir fehlen Münzen für den Einsatz.',
                 fehlt: OEKONOMIE.wettEinsatz - (stand.muenzen || 0) };
      }
      stand.muenzen -= OEKONOMIE.wettEinsatz;
      stand.wette = {
        npc: w.npc, name: w.name, fach: w.fach, ziel: w.ziel,
        einsatz: OEKONOMIE.wettEinsatz, gewinn: OEKONOMIE.wettGewinn, seit: Date.now()
      };
      this._speichern(who, stand);
      return { ok: true, wette: stand.wette, muenzen: stand.muenzen };
    },

    wetteAufgeben: function (who) {
      var stand = this.stand(who);
      if (!stand.wette) return false;
      if (!stand.npc) stand.npc = {};
      var id = stand.wette.npc;
      if (!stand.npc[id]) stand.npc[id] = { siege: 0, niederlagen: 0 };
      stand.npc[id].niederlagen++;
      stand.wette = null;
      this._speichern(who, stand);
      return true;
    },

    /* ---------------- Spelunke: Glücksspiel ----------------
       Die Bankbilanz wird mitgeführt, damit sichtbar wird, wohin die Münzen
       auf Dauer wandern. */
    spelunkeStand: function (who) {
      var stand = this.stand(who);
      if (!stand.spelunke) {
        stand.spelunke = { spiele: 0, eingesetzt: 0, ausbezahlt: 0, groesserVerlust: 0, groesserGewinn: 0 };
      }
      return stand.spelunke;
    },
    bankBilanz: function (who) {
      var sp = this.spelunkeStand(who);
      return (sp.eingesetzt || 0) - (sp.ausbezahlt || 0);
    },
    /* einsatz wird abgezogen, auszahlung gutgeschrieben (0 = verloren) */
    spelunkeSpielen: function (einsatz, auszahlung, who) {
      var stand = this.stand(who);
      if ((stand.muenzen || 0) < einsatz) return { ok: false, fehlt: einsatz - (stand.muenzen || 0) };
      /* Wichtig: derselbe stand, der gleich gespeichert wird — sonst gehen die Zähler verloren. */
      if (!stand.spelunke) {
        stand.spelunke = { spiele: 0, eingesetzt: 0, ausbezahlt: 0, groesserVerlust: 0, groesserGewinn: 0 };
      }
      var sp = stand.spelunke;
      stand.muenzen = stand.muenzen - einsatz + auszahlung;
      sp.spiele++;
      sp.eingesetzt += einsatz;
      sp.ausbezahlt += auszahlung;
      var netto = auszahlung - einsatz;
      if (netto > (sp.groesserGewinn || 0)) sp.groesserGewinn = netto;
      if (-netto > (sp.groesserVerlust || 0)) sp.groesserVerlust = -netto;
      this._speichern(who, stand);
      return { ok: true, muenzen: stand.muenzen, netto: netto,
               bank: (sp.eingesetzt || 0) - (sp.ausbezahlt || 0) };
    },

    /* ---------------- Aussehen ---------------- */
    avatar: function (who) {
      var stand = this.stand(who);
      if (!stand.avatar) stand.avatar = null;
      var a = {};
      Object.keys(AVATAR_STANDARD).forEach(function (t) {
        a[t] = (stand.avatar && stand.avatar[t]) || AVATAR_STANDARD[t];
      });
      return a;
    },
    avatarErstellt: function (who) {
      return !!this.stand(who).avatar;
    },
    besitz: function (who) {
      var stand = this.stand(who);
      if (!stand.besitz) stand.besitz = {};
      return stand.besitz;
    },
    besitzt: function (teil, wert, who) {
      if (!GARDEROBE[teil]) return false;
      if (GARDEROBE[teil].preis === 0) return true;
      /* Was gerade getragen wird, gehört einem. */
      if (this.avatar(who)[teil] === wert) return true;
      var b = this.besitz(who)[teil] || [];
      return b.indexOf(wert) >= 0;
    },
    /* Ganze Zusammenstellung setzen. Beim ersten Mal gratis. */
    avatarSetzen: function (neu, who) {
      who = who || this.who();
      var stand = this.stand(who);
      var ersteMal = !stand.avatar;
      var alt = this.avatar(who);
      var kosten = 0, gekauft = [];

      if (!ersteMal) {
        Object.keys(GARDEROBE).forEach(function (teil) {
          var wert = neu[teil];
          if (!wert || wert === alt[teil]) return;
          if (GARDEROBE[teil].preis === 0) return;
          var b = stand.besitz && stand.besitz[teil] ? stand.besitz[teil] : [];
          if (b.indexOf(wert) < 0) { kosten += GARDEROBE[teil].preis; gekauft.push(teil + ':' + wert); }
        });
      }
      if (kosten > (stand.muenzen || 0)) {
        return { ok: false, kosten: kosten, fehlt: kosten - (stand.muenzen || 0) };
      }
      if (!stand.besitz) stand.besitz = {};
      Object.keys(GARDEROBE).forEach(function (teil) {
        var wert = neu[teil] || alt[teil];
        if (GARDEROBE[teil].preis > 0) {
          if (!stand.besitz[teil]) stand.besitz[teil] = [];
          if (stand.besitz[teil].indexOf(wert) < 0) stand.besitz[teil].push(wert);
        }
      });
      stand.muenzen = (stand.muenzen || 0) - kosten;
      stand.avatar = {};
      Object.keys(GARDEROBE).forEach(function (teil) { stand.avatar[teil] = neu[teil] || alt[teil]; });
      this._speichern(who, stand);
      return { ok: true, kosten: kosten, gratis: ersteMal, gekauft: gekauft, muenzen: stand.muenzen };
    },

    /* ---------------- Inselhaus: sichern und wiederherstellen ---------------- */
    sichern: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      try {
        localStorage.setItem('lerninsel.sicherung.' + who,
          JSON.stringify({ wann: Date.now(), stand: stand }));
        return { ok: true, wann: Date.now() };
      } catch (e) { return { ok: false }; }
    },
    letzteSicherung: function (who) {
      try {
        var raw = localStorage.getItem('lerninsel.sicherung.' + (who || this.who()));
        return raw ? JSON.parse(raw).wann : null;
      } catch (e) { return null; }
    },
    wiederherstellen: function (who) {
      who = who || this.who();
      try {
        var raw = localStorage.getItem('lerninsel.sicherung.' + who);
        if (!raw) return { ok: false };
        var sic = JSON.parse(raw);
        this._speichern(who, sic.stand);
        return { ok: true, wann: sic.wann };
      } catch (e) { return { ok: false }; }
    },
    exportieren: function (who) {
      who = who || this.who();
      return JSON.stringify({ v: 2, who: who, stand: this.stand(who) });
    },
    importieren: function (text) {
      try {
        var d = JSON.parse(text);
        if (!d || !d.who || !d.stand) return { ok: false };
        this._speichern(d.who, d.stand);
        return { ok: true, who: d.who };
      } catch (e) { return { ok: false }; }
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

    /* ---------------- Rückkehr auf die Insel ----------------
       Die Position wird für die Dauer des Tabs gemerkt, damit man nach einer
       Übung wieder dort steht, wo man hineingegangen ist. */
    merkePosition: function (pos) {
      try { sessionStorage.setItem('lerninsel.pos', JSON.stringify(pos)); } catch (e) {}
    },
    letztePosition: function () {
      try {
        var raw = sessionStorage.getItem('lerninsel.pos');
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    positionVergessen: function () {
      try { sessionStorage.removeItem('lerninsel.pos'); } catch (e) {}
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
