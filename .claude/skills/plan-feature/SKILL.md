---
name: plan-feature
description: Read uploaded plan documents and break them into development tasks
allowed-tools: Read, Glob, Grep, Bash, Task
user-invocable: true
---

# Plan Feature Skill

Read an uploaded plan document from the vault and break it into structured development tasks.

## Steps

1. **Find the document**: Check `/srv/focus-flow/00_inbox/raw/uploads/` for the specified file (or list available files if none specified)
2. **Parse the document**: Read the file content. For .docx files, use `python3 -c "import docx; ..."` or `libreoffice --convert-to txt` to extract text. For .md/.txt/.json, read directly.
3. **Analyze requirements**: Identify features, tasks, milestones, and dependencies from the document
4. **Create task breakdown**: For each identified feature/task:
   - Determine if it needs backend work (routes, services, models)
   - Determine if it needs frontend work (components, API methods, routes)
   - Estimate complexity (simple/moderate/complex)
   - Identify dependencies between tasks
5. **Output structured plan**: Present the task list using TaskCreate for tracking, organized by priority and dependency order
6. **Suggest implementation order**: Recommend which tasks to tackle first based on dependencies and value

## Conventions

- Follow the existing Focus Flow architecture (VaultService, Express routes, React components with Tailwind)
- Backend at `/srv/focus-flow/02_projects/active/focus-flow-backend/`
- Frontend at `/srv/focus-flow/02_projects/active/focus-flow-ui/`
- Use the `/add-feature` skill pattern for each identified feature
