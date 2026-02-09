import { test } from '@playwright/test';

test.describe('Final UI Render Check', () => {
  test('should render properly with styling', async ({ page }) => {
    await page.goto('http://localhost:4173');
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({
      path: 'ui-final-render.png',
      fullPage: true
    });

    // Check background colors
    const bodyBg = await page.$eval('body', el =>
      window.getComputedStyle(el).backgroundColor
    );

    const mainContainer = await page.$('.min-h-screen');
    const mainBg = mainContainer ? await mainContainer.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    ) : 'not found';

    console.log('Body background:', bodyBg);
    console.log('Main container background:', mainBg);
    console.log('Screenshot saved to: ui-final-render.png');
  });
});
