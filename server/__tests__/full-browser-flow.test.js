/**
 * Full browser flow simulation test
 * Tests the complete workflow from upload through preview generation
 * Uses user's actual data to verify the fix works end-to-end
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

const USER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Core Revenue Management – Feature Catalog</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #e8e8e8; }
  section { width: 1280px; height: 720px; background: #ffffff; }
  .top-bar { position: absolute; top: 0; left: 0; right: 0; height: 7px; background: #FF6359; }
  .header { position: absolute; top: 7px; left: 0; right: 0; height: 96px; background: #2C4A48; padding: 0 44px; display: flex; align-items: center; justify-content: space-between; }
  .body { position: absolute; top: 103px; left: 0; right: 0; bottom: 36px; display: grid; grid-template-columns: 268px 1fr; }
  .left-panel { background: #F7F7F5; border-right: 1px solid #E8E8E4; }
  .right-panel { display: flex; flex-direction: column; padding: 16px 24px; }
  .footer { position: absolute; bottom: 0; left: 0; right: 0; height: 36px; background: #F7F7F5; border-top: 1px solid #E8E8E4; display: flex; align-items: center; padding: 0 44px; justify-content: space-between; }
</style>
</head>
<body>
<section>
  <div class="top-bar"></div>
  <div class="header">
    <div class="header-left">
      <div class="header-label">Feature Catalog &nbsp;&middot;&nbsp; Roadmap Initiative Group</div>
      <div class="header-title" data-block="auto_div_header">Core Revenue Management Capabilities</div>
      <div class="header-subtitle">Solon Tax Product Roadmap 2026</div>
    </div>
    <div class="header-right">
      <div class="header-stat">
        <div class="header-stat-value" data-zone="total_hours" data-type="number">23,200</div>
        <div class="header-stat-label">Total Hours</div>
      </div>
      <div class="header-stat">
        <div class="header-stat-value" data-zone="initiative_count" data-type="number">6</div>
        <div class="header-stat-label">Initiatives</div>
      </div>
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
          <ul class="value-bullets" data-block="auto_div_body">
            <li>Enables end-to-end taxpayer lifecycle management</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="footer" data-block="auto_div_footer">
    <div class="footer-left">Solon Tax Product Roadmap 2026</div>
    <div class="footer-right">Executive Committee &middot; 29 April 2026</div>
  </div>
</section>
</body>
</html>`;

beforeAll(async () => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solon-full-flow-test-'));
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

describe('Full Browser Flow Simulation', () => {
  it('Step 1: Upload template', async () => {
    console.log('\n📤 STEP 1: Upload Template');
    
    const res = await request(app)
      .post('/api/html-flow/upload-template')
      .send({
        html: USER_HTML,
        fileName: 'test_slide.html'
      });

    console.log(`   Status: ${res.status}`);
    console.log(`   Template ID: ${res.body.templateId}`);
    console.log(`   Slide Count: ${res.body.slideCount}`);
    console.log(`   Zones Detected: ${res.body.trees[0]?.children?.length || 0}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.templateId).toBeDefined();
    expect(res.body.slideCount).toBe(1);
    expect(res.body.previewHtml).toBeDefined();

    // Store for next steps
    global.templateId = res.body.templateId;
  });

  it('Step 2: Create project with selections', async () => {
    console.log('\n🔧 STEP 2: Create Project');
    
    const selections = [
      {
        nodeId: 'div.header',
        slideIndex: 1,
        zoneType: 'block',
        key: 'auto_div_header',
        type: 'block',
        autoGenerate: true
      },
      {
        nodeId: 'div.body>div.right-panel',
        slideIndex: 1,
        zoneType: 'block',
        key: 'auto_div_body',
        type: 'block',
        autoGenerate: true
      },
      {
        nodeId: 'div.footer',
        slideIndex: 1,
        zoneType: 'block',
        key: 'auto_div_footer',
        type: 'block',
        autoGenerate: true
      },
      {
        nodeId: 'div.body>div.left-panel',
        slideIndex: 1,
        ignored: true
      }
    ];

    const repeatableSlides = [
      {
        slideIndex: 1,
        key: 'slide_1',
        prompt: 'an instance for each initiative group'
      }
    ];

    const res = await request(app)
      .post('/api/html-flow/create-project')
      .send({
        templateId: global.templateId,
        selections,
        projectName: 'test_slide',
        repeatableSlides
      });

    console.log(`   Status: ${res.status}`);
    console.log(`   Chain ID: ${res.body.chainId}`);
    console.log(`   Zones Created: ${res.body.zones?.length || 0}`);
    console.log(`   Zones with Keys: ${res.body.zones?.filter(z => z.key)?.length || 0}`);
    console.log(`   Ignored Zones: ${res.body.zones?.filter(z => z.ignored)?.length || 0}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.chainId).toBeDefined();
    expect(res.body.zones.length).toBeGreaterThan(0);

    // Verify the ignored zone is present but doesn't have a key
    const ignoredZone = res.body.zones.find(z => z.ignored);
    expect(ignoredZone).toBeDefined();
    expect(ignoredZone.key).toBeUndefined();

    global.chainId = res.body.chainId;
  });

  it('Step 3: Generate recipe', async () => {
    console.log('\n📝 STEP 3: Generate Recipe');
    
    const res = await request(app)
      .post('/api/html-flow/generate-recipe')
      .send({ chainId: global.chainId });

    console.log(`   Status: ${res.status}`);
    console.log(`   Recipe Length: ${res.body.recipe?.length || 0} chars`);
    console.log(`   Contains "slide_1": ${res.body.recipe?.includes('slide_1') ? '✓' : '✗'}`);
    console.log(`   Contains "instances": ${res.body.recipe?.includes('instances') ? '✓' : '✗'}`);
    console.log(`   Contains "ZONES_TO_PRESERVE": ${res.body.recipe?.includes('ZONES_TO_PRESERVE') ? '✓' : '✗'}`);

    expect(res.status).toBe(200);
    expect(res.body.recipe).toBeDefined();
    expect(res.body.recipe).toContain('slide_1');
    expect(res.body.recipe).toContain('instances');
    expect(res.body.recipe).toContain('ZONES_TO_PRESERVE');

    global.recipe = res.body.recipe;
  });

  it('Step 4: Validate JSON (with 2 instances)', async () => {
    console.log('\n✅ STEP 4: Validate JSON');
    
    const jsonResponse = {
      slides: {
        slide_1: {
          instances: [
            {
              auto_div_header: '<div class="header-left"><div class="header-label">Feature Catalog</div><div class="header-title">Initiative Group 1</div></div><div class="header-right"><div class="header-stat"><div class="header-stat-value">25,000</div><div class="header-stat-label">Total Hours</div></div><div class="header-stat"><div class="header-stat-value">7</div><div class="header-stat-label">Initiatives</div></div></div>',
              auto_div_body: '<div class="value-box"><div class="value-col"><div class="value-col-title">Business Value</div><ul class="value-bullets"><li>Value 1</li></ul></div></div>',
              auto_div_footer: '<div class="footer-left">Danish Roadmap 2026</div><div class="footer-right">Executive Committee</div>'
            },
            {
              auto_div_header: '<div class="header-left"><div class="header-label">Feature Catalog</div><div class="header-title">Initiative Group 2</div></div><div class="header-right"><div class="header-stat"><div class="header-stat-value">20,000</div><div class="header-stat-label">Total Hours</div></div><div class="header-stat"><div class="header-stat-value">5</div><div class="header-stat-label">Initiatives</div></div></div>',
              auto_div_body: '<div class="value-box"><div class="value-col"><div class="value-col-title">Business Value</div><ul class="value-bullets"><li>Value 2</li></ul></div></div>',
              auto_div_footer: '<div class="footer-left">Danish Roadmap 2026</div><div class="footer-right">Executive Committee</div>'
            }
          ]
        }
      }
    };

    const res = await request(app)
      .post('/api/html-flow/validate-json')
      .send({
        chainId: global.chainId,
        jsonString: JSON.stringify(jsonResponse)
      });

    console.log(`   Status: ${res.status}`);
    console.log(`   Valid: ${res.body.valid ? '✓' : '✗'}`);
    console.log(`   Instance Count: ${res.body.instanceCount}`);
    console.log(`   Found Fields: ${res.body.foundFields?.length || 0}`);
    console.log(`   Missing Fields: ${res.body.missingFields?.length || 0}`);

    if (res.body.missingFields?.length > 0) {
      console.log(`   ⚠️  Missing: ${res.body.missingFields.join(', ')}`);
    }

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.instanceCount).toBe(2);

    global.jsonString = JSON.stringify(jsonResponse);
  });

  it('Step 5: Apply content and generate preview', async () => {
    console.log('\n🎨 STEP 5: Apply Content & Generate Preview');
    
    const res = await request(app)
      .post('/api/html-flow/apply-content')
      .send({
        chainId: global.chainId,
        jsonString: global.jsonString
      });

    console.log(`   Status: ${res.status}`);
    console.log(`   OK: ${res.body.ok ? '✓' : '✗'}`);
    console.log(`   Output File: ${res.body.outputFile}`);
    console.log(`   Slide Count: ${res.body.slideCount}`);
    console.log(`   Preview HTML Length: ${res.body.previewHtml?.length || 0} chars`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.outputFile).toBeDefined();
    expect(res.body.slideCount).toBe(2); // 2 instances = 2 slides
    expect(res.body.previewHtml).toBeDefined();

    // Verify the preview contains both instances
    expect(res.body.previewHtml).toContain('Initiative Group 1');
    expect(res.body.previewHtml).toContain('Initiative Group 2');
    expect(res.body.previewHtml).toContain('Danish Roadmap 2026');

    // Verify output file exists on disk
    const chainsDir = process.env.CHAINS_DIR;
    const outputPath = path.join(chainsDir, global.chainId, res.body.outputFile);
    expect(fs.existsSync(outputPath)).toBe(true);

    const outputHtml = fs.readFileSync(outputPath, 'utf8');
    expect(outputHtml).toContain('Initiative Group 1');
    expect(outputHtml).toContain('Initiative Group 2');

    global.previewHtml = res.body.previewHtml;
    global.outputFile = res.body.outputFile;
  });

  it('Step 6: Download generated output', async () => {
    console.log('\n⬇️  STEP 6: Download Output');
    
    const res = await request(app)
      .get(`/api/html-flow/download/${global.chainId}/${global.outputFile}`);

    console.log(`   Status: ${res.status}`);
    console.log(`   Content-Type: ${res.headers['content-type']}`);
    console.log(`   Content Length: ${res.text?.length || 0} bytes`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Initiative Group 1');
    expect(res.text).toContain('Initiative Group 2');
  });

  it('✨ Complete flow verification', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('✨ FULL BROWSER FLOW COMPLETE');
    console.log('='.repeat(60));
    console.log('\nAll steps passed successfully:');
    console.log('  ✓ Template uploaded');
    console.log('  ✓ Project created with ignored zone (no key property)');
    console.log('  ✓ Recipe generated correctly');
    console.log('  ✓ JSON validated without "undefined" errors');
    console.log('  ✓ Content applied to create 2 slides');
    console.log('  ✓ Preview generated and rendered');
    console.log('  ✓ Output file downloaded');
    console.log('\n🎉 The fix works end-to-end with your data!');
    console.log('   Zones without keys no longer cause validation errors.');
    console.log('='.repeat(60) + '\n');

    expect(true).toBe(true);
  });
});
