# CLAUDE.md — Nitara Implementation Rules (drop into repo root)

## Product intent
Nitara is a general-purpose AI co-founder that manages a portfolio of ventures through five modes:
Think / Validate / Build / Grow / Leverage.

## Read these first (required)
- /docs/nitara/01_Vision.md
- /docs/nitara/06_Screen_Inventory.md
- /docs/nitara/08_Memory_Architecture.md
- /docs/nitara/09_Autonomy_and_Safety.md

## Engineering constraints
- Keep changes small and reversible.
- Prefer file-first storage (JSON + markdown artifacts) unless a DB is already present.
- Never remove existing pages; remap them into modes or link to them.
- All destructive actions require typed confirmation + an approval event record.

## UI constraints
- Use the established “glassy dark” design language.
- Primary navigation is a bottom dock (Think/Validate/Build/Grow/Leverage).
- Every screen ends in an explicit next action.

## Definition of done (for every feature)
- Route + component implemented
- Contract/mocked data wired
- Basic loading/empty/error states
- Update docs if schema changed
