---
name: project-detail-builder
description: Build Project Workspace Details screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/ProjectDetail.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=project-detail"
      description: "Check design matches Stitch reference"
    - command: "npm test -- ProjectDetail.test.tsx"
      description: "Run component tests"
---

# Project Workspace Details Builder Agent

## Objective
Build the Project Workspace Details screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/project_workspace_details/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/project_workspace_details/screen.png`

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
- Detailed project view with tasks
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/ProjectDetail/ProjectDetail.tsx
import React from 'react';

interface ProjectDetailProps {
  projectId: string;
  project?: Project;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, project }) => {
  return (
    <div data-testid="project-detail" className="...">
      {/* Project details */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Project details display
- [ ] Task list functional
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
