---
name: venture-launch
description: Full new venture journey — idea intake, hypotheses, initial experiments, project creation
model: opus
context: fork
allowed-tools: Read, Write, Glob, Grep, Bash, Task, WebSearch
---

# /venture-launch

Orchestrate the creation of a new venture from raw idea to first experiments.

## Arguments
- Raw idea description (text from user)

## Workflow
1. Normalize idea using think-intake-idea framework
2. Create project in `02_projects/active/` with status "idea", stage "Idea"
3. Generate hypotheses using think-generate-hypotheses framework
4. Score project using think-score-project framework
5. Identify top 1-2 hypotheses by confidence gap (lowest confidence = most value to test)
6. Create experiments for top hypotheses using validate-create-experiment framework
7. Transition project stage from "Idea" to "Validation"
8. Write venture launch summary

## Output
Write summary:
```json
{
  "project_id": "",
  "project_name": "",
  "initial_score": 0.0,
  "hypotheses_generated": 0,
  "experiments_created": 0,
  "first_experiment": "",
  "stage": "validation",
  "launched_at": "ISO-8601"
}
```

## Rules
1. Always generate at least 3 hypotheses.
2. Create at least 1 experiment (the cheapest/fastest one to test).
3. If the idea is too vague, ask clarifying questions before proceeding.
