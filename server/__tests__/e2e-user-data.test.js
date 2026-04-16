/**
 * End-to-end test using user's actual data
 * Tests the complete flow: upload → create project → generate recipe → apply content
 * Verifies that zones without keys don't cause validation errors
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let testDir;
let app;

// User's data
const USER_DATA = {
  timestamp: '2026-04-16T06:37:20.911Z',
  step: 'html-recipe',
  activeFlow: 'html',
  uploadSession: {
    templateId: '8c7d7468-bb15-471b-9a16-3e146c887571',
    fileName: 'test_slide.html',
    slideCount: 1,
    projectName: 'test_slide',
    selectionCount: 1,
    selections: [
      {
        nodeId: 'div.body>div.left-panel',
        slideIndex: 1,
        ignored: true
      }
    ],
    repeatableSlides: [
      {
        slideIndex: 1,
        key: 'slide_1',
        prompt: 'an instance for each initiative group'
      }
    ],
    hasPreview: true,
    rawHtml: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Core Revenue Management – Feature Catalog</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #e8e8e8; }
  section { width: 1280px; height: 720px; background: #ffffff; }
  .top-bar { position: absolute; top: 0; left: 0; right: 0; height: 7px; background: #FF6359; }
  .header { position: absolute; top: 7px; left: 0; right: 0; height: 96px; background: #2C4A48; }
  .body { position: absolute; top: 103px; left: 0; right: 0; bottom: 36px; display: grid; grid-template-columns: 268px 1fr; }
  .left-panel { background: #F7F7F5; }
  .right-panel { display: flex; flex-direction: column; }
  .footer { position: absolute; bottom: 0; left: 0; right: 0; height: 36px; background: #F7F7F5; }
</style>
</head>
<body>
<section>
  <div class="top-bar"></div>
  <div class="header">
    <div class="header-left">
      <div class="header-label">Feature Catalog &nbsp;&middot;&nbsp; Roadmap Initiative Group</div>
      <div class="header-title" data-zone="initiative_group_title">Core Revenue Management Capabilities</div>
      <div class="header-subtitle" data-zone="initiative_group_subtitle">Solon Tax Product Roadmap 2026 &nbsp;&middot;&nbsp; Executive Steering Committee</div>
    </div>
    <div class="header-right">
      <div class="header-stat">
        <div class="header-stat-value" data-zone="total_hours" data-type="number">23,200</div>
        <div class="header-stat-label">Total Hours</div>
      </div>
      <div class="header-divider"></div>
      <div class="header-stat">
        <div class="header-stat-value" data-zone="initiative_count" data-type="number">6</div>
        <div class="header-stat-label">Initiatives</div>
      </div>
      <div class="header-divider"></div>
      <div class="header-stat">
        <div class="header-stat-value" data-zone="feature_count" data-type="number">38</div>
        <div class="header-stat-label">Features</div>
      </div>
      <div class="logo">Netcompany</div>
    </div>
  </div>

  <div class="body">
    <div class="left-panel">
      <div class="left-section">
        <div class="section-title">Overall Progress</div>
        <div class="section-body">Content here</div>
      </div>
    </div>
    <div class="right-panel">
      <div class="value-box">
        <div class="value-col">
          <div class="value-col-title">Business Value</div>
          <ul class="value-bullets" data-zone="business_value">
            <li>Enables end-to-end taxpayer lifecycle management</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">Solon Tax Product Roadmap 2026 &nbsp;&middot;&nbsp; Confidential &nbsp;&middot;&nbsp; Netcompany</div>
    <div class="footer-right">
      Executive Steering Committee &middot; 29 April 2026
      <div class="page-num">3</div>
    </div>
  </div>
</section>
</body>
</html>`
  },
  project: {
    chainId: 'chain-1ec176eb-3964-4356-aa41-9cf06e195b51',
    projectName: 'test_slide',
    zoneCount: 4,
    zones: [
      {
        zoneType: 'block',
        nodeId: 'div.body>div.left-panel',
        slideIndex: 1,
        type: 'block',
        ignored: true,
        autoGenerate: true,
        isRepeatable: true,
        unique: true,
        elementOrder: 0
      },
      {
        zoneType: 'block',
        key: 'auto_div_header',
        nodeId: 'div.header',
        slideIndex: 1,
        type: 'block',
        autoGenerate: true,
        isRepeatable: true,
        unique: true,
        ignored: false,
        elementOrder: 1
      },
      {
        zoneType: 'block',
        key: 'auto_div_body',
        nodeId: 'div.body',
        slideIndex: 1,
        type: 'block',
        autoGenerate: true,
        isRepeatable: true,
        unique: true,
        ignored: false,
        elementOrder: 2
      },
      {
        zoneType: 'block',
        key: 'auto_div_footer',
        nodeId: 'div.footer',
        slideIndex: 1,
        type: 'block',
        autoGenerate: true,
        isRepeatable: true,
        unique: true,
        ignored: false,
        elementOrder: 3
      }
    ],
    repeatableSlides: [
      {
        slideIndex: 1,
        key: 'slide_1',
        prompt: 'an instance for each initiative group'
      }
    ]
  }
};

// Setup / teardown
beforeAll(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solon-e2e-test-'));
  const chainsDir = path.join(testDir, 'chains');
  const tempDir = path.join(testDir, 'temp');
  const outputDir = path.join(testDir, 'output');
  const patchesDir = path.join(testDir, 'patches');
  for (const d of [chainsDir, tempDir, outputDir, patchesDir]) {
    fs.mkdirSync(d, { recursive: true });
  }

  process.env.NODE_ENV = 'test';
  process.env.CHAINS_DIR = chainsDir;

  const mod = await import('../index.js');
  app = mod.app;
});

afterAll(() => {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

describe('E2E Test with User Data', () => {
  it('completes full workflow: upload → create project → generate recipe → apply content', async () => {
    // Step 1: Upload template
    const uploadRes = await request(app)
      .post('/api/html-flow/upload-template')
      .send({
        html: USER_DATA.uploadSession.rawHtml,
        fileName: USER_DATA.uploadSession.fileName
      });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.ok).toBe(true);
    expect(uploadRes.body.templateId).toBeDefined();
    const templateId = uploadRes.body.templateId;

    // Step 2: Create project with selections
    const createRes = await request(app)
      .post('/api/html-flow/create-project')
      .send({
        templateId,
        selections: USER_DATA.project.zones.map(z => ({
          nodeId: z.nodeId,
          slideIndex: z.slideIndex,
          ignored: z.ignored,
          ...(z.key && { key: z.key })
        })),
        projectName: USER_DATA.project.projectName,
        repeatableSlides: USER_DATA.project.repeatableSlides
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.ok).toBe(true);
    expect(createRes.body.chainId).toBeDefined();
    const chainId = createRes.body.chainId;

    // Verify zones were created correctly
    expect(createRes.body.zones).toBeDefined();
    const zonesWithKeys = createRes.body.zones.filter(z => z.key);
    expect(zonesWithKeys.length).toBeGreaterThan(0);

    // Step 3: Generate recipe
    const recipeRes = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({ chainId });

    expect(recipeRes.status).toBe(200);
    expect(recipeRes.body.recipe).toBeDefined();
    const recipe = recipeRes.body.recipe;

    // Verify recipe mentions repeatable slides
    expect(recipe).toContain('slide_1');
    expect(recipe).toContain('instances');

    // Step 4: Create valid JSON response with 2 instances
    const jsonResponse = {
      slides: {
        slide_1: {
          instances: [
            {
              auto_div_header: '<div class="header-left"><div class="header-label">Feature Catalog</div><div class="header-title">Initiative Group 1</div><div class="header-subtitle">Danish Version 2026</div></div><div class="header-right"><div class="header-stat"><div class="header-stat-value">25,000</div><div class="header-stat-label">Total Hours</div></div><div class="header-divider"></div><div class="header-stat"><div class="header-stat-value">7</div><div class="header-stat-label">Initiatives</div></div><div class="header-divider"></div><div class="header-stat"><div class="header-stat-value">40</div><div class="header-stat-label">Features</div></div><div class="logo">Netcompany</div></div>',
              auto_div_body: '<div class="left-panel"><div class="left-section"><div class="section-title">Progress</div><div class="section-body">20% Done</div></div></div><div class="right-panel"><div class="value-box"><div class="value-col"><div class="value-col-title">Business Value</div><ul class="value-bullets"><li>Value 1</li></ul></div></div></div>',
              auto_div_footer: '<div class="footer-left">Danish Roadmap 2026</div><div class="footer-right">Executive Committee<div class="page-num">3</div></div>'
            },
            {
              auto_div_header: '<div class="header-left"><div class="header-label">Feature Catalog</div><div class="header-title">Initiative Group 2</div><div class="header-subtitle">Danish Version 2026</div></div><div class="header-right"><div class="header-stat"><div class="header-stat-value">20,000</div><div class="header-stat-label">Total Hours</div></div><div class="header-divider"></div><div class="header-stat"><div class="header-stat-value">5</div><div class="header-stat-label">Initiatives</div></div><div class="header-divider"></div><div class="header-stat"><div class="header-stat-value">35</div><div class="header-stat-label">Features</div></div><div class="logo">Netcompany</div></div>',
              auto_div_body: '<div class="left-panel"><div class="left-section"><div class="section-title">Progress</div><div class="section-body">25% Done</div></div></div><div class="right-panel"><div class="value-box"><div class="value-col"><div class="value-col-title">Business Value</div><ul class="value-bullets"><li>Value 2</li></ul></div></div></div>',
              auto_div_footer: '<div class="footer-left">Danish Roadmap 2026</div><div class="footer-right">Executive Committee<div class="page-num">4</div></div>'
            }
          ]
        }
      }
    };

    // Step 5: Validate JSON
    const validateRes = await request(app)
      .post('/api/html-flow/validate-json')
      .send({
        chainId,
        jsonString: JSON.stringify(jsonResponse)
      });

    expect(validateRes.status).toBe(200);
    expect(validateRes.body.valid).toBe(true);
    expect(validateRes.body.instanceCount).toBe(2);

    // Step 6: Apply content - THIS IS THE KEY TEST
    // This should NOT fail with "undefined" errors for the ignored zone
    const applyRes = await request(app)
      .post('/api/html-flow/apply-content')
      .send({
        chainId,
        jsonString: JSON.stringify(jsonResponse)
      });

    // The critical assertion: should succeed without "undefined" errors
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.ok).toBe(true);
    expect(applyRes.body.outputFile).toBeDefined();
    expect(applyRes.body.slideCount).toBe(2); // 2 instances = 2 slides

    // Verify the output file was created
    const chainsDir = process.env.CHAINS_DIR;
    const outputPath = path.join(chainsDir, chainId, applyRes.body.outputFile);
    expect(fs.existsSync(outputPath)).toBe(true);

    // Verify the output HTML is valid
    const outputHtml = fs.readFileSync(outputPath, 'utf8');
    expect(outputHtml).toContain('Initiative Group 1');
    expect(outputHtml).toContain('Initiative Group 2');
    expect(outputHtml).toContain('Danish Roadmap 2026');

    console.log('✅ E2E test passed! The fix correctly handles zones without keys.');
  });

  it('does not produce "undefined" in error messages when zones lack keys', async () => {
    // Upload template
    const uploadRes = await request(app)
      .post('/api/html-flow/upload-template')
      .send({
        html: USER_DATA.uploadSession.rawHtml,
        fileName: 'test_slide_2.html'
      });

    const templateId = uploadRes.body.templateId;

    // Create project
    const createRes = await request(app)
      .post('/api/html-flow/create-project')
      .send({
        templateId,
        selections: USER_DATA.project.zones.map(z => ({
          nodeId: z.nodeId,
          slideIndex: z.slideIndex,
          ignored: z.ignored,
          ...(z.key && { key: z.key })
        })),
        projectName: 'test_slide_2',
        repeatableSlides: USER_DATA.project.repeatableSlides
      });

    const chainId = createRes.body.chainId;

    // Try to apply with incomplete JSON (missing a required key)
    const incompleteJson = {
      slides: {
        slide_1: {
          instances: [
            {
              auto_div_header: '<div>Partial</div>',
              // Missing auto_div_body and auto_div_footer
            }
          ]
        }
      }
    };

    const validateRes = await request(app)
      .post('/api/html-flow/validate-json')
      .send({
        chainId,
        jsonString: JSON.stringify(incompleteJson)
      });

    // Should fail validation, but error should NOT contain "undefined"
    expect(validateRes.status).toBe(200);
    expect(validateRes.body.valid).toBe(false);
    expect(validateRes.body.missingFields).toBeDefined();

    const errorStr = JSON.stringify(validateRes.body.missingFields);
    expect(errorStr).not.toContain('[undefined]');
    expect(errorStr).not.toContain('.undefined');

    console.log('✅ Validation error messages are clean (no "undefined" values)');
  });
});
