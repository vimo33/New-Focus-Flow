# Nitara Horizon 2 — Epic Task Breakdown v2

## How to Use This File

This is a Beads-compatible task file. Each task has an ID, description, file targets, dependencies, and acceptance criteria. Agent teams should pick up tasks in dependency order. Tasks within the same phase can be parallelized where dependencies allow.

**Agent team assignments are suggested per phase in the PRD:**
- Phase 0: Foundation — rename, tokens, playbooks (3 parallel tasks)
- Phase UX: Agent team (3-4 teammates) — sidebar, canvas, conversation rail, command palette, shared components can build in parallel
- Phase 1: Agent team (3-4) — profile, network importer, graph service have clear boundaries
- Phase 2: Sequential — dashboard depends on scoring which depends on evaluation
- Phase 3: Agent team (3-4) — financials, opportunity scanner, income strategy engine in parallel
- Phase 4: Agent team (3-4) — GTM orchestrator, blog/social/email publishers in parallel
- Phase 5: Sequential — confidence integrates into existing Core Agent
- Phase 6: Single agent — small scope

**Total screens to implement: 15** (design system reference + 9 core canvases + 5-step onboarding)

**Design references:** All Stitch exports are in `/srv/nitara/design-exports/`. Reference these during implementation for exact spacing, colors, and component patterns. The Design System screen (v2.5) is the source of truth for tokens.

---

## PHASE 0: RENAME & FOUNDATION

### TASK-0.1: Product Rename — Focus Flow → Nitara
**Priority:** P0 (must be first)
**Files:** All files across backend and frontend
**Description:** Rename all references from "Focus Flow" / "focus-flow" to "Nitara" / "nitara". This includes package.json names, systemd service names, Docker container names, PWA manifest, UI strings, code comments, import paths, vault root references, and documentation. Create a symlink from /srv/focus-flow to /srv/nitara for backward compatibility.
**Acceptance:** `grep -r "focus.flow" src/` returns zero results. `grep -r "Focus Flow" src/` returns zero results. App loads and displays "Nitara" everywhere. systemd service renamed and running.

### TASK-0.2: Design System Tokens
**Priority:** P0
**Files:** `nitara-ui/src/index.css`, `nitara-ui/tailwind.config.ts`
**Description:** Implement the Nitara design system as CSS variables and Tailwind config. Add Google Fonts imports (Syncopate, DM Sans, JetBrains Mono). Define all color tokens, typography scale, spacing scale, and glassmorphism utilities. Create Tailwind plugin or extend config to map design tokens to utility classes. Syncopate is used ONLY for the "NITARA" brand mark and section numbers — all other headings use DM Sans Bold/Medium. Reference the Design System screen (v2.5) for exact values.
**Acceptance:** All CSS variables from CLAUDE.md are defined. Tailwind classes like `font-display`, `font-mono`, `text-primary`, `bg-surface`, `bg-glass` work. Fonts load correctly. Muted Teal (#3BBFB2) is available as a distinct token from Electric Cyan (#00E5FF).

### TASK-0.3: Playbook Templates
**Priority:** P0
**Files:** `07_system/playbooks/software-build.json`, `client-engagement.json`, `content-course.json`, `studio-project.json`, `exploratory-idea.json`
**Description:** Create the five playbook JSON templates. Each defines: id, name, description, phases (array of {id, name, substeps[], approval_gate, tools[]}), and default_tools. The existing pipeline engine should be able to load these. Add a PlaybookType field to the Project model.
**Acceptance:** All five playbook JSONs are valid and loadable. Creating a new project with playbook_type selects the correct pipeline template.

---

## PHASE UX: INTERFACE RESTRUCTURE

### TASK-UX.1: Icon Rail Sidebar
**Priority:** P0
**Depends:** TASK-0.2
**Files:** `nitara-ui/src/components/Sidebar/IconRail.tsx`
**Description:** Replace the current 14-item sidebar with a 48px wide icon rail showing exactly 5 items: Nitara (✦ star icon), Portfolio (grid icon), Network (nodes icon), Calendar (clock icon), Settings (gear icon). Active item has cyan glow with a left accent bar. Rail has a faint luminous left edge. Collapsible via Cmd+\\ or `[` key. Icons only, no labels (tooltip on hover). The sidebar must be identical across ALL screens — same component, same 5 icons, only the active state changes.
**Acceptance:** Exactly 5 icons render (no more, no fewer). Clicking changes active state. Rail collapses and expands. Active icon glows with primary color and has left accent bar. Keyboard shortcuts work. Component is reused identically across all canvases.

### TASK-UX.2: Canvas Router
**Priority:** P0
**Depends:** TASK-UX.1
**Files:** `nitara-ui/src/components/Canvas/CanvasRouter.tsx`, `nitara-ui/src/stores/canvas.ts`
**Description:** Create a CanvasRouter component that renders the appropriate canvas based on a `canvasState` value in the Zustand store. Canvas states: 'morning_briefing', 'portfolio', 'network', 'financials', 'project_detail', 'calendar', 'settings', 'council_evaluation', 'weekly_report', 'onboarding'. The sidebar icon clicks set the canvas state. Nitara's conversation can also set it programmatically. Transitions between states use a 300ms crossfade.
**Acceptance:** Clicking sidebar icons switches canvas. Canvas transitions are smooth. State persists across conversation interactions. Nitara can set canvas state programmatically from conversation context.

### TASK-UX.3: Conversation Rail
**Priority:** P0
**Depends:** TASK-0.2
**Files:** `nitara-ui/src/components/ConversationRail/ConversationRail.tsx`, `MessageBubble.tsx`, `ActionCard.tsx`
**Description:** Build the persistent conversation rail that anchors at the bottom of every screen. Includes: text input with expanding height and a subtle breathing border glow animation (faint cyan pulse when idle), mic button (left), send button (right), conversation thread that slides up as a sheet overlay (not replacing canvas). Messages alternate between user (right-aligned, dark card) and Nitara (left-aligned, ✦ icon, cyan left accent, timestamp). ActionCard component renders inline approval cards with [Approve] [Edit] [Reject] buttons. Inline project cards and financial cards also render within the conversation (see Voice Active screen reference).
**Implementation note:** The breathing border animation should be a CSS keyframe: `@keyframes breathe { 0%, 100% { border-color: rgba(0, 229, 255, 0.15); } 50% { border-color: rgba(0, 229, 255, 0.4); } }` applied with `animation: breathe 3s ease-in-out infinite`.
**Acceptance:** Conversation rail visible on every screen. Text input works with breathing glow. Messages render with correct alignment and styling. ActionCards render inline with functional buttons. Thread scrolls. Sheet overlay doesn't replace canvas.

### TASK-UX.4: Command Palette (Enhanced)
**Priority:** P1
**Depends:** TASK-UX.2
**Files:** `nitara-ui/src/components/CommandPalette/CommandPalette.tsx`, `nitara-ui/src/hooks/useCommandPalette.ts`
**Description:** Implement Cmd+K command palette using the cmdk library (pacocoursey/cmdk). Enhanced version includes: "Recent Context" section showing last 2-3 items the user interacted with (project cards, contacts) with timestamps, "Suggested Actions" section showing contextual action chips based on current state (e.g., "Run revenue forecast", "Draft outreach to Savya"), then standard sections for Quick Actions, Projects, Contacts, AI Commands. Query prefixes: `>` commands, `/` AI, `@` contacts, `#` projects. Selected row has visible cyan background tint (`bg-cyan-950/30`). Keyboard navigation (arrows, enter, escape). Bottom hint bar showing shortcuts. Palette width: 560-600px, minimum row height: 40px.
**Design reference:** Image 8 (enhanced command palette with Recent Context and Suggested Actions)
**Acceptance:** Cmd+K opens palette. Recent Context shows last interacted items. Suggested Actions show contextual chips. Typing filters results. Sections are categorized. Selected row has visible cyan highlight. Escape closes. Prefix filtering works.

### TASK-UX.5: Morning Briefing Canvas
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6
**Files:** `nitara-ui/src/components/Canvas/MorningBriefing.tsx`
**Description:** The default canvas when the user opens the app. Shows: "GOOD MORNING, [NAME]." greeting in bold with time (JetBrains Mono) and date top-right, summary line from Nitara with keyword highlights ("3 priorities" in cyan, "2 approvals" in amber), Today's Focus card (3 ACTIVE badge, priority tasks with project tags and status), Pending Approvals card (amber accent, stacked action cards with EDIT/APPROVE buttons), Financial Pulse card (3 KPIs — revenue, costs, net — in JetBrains Mono with CHF prefix and sparklines), Network Intel card (contact avatar, title, company, proactive suggestion with DRAFT MESSAGE button), Content Calendar card (items with DRAFTED/PLANNED/QUEUE status badges). Uses glass card components and asymmetric grid layout.
**Implementation note:** Financial Pulse must include "CHF" currency prefix on all numbers for consistency with Financials canvas.
**Design reference:** Image 9 (approved morning briefing)
**Acceptance:** Renders on app open (first-run detection shows onboarding instead). All 5 widget cards display with data from API. Approval cards have functional buttons. Financial numbers use JetBrains Mono with CHF prefix. Layout is asymmetric, not a rigid grid.

### TASK-UX.6: Shared Components Library
**Priority:** P0
**Depends:** TASK-0.2
**Files:** `nitara-ui/src/components/shared/GlassCard.tsx`, `ActionCard.tsx`, `StatCard.tsx`, `Badge.tsx`, `SparkLine.tsx`, `PipelineNode.tsx`, `NitaraInsightCard.tsx`, `ConfidenceRing.tsx`, `RelationshipDots.tsx`
**Description:** Build the reusable component library used across all canvases. GlassCard (frosted glass with blur), ActionCard (left accent stripe in cyan/amber/violet, with action buttons), StatCard (large number in mono with CHF prefix option, label, sparkline, trend arrow — numbers use tabular figures), Badge (status pills with correct colors: green for active/on-track, grey for paused, amber for blocked/attention, cyan for completed, violet for council scores), SparkLine (tiny inline SVG chart), PipelineNode (completed/active/upcoming/blocked states with glow — must accept `size='compact'` and `size='full'` props for consistent rendering at different scales), NitaraInsightCard (amber/yellow background card for Nitara's contextual notes — used in project detail, network view, financials), ConfidenceRing (circular progress visualization for council scores and confidence — violet accent, used in council evaluation), RelationshipDots (3-dot indicator for relationship strength — filled dots in cyan, empty dots in visible grey #334155).
**Design reference:** Design System screen (v2.5) sections 03-05
**Acceptance:** All components render correctly in isolation. GlassCard has backdrop blur. StatCard numbers use tabular figures. Pipeline nodes glow in active state and render consistently at both compact and full sizes. NitaraInsightCard renders with amber background. ConfidenceRing renders as circular progress. RelationshipDots show clear contrast between filled and empty states.

### TASK-UX.7: Remove Old Pages
**Priority:** P1
**Depends:** TASK-UX.1, TASK-UX.2, TASK-UX.3, TASK-UX.5
**Files:** Remove/archive: `Dashboard.tsx`, `Capture.tsx`, `Inbox.tsx`, `Voice.tsx`, `Memory.tsx`, `Uploads.tsx`, `Agent.tsx`, `CommandCenter.tsx`. Update `App.tsx` routing.
**Description:** Remove the 8 pages that are absorbed into the new architecture. Update App.tsx to use the new CanvasRouter instead of page-based routing. Keep the old components archived in a `_legacy/` directory for reference during migration.
**Acceptance:** Old routes removed. App loads with new 5-item sidebar and CanvasRouter. No console errors from missing components. Legacy files preserved in `_legacy/`.

### TASK-UX.8: Council Evaluation Canvas
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6
**Files:** `nitara-ui/src/components/Canvas/CouncilEvaluationCanvas.tsx`
**Description:** Redesigned council verdict display. Header: "COUNCIL EVALUATION // PROJECT: [NAME]" with subtitle "Synthesis of N specialized intelligence nodes." Layout: 3 evaluator cards arranged around a central composite score ConfidenceRing. Each evaluator card shows: archetype icon, name (e.g., "The Architect"), specialty label ("TECH FEASIBILITY"), score (8.5/10), brief assessment text, and a colored alert card for identified risks (amber CAUTION or orange RISK/FISCAL RISK). Center: large ConfidenceRing with composite score (e.g., 7.4) and "OPPORTUNITY" or "PASS" label below. Below center: Risk Matrix card (impact vs probability scatter) and NITARA PROTOCOL card (numbered action items). Conversation rail at bottom shows Nitara synthesizing the divergent opinions.
**Design reference:** Image 11 (council evaluation)
**Acceptance:** Renders when canvas state set to 'council_evaluation' with a project/idea ID. Evaluator cards show individual scores and assessments. Central ConfidenceRing shows composite. Risk alerts render with correct accent colors. Action items are numbered. Conversation rail shows synthesis.

### TASK-UX.9: Weekly Performance Report Canvas
**Priority:** P2
**Depends:** TASK-UX.2, TASK-UX.6
**Files:** `nitara-ui/src/components/Canvas/WeeklyReportCanvas.tsx`
**Description:** Automated weekly summary canvas. Header: "WEEKLY PERFORMANCE REPORT" with period dates. Status Overview: "Overall Momentum" with percentage change and trend arrow. Four KPI cards: Revenue (new wins), Efficiency (% vs last week), Network (new nodes), Time Saved (AI automation hours). Strategic Intelligence section: 3 bullet insights with cyan left accents (project phase changes, network growth, budget updates). Activity Volume chart (Recharts area chart, MON-SUN, green fill). Conversation rail: Nitara's weekly retrospective with forward suggestion.
**Design reference:** Image 2 (weekly performance report)
**Acceptance:** Renders when canvas state is 'weekly_report'. KPIs populated from portfolio data. Activity chart renders with Recharts. Strategic intelligence bullets pull from real project/network/financial data. Nitara retrospective generated from weekly activity.

### TASK-UX.10: Settings Canvas
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6
**Files:** `nitara-ui/src/components/Canvas/SettingsCanvas.tsx`
**Description:** System preferences screen. Left panel: "NITARA CORE" section with archetype selection dropdown (The Strategist, The Co-Founder, The Critic — stored as `preferred_archetype` on FounderProfile), reasoning depth slider (0.0–1.0, maps to model selection between Haiku/Sonnet/Opus), proactivity protocol toggles (Auto-drafting on/off, Network Alerts on/off, Risk Monitoring on/off). "VOICE & AUDIO" section: output voice selection cards (Nova/Neutral, Atlas/Direct, Lyra/Empathetic — with play preview button), input mode toggle (Push-to-talk vs Voice Active), visualization style radio (Aura, Waveform, Minimalist). Right panel: "IDENTITY" card showing founder profile (name, location, avatar, strategic focus tags with + Add Tag). "SYSTEM DEPTH" card (model version, context window, last sync timestamp). Memory review section: editable list of what Nitara has learned, with delete capability.
**Design reference:** Image 3 (system preferences)
**Acceptance:** Archetype dropdown persists to FounderProfile. Reasoning depth slider updates inference routing config. Toggle states persist. Voice selection cards with preview. Profile info editable. Memory review shows Mem0 entries with delete.

---

## PHASE 1: PROFILE & NETWORK

### TASK-1.1: Founder Profile Service
**Priority:** P0
**Depends:** TASK-0.1
**Files:** `src/services/founder-profile.service.ts`, `src/routes/profile.routes.ts`
**Description:** Backend service for storing and retrieving the FounderProfile. CRUD operations on `10_profile/founder-profile.json`. Profile extraction from conversation text (parse structured data from natural language responses during profiling). Mem0 integration: when profile updates, store key facts as tagged memories (`founder_profile` tag). New field: `preferred_archetype: 'strategist' | 'cofounder' | 'critic'` — this affects Nitara's system prompt tone and approach.
**Endpoints:** GET /api/profile, PUT /api/profile, POST /api/profile/skills, POST /api/profile/experience, PUT /api/profile/archetype
**Acceptance:** Profile CRUD works. Profile stored in vault. Mem0 receives profile memories on update. Archetype selection persists and is available to conversation service for prompt templating. Profile data available in council context assembly.

### TASK-1.2: Network Importer Service
**Priority:** P0
**Depends:** TASK-1.1
**Files:** `src/services/network-importer.service.ts`
**Description:** Service to import contacts from LinkedIn data export (ZIP file containing Connections.csv) and email metadata (IMAP connection, scan sender/recipient/frequency/recency, no content). Deduplication logic: match by email first, then by name+company. AI enrichment: for each contact, use Haiku to suggest relationship_type, business_value tags, and potential_roles based on title/company. Store as NetworkContact JSON files in `10_profile/network/`. Include progress tracking: emit SSE events during import for real-time progress display (total found, high-value identified, current percentage).
**Endpoints:** POST /api/network/import/linkedin (multipart upload), POST /api/network/import/email, GET /api/network/import/status (SSE stream)
**Acceptance:** LinkedIn ZIP import produces NetworkContact records. Email metadata scan adds interaction frequency. Deduplication works across sources. AI tags are suggested and stored. SSE progress stream works for frontend progress display.

### TASK-1.3: Network Graph Service
**Priority:** P1
**Depends:** TASK-1.2
**Files:** `src/services/network-graph.service.ts`, `src/routes/profile.routes.ts` (add network endpoints)
**Description:** Analyzes imported contacts to produce: industry cluster analysis (group contacts by industry, count per cluster), geographic distribution (contacts by location), relationship strength distribution, and network-based opportunity suggestions (dormant high-value connections, network overlap with partner contacts). Store graph summary in Mem0 for council access.
**Endpoints:** GET /api/network/contacts, GET /api/network/contacts/:id, PUT /api/network/contacts/:id, GET /api/network/graph, GET /api/network/opportunities
**Acceptance:** Cluster analysis returns industry groups with counts. Geographic distribution works. Dormant high-value connections flagged. Graph summary in Mem0.

### TASK-1.4: Network Canvas (Frontend)
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6, TASK-1.3
**Files:** `nitara-ui/src/components/Canvas/NetworkCanvas.tsx`
**Description:** The Network view canvas. Left panel (~35%): searchable contact list with RelationshipDots component (3 dots, filled cyan for strong, visible grey #334155 for empty), tag pills, summary stats ("312 contacts · 47 strong · 89 dormant"). Right panel (~65%): constellation-style cluster visualization (industry nebulae with "47 NODES" labels, founder "YOU" marker at center, connecting lines with brightness based on relationship density). Below visualization: "NETWORK INTELLIGENCE" section with 2-3 insight cards — "Warm Lead Detected" (with DRAFT OUTREACH button), "Partner Network Expansion" (with VIEW DETAILS button and stats: new nodes count, growth %). Uses glass cards and design tokens.
**Design reference:** Image 4 from first batch (network view — approved)
**Acceptance:** Contact list renders with search and filter. RelationshipDots show clear filled/empty contrast. Cluster visualization shows industry groups with node counts. Intelligence cards display with action buttons. Selecting a contact shows detail.

### TASK-1.5: Onboarding Flow (5-Step)
**Priority:** P1
**Depends:** TASK-UX.3, TASK-1.1, TASK-1.2, TASK-3.1
**Files:** `nitara-ui/src/components/Onboarding/OnboardingFlow.tsx`, `OnboardingStep1Profile.tsx`, `OnboardingStep2Archetype.tsx`, `OnboardingStep3Network.tsx`, `OnboardingStep4Financials.tsx`, `OnboardingStep5Activated.tsx`
**Description:** First-run experience. Full-screen (no sidebar), 5 progress dots at top. The onboarding expands from the original 3-step design to 5 steps based on Stitch explorations:

**Step 1 — Profile Conversation** (Design ref: Image 8 from first batch): Full-screen conversation with Nitara. ✦ icon, "NITARA / Your AI Business Partner" centered. Nitara asks about the user, user responds, Nitara renders inline profile card showing ALL extracted data (name, location, AND active work descriptions — not just name/location). [Looks Good] [Edit] buttons. Input: "Tell Nitara about yourself..." with mic button.

**Step 2 — Choose Your Partner's Voice** (Design ref: Image 10): "CHOOSE YOUR PARTNER'S VOICE" header. Three archetype selection cards: The Strategist ("Direct, data-driven, ruthlessly efficient. Focuses on margins and ROI." Confidence: HIGH, Tone: PROFESSIONAL), The Co-Founder ("Balanced, collaborative, creative. Focuses on vision and long-term growth." Confidence: HIGH, Tone: ENCOURAGING), The Critic ("Skeptical, risk-averse, thorough. Focuses on edge cases and failure points." Confidence: HIGHEST, Tone: SHARP). Selected card has cyan border and "SELECTED" badge. Below: preview message showing how the selected archetype would respond. [BACK] and [CONTINUE →] buttons.

**Step 3 — Mapping Your Constellation** (Design ref: Image 4): "MAPPING YOUR CONSTELLATION" header. LinkedIn ZIP upload zone → progress visualization with circular progress ring (percentage), "Scanning LinkedIn..." label, real-time counters (Total Contacts Found, High-Value Opps IDENTIFIED). As contacts are discovered, 3 highlighted contact cards appear below (partner, key client, warm lead). Nitara insight at bottom analyzing clusters. [CONTINUE →] and [Skip for now] options.

**Step 4 — Defining Your Financial Gravity** (Design ref: Image 6): "DEFINING YOUR FINANCIAL GRAVITY" header. Editable income source cards (Consulting, Freelance Dev, Teaching — each with CHF amount input and edit icon). Central orbital visualization: outer ring = current revenue, inner ring = current burn, center = net flow. Right panel: NITARA INTELLIGENCE card with goal-gap analysis ("To reach CHF 10k/month, convert 20% of freelance into productized retainer"). Runway and Safety Net indicators at top. [ANALYZE PORTFOLIO →] button.

**Step 5 — System Activated** (Design ref: Image 1): "SYSTEM ACTIVATED / Welcome home, [Name]. Your command center is ready." ✦ icon centered. Summary card showing 4 stats: Archetype, Network nodes mapped, Active projects, Monthly revenue. Nitara quote: "It's time to build. Where shall we start?" [ENTER COMMAND CENTER →] button. On click, sidebar appears, canvas switches to morning briefing. This screen shows only ONCE after onboarding completes, never again.

**Acceptance:** First-run detection works (check if profile exists). All 5 steps render with progress dots. Profile extraction captures all mentioned work items (not just name/location). Archetype selection persists to FounderProfile. LinkedIn import shows real-time progress via SSE. Financial inputs save to FinancialsService. System Activated shows populated stats. After completion, sidebar appears and morning briefing loads. Subsequent app opens skip onboarding entirely.

---

## PHASE 2: PORTFOLIO & IDEAS

### TASK-2.1: Portfolio Dashboard Service
**Priority:** P0
**Depends:** TASK-0.3
**Files:** `src/services/portfolio-dashboard.service.ts`, `src/routes/portfolio.routes.ts`
**Description:** Aggregates data across all projects: project cards with playbook type, current phase, financial summary, health indicator. Idea backlog with composite scoring (council 30%, skill alignment 20%, network advantage 15%, financial viability 20%, time-to-revenue 15%). Systematic evaluation: identify unevaluated ideas and flag them.
**Endpoints:** GET /api/portfolio/dashboard, GET /api/portfolio/ideas/ranked, POST /api/portfolio/ideas/:id/evaluate
**Acceptance:** Dashboard returns all projects with status. Ideas ranked by composite score. Unevaluated ideas flagged. Triggering evaluation creates council job.

### TASK-2.2: Partner Analysis Service
**Priority:** P1
**Depends:** TASK-1.3
**Files:** `src/services/partner-analysis.service.ts`
**Description:** When a collaborator is added to a project, analyze their network overlap with the founder (shared industries, unique industries partner brings), and generate business possibilities (joint ventures, referral channels, skill complements, market access). Use Sonnet for analysis. Store on ProjectCollaborator record.
**Endpoints:** POST /api/projects/:id/collaborators, GET /api/projects/:id/collaborators, POST /api/projects/:id/collaborators/:contactId/analyze
**Acceptance:** Adding a collaborator links a NetworkContact to a project. Analysis produces 2+ business possibilities with type, description, value estimate, and confidence.

### TASK-2.3: Portfolio Canvas (Frontend)
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6, TASK-2.1
**Files:** `nitara-ui/src/components/Canvas/PortfolioCanvas.tsx`
**Description:** Bird's-eye portfolio view. Header: "PORTFOLIO" with count subtitle ("4 active · 2 ideas · 1 paused") and filter chips (All, Active, Ideas, Paused). Project cards in asymmetric grid (larger for more active projects). Each card shows: playbook type badge, name, pipeline node visualization (using PipelineNode component with `size='compact'`), financial summary (revenue/costs in JetBrains Mono with CHF), health dot with label, partner tag if applicable. AURA-style paused cards greyed with council score in violet. Idea Backlog section below with ranked cards showing composite scores and "Unevaluated" badge for unscored ideas. Conversation rail shows Nitara prompting about actionable items.
**Implementation note:** Pipeline visualization on portfolio cards MUST use the same PipelineNode component as Project Detail canvas, rendered at `size='compact'`. Do not create a separate pipeline component.
**Design reference:** Image 5 from first batch (portfolio view — approved)
**Acceptance:** Project cards render with all data. Pipeline visualization uses shared PipelineNode at compact size. Ideas sorted by composite score. Unevaluated ideas have pulsing badge. Clicking a card sets canvas to project_detail.

### TASK-2.4: Project Canvas (Frontend)
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6, TASK-0.3
**Files:** `nitara-ui/src/components/Canvas/ProjectCanvas.tsx`, `nitara-ui/src/components/Pipeline/PlaybookPipeline.tsx`
**Description:** Single project detail canvas. Header with playbook badge, client/company breadcrumb, status dot, partner tag with avatar. Full-width PlaybookPipeline component at `size='full'` showing all phases from the project's playbook with sub-steps visible under active phase. Left column (~60%): Current Deliverables (list with status icons: approved ✓, in progress with % ring, pending), Tasks (with priority badges: RESEARCH, URGENT, DONE, BLOCKED in amber with lock icon). Right column (~40%): Financials card (quote/revenue, costs, margin with percentage, budget), Client Context card (company info, point of contact with email icon), NitaraInsightCard within Client Context for strategic notes (e.g., "Thomas mentioned CFO needs budget approval by Friday"). Conversation rail with Nitara asking contextual questions with inline action buttons.
**Design reference:** Image 6 from first batch (project detail — approved)
**Acceptance:** Renders correctly for all 5 playbook types. Pipeline shows correct phases from playbook template with sub-steps. Active phase glows. Deliverables show status. Tasks show priority badges. NitaraInsightCard renders with amber background inside Client Context. Financial card shows project economics.

### TASK-2.5: Weekly Report Service (Backend)
**Priority:** P2
**Depends:** TASK-2.1, TASK-3.1
**Files:** `src/services/weekly-report.service.ts`, `src/routes/portfolio.routes.ts` (add weekly report endpoint)
**Description:** Generates weekly performance data: overall momentum (% change in composite activity score), KPIs (new revenue wins, efficiency vs last week, new network nodes, time saved from AI automation), strategic intelligence bullets (project phase changes, network growth, budget movements), daily activity volume data (for chart). Nitara generates a retrospective summary with forward-looking suggestion. Report auto-generates every Monday or on demand.
**Endpoints:** GET /api/portfolio/weekly-report, POST /api/portfolio/weekly-report/generate
**Acceptance:** Weekly report endpoint returns all KPIs, intelligence bullets, and activity data. Momentum percentage calculated from real data. Nitara retrospective generated.

---

## PHASE 3: FINANCIALS & INCOME

### TASK-3.1: Financials Service
**Priority:** P0
**Depends:** TASK-0.1
**Files:** `src/services/financials.service.ts`, `src/routes/financials.routes.ts`
**Description:** Portfolio and per-project financial model. CRUD for revenue streams and cost items. Portfolio aggregation (total revenue, costs, net, budget allocation). Auto-tracking of AI inference costs from existing inference logger. Monthly snapshot storage in `10_financials/snapshots/`. Mem0 integration for financial summaries. Additional fields for onboarding: runway_months (calculated from savings / burn rate), safety_net amount, income_goal (monthly target).
**Endpoints:** GET /api/financials/portfolio, GET /api/financials/:projectId, POST /api/financials/:projectId/revenue, POST /api/financials/:projectId/cost, PUT /api/financials/:projectId/budget, POST /api/financials/budget, PUT /api/financials/goals (income target, safety net)
**Acceptance:** Portfolio financials aggregate correctly. Per-project CRUD works. Inference costs auto-tracked. Monthly snapshots stored. Financial context in Mem0 for council access. Runway and goal-gap calculations work.

### TASK-3.2: Income Strategy Engine
**Priority:** P1
**Depends:** TASK-1.1, TASK-3.1
**Files:** `src/services/income-strategy.service.ts`
**Description:** Analyzes founder profile (skills, experience), network (strength by industry), current projects (revenue patterns), and market context to generate income strategy suggestions. Uses Sonnet for analysis. Produces 3-5 IncomeStrategy objects per monthly review, each grounded in specific skills and network segments. At least one passive income opportunity per review. Strategies evaluated by council (decision_type: income_opportunity). Goal-gap analysis: compares current revenue to founder's income_goal and suggests specific strategies to close the gap (as shown in onboarding step 4's NITARA INTELLIGENCE card).
**Endpoints:** GET /api/income/strategies, POST /api/income/strategies/:id/evaluate, GET /api/income/goal-gap
**Acceptance:** Generates 3-5 strategies with skills_leveraged, network_leveraged, revenue estimates, confidence. At least one passive. Council evaluation works. Goal-gap analysis returns actionable recommendation.

### TASK-3.3: Opportunity Scanner
**Priority:** P1
**Depends:** TASK-3.1
**Files:** `src/services/opportunity-scanner.service.ts`
**Description:** Proactive financial pattern detection. Scans portfolio data for opportunities: projects with users but no paid tier, stagnant pricing, high cost ratios, underutilized network segments. Surfaces suggestions in morning briefing scored by impact, effort, confidence.
**Acceptance:** Scanner identifies at least one opportunity from financial patterns. Suggestions include impact/effort/confidence scores. Morning briefing integration works.

### TASK-3.4: Financials Canvas (Frontend)
**Priority:** P1
**Depends:** TASK-UX.2, TASK-UX.6, TASK-3.1, TASK-3.2
**Files:** `nitara-ui/src/components/Canvas/FinancialsCanvas.tsx`
**Description:** Portfolio financials view ("NITARA OBSERVATORY"). Top KPI bar (4 StatCards in a row: revenue with ↑% and sparkline, costs with ↓%, net income with ↑%, unallocated budget with "AVAILABLE" badge — all in JetBrains Mono with CHF prefix). Left column: Revenue Breakdown (per-project bars with labels like "65% OF TARGET" or "RETAINER" or "PASSIVE" — pick ONE pattern: either show target % or revenue type label, not both inconsistently), Cost Breakdown (donut visualization with quadrant labels: AI Inference, Infrastructure, Tools, Marketing). Right column: "NITARA STRATEGIC SUGGESTIONS" — income strategy cards with confidence badges, description, estimated revenue range in JetBrains Mono, [EXPLORE STRATEGY] and [DISMISS] buttons. Conversation rail: Nitara suggesting next steps.
**Implementation note:** Revenue bars must use a consistent labeling pattern. Choose revenue type labels (RETAINER, PASSIVE, PIPELINE, etc.) rather than target percentages, since not all projects have targets set.
**Design reference:** Image 7 from first batch (financials — approved)
**Acceptance:** KPIs render with JetBrains Mono, CHF prefix, and sparklines. Revenue bars use consistent labeling. Income strategy cards have correct accent colors. [Explore] triggers council evaluation.

---

## PHASE 4: GTM & MARKETING

### TASK-4.1: GTM Orchestrator
**Priority:** P0
**Depends:** TASK-3.1
**Files:** `src/services/gtm-orchestrator.service.ts`, `src/routes/marketing.routes.ts`
**Description:** Manages GTM strategy generation (triggers go_to_market council evaluation when project reaches live), content calendar (CRUD for ContentEntry records), and execution loop (daily check for due entries, auto-draft via Content Engine, present for approval, publish on approval). Weekly performance report generation.
**Endpoints:** GET /api/marketing/:projectId/strategy, POST /api/marketing/:projectId/strategy, GET /api/marketing/:projectId/calendar, PATCH /api/marketing/:projectId/calendar/:entryId, POST /api/marketing/:projectId/publish/:entryId, GET /api/marketing/:projectId/report
**Acceptance:** GTM strategy generated on live. Content calendar CRUD works. Morning briefing shows due entries. Drafting produces content. Weekly report compares actuals to targets.

### TASK-4.2: Blog Publisher Tool
**Priority:** P1
**Depends:** TASK-4.1
**Files:** `src/services/content-publisher.service.ts` (blog section), `07_system/tools/blog-publisher.json`
**Description:** Tool that publishes blog posts via git commit to a configured repo and triggers deploy. Registered in Tool Registry following ToolManifest schema. Tier 3 (hard-gate) — requires approval before publishing.
**Acceptance:** Blog publisher registered in tool registry. Publishing creates git commit with content. Tier 3 gate prevents auto-publishing.

### TASK-4.3: Social Publisher Tool
**Priority:** P1
**Depends:** TASK-4.1
**Files:** `src/services/content-publisher.service.ts` (social section), `07_system/tools/social-publisher.json`
**Description:** Lightweight API wrapper for Twitter/X and LinkedIn posting. Registered in Tool Registry. Tier 3 hard-gate.
**Acceptance:** Social publisher posts to at least one platform. Tier 3 gate works.

### TASK-4.4: CRM Activation
**Priority:** P1
**Depends:** TASK-4.1, TASK-1.2
**Files:** Existing `src/services/crm.service.ts` (enhance), `src/routes/crm.routes.ts` (enhance)
**Description:** Connect existing CRM (9 endpoints) to GTM loop. Content engagement creates leads (auto Tier 1). Network contact engagement flagged as warm leads. Deal pipeline stages configurable per playbook type.
**Acceptance:** Leads auto-create CRM contacts. Network contact engagement flagged. Pipeline stages match project playbook type.

---

## PHASE 5: CONFIDENCE CALIBRATION

### TASK-5.1: Confidence Service
**Priority:** P0
**Depends:** TASK-0.1
**Files:** `src/services/confidence.service.ts`
**Description:** Every Nitara action proposal includes a confidence score (0.0-1.0). ConfidenceRecord tracks action_id, action_type, predicted_confidence, and outcome. Confidence interacts with trust tier: Tier 2 + low confidence escalates to Tier 3, Tier 2 + high confidence shortens delay. Monthly calibration analyzes predicted vs actual accuracy by action type. Trust evolution requires: 50+ instances, confidence > 0.75, approval > 90%, calibration > 80%.
**Acceptance:** All proposals include confidence score. Tier 2 escalation works for low confidence. Outcome tracking records all actions. Monthly calibration report produced. Trust evolution criteria enforced.

---

## PHASE 6: KNOWLEDGE

### TASK-6.1: YouTube Indexer
**Priority:** P1
**Depends:** TASK-0.1
**Files:** `src/services/youtube-indexer.service.ts`, `src/routes/knowledge.routes.ts`, `07_system/tools/youtube-indexer.json`
**Description:** Playlist indexing via TranscriptAPI.com (or youtube-transcript-api Python fallback). For each video: extract transcript → Haiku summarization (200-500 words) → store summary in Mem0 with workflow tags. Full transcripts in `10_knowledge/youtube/`. Incremental indexing (skip already-indexed videos).
**Endpoints:** GET /api/knowledge/youtube/playlists, POST /api/knowledge/youtube/playlists, POST /api/knowledge/youtube/playlists/:id/index, GET /api/knowledge/youtube/videos
**Acceptance:** Playlist registration works. Transcript extraction + Haiku summarization produces summaries. Summaries in Mem0 with tags. Incremental re-indexing only processes new videos.

---

## VOICE INTEGRATION (Cross-cutting)

### TASK-V.1: LiveKit Voice Integration
**Priority:** P1
**Depends:** TASK-UX.3
**Files:** `nitara-ui/src/components/ConversationRail/VoiceInput.tsx`, `nitara-ui/src/hooks/useVoice.ts`, `src/services/voice-livekit.service.ts`
**Description:** Replace local Whisper transcription with LiveKit Agents pipeline. Frontend: getUserMedia → WebRTC to LiveKit. Backend: LiveKit room management, signed URL generation. Pipeline: Deepgram Nova-3 (STT) → Claude via OpenClaw (processing) → Cartesia Sonic-3 (TTS). Push-to-talk via mic button and spacebar shortcut. Live transcription display while speaking. Voice and text share same conversation thread. Voice visualization: large glowing mic ring with waveform bars when active (see Voice Active screen from first batch). Voice selection (Nova/Atlas/Lyra from Settings) maps to Cartesia voice presets.
**Acceptance:** Push-to-talk captures audio. Live transcription appears while speaking. Nitara responds with voice audio AND text. Round-trip latency < 1 second. Switching between voice and text mid-conversation works. Voice visualization renders during active speech. Selected voice from Settings is used. Free tier limits not exceeded for personal use.

---

## HORIZON 3 BACKLOG (Parked — designs exist, build when backend ready)

These screens were generated by Stitch and approved as good ideas, but depend on capabilities that extend beyond the 10-week Horizon 2 timeline. The design exports are preserved in `/srv/nitara/design-exports/horizon-3/`.

### H3-1: Deck Preview / Slide Generator
Nitara synthesizes pitch decks from portfolio and council data. Slide navigation, parameter controls (Professional ↔ Visionary, Information Density, Color Theme), Nitara Advice sidebar, Regenerate/Edit/Export actions. Depends on: Content Engine, GTM orchestrator, council evaluation data.

### H3-2: Executive Summary / Strategic Brief
One-page investor-facing summary: council consensus score, core vision, market opportunity, financial projections, execution timeline, Nitara verdict. Share Secure Link, Export Pitch Deck, Open Data Room actions. Depends on: council enhancement, financial projections, export pipeline.

### H3-3: Data Room
Secure document repository with folder structure, document preview, security pulse (AES-256, Zero-Trust), real-time user presence, AI-powered PII redaction, audit log. Depends on: multi-user auth, RBAC, invitation flows, real-time collaboration infrastructure.
