---
name: portfolio-analysis
description: Deep analysis of all projects with scoring, ranking, and kill/park/pivot/invest/build-next recommendations
context: fork
model: opus
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /portfolio-analysis

Perform a comprehensive analysis of the founder's entire project portfolio, scoring each project and providing strategic recommendations.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

Load these before analysis:
1. `!cat 07_system/agent/knowledge-digest-full.md`
2. `!cat 07_system/directives/active-directive.md`
3. `!cat 07_system/agent/profiling-checklist.json`
4. Read founder profile from `10_profile/founder-profile.json`
5. Glob `02_projects/active/*.json` for all project metadata

## Scoring (0-10 per dimension)

| Dimension | Weight | Description |
|---|---|---|
| Revenue Proximity | 30% | How close to generating income? |
| Market Validation | 20% | Evidence of demand |
| Skill Alignment | 15% | Leverages existing founder skills? |
| Effort-to-Revenue | 20% | Revenue per hour invested |
| Strategic Fit | 15% | Alignment with directive and portfolio balance |

## Recommendations per project

One of: **BUILD-NEXT**, **INVEST**, **PIVOT**, **PARK**, **KILL**

## Cross-Project Analysis

- Resource conflicts between projects
- Synergies (shared tech, audience, network)
- Portfolio balance assessment
- Gap analysis for missing income streams

## Output

Write BOTH to `07_system/reports/`:
- `portfolio-analysis-YYYY-MM-DD.md` — human-readable report
- `portfolio-analysis-YYYY-MM-DD.json` — structured data with `task_type: "portfolio-analysis"`, `status: "completed"`, `top_recommendations` array, project scores, and cross-project analysis

## Memory Hooks (Post-Analysis)

After completing the portfolio analysis, persist key insights to semantic memory:

For each notable insight (max 5), call:
```
POST http://localhost:3001/api/memory/agent
{
  "type": "pattern",
  "content": "<the insight, e.g. '3 projects in the portfolio share the same audience segment but aren't cross-promoting'>",
  "category": "success_pattern|failure_pattern|market_signal|timing_pattern",
  "relatedProjects": ["<project_id_1>", "<project_id_2>"],
  "confidence": 0.7
}
```

Focus on:
- Recurring patterns across projects (e.g. "Projects with council score < 5 always stall at concept phase")
- Synergies or conflicts discovered between projects
- Resource allocation insights (e.g. "Revenue proximity drops when more than 5 projects are active")
