---
name: item-processing-validator
description: Validate Item Processing Panel implementation
model: haiku
---

# Item Processing Panel Validator Agent

## Objective
Validate that the Item Processing Panel meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/item-processing.spec.ts
```
- Screenshot diff < 500 pixels from reference
- Panel layout correct

### Accessibility
```bash
npx pa11y http://localhost:5173/process
```
- WCAG AA compliance
- Button semantics
- Keyboard navigation

### Functionality Tests
```bash
npm test -- ItemProcessing.integration.test.tsx
```
- Action buttons functional
- Item details display
- Processing workflow works

### Performance
```bash
npx lighthouse http://localhost:5173/process --only-categories=performance
```
- Performance score > 90

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
