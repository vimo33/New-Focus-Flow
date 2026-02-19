---
name: grow-rebalance
description: Apply a resource reallocation plan across the portfolio
model: sonnet
context: fork
allowed-tools: Read, Write, Glob
---

# /grow-rebalance

Apply a chosen resource reallocation scenario from a simulation.

## Arguments
- `simulation_id` — which simulation to apply from
- `scenario_index` — which scenario was chosen

## Process
1. Read simulation results and chosen scenario
2. Snapshot current project constraints (before state)
3. Update each project's constraints to match the scenario
4. Create rebalance record with before/after comparison
5. Write audit trail

## Output
```json
{
  "id": "rebalance-{timestamp}",
  "simulation_id": "",
  "scenario_applied": "",
  "changes": [
    { "project_id": "", "field": "", "before": "", "after": "" }
  ],
  "applied_at": "ISO-8601"
}
```
