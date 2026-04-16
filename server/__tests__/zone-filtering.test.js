/**
 * Tests for zone filtering in apply-content endpoint.
 * 
 * Issue: When zones array includes zones without a 'key' property (e.g. ignored zones),
 * the validation fails with "Invalid JSON slide_1[undefined]" because it tries to check
 * z.key which is undefined.
 * 
 * Fix: Filter zones to only include those with a 'key' property before validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs      from 'fs';
import path    from 'path';
import os      from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let testDir;
let app;

// HTML template with repeatable slides
const REPEATABLE_HTML = `<!DOCTYPE html>
<html><head></head><body>
<section>
  <div class="header" data-block="auto_div_header">Header content</div>
  <div class="body" data-block="auto_div_body">Body content</div>
  <div class="footer" data-block="auto_div_footer">Footer content</div>
</section>
</body></html>`;

// Helper: upload template
async function uploadTemplate(html, fileName = 'test.html') {
  const res = await request(app)
    .post('/api/html-flow/upload-template')
    .send({ html, fileName });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  return res.body; // { templateId, slideCount, trees, selections, previewHtml }
}

// Helper: create a project
async function createProject(html, projectName = 'test-project', extraSelections = null) {
  const { templateId, selections: autoSelections } = await uploadTemplate(html);
  const selections = extraSelections ?? autoSelections;
  const res = await request(app)
    .post('/api/html-flow/create-project')
    .send({ templateId, selections, projectName });
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
  return res.body; // { chainId, zones, selections, projectName, templatePath }
}

// Setup / teardown
beforeAll(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solon-zone-filter-test-'));
  const chainsDir  = path.join(testDir, 'chains');
  const tempDir    = path.join(testDir, 'temp');
  const outputDir  = path.join(testDir, 'output');
  const patchesDir = path.join(testDir, 'patches');
  for (const d of [chainsDir, tempDir, outputDir, patchesDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  process.env.NODE_ENV   = 'test';
  process.env.CHAINS_DIR = chainsDir;

  const mod = await import('../index.js');
  app = mod.app;
});

afterAll(() => {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests for zone filtering
// ─────────────────────────────────────────────────────────────────────────────

describe('Zone filtering in apply-content', () => {
  it('ignores zones without a key property during validation', async () => {
    const { chainId } = await createProject(REPEATABLE_HTML);
    
    // Read chain.json and manually inject a zone without a key
    const chainPath = path.join(process.env.CHAINS_DIR, chainId, 'chain.json');
    const chain = JSON.parse(fs.readFileSync(chainPath, 'utf8'));
    
    // Add a zone without a 'key' property (simulating an ignored zone)
    chain.zones.push({
      nodeId: 'div.ignored',
      slideIndex: 1,
      type: 'block',
      ignored: true,
      // NOTE: no 'key' property
    });
    
    fs.writeFileSync(chainPath, JSON.stringify(chain, null, 2), 'utf8');
    
    // Now apply content with valid JSON for the zones that have keys
    // Get the actual zone keys from the chain before injecting the bad zone
    const zoneKeys = chain.zones.filter(z => z.key).map(z => z.key);
    const dataObj = { blocks: {} };
    zoneKeys.forEach(key => {
      dataObj.blocks[key] = `<div>${key} content</div>`;
    });
    
    const json = JSON.stringify(dataObj);
    
    const res = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    
    // Should succeed despite the zone without a key
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.outputFile).toMatch(/\.html$/);
  });

  it('does not fail with "undefined" in validation error when zones lack keys', async () => {
    const { chainId } = await createProject(REPEATABLE_HTML);
    
    // Read chain.json and add a zone without a key
    const chainPath = path.join(process.env.CHAINS_DIR, chainId, 'chain.json');
    const chain = JSON.parse(fs.readFileSync(chainPath, 'utf8'));
    chain.zones.push({
      nodeId: 'div.ignored-panel',
      slideIndex: 1,
      type: 'block',
      ignored: true,
      // no 'key' property
    });
    fs.writeFileSync(chainPath, JSON.stringify(chain, null, 2), 'utf8');
    
    // Apply with incomplete JSON (missing a required zone)
    const zoneKeys = chain.zones.filter(z => z.key).map(z => z.key);
    const dataObj = { blocks: {} };
    // Only provide one zone value, missing the rest
    if (zoneKeys.length > 0) {
      dataObj.blocks[zoneKeys[0]] = '<div>Partial</div>';
    }
    
    const json = JSON.stringify(dataObj);
    
    const res = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    
    // Should fail validation, but not with "undefined" in the error
    expect(res.status).toBe(422);
    expect(res.body.missingFields).toBeDefined();
    // The error should NOT mention "undefined" as a zone key
    const errorStr = JSON.stringify(res.body.missingFields || []);
    expect(errorStr).not.toContain('[undefined]');
  });

  it('correctly filters zones and applies content successfully', async () => {
    const { chainId } = await createProject(REPEATABLE_HTML);
    
    // Read chain to get the actual zones
    const chainPath = path.join(process.env.CHAINS_DIR, chainId, 'chain.json');
    const chain = JSON.parse(fs.readFileSync(chainPath, 'utf8'));
    
    // Add a zone without a key to simulate the bug scenario
    chain.zones.push({
      nodeId: 'div.ignored',
      slideIndex: 1,
      type: 'block',
      ignored: true,
      // NOTE: no 'key' property — this is the bug we're testing
    });
    fs.writeFileSync(chainPath, JSON.stringify(chain, null, 2), 'utf8');
    
    // Apply content with valid JSON
    const zoneKeys = chain.zones.filter(z => z.key).map(z => z.key);
    const dataObj = { blocks: {} };
    zoneKeys.forEach(key => {
      dataObj.blocks[key] = `<div>${key} content</div>`;
    });
    
    const json = JSON.stringify(dataObj);
    
    const res = await request(app)
      .post('/api/html-flow/apply-content')
      .send({ chainId, jsonString: json });
    
    // Should succeed — the zone without a key should be filtered out
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.outputFile).toMatch(/\.html$/);
  });
});
