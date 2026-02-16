---
name: deploy-nitara
description: Build both packages, restart services, verify health endpoints
allowed-tools: Bash, Read
user-invocable: true
---

# /deploy-nitara

Build and deploy Nitara.

## Steps
1. Build backend: `cd /srv/focus-flow/02_projects/active/focus-flow-backend && npm run build`
2. Build frontend: `cd /srv/focus-flow/02_projects/active/focus-flow-ui && npm run build`
3. Restart backend: `systemctl restart focus-flow-backend`
4. Restart frontend: `systemctl restart focus-flow-frontend`
5. Wait 3 seconds for services to start
6. Health check backend: `curl http://localhost:3001/health`
7. Health check frontend: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`
8. Report success or failure with details
