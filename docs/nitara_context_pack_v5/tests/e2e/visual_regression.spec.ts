import { test, expect } from '@playwright/test';

test.describe('Visual regression (masked)', () => {
  test('Council verdict layout matches baseline structure', async ({ page }) => {
    await page.goto('/think/ventures'); // navigate to a project then council as needed
    // TODO: navigate to council page in-app to make this test robust
    // Example snapshot with masking dynamic areas
    await expect(page).toHaveScreenshot('council-layout.png', {
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="live-indicator"]'),
      ],
      maxDiffPixelRatio: 0.02,
    });
  });
});
