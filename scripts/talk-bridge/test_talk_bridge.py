"""Tests der Brücke über echte HTTP-Wege: Talk und Hermes sind lokale
Attrappen, die so prüfen und antworten wie die echten Dienste (Talk: HMAC über
random + message; Hermes: Responses-Format). python3 -m unittest -v"""

import hashlib
import hmac
import json
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import talk_bridge as tb

GEHEIM = "s" * 40
SCHLUESSEL = "hermes-test-key"


def hmac_hex(random, inhalt):
    return hmac.new(GEHEIM.encode(), (random + inhalt).encode(), hashlib.sha256).hexdigest()


class Attrappe:
    """Ein Server für Talk-Bot-API und Hermes zugleich, protokolliert alles."""

    def __init__(self, hermes_antwort=None, hermes_verzoegerung=0):
        self.posts, self.reaktionen, self.fragen = [], [], []
        self.hermes_antwort = hermes_antwort
        self.verzoegerung = hermes_verzoegerung
        attrappe = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _body(self):
                return json.loads(self.rfile.read(int(self.headers["Content-Length"])))

            def _bot(self, methode):
                daten = self._body()
                random = self.headers.get("X-Nextcloud-Talk-Bot-Random", "")
                sig = self.headers.get("X-Nextcloud-Talk-Bot-Signature", "")
                signiert = daten.get("message") if "/message" in self.path else daten.get("reaction")
                if self.headers.get("OCS-APIRequest") != "true" or \
                        not hmac.compare_digest(hmac_hex(random, signiert), sig):
                    return self._ende(401)
                if self.path.endswith("/message"):
                    attrappe.posts.append((self.path, daten))
                else:
                    attrappe.reaktionen.append((methode, self.path, daten["reaction"]))
                self._ende(201)

            def do_POST(self):
                if self.path.startswith("/ocs/v2.php/apps/spreed/api/v1/bot/"):
                    return self._bot("POST")
                if self.path == "/v1/responses":
                    if self.headers.get("Authorization") != f"Bearer {SCHLUESSEL}":
                        return self._ende(401)
                    daten = self._body()
                    attrappe.fragen.append((daten, self.headers.get("X-Hermes-Session-Key")))
                    time.sleep(attrappe.verzoegerung)
                    antwort = attrappe.hermes_antwort or {
                        "id": "resp_1", "object": "response", "status": "completed",
                        "output": [
                            {"type": "function_call", "name": "terminal"},
                            {"type": "message", "role": "assistant", "content": [
                                {"type": "output_text", "text": f"Echo: {daten['input']}"}]}]}
                    inhalt = json.dumps(antwort).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(inhalt)))
                    self.end_headers()
                    return self.wfile.write(inhalt)
                self._ende(404)

            def do_DELETE(self):
                self._bot("DELETE")

            def _ende(self, code):
                self.send_response(code)
                self.send_header("Content-Length", "0")
                self.end_headers()

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def stop(self):
        self.server.shutdown()


def ereignis(text, raum="dm1", akteur="users/th", nid="42", parameter=None, typ="Person"):
    return {"type": "Create",
            "actor": {"type": typ, "id": akteur, "name": "Tester"},
            "object": {"type": "Note", "id": nid, "name": "message",
                       "content": json.dumps({"message": text, "parameters": parameter or {}}),
                       "mediaType": "text/markdown"},
            "target": {"type": "Collection", "id": raum, "name": "Raum"}}


class BrueckeTest(unittest.TestCase):
    def starte(self, **attrappe_args):
        self.att = Attrappe(**attrappe_args)
        self.tmp = tempfile.TemporaryDirectory()
        konfig = tb.lade_konfig("/nicht/da.json")
        konfig.update(state=str(Path(self.tmp.name) / "state.json"), rooms={
            "dm1": {"allow": ["users/th"], "mode": "all"},
            "gruppe": {"allow": ["*"], "mode": "mention", "triggers": ["hermes", "cl-bot"]},
        })
        talk = tb.Talk(self.att.url, GEHEIM)
        hermes = tb.Hermes(self.att.url, SCHLUESSEL, frist=5)
        self.bruecke = tb.Bruecke(konfig, talk, hermes)
        self.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), tb.handler_fuer(self.bruecke, GEHEIM, konfig["path"]))
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.webhook = f"http://127.0.0.1:{self.server.server_port}{konfig['path']}"

    def tearDown(self):
        self.server.shutdown()
        self.att.stop()
        self.tmp.cleanup()

    def schicke(self, ev, sig_falsch=False):
        body = json.dumps(ev).encode()
        random = "r" * 64
        sig = hmac.new(GEHEIM.encode(), random.encode() + body, hashlib.sha256).hexdigest()
        if sig_falsch:
            sig = "0" * 64
        anfrage = urllib.request.Request(self.webhook, data=body, headers={
            "Content-Type": "application/json", "X-Nextcloud-Talk-Random": random,
            "X-Nextcloud-Talk-Signature": sig, "X-Nextcloud-Talk-Backend": self.att.url})
        try:
            with urllib.request.urlopen(anfrage, timeout=5) as r:
                return r.status
        except urllib.error.HTTPError as e:
            return e.code

    def warte(self, bedingung, frist=5):
        ende = time.time() + frist
        while time.time() < ende:
            if bedingung():
                return True
            time.sleep(0.02)
        return False

    def test_dm_wird_beantwortet(self):
        self.starte()
        self.assertEqual(self.schicke(ereignis("Wie spät ist es?")), 200)
        self.assertTrue(self.warte(lambda: self.att.posts))
        pfad, daten = self.att.posts[0]
        self.assertEqual(pfad, "/ocs/v2.php/apps/spreed/api/v1/bot/dm1/message")
        self.assertEqual(daten["message"], "Echo: Wie spät ist es?")
        self.assertEqual(daten["replyTo"], 42)
        frage, sitzung = self.att.fragen[0]
        self.assertEqual(frage["conversation"], "talk-dm1-0")
        self.assertEqual(sitzung, "talk-dm1")
        self.assertTrue(self.warte(lambda: len(self.att.reaktionen) == 2))
        self.assertEqual([r[0] for r in self.att.reaktionen], ["POST", "DELETE"])

    def test_falsche_signatur_abgewiesen(self):
        self.starte()
        self.assertEqual(self.schicke(ereignis("hallo"), sig_falsch=True), 401)
        time.sleep(0.3)
        self.assertEqual(self.att.fragen, [])

    def test_fremde_und_bots_ignoriert(self):
        self.starte()
        self.schicke(ereignis("hallo", akteur="users/AH"))
        self.schicke(ereignis("hallo", raum="unbekannt"))
        self.schicke(ereignis("hallo", typ="Application", akteur="bots/x"))
        time.sleep(0.3)
        self.assertEqual(self.att.fragen, [])
        self.assertEqual(self.att.posts, [])

    def test_gruppe_nur_auf_zuruf(self):
        self.starte()
        self.schicke(ereignis("einfach so", raum="gruppe", akteur="users/MB", nid="1"))
        self.schicke(ereignis("@Hermes: was gibt es heute?", raum="gruppe",
                              akteur="users/MB", nid="2"))
        self.assertTrue(self.warte(lambda: self.att.posts))
        time.sleep(0.2)
        self.assertEqual(len(self.att.fragen), 1)
        self.assertEqual(self.att.fragen[0][0]["input"], "Tester: was gibt es heute?")

    def test_doppelte_zustellung_einmal(self):
        self.starte()
        self.schicke(ereignis("eins"))
        self.schicke(ereignis("eins"))
        self.assertTrue(self.warte(lambda: self.att.posts))
        time.sleep(0.3)
        self.assertEqual(len(self.att.fragen), 1)

    def test_neu_wechselt_unterhaltung(self):
        self.starte()
        self.schicke(ereignis("/neu", nid="1"))
        self.assertTrue(self.warte(lambda: self.att.posts))
        self.schicke(ereignis("weiter", nid="2"))
        self.assertTrue(self.warte(lambda: self.att.fragen))
        self.assertEqual(self.att.fragen[0][0]["conversation"], "talk-dm1-1")

    def test_hermes_zeitueberschreitung_meldet_sich(self):
        self.starte(hermes_verzoegerung=1)
        self.bruecke.hermes.frist = 0.3
        self.schicke(ereignis("langsam"))
        self.assertTrue(self.warte(lambda: self.att.posts))
        self.assertIn("nicht erreichbar", self.att.posts[0][1]["message"])

    def test_datei_und_erwaehnung_im_text(self):
        self.starte()
        self.schicke(ereignis("{file} für {mention-user1}", parameter={
            "file": {"type": "file", "id": "9", "name": "rechnung.pdf"},
            "mention-user1": {"type": "user", "id": "u2", "name": "Gast"}}))
        self.assertTrue(self.warte(lambda: self.att.fragen))
        self.assertEqual(self.att.fragen[0][0]["input"], "[Datei: rechnung.pdf] für @Gast")

    def test_cli_send_signiert_wie_talk(self):
        self.starte()
        talk = tb.Talk(self.att.url, GEHEIM)
        self.assertEqual(talk.sende("dm1", "x" * 70000, antwortAuf=7), 3)
        self.assertEqual(len(self.att.posts), 3)
        self.assertEqual(self.att.posts[0][1]["replyTo"], 7)
        self.assertNotIn("replyTo", self.att.posts[1][1])
        falsch = tb.Talk(self.att.url, "anderes-geheimnis")
        with self.assertRaises(urllib.error.HTTPError):
            falsch.sende("dm1", "abgelehnt")


class AntworttextTest(unittest.TestCase):
    def test_mehrere_teile_und_fallback(self):
        self.assertEqual(tb.antworttext({"output": [
            {"type": "message", "content": [{"type": "output_text", "text": "a"},
                                            {"type": "refusal", "refusal": "x"}]},
            {"type": "message", "content": [{"type": "output_text", "text": "b"}]}]}), "a\n\nb")
        self.assertEqual(tb.antworttext({"output_text": "c"}), "c")
        self.assertEqual(tb.antworttext({}), "")


if __name__ == "__main__":
    unittest.main()
