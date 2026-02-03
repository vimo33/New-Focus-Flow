import { test, expect } from '@playwright/test';

test.describe('Dashboard Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load and display dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Check header elements
    await expect(page.locator('h1')).toContainText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);

    // Check greeting
    await expect(page.locator('p')).toContainText(/Good Morning|Good Afternoon|Good Evening/);
  });

  test('should display today\'s brief widget', async ({ page }) => {
    const todaysBrief = page.locator('[data-testid="todays-brief"]');
    await expect(todaysBrief).toBeVisible();
    await expect(todaysBrief).toContainText(/Today's Brief/i);
  });

  test('should display inbox widget with counts', async ({ page }) => {
    const inboxWidget = page.locator('[data-testid="inbox-widget"]');
    await expect(inboxWidget).toBeVisible();

    // Check inbox categories
    await expect(page.locator('[data-testid="inbox-work"]')).toBeVisible();
    await expect(page.locator('[data-testid="inbox-personal"]')).toBeVisible();
    await expect(page.locator('[data-testid="inbox-ideas"]')).toBeVisible();
  });

  test('should display active projects widget', async ({ page }) => {
    const activeProjects = page.locator('[data-testid="active-projects"]');
    await expect(activeProjects).toBeVisible();
    await expect(activeProjects).toContainText(/Active Projects/i);
  });

  test('should display recent activity widget', async ({ page }) => {
    const recentActivity = page.locator('[data-testid="recent-activity"]');
    await expect(recentActivity).toBeVisible();
    await expect(recentActivity).toContainText(/Recent Activity/i);
  });

  test('should have quick action buttons', async ({ page }) => {
    const quickActions = page.locator('[data-testid="quick-actions"]');
    await expect(quickActions).toBeVisible();

    // Check all quick action buttons
    await expect(page.locator('[data-testid="btn-new-capture"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-view-inbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="btn-new-project"]')).toBeVisible();
  });

  test('should navigate to capture from quick action', async ({ page }) => {
    await page.click('[data-testid="btn-new-capture"]');
    await expect(page).toHaveURL('/capture');
  });

  test('should navigate to inbox from quick action', async ({ page }) => {
    await page.click('[data-testid="btn-view-inbox"]');
    await expect(page).toHaveURL('/inbox');
  });

  test('should navigate to projects from quick action', async ({ page }) => {
    await page.click('[data-testid="btn-new-project"]');
    await expect(page).toHaveURL('/projects');
  });

  test('should navigate to inbox from widget', async ({ page }) => {
    await page.click('[data-testid="inbox-work"]');
    await expect(page).toHaveURL('/inbox');
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Dashboard should not show error on initial load
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
  });
});
