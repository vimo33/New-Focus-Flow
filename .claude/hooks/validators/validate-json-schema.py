#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Generic JSON schema validator. Validates JSON files are well-formed."""
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if not file_path.endswith(".json"):
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        json.loads(content)
    except (json.JSONDecodeError, TypeError):
        print(json.dumps({"decision": "block", "reason": f"Invalid JSON in {file_path}"}))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
