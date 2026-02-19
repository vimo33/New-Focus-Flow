# Claude Code Brief (How to give rich context) — v1

## Put these in the repo root
- CLAUDE.md (rules + architecture)
- /docs/nitara/ (this pack)
- /design/ (tokens + Pencil outputs + Stitch exports)

## Provide Claude three things, every time
1. Intent: what user journey are we implementing?
2. Constraints: design tokens, stack, safety rules, performance targets
3. Definition of done: routes, components, tests, acceptance criteria

## The 3 reference docs Claude must read
- 15_Design_System.md
- 16_Screens_Provided.md
- 18_Screens_To_Design.md

## Design-system workflow (important)
- Use Stitch with 17_Stitch_Prompt.md to generate tokens/components.
- Commit canonical tokens to /design/tokens.json.
- Pencil uses those tokens to generate new screens.
- Claude integrates Pencil output into React/Next.

## Claude prompt template (per feature)
You are implementing Nitara in this repo.

Context:
- Read 01_Vision.md, 15_Design_System.md, 18_Screens_To_Design.md.
- Follow /design/tokens.json (do not invent new styling).
- Use 16_Screens_Provided.md as visual reference.

Task:
- Implement <SCREEN OR FEATURE>.
- Add route: <...>
- Use mocked data initially.

Safety:
- Any destructive action must require typed confirmation.
- Surface approvals in the Approvals Queue.

Deliverables:
- Code changes
- Short summary of what changed
- Next steps
