# Data Model (v0)

This is the minimum schema to make the UI real. You can implement it file-first (JSON) and later migrate to DB.

## Project
- id, name, status (active/parked/killed), stage
- autonomy_level (manual/assisted/auto)
- goals: {primary_kpi, target, deadline}
- constraints: {budget_usd_per_day, founder_hours_per_week, risk_tolerance}
- tags, created_at, updated_at

## Hypothesis
- id, project_id, statement
- type (problem/solution/channel/pricing/moat)
- confidence (0-1)
- evidence_refs[] (links to signals)
- owner_agent

## Experiment
- id, project_id, hypothesis_id
- metric_name, metric_definition
- success_rule (decision rule)
- start_at, end_at
- status (draft/running/paused/completed)
- results: {baseline, variant, lift, p_value, sample_size}
- decision (scale/iterate/pivot/park/kill) + decision_rationale

## AgentRun
- id, project_id, mode (think/validate/build/grow/leverage)
- agents[] (names), tools_used[]
- status, started_at, ended_at
- outputs[] (report paths / artifacts)
- approvals_required[] (if any)

## MemoryItem
- id, type (note/report/transcript/decision/playbook)
- project_id (optional)
- title, content_ref
- embeddings_ref (qdrant)
- created_at, source (voice/upload/web/manual)
