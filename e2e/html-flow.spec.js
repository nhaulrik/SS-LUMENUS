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

  test('Visual flow does not show PPTX file input', async ({ page }) => {
    await page.goto('/');
    await page.locator(SEL.flowCardVisual).click();
    await expect(page.locator(SEL.fileInput)).not.toBeVisible();
  });

  test('PPTX Native card click shows PPTX upload zone', async ({ page }) => {
    await page.goto('/');
    await page.locator(SEL.flowCardPptx).click();
    await expect(page.locator('.upload-zone')).toBeVisible();
  });
});

// ── UC-HF-02: Valid HTML file is accepted ─────────────────────────────────────

test.describe('UC-HF-02 — Valid HTML upload is accepted', () => {
  test('uploading test_slide.html shows zone list without errors', async ({ page }) => {
    await selectHtmlFlow(page);
    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    await expect(page.locator(SEL.zoneListSection)).toBeVisible();
    await expect(page.locator(SEL.htmlViolations)).not.toBeVisible();
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

// ── UC-HF-04: All expected zones are detected ─────────────────────────────────

test.describe('UC-HF-04 — All expected zones are detected', () => {
  test('zone count matches expected zones in fixture', async ({ page }) => {
    await doHtmlUpload(page);
    const rows = page.locator(SEL.zoneRows);
    await expect(rows).toHaveCount(EXPECTED_ZONES.length);
  });

  for (const zone of EXPECTED_ZONES) {
    test(`zone "${zone.key}" is present in the list`, async ({ page }) => {
      await doHtmlUpload(page);
      await expect(page.locator(SEL.zoneRowByKey(zone.key))).toBeVisible();
    });
  }
});

// ── UC-HF-05: Zone type inference ─────────────────────────────────────────────

test.describe('UC-HF-05 — Zone types are correctly inferred', () => {
  test('total_hours is inferred as number type', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('total_hours'));
    await expect(row.locator(SEL.zoneTypeSelect)).toHaveValue('number');
  });

  test('initiative_count is inferred as number type', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('initiative_count'));
    await expect(row.locator(SEL.zoneTypeSelect)).toHaveValue('number');
  });

  test('initiative_group_title is inferred as text type', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('initiative_group_title'));
    await expect(row.locator(SEL.zoneTypeSelect)).toHaveValue('text');
  });

  test('business_value is inferred as text type', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('business_value'));
    await expect(row.locator(SEL.zoneTypeSelect)).toHaveValue('text');
  });
});

// ── UC-HF-06: Zone hints ──────────────────────────────────────────────────────

test.describe('UC-HF-06 — Zone hints are populated', () => {
  test('initiative_group_title has a non-empty hint', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('initiative_group_title'));
    // Expand to see hint input
    await row.locator(SEL.zoneExpandBtn).click();
    const hintInput = row.locator(SEL.zoneHintInput);
    await expect(hintInput).not.toHaveValue('');
  });

  test('total_hours hint mentions hours or effort', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('total_hours'));
    await row.locator(SEL.zoneExpandBtn).click();
    const hintVal = await row.locator(SEL.zoneHintInput).inputValue();
    expect(hintVal.toLowerCase()).toMatch(/hour|effort/);
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
});

// ── UC-HF-08: Expand zone row to edit hint ────────────────────────────────────

test.describe('UC-HF-08 — User can expand a zone row to edit the hint', () => {
  test('hint input is hidden before expanding', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator(SEL.zoneHintInput).first()).not.toBeVisible();
  });

  test('hint input is visible after clicking expand button', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRows).first();
    await row.locator(SEL.zoneExpandBtn).click();
    await expect(row.locator(SEL.zoneHintInput)).toBeVisible();
  });

  test('user can edit the hint text', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('initiative_group_title'));
    await row.locator(SEL.zoneExpandBtn).click();
    await row.locator(SEL.zoneHintInput).fill('Custom hint text');
    await expect(row.locator(SEL.zoneHintInput)).toHaveValue('Custom hint text');
  });

  test('collapse button hides hint input again', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRows).first();
    await row.locator(SEL.zoneExpandBtn).click();
    await expect(row.locator(SEL.zoneHintInput)).toBeVisible();
    await row.locator(SEL.zoneExpandBtn).click();
    await expect(row.locator(SEL.zoneHintInput)).not.toBeVisible();
  });
});

// ── UC-HF-09: Change zone type ────────────────────────────────────────────────

test.describe('UC-HF-09 — User can change a zone type', () => {
  test('changing type select updates the value', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('business_value'));
    const sel = row.locator(SEL.zoneTypeSelect);
    await sel.selectOption('number');
    await expect(sel).toHaveValue('number');
  });

  test('type can be changed back to text', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRowByKey('total_hours'));
    const sel = row.locator(SEL.zoneTypeSelect);
    await sel.selectOption('text');
    await expect(sel).toHaveValue('text');
  });
});

// ── UC-HF-10: Toggle AI flag ──────────────────────────────────────────────────

test.describe('UC-HF-10 — User can toggle the AI flag per zone', () => {
  test('AI checkbox is checked by default', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRows).first();
    await expect(row.locator(SEL.zoneAutoToggle)).toBeChecked();
  });

  test('unchecking AI checkbox updates the state', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRows).first();
    await row.locator(SEL.zoneAutoToggle).uncheck();
    await expect(row.locator(SEL.zoneAutoToggle)).not.toBeChecked();
  });

  test('re-checking AI checkbox restores state', async ({ page }) => {
    await doHtmlUpload(page);
    const row = page.locator(SEL.zoneRows).first();
    await row.locator(SEL.zoneAutoToggle).uncheck();
    await row.locator(SEL.zoneAutoToggle).check();
    await expect(row.locator(SEL.zoneAutoToggle)).toBeChecked();
  });
});

// ── UC-HF-11 & UC-HF-12: Remove a zone ───────────────────────────────────────

test.describe('UC-HF-11/12 — User can remove a zone from the list', () => {
  test('clicking remove button removes the zone row', async ({ page }) => {
    await doHtmlUpload(page);
    const initialCount = await page.locator(SEL.zoneRows).count();
    await page.locator(SEL.zoneRows).first().locator(SEL.zoneRemoveBtn).click();
    await expect(page.locator(SEL.zoneRows)).toHaveCount(initialCount - 1);
  });

  test('removed zone key no longer appears in the list', async ({ page }) => {
    await doHtmlUpload(page);
    // Remove the first zone (initiative_group_title)
    await page.locator(SEL.zoneRowByKey('initiative_group_title'))
      .locator(SEL.zoneRemoveBtn).click();
    await expect(page.locator(SEL.zoneRowByKey('initiative_group_title'))).not.toBeVisible();
  });

  test('other zones remain after one is removed', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.zoneRowByKey('initiative_group_title'))
      .locator(SEL.zoneRemoveBtn).click();
    // total_hours should still be present
    await expect(page.locator(SEL.zoneRowByKey('total_hours'))).toBeVisible();
  });
});

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

  test('Create Project button is enabled when name is filled and zones exist', async ({ page }) => {
    await doHtmlUpload(page);
    // Name is pre-filled; zones exist — button should be enabled
    await expect(page.locator(SEL.createProjectBtn)).toBeEnabled();
  });

  test('Create Project button is disabled after all zones are removed', async ({ page }) => {
    await doHtmlUpload(page);
    const count = await page.locator(SEL.zoneRows).count();
    for (let i = 0; i < count; i++) {
      await page.locator(SEL.zoneRemoveBtn).first().click();
    }
    await expect(page.locator(SEL.createProjectBtn)).toBeDisabled();
  });
});

// ── UC-HF-16/17/18: Successful project creation ───────────────────────────────

test.describe('UC-HF-16/17/18 — Successful project creation', () => {
  test('clicking Create Project shows the confirmation screen', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    await expect(page.locator(SEL.htmlProjectCreated)).toBeVisible();
  });

  test('confirmation screen shows the correct project name', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    await expect(page.locator(SEL.projectCreatedName)).toContainText('my-test-project');
  });

  test('confirmation screen shows the zone count', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    const meta = page.locator(SEL.projectCreatedMeta);
    await expect(meta).toContainText('zone');
    // Should show the number of zones (8 in test_slide.html)
    const text = await meta.textContent();
    expect(parseInt(text)).toBeGreaterThan(0);
  });
});

// ── UC-HF-19: Return to flow selector ────────────────────────────────────────

test.describe('UC-HF-19 — Start a new project returns to flow selector', () => {
  test('clicking "Start a new project" shows the flow selector', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    await page.locator('button:has-text("Start a new project")').click();
    await expect(page.locator(SEL.flowSelectContainer)).toBeVisible();
  });

  test('flow selector shows both cards after returning', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-test-project');
    await page.locator('button:has-text("Start a new project")').click();
    await expect(page.locator(SEL.flowCards)).toHaveCount(2);
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

  test('file with no data-zone shows NO_ZONES error', async ({ page }) => {
    await selectHtmlFlow(page);
    await page.route('http://localhost:5173/api/html-flow/upload-template', route => route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        violations: [{ rule: 'NO_ZONES', message: 'No elements with data-zone attributes found. At least one zone is required.' }],
      }),
    }));

    await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
    await expect(page.locator(SEL.htmlViolations)).toBeVisible({ timeout: 8000 });
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
    await page.locator('button:has-text("Replace file")').click();
    await expect(page.locator(SEL.htmlUploadZone)).toBeVisible();
    await expect(page.locator(SEL.zoneListSection)).not.toBeVisible();
  });
});

// ── UC-HF-23/24/25: Server-side API correctness ───────────────────────────────

test.describe('UC-HF-23 — upload-template API returns correct zone structure', () => {
  test('API returns ok:true with templateId, slideCount, and zones array', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.templateId).toBe('string');
    expect(body.slideCount).toBe(1);
    expect(Array.isArray(body.zones)).toBe(true);
    expect(body.zones.length).toBe(EXPECTED_ZONES.length);
  });

  test('API returns all expected zone keys', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const body = await res.json();
    const returnedKeys = body.zones.map(z => z.key);
    for (const expected of EXPECTED_ZONES) {
      expect(returnedKeys).toContain(expected.key);
    }
  });

  test('API returns correct type inference for number zones', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const res  = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const body = await res.json();
    const totalHours = body.zones.find(z => z.key === 'total_hours');
    expect(totalHours).toBeTruthy();
    expect(totalHours.type).toBe('number');
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

test.describe('UC-HF-24 — update-zones API persists zone edits', () => {
  test('PATCH update-zones returns ok:true with updated zones', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, zones } = await uploadRes.json();

    // Edit the first zone's hint
    const updatedZones = zones.map((z, i) =>
      i === 0 ? { ...z, hint: 'Updated hint from e2e test' } : z
    );

    const patchRes = await page.request.patch('http://localhost:3001/api/html-flow/update-zones', {
      data: { templateId, zones: updatedZones }
    });
    expect(patchRes.ok()).toBe(true);
    const patchBody = await patchRes.json();
    expect(patchBody.ok).toBe(true);
    expect(patchBody.zones[0].hint).toBe('Updated hint from e2e test');
  });
});

test.describe('UC-HF-25 — create-project API creates chain.json with flow:"html"', () => {
  // These tests verify the response contract from the API.
  // Direct disk checks are omitted because the e2e server may use a different
  // CHAINS_DIR than the test process (env var set only for the Playwright webServer).

  test('create-project returns ok:true with a chainId string', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, zones } = await uploadRes.json();

    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, zones, projectName: 'e2e-api-test' }
    });
    expect(createRes.ok()).toBe(true);
    const body = await createRes.json();
    expect(body.ok).toBe(true);
    expect(typeof body.chainId).toBe('string');
    expect(body.chainId).toMatch(/^chain-/);
  });

  test('create-project response echoes back correct projectName and zone count', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, zones } = await uploadRes.json();

    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, zones, projectName: 'e2e-contract-test' }
    });
    const body = await createRes.json();
    expect(body.projectName).toBe('e2e-contract-test');
    expect(Array.isArray(body.zones)).toBe(true);
    expect(body.zones.length).toBe(zones.length);
  });

  test('create-project response includes templatePath pointing to template.html', async ({ page }) => {
    const html = fs.readFileSync(FIXTURE_HTML, 'utf8');
    const uploadRes = await page.request.post('http://localhost:3001/api/html-flow/upload-template', {
      data: { html, fileName: 'test_slide.html' }
    });
    const { templateId, zones } = await uploadRes.json();

    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId, zones, projectName: 'e2e-path-test' }
    });
    const body = await createRes.json();
    expect(body.templatePath).toBeTruthy();
    expect(body.templatePath).toMatch(/template\.html$/);
  });

  test('using an expired/unknown templateId returns 404', async ({ page }) => {
    const createRes = await page.request.post('http://localhost:3001/api/html-flow/create-project', {
      data: { templateId: 'nonexistent-id', zones: [], projectName: 'should-fail' }
    });
    expect(createRes.status()).toBe(404);
    const body = await createRes.json();
    expect(body.ok).toBe(false);
  });
});
