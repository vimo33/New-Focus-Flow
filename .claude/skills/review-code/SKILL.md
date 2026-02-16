---
name: review-code
description: Perform a read-only code review of recent changes or specific files
allowed-tools: Read, Glob, Grep, Bash
user-invocable: true
---

# Review Code Skill

Perform a thorough code review of specified files or recent changes. This is a **read-only** operation.

## Steps

1. **Identify scope**: If a file path or feature is specified, review those files. Otherwise, check recent git changes or recently modified files.
2. **Read the code**: Read all relevant files in the change set.
3. **Check for issues**:
   - Security vulnerabilities (injection, XSS, path traversal, secret leaks)
   - Error handling gaps (missing try/catch, unhandled promise rejections)
   - Type safety issues (any types, missing null checks)
   - Pattern consistency (does it follow VaultService patterns, Express route patterns, React component patterns?)
   - Performance concerns (N+1 queries, missing pagination, unbounded lists)
4. **Check conventions**:
   - Backend: Express 5 patterns, Router-based routes, VaultService for data access
   - Frontend: Named exports, lazy loading, Tailwind dark theme, api.ts for API calls
   - Types defined appropriately (backend: models/types.ts, frontend: services/api.ts)
5. **Report findings**: Present a summary with:
   - Critical issues (must fix)
   - Warnings (should fix)
   - Suggestions (nice to have)
   - Overall assessment

## Key Paths

- Backend: `/srv/focus-flow/02_projects/active/focus-flow-backend/src/`
- Frontend: `/srv/focus-flow/02_projects/active/focus-flow-ui/src/`
