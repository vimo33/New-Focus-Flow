# Focus Flow UI - Agent System

This directory contains the autonomous agent framework for building the Focus Flow UI.

## Directory Structure

```
.claude/
├── agents/
│   ├── builders/         # 10 builder agents (one per screen)
│   └── validators/       # 10 validator agents
└── hooks/
    └── validators/       # 8 validation scripts
```

## Builder Agents

Each builder agent is responsible for creating one screen from the Stitch designs:

1. **dashboard-builder** - Focus Flow Dashboard (Priority 0)
2. **capture-builder** - Quick Capture Flow (Priority 0)
3. **inbox-builder** - Inbox Processing Center (Priority 0)
4. **projects-builder** - Projects Management (Priority 1)
5. **project-detail-builder** - Project Workspace Details (Priority 1)
6. **ideas-builder** - Ideas Explorer (Priority 1)
7. **calendar-builder** - Calendar & Time Blocking (Priority 2)
8. **wellbeing-builder** - Wellbeing Tracker (Priority 2)
9. **voice-builder** - Voice Cockpit AI (Priority 2)
10. **item-processing-builder** - Item Processing Panel (Priority 3)

### Builder Agent Features

- **Reference Designs**: Each has links to Stitch HTML and PNG
- **Auto-validation**: Hooks run automatically during development
- **Type Safety**: TypeScript with strict type checking
- **Design System**: Consistent tokens and styling
- **Testing**: Component tests required for completion

### Builder Hooks

Builders have hooks that auto-validate during development:

- **post_tool_use (write)**: Lint + Format on every file write
- **post_tool_use (edit)**: Type check on every edit
- **on_stop**: Component export, design match, and tests

## Validator Agents

Each validator runs comprehensive quality checks:

### Validation Categories

1. **Visual Regression**: Screenshot diff vs Stitch reference (<500px)
2. **Accessibility**: WCAG AA compliance (pa11y)
3. **Responsive Design**: Mobile/tablet/desktop layouts
4. **Performance**: Lighthouse scores (>90)
5. **Integration**: API calls, state management, navigation

### Validator Configuration

All validators use model: `haiku` for fast, efficient checking.

## Validation Hooks

### Python Scripts

1. **validate-component-exports.py**
   - Checks component properly exported
   - Verifies index.ts re-export
   - Validates data-testid attributes

2. **validate-design-match.py**
   - Runs Playwright visual regression
   - Compares against Stitch PNG
   - Reports pixel differences

3. **validate-accessibility.py**
   - Runs pa11y WCAG AA checks
   - Reports errors and warnings
   - Validates ARIA and semantics

4. **validate-responsive.py**
   - Tests 3 breakpoints (mobile/tablet/desktop)
   - Validates layout adaptations
   - Runs Playwright responsive tests

### Shell Scripts

1. **lint-typescript.sh**
   - ESLint with auto-fix
   - Runs on every file write

2. **type-check.sh**
   - TypeScript compiler check
   - Runs on every edit

3. **format-code.sh**
   - Prettier formatting
   - Auto-formats on save

4. **run-tests.sh**
   - Jest/Playwright test runner
   - Pattern matching support

## Usage

### Running a Builder Agent

```bash
# Launch builder agent for a screen
claude-code --agent agents/builders/dashboard-builder.md

# The agent will:
# 1. Read Stitch design (HTML + PNG)
# 2. Build React component
# 3. Auto-validate via hooks
# 4. Report completion
```

### Running a Validator Agent

```bash
# Launch validator after builder completes
claude-code --agent agents/validators/dashboard-validator.md

# The validator will:
# 1. Run visual regression tests
# 2. Check accessibility
# 3. Validate responsive design
# 4. Run performance tests
# 5. Report pass/fail
```

### Running Hooks Manually

```bash
# Component exports
python3 .claude/hooks/validators/validate-component-exports.py src/components/Dashboard.tsx

# Design match
python3 .claude/hooks/validators/validate-design-match.py screen=dashboard

# Accessibility
python3 .claude/hooks/validators/validate-accessibility.py http://localhost:5173

# Responsive
python3 .claude/hooks/validators/validate-responsive.py dashboard

# Lint
bash .claude/hooks/validators/lint-typescript.sh src/components/Dashboard.tsx

# Type check
bash .claude/hooks/validators/type-check.sh

# Format
bash .claude/hooks/validators/format-code.sh src/components/Dashboard.tsx

# Tests
bash .claude/hooks/validators/run-tests.sh Dashboard.test.tsx
```

## Execution Strategy

### Phase 2: Core Screens (Parallel)

Builder/validator pairs run in parallel for maximum speed:

```
Dashboard Builder  ──▶ Dashboard Validator
   (4 hours)              (2 hours)

Capture Builder    ──▶ Capture Validator
   (4 hours)              (2 hours)

Inbox Builder      ──▶ Inbox Validator
   (4 hours)              (2 hours)

Total: 6 hours (vs 14 hours sequential)
```

### Phase 3: Advanced Screens (Batched)

Priority 1 screens (3 parallel), then Priority 2 (3 parallel), then Priority 3 (1 screen).

## Success Metrics

- **Validation Pass Rate**: >95% of hooks pass on first run
- **Auto-Fix Rate**: >80% of validation failures auto-corrected
- **Build Success Rate**: >90% of screens built without manual intervention
- **Design Fidelity**: <500px diff from Stitch references
- **Accessibility**: WCAG AA compliance on all screens
- **Performance**: Lighthouse >90 across all categories

## Reference Designs

All Stitch designs located at:
`/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/`

Each screen folder contains:
- `code.html` - HTML/Tailwind implementation
- `screen.png` - Visual reference screenshot

## Dependencies

### Required for Development
- Node.js 18+
- npm/npx
- Python 3.8+
- React 18
- TypeScript 5+
- Tailwind CSS 3.4+

### Required for Validation
- Playwright (`npx playwright install`)
- pa11y (`npm install -g pa11y`)
- Lighthouse (`npm install -g lighthouse`)
- ESLint (configured via create-react-app)
- Prettier

## Troubleshooting

### Hook Failures

**"Command not found" errors:**
- Install missing dependencies: `npm install`
- Install Playwright browsers: `npx playwright install`

**Type check failures:**
- Fix TypeScript errors before continuing
- Check tsconfig.json is correct

**Visual regression failures:**
- Review screenshot diffs in `tests/visual/__snapshots__`
- Update snapshots if design intentionally changed: `npx playwright test --update-snapshots`

**Accessibility failures:**
- Review pa11y output for specific ARIA/semantic issues
- Fix HTML structure and labels
- Test with screen reader

## Next Steps

After Phase 1 completion:
1. Initialize React project (create-react-app)
2. Configure Tailwind with design system
3. Set up test frameworks (Playwright, Jest)
4. Launch Phase 2: Core Screens Development
