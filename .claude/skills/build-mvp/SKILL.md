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

## Convergence Loops (Attractor-Inspired)

After each build phase, self-validate before moving to the next. Do NOT single-shot — iterate within your session:

1. **Implement** the current phase
2. **Validate** — run the build (`npm run build` / `npx tsc`), run any existing tests
3. **Check against spec** — does the output match the architecture doc / API contract?
4. **If issues found**, loop back and fix (max 3 iterations per phase)
5. **Only declare phase complete** when build passes AND spec is satisfied

After Phase 4 (end-to-end verification), run a final convergence check:
- Re-read the original project spec
- Verify each spec requirement has a corresponding implementation
- If gaps found, iterate (max 2 final iterations)
- External scenario validation runs as post-execution check via validate-analysis.sh

## Leash Containerization

When running via the task queue, this agent executes inside a Leash container with Cedar policies (`07_system/agent/cedar-policies/builder.cedar`). Key constraints:
- **Write access**: only `/srv/focus-flow/02_projects/` (project directories)
- **No write access**: `07_system/`, `.claude/`, `10_profile/`
- **Network**: localhost only (for build verification and health checks)
- **Processes**: npm, npx, node, tsc, git, systemctl only

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
