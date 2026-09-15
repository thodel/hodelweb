/* ============================================================
   Lerninsel — «Der Honigtopf», ein Pixelfilm fürs Kino ohne Internet.

   YouTube lässt sich nicht mitnehmen (siehe Issue #11). Dieser Film
   entsteht im Browser aus Rechtecken, wie die Insel selbst: kein Netz,
   keine fremden Rechte, rund eine Minute.

   Kurzfilm.starten(canvas, beiEnde) spielt ihn ab, Kurzfilm.stoppen()
   bricht ab. Kurzfilm.szenen() nennt Titel und Dauer — für Tests.
   ============================================================ */
(function (global) {
  'use strict';
  var px = global.Pixel ? global.Pixel.px : function (c, x, y, w, h, f) {
    c.fillStyle = f; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  var B = 320, H = 180;                       /* Bildgrösse, wird hochskaliert */
  var HIMMEL = '#1e3a5f', WIESE = '#3d7a34', WIESE2 = '#34682c';
  var FELL = '#5a3a22', FELLD = '#3f2817', AFFE = '#8b5a2b', AFFED = '#6b4423';
  var HONIG = '#f2c14e', HOLZ = '#8b5a2b', BLATT = '#2f7d3a', BLATTD = '#25642e';

  function landschaft(c, t, versatz) {
    px(c, 0, 0, B, H, HIMMEL);
    for (var s = 0; s < 18; s++) {
      var sx = (s * 53 + 11) % B, sy = (s * 29) % 70;
      c.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(t * 1.5 + s));
      px(c, sx, sy, 2, 2, '#e2e8f0');
      c.globalAlpha = 1;
    }
    px(c, 0, 120, B, H - 120, WIESE);
    for (var g = 0; g < 40; g++) {
      var gx = ((g * 37 - (versatz || 0)) % (B + 40) + B + 40) % (B + 40) - 20;
      px(c, gx, 124 + (g % 3) * 14, 3, 5, WIESE2);
    }
  }

  function baum(c, x, y) {
    px(c, x - 4, y - 34, 8, 34, HOLZ);
    px(c, x - 26, y - 62, 52, 22, BLATTD);
    px(c, x - 20, y - 72, 40, 14, BLATT);
    px(c, x - 12, y - 78, 24, 8, BLATT);
  }

  function topf(c, x, y, wackeln) {
    var w = Math.round(Math.sin(wackeln * 8) * 1);
    px(c, x - 8 + w, y - 12, 16, 12, HONIG);
    px(c, x - 10 + w, y - 15, 20, 4, '#c99a2e');
    px(c, x - 5 + w, y - 10, 5, 4, '#fde68a');
  }

  function baer(c, x, y, schritt, schlaeft) {
    var b = schlaeft ? 0 : Math.round(Math.sin(schritt * 9) * 2);
    px(c, x - 16, y - 26, 32, 22, FELL);            /* Körper */
    px(c, x - 16, y - 26, 32, 4, FELLD);
    px(c, x + 8, y - 38, 16, 14, FELL);             /* Kopf */
    px(c, x + 10, y - 42, 4, 4, FELLD);
    px(c, x + 19, y - 42, 4, 4, FELLD);
    px(c, x + 20, y - 33, 3, 2, '#1a1626');         /* Schnauze */
    if (schlaeft) px(c, x + 13, y - 33, 4, 1, '#1a1626');
    else px(c, x + 13, y - 34, 3, 3, '#1a1626');    /* Auge */
    px(c, x - 12, y - 6 + b, 8, 6, FELLD);          /* Beine */
    px(c, x + 4, y - 6 - b, 8, 6, FELLD);
  }

  function affe(c, x, y, schritt, mitTopf) {
    var b = Math.round(Math.sin(schritt * 11) * 2);
    px(c, x - 9, y - 20, 18, 16, AFFE);
    px(c, x + 4, y - 30, 13, 12, AFFE);
    px(c, x + 6, y - 33, 4, 4, AFFED);
    px(c, x + 14, y - 33, 4, 4, AFFED);
    px(c, x + 8, y - 26, 3, 3, '#1a1626');
    px(c, x - 14, y - 18, 6, 3, AFFED);             /* Schwanz */
    px(c, x - 7, y - 4 + b, 6, 5, AFFED);
    px(c, x + 3, y - 4 - b, 6, 5, AFFED);
    if (mitTopf) topf(c, x - 4, y - 20, schritt);
  }

  function text(c, zeilen, y) {
    c.font = 'bold 13px ui-monospace, Menlo, monospace';
    c.textAlign = 'center';
    zeilen.forEach(function (z, i) {
      var w = c.measureText(z).width + 12;
      px(c, B / 2 - w / 2, y + i * 20 - 12, w, 17, 'rgba(9,14,33,.75)');
      c.fillStyle = '#fde68a';
      c.fillText(z, B / 2, y + i * 20);
    });
    c.textAlign = 'left';
  }

  /* Jede Szene zeichnet einen Zeitpunkt zwischen 0 und ihrer Dauer. */
  var SZENEN = [
    { titel: 'Titel', dauer: 4, mal: function (c, t) {
        landschaft(c, t, 0);
        baum(c, 60, 140); baum(c, 268, 145);
        text(c, ['DER HONIGTOPF'], 70);
        text(c, ['ein Film von der Lerninsel'], 96);
      } },
    { titel: 'Brumm schläft', dauer: 9, mal: function (c, t) {
        landschaft(c, t, 0);
        baum(c, 70, 150);
        baer(c, 120, 150, 0, true);
        topf(c, 170, 150, 0);
        var z = Math.floor(t * 1.5) % 3;
        for (var i = 0; i <= z; i++) px(c, 150 + i * 9, 104 - i * 9, 4 + i, 4 + i, '#e2e8f0');
        text(c, ['Brumm macht Mittagsschlaf.'], 30);
      } },
    { titel: 'Der Affe kommt', dauer: 9, mal: function (c, t) {
        landschaft(c, t, 0);
        baum(c, 70, 150);
        baer(c, 120, 150, 0, true);
        var x = 300 - t * 14;
        affe(c, x, 150, t, false);
        if (t > 6) topf(c, x - 4, 130, t); else topf(c, 170, 150, 0);
        text(c, ['Koko riecht etwas Süsses.'], 30);
      } },
    { titel: 'Die Jagd', dauer: 14, mal: function (c, t) {
        landschaft(c, t, t * 60);
        baum(c, ((300 - t * 60) % 400 + 400) % 400, 150);
        affe(c, 210 - Math.sin(t) * 6, 150, t, true);
        baer(c, 90 + Math.sin(t * 1.1) * 6, 150, t, false);
        text(c, ['Halt! Das ist MEIN Honig!'], 30);
      } },
    { titel: 'Geteilt', dauer: 12, mal: function (c, t) {
        landschaft(c, t, 0);
        baum(c, 260, 150);
        baer(c, 110, 150, 0, false);
        affe(c, 195, 150, 0, false);
        topf(c, 152, 148, 0);
        if (t > 2) text(c, ['Zu zweit schmeckt es besser.'], 30);
        if (t > 7) text(c, ['ENDE'], 96);
      } }
  ];

  var laeuft = null;

  function starten(canvas, beiEnde) {
    stoppen();
    var c = canvas.getContext('2d');
    canvas.width = B; canvas.height = H;
    var start = null;
    var zustand = { abbruch: false };
    laeuft = zustand;
    function bild(jetzt) {
      if (zustand.abbruch) return;
      if (start === null) start = jetzt;
      var t = (jetzt - start) / 1000;
      var rest = t, szene = null, inSzene = 0;
      for (var i = 0; i < SZENEN.length; i++) {
        if (rest < SZENEN[i].dauer) { szene = SZENEN[i]; inSzene = rest; break; }
        rest -= SZENEN[i].dauer;
      }
      if (!szene) { laeuft = null; if (beiEnde) beiEnde(); return; }
      szene.mal(c, inSzene);
      /* Schwarzblende zwischen den Szenen */
      var blende = Math.min(1, Math.min(inSzene, szene.dauer - inSzene) / 0.6);
      if (blende < 1) { c.globalAlpha = 1 - blende; px(c, 0, 0, B, H, '#000'); c.globalAlpha = 1; }
      requestAnimationFrame(bild);
    }
    requestAnimationFrame(bild);
  }

  function stoppen() { if (laeuft) laeuft.abbruch = true; laeuft = null; }

  global.Kurzfilm = {
    starten: starten,
    stoppen: stoppen,
    szenen: function () { return SZENEN.map(function (s) { return { titel: s.titel, dauer: s.dauer }; }); },
    dauer: function () { return SZENEN.reduce(function (n, s) { return n + s.dauer; }, 0); },
    /* Für Tests: eine Szene auf einen Zeichenkontext malen. */
    malen: function (c, sekunde) {
      var rest = sekunde;
      for (var i = 0; i < SZENEN.length; i++) {
        if (rest < SZENEN[i].dauer) { SZENEN[i].mal(c, rest); return SZENEN[i].titel; }
        rest -= SZENEN[i].dauer;
      }
      return null;
    }
  };
})(window);
