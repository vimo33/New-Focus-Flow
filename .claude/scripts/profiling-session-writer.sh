#!/bin/bash
# profiling-session-writer.sh — Post-processing hook for voice profiling sessions.
# Called after a profiling session ends to persist extracted data.
# Usage: profiling-session-writer.sh <session-id>
#
# Reads the voice session record, checks if profiling data was updated,
# and triggers a profiling checklist refresh if completeness improved.

set -euo pipefail

SESSION_ID="${1:-}"
SESSIONS_DIR="/srv/focus-flow/07_system/agent/voice-sessions"
CHECKLIST="/srv/focus-flow/07_system/agent/profiling-checklist.json"
LOG_PREFIX="[ProfilingWriter]"

if [ -z "$SESSION_ID" ]; then
    echo "$LOG_PREFIX No session ID provided"
    exit 1
fi

SESSION_FILE="$SESSIONS_DIR/$SESSION_ID.json"
if [ ! -f "$SESSION_FILE" ]; then
    echo "$LOG_PREFIX Session file not found: $SESSION_FILE"
    exit 1
fi

# Read current profiling completeness
if [ -f "$CHECKLIST" ]; then
    COMPLETENESS=$(python3 -c "
import json, sys
with open('$CHECKLIST') as f:
    data = json.load(f)
print(data.get('overall_completeness', 0))
" 2>/dev/null || echo "0")
else
    COMPLETENESS=0
fi

echo "$LOG_PREFIX Session $SESSION_ID processed. Current profiling completeness: ${COMPLETENESS}%"

# If completeness crossed 80%, send celebration notification
if [ "$COMPLETENESS" -ge 80 ]; then
    NOTIFY_SCRIPT="/srv/focus-flow/.claude/scripts/telegram-notify.sh"
    if [ -x "$NOTIFY_SCRIPT" ]; then
        MARKER="/tmp/profiling-80-notified"
        if [ ! -f "$MARKER" ]; then
            "$NOTIFY_SCRIPT" "cost_alert" "Profiling completeness reached ${COMPLETENESS}%! Voice profiling target achieved."
            touch "$MARKER"
        fi
    fi
fi

exit 0
