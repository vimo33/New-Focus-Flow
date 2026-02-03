---
name: calendar-builder
description: Build Calendar & Time Blocking screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Calendar.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=calendar"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Calendar.test.tsx"
      description: "Run component tests"
---

# Calendar & Time Blocking Builder Agent

## Objective
Build the Calendar & Time Blocking screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/calendar_&_time_blocking/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/calendar_&_time_blocking/screen.png`

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
- Calendar grid with time blocks
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Calendar/Calendar.tsx
import React from 'react';

interface CalendarProps {
  events?: CalendarEvent[];
  view?: 'day' | 'week' | 'month';
}

export const Calendar: React.FC<CalendarProps> = ({ events, view }) => {
  return (
    <div data-testid="calendar" className="...">
      {/* Calendar view */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Calendar rendering works
- [ ] Time block creation
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
