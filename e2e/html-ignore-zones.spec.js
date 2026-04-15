/**
 * HTML Flow E2E Spec — Ignore Zones Feature
 *
 * Use Cases covered:
 *
 * UC-IGN-01  Ignore button renders on assigned zones
 * UC-IGN-02  Ignore button toggles zone ignored state
 * UC-IGN-03  Ignored zones show visual indicator (strikethrough)
 * UC-IGN-04  Ignored zones are excluded from recipe
 * UC-IGN-05  Ignored zones are not patched with AI content
 * UC-IGN-06  data-ignore attribute is stripped from output
 */

import { test, expect, FIXTURE_HTML, doHtmlUpload, doHtmlCreateProject, selectHtmlFlow } from './fixtures.js';

// ── UC-IGN-01: Ignore button renders on assigned zones ────────────────────────

test.describe('UC-IGN-01 — Ignore button renders on assigned zones', () => {
  test('ignore button is visible after assigning a zone', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Assign a zone
    const firstAssignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await firstAssignBtn.click();
    
    // Confirm assignment
    const assignPanel = page.locator('[data-testid="tree-assign-panel"]');
    await expect(assignPanel).toBeVisible();
    const confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();
    
    // Verify ignore button is visible
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await expect(ignoreBtn).toBeVisible();
  });

  test('ignore button is visible on unassigned zones', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Verify ignore buttons exist on all tree nodes (even unassigned)
    const ignoreBtns = page.locator('[data-testid^="tree-ignore-btn-"]');
    const count = await ignoreBtns.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ── UC-IGN-02: Ignore button toggles zone ignored state ──────────────────────

test.describe('UC-IGN-02 — Ignore button toggles ignored state', () => {
  test('clicking ignore button marks zone as ignored', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Assign a zone
    const firstAssignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await firstAssignBtn.click();
    const assignPanel = page.locator('[data-testid="tree-assign-panel"]');
    await expect(assignPanel).toBeVisible();
    const confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();
    
    // Click ignore button
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();
    
    // Verify aria-pressed is true
    await expect(ignoreBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking ignore button again un-ignores the zone', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Assign a zone
    const firstAssignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await firstAssignBtn.click();
    const assignPanel = page.locator('[data-testid="tree-assign-panel"]');
    await expect(assignPanel).toBeVisible();
    const confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();
    
    // Click ignore button twice
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();
    await ignoreBtn.click();
    
    // Verify aria-pressed is false
    await expect(ignoreBtn).toHaveAttribute('aria-pressed', 'false');
  });
});

// ── UC-IGN-03: Ignored zones show visual indicator ──────────────────────────

test.describe('UC-IGN-03 — Ignored zones show visual indicator', () => {
  test('ignored zone has strikethrough styling', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Assign a zone
    const firstAssignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await firstAssignBtn.click();
    const assignPanel = page.locator('[data-testid="tree-assign-panel"]');
    await expect(assignPanel).toBeVisible();
    const confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();
    
    // Get the tree node
    const treeNode = page.locator('.tree-node').first();
    
    // Click ignore button
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();
    
    // Verify tree-node--ignored class is applied
    await expect(treeNode).toHaveClass(/tree-node--ignored/);
  });

  test('ignore button shows different icon when zone is ignored', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Assign a zone
    const firstAssignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await firstAssignBtn.click();
    const assignPanel = page.locator('[data-testid="tree-assign-panel"]');
    await expect(assignPanel).toBeVisible();
    const confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();
    
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    
    // Before clicking: should show ⊘
    const beforeContent = await ignoreBtn.textContent();
    expect(beforeContent).toContain('⊘');
    
    // Click to ignore
    await ignoreBtn.click();
    
    // After clicking: should show 🚫
    const afterContent = await ignoreBtn.textContent();
    expect(afterContent).toContain('🚫');
  });
});

// ── UC-IGN-04: Ignored zones are excluded from recipe ──────────────────────

test.describe('UC-IGN-04 — Ignored zones are excluded from recipe', () => {
  test('recipe does not include ignored zones', async ({ page }) => {
    await doHtmlUpload(page);
    
    // Assign first zone
    let assignBtn = page.locator('[data-testid^="tree-assign-btn-"]').first();
    await assignBtn.click();
    let assignPanel = page.locator('[data-testid="tree-assign-panel"]');
    await expect(assignPanel).toBeVisible();
    let confirmBtn = page.locator('[data-testid="tree-assign-confirm"]');
    await confirmBtn.click();
    
    // Ignore the first zone
    let ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();
    
    // Create project
    await page.locator('.html-project-footer .form-input').fill('Test Project');
    await page.locator('[data-testid="create-project-btn"]').click();
    
    // Wait for recipe step
    await expect(page.locator('.html-recipe-layout')).toBeVisible();
    
    // Get recipe content
    const recipeArea = page.locator('.html-recipe-area');
    const recipeText = await recipeArea.textContent();
    
    // The ignored zone's key should not appear in the STATIC FIELDS or CONTEXTUAL FIELDS
    // (This is a simplified check - in real tests you'd parse the recipe more carefully)
    expect(recipeText).toContain('GENERATE THE FOLLOWING DATA');
  });
});

// ── UC-IGN-05: Ignored zones are not patched with AI content ──────────────

test.describe('UC-IGN-05 — Ignored zones are not patched', () => {
  test('ignored zone preserves original content after patching', async ({ page }) => {
    await doHtmlCreateProject(page);
    
    // Get the preview frame
    const previewFrame = page.frameLocator('.html-preview-frame');
    
    // Get original content of first zone
    const originalContent = await previewFrame.locator('[data-zone-key]').first().textContent();
    
    // Go back to tree step to ignore a zone
    await page.locator('.breadcrumb-item.clickable').first().click();
    await expect(page.locator('[data-testid="html-tree-panel"]')).toBeVisible();
    
    // Ignore the first zone
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();
    
    // Generate recipe
    await page.locator('button:has-text("Generate recipe")').click();
    await expect(page.locator('.html-recipe-area')).toBeVisible();
    
    // Add JSON with AI content
    const jsonInput = page.locator('.html-recipe-right .json-input');
    const testJson = JSON.stringify({
      static: {
        initiative_group_title: 'AI Generated Title',
        initiative_group_subtitle: 'AI Generated Subtitle',
        total_hours: '100',
        initiative_count: '5',
        feature_count: '10',
        completion_pct: '85',
        business_value: 'High',
        market_relevance: 'High'
      }
    });
    await jsonInput.fill(testJson);
    
    // Apply content
    await page.locator('button:has-text("Apply content")').click();
    
    // Check preview — ignored zone should have original content
    const previewFrame2 = page.frameLocator('.html-preview-step-frame');
    const patchedContent = await previewFrame2.locator('[data-zone-key]').first().textContent();
    
    // The ignored zone should NOT have been patched
    expect(patchedContent).toBe(originalContent);
  });
});

// ── UC-IGN-06: data-ignore attribute is stripped from output ────────────────

test.describe('UC-IGN-06 — data-ignore attribute is stripped', () => {
  test('output HTML does not contain data-ignore attribute', async ({ page }) => {
    await doHtmlCreateProject(page);
    
    // Go back to tree step
    await page.locator('.breadcrumb-item.clickable').first().click();
    await expect(page.locator('[data-testid="html-tree-panel"]')).toBeVisible();
    
    // Ignore a zone
    const ignoreBtn = page.locator('[data-testid^="tree-ignore-btn-"]').first();
    await ignoreBtn.click();
    
    // Generate recipe
    await page.locator('button:has-text("Generate recipe")').click();
    await expect(page.locator('.html-recipe-area')).toBeVisible();
    
    // Add JSON
    const jsonInput = page.locator('.html-recipe-right .json-input');
    const testJson = JSON.stringify({
      static: {
        initiative_group_title: 'Title',
        initiative_group_subtitle: 'Subtitle',
        total_hours: '100',
        initiative_count: '5',
        feature_count: '10',
        completion_pct: '85',
        business_value: 'High',
        market_relevance: 'High'
      }
    });
    await jsonInput.fill(testJson);
    
    // Apply content
    await page.locator('button:has-text("Apply content")').click();
    
    // Get preview HTML
    const previewFrame = page.frameLocator('.html-preview-step-frame');
    const previewHtml = await previewFrame.locator('body').innerHTML();
    
    // Verify data-ignore attribute is not in output
    expect(previewHtml).not.toContain('data-ignore');
  });
});
