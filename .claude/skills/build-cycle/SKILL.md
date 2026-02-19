---
name: build-cycle
description: Full build cycle — spec, scaffold, execute tasks, test, verify
model: opus
context: fork
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

# /build-cycle

Orchestrate a complete build cycle from validated decision to deployed feature.

## Arguments
- `decision_id` — the scale/iterate decision triggering this build

## Workflow
1. Generate build spec using build-scaffold framework
2. Break spec into ordered tasks
3. For each task: execute using build-execute framework
   - Sequential for dependent tasks
   - Parallel for independent tasks (via Task tool)
4. After all tasks: run full build verification
   - `npm run build` for frontend
   - `npm run build` for backend
   - `tsc --noEmit` for type checking
5. Run tests if available
6. Write build cycle report

## Output
```json
{
  "spec_id": "",
  "decision_id": "",
  "tasks_total": 0,
  "tasks_completed": 0,
  "tasks_failed": 0,
  "build_passed": true,
  "tests_passed": true,
  "files_modified": [],
  "completed_at": "ISO-8601"
}
```
