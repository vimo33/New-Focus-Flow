#!/bin/bash
# PreToolUse hook (Write|Edit|Bash): Safety gate for Nitara autonomous agent
# Implements kill switch, circuit breaker, and loop detection
# Exit 2 = block, Exit 0 = allow

AGENT_DIR="/srv/focus-flow/07_system/agent"
KILL_SWITCH="${AGENT_DIR}/KILL_SWITCH"
CIRCUIT_BREAKER="${AGENT_DIR}/circuit-breaker.json"
LOOP_DIR="${AGENT_DIR}/loop-detection"

# --- Kill Switch ---
if [ -f "$KILL_SWITCH" ]; then
  echo "SAFETY GATE: Kill switch is active. All Nitara operations blocked. Remove ${KILL_SWITCH} to resume."
  exit 2
fi

# --- Circuit Breaker ---
if [ -f "$CIRCUIT_BREAKER" ]; then
  CB_RESULT=$(python3 -c "
import json, sys
from datetime import datetime, timedelta, timezone
try:
    with open('${CIRCUIT_BREAKER}') as f:
        data = json.load(f)
    count = int(data.get('consecutive_failures', 0))
    last = data.get('last_failure_at', '')
    if count >= 3 and last:
        ts = datetime.fromisoformat(last.replace('Z', '+00:00'))
        if (datetime.now(timezone.utc) - ts) < timedelta(minutes=10):
            print('blocked')
            sys.exit(0)
    print('ok')
except:
    print('ok')
" 2>/dev/null || echo "ok")

  if [ "$CB_RESULT" = "blocked" ]; then
    echo "SAFETY GATE: Circuit breaker tripped (3+ consecutive failures in 10 min). Nitara is pausing."
    exit 2
  fi
fi

# --- Loop Detection ---
INPUT=$(cat 2>/dev/null || echo "{}")
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('file_path', data.get('filePath', data.get('path', ''))))
except:
    print('')
" 2>/dev/null || echo "")

if [ -n "$FILE_PATH" ]; then
  mkdir -p "$LOOP_DIR" 2>/dev/null || true
  TRACK_FILE="${LOOP_DIR}/$(echo "$FILE_PATH" | md5sum | cut -d' ' -f1).log"
  NOW_EPOCH=$(date +%s)
  echo "$NOW_EPOCH" >> "$TRACK_FILE" 2>/dev/null || true

  CUTOFF=$((NOW_EPOCH - 300))
  RECENT=$(python3 -c "
count = 0
try:
    with open('${TRACK_FILE}') as f:
        for line in f:
            try:
                if int(line.strip()) >= ${CUTOFF}: count += 1
            except: continue
except: pass
print(count)
" 2>/dev/null || echo 0)

  if [ "$RECENT" -gt 5 ]; then
    echo "SAFETY GATE: Loop detected — ${FILE_PATH} edited ${RECENT} times in 5 min. Nitara is pausing."
    exit 2
  fi
fi

exit 0
