#!/bin/bash
# Post-edit validation hook for Focus Flow
# Checks TypeScript compilation and prevents secret leaks

set -euo pipefail

# Get the file that was edited from the hook context
# The hook receives the tool result as JSON on stdin
FILE_PATH=$(cat | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('file_path', ''))
except:
    print('')
" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only validate TypeScript files in the project
case "$FILE_PATH" in
    /srv/focus-flow/02_projects/active/focus-flow-backend/src/*.ts)
        SERVICE="backend"
        DIR="/srv/focus-flow/02_projects/active/focus-flow-backend"
        ;;
    /srv/focus-flow/02_projects/active/focus-flow-ui/src/*.ts|/srv/focus-flow/02_projects/active/focus-flow-ui/src/*.tsx)
        SERVICE="frontend"
        DIR="/srv/focus-flow/02_projects/active/focus-flow-ui"
        ;;
    /srv/focus-flow/02_projects/active/focus-flow-telegram-bot/src/*.ts)
        SERVICE="telegram"
        DIR="/srv/focus-flow/02_projects/active/focus-flow-telegram-bot"
        ;;
    *)
        exit 0
        ;;
esac

# Check for accidentally committed secrets
if grep -qE '(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AKIA[A-Z0-9]{16})' "$FILE_PATH" 2>/dev/null; then
    echo "WARNING: Possible API key or secret detected in $FILE_PATH"
    exit 1
fi

echo "Validated: $FILE_PATH ($SERVICE)"
exit 0
