---
name: network-career-leverage
description: Monthly career leverage analysis. Analyzes network contacts for mentorship gaps, collaboration potential, revenue contacts, reputation builders, and blind spots. Scheduled monthly.
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
user-invocable: true
---

# /network-career-leverage

Analyze your network for career development leverage opportunities.

## Context Loading

1. Load founder profile: `/srv/focus-flow/10_profile/founder-profile.json`
2. Load all contacts: `/srv/focus-flow/04_network/contacts/*.json`
3. Load active projects: `/srv/focus-flow/02_projects/active/*.json`
4. Load network opportunities: `GET http://localhost:3001/api/network/opportunities`

## Analysis Dimensions

### 1. Mentorship Gaps
- Which skills is the founder developing?
- Who in the network has expertise in those skills?
- Are there missing mentors for critical areas?

### 2. Collaboration Potential
- Which contacts align with multiple active projects?
- Who has complementary skills?
- Potential co-founder or partner matches?

### 3. Revenue Contacts
- Who is 1 conversation away from a deal?
- Who has budget authority in companies that match ICP?
- Warm intro chains to high-value targets?

### 4. Reputation Builders
- Who can provide testimonials?
- Who can offer speaking invitations?
- Who amplifies content in your target audience?

### 5. Blind Spots
- Industries/geographies with active projects but no connections
- Missing roles (advisors, investors, customers)
- Dormant high-value contacts needing reconnection

## Output

Write to `/srv/focus-flow/07_system/reports/career-leverage-{date}.md`:
- Executive summary (3-5 bullet points)
- Top 5 actionable recommendations with specific contact names
- Network gaps to fill
- Reconnection priorities

Also write JSON: `/srv/focus-flow/07_system/reports/career-leverage-{date}.json`:
```json
{
  "task_type": "career-leverage",
  "status": "completed",
  "mentorship_gaps": [...],
  "collaboration_opportunities": [...],
  "revenue_contacts": [...],
  "reputation_builders": [...],
  "blind_spots": [...],
  "top_recommendations": [...]
}
```
