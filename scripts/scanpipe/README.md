# scanpipe

Fotografierte Dokumente landen im Nextcloud-Talk-Chat mit dem Bot, werden dort
erkannt, benannt und in den passenden Ordner einsortiert.

## Ablauf

1. **Erfassen** — Foto in der Nextcloud-Talk-App in den Raum **Dokumente**
   schicken (Büroklammer → Kamera). Mehrere Fotos nacheinander sind möglich,
   jedes wird einzeln behandelt.
2. **Abholen** — `scanpipe.py` fragt alle 90 Sekunden nach neuen Nachrichten.
   Nur Nachrichten des Besitzers mit Datei-Anhang zählen; Bot- und
   Systemmeldungen werden übergangen.
3. **Aufbereiten** — Die Datei kommt über WebDAV herunter. Bilder werden auf
   1600 Pixel verkleinert und normalisiert, damit das Modell weniger Rauschen
   sieht. Aus PDFs werden die ersten Seiten als Bilder gerendert
   (`pdfSeiten`, Vorgabe 3) und gemeinsam ausgewertet.
4. **Erkennen** — `openclaw agent` mit einem bildfähigen Modell liefert ein
   JSON: Domäne, Dokumenttyp, Absender, Betreff, Datum, Fälligkeit, Betrag,
   Währung, Referenz, Empfänger, Sicherheit, Handlungsbedarf, Volltext.
5. **Einsortieren** — Die Originaldatei wandert nach
   `Documents/scans/<Domäne>/<Jahr>/JJJJ-MM-TT_absender_typ.<endung>`.
   Daneben liegt eine gleichnamige `.json` mit allen erkannten Feldern und dem
   Volltext, damit die Nextcloud-Suche greift.
6. **Melden** — Der Bot antwortet im Chat mit einer Zusammenfassung und dem
   Ablagepfad.
7. **Korrigieren** — Auf diese Antwort mit dem richtigen Domänennamen antworten,
   dann verschiebt die Pipeline Dokument und Beipackzettel.

## Lernwelt: Wortlisten als Übungen

Steht in der Bildunterschrift **«lernwelt»** oder **«lw»**, wird aus dem Foto
eine Übung für die Lerninsel (`/lernwelt/`) statt eines Ablagedokuments. Im
Raum *Lernwelt Andrin* gilt das für jedes Foto, ohne Stichwort.

- **Was geht:** Vokabellisten Englisch oder Französisch mit deutscher
  Bedeutung, sowie deutsche Lernwörter (Rechtschreibung). Mindestens 4 Wörter.
  Englisch landet im Piratenschiff, Französisch im Nebelturm (erst ab der
  5. Klasse offen — eine Französisch-Liste für Joris bleibt unsichtbar, bis er
  so weit ist; der Bericht sagt das), Lernwörter in der Schreiberhütte.
- **Mathe-Blätter** (Arbeitsblatt, Test, Lernzielkontrolle): Das Modell schreibt
  je Aufgabe die Anweisung wörtlich ab und jede Teilaufgabe so, wie sie gedruckt
  ist, dazu die Antwort des Kindes. Das **Thema bestimmt `lernwelt.py` aus dem
  Anweisungstext** (`THEMA_REGELN`): Beim Einordnen verwechselt das Modell
  Aufgabentypen, beim Abschreiben kaum. Die Zahlen liest ebenfalls die Pipeline,
  und sie rechnet die Lösungen selbst. Themen: Teiler, gemeinsame Teiler, ggT,
  kgV, Primzahlen, gleichwertige Brüche, Zähler/Nenner ergänzen, Kürzen,
  Teilbarkeit, Rechnen, Bruchrechnen. Daraus entstehen im Rechenturm
  *nochmals das Blatt* (die Aufgaben vom Blatt) und *ähnliche Aufgaben* (neue
  nach dem Vorbild des Blatts, gleiche Grössenordnung). Themen, bei denen die
  Antwort des Kindes nicht stimmt, kommen dort dreimal so oft dran. Die
  Handschrift wird nicht immer gleich gelesen, darum nennt der Chat keine
  einzelnen Fehler; sie stehen in der `.lernwelt.json`.
- **Mehrere Fotos = ein Blatt:** Fotos derselben Person mit höchstens zwei
  Minuten Abstand gelten als Seiten eines Blatts (bis 6), sortiert nach
  Dateiname. Ist das letzte Foto jünger als 60 Sekunden, wartet der Lauf auf
  weitere Seiten. Abgelegt werden sie als `…_s1.jpg`, `…_s2.jpg` usw.
- **Für wen:** ein Name in der Bildunterschrift («lw andrin»), sonst die
  Vorgabe des Raums, sonst der Name auf dem Blatt, sonst die Klasse auf dem
  Blatt (nächstliegendes Kind), sonst `vorgabeKind`.
- **Übungen:** je Liste zwei Sets. Vokabeln: *wählen* (Bedeutung oder Lücke
  im Beispielsatz) und *selber schreiben*. Lernwörter: *richtig geschrieben?*
  (drei typische Fehlschreibungen) und *selber schreiben* (Lücke oder
  Fehlerwort verbessern). Gebaut werden sie in `static/lernwelt/uebungen.js`
  (`vokabelSets`, `lernwortSets`).
- **Ablage:** Das Foto kommt nach `schule/<Jahr>/JJJJ-MM-TT_lernwelt-<kind>_<titel>`,
  daneben `….lernwelt.json` mit der erkannten Liste. Fotos, die Andrin selbst
  schickt, werden kopiert (sie gehören ihm), eigene verschoben.
- **Nachträglich:** Auf einen normalen Ablagebericht mit «lw» (oder
  «lw andrin») antworten.
- **Korrigieren:** Auf den Lernwelt-Bericht mit «löschen» antworten, dann ist
  die Liste weg (das Foto bleibt). Mit «joris» oder «andrin» wird sie
  umgehängt.

Technik: Die Stammdaten stehen in `~/scanpipe/lernwelt-listen.json`. Daraus
schreibt `lernwelt.py` die Datei `public/lernwelt/eigene/listen.js`
(`window.LERNWELT_LISTEN`), die `uebungen.js` per `document.write` mit
Minutenstempel nachlädt. Der Ordner ist nicht im Repo (`.gitignore`), Hugo
lässt ihn stehen; fehlt `listen.js`, schreibt der nächste Lauf sie neu.

## Räume

Der Raum *Dokumente* (`4cavkg2r`) ist die Ablage: nur Fotos hinein, nur Berichte
heraus. Der Raum *Lernwelt Andrin* (`gr5bir5r`, Mitglieder th und AH) hat
`"modus": "lernwelt"`: jedes Foto wird zur Übung für Andrin, und auch Andrin
selbst darf auslösen (`"absender": ["th", "AH"]`). Sonst zählen nur
Nachrichten des Besitzers. Der openclaw-Agent ist dort **nicht** eingebunden, er kommentiert also
nichts und verbraucht keine Modellaufrufe.

Damit der Bot dort schreiben darf, musste er einmalig für das Gespräch
freigeschaltet werden:

```bash
cd /var/www/nextcloud && sudo -u www-data php8.3 occ talk:bot:setup 3 <token>
```

Weitere Räume lassen sich in `config.json` unter `raeume` ergänzen. Der
Research-Bot-Chat steht dort mit `"aktiv": false`, weil sonst jedes Bild aus
einem Gespräch eingesammelt würde.

## Domänen

`rechnung`, `versicherung`, `bank`, `steuern`, `schule`, `gesundheit`,
`wohnen`, `fahrzeug`, `arbeit`, `vertrag`, `quittung`, `behoerde`, `sonstiges`

Anpassen in `config.json`. Kennt das Modell eine Domäne nicht, landet das
Dokument in `sonstiges`. Ist das Bild gar kein Dokument, bleibt es liegen.

## Dateien auf dem Server

| Pfad | Inhalt |
|---|---|
| `~/scanpipe/scanpipe.py` | die Pipeline |
| `~/scanpipe/lernwelt.py` | Wortlisten für die Lerninsel |
| `~/scanpipe/lernwelt-listen.json` | Stammdaten der Lernwelt-Listen |
| `~/repos/hodelweb/public/lernwelt/eigene/listen.js` | daraus erzeugt, von der Lernwelt geladen |
| `~/scanpipe/config.json` | Raum, Zielordner, Modell, Domänen |
| `~/scanpipe/state.json` | zuletzt verarbeitete Nachricht, Berichtszuordnung |
| `~/scanpipe/scanpipe.log` | Lauf-Protokoll |
| `~/.scanpipe.env` | Nextcloud-Zugang, Rechte 600 |
| `~/.config/systemd/user/scanpipe.{service,timer}` | Zeitsteuerung |

## Betrieb

```bash
systemctl --user status scanpipe.timer
systemctl --user start scanpipe.service     # sofort einmal laufen lassen
journalctl --user -u scanpipe.service -n 50
tail -f ~/scanpipe/scanpipe.log
```

Einen Lauf von Hand:

```bash
cd ~/scanpipe && python3 scanpipe.py
```

Alles noch einmal verarbeiten: `letzteId` in `state.json` heruntersetzen.

Ein Handlauf während eines Timer-Laufs entfällt (Sperre `~/scanpipe/.lauf.lock`).
Ohne Sperre verarbeiteten beide dieselbe Nachricht doppelt und überschrieben
sich `state.json`.

## Voraussetzungen auf dem Server

| Werkzeug | Wofür |
|---|---|
| `convert` (ImageMagick) | Fotos verkleinern und normalisieren |
| `pdftoppm` (poppler-utils) | PDF-Seiten in Bilder rendern |
| `openclaw` | Modellzugriff und Senden im Chat |
| Python 3 mit `requests` | die Pipeline selbst |

Alle vier sind vorhanden. ImageMagick darf auf diesem Server keine PDFs
schreiben (Sicherheitsrichtlinie), lesen muss es sie auch nicht — dafür ist
`pdftoppm` zuständig.

## Modell

`custom-api-qwen/qwen3-vl-plus` über DashScope, angebunden in openclaw. Der
Aufruf läuft über `openclaw agent`, damit die Zugangsdaten im openclaw-Speicher
bleiben und die Pipeline keinen eigenen Modellschlüssel braucht.

Gemini war zuerst vorgesehen, ist aber nicht nutzbar: die Modelle sind in der
openclaw-Konfiguration an die Gemini-CLI-Anmeldung gebunden (OAuth abgelaufen),
und der hinterlegte `GOOGLE_API_KEY` wird mit HTTP 400 abgewiesen.
