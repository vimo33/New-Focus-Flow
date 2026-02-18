#!/usr/bin/env bash
# event-escalation.sh — Stop hook for event-detect skill
# Reads the generated event report and escalates urgent events via Telegram and voice.

set -euo pipefail

REPORTS_DIR="/srv/focus-flow/07_system/reports"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Find the most recent event-detect report from today
TODAY=$(date +%Y-%m-%d)
REPORT=$(ls -t "$REPORTS_DIR"/event-detect-"$TODAY"*.json 2>/dev/null | head -1 || true)

if [[ -z "$REPORT" ]]; then
    # No event report generated today, nothing to escalate
    exit 0
fi

# Extract urgent events (this-week urgency)
URGENT_COUNT=$(python3 -c "
import json, sys
try:
    with open('$REPORT') as f:
        data = json.load(f)
    urgent = [e for e in data.get('events', []) if e.get('urgency') == 'this-week']
    print(len(urgent))
except:
    print(0)
" 2>/dev/null || echo "0")

if [[ "$URGENT_COUNT" == "0" ]]; then
    exit 0
fi

# Build alert message from urgent events
ALERT_MSG=$(python3 -c "
import json
with open('$REPORT') as f:
    data = json.load(f)
urgent = [e for e in data.get('events', []) if e.get('urgency') == 'this-week']
lines = []
for e in urgent[:5]:
    lines.append(f\"• {e.get('title', 'Event')}: {e.get('description', '')[:100]}\")
print('\n'.join(lines))
" 2>/dev/null || echo "Urgent events detected")

# Send Telegram alert
if [[ -x "$SCRIPT_DIR/telegram-notify.sh" ]]; then
    echo "$ALERT_MSG" | "$SCRIPT_DIR/telegram-notify.sh" "event_alert" "⚡ ${URGENT_COUNT} urgent event(s) detected:
${ALERT_MSG}" 2>/dev/null || true
fi

# For critical events (3+ urgent), consider voice call
if [[ "$URGENT_COUNT" -ge 3 ]]; then
    # Check if voice calls are available
    VOICE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/voice/status 2>/dev/null || echo "000")
    if [[ "$VOICE_STATUS" == "200" ]]; then
        curl -s -X POST http://localhost:3001/api/voice/call \
            -H "Content-Type: application/json" \
            -d "{\"persona\": \"nitara-main\", \"reason\": \"critical_events: ${URGENT_COUNT} urgent events detected\", \"priority\": \"high\"}" \
            2>/dev/null || true
    fi
fi

echo "[EventEscalation] Escalated ${URGENT_COUNT} urgent event(s)" >&2
exit 0
