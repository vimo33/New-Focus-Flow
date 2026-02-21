---
name: think-generate-hypotheses
description: Generate testable hypotheses for a project across 5 types (problem/solution/channel/pricing/moat)
model: opus
context: fork
allowed-tools: Read, Glob, Grep, Write, WebSearch
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-hypothesis.py"
          timeout: 10
---

# /think-generate-hypotheses

Generate 3-7 testable hypotheses for a project, covering multiple hypothesis types.

## Arguments
- `project_id` — which project to generate hypotheses for

## Context Loading
1. Read project metadata from `02_projects/active/{project-id}.json`
2. Read any existing hypotheses for this project
3. Read founder profile for skill/network context
4. Optionally search web for market validation signals

## Hypothesis Types
- **problem** — "Our target customer experiences X pain point"
- **solution** — "Y solution addresses the problem better than alternatives"
- **channel** — "We can reach customers effectively via Z channel"
- **pricing** — "Customers will pay $N for this solution"
- **moat** — "We can sustain competitive advantage through W"

## Per Hypothesis
- `statement` — Clear, falsifiable statement
- `type` — One of the 5 types above
- `confidence` — 0.0-1.0 based on current evidence
- `evidence_refs` — Links to supporting data/signals
- `falsification_criteria` — What would disprove this?
- `suggested_experiment` — How to test this cheaply

## Output

Write to project hypotheses file:
```json
{
  "project_id": "",
  "hypotheses": [
    {
      "id": "hyp-{timestamp}-{index}",
      "statement": "",
      "type": "problem|solution|channel|pricing|moat",
      "confidence": 0.0,
      "evidence_refs": [],
      "falsification_criteria": "",
      "suggested_experiment": "",
      "created_at": "ISO-8601"
    }
  ],
  "generated_at": "ISO-8601"
}
```

## Rules
1. Generate at least one problem hypothesis and one solution hypothesis.
2. Confidence should be low (0.1-0.3) for untested hypotheses.
3. Every hypothesis must be falsifiable — if it can't be tested, rewrite it.
