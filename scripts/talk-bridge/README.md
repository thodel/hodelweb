# talk-bridge

Hermes Agent hat keinen Nextcloud-Talk-Kanal. Die Brücke übernimmt den
Webhook des bestehenden Talk-Bots (Bot 3, «OpenClaw», URL
`http://127.0.0.1:8788/nextcloud-talk-webhook`) und spricht mit dem
API-Server von Hermes.

## Ablauf

1. Talk schickt jede Nachricht der Räume, in denen der Bot sitzt, signiert an
   die Brücke (HMAC-SHA256 über `random + body`). Falsche Signatur → 401.
2. Die Brücke quittiert sofort und prüft `config.json`: nur Räume unter
   `rooms`, nur Akteure aus `allow`; mit `"mode": "mention"` nur Nachrichten,
   die mit einem der `triggers` beginnen. Bots und Systemmeldungen fallen weg.
3. 👀 an der Nachricht, dann `POST /v1/responses` an Hermes mit
   `conversation = talk-<raum>-<n>` — Hermes führt den Verlauf selbst.
   `/neu` zählt `n` hoch und beginnt eine frische Unterhaltung.
4. Die Antwort geht als Bot zurück (`replyTo` = Ursprungsnachricht), lange
   Antworten in Teilen à 30 000 Zeichen. Hermes nicht erreichbar oder zu
   langsam (`HERMES_TIMEOUT`, Vorgabe 900 s) → kurze Meldung im Raum.

Skripte posten mit `talk_bridge.py send --room <token> --message <text>
[--reply-to <id>]` als derselbe Bot; scanpipe tut das, sobald in seiner
`config.json` `"talkBridge": "~/talk-bridge/talk_bridge.py"` steht.

Werkzeuge, die in Hermes auf eine Freigabe warten, blockieren die Antwort bis
zur Zeitüberschreitung — die Brücke kann keine Freigaben erteilen.

## Räume des Bots (Stand 29.10.2026)

| Token | Raum | Brücke |
|---|---|---|
| `jgf7ptuf` | Tobias ↔ nc-bot | antwortet (`users/th`) |
| `4cavkg2r` | Dokumente | nein — scanpipe |
| `gr5bir5r` | Lernwelt (A) | nein — scanpipe |
| `ahgtxrb2` | A ↔ nc-bot | nein (openclaw antwortete dort auch nicht) |

## Einrichten

```bash
mkdir -p ~/talk-bridge && cp talk_bridge.py config.json ~/talk-bridge/
install -m 600 talk-bridge.env.example ~/.talk-bridge.env   # Werte eintragen;
# TALK_BOT_SECRET = oc_talk_bots_server.secret (id 3) — in openclaw.json steht nur ein Verweis
cp talk-bridge.service ~/.config/systemd/user/ && systemctl --user daemon-reload
# erst nach dem Abschalten von openclaw (gleicher Port 8788):
systemctl --user enable --now talk-bridge
```

Tests: `python3 -m unittest -v test_talk_bridge` (Talk und Hermes als lokale
Attrappen, die Signaturen und das Responses-Format wie die echten Dienste
prüfen).
