---
name: meta-analysis
description: Self-improvement analysis — review agent outputs, satisfaction trends, and improve NLSpecs
model: opus
allowed-tools: Read, Glob, Grep, Write
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: /srv/focus-flow/.claude/scripts/safety-gate.sh
---

# /meta-analysis

Review agent outputs, satisfaction score trends, and improve skill definitions (NLSpecs). Spec quality is the primary bottleneck — better specs produce better outputs from all agents.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. `!cat 07_system/agent/knowledge-digest-compact.md`
2. Read `07_system/agent/meta-changelog.md` if it exists — continue from where you left off
3. Read satisfaction score history from `07_system/agent/scenarios/history/*.json`
4. Read recent reports from `07_system/reports/` (last 2 weeks)
5. Read inference logs from `07_system/logs/inference/` (last 7 days) for cost analysis

## Analysis Phases

### Phase 1: Output Quality Review
- Read all reports from the last 2 weeks
- Score each on: completeness, actionability, accuracy (where verifiable), evidence quality
- Flag reports that scored below satisfaction threshold
- Identify common failure patterns across task types

### Phase 2: Satisfaction Trend Analysis
- Read all score history files from `07_system/agent/scenarios/history/`
- Plot trends per skill: improving, stable, degrading
- Skills trending down need spec improvement (Phase 3)
- Skills consistently at 1.0 may have too-easy criteria — flag for review

### Phase 3: NLSpec Review & Improvement (Critical Mandate)
Per StrongDM Software Factory principles: **spec quality is the only bottleneck that matters.**

For each skill definition in `.claude/skills/`:
1. Read the current SKILL.md
2. Compare against actual outputs — does the spec produce the desired behavior?
3. Identify ambiguities, missing constraints, or vague instructions
4. Propose specific improvements with before/after comparison
5. **Do NOT apply changes directly** — write proposals to the meta-changelog for HITL review

### Phase 4: Cost Efficiency Review
- Which agents consume the most tokens?
- Are any Opus agents doing work Sonnet could handle?
- Could prompts be shortened without losing quality?

## Change Protocol

Every proposed change requires:
1. **Evidence** — specific data from logs/reports/scores
2. **Proposal** — what to change and expected outcome
3. **Risk assessment** — could this change break anything?
4. **Rollback plan** — how to revert if it doesn't work

Write all proposals to `/srv/focus-flow/07_system/agent/meta-changelog.md` in append-only format:

```markdown
## YYYY-MM-DD — [Category]

**Evidence**: [Data that motivated this change]
**Proposal**: [Specific change description]
**Expected outcome**: [What should improve]
**Risk**: [What could go wrong]
**Status**: proposed | approved | applied | reverted
```

## Security Constraints (Absolute)

1. Never weaken security hooks — improve only, never reduce coverage
2. Never modify trust tiers without founder approval (HITL tier 3)
3. Never expose secrets in logs or reports
4. Never delete vault data
5. Never modify NITARA_SOUL.md

## Output

Write to `07_system/reports/`:
- `meta-analysis-YYYY-MM-DD.md` — narrative with findings and proposals
- `meta-analysis-YYYY-MM-DD.json` — structured data:

```json
{
  "task_type": "meta-analysis",
  "status": "completed",
  "generated_at": "ISO-8601",
  "reports_reviewed": 0,
  "satisfaction_trends": {},
  "spec_proposals": [],
  "cost_findings": [],
  "changes_proposed": 0,
  "estimated_savings_usd": 0
}
```
