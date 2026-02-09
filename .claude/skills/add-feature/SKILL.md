---
name: add-feature
description: Add a new feature to Focus Flow following project conventions
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

# Add Feature to Focus Flow

Guide for adding a new feature following project conventions.

## Process

1. **Understand the request** — What feature is being added? Which services does it touch?

2. **Read existing patterns**
   - Backend routes: `ls /srv/focus-flow/02_projects/active/focus-flow-backend/src/routes/`
   - Frontend components: `ls /srv/focus-flow/02_projects/active/focus-flow-ui/src/components/`
   - VaultService methods: Read `vault.service.ts` for data access patterns
   - Types: Read `models/types.ts` (backend) and `services/api.ts` (frontend types)

3. **Implement backend** (if needed)
   - Add types to `src/models/types.ts`
   - Add VaultService methods to `src/services/vault.service.ts`
   - Create route file at `src/routes/<feature>.routes.ts`
   - Register route in `src/index.ts`
   - Build: `cd /srv/focus-flow/02_projects/active/focus-flow-backend && npm run build`

4. **Implement frontend** (if needed)
   - Add types to `src/services/api.ts`
   - Add API methods to the `VaultAPI` class
   - Create component at `src/components/<Feature>/`
   - Add route in `src/App.tsx`
   - Build: `cd /srv/focus-flow/02_projects/active/focus-flow-ui && npm run build`

5. **Deploy**
   - `systemctl restart focus-flow-backend focus-flow-frontend`
   - Verify with health checks

6. **Test**
   - Test the new endpoint with curl
   - Verify the UI loads and shows the new feature
