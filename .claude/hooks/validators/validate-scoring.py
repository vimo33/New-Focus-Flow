#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Validates project scoring output has all 6 dimensions, valid ranges, and recommendation."""
import json
import sys

REQUIRED_DIMENSIONS = [
    "revenue_proximity", "market_validation", "skill_alignment",
    "effort_to_revenue", "strategic_fit", "network_leverage"
]
VALID_RECOMMENDATIONS = ["build-next", "invest", "pivot", "park", "kill"]

def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = hook_input.get("tool_input", {})
    file_path = tool_input.get("file_path", "")

    if "scoring" not in file_path and "portfolio-analysis" not in file_path:
        sys.exit(0)

    content = tool_input.get("content", "")
    try:
        data = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        sys.exit(0)

    # Check if this is a single scoring or portfolio with projects array
    projects = data.get("projects", [data] if "scores" in data else [])

    errors = []
    for i, project in enumerate(projects):
        scores = project.get("scores", {})
        prefix = f"Project {i}: " if len(projects) > 1 else ""

        for dim in REQUIRED_DIMENSIONS:
            if dim not in scores:
                errors.append(f"{prefix}Missing score dimension: {dim}")
            elif not isinstance(scores[dim], (int, float)) or scores[dim] < 0 or scores[dim] > 10:
                errors.append(f"{prefix}{dim} must be 0-10, got {scores[dim]}")

        if "composite_score" not in project:
            errors.append(f"{prefix}Missing composite_score")

        rec = project.get("recommendation", "")
        if rec not in VALID_RECOMMENDATIONS:
            errors.append(f"{prefix}Invalid recommendation '{rec}'. Must be one of: {VALID_RECOMMENDATIONS}")

    if errors:
        result = {"decision": "block", "reason": "Scoring validation failed:\n" + "\n".join(errors)}
        print(json.dumps(result))
        sys.exit(2)

    sys.exit(0)

if __name__ == "__main__":
    main()
