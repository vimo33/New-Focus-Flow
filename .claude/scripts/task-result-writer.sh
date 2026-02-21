#!/bin/bash
# Stop hook: Posts completed task reports to backend queue API
# Always exits 0 — warns but never blocks

REPORTS_DIR="/srv/focus-flow/07_system/reports"
API_URL="http://localhost:3001/api/queue/complete"
TOKEN_FILE="/srv/focus-flow/07_system/secrets/.queue-api-token"

LATEST_REPORT=$(find "$REPORTS_DIR" -maxdepth 1 -name "*.json" -mmin -5 -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_REPORT" ]; then
  exit 0
fi

VALID=$(python3 -c "
import json
try:
    with open('${LATEST_REPORT}') as f:
        data = json.load(f)
    if 'task_type' in data and 'status' in data:
        print('valid')
    else:
        print('invalid')
except:
    print('error')
" 2>/dev/null || echo "error")

if [ "$VALID" != "valid" ]; then
  echo "task-result-writer: Report ${LATEST_REPORT} invalid (${VALID}), skipping."
  exit 0
fi

# Read auth token
AUTH_HEADER=""
if [ -f "$TOKEN_FILE" ]; then
  TOKEN=$(cat "$TOKEN_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer ${TOKEN}"
  fi
fi

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  ${AUTH_HEADER:+-H "$AUTH_HEADER"} \
  -d @"$LATEST_REPORT" \
  --connect-timeout 5 \
  --max-time 10 \
  2>/dev/null || echo "000")

if [ "$HTTP_STATUS" -ge 200 ] 2>/dev/null && [ "$HTTP_STATUS" -lt 300 ] 2>/dev/null; then
  echo "task-result-writer: Posted report (HTTP ${HTTP_STATUS})"
else
  echo "task-result-writer: Warning — failed to post report (HTTP ${HTTP_STATUS})"
fi

exit 0
