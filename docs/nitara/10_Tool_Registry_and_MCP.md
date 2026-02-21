# Tool Registry + MCP Plan

Nitara should treat tools like “employees”:
- every tool has a capability profile
- permissions (scopes) are explicit
- budgets + rate limits apply
- actions are logged and auditable

## Tool Registry screens
- Installed tools
- Available MCP catalog (search + ratings + “value score”)
- Permissions matrix (tool x action risk category)
- Connection health (auth status, last run, error rate)

## Recommendation loop
1. Identify bottleneck (e.g., research, outreach, analytics)
2. Search MCPs/repos
3. Score candidates by:
   - leverage (time saved)
   - reliability
   - security footprint
   - maintenance status
4. Install in a sandbox profile
5. Run a trial task
6. Promote to “trusted tool” or remove

## Pencil/Claude note
Represent tools as JSON descriptors so Claude can wire integrations consistently.
