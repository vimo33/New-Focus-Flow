# CLAUDE.md — Nitara Project Instructions

## Project Identity
- **Product Name:** Nitara (formerly Focus Flow OS)
- **Agent Name:** Nitara (the AI business partner the user talks to)
- **Sanskrit Origin:** Niti (strategy) + Tara (star) = Strategic Star
- **One-line:** Conversation-first AI business partner for solo entrepreneurs

## Architecture Overview

Nitara is a conversation-first application. The user talks to Nitara (voice or text) and Nitara controls what appears on the visual canvas. The UI is NOT a traditional page-navigation app — the conversation drives the experience.

**Three interface layers:**
1. **Conversation Rail** — persistent bottom bar on every screen (voice + text input, action cards, approval flows)
2. **Canvas** — the main content area that Nitara controls (morning briefing, portfolio, network, financials, project detail, calendar, settings, council evaluation, weekly report, onboarding)
3. **Command Palette** — Cmd+K overlay for power-user navigation (enhanced with Recent Context and Suggested Actions)

**Five sidebar items (thin icon rail, 48px):**
1. ✦ Nitara (home/conversation + morning briefing)
2. ◈ Portfolio (all projects and ideas)
3. ⊛ Network (contacts, partners, relationships)
4. ◷ Calendar (time-based view)
5. ⚙ Settings (profile, preferences, integrations)

## Tech Stack
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS 4, Zustand
- **Backend:** Express 5, TypeScript, Node.js 22
- **AI:** Claude via OpenClaw gateway (Sonnet for operations, Opus for council/synthesis)
- **Memory:** Mem0 (semantic memory), Qdrant (vector store)
- **Voice:** LiveKit Agents (Deepgram STT + Cartesia TTS)
- **State Machine:** XState v5 for Core Agent, BullMQ for job queues
- **Storage:** File-based JSON vault (migrating to SQLite)

## Design System Tokens

### Colors (CSS Variables)
```css
:root {
  --color-base: #06080F;          /* Deep void black */
  --color-surface: #0C1220;       /* Card backgrounds */
  --color-elevated: #141E30;      /* Interactive elements */
  --color-border: rgba(30, 48, 80, 0.4); /* Luminous borders */
  
  --color-primary: #00E5FF;       /* Electric cyan — Nitara's voice */
  --color-secondary: #FFB800;     /* Warm amber — attention, finance */
  --color-tertiary: #8B5CF6;      /* Soft violet — AI council, intelligence */
  --color-success: #22C55E;       /* Phosphor green */
  --color-danger: #EF4444;        /* Error red */
  
  --color-text-primary: #E8ECF1;  /* Cool white */
  --color-text-secondary: #7B8FA3; /* Muted blue-grey */
  --color-text-tertiary: #4A5568; /* Faded */
  
  /* Glassmorphism */
  --glass-bg: rgba(12, 18, 32, 0.7);
  --glass-blur: blur(12px);
  --glass-border: rgba(30, 48, 80, 0.3);
}
```

### Typography
```css
/* Import in index.css */
@import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  --font-display: 'Syncopate', sans-serif;    /* Headings, labels */
  --font-body: 'DM Sans', sans-serif;         /* Body text, UI */
  --font-mono: 'JetBrains Mono', monospace;   /* Numbers, code, data */
}
```

### Spacing Scale
```
4px (xs), 8px (sm), 12px (md), 16px (base), 24px (lg), 32px (xl), 48px (2xl), 64px (3xl)
```

### Component Patterns

**Glass Card:**
```tsx
<div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-6">
  {children}
</div>
```

**Action Card (with left accent):**
```tsx
<div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-xl p-4 border-l-4 border-l-[var(--color-primary)]">
  {/* Use --color-secondary for amber (approvals), --color-tertiary for violet (council) */}
</div>
```

**Pipeline Node:**
```tsx
// Completed: solid fill + check
// Active: larger, glowing border, pulse animation
// Future: outlined, faint
// Blocked: amber outline
```

**Nitara Message:**
```tsx
<div className="flex gap-3 items-start">
  <span className="text-[var(--color-primary)] text-lg">✦</span>
  <div className="bg-[var(--glass-bg)] rounded-xl rounded-tl-sm p-4 border-l-2 border-l-[var(--color-primary)]">
    {message}
  </div>
</div>
```

## File Structure

```
/srv/nitara/
├── src/
│   ├── services/           # Backend services
│   ├── routes/             # Express route handlers
│   ├── middleware/          # Auth, logging, etc.
│   └── types/              # Shared TypeScript types
├── 02_projects/active/nitara-ui/
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css        # Tailwind + design tokens
│       ├── components/
│       │   ├── ConversationRail/    # Persistent bottom conversation
│       │   │   ├── ConversationRail.tsx
│       │   │   ├── VoiceInput.tsx   # LiveKit push-to-talk
│       │   │   ├── MessageBubble.tsx
│       │   │   └── ActionCard.tsx   # Inline approvals
│       │   ├── Canvas/              # Canvas router and views
│       │   │   ├── CanvasRouter.tsx  # Renders based on context
│       │   │   ├── MorningBriefing.tsx
│       │   │   ├── PortfolioCanvas.tsx
│       │   │   ├── NetworkCanvas.tsx
│       │   │   ├── FinancialsCanvas.tsx
│       │   │   ├── ProjectCanvas.tsx
│       │   │   ├── CalendarCanvas.tsx
│       │   │   ├── SettingsCanvas.tsx
│       │   │   ├── CouncilEvaluationCanvas.tsx
│       │   │   └── WeeklyReportCanvas.tsx
│       │   ├── CommandPalette/      # Cmd+K
│       │   │   └── CommandPalette.tsx
│       │   ├── Sidebar/            # 5-item icon rail
│       │   │   └── IconRail.tsx
│       │   ├── Pipeline/           # Luminous node visualization
│       │   │   └── PlaybookPipeline.tsx  # size='compact' | 'full'
│       │   ├── Onboarding/         # First-run 5-step flow
│       │   │   ├── OnboardingFlow.tsx
│       │   │   ├── OnboardingStep1Profile.tsx
│       │   │   ├── OnboardingStep2Archetype.tsx
│       │   │   ├── OnboardingStep3Network.tsx
│       │   │   ├── OnboardingStep4Financials.tsx
│       │   │   └── OnboardingStep5Activated.tsx
│       │   └── shared/             # Buttons, cards, badges, etc.
│       │       ├── GlassCard.tsx
│       │       ├── ActionCard.tsx
│       │       ├── NitaraInsightCard.tsx  # Amber contextual notes
│       │       ├── StatCard.tsx
│       │       ├── Badge.tsx
│       │       ├── SparkLine.tsx
│       │       ├── ConfidenceRing.tsx    # Circular progress (council/confidence)
│       │       └── RelationshipDots.tsx  # 3-dot strength indicator
│       ├── stores/
│       │   ├── conversation.ts     # Conversation state (Zustand)
│       │   ├── canvas.ts           # Active canvas state
│       │   └── app.ts              # Global app state
│       ├── hooks/
│       │   ├── useVoice.ts         # LiveKit voice hook
│       │   ├── useCanvas.ts        # Canvas state management
│       │   └── useCommandPalette.ts
│       └── services/
│           └── api.ts              # Backend API client
```

## Naming Conventions
- Files: kebab-case for services (`financials.service.ts`), PascalCase for React components (`GlassCard.tsx`)
- Variables: camelCase
- Types/Interfaces: PascalCase, prefix with `I` only for service interfaces
- API routes: `/api/` prefix, kebab-case paths
- Vault directories: numbered prefix (`10_profile/`, `10_financials/`)
- CSS: Tailwind utility classes, CSS variables for design tokens (no arbitrary values where tokens exist)

## Playbook System
Projects use configurable playbook templates (JSON in `07_system/playbooks/`):
- `software-build.json` — Concept → Evaluate → Spec → Design → Dev → Test → Deploy → Live
- `client-engagement.json` — Opportunity → Proposal → Negotiate → Engage → Deliver → Review → Close
- `content-course.json` — Concept → Outline → Create → Review → Publish → Promote → Iterate
- `studio-project.json` — Opportunity → Scope → Evaluate → Propose → Win/Lose → Deliver → Retrospect
- `exploratory-idea.json` — Capture → Expand → Evaluate → Decide

## Migration Notes
- All references to "Focus Flow" → "Nitara"
- All references to "venture" → "project"
- All references to "Co-CEO" or "Core Agent" → "Nitara" (in user-facing text) or "NitaraAgent" (in code)
- Vault root: `/srv/focus-flow/` → `/srv/nitara/` (use symlink during transition)
- systemd: `focus-flow-backend` → `nitara-backend`
- Package: `focus-flow-os` → `nitara`

## Testing
- Backend: Integration tests per route file
- Frontend: Playwright E2E tests (existing 150+ tests need path updates after rename)
- Voice: Manual testing with LiveKit dev server
- Always run `tsc --noEmit` before committing

## Important Constraints
- Single-user system (no multi-tenancy)
- Claude Pro Max subscription via OpenClaw (setup-token auth)
- All external communications are hard-gate (Tier 3) — never auto-send
- Financial data is decision-support, not accounting compliance
- LinkedIn data via export ZIP only, no scraping
- Email metadata only, never read content
- Voice: push-to-talk only (no always-listening)

## Archetype System

Nitara has three personality archetypes that affect her system prompt tone, confidence expression, and strategic framing. The user selects during onboarding (step 2) and can change in Settings.

**The Strategist:** Direct, data-driven, ruthlessly efficient. Focuses on margins and ROI. Tone: professional. Confidence expression: HIGH. When reviewing a plan: "The margins are thin. I'd restructure the pricing before proceeding."

**The Co-Founder:** Balanced, collaborative, creative. Focuses on vision and long-term growth. Tone: encouraging. Confidence expression: HIGH. When reviewing a plan: "It's ambitious. Let's find the most sustainable path to that first 10k."

**The Critic:** Skeptical, risk-averse, thorough. Focuses on edge cases and failure points. Tone: sharp. Confidence expression: HIGHEST. When reviewing a plan: "Three assumptions here are untested. I'd validate the cheapest one first."

Stored as `preferred_archetype` on FounderProfile. Affects prompt templating in the conversation service — the archetype is injected into Nitara's system prompt to shape her tone and approach.

## Onboarding Flow (5 Steps)

First-run only (detect by checking if FounderProfile exists). Full-screen, no sidebar. Progress dots at top.

1. **Profile Conversation** — Nitara introduces herself, user describes their work, Nitara renders profile card with ALL extracted data (not just name/location — include work descriptions, skills, active projects mentioned).
2. **Choose Your Partner's Voice** — Three archetype cards with preview message. Selection persists to FounderProfile.
3. **Mapping Your Constellation** — LinkedIn ZIP upload with real-time progress via SSE (contacts found, high-value opps identified). Contact cards appear as discovered. Skip option available.
4. **Defining Your Financial Gravity** — Editable income source cards, orbital revenue/burn visualization, Nitara Intelligence goal-gap analysis. Runway and safety net indicators.
5. **System Activated** — Summary stats (archetype, network nodes, projects, revenue). "ENTER COMMAND CENTER" button. Shows only once, ever.

After step 5, sidebar appears and morning briefing loads.

## Canvas States Reference

| State | Triggered By | Sidebar Active |
|-------|-------------|---------------|
| morning_briefing | App open (default), Nitara sidebar click | ✦ Nitara |
| portfolio | Portfolio sidebar click, "show my portfolio" | ◈ Portfolio |
| network | Network sidebar click, "show my network" | ⊛ Network |
| financials | "how are we doing financially", "show financials" | ✦ Nitara |
| project_detail | Click project card, "show [project name]" | ◈ Portfolio |
| calendar | Calendar sidebar click | ◷ Calendar |
| settings | Settings sidebar click | ⚙ Settings |
| council_evaluation | "run council evaluation", click from portfolio | ✦ Nitara |
| weekly_report | Nitara generates weekly, "show weekly report" | ✦ Nitara |
| onboarding | First run only (no sidebar visible) | None |

## UX Audit Implementation Notes

These are specific implementation details from the design review. All agent teams should follow these:

1. **Sidebar must be identical across all screens.** Same 5 icons, same component. Only the active state changes. Do not create per-screen sidebar variations.
2. **StatCard must always include currency prefix.** "CHF 4,200" not "4,200". The morning briefing and financials view must be consistent.
3. **PipelineNode must accept size prop.** `size='compact'` for portfolio cards, `size='full'` for project detail. Same component, two render modes.
4. **RelationshipDots need visible contrast.** Filled dots: cyan (#00E5FF). Empty dots: visible grey (#334155). Not near-invisible.
5. **Revenue bars must use consistent labeling.** Use revenue type labels (RETAINER, PASSIVE, PIPELINE) rather than target percentages, since not all projects have targets.
6. **Conversation rail breathing animation.** The text input border should have a subtle cyan pulse when idle: `animation: breathe 3s ease-in-out infinite` cycling border opacity between 15% and 40%.
7. **Profile card in onboarding must show all extracted data.** When the user says "I'm starting an AI consulting studio with my friend Savya, I do freelance projects, and I teach courses" — the profile card must show all three work items, not just name and location.
8. **NitaraInsightCard** is a reusable component for contextual notes from Nitara. Amber/yellow background variant of ActionCard. Used in project detail (client context notes), network view (suggestions), and financials (strategic advice).
9. **Voice Active screen dims canvas to 25-30% opacity.** Not 10% (too faint to retain context). The user should still see a ghost of the morning briefing while the conversation is active.
