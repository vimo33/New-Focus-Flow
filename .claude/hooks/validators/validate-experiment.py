#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates experiment has metric_name, success_rule, valid status."""
import json
import sys

VALID_STATUSES = ["draft", "running", "paused", "completed"]

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "experiment" not in file_path.lower() and "exp-" not in file_path:
        sys.exit(0)
    if not file_path.endswith(".json"):
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    errors = []
    if not data.get("metric_name"):
        errors.append("Missing 'metric_name'")
    if not data.get("success_rule"):
        errors.append("Missing 'success_rule'")
    status = data.get("status", "draft")
    if status not in VALID_STATUSES:
        errors.append(f"Invalid status '{status}'. Must be one of: {VALID_STATUSES}")

    if errors:
        print(json.dumps({"decision": "block", "reason": "Experiment validation failed:\n" + "\n".join(errors)}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
