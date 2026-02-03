---
name: wellbeing-validator
description: Validate Wellbeing Tracker screen implementation
model: haiku
---

# Wellbeing Tracker Validator Agent

## Objective
Validate that the Wellbeing Tracker screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/wellbeing.spec.ts
```
- Screenshot diff < 500 pixels from reference
- Charts render correctly

### Accessibility
```bash
npx pa11y http://localhost:5173/wellbeing
```
- WCAG AA compliance
- Chart accessibility
- Data table alternatives

### Functionality Tests
```bash
npm test -- Wellbeing.integration.test.tsx
```
- Metrics display correctly
- Chart rendering works
- Period filtering functional

### Performance
```bash
npx lighthouse http://localhost:5173/wellbeing --only-categories=performance
```
- Performance score > 90
- Chart rendering optimized

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
