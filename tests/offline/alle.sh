#!/usr/bin/env bash
# Alle Tests zum Offline-Betrieb. Aus dem Wurzelverzeichnis des Repos aufrufen:
#   bash tests/offline/alle.sh
set -u
cd "$(dirname "$0")/../.." || exit 1
fehler=0

echo "== Precache-Liste ist aktuell =="
python3 scripts/lernwelt/build_sw.py --pruefen || fehler=1

echo
echo "== Listenbau (Python) =="
python3 tests/offline/test_liste.py 2>&1 | tail -3 || fehler=1
python3 tests/offline/test_liste.py >/dev/null 2>&1 || fehler=1

echo
echo "== Service Worker, Vollständigkeit, Hausprogramm, Gegenprobe (Node) =="
node --test tests/offline/*.mjs 2>&1 | grep -E "^(✔|✖)|^ℹ (tests|pass|fail)" || fehler=1
node --test tests/offline/*.mjs >/dev/null 2>&1 || fehler=1

echo
if [ "$fehler" -eq 0 ]; then echo "Alles grün."; else echo "FEHLER — siehe oben."; fi
exit "$fehler"
