---
name: item-processing-builder
description: Build Item Processing Panel from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/ItemProcessing.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=process"
      description: "Check design matches Stitch reference"
    - command: "npm test -- ItemProcessing.test.tsx"
      description: "Run component tests"
---

# Item Processing Panel Builder Agent

## Objective
Build the Item Processing Panel matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/item_processing_panel/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/item_processing_panel/screen.png`

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
- Processing actions panel
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/ItemProcessing/ItemProcessing.tsx
import React from 'react';

interface ItemProcessingProps {
  item?: InboxItem;
  onAction?: (action: string, itemId: string) => void;
}

export const ItemProcessing: React.FC<ItemProcessingProps> = ({ item, onAction }) => {
  return (
    <div data-testid="item-processing" className="...">
      {/* Processing panel */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Action buttons functional
- [ ] Item details display
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
