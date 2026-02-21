---
name: validate-sprint-orchestrator
description: Create and manage validation sprints. Selects uncertain projects (score 30-70), assigns experiments, creates execution plans. Scheduled weekly Monday 8am.
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, Write
user-invocable: true
---

# /validate-sprint-orchestrator

Orchestrate a validation sprint: select projects, assign experiments, generate plans.

## Arguments

`$ARGUMENTS` — optional sprint name

## Context Loading

1. Load signal strength scores: `GET http://localhost:3001/api/validation/overview`
2. Load all projects: `GET http://localhost:3001/api/projects`
3. Load active sprints: `GET http://localhost:3001/api/validation/sprints`
4. Load founder profile: `/srv/focus-flow/10_profile/founder-profile.json`

## Workflow

1. **Identify uncertain projects** — projects with signal strength 30-70 (the "uncertainty zone")
2. **Select top 3-5** by strategic fit and variety of hypothesis types
3. **For each selected project:**
   a. Check if a draft/running experiment exists — use it
   b. If not, identify the highest-priority unvalidated hypothesis
   c. Create an experiment for that hypothesis
4. **Create a validation sprint** via `POST /api/validation/sprints`
5. **Add experiments** to the sprint via `POST /api/validation/sprints/{id}/experiments`
6. **Generate execution plans** via `POST /api/validation/experiment-plans` for each experiment
7. **Start the sprint** via `POST /api/validation/sprints/{id}/start`

## Output

Write report to `/srv/focus-flow/07_system/reports/sprint-orchestrator-{date}.json`:
```json
{
  "task_type": "sprint-orchestration",
  "status": "completed",
  "sprint_id": "...",
  "sprint_name": "...",
  "projects_selected": ["..."],
  "experiments_created": 3,
  "total_budget_usd": 300,
  "estimated_duration_days": 14
}
```

## Constraints

- Maximum 5 experiments per sprint
- Total budget should not exceed $500 per sprint
- Only select projects with status 'active' or 'idea'
- Skip projects already in an active sprint
