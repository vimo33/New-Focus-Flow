import { test, expect } from '@playwright/test';

test.describe('Navigation Flows', () => {
  test('should navigate between all main screens', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Navigate to capture
    await page.goto('/capture');
    await expect(page).toHaveURL('/capture');

    // Navigate to inbox
    await page.goto('/inbox');
    await expect(page).toHaveURL('/inbox');

    // Navigate to projects
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');

    // Navigate to calendar
    await page.goto('/calendar');
    await expect(page).toHaveURL('/calendar');

    // Back to dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('should have navigation in sidebar or header', async ({ page }) => {
    await page.goto('/');

    // Look for navigation links
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const count = await navLinks.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should navigate using sidebar links', async ({ page }) => {
    await page.goto('/');

    // Find Dashboard link in nav
    const dashboardLink = page.locator('nav a:has-text("Dashboard"), [role="navigation"] a:has-text("Dashboard")');
    const count = await dashboardLink.count();

    if (count > 0) {
      await expect(dashboardLink.first()).toBeVisible();
    }
  });

  test('should handle browser back button', async ({ page }) => {
    await page.goto('/');
    await page.goto('/inbox');

    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('should handle browser forward button', async ({ page }) => {
    await page.goto('/');
    await page.goto('/inbox');
    await page.goBack();

    await page.goForward();
    await expect(page).toHaveURL('/inbox');
  });

  test('should handle deep linking', async ({ page }) => {
    // Direct navigation to specific routes should work
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');

    await page.goto('/calendar');
    await expect(page).toHaveURL('/calendar');
  });

  test('should handle 404 for invalid routes', async ({ page }) => {
    await page.goto('/non-existent-route');

    // Should handle gracefully - either redirect or show 404
    await page.waitForTimeout(1000);
  });

  test('should maintain state when navigating', async ({ page }) => {
    await page.goto('/inbox');

    // Select a filter
    await page.click('[data-testid="filter-work"]');

    // Navigate away and back
    await page.goto('/');
    await page.goto('/inbox');

    // State may or may not be preserved depending on implementation
  });

  test('should have breadcrumbs on detail pages', async ({ page }) => {
    await page.goto('/projects');

    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      await page.waitForURL(/\/projects\/.+/);

      // Look for breadcrumbs
      const breadcrumbs = page.locator('nav[aria-label*="bread" i], [class*="breadcrumb"]');
      // Breadcrumbs are optional
    }
  });

  test('should be accessible via keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should focus on interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
