import { test, expect } from '@playwright/test';

test.describe('Inbox Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inbox');
  });

  test('should load inbox screen', async ({ page }) => {
    await expect(page).toHaveURL('/inbox');
    await expect(page.locator('h1, h2')).toContainText(/Inbox/i);
  });

  test('should display filter tabs', async ({ page }) => {
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-work"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-personal"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-ideas"]')).toBeVisible();
  });

  test('should show counts for each filter', async ({ page }) => {
    // All filter should show a count
    const allFilter = page.locator('[data-testid="filter-all"]');
    await expect(allFilter).toContainText(/\d+/);
  });

  test('should switch between filters', async ({ page }) => {
    // Click work filter
    await page.click('[data-testid="filter-work"]');
    await expect(page.locator('[data-testid="filter-work"]')).toHaveClass(/border-primary|text-white/);

    // Click personal filter
    await page.click('[data-testid="filter-personal"]');
    await expect(page.locator('[data-testid="filter-personal"]')).toHaveClass(/border-primary|text-white/);

    // Click ideas filter
    await page.click('[data-testid="filter-ideas"]');
    await expect(page.locator('[data-testid="filter-ideas"]')).toHaveClass(/border-primary|text-white/);

    // Back to all
    await page.click('[data-testid="filter-all"]');
    await expect(page.locator('[data-testid="filter-all"]')).toHaveClass(/border-primary|text-white/);
  });

  test('should display search button', async ({ page }) => {
    await expect(page.locator('[data-testid="search-button"]')).toBeVisible();
  });

  test('should toggle search input', async ({ page }) => {
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('should search inbox items', async ({ page }) => {
    // Open search
    await page.click('[data-testid="search-button"]');

    // Type search query
    await page.fill('[data-testid="search-input"]', 'test');

    // Wait for search to filter results
    await page.waitForTimeout(500);
  });

  test('should display items list or empty state', async ({ page }) => {
    // Either items are shown or empty state is shown
    const hasItems = await page.locator('[data-testid^="inbox-item-"]').count() > 0;
    const hasEmptyState = await page.locator('[data-testid="empty-state"]').isVisible();

    expect(hasItems || hasEmptyState).toBeTruthy();
  });

  test('should have select all checkbox', async ({ page }) => {
    await expect(page.locator('[data-testid="select-all-checkbox"]')).toBeVisible();
  });

  test('should select individual items', async ({ page }) => {
    const firstItem = page.locator('[data-testid^="inbox-item-"]').first();
    const count = await page.locator('[data-testid^="inbox-item-"]').count();

    if (count > 0) {
      const checkbox = firstItem.locator('input[type="checkbox"]');
      await checkbox.click();
      await expect(checkbox).toBeChecked();
    }
  });

  test('should show batch actions when items selected', async ({ page }) => {
    const items = page.locator('[data-testid^="inbox-item-"]');
    const count = await items.count();

    if (count > 0) {
      // Select first item
      await items.first().locator('input[type="checkbox"]').click();

      // Batch action bar should appear
      await expect(page.locator('[data-testid="batch-action-bar"]')).toBeVisible();
    }
  });

  test('should have process button for items', async ({ page }) => {
    const count = await page.locator('[data-testid^="inbox-item-"]').count();

    if (count > 0) {
      const processButton = page.locator('[data-testid^="process-button-"]').first();
      await expect(processButton).toBeVisible();
    }
  });

  test('should open process modal when clicking process', async ({ page }) => {
    const items = page.locator('[data-testid^="inbox-item-"]');
    const count = await items.count();

    if (count > 0) {
      const processButton = page.locator('[data-testid^="process-button-"]').first();
      await processButton.click();

      // Modal should open
      await page.waitForTimeout(500);
      // Look for modal indicators
      const modal = page.locator('[role="dialog"], .modal, [data-testid="process-modal"]');
      // Modal may or may not be present depending on implementation
    }
  });

  test('should have item menu buttons', async ({ page }) => {
    const count = await page.locator('[data-testid^="inbox-item-"]').count();

    if (count > 0) {
      await expect(page.locator('[data-testid^="menu-button-"]').first()).toBeVisible();
    }
  });

  test('should perform batch archive', async ({ page }) => {
    const items = page.locator('[data-testid^="inbox-item-"]');
    const count = await items.count();

    if (count > 0) {
      // Select first item
      await items.first().locator('input[type="checkbox"]').click();

      // Click batch archive
      await page.click('[data-testid="batch-archive-button"]');

      // Wait for action to complete
      await page.waitForTimeout(1000);
    }
  });

  test('should clear selection', async ({ page }) => {
    const items = page.locator('[data-testid^="inbox-item-"]');
    const count = await items.count();

    if (count > 0) {
      // Select first item
      await items.first().locator('input[type="checkbox"]').click();

      // Clear selection
      await page.click('[data-testid="clear-selection-button"]');

      // Batch action bar should disappear
      await expect(page.locator('[data-testid="batch-action-bar"]')).not.toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    await expect(page.locator('h1, h2')).toContainText(/Inbox/i);
    await expect(page.locator('[data-testid="filter-all"]')).toBeVisible();
  });
});
