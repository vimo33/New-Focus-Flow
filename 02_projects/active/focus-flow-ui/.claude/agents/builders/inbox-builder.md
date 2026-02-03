---
name: inbox-builder
description: Build Inbox Processing screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Inbox.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=inbox"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Inbox.test.tsx"
      description: "Run component tests"
---

# Inbox Processing Builder Agent

## Objective
Build the Inbox Processing Center screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/inbox_processing_center/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/inbox_processing_center/screen.png`

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
- List rendering with filters
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Inbox/Inbox.tsx
import React from 'react';

interface InboxProps {
  items?: InboxItem[];
  filter?: 'all' | 'work' | 'personal' | 'ideas';
  onProcess?: (itemId: string) => void;
}

export const Inbox: React.FC<InboxProps> = ({ items, filter, onProcess }) => {
  return (
    <div data-testid="inbox" className="...">
      {/* Inbox items list */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Filtering works
- [ ] Item actions functional
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
