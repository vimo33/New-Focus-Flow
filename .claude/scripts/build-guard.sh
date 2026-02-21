#!/bin/bash
# PreToolUse hook (Bash, scoped to build-mvp): 2-hour session timeout
# Exit 2 = block (exceeded), Exit 0 = allow

SESSION_FILE="/srv/focus-flow/07_system/agent/build-session.json"
MAX_SECONDS=7200

if [ ! -f "$SESSION_FILE" ]; then
  python3 -c "
import json
from datetime import datetime, timezone
session = {
    'started_at': datetime.now(timezone.utc).isoformat(),
    'started_epoch': int(datetime.now(timezone.utc).timestamp()),
    'max_duration_seconds': ${MAX_SECONDS}
}
with open('${SESSION_FILE}', 'w') as f:
    json.dump(session, f, indent=2)
print('build-guard: Session started. Nitara has 2 hours.')
" 2>/dev/null || echo "build-guard: Session started."
  exit 0
fi

RESULT=$(python3 -c "
import json
from datetime import datetime, timezone
try:
    with open('${SESSION_FILE}') as f:
        s = json.load(f)
    elapsed = int(datetime.now(timezone.utc).timestamp()) - s.get('started_epoch', 0)
    if elapsed >= ${MAX_SECONDS}:
        print(f'block:{elapsed // 3600}h{(elapsed % 3600) // 60}m')
    else:
        r = ${MAX_SECONDS} - elapsed
        print(f'allow:{r // 3600}h{(r % 3600) // 60}m remaining')
except:
    print('allow')
" 2>/dev/null || echo "allow")

case "$RESULT" in
  block:*)
    echo "BUILD GUARD: Session exceeded 2 hours (${RESULT#block:}). Nitara must wrap up."
    exit 2 ;;
  *)
    exit 0 ;;
esac
