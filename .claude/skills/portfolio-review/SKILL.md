---
name: portfolio-review
description: Weekly portfolio analysis — scoring all projects, ranking, cross-project analysis, recommendations
model: opus
context: fork
allowed-tools: Read, Write, Glob, Grep, Bash, Task, WebSearch
---

# /portfolio-review

Orchestrate a comprehensive portfolio review across all active projects.

## Workflow
1. Glob `02_projects/active/*.json` to find all project metadata
2. For each project, score using the think-score-project framework (6 dimensions)
3. Rank projects by composite score
4. Perform cross-project analysis:
   - Resource conflicts between projects
   - Synergies (shared tech, audience, network)
   - Portfolio balance (mix of stages and revenue proximity)
   - Gap analysis for missing income streams
5. Generate top 3 strategic recommendations
6. Write reports

## Context Loading
- `07_system/agent/knowledge-digest-full.md`
- `07_system/directives/active-directive.md`
- `10_profile/founder-profile.json`

## Output

Write BOTH reports to `07_system/reports/`:
- `portfolio-review-{date}.md` — Human-readable with executive summary, score table, detailed analysis
- `portfolio-review-{date}.json` — Structured data for dashboard consumption

## Rules
1. Score every active project, not just the ones that look promising.
2. The executive summary should be actionable — what to do THIS WEEK.
3. If the portfolio is unbalanced (e.g., all early-stage), call it out explicitly.
