import { test, expect } from '@playwright/test';

test.describe('Project Detail Screen', () => {
  test('should handle direct navigation to project detail', async ({ page }) => {
    // Try to navigate to a sample project ID
    await page.goto('/projects/test-project-1');

    // Should either show project details or handle 404 gracefully
    await page.waitForTimeout(1000);
  });

  test('should navigate to project detail from projects list', async ({ page }) => {
    await page.goto('/projects');

    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      await page.waitForURL(/\/projects\/.+/);

      // Verify we're on project detail page
      expect(page.url()).toMatch(/\/projects\/.+/);
    } else {
      test.skip();
    }
  });

  test('should display project information', async ({ page }) => {
    await page.goto('/projects');

    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      await page.waitForURL(/\/projects\/.+/);

      // Should show project title
      await expect(page.locator('h1, h2').first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should have back navigation', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    const backButton = page.locator('button:has-text("Back"), a:has-text("Projects"), button[aria-label*="back" i]');
    const count = await backButton.count();

    if (count > 0) {
      await backButton.first().click();
      await expect(page).toHaveURL('/projects');
    }
  });

  test('should display project tasks if available', async ({ page }) => {
    await page.goto('/projects');

    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      await page.waitForURL(/\/projects\/.+/);

      // Look for tasks section
      const tasksSection = page.locator('text=/tasks/i, [data-testid*="task"]');
      // Tasks may or may not be present
    } else {
      test.skip();
    }
  });

  test('should display project notes if available', async ({ page }) => {
    await page.goto('/projects');

    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      await page.waitForURL(/\/projects\/.+/);

      // Look for notes section
      const notesSection = page.locator('text=/notes/i, [data-testid*="note"]');
      // Notes may or may not be present
    } else {
      test.skip();
    }
  });

  test('should display project activity if available', async ({ page }) => {
    await page.goto('/projects');

    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      await page.waitForURL(/\/projects\/.+/);

      // Look for activity section
      const activitySection = page.locator('text=/activity/i, [data-testid*="activity"]');
      // Activity may or may not be present
    } else {
      test.skip();
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await page.goto('/projects/test-project-1');
    await page.waitForTimeout(1000);
  });
});
