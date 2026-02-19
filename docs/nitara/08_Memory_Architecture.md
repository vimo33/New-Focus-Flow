# Memory Architecture (v0)

Nitara’s memory needs three layers, because reality is messy:

## Layer 1 — Operational “truth” (structured)
For things the UI needs to query quickly:
- projects, ideas, experiments, runs, approvals, budgets, schedules
- stored as JSON (file-first) or SQLite/Postgres later

**Why:** deterministic, auditable, easy to diff + back up.

## Layer 2 — Semantic memory (vector)
For “find related things”, “what did we learn last time”, “similar experiments”.
- Qdrant (or equivalent) for embeddings
- chunk sources: reports, transcripts, docs, code comments, meeting notes, web research

**Why:** retrieval across noisy text is the whole superpower.

## Layer 3 — Summarized memory (digest)
For agent context windows:
- `knowledge-digest-full.md`
- `knowledge-digest-compact.md`
- per-project digests: `projects/<id>/digest.md`

**Why:** agents need **short, curated context**, not the whole universe.

## File layout (aligned to the Nitara system guide)
- `07_system/agent/` for queue, approvals, budgets, schedules, state
- `07_system/reports/` for MD+JSON outputs (paired)
- `10_profile/` for founder profile + network contacts
- optional: `07_system/memory/` for event logs + digests

## Memory write policy
Every “important” completion generates:
1) a structured JSON update (project/experiment/run)
2) a human-readable markdown artifact (report/postmortem/playbook)
3) vector embeddings for semantic retrieval
4) digest update (compact + project digest)

## Privacy
- keep sensitive keys in `07_system/secrets/`
- treat network and personal notes as “restricted” retrieval (explicit opt-in for agent access)
