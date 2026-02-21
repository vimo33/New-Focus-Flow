# Nitara System Deep Analysis

> **Generated**: 2026-02-21 | **System Version**: Post-autonomous-upgrade
> **Purpose**: Definitive reference for what exists, how it connects, what works, and what doesn't.

---

## Table of Contents

1. [User Flows](#1-user-flows)
2. [How Memory Links to Flows](#2-how-memory-links-to-flows)
3. [Project Lifecycle](#3-project-lifecycle)
4. [What's Fully Set Up vs. What's Not](#4-whats-fully-set-up-vs-whats-not)
5. [Weekly Autonomous Rhythm](#5-weekly-autonomous-rhythm)

---

## 1. User Flows

### Flow A: Morning Briefing (Fully Automated)

```
Schedule (7am weekdays) → task-queue polls → enqueues morning-briefing skill
  → Claude CLI spawns nitara-think agent
  → Reads knowledge-digest, project states, pending approvals
  → Generates briefing → writes to 07_system/agent/briefings/
  → state.json updated with briefing_id
  → Telegram notification sent (telegram-notify.sh stop hook)
  → Frontend SSE pushes briefing to MorningBriefing canvas
```

**Status**: **Working** — 7 consecutive briefings generated (Feb 15–21). Latest briefing ID: `brf-20260221-845753`. Telegram notification possible (real tokens present in `.telegram.env`).

**Key files**:
- Skill: `.claude/skills/morning-briefing.md`
- Output: `07_system/agent/briefings/{date}.json`
- State tracking: `07_system/agent/state.json` → `current_briefing_id`

---

### Flow B: Founder Profiling via Telegram (HITL Loop)

```
Schedule (10am daily) → profiling-question skill
  → Reads profiling-checklist.json (currently 16% complete)
  → Identifies lowest-completion domain
  → Writes question JSON to pending-questions/
  → File watcher in telegram-hitl.service.ts detects new file
  → Sends question to Telegram (inline buttons or free text)
  → User responds → answer written to answered-questions/
  → Profiling checklist updated with new data
  → Knowledge digest regenerated with richer founder context
```

**Status**: **Partially working** — Question generation works (5 questions generated Feb 18–19), 2 of 5 answered. Telegram tokens are real but bot delivery has not been confirmed end-to-end. Profiling checklist at 16% overall completeness.

**Current profiling state** (last updated 2026-02-16):

| Domain | Completeness | Known Data |
|--------|-------------|------------|
| Founder Identity | 30% | Name: Vikas Mohan (Vimo), Location: Zurich |
| Skills & Expertise | 33% | Technical skills documented |
| Financial Reality | 28% | 2 income streams, CHF 7k/mo |
| Portfolio Depth | 13% | Projects exist, not deeply assessed |
| Network Intelligence | **0%** | No contacts imported |
| Strategic Context | 7% | Competitive advantage partially noted |
| Operational Reality | **0%** | Daily tools, time allocation unknown |

**Key files**:
- Skill: `.claude/skills/profiling-question.md`
- Checklist: `07_system/agent/profiling-checklist.json`
- Pending Qs: `07_system/agent/pending-questions/` (3 unanswered)
- Answered Qs: `07_system/agent/answered-questions/` (2 answered)

---

### Flow C: Portfolio Analysis (Weekly Strategic Review)

```
Schedule (Monday 8am) → portfolio-analysis skill (trust tier 2)
  → nitara-portfolio-analyst (Opus) spawns
  → Reads: knowledge-digest-full.md, all project JSONs, financial data
  → 6-dimension scoring: revenue proximity (27%), market validation (18%),
    skill alignment (13%), effort-to-revenue (18%), strategic fit (14%),
    network leverage (10%)
  → Generates recommendations: BUILD-NEXT / INVEST / PIVOT / PARK / KILL
  → Writes report to 07_system/reports/portfolio-analysis-{date}.json + .md
  → POSTs insights to /api/memory/agent (semantic memory)
  → validate-analysis.sh evaluates against hidden scenario file
  → task-result-writer.sh posts completion to /api/queue/complete
  → Telegram notification with summary
```

**Status**: **Structurally complete** — Last ran Feb 18 (report exists at `07_system/reports/portfolio-analysis-2026-02-18.json` + `.md`). Depends on queue being active and work plan approval.

**Key files**:
- Skill: `.claude/skills/portfolio-analysis.md`
- Agent: `.claude/agents/nitara-portfolio-analyst.md` (Opus)
- Reports: `07_system/reports/portfolio-analysis-{date}.*`
- Validation: `.claude/scripts/validate-analysis.sh`

---

### Flow D: Network Intelligence (Contact → Revenue Mapping)

```
User imports LinkedIn ZIP or Gmail CSV → network-import skill
  → Parse → Deduplicate (Levenshtein 0.85) → Merge → Write to 09_crm/
  → network-analyze skill (Tuesday 9am schedule)
  → nitara-network-analyst reads contacts, projects, financial targets
  → Maps: revenue-adjacent contacts, industry clusters, introduction chains (2-hop)
  → Identifies dormant high-value connections
  → Enrichment signals (job changes, funding rounds)
  → network-enrich (Thursday 10pm) → deep enrich top 20%
  → network-portfolio-xref (Wednesday 10am) → cross-ref contacts ↔ projects
```

**Status**: **Skills execute but no contact data ingested.** Network analysis and enrichment reports exist (`07_system/reports/network-analysis-2026-02-19.*`, `network-enrich-2026-02-19.*`) but `contact_count: 0` in knowledge digest stats. The skills run on schedule but produce empty/template outputs without imported contacts. Network Intelligence profiling domain at 0%.

**Key files**:
- Skills: `.claude/skills/network-import.md`, `network-analyze.md`, `network-enrich.md`, `network-portfolio-xref.md`, `network-career-leverage.md`
- Agent: `.claude/agents/nitara-network-analyst.md` (Sonnet)
- CRM data: `09_crm/` (currently empty)

---

### Flow E: Idea → Council → Validation → Build Pipeline

```
Founder captures idea (inbox, Telegram, or PWA)
  → AI classification routes to 03_ideas/inbox/
  → think-intake-idea skill structures the idea (problem, ICP, constraints)
  → Council evaluation (ai-council.service.ts):
    - 3-5 council members evaluate independently (parallel)
    - Each scores on: feasibility, market, differentiation, timing, UX
    - Synthesis produces composite score + recommendation
    - Verdict written to 07_system/council-verdicts/
  → If APPROVED (score > threshold):
    → Project created in 02_projects/active/
    → think-generate-hypotheses produces testable assumptions
    → validate-create-experiment designs cheapest/fastest tests
    → Validation sprint orchestrator groups 3-5 uncertain projects
    → validate-measure-experiment collects results
    → validate-decision-gate: SCALE / ITERATE / PIVOT / PARK / KILL
  → If SCALE:
    → build-mvp orchestrates 4-phase build
      Phase 1: Architecture design (Opus)
      Phase 2: Parallel build (backend + frontend agents)
      Phase 3: Integration (sequential)
      Phase 4: Quality gates (builds pass, no secrets, health 200)
    → 2-hour session timeout enforced by build-guard.sh
  → If KILL/PARK:
    → leverage-extract-playbook captures reusable patterns
    → Project moved to 02_projects/paused/ or completed/
```

**Status**: **Council evaluation works** — 17 total verdicts across two storage locations. Mirari V5.0 was evaluated as `needs_more_info` at 5.5/10.

**Verdict storage** (two formats, two locations):
- **Standalone files** (new `EnhancedCouncilVerdict` format): `07_system/council-verdicts/vrd-{YYYYMMDD}-{suffix}.json` — 2 files
- **Embedded in project JSONs** (legacy `CouncilVerdict` format): `02_projects/active/project-*.json` → `artifacts.council_verdict` — 15 projects have embedded verdicts
- Backend normalizes both at query time via `councilFramework.listVerdicts()` (embedded get synthetic ID `embedded-{projectId}`)

**Standalone verdicts:**

| File | Subject | Verdict | Score |
|------|---------|---------|-------|
| `vrd-20260214-559501.json` | AI-powered meeting summarizer | `reconsider` | 4.7 |
| `vrd-20260217-mirari-v5.json` | Mirari (AURA - Zurich Temporal Lens) | `needs_more_info` | 5.5 |

**Embedded verdicts** (15 in project JSONs):

| Project | Recommendation | Score |
|---------|---------------|-------|
| Bramha ESG (×2) | needs-info / reject | 5.6 / 4.8 |
| Overture (×2) | reject / needs-info | 4.8 / 5.0 |
| Global Foundation (×2) | reject / needs-info | 4.6 / 5.6 |
| Focus Flow OS (×2) | reject / needs-info | 3.6 / null |
| Sentio | reject | 4.0 |
| Jass Card design | reject | 3.6 |
| ATX | reject | 4.6 |
| AURA - Discover your city | needs-info | 5.7 |
| AURA AI Travel Guide | reject | 4.6 |
| Kavach AI | needs-info | 5.4 |
| Mirari (AURA) | needs-info | 5.0 |

**5 decision type configs** at `07_system/council-configs/`: `idea_validation`, `architecture_review`, `go_to_market`, `pricing`, `risk_assessment` — each with agent selection prompts, synthesis prompts, dimension weights, and verdict thresholds.

Build pipeline is defined but untested end-to-end. Validation engine skills exist but no experiments have been run.

**Key files**:
- Creation pipeline: `ai/council-composer.ts` → `ai/ai-council.ts` → `ai/council-synthesis.ts` → `ai/council-framework.ts`
- Routes: `routes/council.routes.ts` (`POST /api/council/evaluate`, `GET /api/council/verdicts`, `POST /api/council/:id/apply-actions`)
- Frontend: `CouncilEvaluationCanvas.tsx` (full verdict display), `ProjectDetailCanvas.tsx` (inline summary)
- Types: `models/types.ts:502-594` (`EnhancedCouncilVerdict`, `VerdictLevel`, `DimensionScore`, `RecommendedAction`)
- Skills: `think-intake-idea.md`, `think-generate-hypotheses.md`, `think-score-project.md`, `validate-create-experiment.md`, `validate-measure-experiment.md`, `validate-decision-gate.md`, `validate-sprint-orchestrator.md`, `validate-portfolio-prune.md`, `build-mvp.md`
- Agents: `nitara-think.md` (Opus), `nitara-validate.md` (Opus), `nitara-builder.md` (Opus), `nitara-experimenter.md` (Sonnet)
- Verdicts: `07_system/council-verdicts/` (standalone) + `02_projects/active/project-*.json` (embedded)
- Configs: `07_system/council-configs/` (5 decision types)
- Build guard: `.claude/scripts/build-guard.sh`

---

### Flow F: Work Plan Approval (Human-in-the-Loop)

```
Agent generates daily work plan → state.json updated
  → Items classified by trust tier (1/2/3)
  → Tier 1 (read_vault): auto-approved
  → Tier 2 (analysis): auto-approved after hitl_timeout_hours
  → Tier 3 (council_evaluation, portfolio_triage): requires explicit approval
  → Approval via:
    1. Frontend: ApprovalQueue canvas → POST /api/agent/work-plan/approve
    2. Telegram: /approve {id} command
    3. Timeout: Tier 2 auto-approves, Tier 3 auto-rejects
  → Approved items enqueued to task queue
  → Execution monitored via /api/agent/events SSE stream
```

**Status**: **Blocked on user approval.** Current work plan `wp-20260220-443642` (created Feb 20) has 7 items, 0 executed. No actions have been approved since system activation. The queue has accumulated 31 unprocessed tasks with 9 archived.

**Current work plan items** (Feb 20):

| Item | Trust Tier | Priority | Status |
|------|-----------|----------|--------|
| Process 5 pending council verdicts | 3 (critical) | Critical | Awaiting approval |
| Execute Mirari validation tasks | 3 (critical) | Critical | Awaiting approval |
| Consolidate 7 duplicate projects | 3 (high) | High | Awaiting approval |
| Create tasks from processed verdicts | 2 (high) | High | Awaiting approval |
| Portfolio triage (19 projects) | 3 (high) | High | Awaiting approval |
| Read vault: Multiplium | 1 | Normal | Auto-approved |
| Read vault: Bramha | 1 | Normal | Auto-approved |

**Key files**:
- State: `07_system/agent/state.json`
- Queue: `07_system/agent/queue/` (31 pending tasks)
- Archive: `07_system/agent/queue/archive/` (9 archived)

---

### Flow G: Telegram Conversation (Direct Chat)

```
User sends text message to Telegram bot
  → telegram-hitl.service.ts receives via long polling
  → If command (/status, /tasks, /budget, etc.) → direct response
  → If onboarding active → route to onboarding session handler
  → If reply to pending question → record answer, resume paused task
  → Otherwise → orchestratorService.chat():
    - Loads NITARA_SOUL.md personality
    - Loads knowledge digest (tiered by context)
    - Loads active directive, founder profile
    - Generates response with tool execution loop (up to 5 rounds)
    - Stores to mem0 semantic memory
    - Splits long responses (4096 char Telegram limit)
  → Response sent back via Telegram with typing indicators
```

**Status**: **Backend logic complete.** Real Telegram tokens exist in `.telegram.env`. State.json shows 2 Telegram message responses on Feb 15. Bot may be functional but requires verification that the systemd service (`focus-flow-telegram`) is running and webhook/polling is active.

**Key files**:
- Service: `focus-flow-backend/src/services/telegram-hitl.service.ts`
- Soul: `07_system/NITARA_SOUL.md`
- Secrets: `07_system/secrets/.telegram.env`
- Systemd: `focus-flow-telegram.service`

---

### Flow H: Onboarding (First-Time Founder Setup)

```
Frontend: 5-step wizard
  Step 1: Profile (name, role, location)
  Step 2: Archetype selection (founder type)
  Step 3: Network import (LinkedIn/Gmail)
  Step 4: Financials (income, expenses)
  Step 5: Activation (Nitara ready)

Telegram: /onboard command
  → Multi-phase session (welcome → strategic vision → financial reality
    → working style → network import → portfolio review → wrapup)
  → Each phase has max_turns and target_keys to extract
  → AI generates contextual follow-up questions
  → Generates profiling-checklist.json with completeness tracking
```

**Status**: **Frontend wizard built.** Telegram onboarding defined, real tokens available. Current profile data: name, location, partial skills — 16% overall completeness.

---

## 2. How Memory Links to Flows

### Memory Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MEMORY SOURCES                        │
├──────────────┬──────────────┬───────────────────────────┤
│ Profiling    │ Agent Reports│ Conversation              │
│ Checklist    │ & Insights   │ History                   │
│ (16% done)  │ (reports/)   │ (08_threads/)             │
├──────────────┴──────────────┴───────────────────────────┤
│              KNOWLEDGE DIGEST SERVICE                    │
│  knowledge-digest-full.md (~4K tokens)                  │
│  knowledge-digest-compact.md (~350 tokens)              │
│  knowledge-digest-stats.json — coverage metrics         │
│  Last updated: 2026-02-21T11:18:20Z                    │
├─────────────────────────────────────────────────────────┤
│              SEMANTIC MEMORY (Mem0)                      │
│  POST /api/memory/agent — skills deposit insights       │
│  Categories: pattern, failure_pattern, market_signal,   │
│  timing_pattern, network_insight                        │
│  Current count: 100 memories stored                     │
├─────────────────────────────────────────────────────────┤
│              KNOWLEDGE GRAPH                             │
│  Daily 11pm extraction from reports                     │
│  Entity files: markets.jsonl, opportunities.jsonl,      │
│  people.jsonl, projects.jsonl, relationships.jsonl      │
│  Stored at: 07_system/reports/kg-entities/              │
│  Updates: 2 runs (Feb 18, 19)                           │
├─────────────────────────────────────────────────────────┤
│              DECISION JOURNAL                            │
│  Record decisions with context + assumptions            │
│  Friday 8am: evaluate past decisions vs. outcomes       │
│  1 evaluation report exists (2026-02-21)                │
└─────────────────────────────────────────────────────────┘
```

### How Memory Feeds Each Flow

| Flow | Memory Consumed | Memory Produced |
|------|----------------|-----------------|
| Morning Briefing | knowledge-digest, project states, financial data | Briefing summary → activity log |
| Profiling | profiling-checklist (what's missing) | Filled checklist items → richer knowledge digest |
| Portfolio Analysis | full knowledge digest, all project JSONs, financials | Portfolio scores → semantic memory (patterns) |
| Network Intelligence | contact data (09_crm/), project context | Network insights → semantic memory, intro chains |
| Idea → Build Pipeline | council verdicts, hypotheses, experiment results | Playbooks from kill/park decisions |
| Work Plan | state.json, pending approvals | Execution logs → activity log |
| Telegram Chat | NITARA_SOUL.md, knowledge digest (tiered), thread history | Thread messages → mem0 storage |
| Onboarding | Empty/partial profiling checklist | Filled profile data → knowledge digest bootstrap |

### The Compounding Intelligence Loop

```
Profiling fills gaps → Knowledge digest gets richer
  → Agent decisions get more contextual
  → Reports contain deeper insights
  → Knowledge graph grows
  → Serendipity scan finds non-obvious connections
  → Portfolio analysis uses network + market + profiling data together
  → Each cycle makes Nitara smarter about the founder's situation
```

### Current Memory State (2026-02-21)

| Metric | Value |
|--------|-------|
| Knowledge digest (full) | ~4,039 tokens |
| Knowledge digest (compact) | ~349 tokens |
| Projects tracked | 20 |
| Tasks tracked | 13 |
| Semantic memories | 100 |
| Contacts | **0** |
| Deals | 1 |
| Profiling completeness | **16%** |

---

## 3. Project Lifecycle

### State Machine

```
                    ┌──────────┐
                    │  INBOX   │ (00_inbox/raw/)
                    └────┬─────┘
                         │ AI classification
                    ┌────▼─────┐
              ┌─────│   IDEA   │ (03_ideas/inbox/)
              │     └────┬─────┘
              │          │ Council evaluation
              │     ┌────▼─────┐
              │     │ COUNCIL  │ (07_system/council-verdicts/)
              │     │ VERDICT  │
              │     └────┬─────┘
              │          │
              │    ┌─────┴──────┐
              │    │            │
         REJECTED  │       APPROVED
      (03_ideas/   │    (02_projects/active/)
       rejected/)  │
                   │
              ┌────▼──────────────────────────────────┐
              │          PROJECT PHASES                 │
              │                                        │
              │  concept → spec → design → dev →       │
              │  test → deploy → live                   │
              │                                        │
              │  With validation gates:                 │
              │  - Hypotheses generated                 │
              │  - Experiments designed & measured       │
              │  - Decision gate: SCALE/ITERATE/PIVOT   │
              └────┬──────────┬──────────┬─────────────┘
                   │          │          │
              ┌────▼───┐ ┌───▼───┐ ┌───▼────────┐
              │ ACTIVE │ │PAUSED │ │ COMPLETED  │
              └────┬───┘ └───────┘ └────┬───────┘
                   │                     │
                   │              ┌──────▼──────┐
                   │              │  PLAYBOOK   │
                   │              │  EXTRACTED  │
                   │              └─────────────┘
                   │
              ┌────▼──────────────────┐
              │    BUILD PIPELINE     │
              │ Phase 1: Architecture │
              │ Phase 2: Parallel dev │
              │ Phase 3: Integration  │
              │ Phase 4: Quality gate │
              │ (2-hour timeout)      │
              └───────────────────────┘
```

### Portfolio Decisions (from portfolio-analysis)

| Decision | Meaning |
|----------|---------|
| **BUILD-NEXT** | Highest composite score, ready for build phase |
| **INVEST** | Continue current phase, allocate more time |
| **PIVOT** | Change approach but keep the problem space |
| **PARK** | Pause indefinitely, extract playbook |
| **KILL** | Terminate, extract learnings, free resources |

### Scoring Dimensions

| Dimension | Weight |
|-----------|--------|
| Revenue proximity | 27% |
| Market validation | 18% |
| Effort-to-revenue | 18% |
| Strategic fit | 14% |
| Skill alignment | 13% |
| Network leverage | 10% |

### Current Portfolio (2026-02-21)

- **19 active projects**, 0 paused, 0 completed
- **7 duplicate entries** flagged for consolidation (3x Global Foundation, 2x Focus Flow OS, 2x Bramha)
- **1 idea** (Mirari V5.0) council-evaluated → REJECTED at 4.7/10
- **0 projects** have completed the full lifecycle
- All projects in **concept** phase — none have advanced to spec/design/dev

---

## 4. What's Fully Set Up vs. What's Not

### Fully Operational

| Component | Evidence |
|-----------|----------|
| Daily briefing generation | 7 consecutive days (Feb 15–21), generates at 7–8am |
| Task queue service | Polls every 10s, spawns Claude CLI, captures costs |
| Agent state management | state.json tracks status, work plans, activity log |
| Safety gate (security) | `.claude/scripts/safety-gate.sh` — blocks destructive commands |
| Cost gate (budget) | $20/day limit, 80% alert threshold, $100/week cap |
| Circuit breaker | Tracks consecutive failures, auto-pauses after 3 |
| Kill switch mechanism | `touch 07_system/agent/KILL_SWITCH` halts all operations |
| Loop detection | Blocks same file edited >5 times in 5 min |
| Scenario holdout | Agents cannot read evaluation criteria |
| Cost tracking (inference logger) | Buffered JSONL logging with model-based pricing |
| Knowledge digest service | Full (~4K tokens) + compact (~350 tokens), auto-refreshes |
| Vault service (data layer) | File-based CRUD for all entity types |
| Frontend mode system | 5 modes with sub-tabs fully defined |
| Frontend canvas router | 28+ lazy-loaded canvas components |
| Frontend PWA + service worker | Offline support, background sync |
| Queue API (authenticated) | Bearer token auth with constant-time comparison |
| Agent definitions (20) | All in `.claude/agents/` with full prompts |
| Skill definitions (57) | All in `.claude/skills/` with full prompts |
| Schedule (21 cron tasks) | Full weekly/daily/monthly schedule in `schedule.json` |
| Build guard (2-hour timeout) | `.claude/scripts/build-guard.sh` |
| Hook scripts (14) | Safety, cost, build, profiling, notification, validation |
| Orchestrator AI service | Tool execution loop, voice/text routing, model tiering |
| Council evaluation service | Multi-agent parallel evaluation with synthesis, 17 verdicts generated |
| LiveKit voice (browser) | Real cloud credentials (`wss://nitara-tagq5i4y.livekit.cloud`), token service, frontend hook, 3 voice personas |
| LiveKit Python agent | `livekit-agent/agent.py` — 3 personas (Main, Analyst, Profiler), systemd service installed |
| OAuth credential sync | Root → nitara user before each task spawn |
| Knowledge graph entities | 5 entity files in `07_system/reports/kg-entities/` |
| Monitor project | 4 monitoring reports (Feb 18–21) |

### Partially Working

| Component | Status | Missing |
|-----------|--------|---------|
| Work plan approval | Plans generate but none approved | User hasn't approved any tier 3 actions |
| Portfolio analysis | Ran once (Feb 18), report exists | Needs weekly execution via approval |
| Council evaluation | 17 total verdicts (2 standalone + 15 embedded in project JSONs) | Work plan references "5 pending to process" — may mean unactioned standalone + high-score embedded |
| Telegram bot | Real tokens exist, 2 messages sent Feb 15 | Service running status unverified |
| Task queue execution | 31 tasks queued, 9 archived | 0 tasks actually executed (all awaiting approval) |
| Semantic memory (Mem0) | 100 memories stored | Unclear which flows are actively depositing |
| Knowledge graph updates | 2 extraction runs, entity files populated | Needs continuous execution |
| Decision journal | 1 evaluation report (Feb 21) | No decisions recorded yet to evaluate |
| Profiling system | Checklist at 16%, 5 questions generated | 3 unanswered questions pending |
| Network analysis | Reports generated (Feb 19) | Reports are empty/template — 0 contacts |
| Duplicate consolidation | 7 duplicates identified | Awaiting work plan approval (tier 3) |

### Not Operational

| Component | Blocker |
|-----------|---------|
| Telegram onboarding | Bot status unverified — needs service confirmation |
| Voice briefing | LiveKit tokens configured but SIP trunks unprovisioned — browser voice works, outbound calls don't |
| Voice profiling | LiveKit tokens configured but SIP trunks unprovisioned — browser voice works, outbound calls don't |
| Network import/analysis | **No contact data imported** (0 contacts in vault) |
| Build pipeline (full) | `build-mvp` skill defined but never executed end-to-end |
| Playbook extraction | No projects completed/killed → no playbooks to extract |
| Serendipity scan | Knowledge graph needs more data first |
| Event detection | Skill defined, runs at 6am weekdays — no evidence of outputs |
| Outreach drafting | Requires network data + profiling |
| Time-value analysis | Requires operational reality data (0% profiling in that domain) |
| Validation experiments | Skills defined but no experiments created or measured |
| Validation sprints | Orchestrator defined but no sprints initiated |

### Configuration Needed

| Item | Current State | Action Required |
|------|--------------|-----------------|
| Telegram bot verification | Real tokens in `.telegram.env` | Verify `focus-flow-telegram` systemd service is running |
| LiveKit SIP trunks | `SIP_OUTBOUND_TRUNK_ID` and `SIP_INBOUND_TRUNK_ID` are empty | Provision SIP trunks in LiveKit Cloud for outbound/inbound phone calls |
| LiveKit founder phone | `FOUNDER_PHONE_NUMBER` empty in livekit-agent `.env` | Provide phone number for outbound profiling calls |
| Work plan approval | 7 items pending since Feb 20 | Approve via frontend (`POST /api/agent/work-plan/approve`) or Telegram (`/approve`) |
| Profiling data | 16% complete, 3 unanswered Qs | Answer pending questions or complete onboarding wizard |
| Contact import | 0 contacts | Import LinkedIn ZIP or Gmail CSV via `network-import` skill |
| PostgreSQL migration | Schema exists, vault is file-based | Decide: migrate to DB or stay file-based |
| Council verdict actions | 17 verdicts exist (2 standalone + 15 embedded), none have had `apply-actions` called | Review verdicts and apply recommended actions via `POST /api/council/:id/apply-actions` |

---

## 5. Weekly Autonomous Rhythm (When Fully Operational)

### Schedule Overview

```
MONDAY
  08:00  portfolio-analysis (Opus, tier 2) — Deep portfolio scoring
  08:00  validate-sprint-orchestrator (tier 2) — Create validation sprint

TUESDAY
  09:00  network-analyze (tier 1) — Network intelligence

WEDNESDAY
  06:00  validate-portfolio-prune (tier 2) — Kill/scale recommendations
  09:00  research-market (tier 1) — Market research
  10:00  network-portfolio-xref (tier 1) — Contact ↔ project mapping

THURSDAY
  22:00  network-enrich (tier 1) — Deep enrich top 20% contacts

FRIDAY
  08:00  decision-journal-evaluate (tier 1) — Review past decisions
  09:00  research-youtube (tier 1) — Content strategy
  18:00  time-value-analyze (tier 2) — Time allocation review

SUNDAY
  06:00  meta-analysis (tier 2) — System self-improvement
  07:00  serendipity-scan (tier 2) — Cross-pollinate knowledge graph

DAILY (weekdays)
  06:00  event-detect — Scan for competitor/market events
  07:00  morning-briefing — Daily narrative briefing
  07:30  voice-briefing — Voice narrative (browser-ready, SIP pending)
  10:00  profiling-question — Generate 1 profiling question
  14:00  voice-profiling — Voice call if <80% complete (SIP pending)

EVERY 4 HOURS
  */4    monitor-project — Health checks on all active projects

MONTHLY (1st of month)
  09:00  research-passive-income — Passive income scan
  09:00  network-career-leverage — Career leverage analysis

NIGHTLY
  23:00  knowledge-graph-update — Entity extraction from reports
```

### Trust Tier Breakdown

| Tier | Auto-approval | Skills |
|------|--------------|--------|
| **Tier 1** (read_vault) | Yes | network-analyze, research-market, research-youtube, network-enrich, network-portfolio-xref, decision-journal-evaluate, knowledge-graph-update, event-detect, profiling-question, monitor-project |
| **Tier 2** (analysis) | After timeout | portfolio-analysis, validate-sprint-orchestrator, validate-portfolio-prune, time-value-analyze, meta-analysis, serendipity-scan, morning-briefing, voice-briefing, voice-profiling |
| **Tier 3** (execution) | Requires explicit approval | council-evaluation, build-mvp, consolidate-duplicates, portfolio-triage |

---

## Appendix: System Inventory

### Agents (20 total)

| Agent | Model | Role |
|-------|-------|------|
| nitara-think | opus | Think mode orchestrator — venture scoring, hypotheses |
| nitara-validate | opus | Validate mode — experiments, decision gates |
| nitara-builder | opus | Build orchestrator — multi-agent MVP delivery |
| nitara-grow | opus | Grow mode — KPI, simulation, GTM |
| nitara-leverage | opus | Leverage mode — network intelligence |
| nitara-meta | opus | Self-improvement — costs, failure patterns |
| nitara-portfolio-analyst | opus | Portfolio scoring, kill/pivot/invest |
| nitara-decision-maker | opus | Synthesizes evidence into decisions |
| nitara-validation-engine-lead | opus | 7-phase Validation Engine build |
| nitara-researcher | sonnet | Web/competitive/market research |
| nitara-network-analyst | sonnet | Network intelligence, revenue mapping |
| nitara-experimenter | sonnet | Experiment design and measurement |
| nitara-backend | sonnet | Express API, VaultService, routes |
| nitara-frontend | sonnet | React components, canvas, Zustand |
| nitara-canvas | sonnet | Canvas screen builder |
| nitara-conversation | sonnet | Conversation rail, ActionCard |
| nitara-foundation | sonnet | Phase 0, design tokens, playbooks |
| nitara-playbook-writer | sonnet | Extracts reusable playbooks |
| nitara-ux-components | sonnet | Shared UI components |
| nitara-ops | haiku | systemd, deployment, server config |

### Hook Scripts (14 total)

| Script | Purpose |
|--------|---------|
| `safety-gate.sh` | Blocks destructive commands, privilege escalation |
| `cost-gate.sh` | Enforces $20/day budget limit |
| `cost-tracker.sh` | Logs inference costs to JSONL |
| `build-guard.sh` | 2-hour session timeout for builds |
| `task-result-writer.sh` | Posts task completion to queue API |
| `telegram-notify.sh` | Sends notifications via Telegram |
| `validate-analysis.sh` | Evaluates against hidden scenario file |
| `validate-edit.sh` | Validates file edits |
| `verify-builds.sh` | Checks build outputs |
| `profiling-session-writer.sh` | Writes profiling session data |
| `knowledge-graph-trigger.sh` | Triggers knowledge graph updates |
| `event-escalation.sh` | Escalates detected events |
| `evaluate-scenario.py` | Python scenario evaluator |
| `test-safety-gate.sh` | Test harness for safety gate |

### LiveKit Voice Integration (6 layers)

| Layer | Path | What |
|-------|------|------|
| Python voice agent | `02_projects/active/livekit-agent/agent.py` (697 lines) | 3 personas: NitaraMain (general), NitaraAnalyst (portfolio), NitaraProfiler (outbound). Deepgram STT + Cartesia TTS + Claude/OpenClaw LLM |
| Backend token service | `src/services/livekit.service.ts` | `createToken()` via `livekit-server-sdk ^2.15.0` |
| Backend SIP service | `src/services/voice-session.service.ts` | `SipClient` + `AgentDispatchClient` for outbound calls. DND 22:00–08:00 Zurich, max 3/day |
| Backend routes | `src/routes/livekit.routes.ts` + `voice-session.routes.ts` | `/api/livekit/token`, `/api/livekit/status`, `/api/livekit/keywords`, `/api/voice/call`, `/api/voice/sessions` |
| Frontend hook | `src/hooks/useLiveKitVoice.ts` (312 lines) | `livekit-client ^2.17.1` — room connect, mic, transcription, data channel (`nitara.canvas` topic) |
| Frontend UI | `ConversationRail.tsx` | VoicePill + VoiceOverlay |

**Credentials**: Real cloud credentials configured (`wss://nitara-tagq5i4y.livekit.cloud`). API key/secret in both `livekit-agent/.env` and `07_system/secrets/.livekit.env`.

**What works**: Browser-based voice (token generation, room connect, STT/TTS, data channel canvas events).

**What's blocked**: Outbound phone calls — `SIP_OUTBOUND_TRUNK_ID`, `SIP_INBOUND_TRUNK_ID`, and `FOUNDER_PHONE_NUMBER` are empty. Need SIP trunk provisioning in LiveKit Cloud.

**Systemd**: `/etc/systemd/system/focus-flow-livekit-agent.service` (installed, runs from `livekit-agent/venv/`).

### Key Data Paths

```
/srv/focus-flow/
├── 00_inbox/                    # Raw inbox items
├── 02_projects/
│   ├── active/                  # 19 project JSONs + 4 source repos
│   ├── paused/                  # (empty)
│   └── completed/               # (empty)
├── 03_ideas/
│   ├── inbox/                   # Unprocessed ideas
│   └── rejected/                # Rejected ideas
├── 07_system/
│   ├── agent/
│   │   ├── state.json           # Agent state, work plans, activity log
│   │   ├── schedule.json        # 21 cron tasks
│   │   ├── cost-budget.json     # $20/day, $100/week
│   │   ├── profiling-checklist.json  # 16% complete
│   │   ├── briefings/           # 7 daily briefings
│   │   ├── queue/               # 31 pending tasks
│   │   │   └── archive/         # 9 archived tasks
│   │   ├── pending-questions/   # 3 unanswered profiling Qs
│   │   ├── answered-questions/  # 2 answered profiling Qs
│   │   └── loop-detection/      # Loop detection state
│   ├── council-verdicts/        # 2 standalone verdict files (+ 15 embedded in project JSONs)
│   ├── reports/
│   │   ├── kg-entities/         # Knowledge graph entity files
│   │   ├── portfolio-analysis-*
│   │   ├── network-analysis-*
│   │   ├── monitor-project-*
│   │   └── decision-journal-*
│   ├── knowledge-graph/         # Knowledge graph data
│   ├── secrets/
│   │   ├── .telegram.env        # Real Telegram tokens
│   │   └── .openclaw.env        # OpenClaw secrets
│   ├── NITARA_SOUL.md           # Personality definition
│   └── NITARA_GUIDE.md          # Usage guide
├── 08_threads/                  # Conversation history
├── 09_crm/                      # Contact data (empty)
├── .claude/
│   ├── agents/                  # 20 agent definitions
│   ├── skills/                  # 57 skill definitions
│   └── scripts/                 # 14 hook scripts
└── docs/
    └── NITARA-SYSTEM-ANALYSIS.md  # This document
```

### System Health Snapshot (2026-02-21)

| Metric | Value |
|--------|-------|
| Agent status | `awaiting_approval` |
| Last heartbeat | 2026-02-21T11:21:20Z |
| Briefings generated | 7 (consecutive) |
| Actions executed | **0** |
| Queue depth | 31 pending |
| Circuit breaker | 0 consecutive failures |
| Daily budget used | $0 |
| Profiling completeness | 16% |
| Contact count | 0 |
| Semantic memories | 100 |
| Active projects | 19 (7 duplicates) |

---

*This document reflects the system state as of 2026-02-21. Update when significant changes occur.*
