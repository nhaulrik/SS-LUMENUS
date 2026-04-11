import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // tests within a file run sequentially (state depends on order)
  retries: 0,
  workers: 1,             // one worker — specs share the running dev servers
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

  // Uses the npm scripts already defined in package.json.
  // `url` tells Playwright what to poll — it waits until the server responds
  // before handing control to any test.
  // `reuseExistingServer: true` means if you already ran `npm start`,
  // Playwright reuses those processes instead of starting new ones.
  webServer: [
    {
      // Isolated data dirs — prevents saved patches from real usage contaminating tests.
      // Each test run gets a clean slate; dirs are auto-created by the server on startup.
      command: 'cross-env PATCHES_DIR=server/e2e-data/patches CHAINS_DIR=server/e2e-data/chains TEMP_DIR=server/e2e-data/temp OUTPUT_DIR=server/e2e-data/output npm run server',
      url: 'http://localhost:3001/api/patches',
      reuseExistingServer: false,
      timeout: 15_000
    },
    {
      command: 'npm run client',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000
    }
  ]
});
