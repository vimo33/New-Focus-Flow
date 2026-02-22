# Playwright tests

Install:
- pnpm add -D @playwright/test
- npx playwright install

Run:
- pnpm playwright test
- pnpm playwright test --ui

Visual baselines:
- First run: set `UPDATE_SNAPSHOTS=1` to generate snapshots.
- Use masking for dynamic content.
