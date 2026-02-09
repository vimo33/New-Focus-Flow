import { test, expect } from '@playwright/test';

test.describe('UI Rendering Check', () => {
  test('should load UI and take screenshot', async ({ page }) => {
    // Navigate to the UI
    await page.goto('http://localhost:4173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take a full page screenshot
    await page.screenshot({
      path: 'test-results/ui-render-full.png',
      fullPage: true
    });

    // Get the page title
    const title = await page.title();
    console.log('Page title:', title);

    // Get the page content
    const bodyText = await page.locator('body').textContent();
    console.log('Body text (first 500 chars):', bodyText?.substring(0, 500));

    // Check for common elements
    const html = await page.content();
    console.log('HTML length:', html.length);

    // Check if React root exists
    const rootDiv = page.locator('#root');
    const rootExists = await rootDiv.count() > 0;
    console.log('Root div exists:', rootExists);

    if (rootExists) {
      const rootContent = await rootDiv.textContent();
      console.log('Root content (first 500 chars):', rootContent?.substring(0, 500));
    }

    // Check for errors in console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Check for JavaScript errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
    });
  });
});
