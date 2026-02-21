# Nitara — Claude Code Agent Launch Guide

## Prerequisites

Before launching any agents, complete these manual setup steps:

### 1. Place Project Files

Your repo currently has this structure for agent instructions:
```
/srv/focus-flow/02_projects/active/focus-flow-ui/.claude/
├── agents/builders/    (10 builder agents)
├── agents/validators/  (10 validator agents)
└── hooks/validators/   (lint, format, test scripts)
```

You need to place three files:

```bash
# Root-level CLAUDE.md (the master instructions file every agent reads)
cp Nitara_CLAUDE.md /srv/focus-flow/CLAUDE.md

# Tasks file (the work breakdown agents execute against)
cp Nitara_TASKS_v2.md /srv/focus-flow/TASKS.md

# Also copy into the UI project for frontend agents
cp Nitara_CLAUDE.md /srv/focus-flow/02_projects/active/focus-flow-ui/CLAUDE.md
```

### 2. Create Design Exports Directory

```bash
mkdir -p /srv/focus-flow/design-exports
# Save your Stitch PNG exports here, named by screen:
# design-system-v2.5.png
# morning-briefing.png
# voice-active.png
# portfolio.png
# network.png
# project-detail.png
# financials.png
# council-evaluation.png
# command-palette.png
# onboarding-step1-profile.png
# onboarding-step2-archetype.png
# onboarding-step3-network.png
# onboarding-step4-financials.png
# onboarding-step5-activated.png
# settings.png
# weekly-report.png
```

### 3. Verify the System is Running

```bash
# Backend should be healthy
curl http://localhost:3001/health

# Frontend should serve
curl http://localhost:5173
```

---

## Execution Strategy

You're adapting the existing codebase, not rebuilding. This means agents work on a stable foundation and you never have a broken system.

**Phase 0 runs first** (rename + tokens + playbooks). These are non-breaking changes. The app continues working throughout.

**Phase UX runs second** — agents build new components ALONGSIDE old ones. The old Dashboard, Capture, Inbox etc. continue working while new components are constructed in parallel directories. Only TASK-UX.7 (remove old pages) actually touches the existing routing — and that runs last.

**Phases 1-6 add new backend services** as new files. They don't modify existing code, they extend it.

**Recommended agent team sizes per phase:**
- Phase 0: Single agent, sequential (rename must be atomic)
- Phase UX: 3-4 agents in parallel (sidebar, canvas router, conversation rail, shared components are independent)
- Phase 1: 2-3 agents (profile service, network importer, network graph are independent)
- Phases 2-6: Follow dependency graph in TASKS.md

---

## Agent Launch Prompts

### PHASE 0: Foundation (Single Agent)

Launch one agent and paste this prompt:

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing Phase 0 of the Nitara Horizon 2 build. This phase has three tasks that must be completed in this order:

TASK-0.1: Product Rename — Focus Flow → Nitara
TASK-0.2: Design System Tokens
TASK-0.3: Playbook Templates

CRITICAL RULES:
- You are ADAPTING the existing codebase, NOT rebuilding from scratch
- The system must remain functional after every commit
- Do not delete any existing functionality
- Commit after each task with a clear message: "nitara: TASK-0.X description"

For TASK-0.1 (Rename):
- Find-and-replace across the entire repo: "Focus Flow" → "Nitara", "focus-flow" → "nitara", "focus_flow" → "nitara", "FOCUS_FLOW" → "NITARA"
- Update package.json names in all three packages (backend, frontend, telegram bot)
- Update the PWA manifest at focus-flow-ui/public/manifest.json
- Update any UI strings that say "Focus Flow" (check Layout.tsx, Dashboard.tsx, etc.)
- Create a symlink: ln -s /srv/focus-flow /srv/nitara
- Do NOT rename the vault directory paths yet (just the symlink), as the backend reads from these paths
- Verify with: grep -r "focus.flow" src/ — should return zero results
- Verify with: grep -r "Focus Flow" src/ — should return zero results
- Test: npm run build should succeed for both backend and frontend

For TASK-0.2 (Design Tokens):
- Edit focus-flow-ui/src/index.css (now nitara-ui after rename) to add all CSS variables from CLAUDE.md
- Add Google Fonts imports: Syncopate, DM Sans, JetBrains Mono
- Edit tailwind.config.js to extend with design tokens: font families (font-display, font-body, font-mono), colors mapped to CSS variables, glassmorphism utilities
- Add a breathing animation keyframe for the conversation rail input
- Test: npm run build should succeed, fonts should load in browser

For TASK-0.3 (Playbook Templates):
- Create directory: /srv/nitara/07_system/playbooks/
- Create 5 JSON files following this schema:
  {
    "id": "software-build",
    "name": "Software Build",
    "description": "End-to-end software product development",
    "phases": [
      {
        "id": "concept",
        "name": "Concept",
        "order": 1,
        "substeps": ["Brainstorm", "Research", "Define"],
        "approval_gate": false,
        "tools": []
      }
    ],
    "default_tools": []
  }
- Use the phase sequences from CLAUDE.md for each playbook type
- Test: JSON.parse should succeed on all 5 files

After completing all three tasks, run the full test suite and report any failures.
```

---

### PHASE UX: Interface Restructure (3-4 Agents in Parallel)

**Wait for Phase 0 to complete before launching these.**

#### Agent 1: Shared Components + Icon Rail

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing TASK-UX.6 (Shared Components Library) and TASK-UX.1 (Icon Rail Sidebar) from Phase UX of the Nitara Horizon 2 build.

CRITICAL RULES:
- You are building NEW components alongside the old ones, NOT replacing them yet
- All new components go in the existing src/components/ directory in new subdirectories
- Use the design tokens from index.css (CSS variables) — never hardcode colors
- Every component must be a typed React functional component with TypeScript
- Use Tailwind CSS classes mapped to design tokens where possible
- Do NOT modify App.tsx, Layout.tsx, or any existing routing yet

TASK-UX.6 — Build these components in src/components/shared/:

1. GlassCard.tsx — Frosted glass container
   Props: children, className?, variant?: 'default' | 'elevated'
   Uses: backdrop-filter: blur(12px), bg-[var(--glass-bg)], border-[var(--glass-border)]

2. ActionCard.tsx — Card with left accent stripe and action buttons
   Props: children, accent?: 'cyan' | 'amber' | 'violet', actions?: Array<{label, onClick, variant}>
   The 4px left border uses the accent color

3. NitaraInsightCard.tsx — Amber background contextual note from Nitara
   Props: children, title?: string (defaults to "NITARA NOTE")
   Used for strategic notes in project detail, network suggestions, financial advice

4. StatCard.tsx — Large number with label, sparkline, and trend
   Props: value: string, label: string, trend?: {direction: 'up'|'down'|'flat', percentage: string}, sparkData?: number[], currency?: string
   Numbers render in JetBrains Mono with tabular figures. If currency is provided, prefix the value.

5. Badge.tsx — Status pill with color variants
   Props: label: string, variant: 'active' | 'paused' | 'blocked' | 'completed' | 'council' | 'playbook'
   Colors: active=green, paused=grey, blocked=amber, completed=cyan, council=violet, playbook=cyan-outline

6. SparkLine.tsx — Tiny inline SVG chart
   Props: data: number[], color?: string, width?: number, height?: number
   Pure SVG, no chart library dependency

7. PipelineNode.tsx — Single pipeline phase node
   Props: status: 'completed' | 'active' | 'upcoming' | 'blocked', label: string, size: 'compact' | 'full'
   Completed: solid fill + check. Active: larger, glowing border, pulse animation. Upcoming: outlined, faint. Blocked: amber outline.

8. ConfidenceRing.tsx — Circular progress for council scores
   Props: score: number (0-10), label?: string, size?: 'sm' | 'md' | 'lg'
   SVG circle with stroke-dasharray animation. Violet accent for council.

9. RelationshipDots.tsx — 3-dot strength indicator
   Props: strength: 'strong' | 'medium' | 'weak' | 'dormant'
   Strong: 3 filled cyan. Medium: 2 filled, 1 grey. Weak: 1 filled, 2 grey. Dormant: 3 grey.
   Empty dots MUST be visible grey (#334155), not near-invisible.

TASK-UX.1 — Build in src/components/Sidebar/IconRail.tsx:
- 48px wide vertical icon rail, 5 items
- Icons: use Lucide React icons (Sparkles for Nitara, LayoutGrid for Portfolio, Network for Network, Clock for Calendar, Settings for Settings)
- Active item: cyan glow + left accent bar (4px)
- Inactive items: muted grey
- Tooltip on hover showing label
- Collapsible via Cmd+\ keyboard shortcut
- Export as default

After building all components, create a simple test page (src/components/shared/ComponentShowcase.tsx) that renders every component with sample data so you can visually verify them. Do NOT add routing to it — just create the file.

Commit with: "nitara: TASK-UX.6 shared components library + TASK-UX.1 icon rail sidebar"
```

#### Agent 2: Canvas Router + Morning Briefing

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing TASK-UX.2 (Canvas Router) and TASK-UX.5 (Morning Briefing Canvas) from Phase UX of the Nitara Horizon 2 build.

CRITICAL RULES:
- Build new components alongside old ones — do NOT modify App.tsx or Layout.tsx yet
- The CanvasRouter and MorningBriefing are new files in new directories
- Import shared components from src/components/shared/ (built by another agent — if they don't exist yet, create placeholder imports and mark with TODO)
- Use Zustand for canvas state management

TASK-UX.2 — Canvas Router:

Create src/stores/canvas.ts:
```typescript
type CanvasState = 'morning_briefing' | 'portfolio' | 'network' | 'financials' | 'project_detail' | 'calendar' | 'settings' | 'council_evaluation' | 'weekly_report' | 'onboarding';

interface CanvasStore {
  activeCanvas: CanvasState;
  canvasParams: Record<string, string>; // e.g., { projectId: '...' }
  previousCanvas: CanvasState | null;
  setCanvas: (canvas: CanvasState, params?: Record<string, string>) => void;
  goBack: () => void;
}
```

Create src/components/Canvas/CanvasRouter.tsx:
- Reads activeCanvas from Zustand store
- Renders the matching canvas component via a switch/map
- Wraps transitions in a CSS crossfade (300ms ease, opacity transition)
- For canvases that don't exist yet, render a placeholder: <div className="text-text-secondary p-8">[CanvasName] — Coming Soon</div>
- The CanvasRouter itself has NO sidebar or conversation rail — those are siblings in the layout, not children

TASK-UX.5 — Morning Briefing:

Create src/components/Canvas/MorningBriefing.tsx:
- Greeting: "GOOD MORNING, VIMO." (hardcode name for now, will be dynamic from profile later)
- Time display: current time in JetBrains Mono, date below
- Summary line: "You have N priorities today, N approvals pending, and a warm lead from your Zürich network." with highlighted numbers
- 5 widget cards using GlassCard:
  1. Today's Focus — 3 priority items with project tag and status badge
  2. Pending Approvals — stacked ActionCards with amber accent, EDIT/APPROVE buttons
  3. Financial Pulse — 3 StatCards (revenue, costs, net) with CHF prefix and sparklines
  4. Network Intel — contact name, title, company, suggestion text, DRAFT MESSAGE button
  5. Calendar — 3 content items with status badges (DRAFTED, PLANNED, QUEUE)
- Layout: asymmetric CSS grid, NOT a rigid 3-column. Today's Focus and Approvals are larger (top row), Financial/Network/Calendar are smaller (bottom row).
- All data should come from API calls to existing endpoints where possible (GET /api/tasks for priorities, GET /api/inbox for approvals). For data that doesn't exist yet (financial pulse, network intel), use realistic hardcoded placeholder data with a TODO comment.

Commit with: "nitara: TASK-UX.2 canvas router + TASK-UX.5 morning briefing"
```

#### Agent 3: Conversation Rail

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing TASK-UX.3 (Conversation Rail) from Phase UX of the Nitara Horizon 2 build.

CRITICAL RULES:
- Build as a new component in src/components/ConversationRail/
- Do NOT modify existing Voice/ components or voice hooks
- The conversation rail is a SEPARATE system from the old voice command overlay
- Use the existing API service (src/services/api.ts) to send messages to the backend

Build these files:

src/components/ConversationRail/ConversationRail.tsx:
- Persistent bar anchored at the bottom of the screen (fixed position, full canvas width)
- Text input with auto-expanding height (min 1 line, max 4 lines)
- Input has the breathing border animation: subtle cyan pulse cycling between 15% and 40% opacity on a 3s ease-in-out loop
- Mic button on the left (circular, cyan border, dark fill — click toggles recording state, will connect to LiveKit later via useVoice hook)
- Send button on the right (arrow icon, cyan fill when input has text, muted when empty)
- Above the input: the last Nitara message as a compact bar (cyan dot + "Nitara: [message text]" truncated to one line)
- Click on the compact bar OR swipe up expands the full conversation thread as a sheet overlay
- Sheet overlay: slides up from bottom, covers ~60% of screen, background canvas visible but dimmed to 25-30% opacity with backdrop blur
- Thread is scrollable, newest messages at bottom

src/components/ConversationRail/MessageBubble.tsx:
- Props: role: 'user' | 'nitara', content: string, timestamp?: string, children?: ReactNode (for inline cards)
- User messages: right-aligned, dark card background, no icon
- Nitara messages: left-aligned, ✦ star icon in cyan, faint cyan left border (2px), "NITARA" label + timestamp in small muted text above message

src/components/ConversationRail/ActionCard.tsx:
- Props: title: string, description?: string, accent: 'cyan' | 'amber' | 'violet', actions: Array<{label, onClick, variant: 'primary' | 'secondary'}>
- Renders inline within a Nitara message bubble
- Left accent stripe (4px) in the accent color
- Action buttons at bottom right of card
- Primary button: cyan fill. Secondary button: outline/ghost.

src/stores/conversation.ts (Zustand):
- messages: Array<{id, role, content, timestamp, cards?: ActionCard[]}>
- isExpanded: boolean (sheet overlay state)
- isRecording: boolean (mic state)
- sendMessage: (content: string) => void — calls POST /api/threads/messages or similar existing endpoint
- addNitaraMessage: (content: string, cards?: ActionCard[]) => void

The conversation rail should work independently of the canvas — it persists across all canvas state changes. When the canvas changes (e.g., from morning_briefing to portfolio), the conversation rail stays in place with its thread intact.

For now, wire sendMessage to POST to an existing chat endpoint (check orchestrator-chat.routes.ts or threads.routes.ts). If no suitable endpoint exists, create a simple echo response for testing.

Commit with: "nitara: TASK-UX.3 conversation rail with message bubbles and action cards"
```

#### Agent 4: Command Palette

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing TASK-UX.4 (Command Palette) from Phase UX of the Nitara Horizon 2 build.

Install the cmdk library: npm install cmdk

Build src/components/CommandPalette/CommandPalette.tsx:
- Triggered by Cmd+K (Mac) / Ctrl+K (Windows/Linux)
- Centered modal overlay, 560-600px wide, max 520px tall
- Background: dimmed (30% opacity) with backdrop blur
- Search input at top: "Search projects, partners, or ask a question..." placeholder. ✦ icon left. "Cmd + K" badge right.

Sections (in order):
1. RECENT CONTEXT — last 2-3 items the user interacted with, shown as small cards with icon, name, and timestamp ("Opened 2m ago"). Pull from a simple Zustand store that tracks navigation history.
2. SUGGESTED ACTIONS — contextual chips based on canvas state. Hardcode 3-4 per canvas state for now (e.g., morning_briefing shows "Run revenue forecast", "Draft outreach to Savya", "Review last 3 invoices").
3. TOP MATCHES — filtered results from projects, contacts, documents, and tasks. Each row: icon (color-coded by type), name, subtitle (type + phase or role), optional right-aligned badge.
4. Quick Actions at bottom if no query: "New Project" (⌘N), "New Idea", "Import LinkedIn contacts", "Draft email..."

Query prefix system:
- / prefix → filter to AI Commands only
- @ prefix → filter to Contacts only
- # prefix → filter to Projects only

Row selection: currently highlighted row has bg-[rgba(0,229,255,0.08)] background. Arrow keys navigate. Enter selects. Escape closes.

Bottom bar: "↑↓ to navigate · ↵ to jump · / to ask Nitara · # for projects · @ for people"

Create src/hooks/useCommandPalette.ts:
- Keyboard shortcut listener (Cmd+K / Ctrl+K)
- Recent context tracking (last 5 navigation events)
- Suggested actions per canvas state (hardcoded map for now)

Wire project results to GET /api/projects and contact results to GET /api/crm/contacts (existing endpoints). If contacts endpoint returns empty, use placeholder data.

Commit with: "nitara: TASK-UX.4 enhanced command palette with recent context and suggestions"
```

---

### PHASE UX INTEGRATION: Bring It Together (Single Agent, After All 4 Complete)

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing TASK-UX.7 (Remove Old Pages) — the integration step that switches the app from the old 14-page navigation to the new Nitara architecture.

CRITICAL: This is the only task that modifies existing routing. All new components (IconRail, CanvasRouter, ConversationRail, CommandPalette, MorningBriefing, shared components) should already exist from the parallel agent work. Verify they all exist before proceeding.

Step 1: Create the new layout wrapper.
Create src/components/Layout/NitaraLayout.tsx:
- Structure: IconRail (left, 48px fixed) + CanvasRouter (center, fills remaining space) + ConversationRail (bottom, fixed)
- CommandPalette is rendered as an overlay (always mounted, hidden until Cmd+K)
- The old Layout.tsx with its 14-item sidebar is NOT modified — it's preserved as-is

Step 2: Move old components to _legacy.
```bash
mkdir -p src/components/_legacy
mv src/components/Dashboard src/components/_legacy/
mv src/components/Capture src/components/_legacy/
mv src/components/Inbox src/components/_legacy/
mv src/components/Voice src/components/_legacy/
mv src/components/VoiceControl src/components/_legacy/
mv src/components/Wellbeing src/components/_legacy/
mv src/components/CommandCenter src/components/_legacy/
# Keep these — they'll be adapted for new canvases:
# Projects/, ProjectDetail/, CRM/, Ideas/, IdeaDetail/, Calendar/, Sales/, Settings/
```

Step 3: Update App.tsx routing.
- Replace the old Layout + React Router setup with NitaraLayout
- The NitaraLayout handles all "routing" via the CanvasRouter (no URL-based routing needed for canvas states)
- Keep one React Router catch-all route that renders NitaraLayout
- First-run detection: if no FounderProfile exists (check GET /api/profile or a local flag), set canvas to 'onboarding'

Step 4: Verify.
- App loads with 5-item icon rail on the left
- Morning Briefing renders as the default canvas
- Conversation rail is visible at the bottom
- Cmd+K opens the command palette
- Clicking sidebar icons changes the canvas (most will show "Coming Soon" placeholder — that's correct)
- No console errors from missing old components
- Old _legacy components are preserved but not imported

Step 5: Update the PWA manifest if not already done (title: "Nitara", short_name: "Nitara").

Commit with: "nitara: TASK-UX.7 switch to new Nitara layout architecture"

After this commit, the app is running on the new architecture. All subsequent phases add canvas implementations and backend services on top of this foundation.
```

---

## After Phase UX: Continuing to Phase 1+

Once the UX integration is complete and the app loads on the new architecture, launch Phase 1 agents following the same pattern. The general prompt template for any task is:

```
Read /srv/focus-flow/CLAUDE.md and /srv/focus-flow/TASKS.md thoroughly before doing anything.

You are executing [TASK-ID]: [TASK NAME] from [PHASE NAME] of the Nitara Horizon 2 build.

Read the task description, file targets, dependencies, and acceptance criteria from TASKS.md carefully.

CRITICAL RULES:
- You are ADAPTING the existing codebase, NOT rebuilding
- The system must remain functional after every commit
- Do not delete any existing functionality unless the task explicitly says to
- Use design tokens from CLAUDE.md — never hardcode colors or fonts
- All new backend services go in src/services/ with corresponding routes in src/routes/
- All new frontend components go in src/components/ following the directory structure in CLAUDE.md
- Commit with: "nitara: [TASK-ID] [brief description]"
- After completing the task, verify all acceptance criteria are met

Begin by examining the existing code that your task depends on or extends, then implement the task.
```

---

## Quick Reference: Task Dependency Graph

```
TASK-0.1 ─────────────────────────────────────────────┐
TASK-0.2 ──┬── TASK-UX.1 ── TASK-UX.2 ──┬── TASK-UX.5  │
           │                             ├── TASK-UX.8  │
           │                             ├── TASK-UX.9  │
           │                             └── TASK-UX.10 │
           ├── TASK-UX.3 ── TASK-V.1                   │
           └── TASK-UX.6 ──────────────────────────────┤
TASK-0.3 ──────────────────────────────────────────────┤
                                                       │
TASK-UX.7 (integration) depends on ALL UX tasks above  │
                                                       │
TASK-0.1 ── TASK-1.1 ──┬── TASK-1.2 ── TASK-1.3       │
                       └── TASK-3.2                    │
TASK-1.2 ── TASK-1.5 (onboarding needs importer)       │
TASK-0.3 ── TASK-2.1 ── TASK-2.3                       │
TASK-1.3 ── TASK-2.2                                   │
TASK-0.1 ── TASK-3.1 ──┬── TASK-3.2                    │
                       ├── TASK-3.3                    │
                       └── TASK-3.4                    │
TASK-3.1 ── TASK-4.1 ──┬── TASK-4.2                    │
                       ├── TASK-4.3                    │
                       └── TASK-4.4                    │
TASK-0.1 ── TASK-5.1                                   │
TASK-0.1 ── TASK-6.1                                   │
```
