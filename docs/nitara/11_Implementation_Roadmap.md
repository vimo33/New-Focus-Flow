# Implementation Roadmap (What to implement first)

This sequence minimizes risk and maximizes “something real” fast.

## Phase 0 — Foundation (1–3 days)
- Add a **Nitara UI shell** (bottom dock + mode routing)
- Establish design tokens + component primitives (cards, badges, charts, dock)
- Create the “context pack” files in repo (`/docs/nitara/`)
- Add placeholder data adapters (file-based JSON mocks)

Deliverable: UI shell renders, navigation works, screens load with mock data.

## Phase 1 — Portfolio core (Think) (3–7 days)
- Projects + Ideas mapped into “Venture Stack”
- Portfolio scoring pipeline (even if v0 heuristic)
- Project detail page: success definition + constraints + autonomy slider
- Approval queue UI (can be stubbed)

Deliverable: You can add ventures, score them, prioritize “build-next”.

## Phase 2 — Experiment system (Validate) (5–10 days)
- Experiment objects + CRUD
- Experiment Stack UI + Decision Gate UI
- Learning → Playbook extraction (writes markdown + JSON)
- Basic analytics charts (conversion, retention, etc.)

Deliverable: You can run an experiment, see metrics, decide scale/pivot/kill.

## Phase 3 — Execution loop (Build) (5–10 days)
- “Autonomous Builder” UI wired to the queue/orchestrator
- Agent run log viewer + filters
- HITL approvals surfaced in UI (and/or Telegram)

Deliverable: Nitara can execute build tasks and you can approve milestones.

## Phase 4 — Resources + Simulation (Grow) (5–10 days)
- Resource allocation model (time/compute/budget/attention)
- What-if simulation UI (scenario compare)
- Cross-project KPI dashboard

Deliverable: portfolio rebalancing becomes a *repeatable* weekly ritual.

## Phase 5 — Tool registry + Leverage (ongoing)
- MCP/tool catalog and permissioning
- CRM/outreach loops + network mapping
- Fundraising module stays optional; treat as a “Leverage playbook”

Deliverable: compound leverage without turning the product into “investor CRM only”.
