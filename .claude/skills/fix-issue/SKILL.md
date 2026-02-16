---
name: fix-issue
description: Debug and fix an issue in Nitara
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Fix Issue in Nitara

Systematic approach to debugging and fixing issues.

## Process

1. **Reproduce the issue**
   - Check service status: `systemctl status focus-flow-backend focus-flow-frontend`
   - Check logs: `journalctl -u focus-flow-backend --no-pager -n 50`
   - Test endpoints: `curl -s http://localhost:3001/health`
   - Check frontend: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`

2. **Diagnose**
   - Read relevant source files
   - Check for TypeScript compilation errors: `cd <service-dir> && npx tsc --noEmit`
   - Check for runtime errors in journal logs
   - Trace the data flow from request to response

3. **Fix**
   - Make the minimal change needed to resolve the issue
   - Follow existing code patterns and conventions
   - Don't refactor unrelated code

4. **Test the fix**
   - Build: `npm run build`
   - Restart: `systemctl restart focus-flow-<service>`
   - Verify the issue is resolved
   - Verify no regressions (check health endpoint, summary endpoint)

5. **Report**
   - Describe what was wrong
   - Describe what was changed
   - Confirm the fix works
