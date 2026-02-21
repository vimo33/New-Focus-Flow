---
name: grow-simulate
description: Run resource allocation simulation with scenario comparison
model: sonnet
context: fork
allowed-tools: Read, Write, Glob, Grep
hooks:
  Stop:
    - hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-simulation.py"
          timeout: 10
---

# /grow-simulate

Run resource allocation simulations comparing multiple scenarios across the portfolio.

## Arguments
- `focus_area` — optional: "time", "budget", "compute", "attention", or "all"

## Context Loading
1. Load all active projects with goals and constraints
2. Load current resource allocation
3. Load recent performance metrics

## Simulation
Define 2-4 scenarios varying resource allocation:
- Each scenario adjusts: founder_hours, budget_usd, compute_allocation, attention_priority
- For each scenario compute: projected_outcomes, risk_assessment, opportunity_cost
- Compare scenarios side-by-side

## Output
```json
{
  "id": "sim-{timestamp}",
  "scenarios": [
    {
      "name": "Scenario A: Focus on {project}",
      "variables": { "founder_hours": {}, "budget": {}, "compute": {} },
      "projected_outcomes": { "revenue_30d": 0, "experiments_completed": 0 },
      "risk_assessment": "",
      "opportunity_cost": ""
    }
  ],
  "recommendation": "",
  "simulated_at": "ISO-8601"
}
```
