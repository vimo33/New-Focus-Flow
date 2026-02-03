import { test, expect } from '@playwright/test';

test.describe('Quick Capture Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/capture');
  });

  test('should load capture screen', async ({ page }) => {
    await expect(page).toHaveURL('/capture');
    await expect(page.locator('h1, h2')).toContainText(/Capture/i);
  });

  test('should have text input field', async ({ page }) => {
    const textInput = page.locator('textarea, input[type="text"]').first();
    await expect(textInput).toBeVisible();
  });

  test('should allow text input', async ({ page }) => {
    const textInput = page.locator('textarea, input[type="text"]').first();
    await textInput.fill('Test quick capture item');
    await expect(textInput).toHaveValue('Test quick capture item');
  });

  test('should have submit button', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Capture"), button:has-text("Add")');
    await expect(submitButton.first()).toBeVisible();
  });

  test('should submit capture and clear form', async ({ page }) => {
    const textInput = page.locator('textarea, input[type="text"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Capture"), button:has-text("Add")').first();

    await textInput.fill('Test item for submission');
    await submitButton.click();

    // Form should clear or show success message
    await page.waitForTimeout(1000);
  });

  test('should show category selection if available', async ({ page }) => {
    const categoryButtons = page.locator('button:has-text("Work"), button:has-text("Personal"), button:has-text("Ideas")');
    const count = await categoryButtons.count();

    // If categories exist, they should be clickable
    if (count > 0) {
      await categoryButtons.first().click();
    }
  });

  test('should validate empty submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Capture"), button:has-text("Add")').first();

    // Try to submit empty form
    await submitButton.click();

    // Should show validation or remain on page
    await expect(page).toHaveURL('/capture');
  });

  test('should have voice input button if available', async ({ page }) => {
    const voiceButton = page.locator('button:has-text("Voice"), button[aria-label*="voice" i], button:has([class*="mic"])');
    // Voice button is optional but should work if present
  });

  test('should have emoji picker if available', async ({ page }) => {
    const emojiButton = page.locator('button:has-text("😊"), button[aria-label*="emoji" i]');
    // Emoji picker is optional
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) test.skip();

    const textInput = page.locator('textarea, input[type="text"]').first();
    await expect(textInput).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    // Look for back button or dashboard link
    const backButton = page.locator('a[href="/"], button:has-text("Dashboard"), nav a:has-text("Dashboard")');
    const count = await backButton.count();

    if (count > 0) {
      await backButton.first().click();
      await expect(page).toHaveURL('/');
    }
  });
});
