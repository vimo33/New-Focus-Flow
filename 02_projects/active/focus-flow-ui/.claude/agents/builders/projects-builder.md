---
name: projects-builder
description: Build Projects Management screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Projects.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=projects"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Projects.test.tsx"
      description: "Run component tests"
---

# Projects Management Builder Agent

## Objective
Build the Projects Management screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/projects_management/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/projects_management/screen.png`

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
- Project cards with status indicators
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Projects/Projects.tsx
import React from 'react';

interface ProjectsProps {
  projects?: Project[];
  filter?: 'active' | 'paused' | 'completed';
}

export const Projects: React.FC<ProjectsProps> = ({ projects, filter }) => {
  return (
    <div data-testid="projects" className="...">
      {/* Projects grid */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Project filtering works
- [ ] Navigation to project details
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
