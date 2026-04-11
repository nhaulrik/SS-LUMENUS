import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: [
    {
      command: 'cross-env PATCHES_DIR=server/e2e-data/patches CHAINS_DIR=server/e2e-data/chains TEMP_DIR=server/e2e-data/temp OUTPUT_DIR=server/e2e-data/output npm run server',
      url: 'http://localhost:3001/api/patches',
      reuseExistingServer: false,
      timeout: 15_000
    },
    {
      command: 'npm run client',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 30_000
    }
  ]
});