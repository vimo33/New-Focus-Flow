---
name: validate-measure-experiment
description: Collect and analyze experiment results against success criteria
model: sonnet
context: fork
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch
hooks:
  Stop:
    - hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-experiment-results.py"
          timeout: 10
---

# /validate-measure-experiment

Collect data and analyze experiment results against defined success criteria.

## Arguments
- `experiment_id` — which experiment to measure

## Process
1. Read experiment definition (metric, success rule, sample size)
2. Collect available data (web analytics, survey results, sign-ups, etc.)
3. Compute statistical measures
4. Compare against success rule
5. Flag if "Decision Required"

## Results Structure
- `baseline` — Control/before metric value
- `variant` — Treatment/after metric value
- `lift` — Percentage change
- `p_value` — Statistical significance (if applicable)
- `sample_size` — Actual data points collected
- `confidence_interval` — [lower, upper] bounds
- `meets_success_rule` — boolean
- `decision_required` — boolean (true if results are conclusive)

## Output

Update experiment results JSON and flag status:
```json
{
  "experiment_id": "",
  "results": {
    "baseline": 0,
    "variant": 0,
    "lift": 0,
    "p_value": null,
    "sample_size": 0,
    "confidence_interval": [0, 0],
    "meets_success_rule": false,
    "decision_required": true
  },
  "analysis_notes": "",
  "measured_at": "ISO-8601"
}
```
