---
name: project-detail-validator
description: Validate Project Workspace Details screen implementation
model: haiku
---

# Project Workspace Details Validator Agent

## Objective
Validate that the Project Workspace Details screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/project-detail.spec.ts
```
- Screenshot diff < 500 pixels from reference
- All sections present

### Accessibility
```bash
npx pa11y http://localhost:5173/projects/test-project
```
- WCAG AA compliance
- Heading hierarchy
- Landmark regions

### Functionality Tests
```bash
npm test -- ProjectDetail.integration.test.tsx
```
- Project data loads
- Task management works
- Navigation breadcrumbs

### Performance
```bash
npx lighthouse http://localhost:5173/projects/test-project --only-categories=performance
```
- Performance score > 90

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
