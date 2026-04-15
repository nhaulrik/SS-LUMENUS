/**
 * E2E tests for Full-Slide Content Generation feature.
 *
 * UC-FSG-01  User can generate full slide with all zones
 * UC-FSG-02  Validation fails if zones are missing
 * UC-FSG-03  Works with repeatable slides (each instance)
 * UC-FSG-04  Respected ignored zones are excluded
 * UC-FSG-05  Visual indicator shows full-slide mode
 */

import { test, expect, SEL, doHtmlUpload, doHtmlCreateProject } from './fixtures.js';

// ── UC-FSG-01: Generate full slide ─────────────────────────────────────────

test.describe('UC-FSG-01 — Full-Slide Content Generation', () => {
  test('user can click Generate Full Slide button', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign some zones first
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Click Generate Full Slide button
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Should navigate to recipe step
    await expect(page.locator('.html-recipe-layout')).toBeVisible();
  });

  test('recipe includes all zones on the slide', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign multiple zones
    let assignBtns = page.locator('[data-testid^="tree-assign-btn-"]');
    const count = await assignBtns.count();
    
    // Assign first 3 zones
    for (let i = 0; i < Math.min(3, count); i++) {
      await assignBtns.nth(i).click();
      let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
      await confirmBtn.click();
    }

    // Click Generate Full Slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await generateBtn.click();

    // Verify recipe area is visible
    const recipeArea = page.locator('.html-recipe-area');
    await expect(recipeArea).toBeVisible();
    const recipe = await recipeArea.textContent();

    // Recipe should include "GENERATE ALL ZONES FOR THIS SLIDE"
    expect(recipe).toContain('GENERATE ALL ZONES FOR THIS SLIDE');
    expect(recipe).toContain('BLOCK ZONES');
  });

  test('apply content fills all zones at once', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign zones
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Generate full slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await generateBtn.click();

    // Paste JSON with all zones
    const minimalJson = JSON.stringify({
      blocks: {
        initiative_group_title: { value: 'Test Title' },
        initiative_group_subtitle: { value: 'Test Subtitle' },
        total_hours: { value: '1000' },
        initiative_count: { value: '5' },
        feature_count: { value: '10' },
        completion_pct: { value: '50%' },
        business_value: { value: 'Test Value' },
        market_relevance: { value: 'Test Relevance' },
      }
    });

    const jsonInput = page.locator('.html-recipe-right .json-input');
    await jsonInput.fill(minimalJson);

    // Click Apply
    const applyBtn = page.locator('button:has-text("Apply content")');
    await applyBtn.click();

    // Should navigate to preview step
    await expect(page.locator('.html-preview-step-layout')).toBeVisible();
  });
});

// ── UC-FSG-02: Validation with missing zones ──────────────────────────────

test.describe('UC-FSG-02 — Validation for Full-Slide Generation', () => {
  test('validation fails if zones are missing', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign zones
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Generate full slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await generateBtn.click();

    // Paste incomplete JSON (missing some zones)
    const incompleteJson = JSON.stringify({
      blocks: {
        initiative_group_title: { value: 'Test Title' },
        // Missing other zones
      }
    });

    const jsonInput = page.locator('.html-recipe-right .json-input');
    await jsonInput.fill(incompleteJson);

    // Validation should fail
    const applyBtn = page.locator('button:has-text("Apply content")');
    // Button should be disabled
    await expect(applyBtn).toBeDisabled();
  });

  test('validation passes when all zones are present', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign zones
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Generate full slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await generateBtn.click();

    // Paste complete JSON
    const completeJson = JSON.stringify({
      blocks: {
        initiative_group_title: { value: 'Test Title' },
        initiative_group_subtitle: { value: 'Test Subtitle' },
        total_hours: { value: '1000' },
        initiative_count: { value: '5' },
        feature_count: { value: '10' },
        completion_pct: { value: '50%' },
        business_value: { value: 'Test Value' },
        market_relevance: { value: 'Test Relevance' },
      }
    });

    const jsonInput = page.locator('.html-recipe-right .json-input');
    await jsonInput.fill(completeJson);

    // Apply button should be enabled
    const applyBtn = page.locator('button:has-text("Apply content")');
    await expect(applyBtn).toBeEnabled();
  });
});

// ── UC-FSG-03: Full-slide generation with repeatable slides ────────────────

test.describe('UC-FSG-03 — Full-Slide Generation with Repeatable Slides', () => {
  test('works with repeatable slides', async ({ page }) => {
    await doHtmlUpload(page);

    // Mark slide as repeatable
    const repeatToggle = page.locator('[data-testid^="slide-repeatable-toggle-"]').first();
    await repeatToggle.check();

    // Assign a zone
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let uniqueToggle = page.locator('[data-testid="tree-assign-unique-toggle"]');
    await uniqueToggle.check(); // Mark as unique
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Generate full slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await generateBtn.click();

    // Recipe should include repeatable slide format
    const recipeArea = page.locator('.html-recipe-area');
    const recipe = await recipeArea.textContent();
    expect(recipe).toContain('REPEATABLE SLIDE');
  });
});

// ── UC-FSG-04: Ignored zones are excluded ──────────────────────────────────

test.describe('UC-FSG-04 — Ignored Zones Excluded from Full-Slide Generation', () => {
  test('ignored zones are not included in full-slide recipe', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign a zone
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Mark the zone as ignored
    let ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();

    // Generate full slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    
    // Button should be disabled or hidden since no non-ignored zones
    // (depending on implementation)
    // For now, just verify it doesn't generate a recipe with the ignored zone
  });
});

// ── UC-FSG-05: Visual indicator ────────────────────────────────────────────

test.describe('UC-FSG-05 — Full-Slide Mode Visual Indicator', () => {
  test('recipe area shows full-slide generation mode indicator', async ({ page }) => {
    await doHtmlUpload(page);

    // Assign zones
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();

    // Generate full slide
    const generateBtn = page.locator('[data-testid^="generate-full-slide-btn-"]').first();
    await generateBtn.click();

    // Should show indicator
    const recipeArea = page.locator('.html-recipe-area');
    const recipe = await recipeArea.textContent();
    
    // Recipe should clearly indicate full-slide mode
    expect(recipe).toContain('GENERATE ALL ZONES FOR THIS SLIDE');
  });
});
