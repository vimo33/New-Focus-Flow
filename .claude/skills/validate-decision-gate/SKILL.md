---
name: validate-decision-gate
description: Run a structured decision gate (Scale/Iterate/Pivot/Park/Kill) with evidence and counterarguments
model: opus
context: fork
allowed-tools: Read, Write, Glob, Grep
hooks:
  Stop:
    - hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-decision.py"
          timeout: 10
---

# /validate-decision-gate

Synthesize experiment results into a structured decision with evidence, assumptions, and counterarguments.

## Arguments
- `experiment_id` — experiment with results to evaluate
- `project_id` — parent project for context

## Context Loading
1. Read experiment results
2. Read hypothesis that was tested
3. Read project goals and constraints
4. Read any prior decisions for this project
5. Read portfolio context for resource implications

## Decision Framework

**Actions (choose one):**
- **scale** — Results strong, invest more resources
- **iterate** — Promising but needs refinement, run another experiment
- **pivot** — Hypothesis disproven, try different approach
- **park** — Inconclusive or wrong timing, revisit later
- **kill** — Clearly not viable, free up resources

**Required for every decision:**
- `rationale` — At least 50 characters explaining the reasoning
- `evidence_sources` — At least 1 source (experiment results, market data, etc.)
- `assumptions` — What we're assuming to be true
- `confidence` — 0.0-1.0 in this decision
- `counterarguments` — At least 1 argument against this decision

**For destructive decisions (park/kill):**
- Must include resource reallocation plan
- Must trigger playbook extraction (/leverage-extract-playbook)
- Must note what was learned

## Output

Write decision JSON:
```json
{
  "id": "dec-{timestamp}",
  "project_id": "",
  "experiment_id": "",
  "action": "scale|iterate|pivot|park|kill",
  "rationale": "",
  "evidence_sources": [],
  "assumptions": [],
  "confidence": 0.0,
  "counterarguments": [],
  "resource_implications": "",
  "next_steps": [],
  "decided_at": "ISO-8601"
}
```

## Memory Hooks (Post-Decision)

After recording the decision, persist learnings to semantic memory via API:

1. **Record decision context:**
   ```
   POST http://localhost:3001/api/memory/agent
   {
     "type": "decision_context",
     "projectId": "<project_id>",
     "content": "Decision: <action> for <project_name>. Rationale: <rationale>. Key signals: <evidence_sources joined>"
   }
   ```

2. **Record experiment outcome:**
   ```
   POST http://localhost:3001/api/memory/agent
   {
     "type": "experiment_outcome",
     "projectId": "<project_id>",
     "experimentId": "<experiment_id>",
     "outcome": "<positive|negative|inconclusive based on action>",
     "content": "<key learning from the experiment results>"
   }
   ```

Map action to outcome: scale/iterate → positive, pivot → inconclusive, park/kill → negative.
