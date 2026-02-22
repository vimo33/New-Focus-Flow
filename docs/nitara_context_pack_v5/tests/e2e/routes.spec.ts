import { test, expect } from '@playwright/test';
import mapping from '../../docs/screen_mapping.yaml';

const routes = (mapping as any).screens.map((s: any) => ({ id: s.id, route: s.route }));

test.describe('Route smoke tests', () => {
  for (const r of routes) {
    test(`${r.id} loads`, async ({ page }) => {
      await page.goto(r.route);
      // Basic sanity: no blank white page
      await expect(page.locator('body')).toBeVisible();
      // Optional: ensure app shell exists
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 20000 });
    });
  }
});
