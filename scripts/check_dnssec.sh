#!/bin/bash
# Check if DNSSEC issue is resolved, then switch Caddy to HTTPS
RESULT=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" "https://dns.google/resolve?name=hodelweb.ch&type=A" | head -1)
RESPONSE=$(curl -s --max-time 5 "https://dns.google/resolve?name=hodelweb.ch&type=A")
# Check if DNS resolution works (Status 0 = NOERROR)
STATUS=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('Status',99))" 2>/dev/null)

if [ "$STATUS" = "0" ]; then
    echo "$(date): DNSSEC resolved! Switching to HTTPS..."
    sudo tee /etc/caddy/Caddyfile > /dev/null << 'CADDYEOF'
hodelweb.ch, www.hodelweb.ch {
    root * /home/th/repos/hodelweb/public
    file_server
    encode gzip
}
CADDYEOF
    sudo systemctl restart caddy
    # Remove cron job
    crontab -l | grep -v check_dnssec | crontab -
    echo "Done — HTTPS enabled."
else
    echo "$(date): DNSSEC still broken (status=$STATUS). Waiting..."
fi
