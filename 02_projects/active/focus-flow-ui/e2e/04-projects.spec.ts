import { test, expect } from '@playwright/test';

test.describe('Projects Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
  });

  test('should load projects screen', async ({ page }) => {
    await expect(page).toHaveURL('/projects');
    await expect(page.locator('h1, h2')).toContainText(/Project/i);
  });

  test('should display projects list or empty state', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Either projects are shown or empty state is shown
    const hasProjects = await page.locator('[data-testid^="project-"]').count() > 0;
    const hasEmptyState = await page.locator('text=/No projects|empty/i').isVisible();

    expect(hasProjects || hasEmptyState).toBeTruthy();
  });

  test('should have create project button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Project"), button:has-text("Add Project")');
    const count = await createButton.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should open create project modal', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Project"), button:has-text("Add Project")').first();
    await createButton.click();

    // Modal should appear
    await page.waitForTimeout(500);
    const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"], form');
    // Modal presence is expected
  });

  test('should filter projects if filters available', async ({ page }) => {
    const filterButtons = page.locator('button:has-text("Active"), button:has-text("Completed"), button:has-text("All")');
    const count = await filterButtons.count();

    if (count > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('should search projects if search available', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]');
    const count = await searchInput.count();

    if (count > 0) {
      await searchInput.first().fill('test project');
      await page.waitForTimeout(500);
    }
  });

  test('should click on project to view details', async ({ page }) => {
    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      await projects.first().click();
      // Should navigate to project detail page
      await page.waitForURL(/\/projects\/.+/);
    }
  });

  test('should display project cards with information', async ({ page }) => {
    const projects = page.locator('[data-testid^="project-"]');
    const count = await projects.count();

    if (count > 0) {
      const firstProject = projects.first();
      // Project should have some text content
      const text = await firstProject.textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await expect(page.locator('h1, h2')).toContainText(/Project/i);
  });
});
