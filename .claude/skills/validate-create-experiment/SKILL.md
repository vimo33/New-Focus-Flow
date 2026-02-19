---
name: validate-create-experiment
description: Create an experiment with metric definition, success rule, and decision rule
model: sonnet
context: fork
allowed-tools: Read, Write, Glob
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-experiment.py"
          timeout: 10
---

# /validate-create-experiment

Design a structured experiment to test a specific hypothesis.

## Arguments
- `hypothesis_id` — which hypothesis to test
- `project_id` — parent project

## Process
1. Read the hypothesis statement and type
2. Design the cheapest, fastest experiment to validate/invalidate
3. Define clear success criteria
4. Set decision rules for each outcome

## Experiment Design
- `metric_name` — What are we measuring? (e.g., "signup_rate", "willingness_to_pay")
- `metric_definition` — Precise definition of how to measure
- `success_rule` — Threshold for success (e.g., ">5% conversion in 7 days")
- `decision_rule` — What action to take based on outcome:
  - If success → scale or create next experiment
  - If failure → pivot hypothesis or kill
- `estimated_duration` — How long to run
- `required_sample_size` — Minimum data points needed
- `estimated_cost` — Budget needed

## Output

Write experiment JSON:
```json
{
  "id": "exp-{timestamp}",
  "project_id": "",
  "hypothesis_id": "",
  "metric_name": "",
  "metric_definition": "",
  "success_rule": "",
  "decision_rule": {
    "on_success": "",
    "on_failure": ""
  },
  "status": "draft",
  "estimated_duration": "",
  "required_sample_size": 0,
  "estimated_cost_usd": 0,
  "created_at": "ISO-8601"
}
```
