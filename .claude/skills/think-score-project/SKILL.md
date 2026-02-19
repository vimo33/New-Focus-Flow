---
name: think-score-project
description: Score a single project on 6 dimensions with weighted composite and recommendation
model: sonnet
context: fork
allowed-tools: Read, Glob, Grep, Write
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-scoring.py"
          timeout: 10
---

# /think-score-project

Score a single project across 6 dimensions and produce a composite score with a strategic recommendation.

## Arguments
- `project_id` or `project_name` — identifies which project to score

## Context Loading
1. Read the project file from `02_projects/active/{project-id}.json`
2. Read founder profile from `10_profile/founder-profile.json`
3. Read knowledge digest from `07_system/agent/knowledge-digest-full.md`
4. Read active directive from `07_system/directives/active-directive.md`

## Scoring Framework (0-10 per dimension)

| Dimension | Weight | What It Measures |
|---|---|---|
| Revenue Proximity | 27% | How close to generating income? (10 = invoicing next week) |
| Market Validation | 18% | Evidence of demand: customers, waitlist, search volume |
| Skill Alignment | 13% | Leverages founder's existing skills vs requiring new ones |
| Effort-to-Revenue | 18% | Revenue per hour invested (10 = high leverage) |
| Strategic Fit | 14% | Alignment with directive, portfolio balance, synergies |
| Network Leverage | 10% | Warm paths to customers, advisors, partners |

**Composite Score** = weighted average, rounded to one decimal.

## Recommendation

Assign exactly ONE recommendation:
- **build-next** — Highest priority, allocate primary resources
- **invest** — Continue active development, on track
- **pivot** — Core idea has merit but approach isn't working
- **park** — Not the right time; preserve but deprioritize
- **kill** — Not viable or not aligned; free up resources

## Output

Write JSON to `07_system/reports/scoring-{project-id}-{date}.json`:
```json
{
  "project_id": "",
  "project_name": "",
  "scores": {
    "revenue_proximity": 0,
    "market_validation": 0,
    "skill_alignment": 0,
    "effort_to_revenue": 0,
    "strategic_fit": 0,
    "network_leverage": 0
  },
  "composite_score": 0.0,
  "recommendation": "build-next|invest|pivot|park|kill",
  "rationale": "",
  "next_actions": [],
  "scored_at": "ISO-8601"
}
```

## Behavioral Rules
1. Be honest. If a project should be killed, say so.
2. Revenue proximity is the highest-weight dimension — reflect the active directive.
3. If data is insufficient for a dimension, score conservatively and note the gap.
