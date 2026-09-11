#!/usr/bin/env python3
"""
scanpipe — Dokumente aus dem Nextcloud-Talk-Chat erkennen und einsortieren.

Ablauf:
  1. Den Bot-Raum nach neuen Nachrichten mit Datei-Anhang fragen.
  2. Anhang über WebDAV herunterladen und fürs Modell verkleinern.
  3. openclaw mit einem bildfähigen Modell fragen: Volltext, Eckdaten, Domäne.
  4. Datei in den passenden Ordner verschieben, JSON danebenlegen.
  5. Im Chat zusammenfassen und den Link schicken.

Läuft als systemd-User-Timer. Zustand steht in state.json, damit nichts
doppelt verarbeitet wird.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

import requests

BASIS = Path(__file__).resolve().parent
KONFIG_PFAD = BASIS / "config.json"
ZUSTAND_PFAD = BASIS / "state.json"
LOG_PFAD = BASIS / "scanpipe.log"


# ---------------------------------------------------------------- Grundlagen

def log(*teile):
    zeile = datetime.now().strftime("%Y-%m-%d %H:%M:%S") + " " + " ".join(str(t) for t in teile)
    print(zeile, flush=True)
    try:
        with LOG_PFAD.open("a", encoding="utf-8") as f:
            f.write(zeile + "\n")
    except OSError:
        pass


def lade_konfig():
    with KONFIG_PFAD.open(encoding="utf-8") as f:
        k = json.load(f)
    # Zugangsdaten stehen in einer eigenen Datei mit Rechten 600.
    env_pfad = Path(os.path.expanduser(k.get("envDatei", "~/.scanpipe.env")))
    if env_pfad.exists():
        for zeile in env_pfad.read_text(encoding="utf-8").splitlines():
            zeile = zeile.strip()
            if not zeile or zeile.startswith("#") or "=" not in zeile:
                continue
            name, wert = zeile.split("=", 1)
            os.environ.setdefault(name.strip(), wert.strip().strip('"').strip("'"))
    fehlend = [n for n in ("NEXTCLOUD_URL", "NEXTCLOUD_USER", "NEXTCLOUD_PASS")
               if not os.environ.get(n)]
    if fehlend:
        raise SystemExit("Fehlende Zugangsdaten: " + ", ".join(fehlend))
    return k


def lade_zustand():
    if ZUSTAND_PFAD.exists():
        try:
            return json.loads(ZUSTAND_PFAD.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            log("state.json unlesbar, fange von vorne an")
    return {"letzteId": 0, "verarbeitet": {}}


def speichere_zustand(z):
    tmp = ZUSTAND_PFAD.with_suffix(".tmp")
    tmp.write_text(json.dumps(z, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(ZUSTAND_PFAD)


def ist_bot(nachricht):
    """Alles, was nicht von einem Menschen kommt: Bots, Systemmeldungen,
    Gäste. Solche Nachrichten löst die Pipeline nie aus."""
    if nachricht.get("actorType") != "users":
        return True
    return str(nachricht.get("actorId", "")).startswith("bot-")


# ---------------------------------------------------------------- Nextcloud

class Cloud:
    def __init__(self, konfig):
        self.basis = os.environ["NEXTCLOUD_URL"].rstrip("/")
        self.user = os.environ["NEXTCLOUD_USER"]
        self.auth = (self.user, os.environ["NEXTCLOUD_PASS"])
        self.konfig = konfig
        self.s = requests.Session()
        self.s.auth = self.auth
        self.s.headers.update({"OCS-APIRequest": "true", "Accept": "application/json"})

    # ---- Talk ----
    def nachrichten(self, raum, limit=50):
        url = f"{self.basis}/ocs/v2.php/apps/spreed/api/v1/chat/{raum}"
        r = self.s.get(url, params={"lookIntoFuture": 0, "limit": limit}, timeout=30)
        r.raise_for_status()
        return list(reversed(r.json()["ocs"]["data"]))   # älteste zuerst

    def sende(self, raum, text, antwortAuf=None):
        """Antworten kommen vom Bot, nicht vom Benutzer — darum über openclaw.
        openclaw meldet die Nachrichten-ID nicht zurück, also lesen wir sie
        anschliessend aus dem Raum nach. Klappt das nicht, geht es direkt
        über die OCS-Schnittstelle."""
        if self.konfig.get("sendeUeberOpenclaw", True):
            befehl = [self.konfig.get("openclaw", "openclaw"), "message", "send",
                      "--channel", "nextcloud-talk", "--target", raum,
                      "--message", text]
            if antwortAuf:
                befehl += ["--reply-to", str(antwortAuf)]
            umgebung = dict(os.environ)
            umgebung["PATH"] = os.path.expanduser("~/.npm-global/bin") + ":" + umgebung.get("PATH", "")
            try:
                p = subprocess.run(befehl, capture_output=True, text=True,
                                   timeout=90, env=umgebung)
                if p.returncode == 0:
                    return self._letzte_bot_nachricht(raum)
                log("openclaw message send:", p.returncode, (p.stderr or "")[:200])
            except (subprocess.SubprocessError, OSError) as e:
                log("openclaw message send nicht möglich:", e)

        url = f"{self.basis}/ocs/v2.php/apps/spreed/api/v1/chat/{raum}"
        daten = {"message": text}
        if antwortAuf:
            daten["replyTo"] = antwortAuf
        r = self.s.post(url, data=daten, timeout=30)
        if r.status_code >= 300:
            log("Senden fehlgeschlagen:", r.status_code, r.text[:200])
            return None
        return r.json()["ocs"]["data"].get("id")

    def _letzte_bot_nachricht(self, raum):
        """ID der jüngsten Bot-Nachricht — für die Korrekturzuordnung.
        openclaw postet unter einer eigenen Bot-Kennung, darum prüfen wir
        den actorType und nicht einen festen Namen."""
        for _ in range(4):
            try:
                for m in self.nachrichten(raum, limit=6)[::-1]:
                    if ist_bot(m) and m.get("messageType") == "comment":
                        return m.get("id")
            except requests.RequestException:
                pass
            time.sleep(0.6)
        return None

    def reagiere(self, raum, nachrichtId, emoji):
        url = (f"{self.basis}/ocs/v2.php/apps/spreed/api/v1/reaction/"
               f"{raum}/{nachrichtId}")
        try:
            self.s.post(url, data={"reaction": emoji}, timeout=20)
        except requests.RequestException:
            pass

    # ---- WebDAV ----
    def _dav(self, pfad):
        teile = [urllib.parse.quote(t) for t in pfad.strip("/").split("/") if t]
        return f"{self.basis}/remote.php/dav/files/{self.user}/" + "/".join(teile)

    def hole(self, pfad, ziel: Path):
        r = self.s.get(self._dav(pfad), timeout=120)
        r.raise_for_status()
        ziel.write_bytes(r.content)
        return ziel

    def ordner_anlegen(self, pfad):
        """Legt den Pfad samt Elternordnern an. Vorhandene bleiben unberührt."""
        teile = [t for t in pfad.strip("/").split("/") if t]
        for i in range(1, len(teile) + 1):
            teil = "/".join(teile[:i])
            r = self.s.request("MKCOL", self._dav(teil), timeout=30)
            if r.status_code not in (201, 405):      # 405 = gibt es schon
                log("MKCOL", teil, "->", r.status_code)

    def existiert(self, pfad):
        r = self.s.request("PROPFIND", self._dav(pfad),
                           headers={"Depth": "0"}, timeout=30)
        return r.status_code < 300

    def verschiebe(self, von, nach):
        r = self.s.request("MOVE", self._dav(von),
                           headers={"Destination": self._dav(nach),
                                    "Overwrite": "F"}, timeout=60)
        return r.status_code < 300, r.status_code

    def lege_ab(self, pfad, inhalt: bytes):
        r = self.s.put(self._dav(pfad), data=inhalt, timeout=120)
        return r.status_code < 300, r.status_code


# ---------------------------------------------------------------- Bild

def fuers_modell(quelle: Path, ziel: Path, breite=1600):
    """Verkleinert und begradigt das Foto. Ohne ImageMagick bleibt es wie es ist."""
    if not shutil.which("convert"):
        shutil.copy(quelle, ziel)
        return ziel
    befehl = ["convert", str(quelle), "-auto-orient",
              "-resize", f"{breite}x{breite}>", "-normalize",
              "-quality", "88", str(ziel)]
    try:
        subprocess.run(befehl, check=True, capture_output=True, timeout=120)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        log("convert fehlgeschlagen, nehme das Original:", e)
        shutil.copy(quelle, ziel)
    return ziel


# ---------------------------------------------------------------- Erkennung

PROMPT = """Du bist ein Dokumentenscanner. Im Arbeitsverzeichnis liegen die Bilddateien
{datei}. Es sind die Seiten eines einzigen Dokuments, in dieser Reihenfolge.
Lies jede davon mit dem Read-Tool und werte sie zusammen aus.

Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt, ohne Text davor oder danach,
ohne Codeblock-Zeichen. Felder:

{{
  "domaene": "<eine aus: {domaenen}>",
  "dokumenttyp": "<kurz, z.B. Rechnung, Mahnung, Elternbrief, Police, Lohnabrechnung>",
  "absender": "<Firma oder Person, die das Dokument geschickt hat>",
  "betreff": "<worum es geht, max. 8 Wörter>",
  "datum": "<JJJJ-MM-TT oder null>",
  "faellig_am": "<JJJJ-MM-TT oder null>",
  "betrag": <Zahl ohne Währung oder null>,
  "waehrung": "<CHF, EUR, ... oder null>",
  "referenz": "<Rechnungs-, Kunden- oder Aktennummer oder null>",
  "empfaenger": "<an wen es gerichtet ist oder null>",
  "sicherheit": <0.0 bis 1.0, wie sicher du dir bei der Domäne bist>,
  "handlung": "<was zu tun ist, ein Satz, oder null>",
  "volltext": "<der gesamte lesbare Text des Dokuments>"
}}

Regeln:
- Erfinde nichts. Was du nicht lesen kannst, ist null.
- Datumsangaben immer als JJJJ-MM-TT.
- Beträge als Zahl mit Punkt als Dezimaltrennzeichen.
- Wenn das Bild kein Dokument ist (Foto von Menschen, Landschaft, Screenshot ohne
  Dokumentcharakter), setze domaene auf "kein_dokument" und fülle nur volltext.
"""


def erkenne(konfig, bilder, arbeitsverzeichnis: Path, sitzung: str):
    """Fragt openclaw mit einem bildfähigen Modell. 'bilder' ist eine Liste von
    Seiten in der richtigen Reihenfolge. Gibt ein dict zurück."""
    if isinstance(bilder, Path):
        bilder = [bilder]
    kopien = []
    for b in bilder:
        ziel = arbeitsverzeichnis / b.name
        if ziel.resolve() != b.resolve():
            shutil.copy(b, ziel)
            kopien.append(ziel)

    namen = ", ".join(b.name for b in bilder)
    prompt = PROMPT.format(datei=namen, domaenen=", ".join(konfig["domaenen"]))
    befehl = [
        konfig.get("openclaw", "openclaw"), "agent",
        "--agent", konfig.get("agent", "main"),
        "--model", konfig["modell"],
        "--session-key", sitzung,
        "--timeout", str(konfig.get("modellTimeout", 240)),
        "--message", prompt,
    ]
    umgebung = dict(os.environ)
    umgebung["PATH"] = os.path.expanduser("~/.npm-global/bin") + ":" + umgebung.get("PATH", "")
    try:
        p = subprocess.run(befehl, capture_output=True, text=True,
                           timeout=konfig.get("modellTimeout", 240) + 60, env=umgebung)
    except subprocess.TimeoutExpired:
        return None, "Zeitüberschreitung beim Modell"
    finally:
        for k in kopien:
            try:
                k.unlink(missing_ok=True)
            except OSError:
                pass

    roh = (p.stdout or "") + ("\n" + p.stderr if p.returncode else "")
    daten = json_aus_text(roh)
    if daten is None:
        return None, "Antwort war kein JSON: " + roh.strip()[:300]
    return daten, None


def json_aus_text(text):
    """Sucht das erste vollständige JSON-Objekt im Text."""
    text = re.sub(r"```(?:json)?", "", text)
    start = text.find("{")
    while start >= 0:
        tiefe, in_string, escape = 0, False, False
        for i in range(start, len(text)):
            c = text[i]
            if escape:
                escape = False
                continue
            if c == "\\":
                escape = True
                continue
            if c == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if c == "{":
                tiefe += 1
            elif c == "}":
                tiefe -= 1
                if tiefe == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        break
        start = text.find("{", start + 1)
    return None


# ---------------------------------------------------------------- Ablage

def sauber(text, laenge=48):
    if not text:
        return ""
    text = str(text)
    ersatz = {"ä": "ae", "ö": "oe", "ü": "ue", "Ä": "Ae", "Ö": "Oe", "Ü": "Ue", "ß": "ss"}
    for a, b in ersatz.items():
        text = text.replace(a, b)
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return text[:laenge].strip("-")


def dateiname(daten, endung):
    datum = daten.get("datum") or datetime.now().strftime("%Y-%m-%d")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(datum)):
        datum = datetime.now().strftime("%Y-%m-%d")
    teile = [datum, sauber(daten.get("absender"), 32), sauber(daten.get("dokumenttyp"), 20)]
    name = "_".join(t for t in teile if t) or datum
    return name + endung


def einsortieren(cloud, konfig, quelle: Path, daten, original_pfad):
    domaene = daten.get("domaene") or "sonstiges"
    if domaene not in konfig["domaenen"]:
        domaene = "sonstiges"
    jahr = (daten.get("datum") or "")[:4]
    if not re.match(r"^\d{4}$", jahr):
        jahr = datetime.now().strftime("%Y")

    ordner = f"{konfig['zielOrdner'].strip('/')}/{domaene}/{jahr}"
    cloud.ordner_anlegen(ordner)

    endung = Path(original_pfad).suffix.lower() or quelle.suffix.lower() or ".jpg"
    name = dateiname(daten, endung)
    ziel = f"{ordner}/{name}"
    n = 2
    while cloud.existiert(ziel):
        ziel = f"{ordner}/{Path(name).stem}-{n}{endung}"
        n += 1

    ok, code = cloud.verschiebe(original_pfad, ziel)
    if not ok:
        # Verschieben ging nicht (z.B. Quelle schon weg) — dann hochladen.
        ok, code = cloud.lege_ab(ziel, quelle.read_bytes())
        if not ok:
            return None, f"Ablegen fehlgeschlagen (HTTP {code})"

    beipack = dict(daten)
    beipack["_datei"] = ziel
    beipack["_erkannt_am"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    beipack["_modell"] = konfig["modell"]
    cloud.lege_ab(ziel.rsplit(".", 1)[0] + ".json",
                  json.dumps(beipack, ensure_ascii=False, indent=2).encode("utf-8"))
    return ziel, None


# ---------------------------------------------------------------- Bericht

def bericht(daten, ziel, cloud):
    d = daten
    zeilen = []
    kopf = {"rechnung": "🧾", "versicherung": "🛡️", "bank": "🏦", "steuern": "🧮",
            "schule": "🎒", "gesundheit": "🩺", "wohnen": "🏠", "fahrzeug": "🚗",
            "arbeit": "💼", "vertrag": "📄", "quittung": "🧾", "behoerde": "🏛️",
            "sonstiges": "📁"}.get(d.get("domaene"), "📁")
    zeilen.append(f"{kopf} **{d.get('dokumenttyp') or 'Dokument'}** — {d.get('absender') or 'unbekannter Absender'}")
    if d.get("betreff"):
        zeilen.append(f"_{d['betreff']}_")
    fakten = []
    if d.get("datum"):
        fakten.append(f"Datum {d['datum']}")
    if d.get("betrag") is not None:
        fakten.append(f"Betrag {d['betrag']} {d.get('waehrung') or ''}".strip())
    if d.get("faellig_am"):
        fakten.append(f"fällig {d['faellig_am']}")
    if d.get("referenz"):
        fakten.append(f"Ref. {d['referenz']}")
    if fakten:
        zeilen.append(" · ".join(fakten))
    if d.get("handlung"):
        zeilen.append(f"➡️ {d['handlung']}")
    sicher = d.get("sicherheit")
    sicher_text = f" (Sicherheit {round(float(sicher) * 100)} %)" if isinstance(sicher, (int, float)) else ""
    zeilen.append(f"📂 Abgelegt unter **{d.get('domaene')}**{sicher_text}")
    zeilen.append(f"`{ziel}`")
    zeilen.append("_Falsche Ablage? Antworte auf diese Nachricht mit der richtigen Domäne._")
    return "\n".join(zeilen)


# ---------------------------------------------------------------- Korrektur

def korrektur_pruefen(cloud, konfig, zustand, raum, nachricht):
    """Antwortet der Nutzer auf einen Bericht mit einer Domäne, wird umsortiert."""
    eltern = nachricht.get("parent") or {}
    eltern_id = str(eltern.get("id") or "")
    if not eltern_id:
        return False
    eintrag = zustand.get("berichte", {}).get(eltern_id)
    if not eintrag:
        return False
    if eintrag.get("raum") and eintrag["raum"] != raum:
        return False
    text = str(nachricht.get("message", "")).strip()
    # Nur eine kurze Antwort ist als Korrektur gemeint. Alles andere ist
    # Geplauder und wird still übergangen.
    if not text or len(text.split()) > 2 or len(text) > 40:
        return False
    wunsch = sauber(text, 30).replace("-", "")
    treffer = next((d for d in konfig["domaenen"] if sauber(d, 30).replace("-", "") == wunsch), None)
    if not treffer:
        cloud.sende(raum, "Diese Domäne kenne ich nicht. Möglich sind: " +
                    ", ".join(konfig["domaenen"]), antwortAuf=nachricht["id"])
        return True

    alt = eintrag["pfad"]
    jahr = alt.split("/")[-2]
    neuer_ordner = f"{konfig['zielOrdner'].strip('/')}/{treffer}/{jahr}"
    cloud.ordner_anlegen(neuer_ordner)
    name = alt.rsplit("/", 1)[-1]
    neu = f"{neuer_ordner}/{name}"
    ok, code = cloud.verschiebe(alt, neu)
    if ok:
        cloud.verschiebe(alt.rsplit(".", 1)[0] + ".json", neu.rsplit(".", 1)[0] + ".json")
        eintrag["pfad"] = neu
        cloud.sende(raum, f"✅ Verschoben nach **{treffer}**\n`{neu}`", antwortAuf=nachricht["id"])
        log("Korrektur:", alt, "->", neu)
    else:
        cloud.sende(raum, f"Das Verschieben ging nicht (HTTP {code}).", antwortAuf=nachricht["id"])
    return True


# ---------------------------------------------------------------- Hauptlauf

def verarbeite(cloud, konfig, zustand, raum, nachricht, arbeitsverzeichnis: Path):
    mp = nachricht.get("messageParameters") or {}
    datei = mp.get("file")
    nid = str(nachricht["id"])
    name = datei.get("name", "dokument")
    pfad = datei.get("path") or name
    mime = (datei.get("mimetype") or "").lower()

    log("Neues Dokument:", nid, name, mime)
    cloud.reagiere(raum, nachricht["id"], "👀")

    with tempfile.TemporaryDirectory(prefix="scanpipe-") as tmp:
        tmpdir = Path(tmp)
        original = tmpdir / name
        try:
            cloud.hole(pfad, original)
        except requests.RequestException as e:
            cloud.sende(raum, f"⚠️ Konnte `{name}` nicht laden: {e}", antwortAuf=nachricht["id"])
            return

        if mime.startswith("image/"):
            fuers_modell(original, tmpdir / ("klein-" + name))
            bilder = [tmpdir / ("klein-" + name)]
        elif mime == "application/pdf":
            if not shutil.which("pdftoppm"):
                cloud.sende(raum, "⚠️ PDF-Verarbeitung braucht `pdftoppm`, das fehlt noch.",
                            antwortAuf=nachricht["id"])
                return
            maxSeiten = int(konfig.get("pdfSeiten", 3))
            subprocess.run(["pdftoppm", "-png", "-r", "150", "-f", "1", "-l", str(maxSeiten),
                            str(original), str(tmpdir / "seite")],
                           capture_output=True, timeout=240)
            seiten = sorted(tmpdir.glob("seite*.png"))
            if not seiten:
                cloud.sende(raum, "⚠️ Aus dem PDF liess sich keine Seite lesen.",
                            antwortAuf=nachricht["id"])
                return
            bilder = []
            for s_ in seiten[:maxSeiten]:
                klein = tmpdir / ("klein-" + s_.name)
                fuers_modell(s_, klein)
                bilder.append(klein)
            log(f"PDF mit {len(bilder)} Seite(n) für das Modell aufbereitet")
        else:
            cloud.sende(raum, f"⚠️ `{mime}` kann ich nicht lesen. Schick ein Foto oder ein PDF.",
                        antwortAuf=nachricht["id"])
            return

        daten, fehler = erkenne(konfig, bilder, arbeitsverzeichnis, f"agent:main:scanpipe-{nid}")
        if fehler:
            log("Erkennung fehlgeschlagen:", fehler)
            cloud.sende(raum, f"⚠️ Erkennung fehlgeschlagen: {fehler[:200]}",
                        antwortAuf=nachricht["id"])
            return

        if daten.get("domaene") == "kein_dokument":
            cloud.sende(raum, "🤔 Das sieht nicht nach einem Dokument aus. Ich lasse es liegen.",
                        antwortAuf=nachricht["id"])
            return

        ziel, fehler = einsortieren(cloud, konfig, original, daten, pfad)
        if fehler:
            cloud.sende(raum, f"⚠️ {fehler}", antwortAuf=nachricht["id"])
            return

        berichtId = cloud.sende(raum, bericht(daten, ziel, cloud), antwortAuf=nachricht["id"])
        cloud.reagiere(raum, nachricht["id"], "✅")
        if berichtId:
            zustand.setdefault("berichte", {})[str(berichtId)] = {
                "pfad": ziel, "quelle": nid, "raum": raum
            }
        log("Abgelegt:", ziel)


def main():
    konfig = lade_konfig()
    zustand = lade_zustand()
    cloud = Cloud(konfig)
    arbeitsverzeichnis = Path(os.path.expanduser(konfig.get("agentWorkspace",
                                                            "~/.openclaw/workspace")))
    arbeitsverzeichnis.mkdir(parents=True, exist_ok=True)

    raeume = [r for r in (konfig.get("raeume") or []) if r.get("aktiv", True)]
    if not raeume:
        log("Kein aktiver Raum in der Konfiguration.")
        return 1
    stand_je_raum = zustand.setdefault("raeume", {})

    for eintrag in raeume:
        raum = eintrag["token"]
        name = eintrag.get("name", raum)
        try:
            nachrichten = cloud.nachrichten(raum, limit=konfig.get("holeAnzahl", 50))
        except requests.RequestException as e:
            log(f"Raum {name} nicht erreichbar:", e)
            continue

        letzte = int(stand_je_raum.get(raum, {}).get("letzteId", 0))
        if letzte == 0 and nachrichten:
            # Beim ersten Lauf nur ab jetzt schauen, nicht die ganze Vergangenheit.
            letzte = max(int(m.get("id", 0)) for m in nachrichten)
            stand_je_raum[raum] = {"letzteId": letzte}
            speichere_zustand(zustand)
            log(f"Raum {name}: starte ab Nachricht {letzte}")
            continue

        neu_liste = [m for m in nachrichten if int(m.get("id", 0)) > letzte]
        if not neu_liste:
            continue
        log(f"Raum {name}: {len(neu_liste)} neue Nachricht(en) seit {letzte}")

        for m in neu_liste:
            try:
                if ist_bot(m) or m.get("messageType") != "comment":
                    continue
                besitzer = konfig.get("besitzer")
                if besitzer and m.get("actorId") != besitzer:
                    continue
                if korrektur_pruefen(cloud, konfig, zustand, raum, m):
                    continue
                mp = m.get("messageParameters") or {}
                if mp.get("file"):
                    verarbeite(cloud, konfig, zustand, raum, m, arbeitsverzeichnis)
            except Exception as e:      # eine kaputte Nachricht darf nicht alles stoppen
                log("Fehler bei Nachricht", m.get("id"), ":", repr(e))
            finally:
                jetzt = stand_je_raum.setdefault(raum, {})
                jetzt["letzteId"] = max(int(jetzt.get("letzteId", 0)), int(m.get("id", 0)))
                speichere_zustand(zustand)
    return 0


if __name__ == "__main__":
    sys.exit(main())
