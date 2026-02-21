---
name: validate-execute-experiment
description: Execute experiment plan steps. Reads experiment + plan, generates deliverables for applicable steps, writes results back via API. Use when an experiment has a plan and needs execution assistance.
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
user-invocable: true
---

# /validate-execute-experiment

Execute steps of an experiment plan by generating deliverables and recording results.

## Arguments

`$ARGUMENTS` — experiment ID or project name

## Context Loading

1. Read the experiment: `GET http://localhost:3001/api/experiments/$ARGUMENTS`
2. Read the plan: `GET http://localhost:3001/api/validation/experiment-plans/$ARGUMENTS`
3. Read the project context from vault: `/srv/focus-flow/02_projects/active/`
4. Load founder profile: `/srv/focus-flow/10_profile/founder-profile.json`

## Workflow

1. **Identify actionable steps** — find steps with status `pending` that can be automated
2. **For each step, generate deliverables** based on `tool_or_action`:
   - `research` → Web research synthesis document
   - `document` → Interview script, survey questions, or analysis template
   - `create` → Ad copy, landing page copy, outreach messages
   - `analysis` → Data synthesis and recommendation
   - `decide` → Decision framework with evidence summary
3. **Write deliverables** to `07_system/reports/experiment-{id}-step-{order}.md`
4. **Record step completion** via API: `PATCH http://localhost:3001/api/validation/experiment-steps/{stepId}` with `{ "result": "summary of what was done" }`

## Output

Write a JSON report to stdout:
```json
{
  "task_type": "experiment-execution",
  "status": "completed",
  "experiment_id": "...",
  "steps_executed": 3,
  "deliverables_created": ["path1", "path2"],
  "next_steps": ["what remains"]
}
```

## Constraints

- Do NOT mark interview/survey steps as complete — those require human action
- DO generate the materials (scripts, surveys, templates) for human steps
- Always record what was generated, even if the step isn't fully complete
