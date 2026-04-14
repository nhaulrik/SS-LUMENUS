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
      command:             'cross-env PATCHES_DIR=server/e2e-data/patches CHAINS_DIR=server/e2e-data/chains TEMP_DIR=server/e2e-data/temp OUTPUT_DIR=server/e2e-data/output npm run server',
      url:                 'http://localhost:3001/api/patches',
      reuseExistingServer: true,
      timeout:             15_000,
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
    // ── Run everything (default: npx playwright test) ───────────────────────
    {
      name:      'all',
      testMatch: '**/*.spec.js',
      use:       BROWSER,
    },

    // ── HTML Visual Flow only (npx playwright test --project=html-flow) ─────
    // Matches any spec file prefixed with "html-"
    {
      name:      'html-flow',
      testMatch: '**/html-*.spec.js',
      use:       BROWSER,
    },

    // ── PPTX Native Flow only (npx playwright test --project=pptx-flow) ─────
    // Matches all spec files NOT prefixed with "html-"
    {
      name:      'pptx-flow',
      testMatch: /e2e\/(?!html-).*\.spec\.js$/,
      use:       BROWSER,
    },
  ],
});
