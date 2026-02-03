---
name: inbox-validator
description: Validate Inbox Processing screen implementation
model: haiku
---

# Inbox Processing Validator Agent

## Objective
Validate that the Inbox Processing screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/inbox.spec.ts
```
- Screenshot diff < 500 pixels from reference
- All UI elements present

### Accessibility
```bash
npx pa11y http://localhost:5173/inbox
```
- WCAG AA compliance
- List semantics
- Keyboard navigation
- Screen reader support

### Functionality Tests
```bash
npm test -- Inbox.integration.test.tsx
```
- Filtering works correctly
- Item actions functional
- Empty state handling
- Loading states

### Performance
```bash
npx lighthouse http://localhost:5173/inbox --only-categories=performance
```
- Performance score > 90
- List virtualization if >50 items

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
