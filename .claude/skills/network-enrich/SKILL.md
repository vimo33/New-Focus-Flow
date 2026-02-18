---
name: network-enrich
description: Two-pass network enrichment — triage all contacts, deep-enrich top 20%
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /network-enrich

Enrich the professional network with external intelligence in two passes.

## Usage

```
/network-enrich [focus-area]
```

Optional `focus-area`: industry, project, or specific contact IDs to prioritize.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. Read contacts: `curl http://localhost:3001/api/network/contacts`
2. Read active projects: `curl http://localhost:3001/api/projects?status=active`
3. Read active directive: `07_system/directives/active-directive.md`
4. Read previous enrichment report (if any): `07_system/reports/network-enrich-*.json`

## Execution

### Pass 1: Triage (all contacts)

Score every contact by strategic value to current projects and active directive:

For each contact, compute a **triage score** (0-10) based on:
- **Industry relevance** (0-3): Does their industry align with any active project?
- **Seniority leverage** (0-2): C-suite/founder contacts score higher for partnership/investment
- **Relationship warmth** (0-2): Strong > moderate > weak > dormant
- **Recency** (0-1.5): Recently contacted scores higher
- **Business value** (0-1.5): High > medium > low

Write triage scores to each contact's `project_relevance` field via:
```bash
curl -X PUT http://localhost:3001/api/network/contacts/{id} \
  -H "Content-Type: application/json" \
  -d '{"project_relevance": {"proj-1": 7, "proj-2": 3}, "warmth_score": 65}'
```

### Pass 2: Deep Enrichment (top 20%)

For the top 20% by triage score (minimum 5 contacts, maximum 20):

1. **WebSearch** for recent news, funding rounds, job changes
2. **Assess company relevance** to active projects
3. **Draft outreach angle** — personalized reason to reconnect
4. **Update contact** with enrichment data:

```bash
curl -X PUT http://localhost:3001/api/network/contacts/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "enrichment_date": "2026-02-18",
    "enrichment_data": {
      "recent_news": ["News headline 1", "News headline 2"],
      "company_funding": "Series B, $15M in Jan 2026",
      "job_changes": ["Promoted to VP Engineering in Dec 2025"],
      "outreach_angle": "Congrats on the Series B. Your focus on X aligns with..."
    },
    "industry": "AI/ML",
    "seniority": "vp"
  }'
```

### Pass 3: Gap Analysis

Identify missing contacts that would be strategically valuable:
- Industries represented in projects but not in network
- Roles needed (advisors, potential customers, distribution partners)
- Geographic gaps (markets being targeted without local connections)

## Output

```json
{
  "task_type": "network-enrich",
  "status": "complete|partial|failed",
  "total_contacts": 0,
  "contacts_triaged": 0,
  "contacts_deep_enriched": 0,
  "top_enriched": [{"name": "", "triage_score": 0, "outreach_angle": ""}],
  "network_gaps": [{"gap_type": "", "description": "", "suggested_action": ""}],
  "notes": ""
}
```

Write to `07_system/reports/network-enrich-YYYY-MM-DD.json`.
