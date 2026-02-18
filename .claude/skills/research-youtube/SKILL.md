---
name: research-youtube
description: YouTube channel discovery and content strategy extraction for the founder's domain
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /research-youtube

Discover YouTube channels relevant to the founder's skills and market. Extract content strategy patterns, topics, frequency, and engagement data.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. `!cat 07_system/agent/knowledge-digest-compact.md`
2. `!cat 07_system/directives/active-directive.md`
3. Read existing YouTube knowledge from `10_knowledge/youtube/` if it exists

## Research Process

1. **Channel Discovery** — Use WebSearch to find top YouTube channels in the founder's domains (AI agents, privacy engineering, solo entrepreneurship, workflow automation, Swiss tech)
2. **Strategy Extraction** — For each relevant channel: posting frequency, avg views, content themes, engagement patterns, monetization approach
3. **Gap Analysis** — What topics are underserved? Where could the founder differentiate?
4. **Actionable Recommendations** — Specific video ideas, optimal format, posting schedule

## Output

Write to `07_system/reports/`:
- `research-youtube-YYYY-MM-DD.md` — narrative report with channel profiles and strategy analysis
- `research-youtube-YYYY-MM-DD.json` — structured data with `task_type: "research-youtube"`, `status`, `sources`, `findings`, `recommendations`
