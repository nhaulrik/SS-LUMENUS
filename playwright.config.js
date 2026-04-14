import { defineConfig, devices } from '@playwright/test';

const BROWSER = { ...devices['Desktop Chrome'] };

const SHARED = {
  globalSetup:    './e2e/global-setup.js',
  fullyParallel:  false,
  retries:        0,
  workers:        1,
  timeout:        120_000,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL:           'http://localhost:5173',
    trace:             'on-first-retry',
    actionTimeout:     10_000,
    navigationTimeout: 15_000,
  },
  webServer: [
    {
      command:             'cross-env CHAINS_DIR=server/e2e-data/chains npm run server',
      url:                 'http://localhost:3001/api/health',
      reuseExistingServer: true,
      timeout:             30_000,
    },
    {
      command:             'npm run client',
      url:                 'http://localhost:5173',
      reuseExistingServer: true,
      timeout:             30_000,
    }
  ],
};

export default defineConfig({
  ...SHARED,
  testDir: './e2e',

  projects: [
    // ── Run all HTML flow tests (default) ───────────────────────────────────
    {
      name:      'all',
      testMatch: '**/*.spec.js',
      use:       BROWSER,
    },

    // ── HTML Visual Flow only (npx playwright test --project=html-flow) ─────
    {
      name:      'html-flow',
      testMatch: '**/html-*.spec.js',
      use:       BROWSER,
    },
  ],
});
