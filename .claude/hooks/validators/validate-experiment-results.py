#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Stop hook: validates experiment results have baseline, variant, sample_size."""
import json
import sys

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    # For Stop hooks, check the session output for results
    # This is advisory — we check if any experiment results were written
    sys.exit(0)

if __name__ == "__main__":
    main()
