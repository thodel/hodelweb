# Lerninsel offline

Die Insel läuft ohne Internet. Wer sie einmal mit Netz öffnet, hat danach
alles im Browser: Insel, alle Räume, Übungen, Spiele. Der Spielstand lag
schon immer lokal (`localStorage`).

## Wie es zusammenhängt

| Datei | Aufgabe |
|---|---|
| `static/lernwelt/sw.js` | Service Worker: lädt beim ersten Besuch alles vor, bedient danach aus dem Cache |
| `static/lernwelt/sw-liste.js` | erzeugte Dateiliste samt Version — **nicht von Hand ändern** |
| `static/lernwelt/offline.js` | meldet den Service Worker an, zeigt unten rechts den Stand |
| `static/lernwelt/manifest.webmanifest`, `icon/` | Installation auf dem iPad («Zum Home-Bildschirm») |
| `static/lernwelt/kurzfilm.js` | Pixelfilm fürs Kino, wenn kein Netz da ist |
| `scripts/lernwelt/build_sw.py` | schreibt `sw-liste.js` |

**Cache zuerst** für alles Feste. **Cache und dann erneuern** für die zwei
veränderlichen Dateien: `eigene/listen.js` (Wortlisten und Mathe-Blätter aus
der Dokumenten-Pipeline) und `videos.json`.

YouTube bleibt aussen vor: der Service Worker fasst fremde Herkunft nicht an.
Warum die Videos nicht mitkommen können, steht in Issue #11.

## Nach jeder Änderung an der Insel

```bash
python3 scripts/lernwelt/build_sw.py     # neue Liste, neue Version
bash tests/offline/alle.sh               # alle Offline-Tests
```

Ohne neue Liste bleibt der alte Cache aktiv, und die Kinder sehen die
Änderung nie. Der Deploy prüft das:

```bash
python3 scripts/lernwelt/build_sw.py --pruefen   # Rückgabewert 1, wenn veraltet
```

Danach wie immer: committen, auf dem Server `git pull` und `hugo`.

## Beim Entwickeln

Der Service Worker hält Dateien fest. In den Entwicklerwerkzeugen unter
*Application → Service Workers* «Update on reload» einschalten oder den
Worker abmelden. Ein harter Neuladen allein genügt nicht.

## Tests

```bash
bash tests/offline/alle.sh
```

- `test_liste.py` — der Listenbau ist verlässlich und übersieht nichts
- `test_vollstaendig.mjs` — jede geladene Datei steht im Precache (die Bremse gegen vergessene Dateien)
- `test_sw_logik.mjs` — Vorladen, 401, Aktivieren, Cache ohne Netz, veränderliche Dateien
- `test_ersatz.mjs` — Pixelfilm und Hauskonzert
- `test_gegenprobe.mjs` — mit unvollständiger Liste **muss** der Offline-Fall scheitern

Von Hand bleibt der echte Lauf: Seite laden, Server abschalten, durch die
Räume gehen. Genau so wurde es abgenommen.

## Gut zu wissen

- Der Spielstand hängt am Browser. Wer die Websitedaten löscht, verliert ihn.
- Der Passwortschutz gilt weiter: ohne Anmeldung kommt nichts in den Cache.
- Eine neue Fassung meldet sich unten rechts als «⬇️ Neue Fassung ist da».
  Erst ein Klick übernimmt sie, damit niemand mitten im Spiel unterbrochen wird.
