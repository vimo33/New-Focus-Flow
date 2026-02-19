---
name: validate-system
description: Validate all Nitara services are healthy
context: fork
model: haiku
allowed-tools: Read, Glob, Grep
---

# Validate Nitara System

Run a comprehensive health check across all Nitara services.

## Checks

1. **Backend service**
   - `systemctl is-active focus-flow-backend` — must be `active`
   - `curl -s http://localhost:3001/health` — must return `{"status":"healthy"}`
   - `curl -s http://localhost:3001/api/summary` — must return real counts

2. **Frontend service**
   - `systemctl is-active focus-flow-frontend` — must be `active`
   - `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/` — must be `200`

3. **Telegram bot service**
   - `systemctl is-active focus-flow-telegram` — report status (may not be running if tokens not configured)

4. **Vault integrity**
   - `/srv/focus-flow/00_inbox/raw/` directory exists and is readable
   - `/srv/focus-flow/01_tasks/` directory exists
   - `/srv/focus-flow/02_projects/active/` directory exists

5. **API endpoints**
   - `curl -s http://localhost:3001/api/inbox` — returns items array
   - `curl -s http://localhost:3001/api/tasks` — returns tasks array
   - `curl -s http://localhost:3001/api/projects` — returns projects array

6. **Disk space**
   - `df -h /` — report available space

7. **No crash loops**
   - `systemctl status focus-flow-backend` — RestartCount should be low
   - Verify clawdbot is not running: `systemctl is-active clawdbot` should fail

Report a summary table with PASS/FAIL for each check.
