# Pencil Workflow (v1)

Goal: use Pencil to generate consistent UI quickly, but keep design tokens + components as a contract.

## Source of truth
1. /design/tokens.json — canonical tokens (generated via Stitch, then curated)
2. /design/components/ — canonical primitives (buttons, cards, dock, tiles)
3. 15_Design_System.md — human-readable contract + rules

## Inputs to Pencil
- The 7 baseline screens + 3 design-system screens (in Stitch) define:
  - glass surfaces
  - typography hierarchy
  - spacing + radii
  - interaction states (active/critical/destructive)

## Generation loop (Claude Code + Pencil)
1. Pick a screen from 18_Screens_To_Design.md.
2. Claude produces:
   - route + component tree
   - data contract (types)
   - Pencil prompt for the screen (layout + components only)
3. Pencil generates the UI scaffold.
4. Claude integrates output into the repo (React components).
5. You review visually.
6. Ship behind a feature flag.

## Guardrails
- Never generate new styling. If Pencil/Claude needs a new style token, add it to tokens.json first.
- All destructive actions must use the typed-confirmation modal pattern.
- Every major metric tile must support open inference logic.

## Included reference export
The attached Stitch export bundle is included here:
/design/stitch_exports/

Treat it as a visual reference and sanity check.
