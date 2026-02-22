import { test, expect } from '@playwright/test';

test('Network page shows progress UI while loading', async ({ page }) => {
  await page.goto('/leverage/network');
  // Progress bar or skeleton should appear quickly
  const progress = page.locator('[data-testid="route-progress"], [data-testid="skeleton"]');
  await expect(progress.first()).toBeVisible({ timeout: 3000 });
});

test('Portfolio loads without long blocking', async ({ page }) => {
  await page.goto('/think/ventures');
  // This threshold is a placeholder; tune once measured
  const start = Date.now();
  await expect(page.locator('[data-testid="ventures-list"]')).toBeVisible({ timeout: 20000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(8000);
});
