import { test, expect } from '@playwright/test';

test.describe('CSS Loading Debug', () => {
  test('should check CSS loading and console errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // Navigate to the UI
    await page.goto('http://localhost:4173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if CSS file is loaded
    const stylesheets = await page.$$eval('link[rel="stylesheet"]', links =>
      links.map(link => ({
        href: (link as HTMLLinkElement).href,
        loaded: (link as HTMLLinkElement).sheet !== null
      }))
    );

    console.log('\n=== STYLESHEETS ===');
    stylesheets.forEach(sheet => {
      console.log(`${sheet.href} - Loaded: ${sheet.loaded}`);
    });

    // Check if Tailwind classes are actually applied
    const bodyBgColor = await page.$eval('body', el =>
      window.getComputedStyle(el).backgroundColor
    );
    console.log('\n=== COMPUTED STYLES ===');
    console.log('Body background color:', bodyBgColor);

    // Check a specific element with Tailwind classes
    const dashboardElement = await page.$('[class*="bg-"]');
    if (dashboardElement) {
      const bgColor = await dashboardElement.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      const classes = await dashboardElement.getAttribute('class');
      console.log('Element with bg- class:', classes);
      console.log('Computed background color:', bgColor);
    }

    // Print console errors
    console.log('\n=== CONSOLE ERRORS ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(err));
    } else {
      console.log('No console errors');
    }

    // Print page errors
    console.log('\n=== PAGE ERRORS ===');
    if (pageErrors.length > 0) {
      pageErrors.forEach(err => console.log(err));
    } else {
      console.log('No page errors');
    }

    // Check network requests for CSS
    const cssRequests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.css'))
        .map(entry => ({
          name: entry.name,
          duration: (entry as PerformanceResourceTiming).duration,
          transferSize: (entry as PerformanceResourceTiming).transferSize
        }));
    });

    console.log('\n=== CSS NETWORK REQUESTS ===');
    cssRequests.forEach(req => {
      console.log(`${req.name} - Duration: ${req.duration}ms, Size: ${req.transferSize} bytes`);
    });
  });
});
