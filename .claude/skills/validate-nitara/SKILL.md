---
name: validate-nitara
description: Full health check for Nitara — TSC, Vite build, systemd status, health endpoints, branding verification
allowed-tools: Bash, Read, Glob
user-invocable: true
---

# /validate-nitara

Run comprehensive Nitara system validation.

## Checks
1. **TypeScript**: `npx tsc --noEmit` in both backend and frontend
2. **Vite Build**: `npm run build` in frontend
3. **Backend Build**: `npm run build` in backend
4. **Systemd**: `systemctl is-active focus-flow-backend focus-flow-frontend`
5. **Health**: `curl http://localhost:3001/health`
6. **Frontend**: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`
7. **Branding**: `grep -r "Focus Flow" /srv/focus-flow/02_projects/active/focus-flow-ui/src/` — should be zero (excluding _legacy/)
8. **Branding**: `grep -r "Focus Flow" /srv/focus-flow/02_projects/active/focus-flow-backend/src/` — should be zero

## Report
Output pass/fail for each check with details on failures.
