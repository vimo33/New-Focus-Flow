# Autonomy & Safety (HITL)

## Autonomy levels (per project)
- Manual: Nitara proposes; you execute
- Assisted: Nitara executes low-risk tasks; approvals for medium/high
- Auto: Nitara executes within budgets/allowlists; approvals for irreversible actions

## Trust tiers (per skill/task)
- Tier 1: auto-approve (low risk)
- Tier 2: delayed auto-approve (medium risk)
- Tier 3: explicit approval required (high risk)

## Action risk categories
- A: local read-only (safe)
- B: local writes (guardrails + loop detection)
- C: spending changes (budget gate)
- D: external comms (email/DM/posting) — always approval
- E: data deletion / destructive actions — typed confirmation + approval
- F: security-sensitive (keys, auth, permissions) — approval + audit

## UI requirements
- Approvals queue must show:
  - action summary
  - risk tier + why
  - evidence / rationale
  - “approve once” vs “approve always for this scope”
  - rollback plan (if possible)
