/**
 * Playwright global setup — runs once before the test suite.
 *
 * Clears the e2e-data/chains directory so each test run starts from a clean
 * slate. Without this, HTML projects saved during one run contaminate the next.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const CHAINS_DIR = path.resolve(__dirname, '../server/e2e-data/chains');

export default async function globalSetup() {
  // Clear entire chains directory (each HTML project is a sub-directory)
  if (fs.existsSync(CHAINS_DIR)) {
    for (const entry of fs.readdirSync(CHAINS_DIR)) {
      fs.rmSync(path.join(CHAINS_DIR, entry), { recursive: true, force: true });
    }
  }
}
