/* ============================================================
   Lerninsel — Hintergrundmusik im Stil der 90er.
   Alles wird im Browser erzeugt (Web Audio API): Rechteck-Lead,
   Dreieck-Bass, Rausch-Percussion. Keine Audiodateien, nichts von aussen.
   Jeder Ort hat sein eigenes Stück — siehe STUECKE weiter unten.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'lerninsel.musik';
  var ctx = null, master = null, timer = null, laufend = false, schrittNr = 0;

  /* Halbtöne über A0; Frequenz = 27.5 * 2^(n/12) */
  function f(name) {
    var namen = { C: 3, 'C#': 4, D: 5, 'D#': 6, E: 7, F: 8, 'F#': 9, G: 10, 'G#': 11, A: 12, 'A#': 13, B: 14 };
    var m = String(name).match(/^([A-G]#?)(\d)$/);
    if (!m) return 0;
    var halb = namen[m[1]] + (parseInt(m[2], 10) - 1) * 12;
    return 27.5 * Math.pow(2, halb / 12);
  }

  /* ---------------------------------------------------------
     Die Stücke. Jedes hat 32 Achtel = 4 Takte und wiederholt sich.
     'lead' ist die Melodie, 'bass' die Begleitung, 'beat' das
     Schlagwerk (1 = tiefe Trommel, 2 = Hi-Hat).
     --------------------------------------------------------- */
  var STUECKE = {
    /* Draussen auf der Insel: hell und schnell, wie ein Vorspann. */
    insel: {
      name: 'Inselwind', tempo: 132, form: 'square', laut: 0.075,
      lead: ['E5','G5','A5','G5','E5','D5','C5','D5',
             'E5','G5','A5','B5','C6','B5','A5','G5',
             'F5','A5','C6','A5','F5','E5','D5','E5',
             'G5','F5','E5','D5','C5','D5','E5','G5'],
      bass: ['C3',0,'C3',0,'G2',0,'G2',0,
             'A2',0,'A2',0,'E3',0,'E3',0,
             'F2',0,'F2',0,'C3',0,'C3',0,
             'G2',0,'G2',0,'G2',0,'G2','B2'],
      beat: [1,0,2,0,1,0,2,2, 1,0,2,0,1,0,2,0,
             1,0,2,0,1,0,2,2, 1,0,2,0,1,2,1,2]
    },

    /* Spelunke: langsam, in Moll, mit schwerem Beat. */
    spelunke: {
      name: 'Spelunken-Shuffle', tempo: 96, form: 'sawtooth', laut: 0.062,
      lead: ['A4',0,'C5','A4','E5',0,'D5','C5',
             'B4',0,'D5','B4','G4',0,'A4',0,
             'A4',0,'C5','E5','G5',0,'E5','D5',
             'C5','B4','A4',0,'E4',0,'A4',0],
      bass: ['A2',0,0,0,'A2',0,'E2',0,
             'G2',0,0,0,'G2',0,'D2',0,
             'F2',0,0,0,'F2',0,'C3',0,
             'E2',0,0,0,'E2',0,'E2','G2'],
      beat: [1,0,0,2,1,0,2,0, 1,0,0,2,1,0,2,0,
             1,0,0,2,1,0,2,0, 1,0,0,2,1,2,1,2]
    },

    /* Rechenturm: gleichmässig wie ein Metronom, alles auf Zack. */
    mathe: {
      name: 'Turmuhr', tempo: 126, form: 'square', laut: 0.068,
      lead: ['C5','E5','G5','E5','C5','E5','G5','E5',
             'D5','F5','A5','F5','D5','F5','A5','F5',
             'E5','G5','B5','G5','E5','G5','B5','G5',
             'F5','E5','D5','C5','G4','B4','D5','G5'],
      bass: ['C3',0,'C3',0,'C3',0,'C3',0,
             'D3',0,'D3',0,'D3',0,'D3',0,
             'E3',0,'E3',0,'E3',0,'E3',0,
             'F3',0,'G3',0,'C3',0,'C3',0],
      beat: [1,0,2,0,1,0,2,0, 1,0,2,0,1,0,2,0,
             1,0,2,0,1,0,2,0, 1,0,2,0,1,0,2,2]
    },

    /* Schreiberhütte: ruhig, fast wie eine Spieldose. */
    deutsch: {
      name: 'Federkiel', tempo: 108, form: 'triangle', laut: 0.085,
      lead: ['F5',0,'A5',0,'C6',0,'A5',0,
             'G5',0,'B5',0,'D6',0,'B5',0,
             'A5',0,'F5',0,'D5',0,'F5',0,
             'C5',0,'E5',0,'F5',0,0,0],
      bass: ['F2',0,0,0,'C3',0,0,0,
             'G2',0,0,0,'D3',0,0,0,
             'A2',0,0,0,'F2',0,0,0,
             'C3',0,0,0,'F2',0,0,0],
      beat: [1,0,0,0,2,0,0,0, 1,0,0,0,2,0,0,0,
             1,0,0,0,2,0,0,0, 1,0,0,0,2,0,2,0]
    },

    /* Piratenschiff: Shanty, schwankend wie das Deck. */
    englisch: {
      name: 'Anker auf', tempo: 116, form: 'square', laut: 0.072,
      lead: ['D5','D5','F5','A5',0,'A5','G5','F5',
             'E5',0,'E5','G5',0,'G5','F5','E5',
             'D5','D5','F5','A5',0,'D6','C6','A5',
             'G5','F5','E5','D5',0,'A4','D5',0],
      bass: ['D2',0,'A2',0,'D2',0,'A2',0,
             'C3',0,'G2',0,'C3',0,'G2',0,
             'B2',0,'F2',0,'B2',0,'F2',0,
             'A2',0,'A2',0,'D2',0,'D2',0],
      beat: [1,0,2,2,1,0,2,0, 1,0,2,2,1,0,2,0,
             1,0,2,2,1,0,2,0, 1,2,1,2,1,0,2,2]
    },

    /* Aussichtsberg: weit und offen, viele Quinten. */
    nmg: {
      name: 'Weite Sicht', tempo: 112, form: 'triangle', laut: 0.08,
      lead: ['G5',0,'D5',0,'G5','A5','B5',0,
             'D6',0,'B5',0,'A5',0,'G5',0,
             'E5',0,'B4',0,'E5','F#5','G5',0,
             'A5',0,'G5','F#5','E5',0,'D5',0],
      bass: ['G2',0,0,0,'D3',0,0,0,
             'G2',0,0,0,'D3',0,0,0,
             'E2',0,0,0,'B2',0,0,0,
             'A2',0,0,0,'D3',0,0,0],
      beat: [1,0,0,2,1,0,0,2, 1,0,0,2,1,0,0,2,
             1,0,0,2,1,0,0,2, 1,0,0,2,1,0,2,2]
    },

    /* Leuchtturm: langsam, wenige Töne, viel Platz dazwischen. */
    leuchtturm: {
      name: 'Langer Blick', tempo: 84, form: 'triangle', laut: 0.09,
      lead: ['A5',0,0,0,'E5',0,0,0,
             'F5',0,0,0,'C5',0,0,0,
             'D5',0,0,0,'A4',0,0,0,
             'E5',0,0,'D5','C5',0,0,0],
      bass: ['A2',0,0,0,0,0,0,0,
             'F2',0,0,0,0,0,0,0,
             'D2',0,0,0,0,0,0,0,
             'E2',0,0,0,0,0,0,0],
      beat: [1,0,0,0,0,0,0,0, 1,0,0,0,0,0,0,0,
             1,0,0,0,0,0,0,0, 1,0,0,0,2,0,0,0]
    },

    /* Sternwarte: hoch, sparsam, ein bisschen schwerelos. */
    sternwarte: {
      name: 'Nachtkuppel', tempo: 92, form: 'sine', laut: 0.11,
      lead: ['E6',0,'B5',0,'C6',0,0,0,
             'G5',0,'E5',0,'G5',0,0,0,
             'A5',0,'E6',0,'D6',0,0,0,
             'B5',0,'G5',0,'E5',0,0,0],
      bass: ['A2',0,0,0,0,0,'E3',0,
             'C3',0,0,0,0,0,'G2',0,
             'F2',0,0,0,0,0,'C3',0,
             'E2',0,0,0,0,0,'B2',0],
      beat: [0,0,2,0,0,0,0,0, 0,0,2,0,0,0,0,0,
             0,0,2,0,0,0,0,0, 0,0,2,0,0,0,2,0]
    },

    /* Nebelturm: Musette im Nebel — d-Moll, ein chromatischer Schritt, der
       nicht ganz geheuer klingt, und eine Trommel, die nur manchmal klopft. */
    franzoesisch: {
      name: 'Valse du brouillard', tempo: 96, form: 'triangle', laut: 0.09,
      lead: ['D5',0,'F5',0,'A5',0,'G#5',0,
             'A5',0,0,0,'E5',0,'F5',0,
             'D5',0,'F5',0,'A5',0,'C6',0,
             'B5',0,'A#5',0,'A5',0,0,0],
      bass: ['D2',0,'A2',0,'D3',0,'A2',0,
             'C#2',0,'A2',0,'E3',0,'A2',0,
             'D2',0,'A2',0,'F3',0,'A2',0,
             'A#1',0,'F2',0,'A2',0,'A1',0],
      beat: [1,0,0,0,2,0,0,0, 1,0,0,0,2,0,0,0,
             1,0,0,0,2,0,0,0, 1,0,0,2,0,0,2,0]
    },

    /* Fischerbucht: gemütlich, schaukelnd. */
    bucht: {
      name: 'Stegwellen', tempo: 104, form: 'triangle', laut: 0.082,
      lead: ['C5',0,'E5','G5',0,'E5',0,'C5',
             'D5',0,'F5','A5',0,'F5',0,'D5',
             'E5',0,'G5','C6',0,'G5',0,'E5',
             'D5','C5','B4','C5',0,'G4',0,0],
      bass: ['C3',0,0,'G2',0,0,'C3',0,
             'D3',0,0,'A2',0,0,'D3',0,
             'E3',0,0,'B2',0,0,'E3',0,
             'G2',0,0,'G2',0,0,'C3',0],
      beat: [1,0,0,2,0,0,1,0, 1,0,0,2,0,0,1,0,
             1,0,0,2,0,0,1,0, 1,0,0,2,0,2,1,2]
    },

    /* Kino: kleine Fanfare vor dem Film. */
    kino: {
      name: 'Vorfilm', tempo: 120, form: 'square', laut: 0.07,
      lead: ['C5','E5','G5','C6',0,'G5','E5','G5',
             'F5','A5','C6','F6',0,'C6','A5','C6',
             'G5','B5','D6','G6',0,'D6','B5','G5',
             'E5','F5','G5','A5','B5','C6',0,0],
      bass: ['C3',0,'C3',0,'C3',0,'G2',0,
             'F2',0,'F2',0,'F2',0,'C3',0,
             'G2',0,'G2',0,'G2',0,'D3',0,
             'C3',0,'C3',0,'G2',0,'C3',0],
      beat: [1,0,2,0,1,2,2,0, 1,0,2,0,1,2,2,0,
             1,0,2,0,1,2,2,0, 1,2,1,2,1,2,1,2]
    },

    /* Musikhütte: Funk mit Offbeat, so laut wie es hier eben geht. */
    musikhuette: {
      name: 'Hüttengroove', tempo: 122, form: 'sawtooth', laut: 0.058,
      lead: [0,'D5',0,'F5','G5',0,'F5','D5',
             0,'C5',0,'D5','F5',0,'D5','C5',
             0,'A4',0,'C5','D5',0,'C5','A4',
             'G4',0,'A4','C5','D5','F5','D5','C5'],
      bass: ['D2','D2',0,'D2',0,'A2',0,'D2',
             'C2','C2',0,'C2',0,'G2',0,'C2',
             'A2','A2',0,'A2',0,'E2',0,'A2',
             'G2','G2',0,'G2',0,'D2',0,'D2'],
      beat: [1,0,2,2,1,0,2,0, 1,0,2,2,1,0,2,0,
             1,0,2,2,1,0,2,0, 1,2,2,2,1,2,1,2]
    },

    /* Kiosk und Inselhaus: kurz, freundlich, unaufdringlich. */
    laden: {
      name: 'Ladenglocke', tempo: 118, form: 'square', laut: 0.062,
      lead: ['G4','B4','D5',0,'E5',0,'D5',0,
             'C5','E5','G5',0,'A5',0,'G5',0,
             'F5',0,'E5',0,'D5',0,'C5',0,
             'B4',0,'D5',0,'G4',0,0,0],
      bass: ['G2',0,0,0,'D3',0,0,0,
             'C3',0,0,0,'G2',0,0,0,
             'F2',0,0,0,'C3',0,0,0,
             'G2',0,0,0,'G2',0,0,0],
      beat: [1,0,2,0,1,0,2,0, 1,0,2,0,1,0,2,0,
             1,0,2,0,1,0,2,0, 1,0,2,0,1,0,2,2]
    }
  };

  var aktiv = STUECKE.insel;
  var aktivId = 'insel';

  function schritt() { return 60 / aktiv.tempo / 2; }

  function ton(frequenz, zeit, dauer, form, lautstaerke) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = form;
    osc.frequency.setValueAtTime(frequenz, zeit);
    g.gain.setValueAtTime(0.0001, zeit);
    g.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
    osc.connect(g); g.connect(master);
    osc.start(zeit); osc.stop(zeit + dauer + 0.02);
  }

  function schlag(art, zeit) {
    var laenge = art === 1 ? 0.14 : 0.05;
    var puffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * laenge), ctx.sampleRate);
    var daten = puffer.getChannelData(0);
    for (var i = 0; i < daten.length; i++) {
      var abfall = 1 - i / daten.length;
      daten[i] = (Math.random() * 2 - 1) * abfall * abfall;
    }
    var src = ctx.createBufferSource();
    src.buffer = puffer;
    var filter = ctx.createBiquadFilter();
    filter.type = art === 1 ? 'lowpass' : 'highpass';
    filter.frequency.value = art === 1 ? 220 : 6000;
    var g = ctx.createGain();
    g.gain.value = art === 1 ? 0.5 : 0.14;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(zeit);
  }

  var naechsteZeit = 0;
  function planen() {
    if (!laufend) return;
    var S = schritt();
    while (naechsteZeit < ctx.currentTime + 0.25) {
      var laenge = aktiv.lead.length;
      var i = schrittNr % laenge;
      var note = aktiv.lead[i];
      if (note) ton(f(note), naechsteZeit, S * 0.9, aktiv.form, aktiv.laut);
      var b = aktiv.bass[i];
      if (b) ton(f(b), naechsteZeit, S * 1.7, 'triangle', 0.16);
      if (aktiv.beat[i]) schlag(aktiv.beat[i], naechsteZeit);
      /* kleine Terz-Begleitung alle vier Achtel */
      if (note && i % 4 === 0) ton(f(note) * 0.7937, naechsteZeit, S * 0.8, aktiv.form, aktiv.laut * 0.47);
      naechsteZeit += S;
      schrittNr++;
    }
    timer = setTimeout(planen, 60);
  }

  /* Anzeigen, die den Musikzustand zeigen, hören auf dieses Ereignis. */
  function melden() {
    try { document.dispatchEvent(new Event('musikwechsel')); } catch (e) {}
  }

  var Musik = {
    stuecke: STUECKE,

    verfuegbar: function () {
      return !!(global.AudioContext || global.webkitAudioContext);
    },
    aktiv: function () {
      try { return localStorage.getItem(KEY) === 'an'; } catch (e) { return false; }
    },
    _merken: function (an) {
      try { localStorage.setItem(KEY, an ? 'an' : 'aus'); } catch (e) {}
    },

    /* Stück wechseln. Läuft die Musik gerade, geht sie ohne Unterbruch weiter. */
    stueck: function (id) {
      if (!STUECKE[id] || id === aktivId) return aktivId;
      aktivId = id;
      aktiv = STUECKE[id];
      schrittNr = 0;
      if (laufend && ctx) naechsteZeit = Math.max(naechsteZeit, ctx.currentTime + 0.05);
      return aktivId;
    },
    aktuell: function () { return aktivId; },
    titel: function () { return aktiv.name; },

    an: function () {
      if (!this.verfuegbar() || laufend) return;
      if (!ctx) {
        var AC = global.AudioContext || global.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
      laufend = true;
      naechsteZeit = ctx.currentTime + 0.08;
      planen();
      this._merken(true);
      melden();
    },
    aus: function () {
      laufend = false;
      if (timer) { clearTimeout(timer); timer = null; }
      if (ctx && ctx.state === 'running') ctx.suspend();
      this._merken(false);
      melden();
    },
    umschalten: function () {
      if (laufend) { this.aus(); return false; }
      this.an(); return true;
    },
    laeuft: function () { return laufend; },

    /* Browser starten Ton erst nach einer Nutzeraktion. */
    beiErsterAktion: function () {
      var self = this;
      var start = function () {
        if (self.aktiv()) self.an();
        ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
          global.removeEventListener(e, start);
        });
      };
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (e) {
        global.addEventListener(e, start, { once: false });
      });
    }
  };

  global.Musik = Musik;
})(window);
