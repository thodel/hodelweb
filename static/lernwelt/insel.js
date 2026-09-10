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

  /* Spiele, die Münzen melden. Einmal hier gepflegt, überall gleich:
     Spielplatz, Bestenliste und Haus lesen dieselbe Liste. */
  var SPIELE = [
    { id: 'sprint', box: 'sport', art: 'sport', url: '/lernwelt/spiele/sprint/',
      titel: '🏃 Hürdenlauf, Fussball & Basketball',
      info: 'Jump &amp; Run: renne los, spring über die Hürden und sammle Bälle. ' +
            'Drei kurze Strecken, jede dauert etwa eine Minute.',
      meta: 'Springen: Leertaste · Doppelsprung · Ducken: S',
      fach: 'sport', sets: ['sprint-huerden', 'sprint-fussball', 'sprint-basket'], schwierigkeit: 'leicht' },

    { id: 'pferderennen', box: 'sport', art: 'sport', url: '/lernwelt/spiele/pferderennen/',
      titel: '🐎 Pferderennen',
      info: 'Links, rechts, links, rechts — im Wechsel drücken, dann galoppiert dein Pferd. ' +
            'Drei Bahnen gegen drei Gegner.',
      meta: 'Tasten ← und → im Wechsel · auf dem Tablet die beiden grossen Knöpfe',
      fach: 'sport', sets: ['pferderennen-kurz', 'pferderennen-mittel', 'pferderennen-lang'], schwierigkeit: 'leicht' },

    { id: 'kantone', box: 'nmg', art: 'nmg', url: '/lernwelt/spiele/kantone/',
      titel: '🧩 Kantone-Puzzle',
      info: 'Setze die Schweizer Kantone an den richtigen Platz auf der Karte. ' +
            'Erst die grossen, dann alle 26.',
      meta: 'Klicken oder tippen',
      fach: 'nmg', sets: ['kantone-puzzle-gross'], schwierigkeit: 'leicht',
      zweit: { sets: ['kantone-puzzle-alle'], schwierigkeit: 'schwer', name: 'alle 26 (Knacknuss)' } },

    { id: 'europa', box: 'nmg', art: 'nmg', url: '/lernwelt/uebung/?fach=nmg&set=europa',
      titel: '🌍 Hauptstädte-Quiz',
      info: 'Länder und Hauptstädte in Europa.',
      meta: 'Lehrplan 21: NMG.8.3',
      fach: 'nmg', sets: ['europa'], schwierigkeit: 'leicht' },

    { id: 'geo-blitz', box: 'nmg', art: 'nmg', url: '/lernwelt/geo-blitz/?von=insel',
      titel: '⚡ Geo-Blitz',
      info: 'Schnelles Quiz mit Zeitdruck.',
      meta: 'Lehrplan 21: NMG.8.4',
      fach: 'nmg', sets: ['geo-quiz'], schwierigkeit: 'leicht' }
  ];

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
    wettSiegeMax: 3,        /* so oft lässt sich eine Figur schlagen */
    suessigkeitPreis: 3,    /* Münzen pro Süssigkeit */
    zaehmDauer: 600,        /* Sekunden, die ein Affe nach dem Füttern zahm bleibt */
    affenDiebstahl: 5,      /* Münzen, die ein vernachlässigter Affe stiehlt */
    affenFund: 1,           /* Münzen, die ein zahmer Affe findet */
    affenFundTakt: 120,     /* alle wie viele Sekunden er etwas findet */
    gebraeuPreis: 15,       /* Münzen für ein Gebräu in der Spelunke */
    gebraeuMax: 3,          /* beim dritten Glas ist Schluss */
    gebraeuVerfall: 600,    /* in so vielen Sekunden nüchtert man wieder aus */
    baerWitterung: 150,     /* auf so viele Pixel riecht ein Bär die Süssigkeiten */
    baerTempo: 46,          /* langsamer als der Spieler (62) — weglaufen geht */
    baerSattDauer: 45,      /* so viele Sekunden lässt er dich nach der Beute in Ruhe */
    schaufelPreis: 20,      /* Münzen für die Schaufel im Kiosk — einmalig */
    grabWeite: 22,          /* so nah muss man an einem Schatz stehen */
    auftragAnzahl: 3,       /* so viele Übungen stehen im Tagesauftrag */
    auftragMindest: 60,     /* ab diesem Ergebnis zählt eine Übung als erledigt */
    auftragBonus: 20,       /* Münzen, wenn der ganze Tagesauftrag steht */
    wochenBonusMeister: 5,  /* Wochenpunkte extra fürs Meistern einer Übung */
    verratenWeite: 210      /* so weit leuchtet ein verratener Schatz */
  };

  /* Zwei Wäldchen — dort wacht man nach einem Blackout auf. */
  var WAELDER = {
    nordwald: { name: 'Nordwald', tx: 17, ty: 8,  x: 280, y: 142 },
    suedwald: { name: 'Südwald',  tx: 30, ty: 24, x: 488, y: 398 }
  };

  /* Freischaltbare Inselteile.
     Wer übt, macht die Insel grösser. Jeder Teil hat eine klare Bedingung,
     die im Spiel angezeigt wird, damit man weiss, worauf man hinarbeitet. */
  var INSELTEILE = [
    {
      id: 'leuchtturm', name: 'Leuchtturm', kurz: 'Leuchtturm',
      tx: 7, ty: 4, kind: 'leuchtturm', url: '/lernwelt/leuchtturm/',
      farbe: '#fde68a',
      bedingung: { sterne: 4 },
      wozu: 'Der Leuchtturmwärter zeigt dir die ganze Insel und verrät jeden Tag eine Schatzstelle.',
      offenText: 'Der alte Turm im Norden. Von oben sieht man alles.'
    },
    {
      id: 'sternwarte', name: 'Sternwarte', kurz: 'Sternwarte',
      tx: 33, ty: 6, kind: 'sternwarte', url: '/lernwelt/sternwarte/',
      farbe: '#c4b5fd',
      bedingung: { gemeistert: 6 },
      wozu: 'Teleskop, Planeten und ein Quiz über das Weltall.',
      offenText: 'Die Kuppel auf dem Osthügel. Nachts ist sie am schönsten.'
    },
    {
      id: 'bucht', name: 'Fischerbucht', kurz: 'Bucht',
      tx: 11, ty: 31, kind: 'bucht', url: '/lernwelt/bucht/',
      farbe: '#7dd3fc',
      bedingung: { sterne: 8 },
      wozu: 'Ein Steg, ein Boot und Fische, die sich nicht so leicht fangen lassen.',
      offenText: 'Die Bucht im Süden mit dem alten Steg.'
    }
  ];

  /* Vergrabene Schätze. Ohne Schaufel bleibt der Boden zu.
     'nahe' ist der Hinweis, den der alte Seebär erzählt. */
  var SCHAETZE = [
    { id: 's1', tx: 12, ty: 6,  muenzen: 5, nahe: 'nördlich vom Rechenturm, wo der Wald am dunkelsten ist' },
    { id: 's2', tx: 35, ty: 13, muenzen: 3, nahe: 'zwischen der Schreiberhütte und der Musikhütte' },
    { id: 's3', tx: 12, ty: 29, muenzen: 4, nahe: 'am Strand beim Piratenschiff, keine drei Schritte vom Wasser' },
    { id: 's4', tx: 27, ty: 30, muenzen: 2, nahe: 'ganz im Süden, unterhalb vom Kiosk' },
    { id: 's5', tx: 20, ty: 17, muenzen: 3, nahe: 'gleich beim Dorfplatz — da läuft jeder drüber' },
    { id: 's6', tx: 36, ty: 24, muenzen: 5, nahe: 'im Osten, auf dem Weg zum Aussichtsberg' },
    { id: 's7', tx: 8,  ty: 18, muenzen: 4, nahe: 'im Westen, wo die Küste einen Bogen macht' },
    { id: 's8', tx: 24, ty: 9,  muenzen: 2, nahe: 'kurz vor der Schatzhöhle, unter einem einzelnen Baum' }
  ];

  /* Die Bären. Sie lassen sich nicht zähmen — sie riechen nur die Süssigkeiten. */
  var BAEREN = {
    brumm: { name: 'Brumm',  fell: '#5a3a22' },
    tatze: { name: 'Tatze',  fell: '#6f4526' }
  };

  /* Die Affen der Insel */
  var AFFEN = {
    koko:  { name: 'Koko',  fell: '#8b5a2b' },
    nala:  { name: 'Nala',  fell: '#6b4423' },
    bimbo: { name: 'Bimbo', fell: '#a9713a' }
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

  /* ---------------- Datum & Woche ---------------- */
  function zwei(n) { return (n < 10 ? '0' : '') + n; }
  function tagesStempel(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + zwei(d.getMonth() + 1) + '-' + zwei(d.getDate());
  }
  /* ISO-Woche: Donnerstag entscheidet, zu welchem Jahr die Woche gehört. */
  function wochenStempel(d) {
    d = new Date(d || Date.now());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    var ersterDonnerstag = new Date(d.getFullYear(), 0, 4);
    ersterDonnerstag.setDate(ersterDonnerstag.getDate() + 3 - ((ersterDonnerstag.getDay() + 6) % 7));
    var nr = 1 + Math.round((d - ersterDonnerstag) / (7 * 24 * 3600 * 1000));
    return d.getFullYear() + '-W' + zwei(nr);
  }
  /* Immer dieselbe Auswahl für denselben Tag und dasselbe Kind. */
  function saat(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function wuerfel(startwert) {
    var z = startwert >>> 0;
    return function () {
      z = (z * 1664525 + 1013904223) >>> 0;
      return z / 4294967296;
    };
  }

  function leererSpielstand() {
    return { muenzen: 0, marken: 0, suessigkeiten: 0, uebungen: {}, besuche: {}, npc: {},
             affen: {}, wochen: {}, hinweise: 0, verraten: {}, wette: null, seit: Date.now() };
  }

  var Insel = {
    waelder: WAELDER,
    affenArten: AFFEN,
    baerenArten: BAEREN,
    schaetze: SCHAETZE,
    inselteile: INSELTEILE,
    garderobe: GARDEROBE,
    kinder: KINDER,
    faecher: FAECHER,
    spiele: SPIELE,
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

      /* Wochenwertung: zählt jedes Ergebnis, auch wenn es keine Münzen gibt. */
      var iso = wochenStempel();
      if (!stand.wochen) stand.wochen = {};
      if (!stand.wochen[iso]) stand.wochen[iso] = { punkte: 0, uebungen: 0 };
      var neuGemeistert = e.gemeistert && !warGemeistert;
      stand.wochen[iso].punkte += Math.round(pct / 10) + (neuGemeistert ? OEKONOMIE.wochenBonusMeister : 0);
      stand.wochen[iso].uebungen++;
      /* Alte Wochen aufräumen, sonst wächst der Speicher endlos. */
      var wochen = Object.keys(stand.wochen).sort();
      while (wochen.length > 10) delete stand.wochen[wochen.shift()];

      /* Ein Schatzhinweis für jede neu gemeisterte Übung. */
      if (neuGemeistert) stand.hinweise = (stand.hinweise || 0) + 1;

      /* Tagesauftrag abhaken. */
      var auftrag = null;
      var a = stand.tagesauftrag;
      if (a && a.datum === tagesStempel()) {
        var zeile = a.sets.filter(function (x) { return x.fach === opts.fach && x.set === opts.set; })[0];
        if (zeile) {
          if (pct > (zeile.best || 0)) zeile.best = pct;
          if (!zeile.fertig && pct >= OEKONOMIE.auftragMindest) zeile.fertig = true;
        }
        var fertig = a.sets.filter(function (x) { return x.fertig; }).length;
        var bonus = 0;
        if (fertig === a.sets.length && !a.bonusAbgeholt) {
          a.bonusAbgeholt = true;
          bonus = OEKONOMIE.auftragBonus;
          stand.muenzen += bonus;
          stand.hinweise = (stand.hinweise || 0) + 1;
        }
        auftrag = { dabei: !!zeile, fertig: fertig, gesamt: a.sets.length,
                    bonus: bonus, geschafft: zeile ? !!zeile.fertig : false };
      }

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
        neuGemeistert: neuGemeistert,
        auftrag: auftrag,
        hinweise: stand.hinweise || 0,
        wochenPunkte: stand.wochen[iso].punkte,
        ersteMal: e.versuche === 1,
        best: e.best,
        grund: grund,
        wette: wettErgebnis
      };
    },

    uebung: function (fach, set, who) {
      return this.stand(who).uebungen[fach + ':' + set] || null;
    },

    /* ---------------- Tagesauftrag ----------------
       Jeden Tag drei Übungen quer durch die Fächer. Wer alle drei schafft,
       bekommt einen Bonus und einen Schatzhinweis. Die Auswahl hängt nur am
       Datum und am Namen — beide Kinder sehen ihre Liste den ganzen Tag gleich.
       'katalog' ist eine Liste {fach, set, titel, schwierigkeit}; ohne Katalog
       kommt nur zurück, was schon gespeichert ist. */
    heute: function () { return tagesStempel(); },
    isoWoche: function (d) { return wochenStempel(d); },

    /* Alle Übungen, die für dieses Kind in Frage kommen — quer über die Fächer.
       Braucht uebungen.js; Seiten ohne Katalog rufen tagesauftrag() ohne Argument auf. */
    katalogAus: function (Uebungen, who) {
      if (!Uebungen || !Uebungen.fuer) return [];
      var kl = this.klasse(who), out = [];
      Object.keys(FAECHER).forEach(function (f) {
        Uebungen.fuer(f, kl).eigene.forEach(function (u) {
          out.push({ fach: f, set: u.id, titel: u.titel, schwierigkeit: u.schwierigkeit });
        });
      });
      return out;
    },

    tagesauftrag: function (katalog, who) {
      who = who || this.who();
      var stand = this.stand(who);
      var tag = tagesStempel();
      var a = stand.tagesauftrag;
      if (a && a.datum === tag) return a;
      if (!katalog || !katalog.length) return null;

      var rnd = wuerfel(saat(tag + '|' + who));
      var pool = katalog.slice();
      var gewaehlt = [];
      var wieViele = Math.min(OEKONOMIE.auftragAnzahl, pool.length);
      /* Erst je Fach höchstens eine Übung, damit der Auftrag durchmischt ist. */
      var faecherDrin = {};
      for (var runde = 0; runde < 2 && gewaehlt.length < wieViele; runde++) {
        for (var i = pool.length - 1; i >= 0 && gewaehlt.length < wieViele; i--) {
          var idx = Math.floor(rnd() * pool.length);
          var k = pool[idx];
          if (!k) continue;
          if (runde === 0 && faecherDrin[k.fach]) continue;
          faecherDrin[k.fach] = 1;
          gewaehlt.push({ fach: k.fach, set: k.set, titel: k.titel || k.set,
                          schwierigkeit: k.schwierigkeit || 'leicht', fertig: false, best: 0 });
          pool.splice(idx, 1);
        }
      }
      a = { datum: tag, sets: gewaehlt, bonusAbgeholt: false };
      stand.tagesauftrag = a;
      this._speichern(who, stand);
      return a;
    },
    auftragOffen: function (who) {
      var a = this.stand(who).tagesauftrag;
      if (!a || a.datum !== tagesStempel()) return null;
      var fertig = a.sets.filter(function (x) { return x.fertig; }).length;
      return { gesamt: a.sets.length, fertig: fertig, offen: a.sets.length - fertig,
               bonusAbgeholt: !!a.bonusAbgeholt, sets: a.sets };
    },
    /* Steht diese Übung heute auf dem Zettel? */
    imAuftrag: function (fach, set, who) {
      var a = this.stand(who).tagesauftrag;
      if (!a || a.datum !== tagesStempel()) return null;
      return a.sets.filter(function (x) { return x.fach === fach && x.set === set; })[0] || null;
    },

    /* ---------------- Wochenwertung ----------------
       Punkte sammeln sich pro Kalenderwoche. Nichts wird gelöscht, die Woche
       ist einfach der Schlüssel — so lässt sich auch später nachschauen. */
    wochenPunkte: function (iso, who) {
      var w = (this.stand(who).wochen || {})[iso || wochenStempel()];
      return w ? { punkte: w.punkte || 0, uebungen: w.uebungen || 0 } : { punkte: 0, uebungen: 0 };
    },
    wochenTabelle: function (iso) {
      iso = iso || wochenStempel();
      var self = this;
      var reihen = Object.keys(KINDER).map(function (k) {
        var w = self.wochenPunkte(iso, k);
        return { name: k, punkte: w.punkte, uebungen: w.uebungen };
      });
      reihen.sort(function (a, b) { return (b.punkte - a.punkte) || (b.uebungen - a.uebungen); });
      return reihen;
    },
    /* Sieger einer Woche. Null bei null Punkten oder Gleichstand an der Spitze. */
    wochenSieger: function (iso) {
      var t = this.wochenTabelle(iso);
      if (!t.length || !t[0].punkte) return null;
      if (t.length > 1 && t[1].punkte === t[0].punkte) return null;
      return t[0];
    },
    letzteWoche: function () { return wochenStempel(new Date(Date.now() - 7 * 24 * 3600 * 1000)); },
    /* Sekunden bis Sonntag, 24 Uhr — für die Restanzeige. */
    wochenRest: function () {
      var jetzt = new Date();
      var ende = new Date(jetzt);
      var bisSonntag = (7 - ((jetzt.getDay() + 6) % 7)) - 1;
      ende.setDate(ende.getDate() + bisSonntag);
      ende.setHours(24, 0, 0, 0);
      return Math.max(0, Math.round((ende - jetzt) / 1000));
    },

    /* ---------------- Schatzhinweise ----------------
       Hinweise gibt es nicht geschenkt: für jede gemeisterte Übung einen,
       und einen für den erfüllten Tagesauftrag. Käpten Krümel löst sie ein. */
    hinweisGuthaben: function (who) { return this.stand(who).hinweise || 0; },
    schatzVerraten: function (id, who) { return !!(this.stand(who).verraten || {})[id]; },
    verrateneSchaetze: function (who) {
      var v = this.stand(who).verraten || {}, self = this;
      return SCHAETZE.filter(function (x) { return v[x.id] && !self.schatzGehoben(x.id, who); });
    },
    /* Einen Hinweis eintauschen. Rückgabe: { ok, schatz } oder { ok:false, grund }. */
    hinweisEinloesen: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      if (!stand.verraten) stand.verraten = {};
      var offen = this.offeneSchaetze(who);
      if (!offen.length) return { ok: false, grund: 'alle' };
      var neu = offen.filter(function (x) { return !stand.verraten[x.id]; });
      if (!neu.length) return { ok: false, grund: 'schonVerraten', schatz: offen[0] };
      if ((stand.hinweise || 0) < 1) return { ok: false, grund: 'kein' };
      stand.hinweise--;
      stand.verraten[neu[0].id] = Date.now();
      this._speichern(who, stand);
      return { ok: true, schatz: neu[0], guthaben: stand.hinweise, offen: neu.length - 1 };
    },

    uebungenImFach: function (fach, who) {
      var alle = this.stand(who).uebungen, out = [];
      for (var k in alle) if (alle[k].fach === fach) out.push(alle[k]);
      return out;
    },

    /* Gibt es hier noch Münzen?
       Rückgabe: { zahlt, art, kurz, text, versuche, best }
       art: 'neu' | 'offen' | 'wiederholen' | 'abgeholt' | 'gemeistert'
       Dieselben Regeln wie in melden() — wer hier etwas ändert, muss dort auch schauen. */
    muenzStatus: function (fach, set, schwierigkeit, who) {
      var e = this.uebung(fach, set, who);
      var schwer = schwierigkeit === 'schwer';
      var basis = { versuche: e ? e.versuche || 0 : 0, best: e ? e.best || 0 : 0,
                    muenzenTotal: e ? e.muenzenTotal || 0 : 0 };

      function mit(o) { for (var k in basis) o[k] = basis[k]; return o; }

      if (!e || !e.versuche) {
        return mit({ zahlt: true, art: 'neu', kurz: '🪙 noch offen',
                     text: schwer
                       ? 'Noch nicht probiert — hier gibt es jedes Mal Münzen, bis du sie meisterst.'
                       : 'Noch nicht probiert — beim ersten guten Ergebnis gibt es Münzen.' });
      }
      if (schwer) {
        if (e.gemeistert) {
          return mit({ zahlt: false, art: 'gemeistert', kurz: '✔ gemeistert · keine Münzen mehr',
                       text: 'Mit ' + e.best + ' % gemeistert. Üben kannst du weiter, Münzen gibt es keine mehr.' });
        }
        return mit({ zahlt: true, art: 'wiederholen', kurz: '🪙 zahlt weiter',
                     text: 'Bis ' + OEKONOMIE.meisterAb + ' % gibt es jedes Mal Münzen. Bestwert: ' + e.best + ' %.' });
      }
      if (e.bezahlt) {
        return mit({ zahlt: false, art: 'abgeholt', kurz: '✔ Münzen abgeholt',
                     text: 'Die Münzen für diese Übung hast du schon. Üben darfst du weiter — Münzen gibt es keine mehr.' });
      }
      return mit({ zahlt: true, art: 'offen', kurz: '🪙 noch offen',
                   text: 'Beim ersten Ergebnis ab ' + OEKONOMIE.mindestensFuerMuenzen +
                         ' % gibt es Münzen. Bisher bester Versuch: ' + e.best + ' %.' });
    },

    /* Sammelstatus über mehrere Runden eines Spiels (z. B. drei Strecken).
       sets = Liste von Set-Namen. Rückgabe zusätzlich: { offen, gesamt } */
    muenzStatusGruppe: function (fach, sets, schwierigkeit, who) {
      var self = this, offen = 0, gespielt = 0;
      sets.forEach(function (s) {
        var st = self.muenzStatus(fach, s, schwierigkeit, who);
        if (st.zahlt) offen++;
        if (st.versuche) gespielt++;
      });
      var gesamt = sets.length;
      if (!gespielt) {
        return { zahlt: true, art: 'neu', offen: offen, gesamt: gesamt, gespielt: 0,
                 kurz: '🪙 noch offen', text: 'Noch nicht gespielt.' };
      }
      if (!offen) {
        return { zahlt: false, art: 'abgeholt', offen: 0, gesamt: gesamt, gespielt: gespielt,
                 kurz: '✔ alles abgeholt', text: 'Alle ' + gesamt + ' Runden gespielt — hier gibt es keine Münzen mehr.' };
      }
      return { zahlt: true, art: 'offen', offen: offen, gesamt: gesamt, gespielt: gespielt,
               kurz: '🪙 ' + offen + ' von ' + gesamt + ' offen',
               text: offen + ' von ' + gesamt + ' Runden zahlen noch Münzen.' };
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

    /* ---------------- Süssigkeiten ---------------- */
    suessigkeiten: function (who) { return this.stand(who).suessigkeiten || 0; },
    suessigkeitKaufen: function (anzahl, who) {
      anzahl = Math.max(1, anzahl || 1);
      var stand = this.stand(who);
      var preis = OEKONOMIE.suessigkeitPreis * anzahl;
      if ((stand.muenzen || 0) < preis) return { ok: false, fehlt: preis - (stand.muenzen || 0) };
      stand.muenzen -= preis;
      stand.suessigkeiten = (stand.suessigkeiten || 0) + anzahl;
      this._speichern(who, stand);
      return { ok: true, suessigkeiten: stand.suessigkeiten, muenzen: stand.muenzen };
    },

    /* ---------------- Affen ----------------
       Ein gefütterter Affe bleibt zehn Minuten zahm. Läuft die Zeit ab,
       holt er sich seine Münzen selber. */
    affe: function (id, who) {
      var stand = this.stand(who);
      if (!stand.affen) stand.affen = {};
      if (!stand.affen[id]) stand.affen[id] = { bis: 0, gefuettert: 0, gestohlen: 0, fundAb: 0 };
      return stand.affen[id];
    },
    affeZahm: function (id, who) {
      return this.affe(id, who).bis > Date.now();
    },
    affeRest: function (id, who) {     /* 0 … 1 */
      var a = this.affe(id, who);
      var rest = (a.bis - Date.now()) / 1000;
      if (rest <= 0) return 0;
      return Math.min(1, rest / OEKONOMIE.zaehmDauer);
    },
    affeRestSekunden: function (id, who) {
      return Math.max(0, Math.round((this.affe(id, who).bis - Date.now()) / 1000));
    },

    affeFuettern: function (id, who) {
      who = who || this.who();
      var stand = this.stand(who);
      if ((stand.suessigkeiten || 0) < 1) return { ok: false, grund: 'keine' };
      if (!stand.affen) stand.affen = {};
      if (!stand.affen[id]) stand.affen[id] = { bis: 0, gefuettert: 0, gestohlen: 0, fundAb: 0 };
      var a = stand.affen[id];
      var warZahm = a.bis > Date.now();
      stand.suessigkeiten--;
      a.bis = Date.now() + OEKONOMIE.zaehmDauer * 1000;
      a.gefuettert++;
      if (!a.fundAb) a.fundAb = Date.now();
      this._speichern(who, stand);
      return { ok: true, warZahm: warZahm, bis: a.bis, suessigkeiten: stand.suessigkeiten };
    },

    /* Beim Betreten der Insel nachrechnen, was in der Zwischenzeit geschah. */
    affenPruefen: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      if (!stand.affen) return [];
      var jetzt = Date.now(), meldungen = [], geaendert = false;

      Object.keys(stand.affen).forEach(function (id) {
        var a = stand.affen[id];
        var name = (AFFEN[id] && AFFEN[id].name) || id;

        /* Zahmer Affe findet ab und zu eine Münze. */
        if (a.bis > jetzt && a.fundAb) {
          var takte = Math.floor((jetzt - a.fundAb) / (OEKONOMIE.affenFundTakt * 1000));
          if (takte > 0) {
            var fund = takte * OEKONOMIE.affenFund;
            stand.muenzen = (stand.muenzen || 0) + fund;
            a.fundAb += takte * OEKONOMIE.affenFundTakt * 1000;
            a.gefunden = (a.gefunden || 0) + fund;
            meldungen.push({ art: 'fund', affe: id, name: name, muenzen: fund });
            geaendert = true;
          }
        }

        /* Zeit abgelaufen und noch nicht abgerechnet: er stiehlt. */
        if (a.bis && a.bis <= jetzt && !a.abgerechnet) {
          var weg = Math.min(OEKONOMIE.affenDiebstahl, stand.muenzen || 0);
          stand.muenzen = (stand.muenzen || 0) - weg;
          a.gestohlen = (a.gestohlen || 0) + weg;
          a.abgerechnet = true;
          a.fundAb = 0;
          meldungen.push({ art: 'diebstahl', affe: id, name: name, muenzen: weg });
          geaendert = true;
        }
        if (a.bis > jetzt) a.abgerechnet = false;
      });

      if (geaendert) this._speichern(who, stand);
      return meldungen;
    },

    /* ---------------- Spelunke: das Gebräu ----------------
       Nach dem dritten Glas ist der Abend vorbei: halbe Kasse und
       irgendwo im Wald aufwachen. */
    /* Der Rausch baut sich linear ab: was beim letzten Glas da war, ist nach
       gebraeuVerfall Sekunden wieder weg. Rückgabe ist eine Kommazahl,
       damit das Wackeln stetig nachlässt statt in Stufen zu springen. */
    rausch: function (who) {
      var g = this.stand(who).gebraeu;
      if (!g) return 0;
      /* Alte Spielstände kannten nur ganze Gläser. */
      var stufe = g.stufe !== undefined ? g.stufe : (g.glaeser || 0);
      if (!stufe || !g.zuletzt) return 0;
      var vergangen = (Date.now() - g.zuletzt) / 1000;
      var rest = stufe * (1 - vergangen / OEKONOMIE.gebraeuVerfall);
      return Math.max(0, Math.min(OEKONOMIE.gebraeuMax, rest));
    },
    /* Ganze Gläser — für Anzeigen wie „2 von 3“. */
    gebraeuke: function (who) { return Math.ceil(this.rausch(who) - 0.001); },
    /* Sekunden, bis der Rausch ganz weg ist. */
    rauschRest: function (who) {
      var g = this.stand(who).gebraeu;
      if (!g || !g.zuletzt) return 0;
      var stufe = g.stufe !== undefined ? g.stufe : (g.glaeser || 0);
      if (!stufe) return 0;
      var vergangen = (Date.now() - g.zuletzt) / 1000;
      return Math.max(0, Math.round(OEKONOMIE.gebraeuVerfall - vergangen));
    },
    trinken: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      if (!stand.gebraeu) stand.gebraeu = { stufe: 0, zuletzt: 0 };
      if ((stand.muenzen || 0) < OEKONOMIE.gebraeuPreis) {
        return { ok: false, fehlt: OEKONOMIE.gebraeuPreis - (stand.muenzen || 0) };
      }
      var vorher = this.rausch(who);
      stand.muenzen -= OEKONOMIE.gebraeuPreis;
      stand.gebraeu = { stufe: vorher + 1, zuletzt: Date.now() };

      var ergebnis = { ok: true, glaeser: Math.ceil(stand.gebraeu.stufe - 0.001),
                       stufe: stand.gebraeu.stufe, blackout: false };
      /* Kleine Toleranz: zwischen zwei Gläsern nüchtert man schon ein wenig aus,
         drei Gläser hintereinander sollen trotzdem sicher zum Blackout führen. */
      if (stand.gebraeu.stufe + 0.2 >= OEKONOMIE.gebraeuMax) {
        var verloren = Math.floor((stand.muenzen || 0) / 2);
        stand.muenzen -= verloren;
        stand.gebraeu = { stufe: 0, zuletzt: 0 };
        var ids = Object.keys(WAELDER);
        var wald = ids[Math.floor(Math.random() * ids.length)];
        stand.aufwachen = wald;
        ergebnis.blackout = true;
        ergebnis.verloren = verloren;
        ergebnis.wald = wald;
        ergebnis.waldName = WAELDER[wald].name;
      }
      stand.muenzen = Math.max(0, stand.muenzen);
      this._speichern(who, stand);
      ergebnis.muenzen = stand.muenzen;
      return ergebnis;
    },
    /* Wo wacht der Spieler auf? Wird beim Abholen gelöscht. */
    /* ---------------- Bären ----------------
       Ein Bär folgt der Nase, nicht dem Herzen: Süssigkeiten locken ihn an,
       zähmen lässt er sich nicht. Erwischt er dich, ist die Tüte leer.
       Hast du nichts dabei, schleift er dich zum Rechenturm. */
    baerStand: function (id, who) {
      var b = this.stand(who).baeren || {};
      return b[id] || { gefressen: 0, geschleppt: 0, sattBis: 0 };
    },
    baerSatt: function (id, who) {
      return this.baerStand(id, who).sattBis > Date.now();
    },
    /* Der Bär erwischt den Spieler. Rückgabe sagt, was passiert ist. */
    baerErwischt: function (id, who) {
      who = who || this.who();
      var stand = this.stand(who);
      if (!stand.baeren) stand.baeren = {};
      if (!stand.baeren[id]) stand.baeren[id] = { gefressen: 0, geschleppt: 0, sattBis: 0 };
      var b = stand.baeren[id];
      var hatte = stand.suessigkeiten || 0;
      var art;
      if (hatte > 0) {
        stand.suessigkeiten = 0;
        b.gefressen += hatte;
        b.sattBis = Date.now() + OEKONOMIE.baerSattDauer * 1000;
        art = 'gefressen';
      } else {
        b.geschleppt++;
        b.sattBis = Date.now() + OEKONOMIE.baerSattDauer * 1000;
        art = 'geschleppt';
      }
      this._speichern(who, stand);
      return { art: art, suessigkeiten: hatte, gefressen: b.gefressen, geschleppt: b.geschleppt,
               name: (BAEREN[id] || {}).name || id };
    },

    /* ---------------- Freischaltbare Inselteile ---------------- */
    /* Wie viele gemeisterte Übungen hat das Kind insgesamt? */
    gemeistertGesamt: function (who) {
      var alle = this.stand(who).uebungen, n = 0;
      for (var k in alle) if (alle[k].gemeistert) n++;
      return n;
    },
    /* Ist dieser Teil schon offen? Rückgabe mit Fortschritt für die Anzeige. */
    teilStand: function (id, who) {
      var teil = INSELTEILE.filter(function (t) { return t.id === id; })[0];
      if (!teil) return null;
      var b = teil.bedingung;
      var ist, soll, was;
      if (b.sterne !== undefined) {
        ist = this.sterneGesamt(who); soll = b.sterne; was = 'Sterne';
      } else {
        ist = this.gemeistertGesamt(who); soll = b.gemeistert; was = 'gemeisterte Übungen';
      }
      var offen = ist >= soll;
      /* Einmal offen, bleibt offen — auch wenn später etwas zurückgesetzt wird. */
      var stand = this.stand(who);
      if (!stand.teile) stand.teile = {};
      if (offen && !stand.teile[id]) {
        stand.teile[id] = Date.now();
        this._speichern(who, stand);
      }
      if (stand.teile[id]) offen = true;
      return { id: id, teil: teil, offen: offen, ist: ist, soll: soll, was: was,
               fehlt: Math.max(0, soll - ist), frisch: false };
    },
    teilOffen: function (id, who) {
      var st = this.teilStand(id, who);
      return !!(st && st.offen);
    },
    /* Teile, die seit dem letzten Nachsehen dazugekommen sind. */
    neueTeile: function (who) {
      who = who || this.who();
      var self = this, stand = this.stand(who);
      if (!stand.teileGesehen) stand.teileGesehen = {};
      var neu = [];
      INSELTEILE.forEach(function (t) {
        var st = self.teilStand(t.id, who);
        if (st.offen && !stand.teileGesehen[t.id]) neu.push(t);
      });
      if (neu.length) {
        stand = this.stand(who);
        if (!stand.teileGesehen) stand.teileGesehen = {};
        neu.forEach(function (t) { stand.teileGesehen[t.id] = Date.now(); });
        this._speichern(who, stand);
      }
      return neu;
    },
    /* Der Leuchtturm verrät einmal am Tag eine Stelle. */
    leuchtturmTipp: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      var tag = tagesStempel();
      if (stand.turmTipp === tag) return { ok: false, grund: 'heuteSchon' };
      var offen = this.offeneSchaetze(who);
      if (!offen.length) return { ok: false, grund: 'alle' };
      if (!stand.verraten) stand.verraten = {};
      var neu = offen.filter(function (x) { return !stand.verraten[x.id]; });
      if (!neu.length) return { ok: false, grund: 'schonVerraten', schatz: offen[0] };
      stand.verraten[neu[0].id] = Date.now();
      stand.turmTipp = tag;
      this._speichern(who, stand);
      return { ok: true, schatz: neu[0], offen: neu.length - 1 };
    },

    /* ---------------- Schaufel & vergrabene Schätze ---------------- */
    hatSchaufel: function (who) { return !!this.stand(who).schaufel; },
    schaufelKaufen: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      if (stand.schaufel) return { ok: false, grund: 'schon' };
      if ((stand.muenzen || 0) < OEKONOMIE.schaufelPreis) {
        return { ok: false, grund: 'geld', fehlt: OEKONOMIE.schaufelPreis - (stand.muenzen || 0) };
      }
      stand.muenzen -= OEKONOMIE.schaufelPreis;
      stand.schaufel = true;
      this._speichern(who, stand);
      return { ok: true, muenzen: stand.muenzen };
    },
    schatzGehoben: function (id, who) {
      var g = this.stand(who).graben || {};
      return !!g[id];
    },
    /* Alle noch nicht gehobenen Schätze — für die Geschichten des Seebären. */
    offeneSchaetze: function (who) {
      var self = this;
      return SCHAETZE.filter(function (x) { return !self.schatzGehoben(x.id, who); });
    },
    graben: function (id, who) {
      who = who || this.who();
      var stand = this.stand(who);
      var schatz = SCHAETZE.filter(function (x) { return x.id === id; })[0];
      if (!schatz) return { ok: false, grund: 'nichts' };
      if (!stand.schaufel) return { ok: false, grund: 'schaufel' };
      if (!stand.graben) stand.graben = {};
      if (stand.graben[id]) return { ok: false, grund: 'leer' };
      stand.graben[id] = Date.now();
      stand.muenzen = (stand.muenzen || 0) + schatz.muenzen;
      this._speichern(who, stand);
      var offen = this.offeneSchaetze(who).length;
      return { ok: true, muenzen: schatz.muenzen, gesamt: stand.muenzen,
               gehoben: SCHAETZE.length - offen, alle: SCHAETZE.length, offen: offen };
    },

    aufwachenAbholen: function (who) {
      who = who || this.who();
      var stand = this.stand(who);
      var w = stand.aufwachen;
      if (w) { delete stand.aufwachen; this._speichern(who, stand); }
      return w && WAELDER[w] ? { id: w, name: WAELDER[w].name, x: WAELDER[w].x, y: WAELDER[w].y } : null;
    },
    ausnuechtern: function (who) {
      var stand = this.stand(who);
      stand.gebraeu = { stufe: 0, zuletzt: 0 };
      this._speichern(who, stand);
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
    /* Merkt sich, aus welchem Innenraum eine Übung gestartet wurde,
       damit man danach wieder dorthin zurückkommt und nicht auf die Insel. */
    merkeRaum: function (url) {
      try { sessionStorage.setItem('lerninsel.raum', url); } catch (e) {}
    },
    letzterRaum: function () {
      try { return sessionStorage.getItem('lerninsel.raum') || null; } catch (e) { return null; }
    },
    raumVergessen: function () {
      try { sessionStorage.removeItem('lerninsel.raum'); } catch (e) {}
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
        '<span style="background:#1e293b;border:2px solid #f9a8d4;border-radius:8px;padding:7px 10px;color:#f9a8d4">🍬 ' +
          this.suessigkeiten(who) + '</span>' +
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
