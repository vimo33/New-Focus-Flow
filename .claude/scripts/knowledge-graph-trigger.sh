#!/usr/bin/env bash
# knowledge-graph-trigger.sh — PostToolUse hook for Write/Edit
# When a report is written to 07_system/reports/, enqueue a knowledge-graph-update task.
# This ensures the knowledge graph stays current with every new report.

set -euo pipefail

INPUT=$(cat)

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    path = data.get('tool_input', {}).get('file_path', '')
    print(path)
except:
    print('')
" 2>/dev/null || echo "")

# Only trigger for report files in 07_system/reports/
if [[ "$FILE_PATH" != *"07_system/reports/"* ]]; then
    exit 0
fi

# Don't trigger for knowledge-graph-update reports (avoid recursion)
if [[ "$FILE_PATH" == *"knowledge-graph-update"* ]]; then
    exit 0
fi

# Don't trigger for scenario history files
if [[ "$FILE_PATH" == *"scenarios/history"* ]]; then
    exit 0
fi

# Check kill switch
if [[ -f "/srv/focus-flow/07_system/agent/KILL_SWITCH" ]]; then
    exit 0
fi

# Rate limit: at most once per hour
MARKER="/tmp/kg-trigger-$(date +%Y%m%d%H).sent"
if [[ -f "$MARKER" ]]; then
    exit 0
fi

# Check if there's already a pending kg-update task
QUEUE_DIR="/srv/focus-flow/07_system/agent/queue"
if ls "$QUEUE_DIR"/task-*.json 2>/dev/null | head -1 | grep -q .; then
    EXISTING=$(grep -l '"knowledge-graph-update"' "$QUEUE_DIR"/task-*.json 2>/dev/null | head -1 || true)
    if [[ -n "$EXISTING" ]]; then
        exit 0
    fi
fi

# Enqueue the knowledge-graph-update task
TASK_ID="task-$(date +%Y%m%d)-$(date +%s | tail -c 7)"
TASK_FILE="$QUEUE_DIR/$TASK_ID.json"

cat > "$TASK_FILE" <<EOF
{
  "id": "$TASK_ID",
  "skill": "knowledge-graph-update",
  "arguments": "",
  "priority": "background",
  "trust_tier": 1,
  "status": "queued",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source": "knowledge-graph-trigger"
}
EOF

touch "$MARKER"
echo "[KG-Trigger] Enqueued knowledge-graph-update: $TASK_ID" >&2
exit 0
