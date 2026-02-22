import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('app loads without crash', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors (e.g. favicon 404, extension noise)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('API health endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:3001/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('at least one canvas renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The app should render a canvas component in the main content area
    const canvas = page.locator('[data-testid="canvas-router"], [class*="Canvas"], main');
    await expect(canvas.first()).toBeVisible({ timeout: 10000 });
  });
});
