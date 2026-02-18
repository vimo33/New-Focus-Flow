#!/bin/bash
# PostToolUse hook (Bash): Tracks tool invocations for cost estimation
# Appends entry to daily JSONL log. Always exits 0 (informational only).

DATE=$(date -u +%Y-%m-%d)
LOG_DIR="/srv/focus-flow/07_system/logs/claude-code"
LOG_FILE="${LOG_DIR}/${DATE}.jsonl"

mkdir -p "$LOG_DIR" 2>/dev/null || true

# Read tool name from stdin JSON
TOOL_NAME=$(cat | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_name', data.get('tool', 'unknown')))
except:
    print('unknown')
" 2>/dev/null || echo "unknown")

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "{\"tool_name\":\"${TOOL_NAME}\",\"timestamp\":\"${TIMESTAMP}\",\"session_type\":\"autonomous\"}" >> "$LOG_FILE" 2>/dev/null || true

exit 0
