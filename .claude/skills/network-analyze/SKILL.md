---
name: network-analyze
description: Find revenue opportunities, introduction chains, and strategic gaps in network data
model: sonnet
allowed-tools: Read, Glob, Grep, Write, WebSearch
---

# /network-analyze

Find actionable opportunities hidden in the founder's professional network.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. `!cat 07_system/agent/knowledge-digest-full.md`
2. `!cat 07_system/directives/active-directive.md`
3. Glob and read contacts from `10_profile/network/contacts/*.json` (top 30 + aggregate stats)

## Analysis Dimensions

1. **Revenue-adjacent contacts** — Who is one conversation from becoming a client/partner/referral?
2. **Industry clusters** — Group by sector, identify strongest and untapped clusters
3. **Introduction chains** — Two-hop paths to strategic targets
4. **Network gaps** — Missing roles, industries, seniority levels
5. **Dormant high-value** — No interaction in 90+ days but strategically important

**Every opportunity MUST include a concrete `suggested_action`** — not "reach out" but specific steps, messaging angle, and timeline.

## Output

Write to `07_system/reports/`:
- `network-analysis-YYYY-MM-DD.md` — narrative with top 5 opportunities and network health score
- `network-analysis-YYYY-MM-DD.json` — structured data with `task_type: "network-analyze"`, `status`, `opportunities` array (each with `suggested_action`), `clusters`, `gaps`
