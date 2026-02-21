import { test, expect } from '@playwright/test';

test.describe('Route smoke tests — SPA navigation via DockNav', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
  });

  test('app shell renders on load', async ({ page }) => {
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });

  test('think-ventures loads by default', async ({ page }) => {
    // Think mode + Ventures sub-tab is the default
    await expect(
      page.locator('[data-testid="canvas-portfolio"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('think-insights loads via sub-tab click', async ({ page }) => {
    await page.locator('button:text("Insights")').click();
    await expect(
      page.locator('[data-testid="canvas-portfolio"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('think-finance loads via sub-tab click', async ({ page }) => {
    await page.locator('button:text("Finance")').click();
    await expect(
      page.locator('[data-testid="canvas-financials"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('think-comms loads via sub-tab click', async ({ page }) => {
    await page.locator('button:text("Comms")').click();
    await expect(
      page.locator('[data-testid="canvas-comms"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('validate mode loads experiment stack', async ({ page }) => {
    await page.locator('button[title="Validate"]').click();
    await expect(
      page.locator('[data-testid="canvas-experiment-stack"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('build mode loads autonomous builder', async ({ page }) => {
    await page.locator('button[title="Build"]').click();
    await expect(
      page.locator('[data-testid="canvas-autonomous-builder"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('grow mode loads resource engine', async ({ page }) => {
    await page.locator('button[title="Grow"]').click();
    await expect(
      page.locator('[data-testid="canvas-resource-engine"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('leverage mode loads network canvas', async ({ page }) => {
    await page.locator('button[title="Leverage"]').click();
    await expect(
      page.locator('[data-testid="canvas-network"]')
    ).toBeVisible({ timeout: 20000 });
  });

  test('voice console opens via mic button', async ({ page }) => {
    await page.locator('button[title="Voice Console"]').click();
    await expect(
      page.locator('[data-testid="canvas-voice-console"]')
    ).toBeVisible({ timeout: 20000 });
  });
});
