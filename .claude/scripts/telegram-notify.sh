#!/bin/bash
# Stop hook: Sends Telegram notification with task results
# Also handles explicit alert types: cost_alert, safety_block, validation_fail
# Always exits 0 — skips silently if not configured

REPORTS_DIR="/srv/focus-flow/07_system/reports"
TELEGRAM_ENV="/srv/focus-flow/07_system/secrets/.telegram.env"

# Load credentials
BOT_TOKEN=""
CHAT_ID=""
if [ -f "$TELEGRAM_ENV" ]; then
  while IFS='=' read -r key value; do
    key=$(echo "$key" | tr -d '[:space:]')
    case "$key" in
      TELEGRAM_BOT_TOKEN) BOT_TOKEN="$value" ;;
      TELEGRAM_CHAT_ID) CHAT_ID="$value" ;;
    esac
  done < <(grep -v '^#' "$TELEGRAM_ENV" | grep '=')
fi

if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ] || [ "$BOT_TOKEN" = "placeholder_replace_me" ]; then
  exit 0
fi

# --- Explicit alert type handler ---
# Usage: telegram-notify.sh <type> <message>
# Types: cost_alert, safety_block, validation_fail
if [ -n "$1" ] && [ -n "$2" ]; then
  ALERT_TYPE="$1"
  ALERT_MSG="$2"

  case "$ALERT_TYPE" in
    cost_alert)
      MESSAGE="💰 *Cost Alert*

${ALERT_MSG}"
      ;;
    safety_block)
      MESSAGE="🛡️ *Safety Gate Block*

${ALERT_MSG}"
      ;;
    validation_fail)
      MESSAGE="❌ *Validation Failed*

${ALERT_MSG}"
      ;;
    *)
      MESSAGE="📢 *Nitara Alert* (${ALERT_TYPE})

${ALERT_MSG}"
      ;;
  esac

  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=${MESSAGE}" \
    -d "parse_mode=Markdown" \
    --connect-timeout 5 --max-time 10 > /dev/null 2>&1 || true
  exit 0
fi

# --- Standard report notification (Stop hook) ---
LATEST_REPORT=$(find "$REPORTS_DIR" -maxdepth 1 -name "*.json" -mmin -5 -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_REPORT" ]; then
  exit 0
fi

MESSAGE=$(python3 -c "
import json
try:
    with open('${LATEST_REPORT}') as f:
        data = json.load(f)
    task_type = data.get('task_type', 'unknown')
    status = data.get('status', 'unknown')
    icons = {'completed':'✅','success':'✅','failed':'❌','error':'❌','partial':'⚠️'}
    icon = icons.get(status.lower(), '📋')
    lines = [f'{icon} *Nitara Task Report*', '', f'*Task:* \`{task_type}\`', f'*Status:* {status}']
    # Include satisfaction score if present
    score = data.get('satisfaction_score')
    if score is not None:
        lines.append(f'*Satisfaction:* {score:.2f}')
    summary = data.get('summary', data.get('findings_summary', ''))
    if summary:
        lines.extend(['', '*Summary:*', summary[:500]])
    print('\n'.join(lines))
except Exception as e:
    print(f'📋 Nitara completed a task.')
" 2>/dev/null || echo "📋 Nitara completed a task.")

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "text=${MESSAGE}" \
  -d "parse_mode=Markdown" \
  --connect-timeout 5 --max-time 10 > /dev/null 2>&1 || true

exit 0
