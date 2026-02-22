---
name: marketing-analysis
description: Run marketing strategy analysis across active projects using content, SEO, pricing, and growth lenses
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /marketing-analysis

Analyze the marketing posture of active projects and produce actionable recommendations.

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. Read active projects: `curl http://localhost:3001/api/projects?status=active` or scan `02_projects/active/`
2. Read founder profile: `10_profile/founder-profile.json`
3. Read active directive: `07_system/directives/active-directive.md`
4. Read latest market research: `07_system/reports/research-market-*.json` (most recent)

## Analysis Lenses

For each active project with a live product or landing page:

### 1. Content Strategy
- Current content assets (blog, docs, social)
- Content gaps vs. competitors
- Recommended content calendar themes

### 2. SEO Posture
- Target keywords vs. current rankings (if available)
- Technical SEO issues (based on stack analysis)
- AI-search optimization opportunities

### 3. Pricing Analysis
- Current pricing model assessment
- Market comparison for similar products
- Pricing experiment suggestions

### 4. Growth Channels
- Channel-market fit assessment
- Low-cost acquisition opportunities
- Referral/viral mechanics potential

## Output

```json
{
  "task_type": "marketing-analysis",
  "status": "completed",
  "generated_at": "ISO-8601",
  "summary": "Brief text summary",
  "projects_analyzed": [
    {
      "project_id": "",
      "project_name": "",
      "content_score": 0,
      "seo_score": 0,
      "pricing_score": 0,
      "growth_score": 0,
      "top_recommendations": []
    }
  ],
  "cross_project_insights": [],
  "recommended_actions": [
    { "action": "", "project": "", "priority": "high|medium|low", "effort": "low|medium|high" }
  ]
}
```

Write to `07_system/reports/marketing-analysis-YYYY-MM-DD.json`.

## Behavioral Rules

1. Be specific and actionable — "Write 3 blog posts about X" not "Create content".
2. Prioritize by effort-to-impact ratio.
3. Connect recommendations to the founder's income generation goals.
4. Use Nitara's voice: direct, data-backed, no fluff.
