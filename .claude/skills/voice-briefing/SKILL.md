---
name: voice-briefing
description: Generate and deliver TTS-optimized morning briefing via voice call
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /voice-briefing

Generate a morning briefing narrative optimized for text-to-speech delivery, and optionally trigger a voice call to deliver it.

## Usage

```
/voice-briefing [call|text]
```

- `call` — generate briefing and trigger outbound call to deliver it
- `text` — generate briefing text only (default)

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

Read the latest reports (most recent of each type):
1. `07_system/reports/monitor-project*.json` — system health
2. `07_system/reports/portfolio-analysis*.json` — portfolio status
3. `07_system/reports/research-market*.json` — market intel
4. `07_system/reports/network-analyze*.json` — network updates
5. `07_system/agent/profiling-checklist.json` — profiling status
6. `07_system/agent/cost-budget.json` — budget status

## Briefing Generation Rules

The briefing must be **TTS-optimized**:
- Short sentences (under 15 words each)
- No abbreviations — spell out (e.g., "ten thousand" not "10K")
- No markdown, no bullet points, no special characters
- Use natural speech patterns with pauses (periods for pauses)
- Pronunciation hints for names if needed
- Total length: 60-90 seconds when spoken (~200-300 words)

## Briefing Structure

1. **Greeting** (5 seconds): "Good morning Vimo. Here's your briefing for [day]."
2. **What Changed** (20 seconds): New developments since yesterday — system health, completed tasks, new reports
3. **Focus Recommendation** (15 seconds): The single most important thing to work on today, with brief rationale
4. **Decisions Needed** (15 seconds): Anything pending your input — HITL approvals, strategic choices
5. **Quick Wins** (10 seconds): 1-2 things that could be done in under 30 minutes
6. **Closing** (5 seconds): "That's your briefing. Have a productive day."

## Delivery

If mode is `call`:
- Check DND status via `curl http://localhost:3001/api/voice/dnd`
- If clear, trigger call:
```bash
curl -X POST http://localhost:3001/api/voice/call \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "'$FOUNDER_PHONE'", "persona": "nitara-main", "reason": "morning_briefing", "priority": "medium", "metadata": {"briefing_date": "'$DATE'"}}'
```

## Output

```json
{
  "task_type": "voice-briefing",
  "status": "complete|skipped_dnd|failed",
  "date": "",
  "mode": "call|text",
  "briefing_text": "",
  "word_count": 0,
  "estimated_duration_seconds": 0,
  "sources_used": [],
  "session_id": "",
  "notes": ""
}
```

Write to `07_system/reports/voice-briefing-{date}.json`.
