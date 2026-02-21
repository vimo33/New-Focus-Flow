#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates hypothesis has statement, type, confidence 0-1, evidence_refs array."""
import json
import sys

VALID_TYPES = ["problem", "solution", "channel", "pricing", "moat"]

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "hypothes" not in file_path.lower():
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    hypotheses = data.get("hypotheses", [data] if "statement" in data else [])
    errors = []

    for i, h in enumerate(hypotheses):
        prefix = f"Hypothesis {i}: "
        if not h.get("statement") or len(str(h["statement"]).strip()) < 10:
            errors.append(f"{prefix}Missing or too short 'statement'")
        if h.get("type") not in VALID_TYPES:
            errors.append(f"{prefix}Invalid type '{h.get('type')}'. Must be one of: {VALID_TYPES}")
        conf = h.get("confidence")
        if conf is not None and (not isinstance(conf, (int, float)) or conf < 0 or conf > 1):
            errors.append(f"{prefix}Confidence must be 0-1, got {conf}")
        if not isinstance(h.get("evidence_refs", []), list):
            errors.append(f"{prefix}'evidence_refs' must be an array")

    if errors:
        print(json.dumps({"decision": "block", "reason": "Hypothesis validation failed:\n" + "\n".join(errors)}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
