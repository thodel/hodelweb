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
  function wahl(frage, korrekt, falsche, hinweis) {
    return { typ: 'wahl', frage: frage, antwort: String(korrekt),
             optionen: shuffle([String(korrekt)].concat(falsche.map(String))), hinweis: hinweis };
  }
  function fmt(n) { return String(n).replace('.', ','); }
  function ggT(a, b) { return b ? ggT(b, a % b) : a; }

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
      titel: 'Stellenwerte & Runden', lp21: 'MA.1.A.1',
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
      titel: 'Grössen umwandeln', lp21: 'MA.3.A.1',
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
      titel: 'Sachaufgaben', lp21: 'MA.3.B.1',
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
      id: 'geometrie4', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Formen & Umfang', lp21: 'MA.2.C.1',
      info: 'Umfang, Symmetrie und Körper erkennen.',
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
      info: 'Schriftliche Multiplikation und Division.',
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
          var zz = z * f, nnn = nn * f, t = ggT(zz, nnn);
          return { typ: 'text', frage: 'Kürze so weit wie möglich: ' + zz + '/' + nnn,
                   antwort: (zz / t) + '/' + (nnn / t), hinweis: 'Schreibe so: 3/4' };
        }
        if (art === 'ganzes') {
          var teil = pick([2, 3, 4, 5]), anz = teil * rint(2, 9);
          return { typ: 'zahl', frage: 'Drei Viertel von ' + (4 * rint(3, 12)) + ' — nein, einfacher: ' +
                   (teil) + '/' + (teil) + ' von ' + anz + ' ist wie viel?', antwort: String(anz),
                   hinweis: 'Ein ganzer Bruch ist das Ganze.' };
        }
        var paare = [['1/2', '1/3'], ['2/3', '3/4'], ['3/5', '1/2'], ['5/8', '1/2'], ['2/5', '1/2'], ['7/10', '3/4']];
        var p = pick(paare);
        var wert = function (s) { var q = s.split('/'); return +q[0] / +q[1]; };
        var gr = wert(p[0]) > wert(p[1]) ? p[0] : p[1];
        return wahl('Welcher Bruch ist grösser: ' + p[0] + ' oder ' + p[1] + '?', gr, [wert(p[0]) > wert(p[1]) ? p[1] : p[0]]);
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
      titel: 'Prozente', lp21: 'MA.1.A.3',
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
      titel: 'Fläche & Umfang', lp21: 'MA.2.C.1',
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
      titel: 'Grössen (gross & klein)', lp21: 'MA.3.A.1',
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
      titel: 'Terme & Gleichungen', lp21: 'MA.1.B.1',
      info: 'Platzhalter x bestimmen.',
      gen: function () {
        var art = pick(['add', 'mult', 'zwei']);
        if (art === 'add') { var x = rint(4, 60), b = rint(5, 40); return { typ: 'zahl', frage: 'x + ' + b + ' = ' + (x + b) + ' — wie gross ist x?', antwort: String(x) }; }
        if (art === 'mult') { var f = rint(3, 9), y = rint(3, 20); return { typ: 'zahl', frage: f + ' · x = ' + (f * y) + ' — wie gross ist x?', antwort: String(y) }; }
        var a = rint(2, 6), z = rint(3, 15), c = rint(2, 20);
        return { typ: 'zahl', frage: a + ' · x + ' + c + ' = ' + (a * z + c) + ' — wie gross ist x?', antwort: String(z),
                 hinweis: 'Zuerst ' + c + ' abziehen, dann durch ' + a + ' teilen.' };
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
      titel: 'Wortarten erkennen', lp21: 'D.5.C.1',
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
      titel: 'Einzahl und Mehrzahl', lp21: 'D.5.C.1',
      info: 'Die Mehrzahl richtig bilden.',
      gen: function () {
        var p = pick(MEHRZAHL);
        return { typ: 'text', frage: 'Wie heisst die Mehrzahl von «' + p[0] + '»?', antwort: p[1],
                 alternativen: [p[1].replace('die ', '')], hinweis: 'Mit Artikel schreiben: die …' };
      }
    },
    {
      id: 'grossklein', klassen: [4, 5], schwierigkeit: 'schwer',
      titel: 'Gross- und Kleinschreibung', lp21: 'D.5.D.1',
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
      titel: 'Satzzeichen', lp21: 'D.5.D.1',
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
      titel: 'Zeitformen bilden', lp21: 'D.5.C.1',
      info: 'Präsens, Präteritum und Perfekt.',
      gen: function () {
        var v = pick(STARKE_VERBEN);
        if (Math.random() < 0.5) {
          return { typ: 'text', frage: 'Setze «' + v[0] + '» ins Präteritum (Vergangenheit):\ner/sie ___',
                   antwort: v[1], hinweis: 'Zum Beispiel: gehen → ging' };
        }
        return { typ: 'text', frage: 'Setze «' + v[0] + '» ins Perfekt:\ner/sie ___', antwort: v[2],
                 alternativen: [v[2].replace('ist ', '').replace('hat ', '')],
                 hinweis: 'Mit Hilfsverb: hat … / ist …' };
      }
    },
    {
      id: 'faelle', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Die vier Fälle', lp21: 'D.5.C.1',
      info: 'Nominativ, Genitiv, Dativ oder Akkusativ?',
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
      titel: 'Satzglieder', lp21: 'D.5.C.1',
      info: 'Subjekt, Prädikat oder Objekt?',
      gen: function () {
        var s = pick([
          ['Der Bauer melkt die Kuh.', 'Der Bauer', 'Subjekt'],
          ['Der Bauer melkt die Kuh.', 'melkt', 'Prädikat'],
          ['Der Bauer melkt die Kuh.', 'die Kuh', 'Objekt'],
          ['Meine Schwester schreibt einen Brief.', 'einen Brief', 'Objekt'],
          ['Die Kinder spielen im Garten.', 'Die Kinder', 'Subjekt'],
          ['Am Abend liest mein Vater die Zeitung.', 'liest', 'Prädikat'],
          ['Der Zug erreicht den Bahnhof pünktlich.', 'den Bahnhof', 'Objekt'],
          ['Unsere Nachbarn haben einen neuen Hund.', 'Unsere Nachbarn', 'Subjekt']
        ]);
        return wahl('Welches Satzglied ist «' + s[1] + '»?\n' + s[0], s[2],
          distinct(s[2], ['Subjekt', 'Prädikat', 'Objekt'], 2),
          'Prädikat = die Verbform · Subjekt = wer oder was?');
      }
    },
    {
      id: 'dasdass', klassen: [6], schwierigkeit: 'schwer',
      titel: 'das oder dass', lp21: 'D.5.D.1',
      info: 'Der Klassiker — mit Ersatzprobe lösen.',
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
      titel: 'Wortstamm & Wortfamilie', lp21: 'D.5.B.1',
      info: 'Welches Wort gehört nicht dazu?',
      gen: function () {
        var gruppen = [
          [['fahren', 'Fahrrad', 'Fahrer', 'Fähre'], 'Fahne'],
          [['Schule', 'schulisch', 'Schüler', 'einschulen'], 'Schulter'],
          [['spielen', 'Spieler', 'Spielzeug', 'verspielt'], 'Spiegel'],
          [['Wald', 'Waldweg', 'bewaldet', 'Waldrand'], 'Wand'],
          [['schreiben', 'Schrift', 'Schreiber', 'abschreiben'], 'Schrank'],
          [['wohnen', 'Wohnung', 'Bewohner', 'gewohnt'], 'Wolke']
        ];
        var g = pick(gruppen);
        return wahl('Welches Wort gehört NICHT in diese Wortfamilie?\n' + g[0].join(', ') + ', ' + g[1],
          g[1], distinct(g[1], g[0], 3), 'Achte auf den Wortstamm.');
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

  var ENGLISCH = [
    {
      id: 'words-basic', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Words — choose the answer', lp21: 'FS1E.2.A.1',
      info: 'Wörter erkennen (Auswahl).',
      gen: function () {
        var alle = alleVokabeln(), w = pick(alle);
        var deToEn = Math.random() < 0.6;
        var korrekt = deToEn ? w[1] : w[0];
        var pool = alle.map(function (v) { return deToEn ? v[1] : v[0]; });
        return wahl((deToEn ? 'Was heisst «' + w[0] + '» auf Englisch?' : 'Was heisst «' + w[1] + '» auf Deutsch?'),
          korrekt, distinct(korrekt, pool, 3));
      }
    },
    {
      id: 'words-write', klassen: [4, 5, 6], schwierigkeit: 'schwer',
      titel: 'Words — write them', lp21: 'FS1E.5.B.1',
      info: 'Wörter selbst schreiben.',
      gen: function () {
        var w = pick(alleVokabeln());
        return { typ: 'text', frage: 'Write in English: ' + w[0], antwort: w[1],
                 hinweis: w[1].length + ' Buchstaben' };
      }
    },
    {
      id: 'plural-en', klassen: [4, 5], schwierigkeit: 'leicht',
      titel: 'Plural forms', lp21: 'FS1E.4.A.1',
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
      titel: 'Simple past — irregular verbs', lp21: 'FS1E.4.A.1',
      info: 'Die zweite Verbform (past tense).',
      gen: function () {
        var v = pick(IRREGULAR);
        if (Math.random() < 0.3) {
          return { typ: 'text', frage: 'Past participle of «' + v[0] + '» (3. Form):', antwort: v[2],
                   hinweis: '(' + v[3] + ')' };
        }
        return { typ: 'text', frage: 'Simple past of «' + v[0] + '»:', antwort: v[1], hinweis: '(' + v[3] + ')' };
      }
    },
    {
      id: 'questions-en', klassen: [6], schwierigkeit: 'schwer',
      titel: 'Questions & short answers', lp21: 'FS1E.4.A.1',
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
      titel: 'Everyday sentences', lp21: 'FS1E.3.A.1',
      info: 'Ganze Sätze übersetzen.',
      gen: function () {
        var s = pick([
          ['Ich habe einen Bruder.', 'I have a brother.'],
          ['Wie geht es dir?', 'How are you?'],
          ['Meine Lieblingsfarbe ist blau.', 'My favourite colour is blue.'],
          ['Wir spielen jeden Tag Fussball.', 'We play football every day.'],
          ['Sie wohnt in der Schweiz.', 'She lives in Switzerland.'],
          ['Ich bin elf Jahre alt.', 'I am eleven years old.'],
          ['Das Wetter ist heute schön.', 'The weather is nice today.'],
          ['Er kann sehr gut schwimmen.', 'He can swim very well.'],
          ['Wo ist der Bahnhof?', 'Where is the station?'],
          ['Ich mag Schokolade nicht.', 'I do not like chocolate.']
        ]);
        return { typ: 'text', frage: 'Translate: ' + s[0], antwort: s[1],
                 alternativen: [s[1].replace(/\.$/, ''), s[1].replace('do not', "don't").replace(/\.$/, ''), s[1].replace('do not', "don't")],
                 hinweis: 'Ganzer Satz, Punkt am Schluss ist egal.' };
      }
    }
  ];

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

  var NMG = [
    {
      id: 'kantone', klassen: [4, 5, 6], schwierigkeit: 'leicht',
      titel: 'Kantone der Schweiz', lp21: 'NMG.8.3',
      info: 'Kantone, Kürzel und Hauptorte.',
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
      titel: 'Schweiz: Berge, Flüsse, Seen', lp21: 'NMG.8.1',
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
      titel: 'Nachbarländer & Sprachen', lp21: 'NMG.7.3',
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
          ['Wie heisst die Schweiz auf Latein (auf den Münzen)?', 'Helvetia', ['Helvetica', 'Suisse', 'Confoederatio']]
        ]);
        return wahl(f[0], f[1], f[2]);
      }
    },
    {
      id: 'europa', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Europa: Länder & Hauptstädte', lp21: 'NMG.8.3',
      info: 'Hauptstädte in Europa.',
      gen: function () {
        var e = pick(EUROPA);
        if (Math.random() < 0.5) {
          return wahl('Wie heisst die Hauptstadt von ' + e[0] + '?', e[1],
            distinct(e[1], EUROPA.map(function (x) { return x[1]; }), 3));
        }
        return wahl(e[1] + ' ist die Hauptstadt von …', e[0],
          distinct(e[0], EUROPA.map(function (x) { return x[0]; }), 3));
      }
    },
    {
      id: 'weltkarte', klassen: [5, 6], schwierigkeit: 'schwer',
      titel: 'Kontinente & Ozeane', lp21: 'NMG.8.2',
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

  /* Externe Übungsseiten, die es schon gibt */
  var EXTERN = [
    { fach: 'mathe', id: 'rechnen-trainer', titel: 'Rechen-Trainer (Reihen)', schwierigkeit: 'leicht',
      lp21: 'MA.1.A.3', info: 'Malrechnen und Dividieren mit Zahlenpad.', url: '/joris/', klassen: [4, 5, 6] },
    { fach: 'deutsch', id: 'kommaregeln', titel: 'Kommaregeln (grosse Übung)', schwierigkeit: 'schwer',
      lp21: 'D.5.D.1', info: 'Kommas im Satz setzen.', url: '/andrin/kommasetzung/', klassen: [5, 6] },
    { fach: 'nmg', id: 'geo-quiz', titel: 'Geo-Quiz (Kahoot-Style)', schwierigkeit: 'leicht',
      lp21: 'NMG.8.3', info: 'Schnelles Quiz mit Zeitdruck.', url: '/andrin/geo-quiz/', klassen: [4, 5, 6] }
  ];

  global.Uebungen = {
    alle: ALLE,
    extern: EXTERN,
    fuer: function (fach, klasse) {
      var eigene = ALLE.filter(function (s) { return s.fach === fach && s.klassen.indexOf(klasse) >= 0; });
      var fremde = EXTERN.filter(function (s) { return s.fach === fach && s.klassen.indexOf(klasse) >= 0; });
      return { eigene: eigene, extern: fremde };
    },
    set: function (fach, id) {
      return ALLE.filter(function (s) { return s.fach === fach && s.id === id; })[0] || null;
    }
  };
})(window);
