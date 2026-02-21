---
name: validate-portfolio-prune
description: Bi-weekly portfolio pruning. Recomputes all signal strength scores, applies thresholds, generates kill/scale recommendations, creates approvals for kills. Scheduled bi-weekly Wednesday 6am.
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, Write
user-invocable: true
---

# /validate-portfolio-prune

Run portfolio-wide signal strength computation and generate pruning recommendations.

## Workflow

1. **Recompute all scores**: `POST http://localhost:3001/api/validation/signal-strength/compute` with `{}`
2. **Get pruning recommendations**: `GET http://localhost:3001/api/validation/pruning-recommendations`
3. **Get overview stats**: `GET http://localhost:3001/api/validation/overview`
4. **For KILL recommendations:**
   - Create a Tier 3 approval request via `POST http://localhost:3001/api/approvals` with:
     ```json
     {
       "actionSummary": "Kill project: {name} (score {score}/100 for {days} days)",
       "riskTier": "tier3",
       "evidence": "Signal strength breakdown: {...}"
     }
     ```
5. **Generate pruning report** to `/srv/focus-flow/07_system/reports/pruning-{date}.json`

## Report Format

```json
{
  "task_type": "portfolio-prune",
  "status": "completed",
  "total_projects": 19,
  "scores_computed": 19,
  "kill_recommendations": 5,
  "park_recommendations": 3,
  "scale_recommendations": 2,
  "average_score": 42.3,
  "recommendations": [
    { "project": "...", "score": 22, "recommendation": "kill", "rationale": "..." }
  ],
  "approvals_created": 5
}
```

## Memory Hooks (Post-Prune)

After generating pruning recommendations, persist decision context to semantic memory:

For each KILL or PARK recommendation, call:
```
POST http://localhost:3001/api/memory/agent
{
  "type": "decision_context",
  "projectId": "<project_id>",
  "category": "kill|park",
  "content": "<rationale for the recommendation, including score and key signals>"
}
```

## Constraints

- NEVER auto-kill a project — always create Tier 3 approval
- Include the full breakdown in the approval evidence
- Log every recommendation to the audit trail
