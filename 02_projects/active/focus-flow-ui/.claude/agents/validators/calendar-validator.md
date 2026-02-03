---
name: calendar-validator
description: Validate Calendar & Time Blocking screen implementation
model: haiku
---

# Calendar & Time Blocking Validator Agent

## Objective
Validate that the Calendar & Time Blocking screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/calendar.spec.ts
```
- Screenshot diff < 500 pixels from reference
- Calendar grid correct

### Accessibility
```bash
npx pa11y http://localhost:5173/calendar
```
- WCAG AA compliance
- Table semantics
- Keyboard navigation
- Date picker accessible

### Functionality Tests
```bash
npm test -- Calendar.integration.test.tsx
```
- Calendar rendering correct
- Time block creation works
- View switching functional

### Performance
```bash
npx lighthouse http://localhost:5173/calendar --only-categories=performance
```
- Performance score > 90

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
