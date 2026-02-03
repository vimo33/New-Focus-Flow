---
name: ideas-validator
description: Validate Ideas Explorer screen implementation
model: haiku
---

# Ideas Explorer Validator Agent

## Objective
Validate that the Ideas Explorer screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/ideas.spec.ts
```
- Screenshot diff < 500 pixels from reference
- Grid layout correct

### Accessibility
```bash
npx pa11y http://localhost:5173/ideas
```
- WCAG AA compliance
- Badge semantics
- Keyboard navigation

### Functionality Tests
```bash
npm test -- Ideas.integration.test.tsx
```
- Idea filtering works
- Status display correct
- Empty state handling

### Performance
```bash
npx lighthouse http://localhost:5173/ideas --only-categories=performance
```
- Performance score > 90

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
