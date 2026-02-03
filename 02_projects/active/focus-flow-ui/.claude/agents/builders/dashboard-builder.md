---
name: dashboard-builder
description: Build Dashboard screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Dashboard.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=dashboard"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Dashboard.test.tsx"
      description: "Run component tests"
---

# Dashboard Builder Agent

## Objective
Build the Focus Flow Dashboard screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/focus_flow_dashboard/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/focus_flow_dashboard/screen.png`

## Requirements

### Visual Fidelity
- Match layout, spacing, colors from screen.png exactly
- Use design system tokens (primary: #137fec, etc.)
- Implement dark mode support
- Mobile-first responsive design

### Technical Implementation
- React 18 with TypeScript
- Tailwind CSS for styling
- Material Symbols icons
- Component exported from `src/lib/index.ts`
- PropTypes and TypeScript interfaces defined
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Dashboard/Dashboard.tsx
import React from 'react';

interface DashboardProps {
  briefSummary?: string;
  inboxCounts?: { work: number; personal: number; ideas: number };
  activeProjects?: Project[];
}

export const Dashboard: React.FC<DashboardProps> = ({ ... }) => {
  return (
    <div data-testid="dashboard" className="...">
      {/* Match Stitch design exactly */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png (validated by hooks)
- [ ] Component exported and importable
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Lint and format clean
- [ ] Accessible (WCAG AA)
- [ ] Responsive (mobile, tablet, desktop)

## Workflow
1. Read the Stitch HTML to understand structure
2. View the PNG to understand visual design
3. Create React component matching both
4. Hooks will auto-validate during development
5. Mark task complete when all hooks pass
