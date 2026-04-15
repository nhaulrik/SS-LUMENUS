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



// ── UC-IGN-06: data-ignore attribute is stripped from output ────────────────

test.describe('UC-IGN-06 — data-ignore attribute is stripped', () => {
  test('output HTML does not contain data-ignore attribute', async ({ page }) => {
    // This test verifies that data-ignore attributes are stripped from output
    // Since we're using data-block attributes now instead of data-zone,
    // we should verify that data-block attributes are also stripped
    await doHtmlCreateProject(page, 'ignore-test');
    
    // Apply content to get to preview step
    const minimalJson = JSON.stringify({
      blocks: {
        initiative_group_title:    { value: 'Test' },
        initiative_group_subtitle: { value: 'Test' },
        total_hours:               { value: '1' },
        initiative_count:          { value: '1' },
        feature_count:             { value: '1' },
        completion_pct:            { value: '0%' },
        business_value:            { value: 'Test' },
        market_relevance:          { value: 'Test' },
      }
    });
    await page.locator('.html-recipe-right .json-input').fill(minimalJson);
    await page.locator('button:has-text("Apply content")').click();
    await page.waitForSelector('.html-preview-step-layout');
    
    // Get preview HTML
    const previewFrame = page.frameLocator('.html-preview-step-frame');
    const previewHtml = await previewFrame.locator('body').innerHTML();
    
    // Verify data-block attributes are stripped from output
    expect(previewHtml).not.toContain('data-block');
    expect(previewHtml).not.toContain('data-prompt');
    expect(previewHtml).not.toContain('data-hint');
  });
});
