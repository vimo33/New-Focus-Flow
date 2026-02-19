#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates idea JSON has required fields: name, problem_statement, icp, constraints."""
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "idea" not in file_path:
        sys.exit(0)
    if not file_path.endswith(".json"):
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    errors = []
    if not data.get("name") or not isinstance(data["name"], str) or len(data["name"].strip()) == 0:
        errors.append("Missing or empty 'name' field")
    if not data.get("problem_statement") or len(str(data["problem_statement"]).strip()) == 0:
        errors.append("Missing or empty 'problem_statement' field")
    if "icp" not in data:
        errors.append("Missing 'icp' field")
    if "constraints" not in data:
        errors.append("Missing 'constraints' field")

    if errors:
        print(json.dumps({"decision": "block", "reason": "Idea schema validation failed:\n" + "\n".join(errors)}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
