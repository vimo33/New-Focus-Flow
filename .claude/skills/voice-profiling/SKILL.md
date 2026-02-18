---
name: voice-profiling
description: Trigger outbound voice profiling call to gather founder information
model: sonnet
allowed-tools: Read, Glob, Grep, Bash, Write
---

# /voice-profiling

Trigger an outbound voice call to conduct a profiling conversation with the founder.

## Usage

```
/voice-profiling [domain]
```

If `domain` is specified, focus on that profiling domain. Otherwise, target the highest-gap domain.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. Read profiling checklist: `07_system/agent/profiling-checklist.json`
2. Read founder profile: `10_profile/founder-profile.json`
3. Read DND schedule: `02_projects/active/livekit-agent/config/dnd_schedule.json`

## Execution

### Step 1: Identify Target Domain

- Read profiling checklist
- If domain specified, validate it exists
- Otherwise, find the domain with lowest completeness and highest priority
- Critical priority domains take precedence over high/medium

### Step 2: Generate Conversation Script

- For the target domain, identify 3-5 unknown items
- Draft natural conversation questions that feel like a chat, not a survey
- Include follow-up prompts for depth
- Write script to `07_system/agent/profiling-scripts/{domain}-{date}.json`

### Step 3: Trigger Outbound Call

- Check DND status via `curl http://localhost:3001/api/voice/dnd`
- If DND active and not critical, log and skip
- If clear, trigger call via:
```bash
curl -X POST http://localhost:3001/api/voice/call \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "'$FOUNDER_PHONE'", "persona": "nitara-profiler", "reason": "profiling_session", "priority": "medium", "metadata": {"target_domain": "'$DOMAIN'"}}'
```

### Step 4: Post-Call Processing

- The profiler agent updates the checklist in real-time via function tools
- After call ends, read updated checklist and compute improvement delta
- Write session summary to report

## Output

```json
{
  "task_type": "voice-profiling",
  "status": "complete|skipped_dnd|failed",
  "target_domain": "",
  "questions_prepared": 0,
  "completeness_before": 0,
  "completeness_after": 0,
  "improvement_delta": 0,
  "session_id": "",
  "notes": ""
}
```

Write to `07_system/reports/voice-profiling-{date}.json`.
