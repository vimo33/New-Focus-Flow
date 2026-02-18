---
name: network-portfolio-xref
description: Cross-reference network contacts with active projects for strategic leverage
model: sonnet
allowed-tools: Read, Glob, Grep, Write, Bash
---

# /network-portfolio-xref

Cross-reference the professional network with active projects to identify warm paths, beta testers, advisors, and distribution partners.

## Usage

```
/network-portfolio-xref [project-id]
```

If `project-id` specified, deep-dive one project. Otherwise, analyze all active projects.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. Read active projects: `curl http://localhost:3001/api/projects?status=active`
2. Read contacts: `curl http://localhost:3001/api/network/contacts`
3. Read latest portfolio analysis: `07_system/reports/portfolio-analysis-*.json`
4. Read latest network analysis: `07_system/reports/network-analysis-*.json`

## Execution

### Step 1: Build Cross-Reference Matrix

For each active project, use the backend API:
```bash
curl http://localhost:3001/api/network/xref/{projectId}
```

This returns contacts relevant to each project with relevance scores and value types.

### Step 2: Identify High-Value Connections

For each project, categorize contacts by value type:
- **Early customers**: Contacts who could become paying users/clients
- **Beta testers**: Contacts willing to test and provide feedback
- **Advisors**: Domain experts who could guide strategy
- **Distribution partners**: Contacts who could help with reach
- **Investors**: Contacts who might fund the project

### Step 3: Network Leverage Scoring

For each project, compute a network leverage score (0-10):
```bash
curl http://localhost:3001/api/network/leverage/{projectId}
```

A project with warm paths to early design partners scores materially higher on feasibility than one with zero network support.

### Step 4: Introduction Chain Analysis

For the most strategically valuable target contacts (top 3 per project):
```bash
curl http://localhost:3001/api/network/intros/{contactId}
```

Map two-hop introduction paths through existing strong connections.

### Step 5: Portfolio Impact Assessment

Cross-reference the network leverage scores with the latest portfolio analysis:
- Which projects gain the most from network support?
- Which projects have network gaps that need filling?
- Are there projects where network leverage could tip the BUILD-NEXT decision?

## Output

```json
{
  "task_type": "network-portfolio-xref",
  "status": "complete|partial|failed",
  "date": "",
  "projects_analyzed": 0,
  "cross_references": [
    {
      "project_id": "",
      "project_title": "",
      "network_leverage_score": 0,
      "relevant_contacts": 0,
      "potential_customers": 0,
      "advisors": 0,
      "warm_paths": 0,
      "top_connections": [{"name": "", "value_type": "", "relevance": 0}],
      "intro_chains": [{"target": "", "via": "", "strength": ""}]
    }
  ],
  "portfolio_impact": {
    "build_next_network_boost": "",
    "projects_with_zero_network": [],
    "highest_leverage_project": ""
  },
  "recommendations": [],
  "notes": ""
}
```

Write to `07_system/reports/network-portfolio-xref-YYYY-MM-DD.json`.
