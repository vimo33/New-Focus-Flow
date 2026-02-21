---
name: think-intake-idea
description: Normalize a raw idea into structured JSON with required fields
model: sonnet
context: fork
allowed-tools: Read, Write, Glob
hooks:
  PostToolUse:
    - matcher: "Write"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-idea-schema.py"
          timeout: 10
---

# /think-intake-idea

Normalize a raw idea (from conversation, voice, or text) into a structured idea JSON.

## Arguments
- Raw idea text (user's description of the idea)

## Process
1. Extract key fields from the raw idea text
2. Ask clarifying questions if critical fields are missing
3. Structure into canonical idea format
4. Write to inbox

## Required Fields
- `name` — Short, memorable project name
- `problem_statement` — What problem does this solve? For whom?
- `icp` — Ideal Customer Profile (who pays?)
- `constraints` — Budget, time, technical, regulatory constraints

## Optional Fields
- `revenue_model` — How will this make money?
- `potential_hypotheses` — Initial testable hypotheses
- `competitive_landscape` — Known competitors
- `unfair_advantages` — What does the founder uniquely have?

## Output

Write to `03_ideas/inbox/idea-{timestamp}.json`:
```json
{
  "id": "idea-{timestamp}",
  "name": "",
  "problem_statement": "",
  "icp": "",
  "constraints": {},
  "revenue_model": "",
  "potential_hypotheses": [],
  "status": "inbox",
  "source": "conversation|voice|manual",
  "created_at": "ISO-8601"
}
```
