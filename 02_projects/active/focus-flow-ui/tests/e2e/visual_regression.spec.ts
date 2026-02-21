import { test, expect } from '@playwright/test';

test.describe('Visual regression snapshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 15000 });
  });

  test('portfolio canvas snapshot', async ({ page }) => {
    await expect(
      page.locator('[data-testid="canvas-portfolio"]')
    ).toBeVisible({ timeout: 20000 });

    // Wait for content to stabilize
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('portfolio-canvas.png', {
      fullPage: true,
      mask: [
        // Mask dynamic content: clock, timestamps, live indicators
        page.locator('.tabular-nums'),
      ],
    });
  });

  test('dock nav snapshot', async ({ page }) => {
    // Wait for dock to render
    await page.waitForTimeout(500);

    const dock = page.locator('nav');
    await expect(dock.first()).toBeVisible();

    await expect(dock.first()).toHaveScreenshot('dock-nav.png');
  });

  test('validate mode snapshot', async ({ page }) => {
    await page.locator('button[title="Validate"]').click();
    await expect(
      page.locator('[data-testid="canvas-experiment-stack"]')
    ).toBeVisible({ timeout: 20000 });

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('validate-experiment-stack.png', {
      fullPage: true,
    });
  });

  test('network canvas snapshot', async ({ page }) => {
    await page.locator('button[title="Leverage"]').click();
    await expect(
      page.locator('[data-testid="canvas-network"]')
    ).toBeVisible({ timeout: 20000 });

    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('network-canvas.png', {
      fullPage: true,
      mask: [
        page.locator('.tabular-nums'),
      ],
    });
  });
});
