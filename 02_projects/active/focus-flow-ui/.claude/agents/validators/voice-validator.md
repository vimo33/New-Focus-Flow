---
name: voice-validator
description: Validate Voice Cockpit AI screen implementation
model: haiku
---

# Voice Cockpit AI Validator Agent

## Objective
Validate that the Voice Cockpit AI screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/voice.spec.ts
```
- Screenshot diff < 500 pixels from reference
- Voice UI elements present

### Accessibility
```bash
npx pa11y http://localhost:5173/voice
```
- WCAG AA compliance
- Voice button accessibility
- Visual feedback for listening state

### Functionality Tests
```bash
npm test -- Voice.integration.test.tsx
```
- Voice UI displays correctly
- Listening state visualization
- Start/stop controls work

### Performance
```bash
npx lighthouse http://localhost:5173/voice --only-categories=performance
```
- Performance score > 90

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
