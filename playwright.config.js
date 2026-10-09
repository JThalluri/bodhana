import { defineConfig, devices } from 'playwright/test';

export default defineConfig({
  testDir: './tests/workbench',
  testMatch: '**/*.e2e.spec.js',
  timeout: 40_000,
  expect: { timeout: 8_000 },
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/workbench/playwright-report', open: 'never' }],
  ],
});
