---
name: deploy
description: Build and deploy Nitara services
context: fork
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

# Deploy Nitara

Build and deploy all Nitara services with health verification.

## Steps

1. **Build backend**
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-backend && npm run build
   ```

2. **Build frontend**
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-ui && npm run build
   ```

3. **Build telegram bot**
   ```bash
   cd /srv/focus-flow/02_projects/active/focus-flow-telegram-bot && npm run build
   ```

4. **Restart services**
   ```bash
   systemctl restart focus-flow-backend focus-flow-frontend focus-flow-telegram
   ```

5. **Health checks** (wait 3 seconds after restart)
   - `curl -s http://localhost:3001/health` — expect `{"status":"healthy"}`
   - `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/` — expect `200`
   - `systemctl is-active focus-flow-backend focus-flow-frontend` — expect `active`

6. **Verify real data**
   - `curl -s http://localhost:3001/api/summary` — expect non-zero inbox counts

Report the results of each step. If any build or health check fails, stop and report the error.
