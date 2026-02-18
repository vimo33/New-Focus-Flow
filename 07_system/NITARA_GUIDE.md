# Nitara System Guide

> Your AI co-founder, running on Claude Code CLI.
> Last updated: 2026-02-18

---

## 1. What Is Nitara?

Nitara is an autonomous AI co-founder system built on top of Claude Code CLI. It runs specialized agents on a recurring schedule, responds to your commands via Telegram, and progressively learns about you and your projects through a profiling system.

**Core capabilities:**
- **Portfolio analysis** — Scores your projects and recommends what to BUILD-NEXT, INVEST, PIVOT, PARK, or KILL
- **Market & YouTube research** — Discovers opportunities, competitors, and content strategies
- **Network intelligence** — Analyzes contacts for revenue-adjacent connections and intro chains
- **MVP building** — Scaffolds and ships features with safety guardrails
- **Self-monitoring** — Tracks service health, costs, and stale tasks every 4 hours
- **Founder profiling** — Progressively learns your skills, goals, finances, and network to improve analysis quality

**What makes it safe:**
- Kill switch (instant pause), circuit breaker (auto-pause on failures), daily/weekly cost budgets
- Every tool call goes through safety gates before execution
- Human-in-the-loop approval for high-risk operations via Telegram
- Loop detection prevents runaway file edits
- 2-hour max session time for builds

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     TELEGRAM (You)                       │
│  Commands · Approvals · Profiling answers · Free chat    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Layer 4 — Backend Services                   │
│  task-queue.service.ts  │  telegram-hitl.service.ts      │
│  (10s poll, max 2       │  (long polling, fs.watch       │
│   concurrent tasks)     │   on pending-questions/)       │
└────────┬───────────────────────────────┬────────────────┘
         │                               │
┌────────▼────────────┐   ┌─────────────▼────────────────┐
│  Layer 1 — Agents    │   │  Layer 3 — Safety Hooks       │
│  (Claude CLI spawns) │   │  PreToolUse:                  │
│                      │   │    safety-gate · cost-gate    │
│  portfolio-analyst   │   │  PostToolUse:                 │
│  researcher          │   │    validate-edit · cost-tracker│
│  network-analyst     │   │  Stop:                        │
│  builder             │   │    verify-builds              │
│  meta                │   │    task-result-writer          │
│  + 7 more agents     │   │    validate-analysis          │
│                      │   │    telegram-notify             │
└────────┬─────────────┘   └──────────────────────────────┘
         │
┌────────▼─────────────┐
│  Layer 2 — Skills     │
│  (19 total)           │
│  portfolio-analysis   │
│  research-youtube     │
│  research-market      │
│  research-passive-    │
│    income             │
│  network-import       │
│  network-analyze      │
│  build-mvp            │
│  monitor-project      │
│  profiling-question   │
│  + 10 dev skills      │
└───────────────────────┘
```

### Agents (12 total)

| Agent | Model | Purpose |
|-------|-------|---------|
| `nitara-portfolio-analyst` | Opus | Deep project scoring and strategic recommendations |
| `nitara-researcher` | Sonnet | YouTube, market, and passive income research |
| `nitara-network-analyst` | Sonnet | Contact analysis, intro chains, network gaps |
| `nitara-builder` | Opus | MVP scaffolding, feature implementation |
| `nitara-meta` | Opus | Self-improvement, analysis of agent outputs |
| `nitara-canvas` | Sonnet | Visual/design work |
| `nitara-conversation` | Sonnet | Free-form orchestrator chat |
| `nitara-foundation` | Sonnet | Core setup and infrastructure |
| `nitara-ux-components` | Sonnet | UI component building |
| `backend-dev` | Sonnet | Backend development tasks |
| `frontend-dev` | Sonnet | Frontend development tasks |
| `ops` | Haiku | Lightweight operational tasks |

### Skills (19 total)

**Autonomous skills** (used by scheduled tasks and the queue):
- `portfolio-analysis` — Weekly deep analysis of all projects
- `research-youtube` — Channel discovery, content strategy
- `research-market` — TAM/SAM/SOM, competition, pricing for a project
- `research-passive-income` — Scored passive income opportunities
- `network-import` — Import contacts from CSV/vCard
- `network-analyze` — Revenue-adjacent contacts, intro chains
- `build-mvp` — Scaffold and build features (2-hour max)
- `monitor-project` — Service health, disk, costs, stale tasks
- `profiling-question` — Generate next founder profiling question

**Development skills** (used interactively or by dev agents):
- `add-feature`, `build-phase`, `deploy`, `deploy-nitara`, `fix-issue`, `plan-feature`, `review-code`, `run-tests`, `validate-nitara`, `validate-system`

### Safety Hooks (9 scripts)

| Hook | Trigger | Purpose |
|------|---------|---------|
| `safety-gate.sh` | Pre Write/Edit/Bash | Block dangerous operations (rm -rf, DROP TABLE, force push, etc.) |
| `cost-gate.sh` | Pre Bash | Check daily budget before allowing tool calls |
| `cost-tracker.sh` | Post Bash | Log tool call to daily cost JSONL |
| `validate-edit.sh` | Post Write/Edit | Verify file edits didn't break things |
| `build-guard.sh` | Pre Bash | Enforce 2-hour max for MVP builds |
| `verify-builds.sh` | Stop | Verify builds completed successfully |
| `task-result-writer.sh` | Stop | Write task completion status to queue |
| `validate-analysis.sh` | Stop | Validate analysis report structure |
| `telegram-notify.sh` | Stop | Send completion notification to Telegram |

---

## 3. Task Lifecycle

Here's what happens when a task runs:

```
Schedule/API/Agent creates task
         │
         ▼
    ┌─────────┐
    │  Queue   │  JSON file in 07_system/agent/queue/
    └────┬────┘
         │  (polled every 10 seconds)
         ▼
    Pre-flight checks:
    1. Kill switch active?     → skip
    2. Circuit breaker tripped? → skip (auto-resets after 10 min)
    3. Daily budget exceeded?   → skip
    4. HITL questions timed out? → auto-approve (tier 1-2) or auto-reject (tier 3)
    5. Max concurrent (2) reached? → wait
         │
         ▼
    Priority sorting:
    - Directive-aligned skills get +1 boost
    - Order: critical > high > medium > low > background
         │
         ▼
    Spawn Claude CLI:
    su - nitara -c "claude --dangerously-skip-permissions -p '/<skill> <args>'"
    stdio: ['ignore', 'pipe', 'pipe']
         │
         ▼
    During execution:
    - safety-gate.sh gates every Write/Edit/Bash
    - cost-gate.sh checks budget before each Bash
    - cost-tracker.sh logs each Bash call
    - validate-edit.sh checks file edits
         │
         ▼
    On completion (Stop hooks fire):
    1. verify-builds.sh    → check build artifacts
    2. task-result-writer.sh → mark task complete in queue
    3. validate-analysis.sh → verify report structure
    4. telegram-notify.sh  → send "✅ Task done" to Telegram
         │
         ▼
    Report written to 07_system/reports/
    Task moved to queue/archive/
```

### HITL (Human-in-the-Loop) Flow

When an agent needs your input:

1. Agent writes a question JSON to `07_system/agent/pending-questions/`
2. `fs.watch()` picks it up within 500ms
3. Telegram sends you the question with inline buttons (Approve/Reject, choices, or reply prompt)
4. The spawning task is paused (`status: paused`)
5. You respond via Telegram button tap or reply message
6. Answer saved to `07_system/agent/answered-questions/`
7. Task is re-queued and resumes with your answer

**Timeouts:**
- At 50% of timeout: reminder sent (tier 3 tasks)
- On full timeout: tier 1/2 auto-approve, tier 3 auto-reject
- Default timeout: 24 hours

---

## 4. Day-to-Day Usage

### Telegram Commands

| Command | What it does |
|---------|-------------|
| `/status` | Running/queued task counts, daily cost, tool calls, kill switch state |
| `/tasks` | Top 10 tasks with priority and status |
| `/approve <id>` | Approve a pending HITL question |
| `/reject <id>` | Reject a pending HITL question |
| `/budget` | Daily/weekly spend vs limits, % used |
| `/pause` | Activate kill switch — stops all autonomous operations |
| `/resume` | Deactivate kill switch — resume operations |
| `/enable` | Reset circuit breaker (clear failure count) |
| `/profiling` | Show profiling completeness with progress bars per domain |
| `/onboard` | Start or resume founder profiling session |
| `/help` | Show all commands |

**Also:** Reply to any profiling question with your answer. Send free-text to chat with Nitara (routed to orchestrator AI).

### Manually Triggering Tasks (via API)

All endpoints are under `http://localhost:3001/api/queue/`.

**Enqueue a task:**
```bash
# Portfolio analysis
curl -X POST http://localhost:3001/api/queue/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"skill": "portfolio-analysis", "arguments": "all", "priority": "high"}'

# YouTube research
curl -X POST http://localhost:3001/api/queue/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"skill": "research-youtube", "arguments": "AI SaaS tools", "priority": "medium"}'

# Market research for a specific project
curl -X POST http://localhost:3001/api/queue/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"skill": "research-market", "arguments": "focus-flow", "priority": "medium"}'

# Passive income research
curl -X POST http://localhost:3001/api/queue/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"skill": "research-passive-income", "arguments": "", "priority": "medium"}'

# Network analysis
curl -X POST http://localhost:3001/api/queue/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"skill": "network-analyze", "arguments": "", "priority": "medium"}'
```

**Monitor and manage:**
```bash
# Queue stats (running, queued, completed, failed, cost)
curl http://localhost:3001/api/queue/stats

# List all tasks (optionally filter by status)
curl http://localhost:3001/api/queue/tasks
curl http://localhost:3001/api/queue/tasks?status=running

# Get specific task
curl http://localhost:3001/api/queue/tasks/TASK_ID

# Kill a running task
curl -X POST http://localhost:3001/api/queue/tasks/TASK_ID/kill
```

**Schedule management:**
```bash
# Add a new scheduled task
curl -X POST http://localhost:3001/api/queue/schedule \
  -H 'Content-Type: application/json' \
  -d '{"skill": "research-market", "cron": "0 9 * * 3", "arguments": "focus-flow", "priority": "medium"}'

# Kill switch via API
curl -X POST http://localhost:3001/api/queue/kill-switch   # activate
curl -X DELETE http://localhost:3001/api/queue/kill-switch  # deactivate
```

### Emergency Controls

| Action | How |
|--------|-----|
| **Pause everything** | `/pause` in Telegram, or `touch /srv/focus-flow/07_system/agent/KILL_SWITCH` |
| **Resume** | `/resume` in Telegram, or `rm /srv/focus-flow/07_system/agent/KILL_SWITCH` |
| **Reset circuit breaker** | `/enable` in Telegram |
| **Kill specific task** | `curl -X POST http://localhost:3001/api/queue/tasks/TASK_ID/kill` |
| **Restart backend** | `systemctl restart focus-flow-backend` |

---

## 5. Scheduled Tasks

These run automatically based on cron schedules:

| Skill | Schedule | Priority | Trust Tier | Purpose |
|-------|----------|----------|------------|---------|
| `monitor-project` | Every 4 hours | low | 1 (auto-approve) | Health checks, cost tracking, stale task detection |
| `profiling-question` | Daily at 10:00 | background | 1 (auto-approve) | Generate next founder profiling question |
| `portfolio-analysis` | Monday at 08:00 | high | 2 (30-min delay) | Weekly deep portfolio analysis |

**Config file:** `/srv/focus-flow/07_system/agent/schedule.json`

**Cron trigger behavior:** The queue service checks schedules on each poll cycle (every 10 seconds). A cron match triggers only within the first 15 seconds of each matching minute to prevent duplicate enqueues.

**Bootstrap:** If the system has zero completed tasks and zero queued tasks, it automatically enqueues `portfolio-analysis all` as a first run.

---

## 6. Safety & Cost Controls

### Budget Limits

| Limit | Value | Config |
|-------|-------|--------|
| Daily budget | $20 | `cost-budget.json` |
| Weekly budget | $100 | `cost-budget.json` |
| Max daily tool calls | 500 | `cost-budget.json` |
| Alert threshold | 80% of daily budget | `cost-budget.json` |

Config: `/srv/focus-flow/07_system/agent/cost-budget.json`

### Circuit Breaker

- **Trips after** 3 consecutive task failures
- **Auto-resets** after 10-minute cooldown from last failure
- **Resets on** any successful task completion
- **Manual reset:** `/enable` in Telegram

Config: `/srv/focus-flow/07_system/agent/circuit-breaker.json`

### Trust Tiers

| Tier | Behavior | Example Skills |
|------|----------|----------------|
| Tier 1 | Auto-approve (no delay) | `monitor-project`, `profiling-question` |
| Tier 2 | 30-minute delay before auto-approve | `portfolio-analysis` |
| Tier 3 | Requires explicit Telegram approval | Custom high-risk tasks |

Tier 2 delay is configurable in `07_system/agent/config.json` (`tier2_delay_minutes`).

### Other Safety Mechanisms

- **Loop detection:** Blocks a file if edited >5 times in 5 minutes
- **Build guard:** 2-hour max session for MVP builds
- **Safety gate:** Blocks dangerous shell commands (rm -rf, DROP TABLE, force push, etc.)
- **Max concurrent tasks:** 2 (prevents resource exhaustion)
- **Max retries:** 3 attempts, then permanently failed
- **Max task duration:** 120 minutes (default)

---

## 7. Where Things Live

```
/srv/focus-flow/
│
├── .claude/
│   ├── agents/              # Agent definitions (12 files)
│   │                        # Each defines: personality, model, tools, output format
│   ├── skills/              # Skill definitions (19 files)
│   │                        # Each defines: process steps, context, output format
│   ├── scripts/             # Hook scripts (9 files)
│   │                        # Safety gates, cost tracking, notifications
│   └── settings.json        # Hook wiring (which hooks fire on which tools)
│
├── 02_projects/active/
│   └── focus-flow-backend/
│       └── src/services/
│           ├── task-queue.service.ts     # Core queue engine
│           └── telegram-hitl.service.ts  # Telegram bot + HITL
│       └── src/routes/
│           └── queue.routes.ts           # REST API for queue
│
├── 07_system/
│   ├── NITARA_SOUL.md       # Nitara's identity document (immutable)
│   ├── NITARA_GUIDE.md      # This file
│   │
│   ├── agent/
│   │   ├── queue/           # Active task queue (JSON per task)
│   │   │   └── archive/     # Completed/failed tasks
│   │   ├── pending-questions/   # HITL questions awaiting your answer
│   │   ├── answered-questions/  # Your completed answers
│   │   ├── approvals/          # Approval records
│   │   ├── briefings/          # Daily briefing JSONs
│   │   ├── notifications/      # Notification records
│   │   ├── loop-detection/     # File edit frequency tracking
│   │   ├── confidence/         # Agent confidence calibration
│   │   │
│   │   ├── cost-budget.json        # Spend limits ($20/day, $100/week)
│   │   ├── schedule.json           # Cron-based recurring tasks
│   │   ├── circuit-breaker.json    # Failure counter & cooldown
│   │   ├── config.json             # Tier delays, heartbeat, briefing schedule
│   │   ├── hitl-state.json         # Current HITL state tracking
│   │   ├── state.json              # Queue state persistence
│   │   ├── profiling-checklist.json    # Founder knowledge gaps by domain
│   │   ├── knowledge-digest-full.md    # Full context for agents
│   │   ├── knowledge-digest-compact.md # Compact context for lighter agents
│   │   ├── KILL_SWITCH             # Create to pause, delete to resume
│   │   └── vapid-keys.json         # Push notification keys
│   │
│   ├── reports/             # Agent output reports
│   │   ├── portfolio-analysis-YYYY-MM-DD.md/json
│   │   ├── research-youtube-YYYY-MM-DD.md/json
│   │   ├── research-market-PROJECT-YYYY-MM-DD.md/json
│   │   ├── research-passive-income-YYYY-MM-DD.md/json
│   │   ├── network-analysis-YYYY-MM-DD.md/json
│   │   ├── monitor-project-YYYY-MM-DD.json
│   │   ├── meta-analysis-TYPE-YYYY-MM-DD.json
│   │   └── weekly/          # Weekly rollup reports
│   │
│   ├── logs/
│   │   ├── claude-code/     # Daily tool call logs (JSONL)
│   │   └── inference/       # Daily API cost logs (JSONL)
│   │
│   ├── secrets/
│   │   ├── .telegram.env    # TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, OWNER_TELEGRAM_ID
│   │   └── .openclaw.env    # OpenClaw gateway credentials
│   │
│   └── directives/
│       └── active-directive.md  # Current strategic priority
│                                # (currently: income & revenue generation)
│
└── 10_profile/
    ├── founder.json         # Your skills, experience, preferences
    └── network/
        ├── contacts/        # Individual contact files
        └── imports/         # Raw import data
```

---

## 8. Profiling System

Nitara progressively learns about you through daily profiling questions sent via Telegram.

### 7 Domains Tracked

| Domain | What Nitara Learns |
|--------|-------------------|
| `founder_identity` | Who you are, your vision, values |
| `skills_expertise` | Technical and business skills |
| `financial_reality` | Runway, income, costs, goals |
| `portfolio_depth` | Project details, status, potential |
| `network_intelligence` | Key contacts, advisors, collaborators |
| `strategic_context` | Market position, competitive landscape |
| `operational_reality` | Time availability, tools, constraints |

### How It Works

1. Daily at 10am, `profiling-question` skill generates the next question based on gaps
2. Question sent to Telegram as a reply prompt
3. You reply with your answer
4. Answer stored and profiling checklist updated
5. Agents use your profile to personalize analysis

### Commands

- `/profiling` — See completeness per domain with visual progress bars
- `/onboard` — Start a guided profiling session (multiple questions in sequence)

### Auto-Trigger

If overall profiling completeness is below 80% and it's been >24 hours since the last profiling task, the queue auto-enqueues a new profiling question.

---

## 9. Reports

All agent outputs land in `/srv/focus-flow/07_system/reports/` as paired MD + JSON files.

| Report | Generated By | Contents |
|--------|-------------|----------|
| `portfolio-analysis-YYYY-MM-DD` | `portfolio-analysis` | Project scores (1-10), BUILD-NEXT/INVEST/PIVOT/PARK/KILL recommendations, 90-day action plan |
| `research-youtube-YYYY-MM-DD` | `research-youtube` | Channel discovery, content strategy, monetization angles |
| `research-market-PROJECT-YYYY-MM-DD` | `research-market` | TAM/SAM/SOM, competitor analysis, pricing strategy |
| `research-passive-income-YYYY-MM-DD` | `research-passive-income` | Scored opportunities with effort/reward/timeline |
| `network-analysis-YYYY-MM-DD` | `network-analyze` | Revenue-adjacent contacts, intro chains, network gaps |
| `monitor-project-YYYY-MM-DD` | `monitor-project` | Service health, disk usage, daily costs, stale tasks |
| `meta-analysis-TYPE-YYYY-MM-DD` | `nitara-meta` | Self-improvement findings, agent performance review |

Reports are matched to tasks by filename pattern within a 5-minute window of task completion.

---

## 10. Services & Ports

| Service | Port | systemd Unit | Purpose |
|---------|------|-------------|---------|
| Backend API | 3001 | `focus-flow-backend` | REST API, task queue, Telegram HITL |
| Frontend | 5173 | `focus-flow-frontend` | React UI (`vite preview`) |
| Telegram Bot | — | `focus-flow-telegram` | Voice/message capture (separate from HITL) |
| OpenClaw | 18789 | `openclaw-gateway` | AI gateway / LLM router |

### Managing Services

```bash
# Check status
systemctl status focus-flow-backend

# Restart (e.g., after config changes)
systemctl restart focus-flow-backend

# View logs
journalctl -u focus-flow-backend -f --no-pager

# Check all Focus Flow services
systemctl status focus-flow-backend focus-flow-frontend focus-flow-telegram openclaw-gateway
```

---

## 11. Configuration Reference

### `07_system/agent/config.json`

```json
{
  "tier2_delay_minutes": 30,
  "heartbeat_interval_ms": 60000,
  "briefing_schedule": "08:00",
  "end_of_day_schedule": "18:00",
  "notification_retention_days": 30,
  "tier_overrides": {}
}
```

### `07_system/agent/cost-budget.json`

```json
{
  "daily_budget_usd": 20.0,
  "max_daily_tool_calls": 500,
  "max_daily_api_cost_usd": 20.0,
  "weekly_budget_usd": 100.0,
  "alert_threshold_pct": 80
}
```

### `07_system/agent/schedule.json`

```json
[
  {
    "skill": "monitor-project",
    "cron": "0 */4 * * *",
    "priority": "low",
    "trust_tier": 1
  },
  {
    "skill": "profiling-question",
    "cron": "0 10 * * *",
    "priority": "background",
    "trust_tier": 1
  },
  {
    "skill": "portfolio-analysis",
    "cron": "0 8 * * 1",
    "priority": "high",
    "trust_tier": 2
  }
]
```

---

## 12. Directive System

The active directive at `07_system/directives/active-directive.md` sets Nitara's strategic lens. Currently focused on **income & revenue generation**.

Skills aligned with the active directive get a **+1 priority boost** in the queue:
- `portfolio-analysis`
- `research-market`
- `research-passive-income`
- `network-analyze`
- `build-mvp`

To change the strategic direction, edit `active-directive.md` and restart the backend.

---

## 13. Setting Up Telegram

The Telegram HITL bot requires real credentials to function. Without them, Nitara still runs tasks but you won't get notifications or approval prompts.

1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Get your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
3. Edit `/srv/focus-flow/07_system/secrets/.telegram.env`:

```env
TELEGRAM_BOT_TOKEN=your_real_bot_token
TELEGRAM_CHAT_ID=your_chat_id
OWNER_TELEGRAM_ID=your_telegram_user_id
```

4. Restart the backend: `systemctl restart focus-flow-backend`
5. Send `/start` to your bot to verify the connection

**Transport:** Long polling (not webhook). The bot deletes any existing webhook on startup.

---

## 14. Troubleshooting

### Tasks not running
1. Check kill switch: `ls /srv/focus-flow/07_system/agent/KILL_SWITCH` (exists = paused)
2. Check circuit breaker: `cat /srv/focus-flow/07_system/agent/circuit-breaker.json`
3. Check budget: `curl http://localhost:3001/api/queue/stats`
4. Check backend is running: `systemctl status focus-flow-backend`

### Telegram not responding
1. Verify credentials aren't placeholders: check `07_system/secrets/.telegram.env`
2. Check backend logs: `journalctl -u focus-flow-backend -f`
3. Restart: `systemctl restart focus-flow-backend`

### Task stuck in "running"
1. Check if Claude CLI process is alive: `ps aux | grep claude`
2. Kill via API: `curl -X POST http://localhost:3001/api/queue/tasks/TASK_ID/kill`
3. Max duration is 120 minutes — tasks auto-terminate after that

### Circuit breaker tripped
- Auto-resets after 10 minutes of no failures
- Manual reset: `/enable` in Telegram
- Or: edit `circuit-breaker.json` and set `consecutive_failures` to `0`

### High cost / runaway spending
1. Activate kill switch: `touch /srv/focus-flow/07_system/agent/KILL_SWITCH`
2. Check logs: `cat /srv/focus-flow/07_system/logs/claude-code/$(date +%Y-%m-%d).jsonl | wc -l`
3. Adjust budget in `cost-budget.json`
