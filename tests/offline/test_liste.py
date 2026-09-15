#!/usr/bin/env python3
"""Der Listenbau muss verlässlich sein: gleiches Ergebnis bei gleichem
Inhalt, neue Version bei jeder Änderung, und er darf nichts übersehen."""

import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]


class Listenbau(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="swliste-"))
        (self.tmp / "scripts" / "lernwelt").mkdir(parents=True)
        shutil.copy(WURZEL / "scripts" / "lernwelt" / "build_sw.py", self.tmp / "scripts" / "lernwelt")
        shutil.copytree(WURZEL / "static", self.tmp / "static")
        self.skript = self.tmp / "scripts" / "lernwelt" / "build_sw.py"
        self.liste = self.tmp / "static" / "lernwelt" / "sw-liste.js"

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def bauen(self, *args):
        return subprocess.run([sys.executable, str(self.skript), *args],
                              capture_output=True, text=True)

    def version(self):
        return re.search(r"LERNWELT_VERSION = '([^']+)'", self.liste.read_text()).group(1)

    def test_zweimal_gleich(self):
        self.bauen()
        erst = self.liste.read_text()
        self.bauen()
        self.assertEqual(erst, self.liste.read_text())

    def test_aenderung_neue_version(self):
        self.bauen()
        vorher = self.version()
        ziel = self.tmp / "static" / "lernwelt" / "insel.js"
        ziel.write_text(ziel.read_text() + "\n/* Kleinigkeit */\n")
        self.bauen()
        self.assertNotEqual(vorher, self.version())

    def test_neue_datei_kommt_dazu(self):
        self.bauen()
        (self.tmp / "static" / "lernwelt" / "neu.js").write_text("/* neu */")
        self.bauen()
        self.assertIn("'/lernwelt/neu.js'", self.liste.read_text())

    def test_seiten_als_ordner(self):
        self.bauen()
        text = self.liste.read_text()
        self.assertIn("'/lernwelt/'", text)
        self.assertIn("'/lernwelt/uebung/'", text)
        self.assertNotIn("index.html", text, "Seiten werden als Ordner aufgerufen")

    def test_pipeline_ordner_bleibt_draussen(self):
        eigene = self.tmp / "static" / "lernwelt" / "eigene"
        eigene.mkdir(exist_ok=True)
        (eigene / "listen.js").write_text("window.LERNWELT_LISTEN={listen:[]}")
        self.bauen()
        self.assertNotIn("eigene/listen.js", self.liste.read_text())

    def test_pruefen_meldet_veraltet(self):
        self.bauen()
        self.assertEqual(0, self.bauen("--pruefen").returncode)
        ziel = self.tmp / "static" / "lernwelt" / "raum.css"
        ziel.write_text(ziel.read_text() + "\n/* x */\n")
        ergebnis = self.bauen("--pruefen")
        self.assertEqual(1, ergebnis.returncode)
        self.assertIn("veraltet", ergebnis.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
