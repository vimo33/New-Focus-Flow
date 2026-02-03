---
name: capture-builder
description: Build Quick Capture screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Capture.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=capture"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Capture.test.tsx"
      description: "Run component tests"
---

# Quick Capture Builder Agent

## Objective
Build the Quick Capture Flow screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/quick_capture_flow/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/quick_capture_flow/screen.png`

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
- Form validation and state management
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Capture/Capture.tsx
import React from 'react';

interface CaptureProps {
  onSubmit?: (text: string, prefix?: string) => void;
}

export const Capture: React.FC<CaptureProps> = ({ onSubmit }) => {
  return (
    <div data-testid="capture" className="...">
      {/* Quick capture form */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Form submission works
- [ ] Input validation
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
