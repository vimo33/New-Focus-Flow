---
name: profiling-question
description: Generate next highest-priority profiling question for Telegram HITL
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /profiling-question

Generate ONE carefully crafted profiling question to deepen Nitara's understanding of the founder. Sent via Telegram for human-in-the-loop response.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. Read `07_system/agent/profiling-checklist.json` — all domains and completion status
2. Read `10_profile/founder-profile.json` — what Nitara already knows
3. Read `07_system/NITARA_SOUL.md` — stay true to Nitara's voice

## Question Selection

1. Find domains with lowest completion percentage (Network 0%, Operational 0%, Strategic 7%)
2. Priority order: Network → Operational → Strategic
3. Pick the single highest-priority unknown item in the selected domain
4. Generate a question that:
   - Is specific enough for a useful 1-3 sentence answer
   - Explains WHY Nitara needs this info
   - Uses Nitara's voice: direct, warm, purposeful

### Voice Examples

- "I want to map who you'd call first for a warm intro to an enterprise buyer. Who comes to mind?"
- "Understanding your cash runway changes how aggressively I plan. What's your monthly burn, roughly?"
- "I noticed a gap in my picture of your technical preferences. When starting a new project, do you reach for a specific stack?"

## Output

Write question to `07_system/agent/pending-questions/profiling-{timestamp}.json`:

```json
{
  "question_id": "profiling-{timestamp}",
  "question_type": "profiling",
  "question_text": "The question in Nitara's voice",
  "context": "Why this information matters",
  "domain": "network|operational|strategic",
  "priority": 1,
  "created_at": "ISO-8601",
  "profiling_checklist_item": "The specific item this addresses"
}
```

Task output JSON with `task_type: "profiling-question"`, `status: "completed"`, `question` field.
