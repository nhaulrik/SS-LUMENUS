/**
 * HTML Flow E2E Spec — Visual Flow (Stage 1)
 *
 * Use Cases covered:
 *
 * UC-HF-01  Flow selector shows both options and routes correctly
 * UC-HF-02  HTML file upload — valid file is accepted, zones are parsed
 * UC-HF-03  HTML file upload — correct slide count is reported
 * UC-HF-04  HTML file upload — all expected zones are detected
 * UC-HF-05  HTML file upload — zone types are correctly inferred
 * UC-HF-06  HTML file upload — zone hints are populated from element text
 * UC-HF-07  HTML file upload — slide preview iframe is rendered
 * UC-HF-08  Zone review — user can expand a zone row to edit the hint
 * UC-HF-09  Zone review — user can change a zone type via the select
 * UC-HF-10  Zone review — user can toggle the AI flag per zone
 * UC-HF-11  Zone review — user can remove a zone from the list
 * UC-HF-12  Zone review — removed zone no longer appears in the list
 * UC-HF-13  Project creation — project name field is pre-filled from filename
 * UC-HF-14  Project creation — Create Project button is disabled with no zones
 * UC-HF-15  Project creation — Create Project button is disabled with no project name
 * UC-HF-16  Project creation — successful creation shows confirmation screen
 * UC-HF-17  Project creation — confirmation shows correct project name
 * UC-HF-18  Project creation — confirmation shows correct zone count
 * UC-HF-19  Project creation — "Start a new project" returns to flow selector
 * UC-HF-20  Validation — file with no <section> shows correct error
 * UC-HF-21  Validation — file with no data-zone attributes shows correct error
 * UC-HF-22  Replace file — user can re-upload a different file after first upload
 * UC-HF-23  Server — upload-template API returns correct zone structure
 * UC-HF-24  Server — update-zones API persists zone edits
 * UC-HF-25  Server — create-project API creates chain.json with flow:"html"
 */

import { test, expect, FIXTURE_HTML, EXPECTED_ZONES, SEL,
         doHtmlUpload, doHtmlCreateProject, selectHtmlFlow } from './fixtures.js';
import path from 'path';
import fs   from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── UC-HF-01: Flow selector routing ──────────────────────────────────────────

test.describe('UC-HF-01 — Flow selector routes to correct flow', () => {
  test('Visual card click shows HTML upload zone', async ({ page }) => {
    await page.goto('/');
    await page.locator(SEL.flowCardVisual).click();
    await expect(page.locator(SEL.htmlUploadZone)).toBeVisible();
  });

  test('Flow selector shows the Visual card', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SEL.flowCardVisual)).toBeVisible();
  });

  test('Flow selector shows exactly one card', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SEL.flowCards)).toHaveCount(1);
  });
});

// ── UC-HF-02: Valid HTML file is accepted ─────────────────────────────────────

test.describe('UC-HF-02 — Valid HTML upload is accepted', () => {
  test('uploading test_slide.html shows the DOM tree panel', async ({ page }) => {
    await selectHtmlFlow(page);
    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible();
  });

  test('file-loaded state shows the filename', async ({ page }) => {
    await selectHtmlFlow(page);
    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    await page.waitForSelector(SEL.htmlFileLoaded);
    await expect(page.locator(SEL.htmlFileName)).toContainText('test_slide.html');
  });
});

// ── UC-HF-03: Slide count ─────────────────────────────────────────────────────

test.describe('UC-HF-03 — Correct slide count is reported', () => {
  test('file meta shows 1 slide for test_slide.html', async ({ page }) => {
    await selectHtmlFlow(page);
    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    await page.waitForSelector(SEL.htmlFileLoaded);
    await expect(page.locator(SEL.htmlFileMeta)).toContainText('1 slide');
  });
});

// ── UC-HF-04: Tree panel shows nodes ─────────────────────────────────────────

test.describe('UC-HF-04 — DOM tree panel renders nodes', () => {
  test('tree panel is visible after upload', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible();
  });

  test('tree has at least one visible node', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator(SEL.treeNodes).first()).toBeVisible();
  });

  test('pre-existing data-zone selections are shown as zone badges', async ({ page }) => {
    await doHtmlUpload(page);
    // test_slide.html has 8 data-zone attributes — all become pre-selections
    // Expand all to make badges visible
    await page.locator(SEL.treeExpandAll).click();
    await expect(page.locator(SEL.treeZoneBadges).first()).toBeVisible({ timeout: 3000 });
  });
});

// ── UC-HF-05: Zone assignment via tree ───────────────────────────────────────

test.describe('UC-HF-05 — User can assign a zone via the tree', () => {
  test('clicking assign button opens the assignment panel', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();
    // Hover first node to reveal the assign button
    const firstNode = page.locator(SEL.treeNodes).first();
    await firstNode.hover();
    await firstNode.locator('.tree-node-assign-btn').click();
    await expect(page.locator(SEL.assignPanel)).toBeVisible();
  });

  test('assignment panel has a key input', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();
    const firstNode = page.locator(SEL.treeNodes).first();
    await firstNode.hover();
    await firstNode.locator('.tree-node-assign-btn').click();
    await expect(page.locator(SEL.assignKeyInput)).toBeVisible();
  });

  test('confirming assignment adds a zone badge to the node', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();
    // Find a node without a badge and assign it
    const nodes = page.locator(SEL.treeNodes);
    const count = await nodes.count();
    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i);
      const hasBadge = await node.locator('.tree-zone-badge').count();
      if (hasBadge === 0) {
        await node.hover();
        await node.locator('.tree-node-assign-btn').click();
        await page.locator(SEL.assignKeyInput).fill('my_new_zone');
        await page.locator(SEL.assignConfirmBtn).click();
        await expect(page.locator(SEL.assignPanel)).not.toBeVisible();
        // Badge should now appear on that node
        await expect(node.locator('.tree-zone-badge')).toBeVisible({ timeout: 2000 });
        return;
      }
    }
  });

  test('cancelling assignment panel closes it without changes', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();
    const firstNode = page.locator(SEL.treeNodes).first();
    await firstNode.hover();
    await firstNode.locator('.tree-node-assign-btn').click();
    await page.locator(SEL.assignPanel).locator('button:has-text("Cancel")').click();
    await expect(page.locator(SEL.assignPanel)).not.toBeVisible();
  });
});

// ── UC-HF-06: Block zone assignment ──────────────────────────────────────────

test.describe('UC-HF-06 — User can assign a block zone', () => {
  test('assigning a zone shows prompt field', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();
    const firstNode = page.locator(SEL.treeNodes).first();
    await firstNode.hover();
    await firstNode.locator('.tree-node-assign-btn').click();
    // All zones are now block zones by default, so prompt field should be visible
    await expect(page.locator(SEL.assignPromptInput)).toBeVisible();
  });
});

// ── UC-HF-07: Slide preview ───────────────────────────────────────────────────

test.describe('UC-HF-07 — Slide preview iframe is rendered', () => {
  test('preview panel is visible after upload', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator(SEL.htmlPreviewPanel)).toBeVisible();
  });

  test('preview iframe is present inside the panel', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator(SEL.htmlPreviewFrame)).toBeVisible();
  });

  test('preview iframe has a srcDoc (not empty)', async ({ page }) => {
    await doHtmlUpload(page);
    const srcDoc = await page.locator(SEL.htmlPreviewFrame).getAttribute('srcdoc');
    expect(srcDoc).toBeTruthy();
    expect(srcDoc.length).toBeGreaterThan(100);
  });

  test('preview iframe contains data-solon-id attributes for tree highlighting', async ({ page }) => {
    await doHtmlUpload(page);
    const srcDoc = await page.locator(SEL.htmlPreviewFrame).getAttribute('srcdoc');
    expect(srcDoc).toContain('data-solon-id');
  });

  test('preview iframe fills its wrapper (no whitespace gap below)', async ({ page }) => {
    await doHtmlUpload(page);
    const wBox = await page.locator(SEL.htmlPreviewFrameWrapper).boundingBox();
    const iBox = await page.locator(SEL.htmlPreviewFrame).boundingBox();
    expect(wBox).not.toBeNull();
    expect(iBox).not.toBeNull();
    // Allow 8px tolerance: iframe border (1px each side) + sub-pixel rounding
    expect(Math.abs(iBox.height - wBox.height)).toBeLessThanOrEqual(8);
    expect(Math.abs(iBox.width  - wBox.width )).toBeLessThanOrEqual(8);
  });

  test('slide shell is scaled to fit the iframe bounds', async ({ page }) => {
    await doHtmlUpload(page);
    const iBox = await page.locator(SEL.htmlPreviewFrame).boundingBox();
    expect(iBox).not.toBeNull();

    // Scale is injected as a <style> block onto #solon-slide-shell via the
    // ResizeObserver callback ref. Poll until the real scale (< 1) is applied.
    const shell = page.frameLocator(SEL.htmlPreviewFrame).locator('#solon-slide-shell');
    let scale;
    await expect(async () => {
      const matrix = await shell.evaluate(el => window.getComputedStyle(el).transform);
      expect(matrix).not.toBe('none');
      const m = matrix.match(/matrix\(([^,]+)/);
      expect(m).not.toBeNull();
      scale = parseFloat(m[1]);
      // The real scale must be < 1 (the 1280px slide is wider than the ~710px iframe)
      expect(scale).toBeLessThan(1);
    }).toPass({ timeout: 5000 });

    expect(scale).toBeGreaterThan(0);
    // Visual dimensions must fit within the iframe (±4px for float rounding)
    expect(1280 * scale).toBeLessThanOrEqual(iBox.width  + 4);
    expect(720  * scale).toBeLessThanOrEqual(iBox.height + 4);
  });

  test('slide shell is anchored to top-left corner of the iframe (no offset)', async ({ page }) => {
    await doHtmlUpload(page);
    const iBox  = await page.locator(SEL.htmlPreviewFrame).boundingBox();
    const shell = page.frameLocator(SEL.htmlPreviewFrame).locator('#solon-slide-shell');
    const sBox  = await shell.boundingBox();
    expect(sBox).not.toBeNull();
    // Shell top-left in page coords must match iframe top-left.
    // Allow 4px for the iframe border and sub-pixel rounding.
    expect(Math.abs(sBox.x - iBox.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(sBox.y - iBox.y)).toBeLessThanOrEqual(4);
  });
});

// ── UC-HF-08–12: Removed (flat zone list no longer exists) ───────────────────
// Zone editing is now done through the tree assignment panel (UC-HF-05/06).

// ── UC-HF-13: Project name pre-filled ────────────────────────────────────────

test.describe('UC-HF-13 — Project name is pre-filled from filename', () => {
  test('project name input is pre-filled with filename (without extension)', async ({ page }) => {
    await doHtmlUpload(page);
    const nameInput = page.locator(SEL.projectNameInput);
    const value = await nameInput.inputValue();
    expect(value).toBe('test_slide');
  });
});

// ── UC-HF-14 & UC-HF-15: Create Project button disabled states ───────────────

test.describe('UC-HF-14/15 — Create Project button disabled states', () => {
  test('Create Project button is disabled when project name is empty', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.projectNameInput).fill('');
    await expect(page.locator(SEL.createProjectBtn)).toBeDisabled();
  });

  test('Create Project button is enabled when name is filled and selections exist', async ({ page }) => {
    await doHtmlUpload(page);
    // test_slide.html has pre-existing data-zone attrs → selections auto-populated
    // Name is pre-filled → button should be enabled
    await expect(page.locator(SEL.createProjectBtn)).toBeEnabled();
  });
});

// ── UC-HF-16/17/18: Successful project creation ───────────────────────────────

test.describe('UC-HF-16/17/18 — Successful project creation', () => {
  test('clicking Create Project navigates to the recipe step', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible();
  });

  test('recipe step header shows the correct project name', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    await expect(page.locator('header h1')).toContainText('my-test-project');
  });

  test('recipe step header subtitle shows the zone count', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    const subtitle = page.locator('header p');
    await expect(subtitle).toContainText('zone');
  });
});

// ── UC-HF-19: Return to flow selector ────────────────────────────────────────

test.describe('UC-HF-19 — Back navigation returns to flow selector', () => {
  test('clicking "Change flow" from upload step shows the flow selector', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.changeFlowBtn).click();
    await expect(page.locator(SEL.flowSelectContainer)).toBeVisible();
  });

  test('flow selector shows the Visual card after returning', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.changeFlowBtn).click();
    await expect(page.locator(SEL.flowCardVisual)).toBeVisible();
  });
});

// ── UC-HF-20/21: Validation errors ───────────────────────────────────────────

test.describe('UC-HF-20/21 — Validation errors are shown for invalid HTML', () => {
  test('file with no <section> shows NO_SECTIONS error', async ({ page }) => {
    // Intercept the upload API and return a mocked 422 violation response.
    // This tests the client-side rendering of violation state without depending
    // on a specific invalid file reaching the server.
    await selectHtmlFlow(page);
    await page.route('http://localhost:5173/api/html-flow/upload-template', route => route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        violations: [{ rule: 'NO_SECTIONS', message: 'No <section> elements found. Each slide must be wrapped in a <section>.' }],
      }),
    }));

    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    await expect(page.locator(SEL.htmlViolations)).toBeVisible({ timeout: 8000 });
    await expect(page.locator(SEL.htmlViolations)).toContainText('section');
  });

  test('file with no data-zone shows NO_ZONES warning in tree panel', async ({ page }) => {
    // NO_ZONES is now a non-fatal violation (200 OK) — the tree is still shown
    // but a warning notice appears above it explaining no zones were detected.
    await selectHtmlFlow(page);
    await page.route('http://localhost:5173/api/html-flow/upload-template', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        templateId: 'mock-template-id',
        slideCount: 1,
        trees: [[{ id: 'div.content', tag: 'div', classes: ['content'], label: 'div.content', textPreview: 'No zones', children: [], isLeaf: true, interesting: false, chrome: false, depth: 0, slideIndex: 1 }]],
        selections: [],
        violations: [{ rule: 'NO_ZONES', message: 'No content zones found. Use the tree to assign zones.' }],
        previewHtml: '<html><body><section><div class="content">No zones</div></section></body></html>',
      }),
    }));

    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    // Tree panel should appear (non-fatal — template is still usable)
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible({ timeout: 8000 });
    // Warning notice should mention zones
    await expect(page.locator(SEL.htmlViolations)).toBeVisible({ timeout: 3000 });
    await expect(page.locator(SEL.htmlViolations)).toContainText('zone');
  });
});

// ── UC-HF-22: Replace file ────────────────────────────────────────────────────

test.describe('UC-HF-22 — User can replace the uploaded file', () => {
  test('"Replace file" link appears after upload', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator('button:has-text("Replace file")')).toBeVisible();
  });

  test('clicking "Replace file" returns to the upload zone', async ({ page }) => {
    await doHtmlUpload(page);
    // First click arms the button (two-click confirmation pattern replaces window.confirm)
    await page.locator('button:has-text("Replace file")').click();
    // Second click (now labelled "Confirm replace") executes the action
    await page.locator('button:has-text("Confirm replace")').click();
    await expect(page.locator(SEL.htmlUploadZone)).toBeVisible();
    await expect(page.locator(SEL.htmlTreePanel)).not.toBeVisible();
  });
});

// ── UC-HF-23/24/25: Server-side API correctness ───────────────────────────────

test.describe('UC-HF-23 — upload-template API returns correct structure', () => {
  test('API returns ok:true with templateId, slideCount, trees and selections', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.templateId).toBe('string');
    expect(body.slideCount).toBe(1);
    expect(Array.isArray(body.trees)).toBe(true);
    expect(Array.isArray(body.selections)).toBe(true);
    expect(body.selections.length).toBe(EXPECTED_ZONES.length);
  });

  test('API returns all expected zone keys in selections', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const body = await res.json();
    const returnedKeys = body.selections.map(s => s.key);
    for (const expected of EXPECTED_ZONES) {
      expect(returnedKeys).toContain(expected.key);
    }
  });

  test('API returns correct type for zones in selections', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const body = await res.json();
    const totalHours = body.selections.find(s => s.key === 'total_hours');
    expect(totalHours).toBeTruthy();
    // All zones are now block zones
    expect(totalHours.type).toBe('block');
  });

  test('API returns previewHtml containing the slide structure', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const body = await res.json();
    expect(typeof body.previewHtml).toBe('string');
    expect(body.previewHtml.length).toBeGreaterThan(100);
    expect(body.previewHtml).toContain('<section');
  });

  test('API returns 422 with violations for a file with no sections', async ({ page }) => {
    const badHtml = '<html><body><div data-zone="x">hi</div></body></html>';
    const res = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html: badHtml, fileName: 'bad.html' }
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.violations.some(v => v.rule === 'NO_SECTIONS')).toBe(true);
  });
});

// ── UC-HF-24 — update-selections API ─────────────────────────────────────────

test.describe('UC-HF-24 — update-selections API persists selection edits', () => {
  test('PATCH update-selections returns ok:true with updated selections', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const updated = selections.map((s, i) =>
      i === 0 ? { ...s, hint: 'Updated hint from e2e test' } : s
    );

    const patchRes = await page.request.patch('http://localhost:3001/api/html-flow/update-selections', {
      data: { templateId, selections: updated }
    });
    expect(patchRes.ok()).toBe(true);
    const body = await patchRes.json();
    expect(body.ok).toBe(true);
    expect(body.selections[0].hint).toBe('Updated hint from e2e test');
  });
});

// ── UC-HF-25 — create-project API ────────────────────────────────────────────

test.describe('UC-HF-25 — create-project API creates chain.json with flow:"html"', () => {
  test('create-project returns ok:true with a chainId string', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections, projectName: 'e2e-api-test' }
    });
    expect(createRes.ok()).toBe(true);
    const body = await createRes.json();
    expect(body.ok).toBe(true);
    expect(typeof body.chainId).toBe('string');
    expect(body.chainId).toMatch(/^chain-/);
  });

  test('create-project response echoes back correct projectName and derived zones', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections, projectName: 'e2e-contract-test' }
    });
    const body = await createRes.json();
    expect(body.projectName).toBe('e2e-contract-test');
    expect(Array.isArray(body.zones)).toBe(true);
    expect(body.zones.length).toBe(selections.length);
  });

  test('create-project response does not leak server-side templatePath', async ({ page }) => {
    // templatePath is a server filesystem path — it must not be returned to clients
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, selections } = await uploadRes.json();

    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, selections, projectName: 'e2e-path-test' }
    });
    const body = await createRes.json();
    expect(body.ok).toBe(true);
    expect(body.templatePath).toBeUndefined(); // security: no server paths in responses
    expect(body.chainId).toMatch(/^chain-/);   // chainId is the safe public identifier
  });

  test('using an expired/unknown templateId returns 404', async ({ page }) => {
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId: 'nonexistent-id', selections: [], projectName: 'should-fail' }
    });
    expect(createRes.status()).toBe(404);
    expect((await createRes.json()).ok).toBe(false);
  });
});
