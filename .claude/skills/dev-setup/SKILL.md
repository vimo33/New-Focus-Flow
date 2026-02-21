---
name: dev-setup
description: Set up Claude Code agent team infrastructure for a development project. Creates orchestrator agent, specialist delegation, hooks, validators, and task structure. Use at the start of any multi-phase implementation.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
model: opus
context: fork
user-invocable: true
hooks:
  Stop:
    - hooks:
        - type: command
          command: "echo 'Dev setup complete. Run /dev-setup verify to check infrastructure.'"
---

# /dev-setup — Development Infrastructure Bootstrap

## Purpose

Bootstrap Claude Code agent team infrastructure for a multi-phase development project. Creates the orchestrator → specialist → validator pattern used across all Nitara builds.

## Arguments

`$ARGUMENTS` — project description or plan file path

## Workflow

### 1. Analyze the Plan

Read the plan (from `$ARGUMENTS` or the active context) and extract:
- **Phases**: Numbered implementation phases with dependencies
- **Backend work**: DB schema, services, routes, migrations
- **Frontend work**: Components, stores, routes
- **Skills**: New agent skills to create
- **Config**: Configuration files needed
- **Hooks**: Validation hooks needed

### 2. Create Agent Team Structure

For each project, create or update:

**Lead Orchestrator** (`.claude/agents/{project}-lead.md`):
```yaml
---
name: {project}-lead
description: Orchestrates {project} build. Delegates phases to specialist agents.
tools: Read, Write, Edit, Bash, Glob, Grep, Task, Skill
model: opus
skills: [list of relevant skills]
hooks:
  Stop:
    - hooks:
        - type: command
          command: ".claude/scripts/verify-builds.sh"
---
```

The orchestrator MUST:
- Break work into phases
- Delegate backend work to `nitara-backend` agent via Task tool
- Delegate frontend work to `nitara-frontend` agent via Task tool
- Run validation after each phase
- Never touch code directly — only coordinate

**Specialist agents** already exist:
- `nitara-backend` — Express/TypeScript/Drizzle backend development
- `nitara-frontend` — React/Vite/Tailwind/Zustand frontend development

### 3. Create Phase-Specific Skills

For each phase that needs autonomous execution:

```
.claude/skills/{project}-phase-N/SKILL.md
```

Each skill follows the standard template:
```yaml
---
name: {project}-phase-N
description: Phase N of {project}: {description}
context: fork
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: ".claude/hooks/validators/{relevant-validator}"
  Stop:
    - hooks:
        - type: command
          command: ".claude/scripts/verify-builds.sh"
---
```

### 4. Create Validation Hooks

For backend changes, ensure:
- TypeScript compiles (`npm run build` in Stop hook)
- API health check passes (`curl localhost:3001/health`)
- New routes respond correctly

For frontend changes, ensure:
- Vite build succeeds (`npm run build`)
- No TypeScript errors
- Design tokens used correctly

### 5. Create Task List

Output a structured task list with:
- Phase number and name
- Dependencies between phases
- Backend vs frontend split within each phase
- Estimated file count per task

### 6. Initialize Config

Create any configuration files needed:
- `07_system/config/` — JSON config files
- `07_system/agent/schedule.json` — Schedule entries for new skills

## Output

Write a setup report to stdout:
```
## Dev Setup Complete

### Agent Team
- Lead: {project}-lead.md
- Backend: nitara-backend (existing)
- Frontend: nitara-frontend (existing)

### Skills Created
- {list of new skills}

### Hooks Active
- {list of active hooks}

### Task Phases
1. {phase 1}: {files to create/modify}
2. {phase 2}: ...

### Ready to Build
Run: claude --agent {project}-lead "Execute Phase 1"
```

## Key Patterns

**Three-Tier Hierarchy**: Lead orchestrator → Specialist agent → Skill/validator
**One Agent, One Task**: Each agent is hyperspecialized
**Deterministic Validation**: Every agent has Stop hooks with validators
**Self-Correction**: Exit code 2 from validators triggers agent retry
**Context Isolation**: `context: fork` for all skills (separate context window)
