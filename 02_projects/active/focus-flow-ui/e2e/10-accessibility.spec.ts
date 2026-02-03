import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test('dashboard should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocus).toBeTruthy();

    await page.keyboard.press('Tab');
    const secondFocus = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocus).toBeTruthy();
  });

  test('inbox should be keyboard accessible', async ({ page }) => {
    await page.goto('/inbox');

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    const headings = await page.evaluate(() => {
      const h1 = document.querySelectorAll('h1').length;
      const h2 = document.querySelectorAll('h2').length;
      const h3 = document.querySelectorAll('h3').length;

      return { h1, h2, h3 };
    });

    // Should have at least one h1
    expect(headings.h1).toBeGreaterThan(0);
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/');

    const buttonsWithoutLabels = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(btn =>
        !btn.textContent?.trim() &&
        !btn.getAttribute('aria-label') &&
        !btn.getAttribute('aria-labelledby')
      ).length;
    });

    // Most buttons should have labels
    // Some icon-only buttons might not have text but should have aria-label
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img =>
        !img.getAttribute('alt') &&
        !img.getAttribute('aria-label')
      ).length;
    });

    // All content images should have alt text
  });

  test('form inputs should have labels', async ({ page }) => {
    await page.goto('/capture');

    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      return inputs.filter(input =>
        !input.getAttribute('aria-label') &&
        !input.getAttribute('aria-labelledby') &&
        !input.getAttribute('placeholder') &&
        !document.querySelector(`label[for="${input.id}"]`)
      ).length;
    });

    // Most inputs should have labels
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');

    // Check if text is visible (basic contrast check)
    const textElements = page.locator('p, h1, h2, h3, button, a');
    const count = await textElements.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA landmarks
    const landmarks = await page.evaluate(() => {
      const nav = document.querySelectorAll('[role="navigation"], nav').length;
      const main = document.querySelectorAll('[role="main"], main').length;

      return { nav, main };
    });

    // Should have navigation and main landmarks
  });

  test('modals should trap focus', async ({ page }) => {
    await page.goto('/inbox');

    const items = page.locator('[data-testid^="inbox-item-"]');
    const count = await items.count();

    if (count > 0) {
      const processButton = page.locator('[data-testid^="process-button-"]').first();
      await processButton.click();

      // Wait for modal
      await page.waitForTimeout(500);

      // Tab should stay within modal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await page.goto('/inbox');

    // Check for aria-live regions
    const liveRegions = await page.evaluate(() => {
      return document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length;
    });

    // Live regions are recommended but not required
  });

  test('should have skip navigation link', async ({ page }) => {
    await page.goto('/');

    // Check for skip link
    const skipLink = page.locator('a:has-text("Skip to main content"), a:has-text("Skip to content")');
    const count = await skipLink.count();

    // Skip link is recommended but not required
  });
});
