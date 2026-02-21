---
name: experiment-loop
description: Full experiment lifecycle — create, run, measure, decide
model: opus
context: fork
allowed-tools: Read, Write, Glob, Grep, Bash, Task, WebSearch, WebFetch
---

# /experiment-loop

Orchestrate the full experiment lifecycle from hypothesis to decision.

## Arguments
- `hypothesis_id` — which hypothesis to test
- `project_id` — parent project

## Workflow
1. Design experiment using validate-create-experiment framework
2. Set experiment status to "running"
3. Monitor for data collection
4. When sufficient data: analyze results using validate-measure-experiment framework
5. If results flag "Decision Required": run decision gate using validate-decision-gate framework
6. Based on decision:
   - **scale** → Suggest build-scaffold skill
   - **iterate** → Create next experiment
   - **pivot** → Generate new hypotheses
   - **park/kill** → Trigger leverage-extract-playbook

## Output
Write experiment lifecycle summary:
```json
{
  "hypothesis_id": "",
  "experiment_id": "",
  "lifecycle": "created|running|measured|decided",
  "decision": "scale|iterate|pivot|park|kill",
  "key_learning": "",
  "next_action": "",
  "completed_at": "ISO-8601"
}
```
