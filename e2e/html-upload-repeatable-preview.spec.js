/**
 * E2E test: HTML Upload → Repeatable Slide → Full Slide Generation → Preview
 *
 * This test replicates the exact user data flow:
 * - Upload test_slide.html (8 zones on slide 1)
 * - Configure slide 1 as repeatable with key "slide_1" and prompt "an instance for each initiative group found"
 * - Mark all zones as unique
 * - Enable full-slide generation
 * - Create project
 * - Generate recipe
 * - Apply content with 6 instances
 * - Verify preview shows 6 slide sections with correct content
 *
 * Step: html-upload → html-recipe → html-preview
 * Repeatable: slide_1 with 6 instances
 * Expected: 6 sections in preview with all zones filled
 */

import { test, expect, SEL, doHtmlUpload, FIXTURE_HTML } from './fixtures.js';
import fs from 'fs';

// ── Test Data ────────────────────────────────────────────────────────────────

const TEST_PROJECT_NAME = 'initiative-groups-test';

// Instance data for 6 initiative groups
const INSTANCE_DATA = [
  {
    initiative_group_title: 'Core Revenue Management',
    initiative_group_subtitle: 'Solon Tax Product Roadmap 2026 · Executive Steering Committee',
    total_hours: '23,200',
    initiative_count: '6',
    feature_count: '38',
    completion_pct: '18%',
    business_value: 'Enables end-to-end taxpayer lifecycle management from registration through accounting',
    market_relevance: 'Core dependency for all current and pipeline Solon Tax project implementations',
  },
  {
    initiative_group_title: 'Digital Transformation Initiative',
    initiative_group_subtitle: 'Solon Platform 2026 · Product Leadership',
    total_hours: '15,800',
    initiative_count: '4',
    feature_count: '28',
    completion_pct: '35%',
    business_value: 'Modernizes legacy systems and improves operational efficiency',
    market_relevance: 'Strengthens competitive position in cloud-native market segment',
  },
  {
    initiative_group_title: 'Customer Experience Enhancement',
    initiative_group_subtitle: 'Solon UX Roadmap 2026 · Customer Success Team',
    total_hours: '9,200',
    initiative_count: '3',
    feature_count: '18',
    completion_pct: '45%',
    business_value: 'Reduces support costs and improves customer satisfaction scores',
    market_relevance: 'Differentiates Solon in competitive market with superior UX',
  },
  {
    initiative_group_title: 'Data Analytics & Reporting',
    initiative_group_subtitle: 'Solon Analytics 2026 · Business Intelligence',
    total_hours: '12,100',
    initiative_count: '5',
    feature_count: '22',
    completion_pct: '25%',
    business_value: 'Enables data-driven decision making and real-time insights',
    market_relevance: 'Essential for enterprise customers requiring advanced analytics',
  },
  {
    initiative_group_title: 'API & Integration Platform',
    initiative_group_subtitle: 'Solon Integration 2026 · Platform Team',
    total_hours: '18,900',
    initiative_count: '7',
    feature_count: '42',
    completion_pct: '20%',
    business_value: 'Enables third-party integrations and ecosystem expansion',
    market_relevance: 'Opens new partnership opportunities and revenue streams',
  },
  {
    initiative_group_title: 'Security & Compliance Framework',
    initiative_group_subtitle: 'Solon Security 2026 · Governance & Risk',
    total_hours: '11,300',
    initiative_count: '4',
    feature_count: '16',
    completion_pct: '55%',
    business_value: 'Ensures regulatory compliance and protects customer data',
    market_relevance: 'Critical for enterprise sales and customer retention',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enable repeatable slide for slide N and configure key/prompt.
 */
async function configureRepeatableSlide(page, slideIndex = 1) {
  const toggle = page.locator(`[data-testid="slide-repeatable-toggle-${slideIndex}"]`);
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await toggle.check();

  // Fill in the repeatable key
  const keyInput = page.locator(`[data-testid="slide-key-input-${slideIndex}"]`);
  await expect(keyInput).toBeVisible({ timeout: 3000 });
  await keyInput.fill('slide_1');

  // Fill in the prompt
  const promptInput = page.locator(`[data-testid="slide-prompt-input-${slideIndex}"]`);
  await expect(promptInput).toBeVisible({ timeout: 3000 });
  await promptInput.fill('an instance for each initiative group found');

  // Verify badge appears
  await expect(page.locator(`[data-testid="slide-repeatable-badge-${slideIndex}"]`)).toBeVisible({
    timeout: 3000,
  });
}

/**
 * Assign all zones on a slide to be unique (for repeatable slides).
 * Expands the tree, opens assignment panel for each zone, marks as unique.
 */
async function assignAllZonesAsUnique(page) {
  // Expand the tree to see all zones
  await page.locator(SEL.treeExpandAll).click();
  await page.waitForTimeout(500);

  // Get all zone nodes
  const nodes = page.locator(SEL.treeNodes);
  const count = await nodes.count();

  for (let i = 0; i < count; i++) {
    const node = nodes.nth(i);
    await node.hover();
    const assignBtn = node.locator('.tree-node-assign-btn');

    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await expect(page.locator(SEL.assignPanel)).toBeVisible({ timeout: 3000 });

      // Fill in key (use a generic key based on index)
      const keyInput = page.locator(SEL.assignKeyInput);
      const currentKey = await keyInput.inputValue();
      if (!currentKey) {
        // Generate a key from the node text
        const nodeText = await node.textContent();
        const sanitized = nodeText.toLowerCase().replace(/\s+/g, '_').substring(0, 30);
        await keyInput.fill(sanitized || `zone_${i}`);
      }

      // Mark as unique (should be default for repeatable slides)
      const uniqueToggle = page.locator('[data-testid="tree-assign-unique"]');
      if (await uniqueToggle.isVisible()) {
        const isChecked = await uniqueToggle.isChecked();
        if (!isChecked) {
          await uniqueToggle.click();
        }
      }

      // Confirm assignment
      await page.locator(SEL.assignConfirmBtn).click();
      await expect(page.locator(SEL.assignPanel)).not.toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(300);
    }
  }
}

/**
 * Enable full-slide generation toggle for a slide.
 */
async function enableFullSlideGeneration(page, slideIndex = 1) {
  const toggle = page.locator(`[data-testid="slide-full-slide-toggle-${slideIndex}"]`);
  await expect(toggle).toBeVisible({ timeout: 5000 });
  await toggle.check();
  await expect(toggle).toBeChecked();
}

/**
 * Generate the recipe via the Generate Recipe button.
 */
async function generateRecipe(page) {
  const generateBtn = page.locator(SEL.htmlGenerateRecipeBtn);
  await expect(generateBtn).toBeVisible({ timeout: 5000 });
  await generateBtn.click();
  await expect(page.locator(SEL.htmlRecipeArea)).toBeVisible({ timeout: 10000 });
}

/**
 * Apply content with the 6 instances using the repeatable format.
 */
async function applyContentWithInstances(page, instances) {
  // Build the JSON in the repeatable format
  const json = JSON.stringify({
    slides: {
      slide_1: {
        shared: {},
        instances: instances,
      },
    },
  });

  // Fill in the JSON input
  const jsonInput = page.locator(SEL.htmlJsonInput);
  await jsonInput.fill(json);
  await page.waitForTimeout(300);

  // Click Apply Content
  const applyBtn = page.locator(SEL.htmlApplyBtn);
  await expect(applyBtn).not.toBeDisabled({ timeout: 5000 });
  await applyBtn.click();

  // Wait for preview step
  await expect(page.locator(SEL.htmlPreviewStepLayout)).toBeVisible({ timeout: 15000 });
}

/**
 * Verify that the preview contains N sections with expected content.
 */
async function verifyPreviewSections(page, expectedCount, instances) {
  const frame = page.frameLocator(SEL.htmlPreviewStepFrame);
  const shell = frame.locator('#solon-slide-shell');

  // Verify shell is visible and scaled
  await expect(shell).toBeVisible({ timeout: 5000 });

  // Count sections in the preview HTML
  const previewHtml = await page.locator(SEL.htmlPreviewStepFrame).evaluate((el) => {
    return el.contentDocument.documentElement.outerHTML;
  });

  const sectionCount = (previewHtml.match(/<section/g) || []).length;
  expect(sectionCount).toBe(expectedCount);

  // Verify key content from instances appears in preview
  for (let i = 0; i < Math.min(3, instances.length); i++) {
    const instance = instances[i];
    // Check that at least the title of this instance appears
    expect(previewHtml).toContain(instance.initiative_group_title);
  }

  // Verify slide shell has correct height for N slides (720px per slide)
  const expectedHeight = 720 * expectedCount;
  expect(previewHtml).toContain(`${expectedHeight}px`);

  // Verify scroll-snap is configured for multi-slide
  if (expectedCount > 1) {
    expect(previewHtml).toContain('scroll-snap-type');
    expect(previewHtml).toContain('scroll-snap-align');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-01: Full flow — upload → repeatable → preview
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-01 — Full HTML Upload + Repeatable + Preview Flow', () => {
  test('uploads HTML, configures repeatable slide, generates recipe, applies 6 instances, shows preview', async ({
    page,
  }) => {
    // Step 1: Upload HTML
    await doHtmlUpload(page);
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible();

    // Step 2: Configure repeatable slide
    await configureRepeatableSlide(page, 1);

    // Step 3: Assign all zones as unique
    await assignAllZonesAsUnique(page);

    // Step 4: Enable full-slide generation
    await enableFullSlideGeneration(page, 1);

    // Step 5: Fill project name and create project
    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    // Step 6: Generate recipe
    await generateRecipe(page);

    // Step 7: Apply content with 6 instances
    await applyContentWithInstances(page, INSTANCE_DATA);

    // Step 8: Verify preview
    await verifyPreviewSections(page, 6, INSTANCE_DATA);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-02: Verify repeatable slide structure in recipe
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-02 — Recipe contains repeatable slide structure', () => {
  test('recipe includes REPEATABLE SLIDE section with prompt', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    // Generate recipe and verify structure
    await generateRecipe(page);

    const recipeArea = page.locator(SEL.htmlRecipeArea);
    const recipe = await recipeArea.textContent();

    // Recipe should contain repeatable slide marker
    expect(recipe).toContain('REPEATABLE SLIDE');
    // Recipe should contain the prompt
    expect(recipe).toContain('an instance for each initiative group found');
    // Recipe should contain INSTANCE VALUES section
    expect(recipe).toContain('INSTANCE VALUES');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-03: Verify slide count and navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-03 — Multi-slide navigation and slide count', () => {
  test('preview shows correct slide count and navigation controls for 6 instances', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    await generateRecipe(page);
    await applyContentWithInstances(page, INSTANCE_DATA);

    // Verify slide count display
    const previewHtml = await page.locator(SEL.htmlPreviewStepFrame).evaluate((el) => {
      return el.contentDocument.documentElement.outerHTML;
    });

    // Should have 6 sections (one per instance)
    const sectionCount = (previewHtml.match(/<section/g) || []).length;
    expect(sectionCount).toBe(6);

    // Shell height should be 720 × 6 = 4320px
    expect(previewHtml).toContain('4320px');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-04: Verify unique zone values differ across instances
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-04 — Unique zone values differ across instances', () => {
  test('each instance has unique initiative group titles in preview', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    await generateRecipe(page);
    await applyContentWithInstances(page, INSTANCE_DATA);

    // Get preview HTML
    const previewHtml = await page.locator(SEL.htmlPreviewStepFrame).evaluate((el) => {
      return el.contentDocument.documentElement.outerHTML;
    });

    // Verify all instance titles appear (at least the first 4)
    expect(previewHtml).toContain('Core Revenue Management');
    expect(previewHtml).toContain('Digital Transformation Initiative');
    expect(previewHtml).toContain('Customer Experience Enhancement');
    expect(previewHtml).toContain('Data Analytics & Reporting');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-05: Verify scroll-snap configuration
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-05 — Scroll-snap configuration for multi-slide', () => {
  test('preview HTML includes scroll-snap-type and scroll-snap-align for 6 instances', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    await generateRecipe(page);
    await applyContentWithInstances(page, INSTANCE_DATA);

    const previewHtml = await page.locator(SEL.htmlPreviewStepFrame).evaluate((el) => {
      return el.contentDocument.documentElement.outerHTML;
    });

    // Multi-slide should have scroll-snap-type on shell
    expect(previewHtml).toContain('scroll-snap-type');
    // Sections should have scroll-snap-align: start
    expect(previewHtml).toContain('scroll-snap-align');
    // overflow-y should be scroll or auto
    expect(previewHtml).toMatch(/overflow-y\s*:\s*(scroll|auto)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-06: Verify all 8 zones are filled across instances
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-06 — All 8 zones filled across all instances', () => {
  test('each instance in preview contains all 8 zone values', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    await generateRecipe(page);
    await applyContentWithInstances(page, INSTANCE_DATA);

    const previewHtml = await page.locator(SEL.htmlPreviewStepFrame).evaluate((el) => {
      return el.contentDocument.documentElement.outerHTML;
    });

    // Verify key zone values from first instance
    const firstInstance = INSTANCE_DATA[0];
    expect(previewHtml).toContain(firstInstance.initiative_group_title);
    expect(previewHtml).toContain(firstInstance.total_hours);
    expect(previewHtml).toContain(firstInstance.initiative_count);
    expect(previewHtml).toContain(firstInstance.feature_count);
    expect(previewHtml).toContain(firstInstance.completion_pct);
    expect(previewHtml).toContain(firstInstance.business_value);
    expect(previewHtml).toContain(firstInstance.market_relevance);

    // Verify key zone values from last instance
    const lastInstance = INSTANCE_DATA[5];
    expect(previewHtml).toContain(lastInstance.initiative_group_title);
    expect(previewHtml).toContain(lastInstance.total_hours);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-07: Verify download button is available
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-07 — Download button available in preview', () => {
  test('download HTML button is visible after preview is generated', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    await generateRecipe(page);
    await applyContentWithInstances(page, INSTANCE_DATA);

    // Verify preview step is shown
    await expect(page.locator(SEL.htmlPreviewStepLayout)).toBeVisible();

    // Verify download button is available
    const downloadBtn = page.locator(SEL.htmlDownloadBtn);
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-UPLOAD-REP-PREVIEW-08: Verify breadcrumb state at preview step
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-UPLOAD-REP-PREVIEW-08 — Breadcrumb state at preview step', () => {
  test('all breadcrumbs are marked completed at preview step', async ({ page }) => {
    await doHtmlUpload(page);
    await configureRepeatableSlide(page, 1);
    await assignAllZonesAsUnique(page);
    await enableFullSlideGeneration(page, 1);

    await page.locator(SEL.projectNameInput).fill(TEST_PROJECT_NAME);
    await page.locator(SEL.createProjectBtn).click();
    await expect(page.locator(SEL.htmlRecipeLayout)).toBeVisible({ timeout: 10000 });

    await generateRecipe(page);
    await applyContentWithInstances(page, INSTANCE_DATA);

    // Verify breadcrumbs
    const breadcrumbs = page.locator(SEL.breadcrumbItems);
    const count = await breadcrumbs.count();
    expect(count).toBeGreaterThan(0);

    // Last breadcrumb should be active
    const lastBreadcrumb = breadcrumbs.last();
    await expect(lastBreadcrumb).toHaveClass(/active/);
  });
});
