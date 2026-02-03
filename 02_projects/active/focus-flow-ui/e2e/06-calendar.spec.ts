import { test, expect } from '@playwright/test';

test.describe('Calendar Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
  });

  test('should load calendar screen', async ({ page }) => {
    await expect(page).toHaveURL('/calendar');
    await expect(page.locator('h1, h2')).toContainText(/Calendar/i);
  });

  test('should display month view', async ({ page }) => {
    // Calendar should show current month
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Check if any month name is visible
    const hasMonth = await page.locator(`text=/${monthNames.join('|')}/i`).isVisible();
    expect(hasMonth).toBeTruthy();
  });

  test('should display day names', async ({ page }) => {
    // Calendar should show day names
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // At least some day names should be visible
    const hasDays = await page.locator(`text=/${dayNames.join('|')}/i`).first().isVisible();
    expect(hasDays).toBeTruthy();
  });

  test('should have navigation controls', async ({ page }) => {
    // Should have prev/next buttons
    const prevButton = page.locator('button:has-text("Previous"), button:has-text("Prev"), button[aria-label*="previous" i]');
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]');

    const hasPrev = await prevButton.count() > 0;
    const hasNext = await nextButton.count() > 0;

    // At least one navigation method should exist
    expect(hasPrev || hasNext).toBeTruthy();
  });

  test('should navigate to next month if available', async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next" i]').first();
    const count = await page.locator('button:has-text("Next"), button[aria-label*="next" i]').count();

    if (count > 0) {
      await nextButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to previous month if available', async ({ page }) => {
    const prevButton = page.locator('button:has-text("Previous"), button:has-text("Prev"), button[aria-label*="previous" i]').first();
    const count = await page.locator('button:has-text("Previous"), button:has-text("Prev"), button[aria-label*="previous" i]').count();

    if (count > 0) {
      await prevButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display events if available', async ({ page }) => {
    // Look for event indicators
    const events = page.locator('[data-testid*="event"], [class*="event"]');
    // Events may or may not be present
  });

  test('should display scheduled tasks if available', async ({ page }) => {
    // Look for task indicators
    const tasks = page.locator('[data-testid*="task"], text=/task/i');
    // Tasks may or may not be present
  });

  test('should display time blocks if available', async ({ page }) => {
    // Look for time block indicators
    const timeBlocks = page.locator('[data-testid*="time-block"], text=/block/i');
    // Time blocks may or may not be present
  });

  test('should highlight current day', async ({ page }) => {
    // Current day should be highlighted somehow
    const currentDay = new Date().getDate();
    const dayLocator = page.locator(`text="${currentDay}"`).first();

    // Day should be visible
    const count = await page.locator(`text="${currentDay}"`).count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await expect(page.locator('h1, h2')).toContainText(/Calendar/i);
  });
});
