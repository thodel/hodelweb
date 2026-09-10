/* ============================================================
   Lerninsel — Engine für begehbare Innenräume
   Bewegung, Möbel als Hindernisse, Stationen, Leute die von selbst
   ansprechen, Tablet-Steuerung. Jeder Raum liefert nur seine Daten
   und seine Zeichenroutinen.
   ============================================================ */
(function (global) {
  'use strict';

  var TILE = 16;
  var $ = function (i) { return document.getElementById(i); };

  var cfg = null, ctx = null, cv = null;
  var VIEW_W = 0, VIEW_H = 0;
  var solids = [];
  var held = { x: 0, y: 0, dir: 'down', frame: 0, animT: 0, speed: 58 };
  var aussehen = null;
  var nah = null, wellT = 0, letzteZeit = 0;
  var tasten = Object.create(null), tippRichtung = null;
  var bannerBis = 0;
  var letztesGespraech = 0;

  function block(tx, ty, tw, th) {
    solids.push({ x: tx * TILE, y: ty * TILE, w: tw * TILE, h: th * TILE });
  }
  function blockiert(nx, ny) {
    var bx = nx - 4, by = ny - 4, bw = 8, bh = 4;
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (bx < s.x + s.w && bx + bw > s.x && by < s.y + s.h && by + bh > s.y) return true;
    }
    return false;
  }

  /* ---------------- Zeichnen ---------------- */
  function zeichnen(dt) {
    wellT += dt;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    cfg.boden(ctx, wellT);

    var teile = [];
    cfg.moebel.forEach(function (m) {
      teile.push({ y: (m.ty + m.th) * TILE, art: 'moebel', m: m });
    });
    cfg.leute.forEach(function (g) { teile.push({ y: g.y, art: 'gast', g: g }); });
    teile.push({ y: held.y, art: 'held' });
    if (cfg.extras) cfg.extras(wellT).forEach(function (e) { teile.push(e); });
    teile.sort(function (a, b) { return a.y - b.y; });

    teile.forEach(function (t) {
      if (t.art === 'moebel') cfg.moebelZeichnen(ctx, t.m, wellT);
      else if (t.art === 'gast') gastZeichnen(t.g);
      else if (t.art === 'held') {
        Pixel.drawHero(ctx, held.x, held.y, held.dir, held.frame,
                       aussehen.jacke, aussehen.jackeD, aussehen.haar, aussehen.teile);
      } else if (t.zeichnen) t.zeichnen(ctx, wellT);
    });

    /* Namen */
    cfg.leute.forEach(function (g) {
      Pixel.schild(ctx, g.x, g.y, g.name.toUpperCase(), g.farbe || '#cbd5e1');
    });
    cfg.stationen.forEach(function (s) {
      if (s.ohneSchild) return;
      Pixel.schild(ctx, s.x, s.y - 30, s.name.toUpperCase(), s.farbe || '#e2e8f0');
    });

    if (cfg.darueber) cfg.darueber(ctx, wellT);

    /* Warmes Licht */
    if (cfg.licht !== false) {
      var grad = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 40,
                                          VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.7);
      grad.addColorStop(0, cfg.lichtInnen || 'rgba(255,196,120,.05)');
      grad.addColorStop(1, cfg.lichtAussen || 'rgba(10,4,12,.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (cfg.beimZeichnen) cfg.beimZeichnen();
  }

  function gastZeichnen(g) {
    var wippe = Math.round(Math.sin(wellT * 1.6 + g.x) * 0.6);
    var eigen = cfg.leuteZeichnen ? cfg.leuteZeichnen(ctx, g, wellT) : false;
    if (!eigen) {
      Pixel.drawHero(ctx, g.x, g.y - wippe, g.blick, 0,
                     g.jacke[0], g.jacke[1], g.haar, { haut: g.haut });
    }
    if (g.sprueche && g.sprueche.length && Math.sin(wellT * 0.7 + g.x * 0.4) > 0.86) {
      Pixel.blase(ctx, g.x, g.y, wellT * 2);
    }
  }

  /* ---------------- Nähe ---------------- */
  function naechstes() {
    var best = null, bestD = 1e9, i, d;
    for (i = 0; i < cfg.stationen.length; i++) {
      var s = cfg.stationen[i];
      d = Math.hypot(held.x - s.x, held.y - s.y);
      if (d < 34 && d < bestD) { best = { art: 'station', station: s, name: s.name }; bestD = d; }
    }
    for (i = 0; i < cfg.leute.length; i++) {
      var g = cfg.leute[i];
      d = Math.hypot(held.x - g.x, held.y - g.y);
      if (d < 28 && d < bestD) { best = { art: 'gast', gast: g, name: g.name }; bestD = d; }
    }
    return best;
  }

  function bannerZeigen() {
    var el = $('banner');
    if (!el) return;
    if (!nah) { el.classList.remove('show'); return; }
    if (nah.art === 'gast') {
      el.innerHTML = '<b>' + nah.gast.name + '</b> — [E] ansprechen';
    } else {
      var s = nah.station;
      var hinweis = cfg.stationHinweis ? cfg.stationHinweis(s) : s.hinweis;
      el.innerHTML = '<b>' + s.name + '</b>' + (hinweis ? ' — ' + hinweis : '') +
        ' — [E] ' + (s.id === 'tuer' ? 'hinausgehen' : s.verb || 'öffnen');
    }
    el.classList.add('show');
  }

  /* ---------------- Reden ---------------- */
  function saetze(g) {
    var s = g.sprueche || [];
    if (!s.length) return null;
    var nr = g.spruchNr || 0;
    g.spruchNr = nr + 1;
    var eintrag = s[nr % s.length];
    return Array.isArray(eintrag) ? eintrag : [eintrag];
  }
  function ansprechen(g, vonSelbst) {
    var text = saetze(g);
    if (!text) return;
    g.zuletztGeredet = Date.now();
    letztesGespraech = Date.now();
    Dialog.zeigen(g.name, vonSelbst ? text : text, function () { bannerZeigen(); });
  }

  /* Leute sprechen von selbst an, wenn der Spieler nah genug kommt. */
  function vonSelbstReden() {
    if (Dialog.offen() || fensterAuf()) return;
    if (Date.now() - letztesGespraech < 12000) return;
    for (var i = 0; i < cfg.leute.length; i++) {
      var g = cfg.leute[i];
      if (g.stumm) continue;
      var d = Math.hypot(held.x - g.x, held.y - g.y);
      if (d > 30) continue;
      if (g.zuletztGeredet && Date.now() - g.zuletztGeredet < 75000) continue;
      ansprechen(g, true);
      return;
    }
  }

  /* ---------------- Fenster ---------------- */
  function fensterAuf() {
    var f = $('fenster');
    return !!(f && f.classList.contains('auf'));
  }
  function fensterOeffnen(id) {
    var f = $('fenster');
    if (!f) return;
    Array.prototype.forEach.call(f.querySelectorAll('.tafel'), function (t) {
      t.hidden = t.id !== id;
    });
    f.classList.add('auf');
    if (cfg.beiOeffnen) cfg.beiOeffnen(id);
  }
  function fensterSchliessen() {
    var f = $('fenster');
    if (f) f.classList.remove('auf');
    bannerZeigen();
  }

  /* ---------------- Handeln ---------------- */
  function handeln() {
    if (Dialog.offen()) { Dialog.weiter(); return; }
    if (fensterAuf()) return;
    if (!nah) return;
    if (nah.art === 'gast') { ansprechen(nah.gast, false); return; }
    var s = nah.station;
    if (s.id === 'tuer') { hinaus(); return; }
    if (cfg.stationTun && cfg.stationTun(s)) return;
    if (s.tafel) fensterOeffnen(s.tafel);
    else if (s.url) window.location.href = s.url;
  }
  function hinaus() {
    window.location.href = cfg.zurueck || '/lernwelt/';
  }

  /* ---------------- Schleife ---------------- */
  function schritt(ts) {
    var dt = Math.min(0.05, (ts - letzteZeit) / 1000 || 0);
    letzteZeit = ts;

    if (!fensterAuf() && !Dialog.offen()) {
      var dx = 0, dy = 0;
      if (tasten['w'] || tasten['arrowup'] || tippRichtung === 'up') dy -= 1;
      if (tasten['s'] || tasten['arrowdown'] || tippRichtung === 'down') dy += 1;
      if (tasten['a'] || tasten['arrowleft'] || tippRichtung === 'left') dx -= 1;
      if (tasten['d'] || tasten['arrowright'] || tippRichtung === 'right') dx += 1;

      if (dx || dy) {
        if (dy < 0) held.dir = 'up';
        else if (dy > 0) held.dir = 'down';
        else if (dx < 0) held.dir = 'left';
        else held.dir = 'right';
        var laenge = Math.hypot(dx, dy) || 1;
        var sx = (dx / laenge) * held.speed * dt, sy = (dy / laenge) * held.speed * dt;
        if (!blockiert(held.x + sx, held.y)) held.x += sx;
        if (!blockiert(held.x, held.y + sy)) held.y += sy;
        held.animT += dt;
        if (held.animT > 0.16) { held.animT = 0; held.frame = held.frame === 1 ? 2 : 1; }
      } else { held.frame = 0; held.animT = 0; }

      var n = naechstes();
      var gewechselt = (n && nah) ? (n.name !== nah.name) : (n !== nah);
      nah = n;
      if (gewechselt || Date.now() > bannerBis) bannerZeigen();
      vonSelbstReden();
    }

    zeichnen(dt);
    requestAnimationFrame(schritt);
  }

  /* ---------------- Aufbau ---------------- */
  function starten(opts) {
    cfg = opts;
    cv = opts.canvas;
    ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    VIEW_W = opts.breiteKacheln * TILE;
    VIEW_H = opts.hoeheKacheln * TILE;
    cfg.moebel = cfg.moebel || [];
    cfg.stationen = cfg.stationen || [];
    cfg.leute = cfg.leute || [];

    /* Wände: aussen herum, unten mit Türöffnung. */
    var W = opts.breiteKacheln, H = opts.hoeheKacheln;
    var wandOben = opts.wandOben === undefined ? 3 : opts.wandOben;
    if (wandOben) block(0, 0, W, wandOben);
    block(0, wandOben, 1, H - wandOben);
    block(W - 1, wandOben, 1, H - wandOben);
    var tuer = opts.tuerKacheln || [];
    if (tuer.length === 2) {
      block(0, H - 1, tuer[0], 1);
      block(tuer[1] + 1, H - 1, W - tuer[1] - 1, 1);
    } else {
      block(0, H - 1, W, 1);
    }
    cfg.moebel.forEach(function (m) { block(m.tx, m.ty, m.tw, m.th); });
    (opts.hindernisse || []).forEach(function (h) { block(h.tx, h.ty, h.tw, h.th); });

    cfg.stationen.forEach(function (s) { s.x = s.tx * TILE + 8; s.y = s.ty * TILE + 14; });
    cfg.leute.forEach(function (g) {
      g.x = g.tx * TILE + 8; g.y = g.ty * TILE + 14;
      g.spruchNr = 0;
      g.blick = g.blick || 'down';
      /* Leute stehen im Weg — ausser sie stehen hinter einem Tresen. */
      if (!g.hinterTresen) block(g.tx, g.ty - 1, 1, 1);
    });

    held.x = (opts.start.tx) * TILE + 8;
    held.y = (opts.start.ty) * TILE + 14;
    held.dir = opts.start.dir || 'up';
    aussehen = Pixel.avatarTeile(opts.who);

    /* Tasten */
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].indexOf(k) >= 0) e.preventDefault();
      if (Dialog.offen()) return;
      if (k === 'escape') { if (fensterAuf()) fensterSchliessen(); else hinaus(); return; }
      if (fensterAuf()) return;
      tasten[k] = true;
      if (k === 'e' || k === 'enter') handeln();
    });
    window.addEventListener('keyup', function (e) { tasten[e.key.toLowerCase()] = false; });

    var zuKnopf = document.querySelector('.zu');
    if (zuKnopf) zuKnopf.onclick = fensterSchliessen;
    var f = $('fenster');
    if (f) f.addEventListener('click', function (e) { if (e.target === f) fensterSchliessen(); });

    /* Tablet */
    var lage = Pixel.anpassen({ canvas: cv, breite: VIEW_W, hoehe: VIEW_H, rand: 26, bandUnten: 160 });
    if (lage.touch && $('steuer')) {
      $('steuer').classList.add('an');
      Array.prototype.forEach.call(document.querySelectorAll('.pad button[data-dir]'), function (b) {
        var dir = b.dataset.dir;
        var an = function (e) { e.preventDefault(); tippRichtung = dir; };
        var aus = function (e) { e.preventDefault(); if (tippRichtung === dir) tippRichtung = null; };
        b.addEventListener('touchstart', an, { passive: false });
        b.addEventListener('touchend', aus, { passive: false });
        b.addEventListener('touchcancel', aus, { passive: false });
        b.addEventListener('mousedown', an);
        b.addEventListener('mouseup', aus);
        b.addEventListener('mouseleave', aus);
      });
      var ke = $('knopf-e');
      if (ke) {
        ke.addEventListener('touchstart', function (e) { e.preventDefault(); handeln(); }, { passive: false });
        ke.addEventListener('click', function (e) { e.preventDefault(); handeln(); });
      }
    }
    window.addEventListener('resize', function () {
      Pixel.anpassen({ canvas: cv, breite: VIEW_W, hoehe: VIEW_H, rand: 26, bandUnten: 160 });
    });

    hudAuffrischen();
    requestAnimationFrame(function (t) { letzteZeit = t; schritt(t); });
    return Raum;
  }

  function hudAuffrischen() {
    var h = $('hud');
    if (h && cfg && cfg.hudZeichnen) h.innerHTML = cfg.hudZeichnen();
  }

  var Raum = {
    starten: starten,
    hudAuffrischen: hudAuffrischen,
    reden: function (wer, text, beiEnde) { Dialog.zeigen(wer, text, beiEnde); },
    held: held,
    fensterOeffnen: fensterOeffnen,
    fensterSchliessen: fensterSchliessen,
    TILE: TILE,
    /* Für Räume, die selber etwas blockieren wollen. */
    block: block
  };
  global.Raum = Raum;
})(window);
