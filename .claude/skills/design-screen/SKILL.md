---
name: design-screen
description: Convert a Stitch design export into a production React component via design tokens
model: opus
context: fork
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "$CLAUDE_PROJECT_DIR/.claude/hooks/validators/validate-design-tokens.sh"
          timeout: 10
---

# /design-screen

Convert a Stitch design export into a production React component using design tokens.

## Arguments
- `screen_name` — which screen to implement
- `stitch_path` — path to Stitch export directory (contains screen.png + code.html)

## Process

### Step 1: Analyze Design
- Read `screen.png` for visual reference
- Read `code.html` for structure and styling patterns
- Read `design/tokens.json` for canonical tokens

### Step 2: Map to Design Tokens
- Extract colors → map to CSS variables (`--color-*`, `--glass-*`)
- Extract fonts → map to font variables (`--font-display`, `--font-body`, `--font-mono`)
- Extract spacing → map to spacing scale
- Extract glass effects → map to glass levels (high/medium/low)
- NO hardcoded hex colors or font families

### Step 3: Generate React Component
- React 19 patterns (function components, hooks)
- Tailwind CSS 4 utility classes with CSS custom properties
- Lucide React icons
- TypeScript with proper types/interfaces
- Include: loading state, empty state, error state

### Step 4: Wire to State
- Connect to appropriate Zustand store
- Add API calls to backend endpoints
- Handle data fetching with loading indicators

### Step 5: Validate
- No hardcoded hex colors (use `var(--color-*)`)
- No hardcoded font families (use `var(--font-*)`)
- All interactive targets >= 44px
- Text contrast >= 4.5:1 on glass surfaces
- Responsive at 1024px+

## Output
- React component file in `components/Canvas/` or `components/shared/`
- Types file if needed
- Store updates if needed
