#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates playbook has title, context, steps, success_metrics, failure_modes."""
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "playbook" not in file_path.lower():
        sys.exit(0)
    if not file_path.endswith(".json"):
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    errors = []
    if not data.get("title"):
        errors.append("Missing 'title'")
    if not data.get("context"):
        errors.append("Missing 'context'")
    steps = data.get("steps", data.get("steps_json", []))
    if not isinstance(steps, list) or len(steps) < 1:
        errors.append("Must have at least 1 step")
    metrics = data.get("success_metrics", data.get("success_metrics_json", []))
    if not isinstance(metrics, list) or len(metrics) < 1:
        errors.append("Must have at least 1 success metric")
    failures = data.get("failure_modes", data.get("failure_modes_json", []))
    if not isinstance(failures, list) or len(failures) < 1:
        errors.append("Must have at least 1 failure mode")

    if errors:
        print(json.dumps({"decision": "block", "reason": "Playbook validation failed:\n" + "\n".join(errors)}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
