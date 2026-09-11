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
import os
import re
from datetime import datetime, timezone
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
liegen die Bilddateien {datei}. Es sind die Seiten eines Blatts, in dieser
Reihenfolge. Lies jede davon mit dem Read-Tool.

Gesucht ist eine Wortliste zum Üben. Es gibt zwei Arten:
- "vokabeln": Wörter einer Fremdsprache mit deutscher Bedeutung.
- "lernwoerter": deutsche Rechtschreib- oder Lernwörter, ohne Übersetzung.

Steht keine solche Liste auf dem Blatt, antworte nur mit
{{"art": "keine_liste", "grund": "<ein kurzer Satz>"}}

Sonst antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt, ohne Text davor
oder danach, ohne Codeblock-Zeichen:

{{
  "art": "vokabeln" oder "lernwoerter",
  "sprache": "englisch", "franzoesisch", ... (nur bei vokabeln),
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

Bei "lernwoerter" hat jeder Eintrag stattdessen
{{"wort": "<das Wort, genau wie auf dem Blatt>", "satz": "<Satz oder null>", "art": "..."}}

Regeln:
- Übernimm ALLE Einträge der Liste in der Reihenfolge des Blatts. Nichts weglassen.
- art: n = Nomen oder Ding, v = Tätigkeit, a = Eigenschaft, f = Farbe, x = Wendung oder anderes.
- Im Satz steht das geübte Wort in geschweiften Klammern, so wie es im Satz vorkommt,
  also auch gebeugt oder gross geschrieben. Beispiel: "The {{cat}} sleeps." oder
  "Je {{mange}} une pomme."
- Hat das Blatt keinen Beispielsatz, ist satz null. Nur bei lernwoerter darfst du dann
  einen kurzen, einfachen Satz für ein Kind bilden.
- Erfinde keine Wörter und keine Übersetzungen. Was du nicht lesen kannst, lässt du weg.
- Handschriftliche Spuren (Häkchen, Kritzeleien, Korrekturen) ignorieren.
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
