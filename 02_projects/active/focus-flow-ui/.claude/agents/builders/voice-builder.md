---
name: voice-builder
description: Build Voice Cockpit AI screen from Stitch design
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
    - command: "python3 .claude/hooks/validators/validate-component-exports.py src/components/Voice.tsx"
      description: "Verify component exported"
    - command: "python3 .claude/hooks/validators/validate-design-match.py screen=voice"
      description: "Check design matches Stitch reference"
    - command: "npm test -- Voice.test.tsx"
      description: "Run component tests"
---

# Voice Cockpit AI Builder Agent

## Objective
Build the Voice Cockpit AI screen matching the Stitch design exactly.

## Reference Design
- HTML: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/voice_cockpit_ai/code.html`
- PNG: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/voice_cockpit_ai/screen.png`

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
- Voice input UI with waveform
- data-testid attributes for testing

### Component Structure
```tsx
// src/components/Voice/Voice.tsx
import React from 'react';

interface VoiceProps {
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
}

export const Voice: React.FC<VoiceProps> = ({ isListening, onStartListening, onStopListening }) => {
  return (
    <div data-testid="voice" className="...">
      {/* Voice interface */}
    </div>
  );
};
```

### Acceptance Criteria
- [ ] Visual match to screen.png
- [ ] Voice UI displays correctly
- [ ] Listening state visualization
- [ ] Component exported
- [ ] TypeScript types defined
- [ ] Tests passing
- [ ] Accessible (WCAG AA)
