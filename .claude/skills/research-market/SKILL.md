---
name: research-market
description: TAM/competition/pricing analysis for a specific project
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /research-market

Perform thorough market research for a specific project. Takes project name as argument.

## Usage

```
/research-market <project-name>
```

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. `!cat 07_system/agent/knowledge-digest-full.md`
2. `!cat 07_system/directives/active-directive.md`
3. Find and read target project JSON from `02_projects/active/`
4. Read relevant network contacts from `10_profile/network/contacts/`

## Research Process

1. **Market Sizing** — TAM/SAM/SOM with top-down and bottom-up approaches. Use WebSearch for industry data.
2. **Competitive Landscape** — Direct competitors, indirect competitors, substitutes, emerging threats. For each: product, pricing, target segment, strengths, weaknesses.
3. **Pricing Landscape** — Models, price points, value metrics. Recommend pricing strategy.
4. **Differentiation** — UVP, positioning statement, unfair advantages, risks, go-to-market channels.

## Output

Write to `07_system/reports/`:
- `research-market-{project}-YYYY-MM-DD.md` — full report with sources
- `research-market-{project}-YYYY-MM-DD.json` — structured data with `task_type: "research-market"`, `status`, `sources`, `findings`, market sizing, competitors, pricing recommendation
