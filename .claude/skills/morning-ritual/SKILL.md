---
name: morning-ritual
description: Daily morning briefing — priorities, experiment updates, decisions needed, delegation plan
model: sonnet
context: fork
allowed-tools: Read, Glob, Grep, Write
---

# /morning-ritual

Generate the daily morning briefing with priorities, updates, and delegation plan.

## Context Loading
1. All active projects and their stages
2. Experiments nearing completion or flagged "Decision Required"
3. Pending approvals
4. Agent runs completed since last briefing
5. Portfolio health metrics
6. Founder's calendar/schedule (if available)

## Briefing Structure

### Priority Actions (top 3)
What the founder should focus on today, ranked by urgency and impact.

### Experiment Updates
Status of running experiments, any that need decisions.

### Approval Queue
Pending items that need human review.

### Agent Activity
What autonomous agents accomplished overnight.

### Portfolio Pulse
Quick health metrics: active projects, stage distribution, runway.

### Delegation Plan
What Nitara will handle autonomously today (Tier 1 tasks).

## Output
Write to `07_system/agent/briefings/morning-{date}.md`
