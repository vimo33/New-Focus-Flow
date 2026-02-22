---
name: outreach-draft
description: Generate personalized outreach messages for high-value network connections
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, Write
---

# /outreach-draft

Generate personalized outreach messages for strategically valuable network connections.

## Usage

```
/outreach-draft [contact-id|top-n]
```

- `contact-id`: Draft outreach for a specific contact
- `top-n`: Draft for top N contacts by strategic value (default: 3)

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Context Loading

1. Read contacts: `curl http://localhost:3001/api/network/contacts`
2. Read latest enrichment report: `07_system/reports/network-enrich-*.json`
3. Read latest xref report: `07_system/reports/network-portfolio-xref-*.json`
4. Read founder profile: `10_profile/founder-profile.json`
5. Read active directive: `07_system/directives/active-directive.md`

## Outreach Message Guidelines

Each message must be:
- **Personalized**: Reference something specific about the contact (recent news, shared connection, their work)
- **Value-first**: Lead with what you can offer, not what you want
- **Contextual**: Explain why now (timing signal from enrichment data)
- **Concise**: Under 150 words for email, under 50 words for LinkedIn
- **Authentic**: Match the founder's voice and Swiss business norms (trust-first, not pushy)

### Copywriting Frameworks
When drafting messages, apply the AIDA framework (Attention, Interest, Desire, Action) for professional outreach. Reference `copy-david-ogilvy` for headline principles and `copy-dan-kennedy` for direct response patterns. Adapt to casual reconnection tone for dormant contacts.

## Message Structure

1. **Opening hook**: Something personal or specific (not "Hope you're doing well")
2. **Context bridge**: Why you're reaching out now (mutual interest, their recent news, shared challenge)
3. **Value proposition**: What you bring to the table
4. **Soft ask**: Low-commitment next step (coffee, quick call, feedback request)

## Execution

### Step 1: Select Target Contacts

If no specific contact:
- Use enrichment triage scores + xref relevance
- Prioritize contacts with:
  - High triage score + recent enrichment data
  - Project relevance >= 7
  - Relationship strength: moderate or dormant (not already strong)
  - Warm connection available (intro chain exists)

### Step 2: Research Context

For each target:
- Read enrichment data (recent_news, company_funding, job_changes)
- Read outreach_angle from enrichment
- WebSearch for any additional recent context
- Check if there's a mutual connection for warm intro

### Step 3: Draft Messages

For each target, draft 2 versions:
- **Email** (formal, 100-150 words)
- **LinkedIn message** (casual, 30-50 words)

If an intro chain exists, also draft:
- **Intro request** to the mutual connection (50-80 words)

### Step 4: Telegram Delivery

Compile all drafts into a Telegram-friendly format for one-tap review.

## Output

```json
{
  "task_type": "outreach-draft",
  "status": "complete|partial|failed",
  "drafts": [
    {
      "contact_id": "",
      "contact_name": "",
      "reason": "",
      "email_draft": "",
      "linkedin_draft": "",
      "intro_request": "",
      "intro_via": "",
      "priority": "high|medium|low"
    }
  ],
  "total_drafts": 0,
  "notes": ""
}
```

Write to `07_system/reports/outreach-draft-YYYY-MM-DD.json`.
