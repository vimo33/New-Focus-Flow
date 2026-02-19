#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates build spec has components array and acceptance_criteria array."""
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "spec" not in file_path.lower() and "build-spec" not in file_path:
        sys.exit(0)
    if not file_path.endswith(".json"):
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    errors = []
    components = data.get("components", [])
    if not isinstance(components, list) or len(components) < 1:
        errors.append("Must have at least 1 component")

    criteria = data.get("acceptance_criteria", [])
    if not isinstance(criteria, list) or len(criteria) < 1:
        errors.append("Must have at least 1 acceptance criterion")

    if errors:
        print(json.dumps({"decision": "block", "reason": "Build spec validation failed:\n" + "\n".join(errors)}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
