---
name: leverage-extract-playbook
description: Extract a reusable playbook from completed experiment/project work
model: sonnet
context: fork
allowed-tools: Read, Write, Glob, Grep
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-playbook.py"
          timeout: 10
---

# /leverage-extract-playbook

Extract a reusable playbook from completed work (experiments, builds, decisions).

## Arguments
- `project_id` — source project
- `scope` — "experiment", "build", "decision", or "full-project"

## Process
1. Read project history: experiments, decisions, agent runs, outcomes
2. Identify the pattern: what worked, what failed, what was learned
3. Extract reusable steps that could apply to future projects
4. Note failure modes and adaptations

## Playbook Structure
- `title` — Clear, searchable name
- `context` — When to use this playbook (problem type, stage, constraints)
- `steps[]` — Ordered actions with details
- `success_metrics[]` — How to know it's working
- `failure_modes[]` — What can go wrong and how to detect
- `adaptations[]` — How to customize for different contexts
- `source` — Where this was extracted from

## Output

Write to `07_system/playbooks/extracted/`:
```json
{
  "id": "pb-{timestamp}",
  "title": "",
  "context": "",
  "steps": [
    { "order": 1, "action": "", "details": "", "estimated_time": "" }
  ],
  "success_metrics": [],
  "failure_modes": [],
  "adaptations": [],
  "source": { "project_id": "", "experiments": [], "decisions": [] },
  "extracted_at": "ISO-8601"
}
```
