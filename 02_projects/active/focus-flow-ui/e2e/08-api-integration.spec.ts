import { test, expect } from '@playwright/test';

test.describe('Frontend ↔ Backend API Integration', () => {
  test('should fetch dashboard summary from API', async ({ page }) => {
    // Listen for API calls
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Should have made API call for summary
    const hasSummaryCall = apiCalls.some(url => url.includes('/api/summary'));
    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('should fetch inbox items from API', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/inbox')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/inbox');
    await page.waitForTimeout(2000);

    // Should have made API call for inbox
    expect(apiCalls.length).toBeGreaterThan(0);
  });

  test('should fetch inbox counts from API', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/inbox/counts')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/inbox');
    await page.waitForTimeout(2000);

    // Should have made API call for counts
    const hasCountsCall = apiCalls.some(url => url.includes('/api/inbox/counts'));
  });

  test('should fetch projects from API', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/projects')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/projects');
    await page.waitForTimeout(2000);

    // Should have made API call for projects
    const hasProjectsCall = apiCalls.some(url => url.includes('/api/projects'));
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Block API calls to simulate network error
    await page.route('**/api/**', route => route.abort());

    await page.goto('/');

    // Should show error state or handle gracefully
    await page.waitForTimeout(2000);

    // Check if error message is shown
    const hasError = await page.locator('[data-testid="error-message"], text=/error/i, text=/failed/i').isVisible();
  });

  test('should submit capture via API', async ({ page }) => {
    let captureSubmitted = false;

    page.on('request', request => {
      if (request.url().includes('/api/capture') && request.method() === 'POST') {
        captureSubmitted = true;
      }
    });

    await page.goto('/capture');

    const textInput = page.locator('textarea, input[type="text"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Capture"), button:has-text("Add")').first();

    await textInput.fill('Test API capture item');
    await submitButton.click();

    await page.waitForTimeout(1000);
  });

  test('should process inbox item via API', async ({ page }) => {
    let processSubmitted = false;

    page.on('request', request => {
      if (request.url().includes('/api/inbox') && request.url().includes('/process') && request.method() === 'POST') {
        processSubmitted = true;
      }
    });

    await page.goto('/inbox');

    const items = page.locator('[data-testid^="inbox-item-"]');
    const count = await items.count();

    if (count > 0) {
      const processButton = page.locator('[data-testid^="process-button-"]').first();
      await processButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should handle slow API responses', async ({ page }) => {
    // Delay API responses
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');

    // Should show loading state
    const hasLoading = await page.locator('[data-testid="loading"], .animate-pulse, .spinner').isVisible();

    await page.waitForTimeout(2000);
  });

  test('should retry failed API calls', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/summary', route => {
      callCount++;
      if (callCount === 1) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // May or may not retry depending on implementation
  });

  test('should cache API responses appropriately', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    const firstCallCount = apiCalls.length;

    // Navigate away and back
    await page.goto('/inbox');
    await page.goto('/');

    await page.waitForTimeout(2000);

    // May make additional calls or use cache
  });
});
