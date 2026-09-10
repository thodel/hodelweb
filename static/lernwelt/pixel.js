/* ============================================================
   Lerninsel — gemeinsame Pixelgrafik
   Figuren, Farbhelfer, Canvas-Skalierung und Tablet-Steuerung.
   Insel und Innenräume zeichnen damit dieselben Avatare.
   ============================================================ */
(function (global) {
  'use strict';

  var SKIN_STD = '#f2c8a0', SKIN_D_STD = '#d9a97e';
  var HAIR_STD = '#5b3a1e', HAIR_L_STD = '#7a5029';
  var SCHWARZ = '#141824';

  function px(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function dunkler(hex, wieviel) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    var m = wieviel || 28;
    var n = parseInt(hex.slice(1), 16);
    return 'rgb(' + Math.max(0, (n >> 16) - m) + ',' +
                    Math.max(0, ((n >> 8) & 255) - Math.round(m * 0.93)) + ',' +
                    Math.max(0, (n & 255) - Math.round(m * 0.79)) + ')';
  }
  function heller(hex, wieviel) {
    if (!hex || hex.charAt(0) !== '#') return hex;
    var m = wieviel || 34;
    var n = parseInt(hex.slice(1), 16);
    return 'rgb(' + Math.min(255, (n >> 16) + m) + ',' +
                    Math.min(255, ((n >> 8) & 255) + Math.round(m * 0.82)) + ',' +
                    Math.min(255, (n & 255) + Math.round(m * 0.59)) + ')';
  }

  /* Spielfigur: 16x18, drei Richtungen, zwei Laufphasen.
     'teile' = { haut, hose, schuhe } — alles optional. */
  function drawHero(c, x, y, dir, frame, jacket, jacketD, haarFarbe, teile) {
    var top = y - 18, left = x - 6;
    var HAIR = haarFarbe || HAIR_STD;
    var HAIR_L = haarFarbe ? heller(haarFarbe) : HAIR_L_STD;
    teile = teile || {};
    var SKIN = teile.haut || SKIN_STD;
    var SKIN_D = teile.haut ? dunkler(teile.haut) : SKIN_D_STD;
    var HOSE = teile.hose || '#2f4d7a';
    var HOSE_D = teile.hose ? dunkler(teile.hose) : '#24406b';
    var SCHUH = teile.schuhe || '#1f2937';

    px(c, x - 6, y - 1, 12, 2, 'rgba(0,0,0,.22)');
    /* Beine */
    var swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    px(c, left + 1, top + 14, 4, 4, HOSE);
    px(c, left + 7, top + 14, 4, 4, HOSE_D);
    px(c, left + 1, top + 17 + (swing > 0 ? 1 : 0), 4, 1, SCHUH);
    px(c, left + 7, top + 17 + (swing < 0 ? 1 : 0), 4, 1, SCHUH);
    /* Körper */
    px(c, left + 1, top + 7, 10, 8, jacket);
    px(c, left + 1, top + 7, 10, 1, jacketD);
    px(c, left + 1, top + 14, 10, 1, jacketD);
    /* Arme */
    px(c, left - 1, top + 8, 2, 5, jacketD);
    px(c, left + 11, top + 8, 2, 5, jacketD);
    px(c, left - 1, top + 12, 2, 2, SKIN);
    px(c, left + 11, top + 12, 2, 2, SKIN);
    /* Kopf */
    px(c, left + 2, top + 1, 8, 7, SKIN);
    px(c, left + 2, top + 7, 8, 1, SKIN_D);
    px(c, left + 2, top, 8, 2, HAIR);
    px(c, left + 1, top + 1, 1, 4, HAIR);
    px(c, left + 10, top + 1, 1, 4, HAIR);
    px(c, left + 3, top, 3, 1, HAIR_L);
    if (dir === 'down') {
      px(c, left + 4, top + 4, 1, 2, SCHWARZ);
      px(c, left + 7, top + 4, 1, 2, SCHWARZ);
      px(c, left + 5, top + 6, 2, 1, '#c98d76');
    } else if (dir === 'up') {
      px(c, left + 2, top, 8, 6, HAIR);
      px(c, left + 3, top + 1, 3, 1, HAIR_L);
    } else {
      var rechts = dir === 'right';
      px(c, rechts ? left + 7 : left + 4, top + 4, 1, 2, SCHWARZ);
      px(c, rechts ? left + 9 : left + 2, top + 6, 1, 1, '#c98d76');
      px(c, rechts ? left + 2 : left + 7, top + 1, 3, 4, HAIR);
    }
  }

  /* Avatar eines Kindes als Zeichenargumente. */
  function avatarTeile(who) {
    if (!global.Insel) return { jacke: '#3b6fb0', jackeD: '#2c5289', haar: HAIR_STD, teile: {} };
    var a = Insel.avatar(who);
    return {
      jacke: a.shirt, jackeD: dunkler(a.shirt, 40), haar: a.haar,
      teile: { haut: a.haut, hose: a.hose, schuhe: a.schuhe }
    };
  }

  /* Sprechblase über einer Figur. */
  function blase(c, x, y, wackeln) {
    var hoch = Math.round(Math.sin(wackeln || 0) * 1);
    px(c, x - 4, y - 30 + hoch, 8, 6, 'rgba(248,250,252,.92)');
    px(c, x - 2, y - 25 + hoch, 3, 2, 'rgba(248,250,252,.92)');
    px(c, x - 3, y - 28 + hoch, 1, 1, '#1f2937');
    px(c, x - 1, y - 28 + hoch, 1, 1, '#1f2937');
    px(c, x + 1, y - 28 + hoch, 1, 1, '#1f2937');
  }

  /* Beschriftung unter einer Figur. */
  function schild(c, x, y, text, farbe) {
    c.font = '8px ui-monospace, monospace';
    c.textAlign = 'center';
    var w = c.measureText(text).width + 6;
    px(c, x - w / 2, y + 3, w, 9, 'rgba(9,14,33,.72)');
    c.fillStyle = farbe || '#e2e8f0';
    c.fillText(text, x, y + 10);
  }

  /* Ganzzahlige Skalierung, damit die Pixel scharf bleiben.
     Halbe Stufen sind erlaubt, alles darunter wird unscharf. */
  function stufe(f) { return Math.max(1, Math.floor(f * 2) / 2); }

  /* Canvas an das Fenster anpassen. opts:
       { canvas, breite, hoehe, rand, bandUnten, seiteMin }
     Rückgabe: die gewählte Stufe. */
  function anpassen(opts) {
    var cv = opts.canvas;
    var VIEW_W = opts.breite, VIEW_H = opts.hoehe;
    var rand = opts.rand === undefined ? 24 : opts.rand;
    var isTouch = matchMedia('(hover: none)').matches || 'ontouchstart' in window ||
                  new URLSearchParams(location.search).get('touch') === '1';
    var quer = window.innerWidth > window.innerHeight;
    var b = window.innerWidth, h = window.innerHeight;
    var s;
    if (isTouch && quer) {
      /* Querformat: die Steuerung sitzt links und rechts neben dem Bild. */
      s = stufe(Math.min((b - rand) / VIEW_W, (h - rand) / VIEW_H));
      var seiteMin = opts.seiteMin === undefined ? 96 : opts.seiteMin;
      while (s > 1 && (b - VIEW_W * s) / 2 < seiteMin) s -= 0.5;
    } else {
      var band = isTouch ? (opts.bandUnten === undefined ? 150 : opts.bandUnten) : 0;
      s = stufe(Math.min((b - rand) / VIEW_W, (h - rand - band) / VIEW_H));
    }
    cv.width = VIEW_W; cv.height = VIEW_H;
    cv.style.width = Math.round(VIEW_W * s) + 'px';
    cv.style.height = Math.round(VIEW_H * s) + 'px';
    return { stufe: s, touch: isTouch, quer: quer };
  }

  global.Pixel = {
    px: px, dunkler: dunkler, heller: heller,
    drawHero: drawHero, avatarTeile: avatarTeile,
    blase: blase, schild: schild,
    stufe: stufe, anpassen: anpassen,
    SKIN: SKIN_STD, HAAR: HAIR_STD, SCHWARZ: SCHWARZ
  };
})(window);
