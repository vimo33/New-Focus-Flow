# UI Baseline & Tokens (Old UI as source of truth)

We treat the old UI screens + DS library as the canonical visual system.

## Primary navigation
- Keep **Bottom Nav** as the global nav for: Think / Validate / Build / Grow / Leverage.
- Optional: left rail can exist on desktop, but bottom nav is the primary mental model.

## Accent strategy (to avoid drift)
- **Primary action accent**: Electric Cyan / Teal family (from old UI).
- **Secondary accent**: Soft Violet (creative/insight states).
- **Warning/Highlight**: Warm Amber.
- **Danger/Destructive**: Muted Crimson.

## Interaction language
- Everything feels “calm + surgical”.
- Important actions surface as:
  - inline chips (status)
  - bottom action bars (YES/NO, Approve/Edit)
  - modals only for destructive/irreversible operations.

## Required token exports (v1)
Create `design/tokens.json` with:
- colors: background/surface/border/text + semantic accents
- type: display/h1/h2/body/small/mono label
- spacing: 8pt scale
- radius: card/pill/modal
- blur: surface/overlay/dock
- elevation: L1/L2/L3
