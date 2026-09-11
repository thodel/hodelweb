"""
lernwelt — fotografierte Wortlisten in Übungen für die Lerninsel verwandeln.

Die Pipeline fragt das Modell mit PROMPT, prüft die Antwort mit aufbereiten()
und legt die Liste mit speichern() ab. Die Lernwelt liest alle Listen aus
listen.js (window.LERNWELT_LISTEN) und baut daraus je zwei Übungen, siehe
vokabelSets/lernwortSets in static/lernwelt/uebungen.js.

Die Stammdaten stehen in lernwelt-listen.json neben scanpipe.py. listen.js im
Webordner ist nur eine Ableitung davon und wird neu geschrieben, wenn sie
fehlt (etwa nach einem Neuaufbau der Webseite).
"""

import hashlib
import json
import math
import os
import re
from datetime import datetime, timezone
from fractions import Fraction
from pathlib import Path

SPRACHEN = {"englisch": "Englisch", "franzoesisch": "Französisch"}
SPRACH_NAMEN = {
    "englisch": "englisch", "english": "englisch", "en": "englisch",
    "franzoesisch": "franzoesisch", "französisch": "franzoesisch", "french": "franzoesisch",
    "francais": "franzoesisch", "français": "franzoesisch", "fr": "franzoesisch",
}
BEGLEITER = {
    "englisch": re.compile(r"^(to|the|a|an) ", re.I),
    "franzoesisch": re.compile(r"^(le |la |les |l'|un |une |des |se |s')", re.I),
}
# Ab welcher Klasse ein Fach in der Lernwelt offen ist (siehe FAECHER in insel.js).
FACH_AB = {"franzoesisch": 5}
ARTIKEL_DE = re.compile(r"^(der|die|das) ", re.I)
ARTEN = {"n", "v", "a", "f", "x"}
MIN_EINTRAEGE, MAX_EINTRAEGE = 4, 80

PROMPT = """Du bereitest ein Schulblatt für eine Lernspielwelt auf. Im Arbeitsverzeichnis
liegen die Bilddateien {datei}. Es sind die Seiten EINES Blatts oder Tests, in
dieser Reihenfolge. Lies jede davon mit dem Read-Tool und werte sie zusammen aus.

Es gibt drei Arten von Blättern:
- "vokabeln": Wörter einer Fremdsprache mit deutscher Bedeutung.
- "lernwoerter": deutsche Rechtschreib- oder Lernwörter, ohne Übersetzung.
- "mathe": Mathematikaufgaben (Arbeitsblatt, Test, Lernzielkontrolle, Hausaufgabe).

Passt nichts davon, antworte nur mit
{{"art": "keine_liste", "grund": "<ein kurzer Satz>"}}

Antworte sonst AUSSCHLIESSLICH mit einem einzigen JSON-Objekt, ohne Text davor
oder danach, ohne Codeblock-Zeichen.

Bei "vokabeln":
{{
  "art": "vokabeln",
  "sprache": "englisch" oder "franzoesisch" oder eine andere Sprache,
  "titel": "<Überschrift des Blatts, höchstens 6 Wörter>",
  "klasse": <Schulklasse als Zahl, wenn sie auf dem Blatt steht, sonst null>,
  "name": "<handschriftlicher Name des Kindes, wenn lesbar, sonst null>",
  "eintraege": [
    {{"fremd": "<Wort in der Fremdsprache, genau wie auf dem Blatt, mit Artikel oder to>",
      "deutsch": "<deutsche Bedeutung wie auf dem Blatt>",
      "satz": "<Beispielsatz vom Blatt oder null>",
      "art": "n", "v", "a", "f" oder "x",
      "varianten": ["<weitere richtige Formen, nur wenn sie auf dem Blatt stehen>"]}}
  ]
}}

Bei "lernwoerter" gleich, aber jeder Eintrag ist
{{"wort": "<das Wort, genau wie auf dem Blatt>", "satz": "<Satz oder null>", "art": "..."}}

Bei "mathe":
{{
  "art": "mathe",
  "titel": "<Überschrift des Blatts, höchstens 6 Wörter>",
  "klasse": <Zahl oder null>, "name": "<Name des Kindes oder null>",
  "dokumenttyp": "<Arbeitsblatt, Lernzielkontrolle, Test, Hausaufgabe ...>",
  "datum": "<JJJJ-MM-TT, wenn auf dem Blatt, sonst null>",
  "bewertung": "<Note oder Punkte, genau wie auf dem Blatt, oder null>",
  "aufgaben": [
    {{"nr": "<Nummer der Aufgabe>",
      "anweisung": "<Aufgabentext GENAU wie gedruckt, auch wenn er am Rand abgeschnitten ist>",
      "thema": "<eins aus der Liste unten>",
      "teilaufgaben": [
        {{"angabe": "<die Angabe genau wie gedruckt>", "schueler": "<Antwort des Kindes oder null>"}}
      ]}}
  ]
}}

Themen für "mathe" und wie die Angabe aussieht (die Angabe enthält NIE die Lösung):
- "teiler": alle Teiler einer Zahl → "18"
- "gemeinsame_teiler": gemeinsame Teiler zweier Zahlen → "18 und 30"
- "ggt": grösster gemeinsamer Teiler → "21 und 42"
- "kgv": kleinstes gemeinsames Vielfaches → "3 und 4"
- "primzahl": ist die Zahl eine Primzahl? → "27". Bei einer Zahlentabelle eine
  Teilaufgabe je Zahl; schueler "ja", wenn das Kind sie eingekreist hat, sonst "nein".
- "gleichwertig": gleichwertige Brüche zu einem Bruch finden → "3/8"; schueler "6/16, 12/32"
- "ergaenzen": fehlender Zähler oder Nenner → "3/4 = ?/8" oder "6/8 = 3/?"; schueler nur die fehlende Zahl
- "kuerzen": so weit wie möglich kürzen → "64/72"; schueler das Endergebnis
- "teilbarkeit": ist die Zahl durch t teilbar? → "45792 durch 6". Beim Unterstreichen
  eine Teilaufgabe je Zahl; schueler "ja", wenn unterstrichen, sonst "nein".
- "rechnen": Grundrechenart mit ganzen Zahlen → "345 + 78" (auch -, ·, :)
- "bruchrechnen": Rechnung mit Brüchen → "2/3 + 1/4" (auch -, ·, :)
- "anderes": alles andere

Regeln:
- Übernimm ALLE Einträge oder Teilaufgaben, in der Reihenfolge des Blatts. Nichts weglassen.
- Zahlen ohne Tausender-Apostroph schreiben: 45'792 → 45792.
- schueler ist die handschriftliche Antwort des Kindes. Bei Korrekturen gilt die
  Version des Kindes, nicht die Verbesserung der Lehrperson. Nichts hingeschrieben: null.
- art bei Wörtern: n = Nomen oder Ding, v = Tätigkeit, a = Eigenschaft, f = Farbe, x = anderes.
- Im Beispielsatz steht das geübte Wort in geschweiften Klammern, so wie es im Satz
  vorkommt: "The {{cat}} sleeps." Ohne Beispielsatz ist satz null; nur bei lernwoerter
  darfst du dann einen kurzen, einfachen Satz für ein Kind bilden.
- Erfinde nichts. Was du nicht lesen kannst, lässt du weg.
"""


# ---------------------------------------------------------------- Chat-Hilfen

def _wort_regex(woerter):
    return re.compile(r"(?<![\wäöüÄÖÜ])(" + "|".join(re.escape(w) for w in woerter) +
                      r")(?![\wäöüÄÖÜ])", re.I)


def hat_stichwort(text, stichwoerter):
    """«lernwelt» oder «lw» als eigenes Wort, gross oder klein."""
    return bool(text) and bool(_wort_regex(stichwoerter).search(text))


def kind_aus_text(text, kinder):
    if not text:
        return None
    for name in kinder:
        if _wort_regex([name]).search(text):
            return name
    return None


def kind_zur_klasse(klasse, kinder):
    """Das Kind, dessen Klasse am nächsten liegt. Ohne Klasse: None."""
    try:
        k = int(klasse)
    except (TypeError, ValueError):
        return None
    return min(kinder, key=lambda n: (abs(kinder[n] - k), -kinder[n]))


# ---------------------------------------------------------------- Aufbereiten

def _rein(text, laenge):
    """Kein HTML, keine Steuerzeichen: die Lernwelt setzt Titel teils per
    innerHTML ein, und die Texte kommen aus einem Foto."""
    if text is None:
        return None
    t = re.sub(r"[<>\x00-\x1f\x7f]", " ", str(text))
    t = re.sub(r"\s+", " ", t).strip()
    return t[:laenge].strip() or None


def _passt(lueckenwort, kern):
    """Steht in der Lücke das geübte Wort? Gleicher Anfang genügt, damit
    gebeugte Formen gelten (nourrir/nourris, swim/swims)."""
    a, b = lueckenwort.casefold(), kern.casefold()
    gemeinsam = 0
    for x, y in zip(a, b):
        if x != y:
            break
        gemeinsam += 1
    return gemeinsam >= min(4, len(a), len(b))


def _satz_pruefen(satz, wort, begleiter):
    """Der Satz muss das geübte Wort genau einmal in {Klammern} tragen.
    Setzt das Modell die Klammern ums falsche Wort oder vergisst sie, wird
    das Wort im Satz gesucht; findet es sich nicht, gibt es keinen Satz."""
    satz = _rein(satz, 200)
    if not satz:
        return None
    kern = begleiter.sub("", wort) if begleiter else wort
    klammern = list(re.finditer(r"\{([^{}]+)\}", satz))
    if klammern and _passt(klammern[0].group(1), kern):
        erste = klammern[0]
        rest = satz[erste.end():].replace("{", "").replace("}", "")
        satz = satz[:erste.end()] + rest
    else:
        satz = satz.replace("{", "").replace("}", "")
        m = re.search(r"(?<![\wäöüÄÖÜ'])" + re.escape(kern) + r"(?![\wäöüÄÖÜ])", satz, re.I)
        if not m:
            return None
        satz = satz[:m.start()] + "{" + m.group(0) + "}" + satz[m.end():]
    if satz.count("{") != 1 or satz.count("}") != 1:
        return None
    return satz


def _sauber(text, laenge=24):
    text = str(text or "")
    for a, b in {"ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue", "ß": "ss"}.items():
        text = text.replace(a, b)
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()[:laenge].strip("-")


def aufbereiten(daten, kind, klasse, quelle, erstellt=None):
    """Prüft die Modellantwort. Gibt (liste, None) oder (None, Grund) zurück.
    Der Grund 'keine_liste' heisst: auf dem Blatt steht gar keine Wortliste."""
    art = str(daten.get("art") or "").lower()
    if art == "mathe":
        return mathe_aufbereiten(daten, kind, klasse, quelle, erstellt)
    if art not in ("vokabeln", "lernwoerter"):
        return None, "keine_liste"

    sprache = None
    if art == "vokabeln":
        roh = str(daten.get("sprache") or "englisch").strip().lower()
        sprache = SPRACH_NAMEN.get(roh)
        if not sprache:
            return None, (f"Vokabeln auf «{_rein(roh, 20)}» kennt die Lernwelt noch nicht, "
                          "nur Englisch und Französisch.")
    begleiter = BEGLEITER.get(sprache)

    eintraege, gesehen = [], set()
    for e in daten.get("eintraege") or []:
        if not isinstance(e, dict):
            continue
        wortart = str(e.get("art") or "x").lower()[:1]
        wortart = wortart if wortart in ARTEN else "x"
        if art == "vokabeln":
            fremd, deutsch = _rein(e.get("fremd"), 60), _rein(e.get("deutsch"), 80)
            if not fremd or not deutsch or fremd.lower() in gesehen:
                continue
            gesehen.add(fremd.lower())
            varianten = [v for v in (_rein(x, 60) for x in (e.get("varianten") or [])
                                     if isinstance(x, str)) if v and v.lower() != fremd.lower()]
            eintraege.append({"fremd": fremd, "deutsch": deutsch,
                              "satz": _satz_pruefen(e.get("satz"), fremd, begleiter),
                              "art": wortart, "varianten": varianten[:4]})
        else:
            wort = _rein(e.get("wort"), 40)
            # Den Artikel abtrennen, sonst verdreht die Fehlerschreibung ihn mit.
            artikel = None
            m = ARTIKEL_DE.match(wort or "")
            if m:
                artikel, wort = m.group(1).lower(), wort[m.end():].strip()
            if not wort or len(wort.split()) > 3 or wort in gesehen:
                continue
            gesehen.add(wort)
            eintrag = {"wort": wort, "satz": _satz_pruefen(e.get("satz"), wort, None), "art": wortart}
            if artikel:
                eintrag["artikel"] = artikel
            eintraege.append(eintrag)

    if len(eintraege) < MIN_EINTRAEGE:
        return None, (f"Nur {len(eintraege)} Wort{'' if len(eintraege) == 1 else 'e'} erkannt. Für eine Übung braucht es "
                      f"mindestens {MIN_EINTRAEGE}. Ist das Foto scharf und die ganze Liste drauf?")
    eintraege = eintraege[:MAX_EINTRAEGE]

    erstellt = erstellt or datetime.now().strftime("%Y-%m-%d")
    titel = _rein(daten.get("titel"), 40) or ("Wortliste" if art == "vokabeln" else "Lernwörter")
    kennung = hashlib.sha1(f"{quelle}|{erstellt}|{titel}".encode()).hexdigest()[:6]
    tag = datetime.strptime(erstellt, "%Y-%m-%d").strftime("%d.%m.%Y")
    return {
        "id": f"lw-{_sauber(titel) or 'liste'}-{kennung}",
        "art": art,
        "sprache": sprache,
        "fach": "deutsch" if art == "lernwoerter" else sprache,
        "klassen": [int(klasse)],
        "kind": kind,
        "titel": titel,
        "info": f"Foto vom {tag}",
        "erstellt": erstellt,
        "quelle": quelle,
        "eintraege": eintraege,
    }, None


# ---------------------------------------------------------------- Mathe

MATHE_THEMEN = {
    "teiler": "Teiler", "gemeinsame_teiler": "gemeinsame Teiler", "ggt": "ggT", "kgv": "kgV",
    "primzahl": "Primzahlen", "gleichwertig": "gleichwertige Brüche",
    "ergaenzen": "Zähler/Nenner ergänzen", "kuerzen": "Kürzen", "teilbarkeit": "Teilbarkeit",
    "rechnen": "Rechnen", "bruchrechnen": "Bruchrechnen",
}
# Das Thema kommt aus dem Aufgabentext: den liest das Modell zuverlässig ab,
# beim Einordnen verwechselt es dagegen Aufgabentypen. Die Reihenfolge zählt
# («Ergänze die Zähler, damit die Brüche gleichwertig sind» ist ergaenzen).
THEMA_REGELN = [
    (r"kleinste\w*\s+gemeinsame\w*\s+vielfache", "kgv"),
    (r"gr(ö|oe)sste\w*\s+gemeinsame\w*\s+teiler|\bggt\b", "ggt"),
    (r"primzahl", "primzahl"),
    (r"teilbar", "teilbarkeit"),
    (r"so\s+weit\s+wie\s+m(ö|oe)glich|vollst(ä|ae)ndig\s+k(ü|ue)rz", "kuerzen"),
    (r"vorgegeben|g(ä|ae)nz|fehlende", "ergaenzen"),     # auch abgeschnitten: «…gänze»
    (r"gleichwertig", "gleichwertig"),
    (r"gemeinsame\w*\s+teiler", "gemeinsame_teiler"),
    (r"teiler", "teiler"),
]
GRENZE = 10_000_000


def thema_aus_anweisung(text):
    for muster, thema in THEMA_REGELN:
        if re.search(muster, text or "", re.I):
            return thema
    return None


def _zahlen(text):
    return [int(z) for z in re.findall(r"\d+", re.sub(r"(?<=\d)['’`´ ](?=\d{3}\b)", "", str(text or "")))]


def _bruch_text(f):
    return str(f.numerator) if f.denominator == 1 else f"{f.numerator}/{f.denominator}"


def _brueche(text):
    return [Fraction(int(z), int(n)) for z, n in re.findall(r"(\d+)\s*/\s*(\d+)", str(text or "")) if int(n)]


def _ja_nein(text):
    t = str(text or "").strip().lower()
    return True if t in ("ja", "j", "yes", "x", "✓") else False if t in ("nein", "n", "no", "-") else None


def teiler_von(n):
    return [i for i in range(1, n + 1) if n % i == 0]


def ist_prim(n):
    return n > 1 and all(n % i for i in range(2, math.isqrt(n) + 1))


def _mathe_aufgabe(thema, angabe, schueler):
    """Eine Teilaufgabe prüfen und lösen. None, wenn sie sich nicht sauber lesen lässt."""
    zahlen = _zahlen(angabe)
    schueler = _rein(schueler, 120)
    werte = loesung = richtig = None
    # Wo eine einzige Zahl die Antwort ist, sind «1 7» zwei gelesene Ziffern von 17.
    if schueler and thema in ("ggt", "kgv", "ergaenzen", "rechnen") and "," not in schueler:
        schueler = re.sub(r"(?<=\d)\s+(?=\d)", "", schueler)
    # Ein Platzhalter (3/4 = ?/8) macht es immer zur Ergänzungsaufgabe.
    if re.search(r"/\s*[?_…]|[?_…]\s*/", angabe):
        thema = "ergaenzen"

    if thema in ("teiler", "gemeinsame_teiler") and len(zahlen) == 1:
        thema = "teiler"
    if thema == "teiler" and len(zahlen) == 1 and 1 < zahlen[0] <= 10_000:
        werte = zahlen
        l = teiler_von(zahlen[0]); loesung = ", ".join(map(str, l))
        if schueler: richtig = sorted(set(_zahlen(schueler))) == l
    elif thema == "gemeinsame_teiler" and len(zahlen) == 2 and all(1 < z <= 10_000 for z in zahlen):
        werte = zahlen
        l = [t for t in teiler_von(zahlen[0]) if zahlen[1] % t == 0]; loesung = ", ".join(map(str, l))
        if schueler: richtig = sorted(set(_zahlen(schueler))) == l
    elif thema in ("ggt", "kgv") and len(zahlen) == 2 and all(0 < z <= 100_000 for z in zahlen):
        werte = zahlen
        l = math.gcd(*zahlen) if thema == "ggt" else math.lcm(*zahlen); loesung = str(l)
        if schueler and _zahlen(schueler): richtig = _zahlen(schueler)[-1] == l
    elif thema == "primzahl" and len(zahlen) == 1 and 1 < zahlen[0] <= 10_000:
        werte = zahlen
        l = ist_prim(zahlen[0]); loesung = "ja" if l else "nein"
        if _ja_nein(schueler) is not None: richtig = _ja_nein(schueler) == l
    elif thema == "teilbarkeit" and len(zahlen) == 2 and 0 < zahlen[0] <= GRENZE and 1 < zahlen[1] <= 25:
        werte = zahlen
        l = zahlen[0] % zahlen[1] == 0; loesung = "ja" if l else "nein"
        if _ja_nein(schueler) is not None: richtig = _ja_nein(schueler) == l
    elif thema == "gleichwertig" and len(_brueche(angabe)) == 1:
        f = _brueche(angabe)[0]
        z, n = [int(x) for x in re.search(r"(\d+)\s*/\s*(\d+)", angabe).groups()]
        if z <= 10_000 and n <= 10_000:
            werte = [z, n]; loesung = f"{z * 2}/{n * 2}"
            eigene = [b for b in re.findall(r"(\d+)\s*/\s*(\d+)", schueler or "") if int(b[1])]
            if eigene:
                richtig = all(Fraction(int(a), int(b)) == f and (int(a), int(b)) != (z, n) for a, b in eigene)
    elif thema == "ergaenzen":
        teile = re.findall(r"(\d+|[?_…]+|\.{2,})\s*/\s*(\d+|[?_…]+|\.{2,})", angabe.replace(" ", ""))
        if len(teile) == 2:
            roh = [x for paar in teile for x in paar]
            leer = [i for i, x in enumerate(roh) if not x.isdigit()]
            if len(leer) == 1 and leer[0] in (2, 3) and int(roh[1]) and all(x.isdigit() and int(x) <= 100_000 for i, x in enumerate(roh) if i != leer[0]):
                z1, n1 = int(roh[0]), int(roh[1])
                if leer[0] == 2:
                    n2 = int(roh[3]); l = Fraction(z1 * n2, n1)
                    werte = [z1, n1, None, n2]
                else:
                    z2 = int(roh[2]); l = Fraction(n1 * z2, z1) if z1 else Fraction(0)
                    werte = [z1, n1, z2, None]
                if l.denominator != 1 or l <= 0:
                    werte = None
                else:
                    loesung = str(l.numerator)
                    if schueler and _zahlen(schueler):
                        s_z = _zahlen(schueler)
                        # «6/8» statt nur «6»: die fehlende Stelle herausnehmen
                        wert = s_z[0] if leer[0] == 2 or len(s_z) == 1 else s_z[-1]
                        richtig = wert == l.numerator
    elif thema == "kuerzen" and len(_brueche(angabe)) == 1:
        z, n = [int(x) for x in re.search(r"(\d+)\s*/\s*(\d+)", angabe).groups()]
        f = Fraction(z, n)
        if z <= 1_000_000 and n <= 1_000_000 and (f.numerator, f.denominator) != (z, n):
            werte = [z, n]; loesung = _bruch_text(f)
            if schueler:
                eigene = re.findall(r"(\d+)\s*/\s*(\d+)", schueler)
                if eigene:
                    a, b = eigene[-1]
                    richtig = (int(a), int(b)) == (f.numerator, f.denominator)
                elif _zahlen(schueler):
                    richtig = f.denominator == 1 and _zahlen(schueler)[-1] == f.numerator
    elif thema == "rechnen":
        m = re.fullmatch(r"\s*(\d+)\s*([+\-−·x×*:÷/])\s*(\d+)\s*(=.*)?", angabe.replace("'", ""))
        if m:
            a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
            op = {"−": "-", "x": "·", "×": "·", "*": "·", "÷": ":", "/": ":"}.get(op, op)
            l = {"+": a + b, "-": a - b, "·": a * b, ":": a // b if b and a % b == 0 else None}[op]
            if l is not None and 0 <= l <= GRENZE and a <= GRENZE and b <= GRENZE:
                werte = [a, op, b]; loesung = str(l)
                if schueler and _zahlen(schueler): richtig = _zahlen(schueler)[-1] == l
    elif thema == "bruchrechnen":
        m = re.fullmatch(r"\s*(\d+)\s*/\s*(\d+)\s*([+\-−·x×*:÷])\s*(\d+)\s*/\s*(\d+)\s*(=.*)?", angabe)
        if m and int(m.group(2)) and int(m.group(5)) and int(m.group(4)):
            f1, f2 = Fraction(int(m.group(1)), int(m.group(2))), Fraction(int(m.group(4)), int(m.group(5)))
            op = {"−": "-", "x": "·", "×": "·", "*": "·", "÷": ":"}.get(m.group(3), m.group(3))
            l = {"+": f1 + f2, "-": f1 - f2, "·": f1 * f2, ":": f1 / f2}[op]
            if l >= 0 and l.denominator <= 1000:
                werte = [f"{m.group(1)}/{m.group(2)}", op, f"{m.group(4)}/{m.group(5)}"]; loesung = _bruch_text(l)
                if schueler and _brueche(schueler): richtig = _brueche(schueler)[-1] == l
    if werte is None:
        return None
    return {"thema": thema, "werte": werte, "loesung": loesung, "schueler": schueler, "richtig": richtig}


def _titel_leiser(t):
    """«LERNZIELKONTROLLE: TEILER, …» → «Teiler, Erweitern und Kürzen»."""
    if t and t.isupper():
        klein = {"und", "oder", "von", "mit", "der", "die", "das", "zum", "zur", "im", "in", "auf", "bis"}
        t = " ".join(w.lower() if w.lower() in klein else w.capitalize() for w in t.split())
    return t


def mathe_aufbereiten(daten, kind, klasse, quelle, erstellt=None):
    aufgaben, unbekannt = [], []
    for g in daten.get("aufgaben") or []:
        if not isinstance(g, dict):
            continue
        anweisung = _rein(g.get("anweisung"), 300) or ""
        thema = thema_aus_anweisung(anweisung) or str(g.get("thema") or "").lower()
        einzel = []
        for t in g.get("teilaufgaben") or []:
            if not isinstance(t, dict):
                continue
            angabe = str(t.get("angabe") or "")
            if thema == "teilbarkeit" and len(_zahlen(angabe)) == 1 and _zahlen(angabe)[0] <= 25:
                # Zeilenform «6 teilbar» mit den unterstrichenen Zahlen als Antwort:
                # dann wenigstens diese als Aufgaben nehmen.
                teiler = _zahlen(angabe)[0]
                neue = [_mathe_aufgabe("teilbarkeit", f"{z} durch {teiler}", "ja")
                        for z in _zahlen(t.get("schueler")) if z > 25]
            else:
                neue = [_mathe_aufgabe(thema, angabe, t.get("schueler"))]
            for a in neue:
                if a:
                    aufgaben.append(a)
                    einzel.append(a)
        if not einzel and anweisung:
            unbekannt.append(anweisung[:60])
        # «Bestimme alle Teiler … Kreise die gemeinsamen Teiler ein» mit zwei Zahlen
        if re.search(r"gemeinsame\w*\s+teiler", anweisung, re.I):
            zahlen = [a["werte"][0] for a in einzel if a["thema"] == "teiler"]
            if len(zahlen) == 2:
                extra = _mathe_aufgabe("gemeinsame_teiler", f"{zahlen[0]} und {zahlen[1]}", None)
                if extra:
                    aufgaben.append(extra)
    if len(aufgaben) < 3:
        return None, (f"Auf dem Blatt habe ich nur {len(aufgaben)} Rechenaufgaben lesen können, "
                      "die ich nachrechnen kann. Die Lernwelt kennt bisher: " +
                      ", ".join(MATHE_THEMEN.values()) + ".")
    aufgaben = aufgaben[:150]

    themen = {}
    for a in aufgaben:
        t = themen.setdefault(a["thema"], {"anzahl": 0, "fehler": 0})
        t["anzahl"] += 1
        if a["richtig"] is False:
            t["fehler"] += 1

    erstellt = erstellt or datetime.now().strftime("%Y-%m-%d")
    datum = str(daten.get("datum") or "")
    datum = datum if re.fullmatch(r"\d{4}-\d{2}-\d{2}", datum) else None
    typ = _rein(daten.get("dokumenttyp"), 30) or "Arbeitsblatt"
    titel = _titel_leiser(_rein(daten.get("titel"), 60) or "Mathe")
    titel = re.sub(r"^" + re.escape(typ) + r"\s*:\s*", "", titel, flags=re.I)[:40].strip() or "Mathe"
    kennung = hashlib.sha1(f"{quelle}|{erstellt}|{titel}".encode()).hexdigest()[:6]
    tag = datetime.strptime(datum or erstellt, "%Y-%m-%d").strftime("%d.%m.%Y")
    return {
        "id": f"lw-{_sauber(titel) or 'mathe'}-{kennung}",
        "art": "mathe", "fach": "mathe", "sprache": None,
        "klassen": [int(klasse)], "kind": kind,
        "titel": titel, "info": f"{typ} vom {tag}",
        "erstellt": erstellt, "quelle": quelle,
        "dokumenttyp": typ, "datum": datum, "bewertung": _rein(daten.get("bewertung"), 30),
        "aufgaben": aufgaben, "themen": themen, "unbekannt": unbekannt,
    }, None


# ---------------------------------------------------------------- Ablage

class Listen:
    """Stammdaten (JSON neben der Pipeline) und die daraus erzeugte listen.js."""

    def __init__(self, stamm: Path, webordner: Path):
        self.stamm = stamm
        self.webordner = webordner
        self.js = webordner / "listen.js"

    def lade(self):
        if self.stamm.exists():
            try:
                return json.loads(self.stamm.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        return {"version": 1, "listen": []}

    def _schreibe(self, daten):
        daten["aktualisiert"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        tmp = self.stamm.with_suffix(".tmp")
        tmp.write_text(json.dumps(daten, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.stamm)
        self.veroeffentlichen(daten)

    def veroeffentlichen(self, daten=None):
        daten = daten or self.lade()
        self.webordner.mkdir(parents=True, exist_ok=True)
        inhalt = ("/* Erzeugt von scanpipe (lernwelt.py) — nicht von Hand bearbeiten.\n"
                  "   Stammdaten: ~/scanpipe/lernwelt-listen.json */\n"
                  "window.LERNWELT_LISTEN = " + json.dumps(daten, ensure_ascii=False) + ";\n")
        tmp = self.js.with_suffix(".tmp")
        tmp.write_text(inhalt, encoding="utf-8")
        os.chmod(tmp, 0o644)
        tmp.replace(self.js)

    def sicherstellen(self):
        """listen.js (neu) schreiben, falls sie fehlt — beim ersten Mal leer,
        damit die Seiten keinen 404 laden, sonst aus den Stammdaten."""
        if not self.js.exists():
            self.veroeffentlichen()
            return True
        return False

    def speichern(self, liste):
        daten = self.lade()
        daten["listen"] = [l for l in daten["listen"] if l.get("id") != liste["id"]] + [liste]
        self._schreibe(daten)

    def finde(self, kennung):
        return next((l for l in self.lade()["listen"] if l.get("id") == kennung), None)

    def entfernen(self, kennung):
        daten = self.lade()
        vorher = len(daten["listen"])
        daten["listen"] = [l for l in daten["listen"] if l.get("id") != kennung]
        if len(daten["listen"]) == vorher:
            return False
        self._schreibe(daten)
        return True

    def umhaengen(self, kennung, kind, klasse):
        daten = self.lade()
        for l in daten["listen"]:
            if l.get("id") == kennung:
                l["kind"], l["klassen"] = kind, [int(klasse)]
                self._schreibe(daten)
                return l
        return None
