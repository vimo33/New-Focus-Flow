---
name: capture-validator
description: Validate Quick Capture screen implementation
model: haiku
---

# Quick Capture Validator Agent

## Objective
Validate that the Quick Capture screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/capture.spec.ts
```
- Screenshot diff < 500 pixels from reference
- All UI elements present

### Accessibility
```bash
npx pa11y http://localhost:5173/capture
```
- WCAG AA compliance
- Form labels and ARIA
- Keyboard navigation
- Focus indicators

### Form Validation
```bash
npm test -- Capture.integration.test.tsx
```
- Input validation works
- Submit functionality
- Error handling
- Success states

### Performance
```bash
npx lighthouse http://localhost:5173/capture --only-categories=performance
```
- Performance score > 90
- Input latency < 50ms

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
