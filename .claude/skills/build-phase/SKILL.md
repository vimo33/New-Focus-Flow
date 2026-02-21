---
name: build-phase
description: Execute a phase from TASKS.md — reads tasks, resolves dependencies, dispatches agents
context: fork
model: opus
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
---

# /build-phase

Execute a complete phase from TASKS.md.

## Usage
```
/build-phase <phase-number>
```

## Steps
1. Read `/srv/focus-flow/TASKS.md`
2. Identify all tasks in the specified phase
3. Resolve dependencies — which tasks can run in parallel vs sequential
4. For each task, dispatch the appropriate agent (nitara-backend, nitara-frontend, nitara-ux-components, nitara-canvas, nitara-conversation)
5. Wait for all tasks to complete
6. Run quality gates: `npx tsc --noEmit` for both packages
7. Verify branding: `grep -r "Focus Flow" src/` should return zero
8. Report results

## Quality Gates
- TypeScript compilation: both backend and frontend
- Vite build: frontend
- No "Focus Flow" in user-facing strings
- No console errors
