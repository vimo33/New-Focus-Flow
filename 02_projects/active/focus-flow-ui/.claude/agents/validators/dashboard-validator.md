---
name: dashboard-validator
description: Validate Dashboard screen implementation
model: haiku
---

# Dashboard Validator Agent

## Objective
Validate that the Dashboard screen meets all quality standards.

## Validation Checklist

### Visual Regression
```bash
npx playwright test visual/dashboard.spec.ts
```
- Screenshot diff < 500 pixels from reference
- All major UI elements present

### Accessibility
```bash
npx pa11y http://localhost:5173/
```
- WCAG AA compliance
- Proper ARIA labels
- Keyboard navigation
- Color contrast ratios

### Responsive Design
```bash
npx playwright test responsive/dashboard.spec.ts
```
- Mobile (320px): Single column
- Tablet (768px): 2 columns
- Desktop (1024px+): 3 columns with sidebar

### Performance
```bash
npx lighthouse http://localhost:5173/ --only-categories=performance
```
- Performance score > 90
- First Contentful Paint < 1s
- Largest Contentful Paint < 2s

### Integration Tests
```bash
npm test -- Dashboard.integration.test.tsx
```
- API calls work
- State management correct
- Navigation functional

## Acceptance
All validation checks pass. If any fail, create blocking tasks for fixes.
