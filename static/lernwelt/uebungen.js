/* ============================================================
   Lerninsel — Übungssammlung, orientiert am Lehrplan 21 (Zyklus 2)
   Jede Übung nennt ihren LP21-Kompetenzcode.
   Aufgabentypen: 'zahl' | 'text' | 'wahl'
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------- Helfer ---------------- */
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function distinct(korrekt, kandidaten, n) {
    var out = [];
    shuffle(kandidaten).forEach(function (k) {
      if (out.length < n && String(k) !== String(korrekt) && out.indexOf(k) < 0) out.push(k);
    });
    return out;
  }
  /* 'paar' kennzeichnet die dahinterliegende Tatsache. Zwei Aufgaben mit
     derselben Kennung gelten als dieselbe — auch wenn sie umgekehrt gefragt
     werden ("Hauptstadt von X?" und "X ist die Hauptstadt von …"). */
  function wahl(frage, korrekt, falsche, hinweis, paar) {
    return { typ: 'wahl', frage: frage, antwort: String(korrekt),
             optionen: shuffle([String(korrekt)].concat(falsche.map(String))),
             hinweis: hinweis, paar: paar };
  }
  function fmt(n) { return String(n).replace('.', ','); }
  function ggT(a, b) { return b ? ggT(b, a % b) : a; }
  /* Bruch kürzen; ganze Zahlen ohne Nenner schreiben. */
  function bruch(z, n) {
    var t = ggT(Math.abs(z), Math.abs(n)) || 1;
    z = z / t; n = n / t;
    return { z: z, n: n, text: n === 1 ? String(z) : z + '/' + n,
             alternativen: n === 1 ? [z + '/1', String(z)] : [z + '/' + n] };
  }
  /* Ein zufälliger, bereits gekürzter echter Bruch. */
  function echterBruch(nenner) {
    var n = nenner || pick([2, 3, 4, 5, 6, 8, 10]);
    var z = rint(1, n - 1);
    var t = ggT(z, n);
    return { z: z / t, n: n / t };
  }

  /* ============================================================
     MATHEMATIK
     ============================================================ */
  var MATHE = [
    {
      id: 'einmaleins', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Das kleine Einmaleins', lp21: 'MA.1.A.3',
      info: 'Malrechnen und Teilen bis 10 × 10.',
      gen: function () {
        var a = rint(2, 10), b = rint(2, 10);
        if (Math.random() < 0.4) {
          return { typ: 'zahl', frage: (a * b) + ' : ' + a + ' =', antwort: String(b) };
        }
        return { typ: 'zahl', frage: a + ' · ' + b + ' =', antwort: String(a * b) };
      }
    },
    {
      id: 'kopfrechnen1000', klassen: [4], schwierigkeit: 'leicht',
      titel: 'Kopfrechnen bis 1000', lp21: 'MA.1.A.2',
      info: 'Addieren und Subtrahieren im Zahlenraum bis 1000.',
      gen: function () {
        var a = rint(120, 890), b = rint(20, 99);
        if (Math.random() < 0.5) return { typ: 'zahl', frage: a + ' + ' + b + ' =', antwort: String(a + b) };
        return { typ: 'zahl', frage: a + ' − ' + b + ' =', antwort: String(a - b) };
      }
    },
    {
      id: 'stellenwert', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Stellenwerte & Runden', lp21: 'MA.1.A.1 / MA.1.A.4',
      info: 'Zahlen lesen, ordnen und runden.',
      gen: function () {
        var z = rint(1000, 99999);
        var art = pick(['runden100', 'runden1000', 'stelle', 'nachbar']);
        if (art === 'runden100') {
          return { typ: 'zahl', frage: 'Runde auf Hunderter: ' + z, antwort: String(Math.round(z / 100) * 100) };
        }
        if (art === 'runden1000') {
          return { typ: 'zahl', frage: 'Runde auf Tausender: ' + z, antwort: String(Math.round(z / 1000) * 1000) };
        }
        if (art === 'nachbar') {
          var t = Math.floor(z / 1000) * 1000;
          return { typ: 'zahl', frage: 'Welcher Tausender kommt vor ' + z + '?', antwort: String(t),
                   hinweis: 'Der Tausender direkt darunter.' };
        }
        var s = String(z), pos = rint(0, s.length - 1);
        var namen = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender'];
        var stelle = namen[s.length - 1 - pos];
        return { typ: 'zahl', frage: 'Welche Ziffer steht in ' + z + ' an der ' + stelle + '-Stelle?',
                 antwort: s[pos] };
      }
    },
    {
      id: 'schriftlich', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'Schriftlich rechnen', lp21: 'MA.1.A.3',
      info: 'Schriftliche Addition und Subtraktion bis 10 000.',
      gen: function () {
        if (Math.random() < 0.5) {
          var a = rint(1200, 8600), b = rint(600, 1300);
          return { typ: 'zahl', frage: a + ' + ' + b + ' =', antwort: String(a + b),
                   hinweis: 'Stellenweise rechnen, Übertrag nicht vergessen.' };
        }
        var c = rint(3000, 9500), d = rint(700, 2800);
        return { typ: 'zahl', frage: c + ' − ' + d + ' =', antwort: String(c - d),
                 hinweis: 'Stellenweise rechnen, Entbündeln nicht vergessen.' };
      }
    },
    {
      id: 'groessen4', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'Grössen umwandeln', lp21: 'MA.3.A.2',
      info: 'Meter, Kilogramm, Liter, Zeit und Geld umrechnen.',
      gen: function () {
        var art = pick(['laenge', 'masse', 'zeit', 'geld']);
        if (art === 'laenge') {
          var m = rint(2, 9), cm = rint(1, 99);
          return { typ: 'zahl', frage: m + ' m ' + cm + ' cm = ? cm', antwort: String(m * 100 + cm) };
        }
        if (art === 'masse') {
          var kg = rint(2, 9), g = rint(50, 950);
          return { typ: 'zahl', frage: kg + ' kg ' + g + ' g = ? g', antwort: String(kg * 1000 + g) };
        }
        if (art === 'zeit') {
          var h = rint(1, 5), min = rint(5, 55);
          return { typ: 'zahl', frage: h + ' h ' + min + ' min = ? min', antwort: String(h * 60 + min) };
        }
        var fr = rint(2, 40), rp = rint(5, 95);
        return { typ: 'zahl', frage: fr + ' Fr. ' + rp + ' Rp. = ? Rappen', antwort: String(fr * 100 + rp) };
      }
    },
    {
      id: 'sachaufgaben4', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'Sachaufgaben', lp21: 'MA.3.C.2',
      info: 'Rechengeschichten aus dem Alltag.',
      gen: function () {
        var v = [
          function () {
            var kinder = rint(3, 8), preis = rint(4, 15);
            return { typ: 'zahl', frage: kinder + ' Kinder kaufen je ein Billett für ' + preis + ' Fr. Wie viel kostet das zusammen?',
                     antwort: String(kinder * preis), einheit: 'Fr.' };
          },
          function () {
            var total = rint(6, 12) * 6, gruppen = 6;
            return { typ: 'zahl', frage: total + ' Äpfel werden gleichmässig auf ' + gruppen + ' Körbe verteilt. Wie viele Äpfel sind in einem Korb?',
                     antwort: String(total / gruppen) };
          },
          function () {
            var start = rint(200, 800), aus = rint(50, 190);
            return { typ: 'zahl', frage: 'In der Bibliothek stehen ' + start + ' Bücher. ' + aus + ' sind ausgeliehen. Wie viele stehen noch im Regal?',
                     antwort: String(start - aus) };
          },
          function () {
            var laenge = rint(4, 12), breite = rint(3, 9);
            return { typ: 'zahl', frage: 'Ein Gemüsebeet ist ' + laenge + ' m lang und ' + breite + ' m breit. Wie viele Meter Zaun braucht es rundherum?',
                     antwort: String(2 * (laenge + breite)), einheit: 'm', hinweis: 'Umfang = 2 · (Länge + Breite)' };
          },
          function () {
            var minuten = rint(3, 9) * 15;
            return { typ: 'zahl', frage: 'Eine Wanderung dauert ' + minuten + ' Minuten. Wie viele volle Stunden sind das?',
                     antwort: String(Math.floor(minuten / 60)), hinweis: '60 Minuten = 1 Stunde' };
          }
        ];
        return pick(v)();
      }
    },
    {
      id: 'geometrie4', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Formen, Umfang & Symmetrie', lp21: 'MA.2.A.2 / MA.2.A.3',
      info: 'Spiegeln und Körper ab der 4. Klasse, Umfang berechnen ab der 5./6.',
      gen: function () {
        var art = pick(['umfang', 'quadrat', 'koerper', 'symmetrie']);
        if (art === 'umfang') {
          var l = rint(3, 15), b = rint(2, 12);
          return { typ: 'zahl', frage: 'Rechteck: ' + l + ' cm lang, ' + b + ' cm breit. Umfang?',
                   antwort: String(2 * (l + b)), einheit: 'cm' };
        }
        if (art === 'quadrat') {
          var s = rint(3, 14);
          return { typ: 'zahl', frage: 'Quadrat mit Seite ' + s + ' cm. Umfang?', antwort: String(4 * s), einheit: 'cm' };
        }
        if (art === 'koerper') {
          var k = pick([
            ['Würfel', 6, [4, 8, 12]], ['Quader', 6, [4, 8, 12]],
            ['Pyramide (quadratische Grundfläche)', 5, [4, 6, 8]]
          ]);
          return wahl('Wie viele Flächen hat ein ' + k[0] + '?', k[1], distinct(k[1], k[2], 3));
        }
        var f = pick([
          ['Quadrat', 4], ['Rechteck', 2], ['Kreis', 'unendlich viele'], ['gleichseitiges Dreieck', 3]
        ]);
        return wahl('Wie viele Symmetrieachsen hat ein ' + f[0] + '?', f[1],
          distinct(f[1], [1, 2, 3, 4, 6, 'unendlich viele'], 3));
      }
    },
    /* ---- eher 5./6. Klasse ---- */
    {
      id: 'mult-gross', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Mehrstellig multiplizieren', lp21: 'MA.1.A.3',
      info: 'Im Kopf oder mit eigenem Rechenweg — der Lehrplan verlangt hier kein schriftliches Verfahren.',
      gen: function () {
        if (Math.random() < 0.55) {
          var a = rint(23, 98), b = rint(12, 49);
          return { typ: 'zahl', frage: a + ' · ' + b + ' =', antwort: String(a * b) };
        }
        var q = rint(12, 60), d = rint(3, 9);
        return { typ: 'zahl', frage: (q * d) + ' : ' + d + ' =', antwort: String(q) };
      }
    },
    {
      id: 'division-rest', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Division mit Rest', lp21: 'MA.1.A.3',
      info: 'Teilen mit Rest — Antwort als «Ergebnis R Rest».',
      gen: function () {
        var d = rint(3, 9), q = rint(11, 90), r = rint(1, d - 1);
        var z = q * d + r;
        return { typ: 'text', frage: z + ' : ' + d + ' =', antwort: q + ' R ' + r,
                 alternativen: [q + 'R' + r, q + ' r ' + r, q + ' Rest ' + r],
                 hinweis: 'Schreibe so: 12 R 3' };
      }
    },
    {
      id: 'brueche', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Brüche', lp21: 'MA.1.A.3',
      info: 'Kürzen, erweitern, Anteile berechnen und vergleichen.',
      gen: function () {
        var art = pick(['anteil', 'kuerzen', 'vergleich', 'ganzes']);
        if (art === 'anteil') {
          var n = pick([2, 3, 4, 5, 6, 8]), g = n * rint(3, 15);
          return { typ: 'zahl', frage: 'Wie viel ist 1/' + n + ' von ' + g + '?', antwort: String(g / n) };
        }
        if (art === 'kuerzen') {
          var z = rint(2, 9), nn = rint(3, 11);
          if (z === nn) nn++;
          var f = rint(2, 6);
          var zz = z * f, nnn = nn * f;
          var kurz = bruch(zz, nnn);
          return { typ: 'text', frage: 'Kürze so weit wie möglich: ' + zz + '/' + nnn,
                   antwort: kurz.text, alternativen: kurz.alternativen,
                   hinweis: kurz.n === 1 ? 'Es geht ganz auf — schreibe nur die Zahl.'
                                         : 'Schreibe so: 3/4' };
        }
        if (art === 'ganzes') {
          /* Zähler teilerfremd zum Nenner, damit in der Frage kein 2/8 steht. */
          var nenner = pick([2, 3, 4, 5, 8]), tf = [];
          for (var q = 1; q < nenner; q++) if (ggT(q, nenner) === 1) tf.push(q);
          var zaehler = pick(tf);
          var ganzes = nenner * rint(2, 12);
          var worte = { 2: 'Halbe', 3: 'Drittel', 4: 'Viertel', 5: 'Fünftel', 8: 'Achtel' };
          return { typ: 'zahl',
                   frage: 'Wie viel sind ' + zaehler + '/' + nenner + ' von ' + ganzes + '?',
                   antwort: String(ganzes / nenner * zaehler),
                   hinweis: 'Zuerst ein ' + worte[nenner] + ' ausrechnen, dann mal ' + zaehler + '.' };
        }
        var paare = [['1/2', '1/3'], ['2/3', '3/4'], ['3/5', '1/2'], ['5/8', '1/2'], ['2/5', '1/2'], ['7/10', '3/4']];
        var p = pick(paare);
        var wert = function (s) { var q = s.split('/'); return +q[0] / +q[1]; };
        var gr = wert(p[0]) > wert(p[1]) ? p[0] : p[1];
        return wahl('Welcher Bruch ist grösser: ' + p[0] + ' oder ' + p[1] + '?', gr, [wert(p[0]) > wert(p[1]) ? p[1] : p[0]]);
      }
    },
    {
      id: 'bruch-plus', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Brüche addieren & subtrahieren', lp21: 'MA.1.A.3',
      info: 'Gleiche und ungleiche Nenner, Ergebnis gekürzt.',
      gen: function () {
        var gleich = Math.random() < 0.5, a, b;
        if (gleich) {
          /* Zähler teilerfremd zum Nenner wählen, sonst stünde in der Frage
             ein ungekürzter Bruch wie 2/8. */
          var n = pick([4, 5, 6, 8, 10, 12]);
          var moeglich = [];
          for (var t = 1; t < n; t++) if (ggT(t, n) === 1) moeglich.push(t);
          a = { z: pick(moeglich), n: n };
          b = { z: pick(moeglich), n: n };
        } else {
          a = echterBruch(pick([2, 3, 4, 5, 6]));
          b = echterBruch(pick([3, 4, 6, 8, 10]));
          if (a.n === b.n) b = echterBruch(b.n * 2);
        }
        var plus = Math.random() < 0.6;
        var z = plus ? a.z * b.n + b.z * a.n : a.z * b.n - b.z * a.n;
        if (z <= 0) { plus = true; z = a.z * b.n + b.z * a.n; }
        var erg = bruch(z, a.n * b.n);
        return { typ: 'text',
                 frage: a.z + '/' + a.n + (plus ? ' + ' : ' − ') + b.z + '/' + b.n + ' =',
                 antwort: erg.text, alternativen: erg.alternativen,
                 hinweis: gleich ? 'Gleicher Nenner: nur die Zähler rechnen.'
                                 : 'Zuerst auf denselben Nenner bringen, am Schluss kürzen.' };
      }
    },
    {
      id: 'bruch-mal', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Multiplikation mit Brüchen', lp21: 'MA.1.A.3 (weiterführend)',
      info: 'Bruch mal ganze Zahl und Bruch mal Bruch.',
      gen: function () {
        var art = pick(['ganz', 'ganz', 'bruch', 'anteil']);
        if (art === 'ganz') {
          var a = echterBruch(), g = rint(2, 12);
          var erg = bruch(a.z * g, a.n);
          return { typ: 'text', frage: a.z + '/' + a.n + ' · ' + g + ' =',
                   antwort: erg.text, alternativen: erg.alternativen,
                   hinweis: 'Nur der Zähler wird mit ' + g + ' multipliziert, dann kürzen.' };
        }
        if (art === 'bruch') {
          var b1 = echterBruch(pick([2, 3, 4, 5, 6])), b2 = echterBruch(pick([2, 3, 4, 5, 8]));
          var e2 = bruch(b1.z * b2.z, b1.n * b2.n);
          return { typ: 'text', frage: b1.z + '/' + b1.n + ' · ' + b2.z + '/' + b2.n + ' =',
                   antwort: e2.text, alternativen: e2.alternativen,
                   hinweis: 'Zähler mal Zähler, Nenner mal Nenner — dann kürzen.' };
        }
        var c = echterBruch(pick([2, 3, 4, 5, 8]));
        var ganzes = c.n * rint(2, 15);
        return { typ: 'zahl', frage: 'Wie viel sind ' + c.z + '/' + c.n + ' von ' + ganzes + '?',
                 antwort: String(ganzes / c.n * c.z),
                 hinweis: 'Durch ' + c.n + ' teilen, dann mal ' + c.z + '.' };
      }
    },
    {
      id: 'bruch-geteilt', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Division von Brüchen', lp21: 'MA.1.A.3 (Vorbereitung Oberstufe)',
      info: 'Durch eine ganze Zahl teilen und durch einen Bruch.',
      gen: function () {
        if (Math.random() < 0.6) {
          var a = echterBruch(pick([2, 3, 4, 5, 6])), g = rint(2, 8);
          var erg = bruch(a.z, a.n * g);
          return { typ: 'text', frage: a.z + '/' + a.n + ' : ' + g + ' =',
                   antwort: erg.text, alternativen: erg.alternativen,
                   hinweis: 'Durch ' + g + ' teilen heisst: der Nenner wird mal ' + g + '.' };
        }
        var b1 = echterBruch(pick([2, 3, 4, 5])), b2 = echterBruch(pick([2, 3, 4, 5]));
        var e2 = bruch(b1.z * b2.n, b1.n * b2.z);
        return { typ: 'text', frage: b1.z + '/' + b1.n + ' : ' + b2.z + '/' + b2.n + ' =',
                 antwort: e2.text, alternativen: e2.alternativen,
                 hinweis: 'Mit dem Kehrbruch multiplizieren: · ' + b2.n + '/' + b2.z };
      }
    },
    {
      id: 'bruch-dezimal', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Bruch, Dezimalzahl, Prozent', lp21: 'MA.1.A.1 (weiterführend)',
      info: 'Dieselbe Zahl in drei Schreibweisen.',
      gen: function () {
        var paare = [
          ['1/2', '0,5', '50'], ['1/4', '0,25', '25'], ['3/4', '0,75', '75'],
          ['1/5', '0,2', '20'], ['2/5', '0,4', '40'], ['3/5', '0,6', '60'], ['4/5', '0,8', '80'],
          ['1/10', '0,1', '10'], ['3/10', '0,3', '30'], ['7/10', '0,7', '70'],
          ['1/20', '0,05', '5'], ['1/100', '0,01', '1'], ['1/8', '0,125', '12,5'],
          ['3/8', '0,375', '37,5'], ['1/25', '0,04', '4'], ['9/10', '0,9', '90']
        ];
        var p = pick(paare);
        var art = pick(['zuDezimal', 'zuProzent', 'zuBruch']);
        if (art === 'zuDezimal') {
          return { typ: 'text', frage: 'Schreibe ' + p[0] + ' als Dezimalzahl:', antwort: p[1],
                   alternativen: [p[1].replace(',', '.')], hinweis: 'Zähler durch Nenner teilen.' };
        }
        if (art === 'zuProzent') {
          return { typ: 'text', frage: 'Wie viel Prozent sind ' + p[0] + '?', antwort: p[2],
                   alternativen: [p[2] + '%', p[2].replace(',', '.')], hinweis: 'Nur die Zahl, ohne %.' };
        }
        return wahl('Welcher Bruch entspricht ' + p[1] + '?', p[0],
          distinct(p[0], paare.map(function (x) { return x[0]; }), 3));
      }
    },
    {
      id: 'dezimal', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Dezimalzahlen', lp21: 'MA.1.A.3',
      info: 'Rechnen mit Kommazahlen, mal und geteilt durch 10 / 100.',
      gen: function () {
        var art = pick(['add', 'mal10', 'geteilt', 'umwandeln']);
        var a = rint(10, 900) / 10, b = rint(10, 400) / 10;
        if (art === 'add') {
          return { typ: 'text', frage: fmt(a) + ' + ' + fmt(b) + ' =',
                   antwort: fmt(Math.round((a + b) * 10) / 10), alternativen: [String(Math.round((a + b) * 10) / 10)] };
        }
        if (art === 'mal10') {
          var f = pick([10, 100]);
          return { typ: 'text', frage: fmt(a) + ' · ' + f + ' =',
                   antwort: fmt(Math.round(a * f * 100) / 100), alternativen: [String(Math.round(a * f * 100) / 100)] };
        }
        if (art === 'geteilt') {
          var g = pick([10, 100]);
          var res = Math.round((a / g) * 1000) / 1000;
          return { typ: 'text', frage: fmt(a) + ' : ' + g + ' =', antwort: fmt(res), alternativen: [String(res)] };
        }
        var cm = rint(105, 980);
        return { typ: 'text', frage: cm + ' cm = ? m', antwort: fmt(cm / 100), alternativen: [String(cm / 100)],
                 hinweis: '100 cm = 1 m' };
      }
    },
    {
      id: 'prozent', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Prozente', lp21: 'MA.1.A.1 (weiterführend)',
      info: 'Prozentanteile von Grössen berechnen.',
      gen: function () {
        var p = pick([10, 20, 25, 50, 75]), g = pick([40, 60, 80, 120, 200, 240, 400]);
        if (Math.random() < 0.3) {
          var teil = g * p / 100;
          return { typ: 'zahl', frage: teil + ' von ' + g + ' — wie viel Prozent sind das?',
                   antwort: String(p), einheit: '%' };
        }
        return { typ: 'zahl', frage: p + ' % von ' + g + ' =', antwort: String(g * p / 100),
                 hinweis: '10 % ist ein Zehntel.' };
      }
    },
    {
      id: 'flaeche', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Fläche & Umfang', lp21: 'MA.2.A.3',
      info: 'Rechteck, Quadrat und Dreieck berechnen.',
      gen: function () {
        var art = pick(['flaeche', 'dreieck', 'umkehr', 'umfang']);
        var l = rint(4, 20), b = rint(3, 15);
        if (art === 'flaeche') return { typ: 'zahl', frage: 'Rechteck ' + l + ' cm × ' + b + ' cm. Fläche?', antwort: String(l * b), einheit: 'cm²' };
        if (art === 'umfang') return { typ: 'zahl', frage: 'Rechteck ' + l + ' cm × ' + b + ' cm. Umfang?', antwort: String(2 * (l + b)), einheit: 'cm' };
        if (art === 'dreieck') {
          var g = rint(4, 20), h = rint(2, 12) * 2;
          return { typ: 'zahl', frage: 'Dreieck: Grundlinie ' + g + ' cm, Höhe ' + h + ' cm. Fläche?',
                   antwort: String(g * h / 2), einheit: 'cm²', hinweis: 'Grundlinie · Höhe : 2' };
        }
        var flaeche = l * b;
        return { typ: 'zahl', frage: 'Ein Rechteck hat die Fläche ' + flaeche + ' cm² und ist ' + l + ' cm lang. Wie breit ist es?',
                 antwort: String(b), einheit: 'cm' };
      }
    },
    {
      id: 'groessen6', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Grössen (gross & klein)', lp21: 'MA.3.A.2',
      info: 'km, t, Liter, Milliliter und Zeitspannen.',
      gen: function () {
        var art = pick(['km', 'tonne', 'liter', 'zeit']);
        if (art === 'km') { var km = rint(2, 40), m = rint(50, 950); return { typ: 'zahl', frage: km + ' km ' + m + ' m = ? m', antwort: String(km * 1000 + m) }; }
        if (art === 'tonne') { var t = rint(2, 12), kg = rint(50, 900); return { typ: 'zahl', frage: t + ' t ' + kg + ' kg = ? kg', antwort: String(t * 1000 + kg) }; }
        if (art === 'liter') { var l = rint(2, 15), dl = rint(1, 9); return { typ: 'zahl', frage: l + ' l ' + dl + ' dl = ? dl', antwort: String(l * 10 + dl) }; }
        var h1 = rint(7, 11), m1 = pick([0, 15, 30, 45]), dauer = rint(35, 150);
        var start = h1 * 60 + m1, ende = start + dauer;
        var hh = Math.floor(ende / 60), mm = ende % 60;
        return { typ: 'text', frage: 'Der Film beginnt um ' + h1 + ':' + String(m1).padStart(2, '0') +
                 ' Uhr und dauert ' + dauer + ' Minuten. Wann ist er zu Ende?',
                 antwort: hh + ':' + String(mm).padStart(2, '0'),
                 alternativen: [hh + '.' + String(mm).padStart(2, '0'), hh + ':' + String(mm).padStart(2, '0') + ' Uhr'],
                 hinweis: 'Schreibe so: 14:35' };
      }
    },
    {
      id: 'terme', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Terme & Gleichungen', lp21: 'MA.1.A.4 (weiterführend)',
      info: 'Platzhalter x bestimmen — Vorbereitung auf die Oberstufe.',
      gen: function () {
        var art = pick(['add', 'mult', 'zwei']);
        if (art === 'add') { var x = rint(4, 60), b = rint(5, 40); return { typ: 'zahl', frage: 'x + ' + b + ' = ' + (x + b) + ' — wie gross ist x?', antwort: String(x) }; }
        if (art === 'mult') { var f = rint(3, 9), y = rint(3, 20); return { typ: 'zahl', frage: f + ' · x = ' + (f * y) + ' — wie gross ist x?', antwort: String(y) }; }
        var a = rint(2, 6), z = rint(3, 15), c = rint(2, 20);
        return { typ: 'zahl', frage: a + ' · x + ' + c + ' = ' + (a * z + c) + ' — wie gross ist x?', antwort: String(z),
                 hinweis: 'Zuerst ' + c + ' abziehen, dann durch ' + a + ' teilen.' };
      }
    },
    {
      id: 'uhrzeit', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Uhrzeit & Zeitdauer', lp21: 'MA.3.A.2',
      info: 'Uhr lesen und ausrechnen, wie lange etwas dauert.',
      gen: function () {
        var art = pick(['dauer', 'ende', 'start', 'umwandeln']);
        var h = rint(7, 18), m = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        var d = pick([20, 25, 35, 40, 45, 50, 55, 70, 80, 90]);
        var t1 = h * 60 + m, t2 = t1 + d;
        var f = function (x) { return Math.floor(x / 60) % 24 + ':' + String(x % 60).padStart(2, '0'); };
        if (art === 'ende') {
          return { typ: 'text', frage: 'Es ist ' + f(t1) + ' Uhr. In ' + d + ' Minuten beginnt das Training.\nWie spät ist es dann?',
                   antwort: f(t2), alternativen: [f(t2) + ' Uhr', f(t2).replace(':', '.')], hinweis: 'Schreibe so: 14:35' };
        }
        if (art === 'start') {
          return { typ: 'text', frage: 'Der Film endet um ' + f(t2) + ' Uhr und dauerte ' + d + ' Minuten.\nWann hat er begonnen?',
                   antwort: f(t1), alternativen: [f(t1) + ' Uhr', f(t1).replace(':', '.')], hinweis: 'Schreibe so: 14:35' };
        }
        if (art === 'dauer') {
          return { typ: 'zahl', frage: 'Von ' + f(t1) + ' Uhr bis ' + f(t2) + ' Uhr — wie viele Minuten sind das?',
                   antwort: String(d), einheit: 'min' };
        }
        var std = rint(2, 6), min2 = pick([15, 30, 45]);
        return { typ: 'zahl', frage: std + ' Stunden ' + min2 + ' Minuten = ? Minuten', antwort: String(std * 60 + min2) };
      }
    },
    {
      id: 'geld', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Rechnen mit Geld', lp21: 'MA.3.A.2',
      info: 'Franken und Rappen zusammenzählen und Rückgeld bestimmen.',
      gen: function () {
        var art = pick(['summe', 'rueckgeld', 'anzahl']);
        var f1 = rint(2, 40), r1 = pick([10, 20, 30, 40, 50, 60, 70, 80, 90]);
        var f2 = rint(1, 25), r2 = pick([10, 20, 30, 40, 50, 60, 70, 80, 90]);
        var fmtFr = function (rp) { return (Math.floor(rp / 100)) + '.' + String(rp % 100).padStart(2, '0'); };
        var a = f1 * 100 + r1, b = f2 * 100 + r2;
        if (art === 'summe') {
          return { typ: 'text', frage: fmtFr(a) + ' Fr. + ' + fmtFr(b) + ' Fr. =',
                   antwort: fmtFr(a + b), alternativen: [fmtFr(a + b) + ' Fr.', String((a + b) / 100)],
                   hinweis: 'Schreibe so: 12.50' };
        }
        if (art === 'rueckgeld') {
          var schein = a <= 2000 ? 2000 : a <= 5000 ? 5000 : 10000;
          return { typ: 'text', frage: 'Du bezahlst ' + fmtFr(a) + ' Fr. mit einer ' + (schein / 100) + '-Franken-Note.\nWie viel Rückgeld bekommst du?',
                   antwort: fmtFr(schein - a), alternativen: [fmtFr(schein - a) + ' Fr.'], hinweis: 'Schreibe so: 12.50' };
        }
        var stueck = rint(3, 9), preis = rint(2, 12) * 100 + pick([0, 50]);
        return { typ: 'text', frage: stueck + ' Hefte kosten je ' + fmtFr(preis) + ' Fr. Was kostet alles zusammen?',
                 antwort: fmtFr(stueck * preis), alternativen: [fmtFr(stueck * preis) + ' Fr.'], hinweis: 'Schreibe so: 12.50' };
      }
    },
    {
      id: 'zahlenfolgen', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Zahlenfolgen', lp21: 'MA.3.A.3',
      info: 'Wie geht die Reihe weiter?',
      gen: function () {
        var art = pick(['linear', 'linear', 'quadrat', 'dreieck', 'abnehmend']);
        var folge = [], i;
        if (art === 'linear') {
          var start = rint(3, 40), schritt = rint(3, 12);
          for (i = 0; i < 5; i++) folge.push(start + i * schritt);
        } else if (art === 'abnehmend') {
          var s2 = rint(60, 120), sch2 = rint(4, 11);
          for (i = 0; i < 5; i++) folge.push(s2 - i * sch2);
        } else if (art === 'quadrat') {
          for (i = 1; i <= 5; i++) folge.push(i * i);
        } else {
          for (i = 1; i <= 5; i++) folge.push(i * (i + 1) / 2);
        }
        var naechste = art === 'linear' ? folge[4] + (folge[1] - folge[0])
          : art === 'abnehmend' ? folge[4] + (folge[1] - folge[0])
          : art === 'quadrat' ? 36 : 21;
        return { typ: 'zahl', frage: folge.join(', ') + ', …\nWelche Zahl kommt als Nächstes?',
                 antwort: String(naechste) };
      }
    },
    {
      id: 'proportional', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Proportional rechnen', lp21: 'MA.3.A.3',
      info: 'Vom Preis auf die Menge schliessen (Dreisatz).',
      gen: function () {
        var art = pick(['preis', 'weg', 'verbrauch']);
        if (art === 'preis') {
          var kiloPreis = rint(8, 30), gramm = pick([200, 250, 300, 400, 500, 750]);
          var res = Math.round(kiloPreis * gramm / 1000 * 100) / 100;
          return { typ: 'text', frage: '1 kg Käse kostet ' + kiloPreis + ' Fr.\nWas kosten ' + gramm + ' g?',
                   antwort: fmt(res), alternativen: [String(res), fmt(res) + ' Fr.'], hinweis: 'Zuerst: Was kostet 1 g?' };
        }
        if (art === 'weg') {
          var kmh = pick([4, 5, 6, 12, 15, 20]), min = pick([15, 20, 30, 45, 90]);
          var km = Math.round(kmh * min / 60 * 100) / 100;
          return { typ: 'text', frage: 'Du bist mit ' + kmh + ' km/h unterwegs.\nWie weit kommst du in ' + min + ' Minuten?',
                   antwort: fmt(km), alternativen: [String(km), fmt(km) + ' km'], hinweis: 'In 60 Minuten sind es ' + kmh + ' km.' };
        }
        var lit = pick([5, 6, 7, 8]), strecke = pick([200, 300, 350, 700]);
        var total = Math.round(lit * strecke / 100 * 10) / 10;
        return { typ: 'text', frage: 'Ein Auto braucht ' + lit + ' Liter auf 100 km.\nWie viel braucht es auf ' + strecke + ' km?',
                 antwort: fmt(total), alternativen: [String(total), fmt(total) + ' l'] };
      }
    }
  ];

  /* ============================================================
     DEUTSCH
     ============================================================ */
  var NOMEN = ['Hund', 'Baum', 'Schule', 'Fahrrad', 'Wolke', 'Freundin', 'Turm', 'Buch', 'Wiese', 'Bahnhof', 'Katze', 'Fluss'];
  var VERBEN = ['laufen', 'singen', 'lesen', 'springen', 'denken', 'malen', 'schwimmen', 'rufen', 'bauen', 'lachen'];
  var ADJEKTIVE = ['schnell', 'blau', 'freundlich', 'müde', 'laut', 'winzig', 'stark', 'hell', 'kalt', 'lustig'];

  var STARKE_VERBEN = [
    ['gehen', 'ging', 'ist gegangen'], ['laufen', 'lief', 'ist gelaufen'], ['sehen', 'sah', 'hat gesehen'],
    ['essen', 'ass', 'hat gegessen'], ['trinken', 'trank', 'hat getrunken'], ['schreiben', 'schrieb', 'hat geschrieben'],
    ['lesen', 'las', 'hat gelesen'], ['sprechen', 'sprach', 'hat gesprochen'], ['fahren', 'fuhr', 'ist gefahren'],
    ['fliegen', 'flog', 'ist geflogen'], ['schwimmen', 'schwamm', 'ist geschwommen'], ['singen', 'sang', 'hat gesungen'],
    ['finden', 'fand', 'hat gefunden'], ['nehmen', 'nahm', 'hat genommen'], ['geben', 'gab', 'hat gegeben'],
    ['kommen', 'kam', 'ist gekommen'], ['bleiben', 'blieb', 'ist geblieben'], ['ziehen', 'zog', 'hat gezogen']
  ];

  var MEHRZAHL = [
    ['das Haus', 'die Häuser'], ['der Baum', 'die Bäume'], ['das Kind', 'die Kinder'], ['die Blume', 'die Blumen'],
    ['der Apfel', 'die Äpfel'], ['das Buch', 'die Bücher'], ['die Maus', 'die Mäuse'], ['der Mann', 'die Männer'],
    ['das Auto', 'die Autos'], ['die Stadt', 'die Städte'], ['der Vogel', 'die Vögel'], ['das Glas', 'die Gläser'],
    ['die Hand', 'die Hände'], ['der Fluss', 'die Flüsse'], ['das Blatt', 'die Blätter']
  ];

  var DEUTSCH = [
    {
      id: 'wortarten', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Wortarten erkennen', lp21: 'D.5.D.1',
      info: 'Nomen, Verb oder Adjektiv?',
      gen: function () {
        var art = pick(['nomen', 'verb', 'adjektiv']);
        var wort = art === 'nomen' ? pick(NOMEN) : art === 'verb' ? pick(VERBEN) : pick(ADJEKTIVE);
        var label = art === 'nomen' ? 'Nomen' : art === 'verb' ? 'Verb' : 'Adjektiv';
        return wahl('Welche Wortart ist «' + wort + '»?', label, distinct(label, ['Nomen', 'Verb', 'Adjektiv'], 2));
      }
    },
    {
      id: 'mehrzahl', klassen: [4], schwierigkeit: 'leicht',
      titel: 'Einzahl und Mehrzahl', lp21: 'D.5.D.1',
      info: 'Die Mehrzahl richtig bilden.',
      gen: function () {
        var p = pick(MEHRZAHL);
        return { typ: 'text', frage: 'Wie heisst die Mehrzahl von «' + p[0] + '»?', antwort: p[1],
                 alternativen: [p[1].replace('die ', '')], hinweis: 'Mit Artikel schreiben: die …' };
      }
    },
    {
      id: 'grossklein', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'Gross- und Kleinschreibung', lp21: 'D.5.E.1',
      info: 'Welches Wort wird grossgeschrieben?',
      gen: function () {
        var saetze = [
          ['Wir gehen am ___ ins Schwimmbad.', 'Mittwoch', ['mittwoch']],
          ['Beim ___ hat er sich verletzt.', 'Turnen', ['turnen']],
          ['Das ___ Auto gehört meinem Onkel.', 'rote', ['Rote']],
          ['Sie kann sehr ___ rechnen.', 'schnell', ['Schnell']],
          ['Nach dem ___ machen wir Hausaufgaben.', 'Essen', ['essen']],
          ['Es ist etwas ___ passiert.', 'Schönes', ['schönes']],
          ['Wir haben ___ gelernt.', 'viel', ['Viel']],
          ['Am ___ fahren wir in die Berge.', 'Samstag', ['samstag']],
          ['Das ___ Wasser ist eiskalt.', 'klare', ['Klare']],
          ['Beim ___ muss man leise sein.', 'Lesen', ['lesen']]
        ];
        var s = pick(saetze);
        return wahl(s[0].replace('___', '…') + '\nWie schreibt man das fehlende Wort?', s[1], s[2],
                    'Nomen und nominalisierte Verben schreibt man gross.');
      }
    },
    {
      id: 'satzzeichen', klassen: [4], schwierigkeit: 'leicht',
      titel: 'Satzzeichen', lp21: 'D.5.E.1',
      info: 'Punkt, Fragezeichen oder Ausrufezeichen?',
      gen: function () {
        var saetze = [
          ['Wann beginnt die Schule', '?'], ['Der Hund bellt laut', '.'], ['Pass doch auf', '!'],
          ['Wo hast du das Buch hingelegt', '?'], ['Wir fahren morgen nach Bern', '.'],
          ['Wie schön das ist', '!'], ['Hast du deine Hausaufgaben gemacht', '?'],
          ['Im Sommer gehen wir baden', '.'], ['Komm sofort her', '!'], ['Warum lachst du', '?']
        ];
        var s = pick(saetze);
        return wahl('Welches Satzzeichen fehlt?\n«' + s[0] + '___»', s[1], distinct(s[1], ['.', '?', '!'], 2));
      }
    },
    {
      id: 'zeitformen4', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'Zeitformen bilden', lp21: 'D.5.D.1',
      info: 'Präsens, Präteritum und Perfekt — die drei Zeiten des Grundanspruchs.',
      gen: function () {
        var v = pick(STARKE_VERBEN);
        if (Math.random() < 0.5) {
          return { typ: 'text', frage: 'Setze «' + v[0] + '» ins Präteritum (Vergangenheit):\ner/sie ___',
                   antwort: v[1], hinweis: 'Zum Beispiel: gehen → ging', paar: 'verb:' + v[0] };
        }
        return { typ: 'text', frage: 'Setze «' + v[0] + '» ins Perfekt:\ner/sie ___', antwort: v[2],
                 alternativen: [v[2].replace('ist ', '').replace('hat ', '')],
                 hinweis: 'Mit Hilfsverb: hat … / ist …', paar: 'verb:' + v[0] };
      }
    },
    {
      id: 'faelle', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Die vier Fälle', lp21: 'D.5.D.1 (weiterführend)',
      info: 'Nominativ, Genitiv, Dativ, Akkusativ — im 2. Zyklus zum Kennenlernen.',
      gen: function () {
        var s = pick([
          ['Der Lehrer erklärt die Aufgabe.', 'Der Lehrer', 'Nominativ'],
          ['Ich gebe dem Kind einen Apfel.', 'dem Kind', 'Dativ'],
          ['Wir sehen den Turm von weitem.', 'den Turm', 'Akkusativ'],
          ['Das ist das Fahrrad meiner Schwester.', 'meiner Schwester', 'Genitiv'],
          ['Die Katze schläft auf dem Sofa.', 'dem Sofa', 'Dativ'],
          ['Er liest ein spannendes Buch.', 'ein spannendes Buch', 'Akkusativ'],
          ['Die Farbe des Autos gefällt mir.', 'des Autos', 'Genitiv'],
          ['Meine Freundin kommt später.', 'Meine Freundin', 'Nominativ'],
          ['Ich helfe meinem Bruder.', 'meinem Bruder', 'Dativ'],
          ['Wir besuchen unsere Grosseltern.', 'unsere Grosseltern', 'Akkusativ']
        ]);
        return wahl('In welchem Fall steht «' + s[1] + '»?\n' + s[0], s[2],
          distinct(s[2], ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'], 3),
          'Wer/was? = Nominativ · wessen? = Genitiv · wem? = Dativ · wen/was? = Akkusativ');
      }
    },
    {
      id: 'satzglieder', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Satzglieder', lp21: 'D.5.D.1.e — Stoff der Oberstufe',
      info: 'Subjekt, Prädikat, Objekt. Kommt erst im 3. Zyklus — gut als Vorbereitung.',
      gen: function () {
        var s = pick([
          ['Der Bauer melkt die Kuh.', 'Der Bauer', 'Subjekt'],
          ['Der Bauer melkt die Kuh.', 'melkt', 'Prädikat'],
          ['Der Bauer melkt die Kuh.', 'die Kuh', 'Objekt'],
          ['Meine Schwester schreibt einen Brief.', 'einen Brief', 'Objekt'],
          ['Die Kinder spielen im Garten.', 'Die Kinder', 'Subjekt'],
          ['Am Abend liest mein Vater die Zeitung.', 'liest', 'Prädikat'],
          ['Der Zug erreicht den Bahnhof pünktlich.', 'den Bahnhof', 'Objekt'],
          ['Unsere Nachbarn haben einen neuen Hund.', 'Unsere Nachbarn', 'Subjekt'],
          ['Der Postbote bringt ein Paket.', 'ein Paket', 'Objekt'],
          ['Meine Katze fängt eine Maus.', 'Meine Katze', 'Subjekt'],
          ['Wir besuchen morgen das Museum.', 'besuchen', 'Prädikat'],
          ['Die Sonne wärmt den Boden.', 'den Boden', 'Objekt'],
          ['Der Trainer lobt die Mannschaft.', 'Der Trainer', 'Subjekt'],
          ['Im Sommer pflücken wir Kirschen.', 'pflücken', 'Prädikat']
        ]);
        return wahl('Welches Satzglied ist «' + s[1] + '»?\n' + s[0], s[2],
          distinct(s[2], ['Subjekt', 'Prädikat', 'Objekt'], 2),
          'Prädikat = die Verbform · Subjekt = wer oder was?');
      }
    },
    {
      id: 'dasdass', klassen: [6], schwierigkeit: 'schwer',
      titel: 'das oder dass', lp21: 'D.5.E.1 (Schulpraxis)',
      info: 'Der Klassiker — mit der Ersatzprobe lösen.',
      gen: function () {
        var s = pick([
          ['Ich glaube, ___ es morgen regnet.', 'dass'],
          ['___ Buch liegt auf dem Tisch.', 'Das'],
          ['Er hofft, ___ er gewinnt.', 'dass'],
          ['___ ist mein Fahrrad.', 'Das'],
          ['Sie sagt, ___ sie später kommt.', 'dass'],
          ['Das Haus, ___ dort steht, ist alt.', 'das'],
          ['Ich weiss, ___ du recht hast.', 'dass'],
          ['___ Wetter wird besser.', 'Das'],
          ['Es freut mich, ___ du da bist.', 'dass'],
          ['Nimm das Heft, ___ ganz oben liegt.', 'das']
        ]);
        var falsch = s[1].toLowerCase() === 'dass' ? (s[0].indexOf('___') === 0 ? 'Das' : 'das') : 'dass';
        return wahl('Was gehört in die Lücke?\n' + s[0], s[1], [falsch],
          'Kannst du «dieses/jenes/welches» einsetzen? Dann «das» mit einem s.');
      }
    },
    {
      id: 'wortfamilie', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Wortstamm & Wortfamilie', lp21: 'D.5.D.1',
      info: 'Welches Wort gehört nicht dazu?',
      gen: function () {
        var gruppen = [
          [['fahren', 'Fahrrad', 'Fahrer', 'Fähre'], 'Fahne'],
          [['Schule', 'schulisch', 'Schüler', 'einschulen'], 'Schulter'],
          [['spielen', 'Spieler', 'Spielzeug', 'verspielt'], 'Spiegel'],
          [['Wald', 'Waldweg', 'bewaldet', 'Waldrand'], 'Wand'],
          [['schreiben', 'Schrift', 'Schreiber', 'abschreiben'], 'Schrank'],
          [['wohnen', 'Wohnung', 'Bewohner', 'gewohnt'], 'Wolke'],
          [['fliegen', 'Flug', 'Flieger', 'Flügel'], 'Fliese'],
          [['sprechen', 'Sprache', 'Gespräch', 'Sprecher'], 'Sprung'],
          [['bauen', 'Bauer', 'Gebäude', 'Bauarbeiter'], 'Bauch'],
          [['lesen', 'Leser', 'Lesebuch', 'vorlesen'], 'Leiter'],
          [['singen', 'Sänger', 'Gesang', 'Singvogel'], 'Sinken'],
          [['rechnen', 'Rechnung', 'Rechner', 'ausrechnen'], 'Recht']
        ];
        var g = pick(gruppen);
        return wahl('Welches Wort gehört NICHT in diese Wortfamilie?\n' + g[0].join(', ') + ', ' + g[1],
          g[1], distinct(g[1], g[0], 3), 'Achte auf den Wortstamm.');
      }
    },
    {
      id: 'rechtschreibung4', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'ie, ck, tz, f/v, e/ä', lp21: 'D.5.E.1',
      info: 'Die Rechtschreibregeln der 3./4. Klasse.',
      gen: function () {
        var w = pick([
          ['Sp__l', 'ie', ['i'], 'Langes i schreibt man meist ie.'],
          ['V__h', 'ie', ['i'], 'Langes i schreibt man meist ie.'],
          ['w__der', 'ie', ['i'], 'Langes i schreibt man meist ie.'],
          ['Br__f', 'ie', ['i'], 'Langes i schreibt man meist ie.'],
          ['Zu__er', 'ck', ['k', 'kk'], 'Nach kurzem Vokal steht ck.'],
          ['Bä__er', 'ck', ['k', 'kk'], 'Nach kurzem Vokal steht ck.'],
          ['Ja__e', 'ck', ['k', 'kk'], 'Nach kurzem Vokal steht ck.'],
          ['Ka__e', 'tz', ['z', 'zz'], 'Nach kurzem Vokal steht tz.'],
          ['Pla__', 'tz', ['z', 'zz'], 'Nach kurzem Vokal steht tz.'],
          ['Wi__', 'tz', ['z', 'zz'], 'Nach kurzem Vokal steht tz.'],
          ['__ogel', 'V', ['F'], 'Vogel, Vater, viel, vier — mit V.'],
          ['__ater', 'V', ['F'], 'Vogel, Vater, viel, vier — mit V.'],
          ['__enster', 'F', ['V'], 'Fenster schreibt man mit F.'],
          ['B__ume', 'äu', ['eu'], 'Von «Baum» abgeleitet, darum äu.'],
          ['H__ser', 'äu', ['eu'], 'Von «Haus» abgeleitet, darum äu.'],
          ['k__lter', 'ä', ['e'], 'Von «kalt» abgeleitet, darum ä.'],
          ['H__nde', 'ä', ['e'], 'Von «Hand» abgeleitet, darum ä.']
        ]);
        return wahl('Was gehört in die Lücke?\n' + w[0], w[1], w[2], w[3]);
      }
    },
    {
      id: 'doppelkonsonant', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Doppelte Konsonanten', lp21: 'D.5.E.1',
      info: 'Kurzer Vokal — Konsonant doppelt.',
      gen: function () {
        var w = pick([
          ['Sonne', 'Sone'], ['kommen', 'komen'], ['Wasser', 'Waser'], ['Butter', 'Buter'],
          ['immer', 'imer'], ['Puppe', 'Pupe'], ['Sommer', 'Somer'], ['rennen', 'renen'],
          ['Koffer', 'Kofer'], ['Teller', 'Teler'], ['Mutter', 'Muter'], ['schnell', 'schnel'],
          ['Ball', 'Bal'], ['Hammer', 'Hamer'], ['Wolle', 'Wole'], ['Suppe', 'Supe']
        ]);
        return wahl('Welche Schreibweise ist richtig?', w[0], [w[1]],
          'Nach einem kurz gesprochenen Vokal steht der Konsonant doppelt.');
      }
    },
    {
      id: 'trennregel', klassen: [5, 6], schwierigkeit: 'leicht',
      titel: 'Wörter trennen', lp21: 'D.5.E.1',
      info: 'Wo darf man das Wort trennen?',
      gen: function () {
        var w = pick([
          ['Fenster', 'Fens-ter', ['Fe-nster', 'Fenst-er']],
          ['Zucker', 'Zu-cker', ['Zuck-er', 'Z-ucker']],
          ['Kinder', 'Kin-der', ['Ki-nder', 'Kind-er']],
          ['Wasser', 'Was-ser', ['Wa-sser', 'Wass-er']],
          ['Bäcker', 'Bä-cker', ['Bäck-er', 'Bäc-ker']],
          ['Schule', 'Schu-le', ['Sch-ule', 'Schul-e']],
          ['Sonntag', 'Sonn-tag', ['So-nntag', 'Sonnt-ag']],
          ['Apfel', 'Ap-fel', ['A-pfel', 'Apf-el']],
          ['Winter', 'Win-ter', ['Wi-nter', 'Wint-er']],
          ['Flasche', 'Fla-sche', ['Flas-che', 'Flasch-e']]
        ]);
        return wahl('Wie trennt man «' + w[0] + '» richtig?', w[1], w[2],
          'Getrennt wird nach Sprechsilben; ck und sch bleiben zusammen.');
      }
    },
    {
      id: 'komma-aufzaehlung', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Komma bei Aufzählungen', lp21: 'D.5.E.1',
      info: 'Wie viele Kommas braucht der Satz?',
      gen: function () {
        var s = pick([
          ['Ich packe Brot Käse und einen Apfel ein.', 1],
          ['Wir kaufen Äpfel Birnen Bananen und Trauben.', 2],
          ['Im Etui sind Stifte Radiergummi Lineal und Schere.', 2],
          ['Meine Farben sind blau und grün.', 0],
          ['Sie mag Lesen Schwimmen Turnen und Malen.', 2],
          ['Auf dem Tisch liegen ein Buch ein Heft und ein Stift.', 1],
          ['Er hat einen Hund und eine Katze.', 0],
          ['Wir brauchen Mehl Zucker Butter Eier und Milch.', 3],
          ['Auf dem Bauernhof leben Kühe Schweine Hühner und Schafe.', 2],
          ['Ich habe einen Bruder und eine Schwester.', 0],
          ['Sie packt Turnschuhe T-Shirt Hose und Trinkflasche ein.', 2],
          ['Der Zug hält in Bern Thun und Interlaken.', 1],
          ['Wir haben Deutsch Mathe Turnen und Musik.', 2],
          ['Im Zoo sahen wir Löwen Elefanten Affen Giraffen und Pinguine.', 3],
          ['Heute ist es warm und sonnig.', 0]
        ]);
        return wahl('Wie viele Kommas fehlen in diesem Satz?\n«' + s[0] + '»', s[1],
          distinct(s[1], [0, 1, 2, 3, 4], 3),
          'Zwischen den Gliedern einer Aufzählung steht ein Komma — vor «und» aber nicht.');
      }
    },
    {
      id: 'zusammensetzung', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Zusammengesetzte Nomen', lp21: 'D.5.D.1',
      info: 'Aus welchen Wörtern besteht das Wort?',
      gen: function () {
        var w = pick([
          ['Haustür', 'Haus + Tür'], ['Schulweg', 'Schule + Weg'], ['Fussball', 'Fuss + Ball'],
          ['Kinderzimmer', 'Kinder + Zimmer'], ['Sonnenblume', 'Sonne + Blume'],
          ['Handschuh', 'Hand + Schuh'], ['Regenbogen', 'Regen + Bogen'],
          ['Taschenlampe', 'Tasche + Lampe'], ['Bahnhof', 'Bahn + Hof'],
          ['Baumhaus', 'Baum + Haus'], ['Winterjacke', 'Winter + Jacke'], ['Buchstabe', 'Buch + Stabe']
        ]);
        var falsche = shuffle([
          'Haus + Tor', 'Schule + Zeit', 'Fuss + Bahn', 'Kind + Zimmer',
          'Sonne + Blatt', 'Hand + Schuhe', 'Regen + Wolke', 'Tasche + Licht'
        ]).slice(0, 3);
        return wahl('Woraus besteht das Wort «' + w[0] + '»?', w[1], falsche,
          'Zusammengesetzte Nomen bestehen aus zwei eigenen Wörtern.');
      }
    }
  ];

  /* ============================================================
     ENGLISCH  (Lehrplan 21: Englisch ab 3. Klasse, Zyklus 2)
     ============================================================ */
  var VOKABELN = {
    tiere: [['der Hund', 'dog'], ['die Katze', 'cat'], ['das Pferd', 'horse'], ['der Vogel', 'bird'],
      ['der Fisch', 'fish'], ['die Maus', 'mouse'], ['das Schaf', 'sheep'], ['die Kuh', 'cow'],
      ['das Schwein', 'pig'], ['der Bär', 'bear'], ['der Fuchs', 'fox'], ['das Kaninchen', 'rabbit']],
    schule: [['das Buch', 'book'], ['der Stift', 'pen'], ['der Bleistift', 'pencil'], ['die Tafel', 'blackboard'],
      ['der Lehrer', 'teacher'], ['die Frage', 'question'], ['die Antwort', 'answer'], ['die Pause', 'break'],
      ['die Schultasche', 'schoolbag'], ['das Lineal', 'ruler'], ['die Schere', 'scissors'], ['die Klasse', 'class']],
    essen: [['der Apfel', 'apple'], ['das Brot', 'bread'], ['die Milch', 'milk'], ['das Wasser', 'water'],
      ['der Käse', 'cheese'], ['das Ei', 'egg'], ['die Kartoffel', 'potato'], ['der Kuchen', 'cake'],
      ['die Suppe', 'soup'], ['das Fleisch', 'meat'], ['die Erdbeere', 'strawberry'], ['der Saft', 'juice']],
    zuhause: [['das Haus', 'house'], ['die Küche', 'kitchen'], ['das Zimmer', 'room'], ['das Bett', 'bed'],
      ['der Tisch', 'table'], ['der Stuhl', 'chair'], ['die Tür', 'door'], ['das Fenster', 'window'],
      ['der Garten', 'garden'], ['der Schlüssel', 'key'], ['die Lampe', 'lamp'], ['das Bad', 'bathroom']],
    koerper: [['der Kopf', 'head'], ['die Hand', 'hand'], ['der Fuss', 'foot'], ['das Auge', 'eye'],
      ['das Ohr', 'ear'], ['der Mund', 'mouth'], ['das Haar', 'hair'], ['der Arm', 'arm'],
      ['das Bein', 'leg'], ['die Nase', 'nose'], ['der Finger', 'finger'], ['der Zahn', 'tooth']],
    zeit: [['heute', 'today'], ['morgen', 'tomorrow'], ['gestern', 'yesterday'], ['immer', 'always'],
      ['manchmal', 'sometimes'], ['nie', 'never'], ['die Woche', 'week'], ['der Monat', 'month'],
      ['der Sommer', 'summer'], ['der Winter', 'winter'], ['der Morgen', 'morning'], ['der Abend', 'evening']],
    farbenzahlen: [['eins', 'one'], ['zwei', 'two'], ['drei', 'three'], ['vier', 'four'], ['fünf', 'five'],
      ['sechs', 'six'], ['sieben', 'seven'], ['acht', 'eight'], ['neun', 'nine'], ['zehn', 'ten'],
      ['rot', 'red'], ['blau', 'blue'], ['grün', 'green'], ['gelb', 'yellow'], ['schwarz', 'black'], ['weiss', 'white']]
  };
  function alleVokabeln() {
    var out = [];
    Object.keys(VOKABELN).forEach(function (k) { out = out.concat(VOKABELN[k]); });
    return out;
  }

  var IRREGULAR = [
    ['go', 'went', 'gone', 'gehen'], ['see', 'saw', 'seen', 'sehen'], ['eat', 'ate', 'eaten', 'essen'],
    ['drink', 'drank', 'drunk', 'trinken'], ['write', 'wrote', 'written', 'schreiben'],
    ['read', 'read', 'read', 'lesen'], ['speak', 'spoke', 'spoken', 'sprechen'],
    ['take', 'took', 'taken', 'nehmen'], ['give', 'gave', 'given', 'geben'],
    ['come', 'came', 'come', 'kommen'], ['run', 'ran', 'run', 'rennen'],
    ['swim', 'swam', 'swum', 'schwimmen'], ['sing', 'sang', 'sung', 'singen'],
    ['find', 'found', 'found', 'finden'], ['buy', 'bought', 'bought', 'kaufen'],
    ['bring', 'brought', 'brought', 'bringen'], ['think', 'thought', 'thought', 'denken'],
    ['make', 'made', 'made', 'machen'], ['do', 'did', 'done', 'tun'], ['have', 'had', 'had', 'haben'],
    ['be', 'was', 'been', 'sein'], ['get', 'got', 'got', 'bekommen'], ['know', 'knew', 'known', 'wissen'],
    ['sleep', 'slept', 'slept', 'schlafen'], ['drive', 'drove', 'driven', 'fahren'],
    ['fly', 'flew', 'flown', 'fliegen'], ['catch', 'caught', 'caught', 'fangen'],
    ['begin', 'began', 'begun', 'beginnen'], ['win', 'won', 'won', 'gewinnen'], ['put', 'put', 'put', 'stellen']
  ];

  /* ---------------- Wortlisten ----------------
     Vokabel- und Lernwörterlisten werden aus Daten gebaut: aus den fest
     eingebauten Schulblättern und aus denen, welche die Dokumenten-Pipeline
     aus fotografierten Blättern erzeugt (siehe EIGENE weiter unten).

     Vokabel-Eintrag: { fremd, deutsch, satz, art, varianten }
     Lernwort-Eintrag: { wort, satz, art }
     satz trägt das geübte Wort in {geschweiften Klammern}.
     art: n Nomen, v Tätigkeit, a Eigenschaft, f Farbe, x anderes —
     Ablenker kommen möglichst aus derselben Wortart. */
  var SPRACHEN = {
    englisch: { name: 'Englisch', auf: 'auf Englisch', schreib: 'Write in English: ', luecke: 'Fill in: ',
                begleiter: /^(to|the|a|an) /i, lp21: 'FS1E.5.B.1', lp21schreib: 'FS1E.5.E.1',
                weglassen: ' · «a» und «to» darfst du weglassen.' },
    franzoesisch: { name: 'Französisch', auf: 'auf Französisch', schreib: 'Écris en français : ',
                    luecke: 'Complète : ', begleiter: /^(le |la |les |l'|un |une |des |se |s')/i,
                    lp21: 'FS2F.5.B.1', lp21schreib: 'FS2F.5.E.1', weglassen: ' · Mit Artikel, wie auf dem Blatt.' }
  };

  function gleicheArt(liste, w) {
    var gleich = liste.filter(function (v) { return v.art === w.art; });
    return gleich.length >= 4 ? gleich : liste;
  }
  function zaehlHinweis(kern) {
    var woerter = kern.split(' ').length;
    return woerter > 1 ? woerter + ' Wörter' : kern.length + ' Buchstaben';
  }
  /* Lückensatz: die Lücke und die Ablenker in derselben Schreibweise
     (am Satzanfang gross). */
  function luecke(satz, pool, ohne) {
    var m = satz.match(/\{([^}]+)\}/), gross = satz.charAt(0) === '{';
    var form = function (t) {
      t = ohne(t);
      return gross ? t.charAt(0).toUpperCase() + t.slice(1) : t;
    };
    return { satz: satz.replace(/\{[^}]+\}/, '___'), wort: m[1], ablenker: pool.map(form) };
  }

  function vokabelSets(L) {
    var sp = SPRACHEN[L.sprache] || SPRACHEN.englisch, E = L.eintraege;
    var ohne = function (t) { return t.replace(sp.begleiter, ''); };
    var paar = function (w) { return 'liste:' + L.id + ':' + w.fremd; };
    var anzahl = E.length + ' Wörter';
    return [{
      id: L.id, klassen: L.klassen, schwierigkeit: 'leicht',
      titel: L.titel + ' — wählen', lp21: sp.lp21,
      info: (L.info || 'Vom Schulblatt') + ' · ' + anzahl + ': Bedeutung wählen oder die Lücke im Satz füllen.',
      gen: function () {
        var w = pick(E), r = Math.random(), art = gleicheArt(E, w);
        if (w.satz && r < 0.35) {
          var l = luecke(w.satz, art.map(function (v) { return v.fremd; }), ohne);
          return wahl(sp.luecke + l.satz, l.wort, distinct(l.wort, l.ablenker, 3), '(' + w.deutsch + ')', paar(w));
        }
        if (r < 0.7) {
          return wahl('Was heisst «' + w.deutsch + '» ' + sp.auf + '?', w.fremd,
            distinct(w.fremd, art.map(function (v) { return v.fremd; }), 3), null, paar(w));
        }
        return wahl('Was heisst «' + w.fremd + '» auf Deutsch?', w.deutsch,
          distinct(w.deutsch, art.map(function (v) { return v.deutsch; }), 3), null, paar(w));
      }
    }, {
      id: L.id + '-write', klassen: L.klassen, schwierigkeit: 'schwer',
      titel: L.titel + ' — selber schreiben', lp21: sp.lp21schreib,
      info: (L.info || 'Vom Schulblatt') + ' · ' + anzahl + ' auswendig schreiben.',
      gen: function () {
        var w = pick(E), hinweis = zaehlHinweis(ohne(w.fremd));
        if (w.satz && Math.random() < 0.35) {
          var l = luecke(w.satz, [], ohne);
          return { typ: 'text', frage: sp.luecke + l.satz + '  (' + w.deutsch + ')', antwort: l.wort,
                   alternativen: w.varianten || [], hinweis: hinweis, paar: paar(w) };
        }
        return { typ: 'text', frage: sp.schreib + w.deutsch, antwort: w.fremd,
                 alternativen: w.varianten || [], hinweis: hinweis + sp.weglassen, paar: paar(w) };
      }
    }];
  }

  /* Falsche Schreibweisen für Lernwörter: typische Fehler der Mittelstufe. */
  var FEHLER = [
    [/ie/, 'i'], [/([^aeiouäöü])i([bdglmnrst])/, '$1ie$2'], [/ck/, 'k'], [/tz/, 'z'], [/ß/, 'ss'],
    [/ss/, 's'], [/([bdfglmnprt])\1/, '$1'], [/([aeiouäöü])([lmnpt])([aeiou])/, '$1$2$2$3'],
    [/äu/, 'eu'], [/eu/, 'äu'], [/ä/, 'e'], [/([aeiouäöü])h([lmnr])/i, '$1$2'],
    [/([^aeiouäöü][aiouäöü])([lmnr])(?!\2)/, '$1h$2'], [/d$/, 't'], [/t$/, 'd'], [/g$/, 'k'], [/b$/, 'p'],
    [/^V/, 'F'], [/^F/, 'V'], [/^v/, 'f'], [/ei/, 'ai'], [/ai/, 'ei'], [/chs/, 'x'], [/x/, 'chs'],
    [/qu/, 'kw'], [/ph/, 'f'], [/th/, 't'], [/(aa|ee|oo)/, function (m) { return m[0]; }],
    [/ng/, 'nk'], [/dt/, 't'], [/([^c])k/, '$1ck']
  ];
  /* grossKlein: auch die Gross-/Kleinschreibung verdrehen. Nur im Satz
     sinnvoll — allein kann «Schwimmen» durchaus richtig sein. */
  function falschGeschrieben(wort, grossKlein) {
    var out = [];
    FEHLER.forEach(function (f) {
      var v = wort.replace(f[0], f[1]);
      if (v !== wort && out.indexOf(v) < 0) out.push(v);
    });
    if (grossKlein) {
      var klein = wort.charAt(0).toLowerCase() + wort.slice(1), gross = wort.charAt(0).toUpperCase() + wort.slice(1);
      [klein, gross].forEach(function (v) { if (v !== wort && out.indexOf(v) < 0) out.push(v); });
    }
    /* Reicht das nicht, kommen glaubwürdige Tippfehler dazu, von hinten her:
       ein Konsonant oder a/e/o doppelt, dann ein Buchstabe vertauscht. */
    var dazu = function (t) { if (t !== wort && out.indexOf(t) < 0) out.push(t); };
    for (var i = wort.length - 1; out.length < 3 && i > 0; i--) {
      var c = wort.charAt(i);
      if (/[bdfglmnprtaeo]/.test(c) && wort.charAt(i - 1) !== c && wort.charAt(i + 1) !== c) {
        dazu(wort.slice(0, i + 1) + wort.slice(i));
      }
    }
    for (i = wort.length - 2; out.length < 3 && i > 0; i--) {
      dazu(wort.slice(0, i) + wort.charAt(i + 1) + wort.charAt(i) + wort.slice(i + 2));
    }
    /* Ganz kurze Wörter (Ei, See): irgendein Buchstabe doppelt. */
    for (i = wort.length - 1; out.length < 3 && i >= 0; i--) dazu(wort.slice(0, i + 1) + wort.slice(i));
    return out;
  }

  function lernwortSets(L) {
    var E = L.eintraege, anzahl = E.length + ' Wörter';
    var paar = function (w) { return 'liste:' + L.id + ':' + w.wort; };
    return [{
      id: L.id, klassen: L.klassen, schwierigkeit: 'leicht',
      titel: L.titel + ' — richtig geschrieben?', lp21: 'D.5.E.1',
      info: (L.info || 'Vom Schulblatt') + ' · ' + anzahl + ': die richtige Schreibweise finden.',
      gen: function () {
        var w = pick(E), m = w.satz && w.satz.match(/\{([^}]+)\}/);
        if (m && Math.random() < 0.5) {
          /* Im Satz zählt die Form in der Lücke — am Satzanfang gross. */
          return wahl('Welches Wort gehört richtig geschrieben in die Lücke?\n' +
            w.satz.replace(/\{[^}]+\}/, '___'), m[1],
            shuffle(falschGeschrieben(m[1], true)).slice(0, 3), null, paar(w));
        }
        return wahl('Welches Wort ist richtig geschrieben?' + (w.artikel ? '  (' + w.artikel + ' …)' : ''),
          w.wort, shuffle(falschGeschrieben(w.wort)).slice(0, 3), null, paar(w));
      }
    }, {
      id: L.id + '-write', klassen: L.klassen, schwierigkeit: 'schwer',
      titel: L.titel + ' — selber schreiben', lp21: 'D.5.E.1',
      info: (L.info || 'Vom Schulblatt') + ' · ' + anzahl + ' richtig schreiben.',
      gen: function () {
        var w = pick(E), m = w.satz && w.satz.match(/\{([^}]+)\}/);
        if (m && Math.random() < 0.5) {
          return { typ: 'text', frage: 'Schreib das fehlende Wort:\n' + w.satz.replace(/\{[^}]+\}/, '___'),
                   antwort: m[1], hinweis: 'Beginnt mit «' + m[1].charAt(0) + '» · ' + m[1].length + ' Buchstaben',
                   paar: paar(w) };
        }
        return { typ: 'text', frage: 'Hier ist ein Fehler drin. Schreib das Wort richtig:\n' +
                   pick(falschGeschrieben(w.wort)), antwort: w.wort,
                 hinweis: w.wort.length + ' Buchstaben', paar: paar(w) };
      }
    }];
  }

  /* ---------------- Mathe vom Blatt ----------------
     Aufgaben aus einem fotografierten Mathe-Blatt kommen als { thema, werte }.
     Die Lösung rechnet die Lernwelt selbst. Jedes Thema kann die Aufgabe vom
     Blatt stellen (aus) und nach ihrem Vorbild eine neue erfinden (neu), mit
     Zahlen in derselben Grössenordnung. */
  function teilerVon(n) { var t = []; for (var i = 1; i <= n; i++) if (n % i === 0) t.push(i); return t; }
  function istPrim(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
  function kgV(a, b) { return a / ggT(a, b) * b; }
  function zahlText(n) { return n >= 10000 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "'") : String(n); }
  function jaNein(frage, ja, hinweis) { return wahl(frage, ja ? 'Ja' : 'Nein', [ja ? 'Nein' : 'Ja'], hinweis); }
  function aehnlich(x, unten) { return Math.max(unten || 2, Math.round(x * (0.6 + Math.random() * 0.8))); }
  function gekuerzt(z, n) { var t = ggT(z, n); return { z: z / t, n: n / t }; }
  function bruchAntwort(z, n) { var g = gekuerzt(z, n); return g.n === 1 ? String(g.z) : g.z + '/' + g.n; }
  function zufallsBruch(maxNenner) {
    var n = rint(2, maxNenner || 12), z = rint(1, n - 1);
    while (ggT(z, n) !== 1) z = rint(1, n - 1);
    return { z: z, n: n };
  }
  var TEILBAR_REGEL = {
    2: 'Die letzte Ziffer ist gerade.', 3: 'Die Quersumme ist durch 3 teilbar.',
    4: 'Die letzten zwei Ziffern sind durch 4 teilbar.', 5: 'Die letzte Ziffer ist 0 oder 5.',
    6: 'Durch 2 und durch 3 teilbar: gerade und Quersumme durch 3 teilbar.',
    8: 'Die letzten drei Ziffern sind durch 8 teilbar.', 9: 'Die Quersumme ist durch 9 teilbar.',
    10: 'Die letzte Ziffer ist 0.', 25: 'Endet auf 00, 25, 50 oder 75.'
  };
  var MATHE_BLATT = {
    teiler: { name: 'Teiler',
      aus: function (w) {
        return { typ: 'text', frage: 'Nenne alle Teiler von ' + w[0] + '.', antwort: teilerVon(w[0]).join(', '),
                 vergleich: 'menge', hinweis: 'Mit Komma trennen, die Reihenfolge ist egal.' };
      },
      neu: function (w) {
        var n = aehnlich(w[0], 6);
        for (var i = 0; i < 30 && teilerVon(n).length < 4; i++) n = aehnlich(w[0], 6);
        if (Math.random() < 0.3) return { typ: 'zahl', frage: 'Wie viele Teiler hat ' + n + '?', antwort: String(teilerVon(n).length) };
        return this.aus([n]);
      } },
    gemeinsame_teiler: { name: 'gemeinsame Teiler',
      aus: function (w) {
        var t = teilerVon(w[0]).filter(function (x) { return w[1] % x === 0; });
        return { typ: 'text', frage: 'Welche Teiler haben ' + w[0] + ' und ' + w[1] + ' gemeinsam?', antwort: t.join(', '),
                 vergleich: 'menge', hinweis: 'Alle gemeinsamen, mit Komma getrennt. 1 gehört auch dazu.' };
      },
      neu: function (w) {
        var g = rint(2, 6), m = rint(2, 7), n = rint(2, 7);
        while (n === m) n = rint(2, 7);
        return this.aus([g * m, g * n]);
      } },
    ggt: { name: 'ggT',
      aus: function (w) {
        return { typ: 'zahl', frage: 'Grösster gemeinsamer Teiler (ggT) von ' + w[0] + ' und ' + w[1] + '?',
                 antwort: String(ggT(w[0], w[1])), hinweis: 'Die grösste Zahl, die in beiden aufgeht.' };
      },
      neu: function (w) {
        var gross = Math.max(w[0], w[1], 24), g = rint(2, Math.max(3, Math.floor(gross / 4)));
        var m = Math.random() < 0.25 ? 1 : rint(2, 5), n = rint(m + 1, m + 4);
        while (ggT(m, n) !== 1) n++;
        return this.aus(shuffle([g * m, g * n]));
      } },
    kgv: { name: 'kgV',
      aus: function (w) {
        return { typ: 'zahl', frage: 'Kleinstes gemeinsames Vielfaches (kgV) von ' + w[0] + ' und ' + w[1] + '?',
                 antwort: String(kgV(w[0], w[1])), hinweis: 'Zähle die Vielfachen der grösseren Zahl, bis die kleinere darin aufgeht.' };
      },
      neu: function (w) {
        var gross = Math.max(w[0], w[1], 10), a = rint(2, gross), b = rint(2, gross);
        while (b === a || kgV(a, b) > 150) { a = rint(2, gross); b = rint(2, gross); }
        return this.aus([a, b]);
      } },
    primzahl: { name: 'Primzahlen',
      aus: function (w) {
        return jaNein('Ist ' + w[0] + ' eine Primzahl?', istPrim(w[0]), 'Eine Primzahl hat genau zwei Teiler: 1 und sich selbst.');
      },
      neu: function (w) {
        var oben = Math.max(40, w[0] + 30), unten = Math.max(2, w[0] - 30);
        var primz = [], falle = [];
        for (var n = unten; n <= oben; n++) {
          if (istPrim(n)) primz.push(n);
          else if (n % 2 && n % 5) falle.push(n);     /* ungerade Nicht-Primzahlen sind die Fallen */
        }
        if (Math.random() < 0.5 && primz.length && falle.length >= 3) {
          var p = pick(primz);
          return wahl('Welche Zahl ist eine Primzahl?', String(p), distinct(p, falle, 3).map(String),
                      'Eine Primzahl hat genau zwei Teiler: 1 und sich selbst.');
        }
        return this.aus([Math.random() < 0.5 && primz.length ? pick(primz) : pick(falle.length ? falle : [9])]);
      } },
    gleichwertig: { name: 'gleichwertige Brüche',
      aus: function (w) {
        var k = rint(2, 6);
        return { typ: 'zahl', frage: 'Ergänze, damit die Brüche gleichwertig sind:\n' + w[0] + '/' + w[1] + ' = ___/' + (w[1] * k),
                 antwort: String(w[0] * k), hinweis: 'Womit wurde der Nenner multipliziert? Mit dem Zähler dasselbe tun.' };
      },
      neu: function (w) {
        var b = zufallsBruch(Math.max(8, Math.min(20, w[1]))), k = rint(2, 6);
        if (Math.random() < 0.5) return this.aus([b.z, b.n]);
        var richtig = (b.z * k) + '/' + (b.n * k);
        /* Typische Fehler: nur oben erweitert, oben und unten addiert … — aber nie
           ein Bruch, der zufällig doch gleichwertig ist, und keiner doppelt. */
        var falsch = [[b.z * k + 1, b.n * k], [b.z * k, b.n * k + k], [b.z + k, b.n + k],
                      [b.z * k, b.n + k], [b.z + k, b.n * k], [b.z * k - 1, b.n * k]]
          .filter(function (f) { return f[0] > 0 && f[1] > 0 && f[0] * b.n !== f[1] * b.z; })
          .map(function (f) { return f[0] + '/' + f[1]; });
        return wahl('Welcher Bruch ist gleichwertig zu ' + b.z + '/' + b.n + '?', richtig,
          distinct(richtig, falsch, 3), null);
      } },
    ergaenzen: { name: 'Zähler und Nenner ergänzen',
      aus: function (w) {
        var frage = w[2] === null
          ? w[0] + '/' + w[1] + ' = ___/' + w[3]
          : w[0] + '/' + w[1] + ' = ' + w[2] + '/___';
        var loesung = w[2] === null ? w[0] * w[3] / w[1] : w[1] * w[2] / w[0];
        return { typ: 'zahl', frage: 'Erweitere oder kürze:\n' + frage, antwort: String(loesung),
                 hinweis: 'Mit welcher Zahl wurde multipliziert oder geteilt? Oben und unten dasselbe.' };
      },
      neu: function (w) {
        var gross = Math.max(w[0], w[1]), b = zufallsBruch(gross > 100 ? 10 : 9);
        var faktoren = gross > 200 ? [10, 20, 25, 50, 100, 125, 200] : [2, 3, 4, 5, 6, 7, 8, 9, 12];
        var k1 = pick(faktoren), k2 = pick(faktoren);
        while (k2 === k1) k2 = pick(faktoren);
        return this.aus(Math.random() < 0.5
          ? [b.z * k1, b.n * k1, null, b.n * k2]
          : [b.z * k1, b.n * k1, b.z * k2, null]);
      } },
    kuerzen: { name: 'Kürzen',
      aus: function (w) {
        return { typ: 'text', frage: 'Kürze so weit wie möglich:\n' + w[0] + '/' + w[1], antwort: bruchAntwort(w[0], w[1]),
                 vergleich: 'bruch', hinweis: 'Teile Zähler und Nenner durch den ggT. Schreib z.B. 4/7.' };
      },
      neu: function (w) {
        var gross = Math.max(w[0], w[1]), b = zufallsBruch(12);
        var k = gross > 200 ? pick([8, 12, 15, 25, 40, 45, 60, 125]) : rint(2, Math.max(4, Math.min(14, Math.floor(gross / b.n))));
        return this.aus([b.z * k, b.n * k]);
      } },
    teilbarkeit: { name: 'Teilbarkeit',
      aus: function (w) {
        return jaNein('Ist ' + zahlText(w[0]) + ' durch ' + w[1] + ' teilbar?', w[0] % w[1] === 0,
                      TEILBAR_REGEL[w[1]] || null);
      },
      neu: function (w) {
        var t = w[1], n = aehnlich(w[0], 100);
        n = n - n % t;
        if (Math.random() < 0.5) n += rint(1, t - 1);
        return this.aus([n, t]);
      } },
    rechnen: { name: 'Rechnen',
      aus: function (w) {
        var e = { '+': w[0] + w[2], '-': w[0] - w[2], '·': w[0] * w[2], ':': w[0] / w[2] }[w[1]];
        return { typ: 'zahl', frage: zahlText(w[0]) + ' ' + w[1] + ' ' + zahlText(w[2]) + ' =', antwort: String(e) };
      },
      neu: function (w) {
        var a = aehnlich(w[0], 2), b = aehnlich(w[2], 2);
        if (w[1] === '-' && b > a) { var h = a; a = b; b = h; }
        if (w[1] === ':') a = b * aehnlich(Math.max(2, Math.round(w[0] / w[2])), 2);
        return this.aus([a, w[1], b]);
      } },
    bruchrechnen: { name: 'Bruchrechnen',
      aus: function (w) {
        var a = w[0].split('/').map(Number), b = w[2].split('/').map(Number), z, n;
        if (w[1] === '+') { z = a[0] * b[1] + b[0] * a[1]; n = a[1] * b[1]; }
        else if (w[1] === '-') { z = a[0] * b[1] - b[0] * a[1]; n = a[1] * b[1]; }
        else if (w[1] === '·') { z = a[0] * b[0]; n = a[1] * b[1]; }
        else { z = a[0] * b[1]; n = a[1] * b[0]; }
        return { typ: 'text', frage: w[0] + ' ' + w[1] + ' ' + w[2] + ' =', antwort: bruchAntwort(z, n),
                 vergleich: 'bruch', hinweis: 'Vollständig gekürzt, z.B. 7/12. Ganze Zahlen ohne Nenner.' };
      },
      neu: function (w) {
        var a = w[0].split('/').map(Number), b = w[2].split('/').map(Number);
        var n1 = Math.max(2, aehnlich(a[1], 2)), n2 = Math.max(2, aehnlich(b[1], 2));
        var z1 = rint(1, n1 - 1), z2 = rint(1, n2 - 1);
        if (w[1] === '-' && z1 * n2 < z2 * n1) { var h = [z1, n1]; z1 = z2; n1 = n2; z2 = h[0]; n2 = h[1]; }
        return this.aus([z1 + '/' + n1, w[1], z2 + '/' + n2]);
      } }
  };

  function matheSets(L) {
    var A = (L.aufgaben || []).filter(function (a) { return MATHE_BLATT[a.thema]; });
    var nachThema = {};
    A.forEach(function (a) { (nachThema[a.thema] = nachThema[a.thema] || []).push(a); });
    var themen = Object.keys(nachThema);
    /* Wo auf dem Blatt Fehler waren, kommt das Thema dreimal so oft dran. */
    var gewicht = themen.map(function (t) { return L.themen && L.themen[t] && L.themen[t].fehler ? 3 : 1; });
    var summe = gewicht.reduce(function (a, b) { return a + b; }, 0);
    function gewichtet() {
      var r = Math.random() * summe;
      for (var i = 0; i < themen.length; i++) { r -= gewicht[i]; if (r < 0) return themen[i]; }
      return themen[themen.length - 1];
    }
    var namen = themen.map(function (t) { return MATHE_BLATT[t].name; }).join(', ');
    return [{
      id: L.id, klassen: L.klassen, schwierigkeit: 'leicht',
      titel: L.titel + ' — nochmals das Blatt', lp21: 'MA.1.A.1 / MA.1.A.3',
      info: (L.info || 'Vom Blatt') + ' · ' + A.length + ' Aufgaben vom Blatt, bunt gemischt.',
      gen: function () {
        var a = pick(nachThema[pick(themen)]), x = MATHE_BLATT[a.thema].aus(a.werte);
        x.paar = 'blatt:' + L.id + ':' + a.thema + ':' + a.werte.join(',');
        return x;
      }
    }, {
      id: L.id + '-neu', klassen: L.klassen, schwierigkeit: 'schwer',
      titel: L.titel + ' — ähnliche Aufgaben', lp21: 'MA.1.A.1 / MA.1.A.3',
      info: 'Neue Aufgaben wie auf dem Blatt: ' + namen + '.',
      gen: function () {
        var t = gewichtet();
        return MATHE_BLATT[t].neu(pick(nachThema[t]).werte);
      }
    }];
  }

  function listenSets(L) {
    return L.art === 'mathe' ? matheSets(L) : L.art === 'lernwoerter' ? lernwortSets(L) : vokabelSets(L);
  }

  /* Schulblatt «English Vocabulary: Unit Words», 4. Klasse (28 Wörter),
     eingescannt über die Dokumenten-Pipeline am 11.09.2026. */
  var UNIT_WORDS = {
    id: 'unit-words', art: 'vokabeln', sprache: 'englisch', klassen: [4],
    titel: 'Unit Words', info: 'Englisch-Blatt der 4. Klasse',
    eintraege: [
      ['a clock', 'eine Uhr (Wanduhr)', 'Look at the {clock}, it is twelve o\'clock.', 'n'],
      ['a clown', 'ein Clown', 'The {clown} makes funny jokes.', 'n'],
      ['a duck', 'eine Ente', 'A yellow {duck} swims in the pond.', 'n'],
      ['a guitar', 'eine Gitarre', 'She plays a song on her {guitar}.', 'n'],
      ['a lake', 'ein See', 'We go for a swim in the {lake}.', 'n'],
      ['a trumpet', 'eine Trompete', 'He plays the {trumpet} very loudly.', 'n'],
      ['to colour', 'anmalen / ausmalen', '{Colour} the picture with pencils, please.', 'v'],
      ['to cut', 'schneiden', 'Use the scissors to {cut} the paper.', 'v'],
      ['to draw', 'zeichnen', 'Can you {draw} a nice house?', 'v'],
      ['to listen', 'zuhören', '{Listen} carefully to the teacher.', 'v'],
      ['to look', 'schauen / blicken', '{Look} at the blackboard, please.', 'v'],
      ['to open your book', 'dein Buch aufschlagen', '{Open your book} on page ten.', 'v', ['open the book']],
      ['to put your hand up', 'aufstrecken', '{Put your hand up} if you know the answer.', 'v', ['put up your hand']],
      ['to read', 'lesen', 'We {read} a short story together.', 'v'],
      ['to write', 'schreiben', '{Write} the words in your notebook.', 'v'],
      ['a castle', 'eine Burg / ein Schloss', 'A king lives in the big {castle}.', 'n'],
      ['a cloud', 'eine Wolke', 'There is a white {cloud} in the sky.', 'n'],
      ['a forest', 'ein Wald', 'Many trees grow in the {forest}.', 'n'],
      ['grass', 'Gras', 'The cow eats green {grass}.', 'n'],
      ['a hill', 'ein Hügel', 'The children run up the {hill}.', 'n'],
      ['a mountain', 'ein Berg', 'Mount Everest is a high {mountain}.', 'n'],
      ['a picture', 'ein Bild', 'She draws a colourful {picture}.', 'n'],
      ['the sky', 'der Himmel', 'Birds fly high in the blue {sky}.', 'n'],
      ['a road', 'eine Strasse', 'Cars drive along the {road}.', 'n'],
      ['light blue', 'hellblau', 'The sea is {light blue} today.', 'f'],
      ['dark blue', 'dunkelblau', 'The night sky is {dark blue}.', 'f'],
      ['light green', 'hellgrün', 'Fresh leaves in spring are {light green}.', 'f'],
      ['dark green', 'dunkelgrün', 'The pine tree is {dark green}.', 'f']
    ].map(function (r) { return { fremd: r[0], deutsch: r[1], satz: r[2], art: r[3], varianten: r[4] }; })
  };

  var ENGLISCH = vokabelSets(UNIT_WORDS).concat([
    {
      id: 'words-basic', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Words — choose the answer', lp21: 'FS1E.5.B.1',
      info: 'Wörter erkennen (Auswahl).',
      gen: function () {
        var alle = alleVokabeln(), w = pick(alle);
        var deToEn = Math.random() < 0.6;
        var korrekt = deToEn ? w[1] : w[0];
        var pool = alle.map(function (v) { return deToEn ? v[1] : v[0]; });
        return wahl((deToEn ? 'Was heisst «' + w[0] + '» auf Englisch?' : 'Was heisst «' + w[1] + '» auf Deutsch?'),
          korrekt, distinct(korrekt, pool, 3), null, 'wort:' + w[0]);
      }
    },
    {
      id: 'words-write', klassen: [4, 5, 6], schwierigkeit: 'schwer',
      titel: 'Words — write them', lp21: 'FS1E.5.E.1',
      info: 'Wörter selbst schreiben.',
      gen: function () {
        var w = pick(alleVokabeln());
        return { typ: 'text', frage: 'Write in English: ' + w[0], antwort: w[1],
                 hinweis: w[1].length + ' Buchstaben' };
      }
    },
    {
      id: 'plural-en', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Plural forms', lp21: 'FS1E.5.D.1',
      info: 'Mehrzahl im Englischen.',
      gen: function () {
        var p = pick([['one dog', 'two dogs'], ['one box', 'two boxes'], ['one child', 'two children'],
          ['one man', 'two men'], ['one woman', 'two women'], ['one mouse', 'two mice'],
          ['one baby', 'two babies'], ['one bus', 'two buses'], ['one foot', 'two feet'],
          ['one tooth', 'two teeth'], ['one city', 'two cities'], ['one watch', 'two watches']]);
        return { typ: 'text', frage: p[0] + ' → two ___ ?', antwort: p[1].replace('two ', ''),
                 hinweis: 'Nur das Wort, ohne «two».' };
      }
    },
    {
      id: 'simple-past', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Simple past — irregular verbs', lp21: 'FS1E.5.D.1',
      info: 'Die zweite Verbform (past tense).',
      gen: function () {
        var v = pick(IRREGULAR);
        if (Math.random() < 0.3) {
          return { typ: 'text', frage: 'Past participle of «' + v[0] + '» (3. Form):', antwort: v[2],
                   hinweis: '(' + v[3] + ')', paar: 'irr:' + v[0] };
        }
        return { typ: 'text', frage: 'Simple past of «' + v[0] + '»:', antwort: v[1],
                 hinweis: '(' + v[3] + ')', paar: 'irr:' + v[0] };
      }
    },
    {
      id: 'questions-en', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Questions & short answers', lp21: 'FS1E.5.D.1',
      info: 'do / does / did und Fragewörter.',
      gen: function () {
        var s = pick([
          ['___ you like pizza?', 'Do', ['Does', 'Did', 'Are']],
          ['___ she play football?', 'Does', ['Do', 'Did', 'Is']],
          ['___ they go to school yesterday?', 'Did', ['Do', 'Does', 'Was']],
          ['___ is your birthday?', 'When', ['Who', 'Which', 'How']],
          ['___ old are you?', 'How', ['What', 'When', 'Who']],
          ['___ is that girl over there?', 'Who', ['What', 'When', 'How']],
          ['___ do you live?', 'Where', ['When', 'Who', 'Which']],
          ['___ he got a bike?', 'Has', ['Have', 'Is', 'Does']],
          ['___ you at home last night?', 'Were', ['Was', 'Are', 'Did']],
          ['___ colour do you like best?', 'Which', ['Who', 'When', 'How']]
        ]);
        return wahl('Fill in: ' + s[0], s[1], s[2]);
      }
    },
    {
      id: 'sentences-en', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Everyday sentences', lp21: 'FS1E.4.A.1 / FS1E.3.D.1',
      info: 'Ganze Sätze übersetzen.',
      gen: function () {
        /* Erste Fassung ist die Musterlösung, alle weiteren zählen auch.
           Kurzformen (don't), britische und amerikanische Schreibweisen sowie
           Satzzeichen am Schluss werden ohnehin gleich behandelt. */
        var s = pick([
          ['Ich habe einen Bruder.',
           ['I have a brother.', 'I have got a brother.', 'I have one brother.']],
          ['Wie geht es dir?',
           ['How are you?', 'How are you doing?', 'How do you feel?']],
          ['Meine Lieblingsfarbe ist blau.',
           ['My favourite colour is blue.', 'Blue is my favourite colour.']],
          ['Wir spielen jeden Tag Fussball.',
           ['We play football every day.', 'Every day we play football.',
            'We play soccer every day.', 'We are playing football every day.']],
          ['Sie wohnt in der Schweiz.',
           ['She lives in Switzerland.', 'She is living in Switzerland.']],
          ['Ich bin elf Jahre alt.',
           ['I am eleven years old.', 'I am 11 years old.', 'I am eleven.']],
          ['Das Wetter ist heute schön.',
           ['The weather is nice today.', 'Today the weather is nice.',
            'The weather is good today.', 'The weather is beautiful today.',
            'It is nice weather today.', 'The weather today is nice.']],
          ['Er kann sehr gut schwimmen.',
           ['He can swim very well.', 'He can swim really well.',
            'He is very good at swimming.', 'He is a very good swimmer.']],
          ['Wo ist der Bahnhof?',
           ['Where is the station?', 'Where is the train station?',
            'Where is the railway station?']],
          ['Ich mag Schokolade nicht.',
           ['I do not like chocolate.', 'I dislike chocolate.']],
          ['Wir gehen am Samstag ins Kino.',
           ['We go to the cinema on Saturday.', 'On Saturday we go to the cinema.',
            'We are going to the cinema on Saturday.', 'We go to the movies on Saturday.']],
          ['Mein Bruder hat einen Hund.',
           ['My brother has a dog.', 'My brother has got a dog.']],
          ['Ich stehe um sieben Uhr auf.',
           ['I get up at seven.', 'I get up at seven o\'clock.', 'I get up at 7.',
            'I get up at 7 o\'clock.']],
          ['Sie ist meine beste Freundin.',
           ['She is my best friend.']],
          ['Wie viel kostet das?',
           ['How much is it?', 'How much does it cost?', 'How much is that?']],
          ['Es tut mir leid, ich verstehe das nicht.',
           ['I am sorry, I do not understand.', 'Sorry, I do not understand.',
            'I am sorry, I do not understand this.', 'Sorry, I do not understand that.']]
        ]);
        return { typ: 'text', frage: 'Translate: ' + s[0], antwort: s[1][0],
                 alternativen: s[1].slice(1), paar: 'satz:' + s[0],
                 hinweis: 'Ganzer Satz. Satzzeichen sind egal, und oft gibt es mehrere richtige Lösungen.' };
      }
    },
    {
      id: 'be-have', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'to be / have got', lp21: 'FS1E.5.D.1',
      info: 'am, is, are — have, has.',
      gen: function () {
        var s = pick([
          ['I ___ eleven years old.', 'am', ['is', 'are']],
          ['She ___ my best friend.', 'is', ['am', 'are']],
          ['We ___ in the same class.', 'are', ['am', 'is']],
          ['They ___ very hungry.', 'are', ['is', 'am']],
          ['My brother ___ a new bike.', 'has got', ['have got', 'is got']],
          ['I ___ two cats at home.', 'have got', ['has got', 'am got']],
          ['It ___ cold today.', 'is', ['are', 'am']],
          ['You ___ right!', 'are', ['is', 'am']],
          ['The dogs ___ in the garden.', 'are', ['is', 'am']],
          ['Peter ___ got a sister.', 'has', ['have', 'is']]
        ]);
        return wahl('Fill in: ' + s[0], s[1], s[2]);
      }
    },
    {
      id: 'present-s', klassen: [4, 5, 6], schwierigkeit: 'schwer',
      titel: 'Simple present — the -s', lp21: 'FS1E.5.D.1',
      info: 'he, she, it — das s muss mit.',
      gen: function () {
        var v = pick([
          ['play', 'plays'], ['read', 'reads'], ['live', 'lives'], ['like', 'likes'],
          ['go', 'goes'], ['do', 'does'], ['watch', 'watches'], ['study', 'studies'],
          ['fly', 'flies'], ['run', 'runs'], ['eat', 'eats'], ['teach', 'teaches']
        ]);
        var subj = pick(['He', 'She', 'My brother', 'The teacher', 'Anna']);
        return { typ: 'text', frage: subj + ' ___ (' + v[0] + ') every day.', antwort: v[1],
                 hinweis: 'Nur das Verb schreiben.' };
      }
    },
    {
      id: 'word-order', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Word order', lp21: 'FS1E.5.D.1',
      info: 'Welcher Satz ist richtig gebaut?',
      gen: function () {
        var s = pick([
          ['I always go to school by bike.', ['I go always to school by bike.', 'Always I go to school by bike.']],
          ['She never eats breakfast.', ['She eats never breakfast.', 'Never she eats breakfast.']],
          ['We played football yesterday.', ['We played yesterday football.', 'Yesterday played we football.']],
          ['Do you like pizza?', ['You do like pizza?', 'Like you pizza?']],
          ['My sister is often late.', ['My sister often is late.', 'Often my sister is late.']],
          ['They live in a small house.', ['They in a small house live.', 'They live in a house small.']],
          ['I did not see him.', ['I saw not him.', 'I not did see him.']],
          ['Where does your friend live?', ['Where lives your friend?', 'Where your friend does live?']],
          ['She has got a new bike.', ['She has a new bike got.', 'Got she a new bike.']],
          ['We are going to the cinema tonight.', ['We are going tonight to the cinema.', 'Tonight going we are to the cinema.']],
          ['He can play the guitar very well.', ['He can very well play the guitar.', 'He can play very well the guitar.']],
          ['My parents work in a hospital.', ['My parents in a hospital work.', 'Work my parents in a hospital.']],
          ['I have never been to London.', ['I never have been to London.', 'I have been never to London.']]
        ]);
        return wahl('Which sentence is correct?', s[0], s[1],
          'Subjekt – Verb – Objekt; Häufigkeitswörter stehen vor dem Vollverb.');
      }
    },
    {
      id: 'phrases', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Everyday phrases', lp21: 'FS1E.3.A.1',
      info: 'Was sagst du in dieser Situation?',
      gen: function () {
        var s = pick([
          ['Du möchtest ein Getränk bestellen.', "Can I have a coke, please?", ['I want coke now.', 'Give me a coke.']],
          ['Du triffst jemanden am Morgen.', 'Good morning!', ['Good night!', 'Good bye!']],
          ['Jemand hilft dir.', 'Thank you very much.', ['You are welcome.', 'Never mind.']],
          ['Du hast die Frage nicht verstanden.', 'Sorry, can you repeat that?', ['I know nothing.', 'Speak again now.']],
          ['Du willst wissen, wie spät es ist.', 'What time is it?', ['How is the time?', 'When is the clock?']],
          ['Du stellst dich vor.', "My name is Joris.", ['I am called by Joris.', 'Me Joris.']],
          ['Du fragst nach dem Weg.', 'Excuse me, where is the station?', ['Where go station?', 'Say me the station.']],
          ['Du möchtest wissen, wie alt jemand ist.', 'How old are you?', ['How many years you?', 'What age have you?']],
          ['Du entschuldigst dich.', "I'm sorry.", ['I am sad.', 'Excuse it.']],
          ['Du wünschst jemandem eine gute Nacht.', 'Good night!', ['Good evening!', 'Have a night!']],
          ['Du fragst, wie viel etwas kostet.', 'How much is it?', ['How many costs?', 'What price have it?']],
          ['Du möchtest auf die Toilette.', 'Can I go to the toilet, please?', ['I must toilet.', 'Where I go toilet?']],
          ['Du gratulierst zum Geburtstag.', 'Happy birthday!', ['Good birthday!', 'Congratulation day!']]
        ]);
        return wahl(s[0], s[1], s[2]);
      }
    }
  ]);

  /* ============================================================
     NMG — Räume, Zeiten, Gesellschaften
     ============================================================ */
  var KANTONE = [
    ['Zürich', 'ZH', 'Zürich'], ['Bern', 'BE', 'Bern'], ['Luzern', 'LU', 'Luzern'], ['Uri', 'UR', 'Altdorf'],
    ['Schwyz', 'SZ', 'Schwyz'], ['Obwalden', 'OW', 'Sarnen'], ['Nidwalden', 'NW', 'Stans'], ['Glarus', 'GL', 'Glarus'],
    ['Zug', 'ZG', 'Zug'], ['Freiburg', 'FR', 'Freiburg'], ['Solothurn', 'SO', 'Solothurn'],
    ['Basel-Stadt', 'BS', 'Basel'], ['Basel-Landschaft', 'BL', 'Liestal'], ['Schaffhausen', 'SH', 'Schaffhausen'],
    ['Appenzell Ausserrhoden', 'AR', 'Herisau'], ['Appenzell Innerrhoden', 'AI', 'Appenzell'],
    ['St. Gallen', 'SG', 'St. Gallen'], ['Graubünden', 'GR', 'Chur'], ['Aargau', 'AG', 'Aarau'],
    ['Thurgau', 'TG', 'Frauenfeld'], ['Tessin', 'TI', 'Bellinzona'], ['Waadt', 'VD', 'Lausanne'],
    ['Wallis', 'VS', 'Sitten'], ['Neuenburg', 'NE', 'Neuenburg'], ['Genf', 'GE', 'Genf'], ['Jura', 'JU', 'Delsberg']
  ];

  var EUROPA = [
    ['Deutschland', 'Berlin'], ['Frankreich', 'Paris'], ['Italien', 'Rom'], ['Österreich', 'Wien'],
    ['Spanien', 'Madrid'], ['Portugal', 'Lissabon'], ['Niederlande', 'Amsterdam'], ['Belgien', 'Brüssel'],
    ['Polen', 'Warschau'], ['Tschechien', 'Prag'], ['Ungarn', 'Budapest'], ['Griechenland', 'Athen'],
    ['Schweden', 'Stockholm'], ['Norwegen', 'Oslo'], ['Dänemark', 'Kopenhagen'], ['Finnland', 'Helsinki'],
    ['Grossbritannien', 'London'], ['Irland', 'Dublin'], ['Kroatien', 'Zagreb'], ['Slowenien', 'Ljubljana']
  ];

  var PLANETEN = [
    ['Merkur', 1, 'der sonnennächste Planet'],
    ['Venus', 2, 'etwa so gross wie die Erde, sehr heiss'],
    ['Erde', 3, 'unser Planet'],
    ['Mars', 4, 'der rote Planet'],
    ['Jupiter', 5, 'der grösste Planet'],
    ['Saturn', 6, 'der Planet mit den auffälligen Ringen'],
    ['Uranus', 7, 'liegt fast auf der Seite'],
    ['Neptun', 8, 'der sonnenfernste Planet']
  ];

  var NMG = [
    {
      id: 'planeten', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Planeten & Weltall', lp21: 'NMG.4 (Sonnensystem)',
      info: 'Unser Sonnensystem, Mond und Sterne.',
      gen: function () {
        var art = pick(['reihenfolge', 'reihenfolge', 'nummer', 'beschreibung', 'wissen', 'wissen']);
        if (art === 'reihenfolge') {
          var i = rint(0, PLANETEN.length - 2);
          return wahl('Welcher Planet kommt nach ' + PLANETEN[i][0] + '?', PLANETEN[i + 1][0],
            distinct(PLANETEN[i + 1][0], PLANETEN.map(function (p) { return p[0]; }), 3),
            'Von der Sonne aus nach aussen gezählt.');
        }
        if (art === 'nummer') {
          var p = pick(PLANETEN);
          return { typ: 'zahl', frage: 'Der wievielte Planet von der Sonne ist ' + p[0] + '?',
                   antwort: String(p[1]), hinweis: 'Merkur ist der erste.' };
        }
        if (art === 'beschreibung') {
          var q = pick(PLANETEN.filter(function (x) { return x[2]; }));
          return wahl('Welcher Planet ist gemeint: ' + q[2] + '?', q[0],
            distinct(q[0], PLANETEN.map(function (x) { return x[0]; }), 3));
        }
        var f = pick([
          ['Wie viele Planeten hat unser Sonnensystem?', '8', ['7', '9', '10']],
          ['Was steht im Mittelpunkt unseres Sonnensystems?', 'die Sonne', ['die Erde', 'der Mond', 'der Jupiter']],
          ['Was ist die Sonne?', 'ein Stern', ['ein Planet', 'ein Mond', 'eine Galaxie']],
          ['Wie heisst unsere Galaxie?', 'Milchstrasse', ['Andromeda', 'Orion', 'Sonnensystem']],
          ['Wie lange braucht die Erde für eine Runde um die Sonne?', 'ein Jahr', ['einen Tag', 'einen Monat', 'zehn Jahre']],
          ['Wie lange braucht die Erde für eine Drehung um sich selbst?', 'einen Tag', ['ein Jahr', 'einen Monat', 'eine Stunde']],
          ['Warum gibt es Tag und Nacht?', 'weil sich die Erde dreht', ['weil die Sonne wandert', 'weil der Mond die Sonne verdeckt', 'weil Wolken kommen']],
          ['Wie viele Monde hat die Erde?', '1', ['0', '2', '4']],
          ['Welcher Planet hat die auffälligsten Ringe?', 'Saturn', ['Jupiter', 'Mars', 'Venus']],
          ['Wer betrat 1969 als Erster den Mond?', 'Neil Armstrong', ['Juri Gagarin', 'Buzz Aldrin', 'Claude Nicollier']],
          ['Wie heisst der erste Schweizer Astronaut?', 'Claude Nicollier', ['Bertrand Piccard', 'Auguste Piccard', 'Jacques Piccard']],
          ['Was ist ein Lichtjahr?', 'eine Strecke', ['eine Zeitspanne', 'ein Planet', 'ein Stern']],
          ['Welcher Planet ist der grösste?', 'Jupiter', ['Saturn', 'Erde', 'Neptun']],
          ['Was zieht uns auf der Erde nach unten?', 'die Schwerkraft', ['die Luft', 'der Magnetismus', 'die Sonne']],
          ['Wie heisst der rote Planet?', 'Mars', ['Venus', 'Merkur', 'Jupiter']],
          ['Was kreist um einen Planeten?', 'ein Mond', ['ein Stern', 'eine Galaxie', 'eine Sonne']]
        ]);
        return wahl(f[0], f[1], f[2]);
      }
    },
    {
      id: 'kantone', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Kantone der Schweiz', lp21: 'NMG.8.4 (Schulpraxis)',
      info: 'Kantone, Kürzel und Hauptorte. Der Lehrplan nennt keine Kantonsliste — üblich ist sie trotzdem.',
      gen: function () {
        var k = pick(KANTONE);
        var art = pick(['kuerzel', 'hauptort', 'kanton']);
        if (art === 'kuerzel') {
          return wahl('Welches Kürzel hat der Kanton ' + k[0] + '?', k[1],
            distinct(k[1], KANTONE.map(function (x) { return x[1]; }), 3));
        }
        if (art === 'hauptort') {
          return wahl('Was ist der Hauptort des Kantons ' + k[0] + '?', k[2],
            distinct(k[2], KANTONE.map(function (x) { return x[2]; }), 3));
        }
        return wahl('Zu welchem Kanton gehört der Hauptort ' + k[2] + '?', k[0],
          distinct(k[0], KANTONE.map(function (x) { return x[0]; }), 3));
      }
    },
    {
      id: 'schweiz-geo', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Schweiz: Berge, Flüsse, Seen', lp21: 'NMG.8.4',
      info: 'Die wichtigsten Naturräume.',
      gen: function () {
        var f = pick([
          ['Wie heisst der längste Fluss der Schweiz?', 'Rhein', ['Rhone', 'Aare', 'Reuss']],
          ['Welcher Fluss fliesst durch Bern?', 'Aare', ['Rhein', 'Limmat', 'Reuss']],
          ['Welcher Fluss fliesst durch Zürich?', 'Limmat', ['Aare', 'Reuss', 'Thur']],
          ['Wie heisst der höchste Berg der Schweiz?', 'Dufourspitze', ['Matterhorn', 'Jungfrau', 'Eiger']],
          ['Welcher See ist der grösste der Schweiz?', 'Genfersee', ['Bodensee', 'Neuenburgersee', 'Vierwaldstättersee']],
          ['Wie viele Kantone hat die Schweiz?', '26', ['20', '23', '29']],
          ['Wie heisst die Hauptstadt der Schweiz?', 'Bern', ['Zürich', 'Basel', 'Luzern']],
          ['Welches Gebirge liegt im Nordwesten der Schweiz?', 'Jura', ['Alpen', 'Vogesen', 'Schwarzwald']],
          ['An welchem See liegt Luzern?', 'Vierwaldstättersee', ['Zugersee', 'Zürichsee', 'Thunersee']],
          ['Welcher Fluss entspringt am Gotthard und fliesst nach Westen?', 'Rhone', ['Rhein', 'Ticino', 'Inn']]
        ]);
        return wahl(f[0], f[1], f[2]);
      }
    },
    {
      id: 'nachbarn-sprachen', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Nachbarländer & Sprachen', lp21: 'NMG.8.4 (Schulpraxis)',
      info: 'Die Schweiz und ihre Nachbarn.',
      gen: function () {
        var f = pick([
          ['Wie viele Nachbarländer hat die Schweiz?', '5', ['4', '6', '7']],
          ['Welches Land liegt NICHT an der Schweiz?', 'Belgien', ['Italien', 'Österreich', 'Frankreich']],
          ['Wie viele Landessprachen hat die Schweiz?', '4', ['2', '3', '5']],
          ['Welche Sprache ist KEINE Landessprache?', 'Englisch', ['Rätoromanisch', 'Italienisch', 'Französisch']],
          ['In welchem Kanton spricht man Rätoromanisch?', 'Graubünden', ['Tessin', 'Wallis', 'Uri']],
          ['Welche Sprache spricht man im Tessin?', 'Italienisch', ['Französisch', 'Rätoromanisch', 'Deutsch']],
          ['Welches kleine Land liegt zwischen der Schweiz und Österreich?', 'Liechtenstein', ['Luxemburg', 'Andorra', 'Monaco']],
          ['Wie heisst die Schweiz auf Latein (auf den Münzen)?', 'Helvetia', ['Helvetica', 'Suisse', 'Confoederatio']],
          ['Welches Land liegt südlich der Schweiz?', 'Italien', ['Deutschland', 'Frankreich', 'Österreich']],
          ['Welches Land liegt nördlich der Schweiz?', 'Deutschland', ['Italien', 'Frankreich', 'Slowenien']],
          ['Wie heisst die Hauptstadt von Österreich?', 'Wien', ['Salzburg', 'Graz', 'Innsbruck']],
          ['In welchem Landesteil spricht man Französisch?', 'in der Westschweiz', ['im Tessin', 'im Wallis nur', 'in Graubünden']],
          ['Welche Sprache sprechen die meisten Menschen in der Schweiz?', 'Deutsch', ['Französisch', 'Italienisch', 'Rätoromanisch']],
          ['Wie viele Menschen leben ungefähr in der Schweiz?', 'rund 9 Millionen', ['rund 3 Millionen', 'rund 20 Millionen', 'rund 50 Millionen']]
        ]);
        return wahl(f[0], f[1], f[2]);
      }
    },
    {
      id: 'europa', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Europa: Länder & Hauptstädte', lp21: 'NMG.8.4',
      info: 'Hauptstädte in Europa.',
      gen: function () {
        var e = pick(EUROPA);
        var kennung = 'europa:' + e[0];
        if (Math.random() < 0.5) {
          return wahl('Wie heisst die Hauptstadt von ' + e[0] + '?', e[1],
            distinct(e[1], EUROPA.map(function (x) { return x[1]; }), 3), null, kennung);
        }
        return wahl(e[1] + ' ist die Hauptstadt von …', e[0],
          distinct(e[0], EUROPA.map(function (x) { return x[0]; }), 3), null, kennung);
      }
    },
    {
      id: 'weltkarte', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Kontinente & Ozeane', lp21: 'NMG.8.4',
      info: 'Orientierung auf der Weltkarte.',
      gen: function () {
        var f = pick([
          ['Wie viele Kontinente gibt es?', '7', ['5', '6', '8']],
          ['Welches ist der grösste Ozean?', 'Pazifik', ['Atlantik', 'Indischer Ozean', 'Arktischer Ozean']],
          ['Welcher Kontinent ist der grösste?', 'Asien', ['Afrika', 'Nordamerika', 'Europa']],
          ['Auf welchem Kontinent liegt Ägypten?', 'Afrika', ['Asien', 'Europa', 'Südamerika']],
          ['Welcher Ozean liegt zwischen Europa und Amerika?', 'Atlantik', ['Pazifik', 'Indischer Ozean', 'Mittelmeer']],
          ['Wie heisst die gedachte Linie um die Mitte der Erde?', 'Äquator', ['Nullmeridian', 'Wendekreis', 'Polarkreis']],
          ['In welche Richtung zeigt die Kompassnadel?', 'Norden', ['Süden', 'Osten', 'Westen']],
          ['Auf welchem Kontinent liegt Brasilien?', 'Südamerika', ['Nordamerika', 'Afrika', 'Australien']],
          ['Welcher Kontinent ist fast ganz mit Eis bedeckt?', 'Antarktika', ['Australien', 'Asien', 'Europa']],
          ['Was zeigt eine Legende auf einer Karte?', 'Was die Zeichen bedeuten',
            ['Wie alt die Karte ist', 'Wer die Karte gemacht hat', 'Wie gross das Land ist']]
        ]);
        return wahl(f[0], f[1], f[2]);
      }
    }
  ];

  /* ============================================================
     FRANZÖSISCH — Nebelturm, ab der 5. Klasse (LP21 FS2F)
     ============================================================ */
  var FR_WOERTER = {
    id: 'fr-mots', art: 'vokabeln', sprache: 'franzoesisch', klassen: [5, 6],
    titel: 'Mots de base', info: 'Grundwortschatz Französisch',
    eintraege: [
      ['le chat', 'die Katze', 'Le {chat} dort sur le lit.', 'n'],
      ['le chien', 'der Hund', 'Le {chien} joue dans le jardin.', 'n'],
      ['l\'oiseau', 'der Vogel', 'L\'{oiseau} chante le matin.', 'n'],
      ['le cheval', 'das Pferd', 'Le {cheval} court vite.', 'n'],
      ['la vache', 'die Kuh', 'La {vache} mange de l\'herbe.', 'n'],
      ['le poisson', 'der Fisch', 'Le {poisson} nage dans l\'eau.', 'n'],
      ['la mère', 'die Mutter', 'Ma {mère} s\'appelle Anne.', 'n'],
      ['le père', 'der Vater', 'Mon {père} travaille beaucoup.', 'n'],
      ['la sœur', 'die Schwester', 'Ma {sœur} a dix ans.', 'n'],
      ['le frère', 'der Bruder', 'Mon {frère} joue au foot.', 'n'],
      ['l\'école', 'die Schule', 'Je vais à l\'{école} à pied.', 'n'],
      ['le livre', 'das Buch', 'Je lis un {livre}.', 'n'],
      ['le crayon', 'der Bleistift', 'J\'écris avec un {crayon}.', 'n'],
      ['la table', 'der Tisch', 'Le livre est sur la {table}.', 'n'],
      ['la maison', 'das Haus', 'Notre {maison} est grande.', 'n'],
      ['la pomme', 'der Apfel', 'Je mange une {pomme}.', 'n'],
      ['le pain', 'das Brot', 'Le {pain} est frais.', 'n'],
      ['l\'eau', 'das Wasser', 'Je bois de l\'{eau}.', 'n'],
      ['le fromage', 'der Käse', 'La Suisse aime le {fromage}.', 'n'],
      ['la tête', 'der Kopf', 'J\'ai mal à la {tête}.', 'n'],
      ['la main', 'die Hand', 'Lève la {main}, s\'il te plaît.', 'n'],
      ['le soleil', 'die Sonne', 'Le {soleil} brille.', 'n'],
      ['la lune', 'der Mond', 'La {lune} est ronde ce soir.', 'n'],
      ['la tour', 'der Turm', 'La {tour} est dans la forêt.', 'n'],
      ['la forêt', 'der Wald', 'Il fait sombre dans la {forêt}.', 'n'],
      ['manger', 'essen', 'Nous {mangeons} à midi.', 'v'],
      ['boire', 'trinken', 'Tu veux {boire} un jus?', 'v'],
      ['jouer', 'spielen', 'Les enfants {jouent} dehors.', 'v'],
      ['lire', 'lesen', 'J\'aime {lire} le soir.', 'v'],
      ['écrire', 'schreiben', 'Il faut {écrire} la date.', 'v'],
      ['chanter', 'singen', 'Elle {chante} très bien.', 'v'],
      ['dormir', 'schlafen', 'Le chat aime {dormir}.', 'v'],
      ['rouge', 'rot', 'La tomate est {rouge}.', 'f'],
      ['bleu', 'blau', 'Le ciel est {bleu}.', 'f'],
      ['vert', 'grün', 'L\'herbe est {verte}.', 'f'],
      ['jaune', 'gelb', 'Le citron est {jaune}.', 'f'],
      ['noir', 'schwarz', 'Le chat {noir} a peur.', 'f'],
      ['blanc', 'weiss', 'La neige est {blanche}.', 'f'],
      ['grand', 'gross', 'Mon frère est {grand}.', 'a'],
      ['petit', 'klein', 'La souris est {petite}.', 'a'],
      ['lundi', 'Montag', 'Le {lundi}, j\'ai sport.', 'x'],
      ['mardi', 'Dienstag', 'Le {mardi}, il pleut souvent.', 'x'],
      ['mercredi', 'Mittwoch', 'Le {mercredi} après-midi, je suis libre.', 'x'],
      ['aujourd\'hui', 'heute', '{Aujourd\'hui}, il fait beau.', 'x', ['aujourdhui', 'aujourd hui']],
      ['demain', 'morgen', 'À {demain}!', 'x']
    ].map(function (r) { return { fremd: r[0], deutsch: r[1], satz: r[2], art: r[3], varianten: r[4] }; })
  };

  /* Artikel: das Geschlecht lernt man mit dem Wort. */
  var FR_ARTIKEL = [
    ['chat', 'le'], ['maison', 'la'], ['livre', 'le'], ['table', 'la'], ['pomme', 'la'],
    ['pain', 'le'], ['soleil', 'le'], ['lune', 'la'], ['école', 'l\''], ['eau', 'l\''],
    ['oiseau', 'l\''], ['fromage', 'le'], ['tête', 'la'], ['main', 'la'], ['forêt', 'la'],
    ['crayon', 'le'], ['fenêtre', 'la'], ['jardin', 'le'], ['ami', 'l\''], ['voiture', 'la']
  ];
  var FR_ETRE_AVOIR = [
    ['je', 'suis', 'ai'], ['tu', 'es', 'as'], ['il', 'est', 'a'], ['elle', 'est', 'a'],
    ['nous', 'sommes', 'avons'], ['vous', 'êtes', 'avez'], ['ils', 'sont', 'ont'], ['elles', 'sont', 'ont']
  ];
  var FR_ZAHLEN = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
    'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];

  var FRANZOESISCH = vokabelSets(FR_WOERTER).concat([
    {
      id: 'fr-articles', klassen: [5, 6], schwierigkeit: 'leicht',
      titel: 'le, la ou l\'?', lp21: 'FS2F.5.D.1',
      info: 'Den richtigen Artikel wählen.',
      gen: function () {
        var w = pick(FR_ARTIKEL);
        return wahl('Welcher Artikel passt?\n___ ' + w[0], w[1], ['le', 'la', 'l\'', 'les'].filter(function (a) { return a !== w[1]; }),
          'Vor a, e, i, o, u wird le/la zu l\'.', 'art:' + w[0]);
      }
    },
    {
      id: 'fr-etre-avoir', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'être et avoir', lp21: 'FS2F.5.D.1',
      info: 'Die zwei wichtigsten Verben: sein und haben.',
      gen: function () {
        var z = pick(FR_ETRE_AVOIR), sein = Math.random() < 0.5;
        var form = sein ? z[1] : z[2];
        var subjekt = !sein && z[0] === 'je' ? 'j\'' : z[0] + ' ';
        var alle = FR_ETRE_AVOIR.map(function (r) { return sein ? r[1] : r[2]; });
        return wahl((sein ? 'être (sein)' : 'avoir (haben)') + ': ' + subjekt + '___',
          form, distinct(form, alle, 3), sein ? 'je suis, tu es, il est …' : 'j\'ai, tu as, il a …',
          (sein ? 'etre:' : 'avoir:') + z[0]);
      }
    },
    {
      id: 'fr-phrases', klassen: [5, 6], schwierigkeit: 'leicht',
      titel: 'Petites phrases', lp21: 'FS2F.2.B.1',
      info: 'Was sagt man, wenn …?',
      gen: function () {
        var s = pick([
          ['Du begrüsst jemanden am Morgen.', 'Bonjour!', ['Bonsoir!', 'Au revoir!', 'Merci!']],
          ['Du verabschiedest dich.', 'Au revoir!', ['Bonjour!', 'Pardon!', 'S\'il te plaît!']],
          ['Du bedankst dich.', 'Merci!', ['Pardon!', 'Salut!', 'Bonne nuit!']],
          ['Du fragst jemanden nach seinem Namen.', 'Comment tu t\'appelles?', ['Comment ça va?', 'Où tu habites?', 'Quel âge as-tu?']],
          ['Du sagst, wie du heisst.', 'Je m\'appelle Lou.', ['J\'ai Lou.', 'Je suis appelle Lou.', 'Moi Lou.']],
          ['Du fragst, wie es geht.', 'Ça va?', ['Ça coûte?', 'C\'est qui?', 'Tu vas où?']],
          ['Du sagst, dass du elf Jahre alt bist.', 'J\'ai onze ans.', ['Je suis onze ans.', 'J\'ai onze années.', 'Je onze ans.']],
          ['Du entschuldigst dich.', 'Pardon!', ['Merci!', 'Bravo!', 'Salut!']],
          ['Du wünschst eine gute Nacht.', 'Bonne nuit!', ['Bon appétit!', 'Bonne chance!', 'Bonjour!']],
          ['Du bittest um etwas.', 'S\'il te plaît.', ['De rien.', 'Pas du tout.', 'À bientôt.']],
          ['Jemand bedankt sich bei dir.', 'De rien.', ['Merci.', 'Pardon.', 'Au secours.']],
          ['Du sagst, dass du etwas nicht verstehst.', 'Je ne comprends pas.', ['Je ne sais bien.', 'Je comprends non.', 'Pas de problème.']]
        ]);
        return wahl(s[0], s[1], s[2], null, 'phrase:' + s[1]);
      }
    },
    {
      id: 'fr-nombres', klassen: [5, 6], schwierigkeit: 'leicht',
      titel: 'Les nombres 0–20', lp21: 'FS2F.5.B.1',
      info: 'Zahlen auf Französisch.',
      gen: function () {
        var n = rint(0, 20), wort = FR_ZAHLEN[n];
        if (Math.random() < 0.5) {
          return wahl('Wie heisst ' + n + ' auf Französisch?', wort,
            distinct(wort, FR_ZAHLEN.slice(Math.max(0, n - 4), n + 5), 3), null, 'zahl:' + n);
        }
        return { typ: 'zahl', frage: 'Welche Zahl ist «' + wort + '»?', antwort: String(n), paar: 'zahl:' + n };
      }
    }
  ]);

  /* ============================================================
     Registrierung
     ============================================================ */
  var ALLE = [];
  function reg(fach, liste) {
    liste.forEach(function (s) { s.fach = fach; ALLE.push(s); });
  }
  reg('mathe', MATHE);
  reg('deutsch', DEUTSCH);
  reg('englisch', ENGLISCH);
  reg('nmg', NMG);
  reg('franzoesisch', FRANZOESISCH);

  /* Eigene Listen aus fotografierten Schulblättern. Die Dokumenten-Pipeline
     schreibt sie nach /lernwelt/eigene/listen.js (nur auf dem Server, nicht
     im Repo); die Datei setzt window.LERNWELT_LISTEN. document.write lädt sie
     noch vor allen Skripten, die nach uebungen.js kommen, der Minutenstempel
     umgeht den Browser-Cache. Registriert wird beim ersten Zugriff. */
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.write('<script src="/lernwelt/eigene/listen.js?t=' +
      Math.floor(Date.now() / 60000) + '"><\/script>');
  }
  var eigeneGeladen = false;
  function eigeneLaden() {
    if (eigeneGeladen) return;
    var daten = global.LERNWELT_LISTEN;
    if (!daten) return;            /* noch nicht da — beim nächsten Zugriff wieder schauen */
    eigeneGeladen = true;
    (daten.listen || []).forEach(function (L) {
      try {
        var menge = (L && (L.art === 'mathe' ? L.aufgaben : L.eintraege)) || [];
        if (!L || !L.id || menge.length < (L.art === 'mathe' ? 3 : 4) ||
            ALLE.some(function (s) { return s.id === L.id; })) return;
        var fach = L.fach || (L.art === 'lernwoerter' ? 'deutsch'
                 : L.sprache === 'franzoesisch' ? 'franzoesisch' : 'englisch');
        reg(fach, listenSets(L));
      } catch (e) { /* eine kaputte Liste darf die Lernwelt nicht lahmlegen */ }
    });
  }

  /* Externe Übungsseiten, die es schon gibt */
  var EXTERN = [
    { fach: 'mathe', id: 'rechnen-trainer', titel: 'Rechen-Trainer (Reihen)', schwierigkeit: 'leicht',
      lp21: 'MA.1.A.3', info: 'Malrechnen und Dividieren mit Zahlenpad.', url: '/joris/', klassen: [4, 5, 6] },
    { fach: 'deutsch', id: 'kommaregeln', titel: 'Kommaregeln (grosse Übung)', schwierigkeit: 'schwer',
      lp21: 'D.5.E.1', info: 'Kommas im Satz setzen.', url: '/andrin/kommasetzung/', klassen: [5, 6] },
    { fach: 'nmg', id: 'geo-quiz', titel: 'Geo-Quiz (Kahoot-Style)', schwierigkeit: 'leicht',
      lp21: 'NMG.8.4', info: 'Schnelles Quiz mit Zeitdruck.', url: '/lernwelt/geo-blitz/', klassen: [4, 5, 6] }
  ];

  global.Uebungen = {
    get alle() { eigeneLaden(); return ALLE; },
    extern: EXTERN,
    fuer: function (fach, klasse) {
      eigeneLaden();
      var eigene = ALLE.filter(function (s) { return s.fach === fach && s.klassen.indexOf(klasse) >= 0; });
      var fremde = EXTERN.filter(function (s) { return s.fach === fach && s.klassen.indexOf(klasse) >= 0; });
      return { eigene: eigene, extern: fremde };
    },
    set: function (fach, id) {
      eigeneLaden();
      return ALLE.filter(function (s) { return s.fach === fach && s.id === id; })[0] || null;
    }
  };
})(window);
