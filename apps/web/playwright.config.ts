import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // postgres is the canonical driver — better-sqlite3 native bindings are
    // unreliable across CI runners. CI uses the postgres service container
    // started in .github/workflows/ci.yml; local dev can override DATABASE_URL.
    command: `AUTH_SECRET=ci-secret-32-bytes-of-padding-xxxx DATABASE_DRIVER=postgres DATABASE_URL=${process.env.DATABASE_URL ?? 'postgres://tide:tide@localhost:5432/tide_test'} STORAGE_DRIVER=local STORAGE_LOCAL_DIR=/tmp/tide-e2e-archive REDIS_URL=${process.env.REDIS_URL ?? 'redis://localhost:6379'} PORT=${PORT} pnpm start`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
