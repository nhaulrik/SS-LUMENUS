/**
 * Playwright global setup — runs once before the test suite.
 *
 * Clears the e2e-data/patches directory so each test run starts from a
 * clean slate. Without this, patches saved during one run contaminate the
 * next (e.g. a persistence test from run N loads stale tags from run N-1).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PATCHES_DIR = path.resolve(__dirname, '../server/e2e-data/patches');

export default async function globalSetup(config) {
  if (fs.existsSync(PATCHES_DIR)) {
    for (const file of fs.readdirSync(PATCHES_DIR)) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(PATCHES_DIR, file));
      }
    }
  }
}
