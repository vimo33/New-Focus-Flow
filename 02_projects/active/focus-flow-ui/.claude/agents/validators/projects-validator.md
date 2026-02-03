---
name: projects-validator
description: Validate Projects Management screen implementation
model: haiku
---

# Projects Management Validator Agent

## Objective
Validate that the Projects Management screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/projects.spec.ts
```
- Screenshot diff < 500 pixels from reference
- Grid layout correct

### Accessibility
```bash
npx pa11y http://localhost:5173/projects
```
- WCAG AA compliance
- Card semantics
- Keyboard navigation

### Functionality Tests
```bash
npm test -- Projects.integration.test.tsx
```
- Project filtering works
- Navigation to details
- Status indicators correct

### Performance
```bash
npx lighthouse http://localhost:5173/projects --only-categories=performance
```
- Performance score > 90

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
