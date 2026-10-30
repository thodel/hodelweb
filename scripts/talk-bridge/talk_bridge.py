#!/usr/bin/env python3
"""talk-bridge — Nextcloud Talk ↔ Hermes Agent.

Hermes kennt keinen Nextcloud-Talk-Kanal. Diese Brücke nimmt den Webhook des
Talk-Bots entgegen (früher «OpenClaw», Bot 3), reicht die Nachricht an den
API-Server von Hermes weiter (/v1/responses, eine benannte Unterhaltung je
Raum) und postet die Antwort als Bot zurück.

    talk_bridge.py serve                      Webhook-Dienst (systemd)
    talk_bridge.py send --room T --message M  als Bot posten (scanpipe, Skripte)
    talk_bridge.py react --room T --id N --reaction 👀

Nur Standardbibliothek, Python 3.10. Einstellungen aus der Umgebung
(~/.talk-bridge.env) und config.json neben diesem Skript.
"""

import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HIER = Path(__file__).resolve().parent
MAX_LAENGE = 30000          # Talk nimmt bis 32000 Zeichen
STATUS_ROH = "👀"


def log(*teile):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *teile, flush=True)


def lade_konfig(pfad=None):
    pfad = Path(pfad or os.environ.get("TALK_BRIDGE_CONFIG", HIER / "config.json"))
    konfig = json.loads(pfad.read_text()) if pfad.exists() else {}
    konfig.setdefault("rooms", {})
    konfig.setdefault("listen", "127.0.0.1:8788")
    konfig.setdefault("path", "/nextcloud-talk-webhook")
    konfig.setdefault("state", str(HIER / "state.json"))
    return konfig


# ---------------------------------------------------------------- Signaturen

def signatur(geheim, random, inhalt):
    """HMAC-SHA256 über random + inhalt, hex — so signiert Talk in beide
    Richtungen (Webhook: über den Body; Bot-API: über message bzw. reaction)."""
    if isinstance(inhalt, str):
        inhalt = inhalt.encode()
    return hmac.new(geheim.encode(), random.encode() + inhalt, hashlib.sha256).hexdigest()


def pruefe_signatur(geheim, random, body, gesendet):
    if not random or not gesendet:
        return False
    return hmac.compare_digest(signatur(geheim, random, body), gesendet.strip().lower())


# ---------------------------------------------------------------- Talk-Bot-API

class Talk:
    def __init__(self, basis, geheim):
        self.basis = basis.rstrip("/")
        self.geheim = geheim

    def _post(self, pfad, daten, signiert, methode="POST"):
        random = secrets.token_hex(32)
        anfrage = urllib.request.Request(
            f"{self.basis}/ocs/v2.php/apps/spreed/api/v1/bot/{pfad}",
            data=json.dumps(daten).encode(), method=methode,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "OCS-APIRequest": "true",
                "X-Nextcloud-Talk-Bot-Random": random,
                "X-Nextcloud-Talk-Bot-Signature": signatur(self.geheim, random, signiert),
            })
        with urllib.request.urlopen(anfrage, timeout=30) as r:
            return r.status

    def sende(self, raum, text, antwortAuf=None, leise=False):
        """Postet text, bei Überlänge in mehreren Teilen. Gibt die Anzahl
        gesendeter Teile zurück. Die Bot-API meldet keine Nachrichten-ID."""
        teile = zerlege(text) or ["…"]
        for i, teil in enumerate(teile):
            daten = {"message": teil, "referenceId": secrets.token_hex(32)}
            if antwortAuf and i == 0:
                daten["replyTo"] = int(antwortAuf)
            if leise:
                daten["silent"] = True
            self._post(f"{raum}/message", daten, teil)
        return len(teile)

    def reagiere(self, raum, nachrichtId, emoji, entfernen=False):
        try:
            self._post(f"{raum}/reaction/{int(nachrichtId)}", {"reaction": emoji},
                       emoji, methode="DELETE" if entfernen else "POST")
        except (urllib.error.URLError, OSError) as e:
            log("Reaktion nicht möglich:", e)


def zerlege(text, laenge=MAX_LAENGE):
    """Teilt an Absätzen bzw. Zeilen, nur notfalls mitten im Text."""
    text = text.strip()
    teile = []
    while len(text) > laenge:
        schnitt = max(text.rfind("\n\n", 0, laenge), text.rfind("\n", 0, laenge))
        if schnitt < laenge // 2:
            schnitt = laenge
        teile.append(text[:schnitt].rstrip())
        text = text[schnitt:].lstrip()
    if text:
        teile.append(text)
    return teile


# ---------------------------------------------------------------- Hermes

class Hermes:
    def __init__(self, basis, schluessel, modell="hermes-agent", frist=900):
        self.basis = basis.rstrip("/")
        self.schluessel = schluessel
        self.modell = modell
        self.frist = frist

    def frage(self, text, unterhaltung, sitzungsschluessel):
        daten = {"model": self.modell, "input": text,
                 "conversation": unterhaltung, "store": True}
        anfrage = urllib.request.Request(
            f"{self.basis}/v1/responses", data=json.dumps(daten).encode(),
            headers={"Content-Type": "application/json",
                     "Authorization": f"Bearer {self.schluessel}",
                     "X-Hermes-Session-Key": sitzungsschluessel})
        with urllib.request.urlopen(anfrage, timeout=self.frist) as r:
            return antworttext(json.load(r))


def antworttext(antwort):
    """Text aus einer Responses-Antwort: output[] → message → output_text."""
    stuecke = []
    for eintrag in antwort.get("output") or []:
        if eintrag.get("type") != "message":
            continue
        for teil in eintrag.get("content") or []:
            if teil.get("type") == "output_text" and teil.get("text"):
                stuecke.append(teil["text"])
    if not stuecke and isinstance(antwort.get("output_text"), str):
        stuecke.append(antwort["output_text"])
    return "\n\n".join(stuecke).strip()


# ---------------------------------------------------------------- Webhook-Inhalt

def lies_nachricht(ereignis):
    """Aus dem ActivityStreams-Ereignis: (raum, nachrichtId, akteur, name, text)
    oder None, wenn es keine neue Chat-Nachricht eines Menschen ist."""
    if ereignis.get("type") != "Create":
        return None
    obj = ereignis.get("object") or {}
    akteur = ereignis.get("actor") or {}
    if obj.get("name") != "message" or akteur.get("type") != "Person":
        return None
    try:
        inhalt = json.loads(obj.get("content") or "{}")
    except json.JSONDecodeError:
        return None
    text = inhalt.get("message") or ""
    for schluessel, wert in (inhalt.get("parameters") or {}).items():
        if not isinstance(wert, dict):
            continue
        name = wert.get("name") or wert.get("id") or schluessel
        ersatz = f"[Datei: {name}]" if wert.get("type") == "file" else (
            f"@{name}" if wert.get("type") in ("user", "guest", "call") else name)
        text = text.replace("{" + schluessel + "}", ersatz)
    raum = (ereignis.get("target") or {}).get("id")
    if not raum or not text.strip():
        return None
    return raum, obj.get("id"), akteur.get("id", ""), akteur.get("name", ""), text.strip()


class Zustand:
    """Generation der Unterhaltung je Raum — `/neu` beginnt eine frische."""

    def __init__(self, pfad):
        self.pfad = Path(pfad)
        self.sperre = threading.Lock()
        try:
            self.daten = json.loads(self.pfad.read_text())
        except (OSError, json.JSONDecodeError):
            self.daten = {}

    def unterhaltung(self, raum):
        return f"talk-{raum}-{self.daten.get(raum, 0)}"

    def neu(self, raum):
        with self.sperre:
            self.daten[raum] = self.daten.get(raum, 0) + 1
            tmp = self.pfad.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.daten, indent=1))
            tmp.replace(self.pfad)


class Bruecke:
    def __init__(self, konfig, talk, hermes):
        self.konfig = konfig
        self.talk = talk
        self.hermes = hermes
        self.zustand = Zustand(konfig["state"])
        self.raumsperren = {}
        self.gesehen = []
        self.sperre = threading.Lock()

    def zulassen(self, raum, akteur, text):
        """Gibt den Text für Hermes zurück, oder None. Je Raum: `allow`
        (Akteur-IDs wie users/th, oder *) und `mode` all|mention mit
        `triggers` — in Gruppenräumen antwortet der Bot nur auf Zuruf."""
        regel = self.konfig["rooms"].get(raum)
        if not regel:
            return None
        erlaubt = regel.get("allow", [])
        if "*" not in erlaubt and akteur not in erlaubt:
            return None
        if regel.get("mode", "all") == "mention":
            for wort in regel.get("triggers", []):
                treffer = re.match(rf"\s*@?{re.escape(wort)}\b[\s,:]*", text, re.I)
                if treffer:
                    return text[treffer.end():].strip() or None
            return None
        return text

    def _schon_gesehen(self, raum, nid):
        with self.sperre:
            if (raum, nid) in self.gesehen:
                return True
            self.gesehen = (self.gesehen + [(raum, nid)])[-500:]
            return False

    def verarbeite(self, ereignis):
        gelesen = lies_nachricht(ereignis)
        if not gelesen:
            return
        raum, nid, akteur, name, text = gelesen
        frage = self.zulassen(raum, akteur, text)
        if frage is None or self._schon_gesehen(raum, nid):
            return
        with self.sperre:
            raumsperre = self.raumsperren.setdefault(raum, threading.Lock())
        with raumsperre:                       # Reihenfolge je Raum wahren
            if frage.strip().lower() in ("/neu", "/new"):
                self.zustand.neu(raum)
                self.talk.sende(raum, "Neue Unterhaltung begonnen.", antwortAuf=nid)
                return
            if nid:
                self.talk.reagiere(raum, nid, STATUS_ROH)
            try:
                if self.konfig["rooms"][raum].get("mode") == "mention" or \
                        self.konfig.get("prefixNames"):
                    frage = f"{name or akteur}: {frage}"
                antwort = self.hermes.frage(
                    frage, self.zustand.unterhaltung(raum), f"talk-{raum}")
                self.talk.sende(raum, antwort or "(Hermes gab keine Antwort zurück.)",
                                antwortAuf=nid)
            except (urllib.error.URLError, OSError, ValueError) as e:
                log("Hermes-Fehler:", raum, e)
                grund = "Zeitüberschreitung" if "timed out" in str(e) else type(e).__name__
                self.talk.sende(raum, f"Hermes ist gerade nicht erreichbar ({grund}).",
                                antwortAuf=nid)
            finally:
                if nid:
                    self.talk.reagiere(raum, nid, STATUS_ROH, entfernen=True)


def handler_fuer(bruecke, geheim, pfad):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):      # keine Inhalte ins Journal
            pass

        def do_GET(self):
            if self.path == "/health":
                self._antwort(200, b"ok")
            else:
                self._antwort(404, b"")

        def do_POST(self):
            if self.path != pfad:
                return self._antwort(404, b"")
            laenge = int(self.headers.get("Content-Length") or 0)
            if laenge > 1_000_000:
                return self._antwort(413, b"")
            body = self.rfile.read(laenge)
            if not pruefe_signatur(geheim, self.headers.get("X-Nextcloud-Talk-Random"),
                                   body, self.headers.get("X-Nextcloud-Talk-Signature")):
                log("Signatur ungültig, verworfen")
                return self._antwort(401, b"")
            try:
                ereignis = json.loads(body)
            except json.JSONDecodeError:
                return self._antwort(400, b"")
            # Talk wartet nicht auf Hermes: sofort quittieren, im Hintergrund antworten.
            self._antwort(200, b"")
            threading.Thread(target=self._sicher, args=(ereignis,), daemon=True).start()

        @staticmethod
        def _sicher(ereignis):
            try:
                bruecke.verarbeite(ereignis)
            except Exception as e:              # ein Fehler darf den Dienst nicht beenden
                log("Verarbeitung fehlgeschlagen:", type(e).__name__, e)

        def _antwort(self, code, inhalt):
            self.send_response(code)
            self.send_header("Content-Length", str(len(inhalt)))
            self.end_headers()
            self.wfile.write(inhalt)

    return Handler


# ---------------------------------------------------------------- CLI

def umgebung(name):
    wert = os.environ.get(name)
    if not wert:
        sys.exit(f"{name} fehlt (in ~/.talk-bridge.env setzen)")
    return wert


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = p.add_subparsers(dest="befehl", required=True)
    sub.add_parser("serve")
    s = sub.add_parser("send")
    s.add_argument("--room", required=True)
    s.add_argument("--message", required=True)
    s.add_argument("--reply-to", type=int)
    s.add_argument("--silent", action="store_true")
    r = sub.add_parser("react")
    r.add_argument("--room", required=True)
    r.add_argument("--id", type=int, required=True)
    r.add_argument("--reaction", required=True)
    r.add_argument("--remove", action="store_true")
    a = p.parse_args(argv)

    talk = Talk(umgebung("NEXTCLOUD_URL"), umgebung("TALK_BOT_SECRET"))
    if a.befehl == "send":
        talk.sende(a.room, a.message, antwortAuf=a.reply_to, leise=a.silent)
        return 0
    if a.befehl == "react":
        talk.reagiere(a.room, a.id, a.reaction, entfernen=a.remove)
        return 0

    konfig = lade_konfig()
    hermes = Hermes(umgebung("HERMES_URL"), umgebung("HERMES_API_KEY"),
                    os.environ.get("HERMES_MODEL", "hermes-agent"),
                    int(os.environ.get("HERMES_TIMEOUT", "900")))
    bruecke = Bruecke(konfig, talk, hermes)
    host, port = konfig["listen"].rsplit(":", 1)
    server = ThreadingHTTPServer((host, int(port)),
                                 handler_fuer(bruecke, talk.geheim, konfig["path"]))
    log(f"talk-bridge hört auf {konfig['listen']}{konfig['path']}, "
        f"Räume: {', '.join(konfig['rooms']) or 'keine'}")
    server.serve_forever()


if __name__ == "__main__":
    sys.exit(main())
