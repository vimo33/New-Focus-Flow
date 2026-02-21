#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates decision has action, rationale (50+ chars), evidence, confidence, counterarguments."""
import json
import sys

VALID_ACTIONS = ["scale", "iterate", "pivot", "park", "kill"]

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "decision" not in file_path.lower() and "dec-" not in file_path:
        sys.exit(0)
    if not file_path.endswith(".json"):
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    errors = []
    action = data.get("action", "")
    if action not in VALID_ACTIONS:
        errors.append(f"Invalid action '{action}'. Must be one of: {VALID_ACTIONS}")

    rationale = data.get("rationale", "")
    if len(str(rationale)) < 50:
        errors.append(f"Rationale too short ({len(str(rationale))} chars, minimum 50)")

    evidence = data.get("evidence_sources", data.get("evidence_json", []))
    if not isinstance(evidence, list) or len(evidence) < 1:
        errors.append("Must have at least 1 evidence source")

    conf = data.get("confidence")
    if conf is not None and (not isinstance(conf, (int, float)) or conf < 0 or conf > 1):
        errors.append(f"Confidence must be 0-1, got {conf}")

    counterargs = data.get("counterarguments", data.get("counterarguments_json", []))
    if not isinstance(counterargs, list) or len(counterargs) < 1:
        errors.append("Must have at least 1 counterargument")

    if errors:
        print(json.dumps({"decision": "block", "reason": "Decision validation failed:\n" + "\n".join(errors)}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
