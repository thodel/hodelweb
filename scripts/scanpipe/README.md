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
   sieht. PDFs liefern die erste Seite als Bild.
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

## Räume

Der Raum *Dokumente* (`4cavkg2r`) ist die Ablage: nur Fotos hinein, nur Berichte
heraus. Der openclaw-Agent ist dort **nicht** eingebunden, er kommentiert also
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

## Modell

`custom-api-qwen/qwen3-vl-plus` über DashScope, angebunden in openclaw. Der
Aufruf läuft über `openclaw agent`, damit die Zugangsdaten im openclaw-Speicher
bleiben und die Pipeline keinen eigenen Modellschlüssel braucht.

Gemini war zuerst vorgesehen, ist aber nicht nutzbar: die Modelle sind in der
openclaw-Konfiguration an die Gemini-CLI-Anmeldung gebunden (OAuth abgelaufen),
und der hinterlegte `GOOGLE_API_KEY` wird mit HTTP 400 abgewiesen.
