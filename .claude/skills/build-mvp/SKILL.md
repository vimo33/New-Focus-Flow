---
name: build-mvp
description: Orchestrate agent team to design, build, test, and deploy an MVP
model: opus
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

# /build-mvp

Orchestrate Nitara's agent team to take a project from spec to deployed MVP.

## Usage

```
/build-mvp <project-name>
```

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. `!cat 07_system/agent/knowledge-digest-compact.md`
2. Read project spec from `02_projects/active/{project}/`
3. Read existing code patterns from backend/frontend for convention matching

## Build Phases

### Phase 1: Architecture (Opus — this agent)
- Design system: services, data models, API contracts, frontend routes
- Write architecture doc to project directory
- Create Task list for sub-agents

### Phase 2: Parallel Build (Agent Team via Task tool)
- **nitara-backend**: API routes, services, types — with architecture doc and API contract
- **nitara-frontend**: UI components, pages, API client — with architecture doc

### Phase 3: Integration (Sequential)
- Verify frontend ↔ backend API contracts
- **ops**: Deploy, systemd, health checks

### Phase 4: End-to-End Verification
- Health check endpoints return 200
- API responses match spec
- Frontend builds without errors
- All systemd services active

## Build Guard

**2-hour timeout enforced.** If not at Phase 4 within 2 hours, halt and report partial progress.

## Output

```json
{
  "task_type": "build-mvp",
  "status": "complete|partial|failed",
  "build_status": {
    "phase_1_architecture": "complete|failed",
    "phase_2_backend": "complete|failed",
    "phase_2_frontend": "complete|failed",
    "phase_3_integration": "complete|failed",
    "phase_4_verification": "complete|failed"
  },
  "endpoints": [{ "url": "", "method": "", "status": "healthy|unhealthy" }],
  "elapsed_minutes": 0,
  "notes": ""
}
```

Write to `07_system/reports/build-mvp-{project}-YYYY-MM-DD.json`.
