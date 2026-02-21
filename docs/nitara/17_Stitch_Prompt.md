# Stitch Prompt — Generate Nitara Design System

Paste this into Stitch while selecting:
- all 7 product screens
- plus the 3 design system reference screens

---

You are generating a Design System and UI Contract for a product called Nitara (Founder OS / Mission Control).

Output requirements

1) Design tokens (JSON)
Return a tokens.json object with:
- colors: background surfaces, text, borders, semantic accents (primary / success / warning / destructive)
- opacity levels for glass surfaces (base / elevated / active / critical)
- typography scale (font family, sizes, weights, line heights, tracking)
- spacing scale (4/8/12/16/24/32/48/64)
- radii scale (12/16/24/32)
- blur scale for glass (8/16/24/40)
- shadows and glow rules (subtle; only for active or critical states)
- component sizes (button heights, dock height, tile padding)

2) Component primitives (spec)
Produce components.md describing:
- GlassCard / GlassPanel
- MetricTile
- Badge / Tag
- PrimaryButton / SecondaryButton / GhostButton / DangerButton
- DockNav (5 modes)
- AgentFeedItem
- DecisionGate (Kill / Variant / Scale)
- TypedConfirmationModal (with phrase input)
- SidePanel (Inference Logic / Details)

For each component include:
- purpose
- variants
- states (default / hover / active / disabled / loading / critical)
- spacing and sizing
- accessibility notes (contrast, focus ring, keyboard)

3) Layout and interaction rules
Produce layout_rules.md with:
- desktop grid (2–3 column fluid)
- side panel rule
- bottom dock rule
- density rules (max lines, truncation, spacing)
- destructive action rule (always typed confirm)
- explainability rule (open inference logic everywhere metrics appear)

4) Copy and tone rules
Nitara copy must be:
- concise
- operator console tone
- use Recommendation, Confidence, Evidence, Audit
- never use playful jokes in UI copy

5) Naming conventions
Name tokens and components with stable, code-friendly names:
- color.bg.base, color.glass.elevated, radius.lg, blur.dock, etc.

Constraints
- Dark mode only, high legibility.
- Dark-glass panels with subtle gradients, not flat colors.
- Accents used sparingly (primary for key CTAs, red only for destructive/critical).
- Avoid introducing new styles not present in the reference screens.

Return three artefacts: tokens.json, components.md, layout_rules.md.
