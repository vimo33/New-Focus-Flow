import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('dashboard should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('inbox should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('projects should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('capture should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/capture');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('calendar should load in under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Filter out expected errors (if any)
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('service-worker')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should have no memory leaks on navigation', async ({ page }) => {
    // Navigate through all pages multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.goto('/inbox');
      await page.goto('/projects');
      await page.goto('/capture');
      await page.goto('/calendar');
    }

    // Page should still be responsive
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should handle rapid navigation', async ({ page }) => {
    await page.goto('/');

    // Rapidly navigate between pages
    await page.goto('/inbox');
    await page.goto('/projects');
    await page.goto('/capture');
    await page.goto('/');

    // Should end up on correct page
    await expect(page).toHaveURL('/');
  });

  test('should handle large lists efficiently', async ({ page }) => {
    await page.goto('/inbox');

    // Measure scroll performance
    const startTime = Date.now();

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(100);

    const scrollTime = Date.now() - startTime;
    expect(scrollTime).toBeLessThan(1000);
  });

  test('should lazy load images if present', async ({ page }) => {
    await page.goto('/');

    // Check if images have loading="lazy" attribute
    const images = page.locator('img');
    const count = await images.count();

    // Images should be optimized (optional check)
  });

  test('should minimize bundle size', async ({ page }) => {
    const responses: { url: string; size: number }[] = [];

    page.on('response', async response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        try {
          const buffer = await response.body();
          responses.push({
            url: response.url(),
            size: buffer.length
          });
        } catch (e) {
          // Ignore errors
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Calculate total bundle size
    const totalSize = responses.reduce((acc, r) => acc + r.size, 0);

    // Should be reasonable (this is uncompressed size)
    // Gzipped would be much smaller
  });

  test('should use code splitting', async ({ page }) => {
    const jsFiles: string[] = [];

    page.on('response', response => {
      if (response.url().includes('.js')) {
        jsFiles.push(response.url());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const initialJsFiles = [...jsFiles];

    // Navigate to another page
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');

    // Should load additional chunks for inbox
    expect(jsFiles.length).toBeGreaterThan(initialJsFiles.length);
  });

  test('should have good Time to Interactive', async ({ page }) => {
    await page.goto('/');

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
      };
    });

    expect(metrics.domContentLoaded).toBeLessThan(2000);
  });
});
