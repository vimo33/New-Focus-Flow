---
name: ideas-builder
description: Build Ideas Explorer screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Ideas.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=ideas"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Ideas.test.tsx"
      description: "Run component tests"
---

# Ideas Explorer Builder Agent

## Objective
Build the Ideas Explorer screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/ideas_explorer/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/ideas_explorer/screen.png`

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
- Ideas grid with status badges
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Ideas/Ideas.tsx
import React from 'react';

interface IdeasProps {
  ideas?: Idea[];
  filter?: 'inbox' | 'validated' | 'rejected';
}

export const Ideas: React.FC<IdeasProps> = ({ ideas, filter }) => {
  return (
    <div data-testid="ideas" className="...">
      {/* Ideas grid */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Ideas filtering works
- [ ] Idea status display
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
