# Sprint 2 — Screen Mapping + Voice Integration + Test Harness

## Goals
1) **Map each current screen** to the old UI library (screen + components) and enforce consistency.
2) Make **Ventures the default** entry in Think; Strategy becomes “Insights”.
3) Make **Voice a first-class nav affordance** + seamless multi-turn conversation.
4) Fix **navigation/linking bugs** + **slow loading** (Portfolio/Network) with progress UI.
5) Add **Playwright E2E + visual regression** based on the mapping.

---

## Workstreams

### A) UI consistency via mapping
- Add mapping file: `docs/screen_mapping.yaml` (this pack).
- For each route, ensure it composes only approved primitives (GlassCard, MetricTile, StatusChip, etc.).
- Create `/ui-kit` route to visually QA components.

### B) Ventures-first IA
- Change Think landing route to `/think/ventures`.
- Move Strategy to `/think/insights` and ensure it doesn’t duplicate ventures list.

### C) Voice integration (LiveKit + Mem0)
- Add `/voice` route (“Voice Console”).
- Add persistent voice button in bottom nav (center) that opens overlay and/or navigates to /voice.
- Ensure streaming transcription is displayed and stored.
- Implement Mem0 recall-before-LLM and async capture-after-response.

### D) UX performance & loading
- Add route transition progress bar (top) + per-screen skeletons.
- Virtualize large lists (Portfolio/Contacts).
- Add caching and prefetch for venture list and network graph.

### E) Testing (Playwright)
- Navigation tests for each route.
- Performance assertions (time-to-first-render under threshold).
- Visual regression tests using masked snapshots.

---

## Definition of Done
- Voice accessible from main nav; /voice works with transcript stream.
- Think defaults to Ventures; Strategy renamed Insights.
- Portfolio + Network show progress/skeleton and load faster.
- Playwright suite passes locally and in CI.
