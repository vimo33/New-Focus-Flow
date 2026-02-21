#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""PreToolUse hook: checks daily budget before allowing Bash commands."""
import json
import sys
import os
from datetime import datetime, timezone

BUDGET_FILE = "/srv/focus-flow/07_system/agent/cost-budget.json"

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    if not os.path.exists(BUDGET_FILE):
        sys.exit(0)

    try:
        with open(BUDGET_FILE) as f:
            budget = json.load(f)

        daily_limit = budget.get("daily_limit_usd", 20)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        daily_spend = budget.get("daily_spend", {}).get(today, 0)

        if daily_spend >= daily_limit:
            print(json.dumps({
                "decision": "block",
                "reason": f"Daily budget exceeded: ${daily_spend:.2f} / ${daily_limit:.2f}. Reset tomorrow or increase limit in {BUDGET_FILE}"
            }))
            sys.exit(2)
    except Exception:
        pass

    sys.exit(0)

if __name__ == "__main__":
    main()
