#!/usr/bin/env python3
"""
build_sw — die Liste der Dateien schreiben, die der Service Worker vorlädt.

Durchsucht static/lernwelt/ und schreibt static/lernwelt/sw-liste.js mit
allen Adressen und einer Gesamtversion (Prüfsumme über Pfade und Inhalte).
Ändert sich eine Datei, ändert sich die Version, und der Browser holt die
neue Fassung. Läuft vor `hugo`; das Ergebnis wird committet.

    python3 scripts/lernwelt/build_sw.py [--pruefen]

--pruefen schreibt nichts und meldet mit Rückgabewert 1, wenn die Datei
nicht mehr zum Inhalt passt (für Tests und den Deploy).
"""

import hashlib
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
INSEL = WURZEL / "static" / "lernwelt"
ZIEL = INSEL / "sw-liste.js"
# Dazu gehört noch das Symbol im Browsertab, das ausserhalb von /lernwelt/ liegt.
EXTRA = {"/favicon-32x32.png": WURZEL / "static" / "favicon-32x32.png"}
# Nicht vorladen: der Service Worker selbst, seine Liste, Notizen fürs Repo
# und alles, was die Dokumenten-Pipeline erst auf dem Server erzeugt.
AUS = {"sw.js", "sw-liste.js", "lehrplan21.md"}
AUS_ORDNER = {"eigene"}


def adresse(pfad: Path) -> str:
    rel = pfad.relative_to(INSEL).as_posix()
    if rel.endswith("index.html"):            # Seiten werden als Ordner aufgerufen
        rel = rel[: -len("index.html")]
    return "/lernwelt/" + rel


def dateien():
    gefunden = {}
    for p in sorted(INSEL.rglob("*")):
        if not p.is_file() or p.name in AUS or p.name.startswith("."):
            continue
        if set(p.relative_to(INSEL).parts) & AUS_ORDNER:
            continue
        gefunden[adresse(p)] = p
    for url, p in EXTRA.items():
        if p.exists():
            gefunden[url] = p
    return dict(sorted(gefunden.items()))


def inhalt():
    eintraege = dateien()
    gesamt = hashlib.sha1()
    for url, p in eintraege.items():
        gesamt.update(url.encode())
        gesamt.update(hashlib.sha1(p.read_bytes()).digest())
    version = gesamt.hexdigest()[:12]
    zeilen = ",\n".join(f"  '{u}'" for u in eintraege)
    return (
        "/* Erzeugt von scripts/lernwelt/build_sw.py — nicht von Hand ändern.\n"
        f"   {len(eintraege)} Dateien. Neue Version = neuer Cache. */\n"
        f"self.LERNWELT_VERSION = '{version}';\n"
        f"self.LERNWELT_DATEIEN = [\n{zeilen}\n];\n"
    ), version, len(eintraege)


def main():
    text, version, anzahl = inhalt()
    if "--pruefen" in sys.argv:
        alt = ZIEL.read_text(encoding="utf-8") if ZIEL.exists() else ""
        if alt == text:
            print(f"sw-liste.js ist aktuell ({anzahl} Dateien, Version {version})")
            return 0
        print("sw-liste.js ist veraltet — bitte scripts/lernwelt/build_sw.py laufen lassen")
        return 1
    ZIEL.write_text(text, encoding="utf-8")
    print(f"sw-liste.js geschrieben: {anzahl} Dateien, Version {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
