---
name: run-tests
description: Build all services and verify health endpoints
context: fork
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
user-invocable: true
---

# Run Tests Skill

Build all Nitara services and verify they are healthy.

## Steps

1. **Build backend**:
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-backend && npm run build
   ```
   Verify exit code 0 (no TypeScript errors).

2. **Build frontend**:
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-ui && npm run build
   ```
   Verify exit code 0 (no TypeScript or Vite errors).

3. **Restart services**:
   ```bash
   systemctl restart focus-flow-backend focus-flow-frontend
   ```
   Wait 2 seconds for services to start.

4. **Health checks**:
   - `curl -sf http://localhost:3001/health` - Backend health
   - `curl -sf -o /dev/null -w "%{http_code}" http://localhost:5173` - Frontend serving
   - `curl -sf http://localhost:3001/api/uploads` - Upload endpoint
   - `curl -sf http://localhost:3001/api/inbox/counts` - Inbox endpoint
   - `curl -sf http://localhost:3001/api/projects?status=active` - Projects endpoint

5. **Service status**:
   ```bash
   systemctl is-active focus-flow-backend focus-flow-frontend
   ```

6. **Report results**: Summary table with PASS/FAIL for each check.
