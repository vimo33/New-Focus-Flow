# Nitara

**AI Co-Founder for Solo Entrepreneurs**

Nitara (Sanskrit: Niti + Tara = Strategic Star) is an autonomous AI agent platform that helps solo entrepreneurs manage a portfolio of ventures. It turns uncertainty into decisions across idea validation, building, growth, and strategic leverage — powered by Claude Code as the execution engine.

---

## What Nitara Does

Nitara operates in **five modes**, each with specialized agents:

| Mode | Purpose | Key Agents |
|------|---------|------------|
| **Think** | Portfolio strategy, idea intake, scoring, hypothesis generation | nitara-think, nitara-portfolio-analyst |
| **Validate** | Experiment design, measurement, decision gates (Scale/Iterate/Pivot/Park/Kill) | nitara-validate, nitara-experimenter |
| **Build** | Autonomous builder with agent runs, HITL checkpoints, approval queue | nitara-builder, nitara-backend, nitara-frontend |
| **Grow** | Resource allocation, KPI dashboards, simulation, go-to-market | nitara-grow, nitara-researcher |
| **Leverage** | Network intelligence, playbook library, partnerships | nitara-leverage, nitara-network-analyst |

### Autonomous Agent System

- **83 skills** across development, marketing, security, copywriting, research, and operations
- **20 agents** with specialized capabilities (Opus for reasoning, Sonnet for execution, Haiku for checks)
- **14 hook scripts** for safety gates, cost tracking, design token validation, and security checks
- **Scheduled tasks** via cron — morning briefings, portfolio analysis, market research, network enrichment, marketing analysis
- **Human-in-the-loop** via Telegram for approvals and profiling questions
- **Kill switch** — `touch 07_system/agent/KILL_SWITCH` halts all autonomous operations
- **Cost budget** — configurable daily spend limit ($20/day default)

### Skills Inventory (83 total)

| Category | Count | Examples |
|----------|-------|---------|
| Core Nitara | 56 | portfolio-analysis, build-mvp, experiment-loop, network-enrich, morning-briefing |
| Marketing (mkt-*) | 14 | content-strategy, seo-audit, pricing-strategy, launch-strategy, cold-email |
| Copywriting (copy-*) | 7 | david-ogilvy, dan-kennedy, eugene-schwartz, brand-foundation |
| Security (sec-*) | 5 | insecure-defaults, sharp-edges, differential-review, static-analysis |
| UI/UX | 1 | ui-ux-pro-max |
| Testing | 1 | playwright-test (E2E smoke tests) |

**Superpowers plugin** (obra/superpowers v4.3.1) adds 14 more via Claude Code plugin system: TDD, systematic debugging, verification, brainstorming, code review, git worktrees.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Zustand |
| Backend | Express 5, TypeScript, Node.js 22 |
| Database | PostgreSQL 16 (Drizzle ORM) + file-based vault |
| AI | Claude via OpenClaw gateway (Opus/Sonnet/Haiku) |
| Memory | Mem0 (semantic), Qdrant (vector), file vault (artifacts) |
| Voice | LiveKit Agents (Deepgram STT + Cartesia TTS) |
| Agent Engine | Claude Code CLI with queue at `07_system/agent/queue/` |
| Testing | Playwright (E2E), TypeScript strict mode |
| Infrastructure | systemd, UFW, Tailscale |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  INPUT: Telegram Bot • Web UI • Voice • API • Scheduled Cron  │
├────────────────────────────────────────────────────────────────┤
│  FRONTEND: React 19 + Canvas Architecture (5 modes)           │
│  ├── Dock Nav (bottom) → Mode-contextual sub-items            │
│  ├── Canvas Router → State-driven screen rendering            │
│  └── Conversation Rail → Persistent AI chat + approvals       │
├────────────────────────────────────────────────────────────────┤
│  BACKEND: Express 5 + TypeScript                              │
│  ├── REST API (projects, experiments, decisions, network)     │
│  ├── Task Queue Service (polls 07_system/agent/queue/)        │
│  └── Telegram HITL Service (grammY webhook)                   │
├────────────────────────────────────────────────────────────────┤
│  AGENT SYSTEM: Claude Code CLI                                │
│  ├── 20 Agents (Opus/Sonnet/Haiku by task complexity)         │
│  ├── 83 Skills (atomic, orchestrator, user-facing)            │
│  ├── 14 Hook Scripts (safety, cost, validation, security)     │
│  └── Autonomy Tiers: T1 (auto) / T2 (soft gate) / T3 (hard) │
├────────────────────────────────────────────────────────────────┤
│  AI LAYER: OpenClaw Gateway → Claude API                      │
│  ├── Inference logging + cost tracking                        │
│  └── Knowledge graph + serendipity scanning                   │
├────────────────────────────────────────────────────────────────┤
│  STORAGE: PostgreSQL 16 + File Vault (/srv/focus-flow)        │
│  └── Qdrant (vectors) + Mem0 (semantic memory)                │
└────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
/srv/focus-flow/
├── CLAUDE.md                        # Agent system rules + design tokens
├── docs/nitara/                     # Context pack (19 docs)
├── design/                          # Design tokens, Stitch exports
├── 02_projects/active/
│   ├── focus-flow-backend/src/      # Express API
│   └── focus-flow-ui/src/           # React frontend
│       ├── components/Canvas/       # Mode-specific screens
│       ├── components/shared/       # GlassCard, StatCard, Badge, etc.
│       ├── stores/                  # Zustand state
│       └── services/                # API client
├── .claude/
│   ├── agents/                      # 20 agent definitions
│   ├── skills/                      # 83 skill definitions
│   ├── scripts/                     # 14 hook scripts
│   └── hooks/validators/            # Deterministic validators
├── 07_system/
│   ├── agent/queue/                 # Autonomous task queue
│   ├── agent/cost-budget.json       # Daily budget ($20)
│   ├── agent/schedule.json          # 22 scheduled tasks
│   ├── agent/KILL_SWITCH            # Touch to halt all agents
│   ├── reports/                     # Generated analysis reports
│   ├── config/                      # Docker Compose, configs
│   └── secrets/                     # API keys (not in Git)
├── 08_threads/                      # Conversation transcripts
└── 10_profile/                      # Founder profile data
```

---

## Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 16+
- Docker & Docker Compose
- Linux (Ubuntu 22.04+ recommended)

### Installation

```bash
git clone https://github.com/vimo33/New-Focus-Flow.git /srv/focus-flow
cd /srv/focus-flow

# Backend
cd 02_projects/active/focus-flow-backend
npm install
cp .env.example .env  # Edit with your config
npm run build && npm start

# Frontend
cd ../focus-flow-ui
npm install
npm run build && npm run preview

# Docker services (Qdrant, mem0, etc.)
cd /srv/focus-flow/07_system/config
docker compose up -d
```

### Systemd Services

```bash
sudo systemctl enable --now focus-flow-backend    # Port 3001
sudo systemctl enable --now focus-flow-frontend   # Port 5173
sudo systemctl enable --now focus-flow-telegram   # Port 3002
```

### Verify

```bash
curl http://localhost:3001/api/health
curl http://localhost:5173
```

---

## Safety & Autonomy

### Three-Tier Autonomy Model

| Tier | Actions | Approval |
|------|---------|----------|
| **T1 (Auto)** | Research, reports, analysis, file writes | None needed |
| **T2 (Soft Gate)** | Drafts, pipeline changes, budget adjustments | Approval with rollback |
| **T3 (Hard Gate)** | External comms, spending, deletion | Typed confirmation required |

### Safety Infrastructure

- **Kill switch**: `touch 07_system/agent/KILL_SWITCH`
- **Cost budget**: `07_system/agent/cost-budget.json` ($20/day default)
- **Safety gate hook**: Blocks writes to protected paths and secrets
- **Security check hook**: Warns on hardcoded secrets, eval(), innerHTML
- **Design token validator**: Prevents hardcoded colors in UI
- **Build guard**: Verifies TypeScript compilation + Playwright smoke tests
- **Circuit breaker**: Auto-disables failing skills after repeated errors

---

## Development

```bash
# Backend (hot reload)
cd /srv/focus-flow/02_projects/active/focus-flow-backend && npm run dev

# Frontend (HMR)
cd /srv/focus-flow/02_projects/active/focus-flow-ui && npm run dev

# Run E2E smoke tests
cd /srv/focus-flow/02_projects/active/focus-flow-ui && npx playwright test tests/e2e/smoke.spec.ts

# TypeScript check
cd /srv/focus-flow/02_projects/active/focus-flow-backend && npx tsc --noEmit
```

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Turn uncertainty into decisions. Powered by Claude.**
