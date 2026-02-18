#!/bin/bash
# PreToolUse hook (Bash): Cost gate for Nitara autonomous agent
# Blocks operations if daily budget thresholds are exceeded
# Exit 2 = block, Exit 0 = allow

set -euo pipefail

BUDGET_FILE="/srv/focus-flow/07_system/agent/cost-budget.json"
DATE=$(date -u +%Y-%m-%d)
TOOL_LOG="/srv/focus-flow/07_system/logs/claude-code/${DATE}.jsonl"
API_LOG="/srv/focus-flow/07_system/logs/inference/${DATE}.jsonl"

# Read budget config (defaults if file missing)
MAX_TOOL_CALLS=500
MAX_API_COST=20
ALERT_THRESHOLD_PCT=80

if [ -f "$BUDGET_FILE" ]; then
  eval "$(python3 -c "
import json
try:
    with open('$BUDGET_FILE') as f:
        b = json.load(f)
    print(f'MAX_TOOL_CALLS={b.get(\"max_daily_tool_calls\", 500)}')
    print(f'MAX_API_COST={b.get(\"max_daily_api_cost_usd\", 20)}')
    print(f'ALERT_THRESHOLD_PCT={b.get(\"alert_threshold_pct\", 80)}')
except:
    print('MAX_TOOL_CALLS=500')
    print('MAX_API_COST=20')
    print('ALERT_THRESHOLD_PCT=80')
" 2>/dev/null || echo "MAX_TOOL_CALLS=500
MAX_API_COST=20
ALERT_THRESHOLD_PCT=80")"
fi

# Primary: count tool invocations from Claude Code logs
TOOL_COUNT=0
if [ -f "$TOOL_LOG" ]; then
  TOOL_COUNT=$(wc -l < "$TOOL_LOG" 2>/dev/null || echo 0)
fi

if [ "$TOOL_COUNT" -ge "$MAX_TOOL_CALLS" ]; then
  echo "COST GATE: Daily tool call limit reached (${TOOL_COUNT}/${MAX_TOOL_CALLS}). Nitara is pausing to stay within budget."
  exit 2
fi

# Secondary: sum estimated_cost_usd from inference logs
API_COST="0"
if [ -f "$API_LOG" ]; then
  API_COST=$(python3 -c "
import json
total = 0.0
try:
    with open('$API_LOG') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                total += float(json.loads(line).get('estimated_cost_usd', 0))
            except: continue
except: pass
print(f'{total:.4f}')
" 2>/dev/null || echo "0")
fi

OVER=$(python3 -c "print(1 if float('${API_COST}') >= float('${MAX_API_COST}') else 0)" 2>/dev/null || echo 0)
if [ "$OVER" -eq 1 ]; then
  echo "COST GATE: Daily API cost limit reached (\$${API_COST}/\$${MAX_API_COST}). Nitara is pausing."
  exit 2
fi

# Threshold alerting: send once-per-day Telegram alert at 80% (or configured %)
ALERT_MARKER="/tmp/cost-alert-${DATE}.sent"
if [ ! -f "$ALERT_MARKER" ]; then
  THRESHOLD_COST=$(python3 -c "print(f'{float(${MAX_API_COST}) * float(${ALERT_THRESHOLD_PCT}) / 100:.2f}')" 2>/dev/null || echo "16")
  AT_THRESHOLD=$(python3 -c "print(1 if float('${API_COST}') >= float('${THRESHOLD_COST}') else 0)" 2>/dev/null || echo 0)

  if [ "$AT_THRESHOLD" -eq 1 ]; then
    touch "$ALERT_MARKER"
    /srv/focus-flow/.claude/scripts/telegram-notify.sh cost_alert "Daily spend \$${API_COST} has reached ${ALERT_THRESHOLD_PCT}% of \$${MAX_API_COST} budget" 2>/dev/null &
  fi
fi

exit 0
