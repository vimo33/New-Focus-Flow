# Design System (Source of Truth) — v1

This project will scale cleanly only if Claude Code + Pencil treat the design system as a contract, not vibes.

## What we have right now
You provided 7 product screens (core flows) plus 3 design-system option screens:
1. Design Tokens v1 (color, type, spacing, blur/radius, component sandbox)
2. Founder OS Component Library (glass surfaces, decision system, agent timeline, metric tiles)
3. Layout Patterns & Rules (desktop + mobile rules, mission-control template, usage rules)

These are the current golden references for everything Claude generates.

## Recommendation: how to pick the canonical system
Use this hierarchy:

1) Tokens first
If tokens are inconsistent, everything downstream drifts.
- Colors: 4 main semantic accents (Indigo primary, Emerald success/grow, Muted Crimson destructive, Deep Neutral base)
- Glass levels: 2–3 elevation layers (base, elevated/active, critical/destructive)
- Radius + blur: two tiers (card vs dock/pill)

2) Component Library second
Define stable components in Pencil (or hand-built React) that will appear everywhere:
- MetricTile
- GlassCard / GlassPanel
- PrimaryButton / GhostButton / DangerButton
- Badge (state tag)
- DockNav (mode switch)
- DecisionGate (kill/scale/variant)
- AgentFeedItem
- ConfirmationModal (typed phrase)

3) Layout patterns third
Lock the grid and densities:
- Desktop: 2–3 column fluid
- Side panel pattern (Inference Logic / Details)
- Bottom dock pattern (modes)
- Hero recommendation pattern (top actionable module)

## Where Stitch fits
Stitch is the extraction step:
- Select all 7 screens + 3 design-system screens inside Stitch.
- Run the Stitch prompt (see 17_Stitch_Prompt.md) to generate:
  - tokens.json
  - component primitives descriptions
  - layout rules

Then we commit:
- /design/tokens.json (canonical tokens)
- /design/components/* (pencil-generated components or specs)
- /docs/nitara/design-contract.md (human-readable contract)

## Current assets included in this pack
- /design/stitch_exports/ contains the Stitch export bundle you attached (HTML/CSS snapshots & assets)
  - Treat these as reference, not production UI
  - Claude/Pencil should replicate style, not copy-paste raw HTML

## Non-negotiables
- High contrast text on dark-glass surfaces
- Destructive actions always require typed confirmation plus an audit log entry
- Keep the interface mission control: low ornament, high signal

Last updated: 2026-02-19
