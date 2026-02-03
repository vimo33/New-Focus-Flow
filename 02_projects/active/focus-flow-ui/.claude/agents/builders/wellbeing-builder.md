---
name: wellbeing-builder
description: Build Wellbeing Tracker screen from Stitch design
model: sonnet
hooks:
  post_tool_use:
    write:
      - command: "npm run lint -- {{file_path}}"
        description: "Lint TypeScript files"
      - command: "prettier --write {{file_path}}"
        description: "Format code"
    edit:
      - command: "npm run type-check"
        description: "Validate TypeScript types"
  on_stop:
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Wellbeing.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=wellbeing"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Wellbeing.test.tsx"
      description: "Run component tests"
---

# Wellbeing Tracker Builder Agent

## Objective
Build the Wellbeing Tracker screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/wellbeing_tracker/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/wellbeing_tracker/screen.png`

## Requirements

### Visual Fidelity
- Match layout, spacing, colors from screen.png exactly
- Use design system tokens
- Implement dark mode support
- Mobile-first responsive design

### Technical Implementation
- React 18 with TypeScript
- Tailwind CSS for styling
- Material Symbols icons
- Component exported from `src/lib/index.ts`
- Health metrics display with charts
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Wellbeing/Wellbeing.tsx
import React from 'react';

interface WellbeingProps {
  metrics?: HealthMetric[];
  period?: 'day' | 'week' | 'month';
}

export const Wellbeing: React.FC<WellbeingProps> = ({ metrics, period }) => {
  return (
    <div data-testid="wellbeing" className="...">
      {/* Wellbeing metrics */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Metrics display correctly
- [ ] Chart rendering works
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
