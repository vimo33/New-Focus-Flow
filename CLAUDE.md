# CLAUDE.md — Nitara v2 Implementation Rules

## Product Identity
- **Product Name:** Nitara (formerly Focus Flow OS)
- **Agent Name:** Nitara — AI co-founder for solo entrepreneurs
- **Sanskrit Origin:** Niti (strategy) + Tara (star) = Strategic Star
- **One-line:** Turn uncertainty into decisions across a portfolio of ventures

## Read These First (Required)
Before implementing anything, read these context pack docs:
- `/docs/nitara/01_Vision.md` — Five modes (Think/Validate/Build/Grow/Leverage)
- `/docs/nitara/06_Screen_Inventory.md` — All screens and their status
- `/docs/nitara/08_Memory_Architecture.md` — File + vector + summary memory layers
- `/docs/nitara/09_Autonomy_and_Safety.md` — Tier 1/2/3 autonomy gates
- `/docs/nitara/07_Data_Model.md` — Core entities (Project, Hypothesis, Experiment, Decision)
- `/docs/nitara/15_Design_System.md` — Design token contract and component library

## Architecture Overview

Nitara is a **five-mode AI co-founder platform**. The UI is organized around modes, not pages.

**Five Operational Modes (bottom dock navigation):**
1. **Think** — Portfolio strategy, idea intake, scoring, hypothesis generation
2. **Validate** — Experiment design, measurement, decision gates (Scale/Iterate/Pivot/Park/Kill)
3. **Build** — Autonomous builder with agent runs, HITL checkpoints, approval queue
4. **Grow** — Resource allocation, KPI dashboards, simulation, go-to-market
5. **Leverage** — Network intelligence, playbook library, tool registry, partnerships

**Three Interface Layers:**
1. **Conversation Rail** — Persistent bottom bar (voice + text input, action cards, approvals)
2. **Canvas** — Main content area controlled by active mode + sub-tab
3. **Command Palette** — Cmd+K overlay for power-user navigation

**Navigation:** Bottom dock with mode-contextual sub-items (not sidebar icon rail).

## Tech Stack
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, Zustand
- **Backend:** Express 5, TypeScript, Node.js 22
- **Database:** PostgreSQL 16 (structured data via Drizzle ORM) + file vault (documents/reports)
- **AI:** Claude via OpenClaw gateway (Opus for reasoning, Sonnet for execution, Haiku for checks)
- **Memory:** Mem0 (semantic), Qdrant (vector), file vault (artifacts)
- **Voice:** LiveKit Agents (Deepgram STT + Cartesia TTS)
- **Agent System:** Claude Code CLI as execution engine, agent queue at `07_system/agent/queue/`

## Data Model (PostgreSQL)
Core entities — see `/docs/nitara/07_Data_Model.md` for full schema:
- **Project** — id, team_id, name, status, stage, autonomy_level, goals, constraints
- **Hypothesis** — id, project_id, statement, type, confidence, evidence_refs
- **Experiment** — id, project_id, hypothesis_id, metric, success_rule, results, decision
- **Decision** — id, project_id, experiment_id, action, rationale, evidence, counterarguments
- **AgentRun** — id, project_id, mode, agents, status, cost, approvals
- **Playbook** — id, project_id, steps, success_metrics, failure_modes
- **Approval** — id, team_id, agent_run_id, risk_tier, status

File vault stays for: markdown reports, conversation transcripts, agent queue files, config.

## Design System Tokens

### Colors (CSS Variables)
```css
:root {
  --color-base: #06080F;
  --color-surface: #0C1220;
  --color-elevated: #141E30;
  --color-border: rgba(30, 48, 80, 0.4);

  --color-primary: #00E5FF;       /* Electric cyan — Nitara's voice */
  --color-secondary: #FFB800;     /* Warm amber — attention, finance */
  --color-tertiary: #8B5CF6;      /* Soft violet — AI council */
  --color-success: #22C55E;
  --color-danger: #EF4444;

  --color-text-primary: #E8ECF1;
  --color-text-secondary: #7B8FA3;
  --color-text-tertiary: #4A5568;

  --glass-bg: rgba(12, 18, 32, 0.7);
  --glass-blur: blur(12px);
  --glass-border: rgba(30, 48, 80, 0.3);
}
```

### Typography
```css
--font-display: 'Syncopate', sans-serif;    /* Headings, labels */
--font-body: 'DM Sans', sans-serif;         /* Body text, UI */
--font-mono: 'JetBrains Mono', monospace;   /* Numbers, code, data */
```

### Spacing Scale
```
4px (xs), 8px (sm), 12px (md), 16px (base), 24px (lg), 32px (xl), 48px (2xl), 64px (3xl)
```

### Glass Levels
- **High** — Dock, critical overlays: `rgba(12, 18, 32, 0.85)` + `blur(20px)`
- **Medium** — Panels, cards: `rgba(12, 18, 32, 0.7)` + `blur(12px)`
- **Low** — Context surfaces: `rgba(12, 18, 32, 0.4)` + `blur(8px)`

### Design Token Contract
- All styles MUST use CSS variables (no hardcoded colors/fonts)
- If a new token is needed, add to `design/tokens.json` first, then use
- Tokens sync with CSS custom properties in `index.css`
- Validators enforce this: `validate-design-tokens.sh` runs on all Write/Edit

## Component Patterns

**Glass Card:**
```tsx
<div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-6">
  {children}
</div>
```

**Decision Gate Card:** Kill (red) / Scale (green) / Variant (amber) buttons with evidence summary.

**Typed Confirmation Modal:** For destructive actions — user types exact phrase to confirm. Always logs to audit trail.

**Experiment Card:** Confidence ring, signal volatility, p-value, operator override, decision buttons.

**Dock Nav:** Bottom dock with 5 mode icons, contextual sub-items per mode.

## File Structure
```
/srv/focus-flow/
├── CLAUDE.md                          # This file
├── docs/nitara/                       # Context pack (19 docs + mock data)
├── design/
│   ├── tokens.json                    # Canonical design tokens
│   ├── stitch_v1/                     # Stitch design exports (reference)
│   └── screens/                       # Per-screen design files
├── 02_projects/active/
│   ├── focus-flow-backend/src/        # Express backend
│   │   ├── services/                  # Business logic
│   │   ├── routes/                    # API routes
│   │   ├── db/                        # Drizzle schema + migrations
│   │   └── middleware/                # Auth, logging
│   └── focus-flow-ui/src/            # React frontend
│       ├── components/
│       │   ├── Canvas/                # Mode-specific screens
│       │   ├── ConversationRail/      # Persistent conversation
│       │   ├── Dock/                  # Bottom dock navigation
│       │   ├── CommandPalette/        # Cmd+K
│       │   ├── Onboarding/            # First-run flow
│       │   └── shared/                # Reusable components
│       ├── stores/                    # Zustand state
│       └── services/                  # API client
├── .claude/
│   ├── agents/                        # Agent definitions
│   ├── skills/                        # Skill definitions (3 tiers)
│   ├── scripts/                       # Hook scripts
│   └── hooks/validators/              # Deterministic Python validators
├── 07_system/
│   ├── agent/queue/                   # Autonomous agent queue
│   ├── agent/cost-budget.json         # Daily budget ($20 default)
│   ├── agent/schedule.json            # Scheduled tasks
│   └── agent/KILL_SWITCH              # Touch to halt all agents
└── 08_threads/                        # Conversation threads
```

## Naming Conventions
- Files: kebab-case for services (`experiment.service.ts`), PascalCase for components (`ExperimentStack.tsx`)
- Variables: camelCase
- Types/Interfaces: PascalCase
- API routes: `/api/` prefix, kebab-case paths
- Vault directories: numbered prefix (`07_system/`, `10_profile/`)
- CSS: Tailwind utilities + CSS variables for design tokens (never arbitrary values where tokens exist)

## Agent System

### Skill Tiers
- **Tier 1 (Atomic):** Do one thing with validator. Examples: `/think-score-project`, `/validate-create-experiment`
- **Tier 2 (Orchestrator):** Chain atomic skills. Examples: `/portfolio-review`, `/experiment-loop`
- **Tier 3 (User-facing):** Existing skills upgraded with proper frontmatter

### Mode Agents
- `nitara-think` — Portfolio strategy orchestrator
- `nitara-validate` — Experiment lifecycle orchestrator
- `nitara-build` — Build execution orchestrator
- `nitara-grow` — Growth and resource orchestrator
- `nitara-leverage` — Network and playbook orchestrator

### Autonomy Tiers (from `/docs/nitara/09_Autonomy_and_Safety.md`)
- **Tier 1 (Auto):** Research, reports, analysis, file writes — no approval needed
- **Tier 2 (Soft Gate):** Drafts, pipeline changes, budget adjustments — approval with rollback
- **Tier 3 (Hard Gate):** External comms, spending, deletion — typed confirmation required

### Kill Switch
`touch 07_system/agent/KILL_SWITCH` blocks all autonomous operations.

## Playbook System
Projects use configurable playbook templates (`07_system/playbooks/`):
- `software-build.json`, `client-engagement.json`, `content-course.json`, `studio-project.json`, `exploratory-idea.json`

## Archetype System
Three personality modes affecting Nitara's system prompt tone:
- **The Strategist:** Direct, data-driven, margin-focused
- **The Co-Founder:** Balanced, collaborative, growth-focused
- **The Critic:** Skeptical, risk-averse, edge-case focused

## Skill Precedence
During autonomous execution, Nitara's native skills take priority over superpowers equivalents:
- `plan-feature` takes priority over superpowers `writing-plans`
- `build-execute` takes priority over superpowers `executing-plans`
- `build-mvp` takes priority over superpowers `dispatching-parallel-agents`
- `review-code` takes priority over superpowers `requesting-code-review`

## Engineering Constraints
- Keep changes small and reversible
- Never remove existing pages; remap them into modes or link to them
- All destructive actions require typed confirmation + audit event
- Multi-user from start: all queries filter by `team_id`
- Desktop-first, responsive
- Project stages: Idea → Validation → MVP → Growth → Scale → Exit

## Definition of Done (every feature)
- Route + component implemented
- API endpoint connected to PostgreSQL via Drizzle
- Loading/empty/error states handled
- Design tokens used (no hardcoded styles)
- Validator passes
- Update docs if schema changed

## Canvas States → Mode Mapping
| Old Canvas | New Mode | Sub-tab |
|------------|----------|---------|
| morning_briefing | Think | Home (default) |
| portfolio | Think | Strategy |
| project_detail | Think | Ventures |
| financials | Think / Grow | Finance |
| network | Leverage | Network |
| calendar | Cmd+K accessible | — |
| settings | Cognition | Config |
| council_evaluation | Think | Project sub-view |
| weekly_report | Think | Reporting |

## UX Implementation Notes
1. Bottom dock must be identical structure across all modes. Only sub-items change.
2. StatCard must always include currency prefix ("CHF 4,200" not "4,200")
3. Revenue bars use type labels (RETAINER, PASSIVE, PIPELINE)
4. Conversation rail border has breathing animation (cyan pulse, 15-40% opacity)
5. Voice active screen dims canvas to 25-30% opacity
6. NitaraInsightCard: amber contextual notes from Nitara
7. High contrast text on dark-glass surfaces (4.5:1 minimum)
8. All interactive targets minimum 44px
