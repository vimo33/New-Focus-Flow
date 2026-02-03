# Focus Flow OS - Testing Guide

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install
```

---

## Running Tests

### Run All E2E Tests

```bash
# Run all tests in headless mode
npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui

# Run with headed browsers (see browser windows)
npx playwright test --headed

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

### Run Specific Test Files

```bash
# Dashboard tests
npx playwright test e2e/01-dashboard.spec.ts

# Inbox tests
npx playwright test e2e/03-inbox.spec.ts

# Performance tests
npx playwright test e2e/09-performance.spec.ts

# All tests for a specific screen
npx playwright test e2e/01-dashboard
```

---

### Run Tests in Debug Mode

```bash
# Debug mode with breakpoints
npx playwright test --debug

# Debug specific test
npx playwright test e2e/01-dashboard.spec.ts --debug

# Generate trace for debugging
npx playwright test --trace on
```

---

### View Test Reports

```bash
# Generate and open HTML report
npx playwright show-report

# Report is automatically generated at:
# playwright-report/index.html
```

---

## Test Files Overview

```
e2e/
├── 01-dashboard.spec.ts       # Dashboard screen tests
├── 02-quick-capture.spec.ts   # Quick Capture screen tests
├── 03-inbox.spec.ts           # Inbox screen tests
├── 04-projects.spec.ts        # Projects list tests
├── 05-project-detail.spec.ts  # Project detail tests
├── 06-calendar.spec.ts        # Calendar screen tests
├── 07-navigation.spec.ts      # Navigation flow tests
├── 08-api-integration.spec.ts # API integration tests
├── 09-performance.spec.ts     # Performance tests
└── 10-accessibility.spec.ts   # Accessibility tests
```

---

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-route');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('[data-testid="element"]');

    // Act
    await element.click();

    // Assert
    await expect(page).toHaveURL('/expected-url');
  });
});
```

---

### Best Practices

1. **Use data-testid attributes**
   ```typescript
   await page.click('[data-testid="submit-button"]');
   ```

2. **Wait for elements**
   ```typescript
   await expect(page.locator('[data-testid="result"]')).toBeVisible();
   ```

3. **Use descriptive test names**
   ```typescript
   test('should navigate to inbox when clicking inbox button', async ({ page }) => {
     // ...
   });
   ```

4. **Clean up after tests**
   ```typescript
   test.afterEach(async ({ page }) => {
     // Clean up if needed
   });
   ```

---

## Backend API Testing

### Run Backend Tests

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend

# Run API endpoint tests
./tests/api-endpoints.test.sh
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Configuration

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

---

## Debugging Failed Tests

### 1. View Screenshots

```bash
# Screenshots saved to: test-results/
ls test-results/*/test-failed-*.png
```

### 2. View Traces

```bash
# Open trace viewer
npx playwright show-trace test-results/trace.zip
```

### 3. Check Logs

```bash
# View test logs
cat test-results/test.log
```

---

## Performance Testing

### Measure Load Times

```typescript
test('should load quickly', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(2000);
});
```

---

## Accessibility Testing

### Check Keyboard Navigation

```typescript
test('should be keyboard accessible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const focusedElement = await page.evaluate(() =>
    document.activeElement?.tagName
  );

  expect(focusedElement).toBeTruthy();
});
```

---

## Common Issues & Solutions

### Issue: Tests Fail with "Timeout"

**Solution:**
- Increase timeout in config
- Use `waitForLoadState('networkidle')`
- Check if backend is running

### Issue: Tests Fail Locally but Pass in CI

**Solution:**
- Check screen size differences
- Ensure consistent test data
- Use `waitFor` instead of `waitForTimeout`

### Issue: Flaky Tests

**Solution:**
- Add proper waits
- Use `toBeVisible()` instead of checking presence
- Increase retry count in CI

---

## Test Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** All critical user flows
- **E2E Tests:** All main screens and features
- **Performance Tests:** All pages < 2s load time
- **Accessibility Tests:** WCAG 2.1 AA compliance

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Report](/srv/focus-flow/07_system/logs/FINAL_INTEGRATION_TEST_REPORT.md)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## Support

For issues or questions about testing:
1. Check the test report for known issues
2. Review failed test screenshots
3. Check Playwright documentation
4. Review test code comments

---

**Last Updated:** February 3, 2026
**Version:** 1.0
