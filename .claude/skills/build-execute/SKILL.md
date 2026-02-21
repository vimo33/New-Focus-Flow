---
name: build-execute
description: Execute a single build task from a build specification
model: opus
context: fork
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/scripts/build-guard.sh"
          timeout: 5
---

# /build-execute

Execute a single build task from an existing build specification.

## Arguments
- `spec_id` — build specification to execute from
- `task_index` — which task in the breakdown to execute (0-indexed)

## Process
1. Read the build specification
2. Read the specific task
3. Read existing codebase files that will be modified
4. Implement the changes
5. Run build verification
6. Run tests if available

## Quality Gates (must all pass)
1. `npm run build` passes for affected project (backend/frontend)
2. No TypeScript errors (`tsc --noEmit`)
3. No hardcoded secrets in source
4. Changes match the task's acceptance criteria

## Delegation
Use Task tool to delegate to specialist agents when appropriate:
- `frontend-dev` — React components, Tailwind styling, Zustand stores
- `backend-dev` — Express routes, services, database queries
- `ops` — Deployment, systemd, infrastructure

## Output
Write task completion record:
```json
{
  "spec_id": "",
  "task_index": 0,
  "status": "completed|failed",
  "files_modified": [],
  "build_passed": true,
  "tests_passed": true,
  "notes": "",
  "completed_at": "ISO-8601"
}
```
