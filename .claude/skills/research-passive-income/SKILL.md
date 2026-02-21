---
name: research-passive-income
description: Validate passive income opportunities grounded in the founder's actual skills and network
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /research-passive-income

Research and validate passive income opportunities grounded in the founder's actual skills, projects, network, and market position.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. `!cat 07_system/agent/knowledge-digest-compact.md`
2. `!cat 07_system/directives/active-directive.md`
3. Read founder profile from `10_profile/founder-profile.json`
4. Read existing income strategies from vault
5. Scan `02_projects/active/` for projects that could spawn passive income

## Research Categories

For each, ground in founder's actual skills — no generic "start dropshipping" advice:

- **Digital Products** — Templates, frameworks, tools derived from existing expertise
- **Online Courses** — Topics matching founder's skills, platform analysis, demand validation
- **Micro-SaaS** — Productization of existing projects
- **Affiliate** — Tools the founder uses with affiliate programs
- **Licensing** — Dual-license, white-label, IP licensing opportunities
- **Content Monetization** — Newsletter, YouTube, sponsorships

## Scoring per opportunity

Setup Effort (1-10), Ongoing Effort (1-10), Revenue Potential (USD range), Time to First Dollar, Skill Match (1-10), Synergy (1-10).

Weighted composite: Time to First Dollar 30%, Revenue 25%, Low Effort 20%, Skill Match 15%, Synergy 10%.

## Output

Write to `07_system/reports/`:
- `research-passive-income-YYYY-MM-DD.md` — narrative with scored opportunities
- `research-passive-income-YYYY-MM-DD.json` — structured data with `task_type: "research-passive-income"`, `status`, `sources`, `findings`, opportunities with scores
