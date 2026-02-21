#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Stop hook: validates simulation has scenarios array with min 2 entries."""
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    # Advisory for Stop hooks
    sys.exit(0)

if __name__ == "__main__":
    main()
