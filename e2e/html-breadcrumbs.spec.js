/**
 * HTML Flow Breadcrumb Navigation E2E Spec
 *
 * UC-HB-01  Breadcrumb renders all three steps on the upload/zone-review screen
 * UC-HB-02  Step 1 is active on the upload/zone-review screen
 * UC-HB-03  Breadcrumb renders all three steps on the recipe screen
 * UC-HB-04  Step 1 is completed and step 2 is active on the recipe screen
 * UC-HB-05  Clicking completed step 1 breadcrumb navigates back to upload/zones
 * UC-HB-06  Breadcrumb renders all three steps on the preview screen
 * UC-HB-07  Step 1 and 2 are completed, step 3 is active on the preview screen
 * UC-HB-08  Clicking step 1 breadcrumb from preview navigates back to upload/zones
 * UC-HB-09  Clicking step 2 breadcrumb from preview navigates back to recipe
 * UC-HB-10  Step 1 breadcrumb is not clickable before a project is created
 * UC-HB-11  Step 2 breadcrumb is not clickable on upload screen (no project yet)
 * UC-HB-12  Step 3 breadcrumb is not clickable on recipe screen (not applied yet)
 */

import { test, expect, SEL, doHtmlUpload, doHtmlCreateProject } from './fixtures.js';
import path from 'path';
import fs   from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Helpers ───────────────────────────────────────────────────────────────────

const BREADCRUMB_LABELS = ['Template & Zones', 'Recipe + JSON', 'Preview'];

/** Assert the breadcrumb bar shows all three HTML flow steps with correct labels. */
async function expectAllSteps(page) {
  const items = page.locator(SEL.breadcrumbItems);
  await expect(items).toHaveCount(3);
  for (let i = 0; i < BREADCRUMB_LABELS.length; i++) {
    await expect(items.nth(i)).toContainText(BREADCRUMB_LABELS[i]);
  }
}

/** Return the breadcrumb item by 0-based index. */
const crumb = (page, idx) => page.locator(SEL.breadcrumbItems).nth(idx);

// ── Mock apply-content so we can reach the preview step without a real AI call ─

async function mockApplyContent(page) {
  await page.route('**/api/html-flow/apply-content', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      roundId:    'test-round-id',
      outputFile: 'output-test.html',
      previewHtml: '<!DOCTYPE html><html><body><section><p>Applied content</p></section></body></html>',
    }),
  }));
}

/** Navigate to the preview step using a mocked apply-content response. */
async function doHtmlApply(page) {
  // Stub validate-json so the Apply button becomes enabled immediately
  await page.route('**/api/html-flow/validate-json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, valid: true, foundFields: ['title'], missingFields: [], instanceCount: 0 }),
  }));
  await mockApplyContent(page);

  // Stub generate-recipe so we don't need a real chain
  await page.route('**/api/html-flow/generate-recipe', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, recipe: '1. STATIC FIELDS\n{\n  "static": {\n    "title": "page title",\n  },\n}' }),
  }));

  // Generate recipe
  await page.locator(SEL.htmlGenerateRecipeBtn).click();
  await expect(page.locator(SEL.htmlRecipeArea)).toBeVisible({ timeout: 5000 });

  // Paste JSON and wait for validation
  await page.locator(SEL.htmlJsonInput).fill('{"static":{"title":"Hello"}}');
  const applyBtn = page.locator(SEL.htmlApplyBtn);
  await expect(applyBtn).toBeEnabled({ timeout: 5000 });
  await applyBtn.click();
  await expect(page.locator(SEL.htmlPreviewStepLayout)).toBeVisible({ timeout: 5000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// UC-HB-01/02: Upload / zone-review screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-HB-01/02 — Breadcrumb on upload/zone-review screen', () => {
  test('renders all three step labels', async ({ page }) => {
    await doHtmlUpload(page);
    await expectAllSteps(page);
  });

  test('step 1 (Template & Zones) is active', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(crumb(page, 0)).toHaveClass(/active/);
  });

  test('step 2 (Recipe + JSON) is not active or completed', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(crumb(page, 1)).not.toHaveClass(/active/);
    await expect(crumb(page, 1)).not.toHaveClass(/completed/);
  });

  test('step 3 (Preview) is not active or completed', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(crumb(page, 2)).not.toHaveClass(/active/);
    await expect(crumb(page, 2)).not.toHaveClass(/completed/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-HB-10/11: Non-clickable states on upload screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-HB-10/11 — Non-clickable breadcrumbs on upload screen', () => {
  test('step 2 breadcrumb is not clickable before project is created', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(crumb(page, 1)).not.toHaveClass(/clickable/);
  });

  test('step 3 breadcrumb is not clickable before project is created', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(crumb(page, 2)).not.toHaveClass(/clickable/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-HB-03/04/05: Recipe screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-HB-03/04/05 — Breadcrumb on recipe screen', () => {
  test('renders all three step labels', async ({ page }) => {
    await doHtmlCreateProject(page);
    await expectAllSteps(page);
  });

  test('step 1 is completed on the recipe screen', async ({ page }) => {
    await doHtmlCreateProject(page);
    await expect(crumb(page, 0)).toHaveClass(/completed/);
  });

  test('step 2 (Recipe + JSON) is active on the recipe screen', async ({ page }) => {
    await doHtmlCreateProject(page);
    await expect(crumb(page, 1)).toHaveClass(/active/);
  });

  test('step 3 (Preview) is not active or completed on recipe screen', async ({ page }) => {
    await doHtmlCreateProject(page);
    await expect(crumb(page, 2)).not.toHaveClass(/active/);
    await expect(crumb(page, 2)).not.toHaveClass(/completed/);
  });

  test('clicking completed step 1 breadcrumb navigates back to tree panel', async ({ page }) => {
    await doHtmlCreateProject(page);
    await expect(crumb(page, 0)).toHaveClass(/clickable/);
    await crumb(page, 0).click();
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible({ timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-HB-12: Step 3 not clickable on recipe screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-HB-12 — Step 3 not clickable before apply', () => {
  test('step 3 breadcrumb is not clickable on recipe screen', async ({ page }) => {
    await doHtmlCreateProject(page);
    await expect(crumb(page, 2)).not.toHaveClass(/clickable/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// State preservation on back-navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('State preserved when navigating back via breadcrumb', () => {
  test('tree panel is visible (not upload zone) after back from recipe', async ({ page }) => {
    await doHtmlCreateProject(page);
    await crumb(page, 0).click();
    await expect(page.locator(SEL.htmlUploadZone)).not.toBeVisible();
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible({ timeout: 3000 });
  });

  test('tree nodes are still present after back from recipe', async ({ page }) => {
    await doHtmlCreateProject(page);
    await crumb(page, 0).click();
    await expect(page.locator(SEL.treeNodes).first()).toBeVisible({ timeout: 3000 });
  });

  test('file name is still shown after back from recipe', async ({ page }) => {
    await doHtmlCreateProject(page, 'back-test');
    await crumb(page, 0).click();
    await expect(page.locator(SEL.htmlFileName)).toBeVisible({ timeout: 3000 });
  });

  test('project name field is preserved after back from recipe', async ({ page }) => {
    await doHtmlCreateProject(page, 'my-preserved-project');
    await crumb(page, 0).click();
    await expect(page.locator(SEL.projectNameInput)).toHaveValue('my-preserved-project', { timeout: 3000 });
  });

  test('tree panel is visible after back from preview', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await crumb(page, 0).click();
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible({ timeout: 3000 });
  });

  test('recipe layout is visible after clicking step 2 from preview', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await crumb(page, 1).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 3000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-HB-06/07/08/09: Preview screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-HB-06/07/08/09 — Breadcrumb on preview screen', () => {
  test('renders all three step labels', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await expectAllSteps(page);
  });

  test('steps 1 and 2 are completed on the preview screen', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await expect(crumb(page, 0)).toHaveClass(/completed/);
    await expect(crumb(page, 1)).toHaveClass(/completed/);
  });

  test('step 3 (Preview) is active on the preview screen', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await expect(crumb(page, 2)).toHaveClass(/active/);
  });

  test('clicking step 1 breadcrumb from preview navigates to tree panel', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await expect(crumb(page, 0)).toHaveClass(/clickable/);
    await crumb(page, 0).click();
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible({ timeout: 3000 });
  });

  test('clicking step 2 breadcrumb from preview navigates to recipe', async ({ page }) => {
    await doHtmlCreateProject(page);
    await doHtmlApply(page);
    await expect(crumb(page, 1)).toHaveClass(/clickable/);
    await crumb(page, 1).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 3000 });
  });
});
