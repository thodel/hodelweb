/* ============================================================
   Lerninsel — Hintergrundmusik im Stil der 90er.
   Alles wird im Browser erzeugt (Web Audio API): Rechteck-Lead,
   Dreieck-Bass, Rausch-Percussion. Keine Audiodateien, nichts von aussen.
   ============================================================ */
(function (global) {
  'use strict';

  var KEY = 'lerninsel.musik';
  var ctx = null, master = null, timer = null, laufend = false, schrittNr = 0;

  /* Halbtöne über A0; Frequenz = 27.5 * 2^(n/12) */
  function f(name) {
    var namen = { C: 3, 'C#': 4, D: 5, 'D#': 6, E: 7, F: 8, 'F#': 9, G: 10, 'G#': 11, A: 12, 'A#': 13, B: 14 };
    var m = name.match(/^([A-G]#?)(\d)$/);
    if (!m) return 0;
    var halb = namen[m[1]] + (parseInt(m[2], 10) - 1) * 12;
    return 27.5 * Math.pow(2, halb / 12);
  }

  var TEMPO = 132;                    /* Schläge pro Minute */
  var SCHRITT = 60 / TEMPO / 2;       /* Achtelnoten */

  /* 32 Achtel = 4 Takte, dann wiederholt sich alles. */
  var LEAD = [
    'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5',
    'E5', 'G5', 'A5', 'B5', 'C6', 'B5', 'A5', 'G5',
    'F5', 'A5', 'C6', 'A5', 'F5', 'E5', 'D5', 'E5',
    'G5', 'F5', 'E5', 'D5', 'C5', 'D5', 'E5', 'G5'
  ];
  var BASS = [
    'C3', 0, 'C3', 0, 'G2', 0, 'G2', 0,
    'A2', 0, 'A2', 0, 'E3', 0, 'E3', 0,
    'F2', 0, 'F2', 0, 'C3', 0, 'C3', 0,
    'G2', 0, 'G2', 0, 'G2', 0, 'G2', 'B2'
  ];
  /* 1 = Bassdrum-artig, 2 = Hi-Hat */
  var BEAT = [
    1, 0, 2, 0, 1, 0, 2, 2,
    1, 0, 2, 0, 1, 0, 2, 0,
    1, 0, 2, 0, 1, 0, 2, 2,
    1, 0, 2, 0, 1, 2, 1, 2
  ];

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
    var puffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * laenge), ctx.sampleRate);
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
    while (naechsteZeit < ctx.currentTime + 0.25) {
      var i = schrittNr % 32;
      var note = LEAD[i];
      if (note) ton(f(note), naechsteZeit, SCHRITT * 0.9, 'square', 0.075);
      var b = BASS[i];
      if (b) ton(f(b), naechsteZeit, SCHRITT * 1.7, 'triangle', 0.16);
      if (BEAT[i]) schlag(BEAT[i], naechsteZeit);
      /* kleine Terz-Begleitung alle vier Achtel */
      if (note && i % 4 === 0) ton(f(note) * 0.7937, naechsteZeit, SCHRITT * 0.8, 'square', 0.035);
      naechsteZeit += SCHRITT;
      schrittNr++;
    }
    timer = setTimeout(planen, 60);
  }

  var Musik = {
    verfuegbar: function () {
      return !!(global.AudioContext || global.webkitAudioContext);
    },
    aktiv: function () {
      try { return localStorage.getItem(KEY) === 'an'; } catch (e) { return false; }
    },
    _merken: function (an) {
      try { localStorage.setItem(KEY, an ? 'an' : 'aus'); } catch (e) {}
    },
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
    },
    aus: function () {
      laufend = false;
      if (timer) { clearTimeout(timer); timer = null; }
      if (ctx && ctx.state === 'running') ctx.suspend();
      this._merken(false);
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
