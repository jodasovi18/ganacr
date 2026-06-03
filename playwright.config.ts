import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './tests/e2e/global-setup.ts',
  webServer: {
    command: 'npx vite --mode test --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: { baseURL: 'http://localhost:5174', screenshot: 'only-on-failure', video: 'off', headless: true },
  outputDir: 'tests/e2e/.artifacts',
  projects: [
    { name: 'desktop', testIgnore: /responsive\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: /responsive\.spec\.ts/, use: { ...devices['Pixel 5'] } },
  ],
});
