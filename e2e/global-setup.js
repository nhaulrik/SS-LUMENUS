/**
 * Playwright global setup — runs once before the test suite.
 *
 * Clears e2e-data directories so each test run starts from a clean slate.
 * Without this, patches / chains saved during one run contaminate the next.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PATCHES_DIR = path.resolve(__dirname, '../server/e2e-data/patches');
const CHAINS_DIR  = path.resolve(__dirname, '../server/e2e-data/chains');
const OUTPUT_DIR  = path.resolve(__dirname, '../server/e2e-data/output');

export default async function globalSetup(config) {
  // Clear saved patches (*.json files)
  if (fs.existsSync(PATCHES_DIR)) {
    for (const file of fs.readdirSync(PATCHES_DIR)) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(PATCHES_DIR, file));
      }
    }
  }

  // Clear entire chains directory (each chain is a sub-directory)
  if (fs.existsSync(CHAINS_DIR)) {
    for (const entry of fs.readdirSync(CHAINS_DIR)) {
      fs.rmSync(path.join(CHAINS_DIR, entry), { recursive: true, force: true });
    }
  }

  // Clear generated output files so the directory doesn't grow unboundedly
  if (fs.existsSync(OUTPUT_DIR)) {
    for (const file of fs.readdirSync(OUTPUT_DIR)) {
      if (file.endsWith('.pptx')) {
        fs.unlinkSync(path.join(OUTPUT_DIR, file));
      }
    }
  }
}
