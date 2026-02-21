---
name: build-scaffold
description: Generate a build specification from validated experiment learnings
model: opus
context: fork
allowed-tools: Read, Write, Glob, Grep
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-build-spec.py"
          timeout: 10
---

# /build-scaffold

Generate a detailed build specification from a validated decision (scale or iterate).

## Arguments
- `decision_id` — the decision that triggers this build
- `project_id` — parent project

## Prerequisites
- Decision must be "scale" or "iterate" (not pivot/park/kill)

## Process
1. Read the decision and its evidence
2. Read project constraints (budget, timeline, tech stack)
3. Design architecture: components, APIs, data models
4. Break into ordered tasks with acceptance criteria
5. Estimate effort per task

## Build Spec Structure
- `components[]` — List of components to build/modify
- `architecture_decisions[]` — Key technical choices with rationale
- `api_contracts[]` — New/modified API endpoints
- `data_model_changes[]` — Schema additions or modifications
- `test_plan[]` — What to test and how
- `acceptance_criteria[]` — Definition of done
- `estimated_effort` — Total effort in hours
- `task_breakdown[]` — Ordered list of implementation tasks

## Output

Write to project build-specs directory:
```json
{
  "id": "spec-{timestamp}",
  "project_id": "",
  "decision_id": "",
  "components": [],
  "architecture_decisions": [],
  "api_contracts": [],
  "data_model_changes": [],
  "test_plan": [],
  "acceptance_criteria": [],
  "estimated_effort_hours": 0,
  "task_breakdown": [
    { "order": 1, "title": "", "description": "", "agent": "backend-dev|frontend-dev", "effort_hours": 0 }
  ],
  "created_at": "ISO-8601"
}
```
