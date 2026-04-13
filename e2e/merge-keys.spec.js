/**
 * Merge keys spec.
 *
 * Tests the cross-slide key merge feature: when the same structural shape
 * is tagged on multiple slides with different keys, the merge icon lets
 * the user unify them under one key.
 *
 * Relies on sample.pptx where slides 2 and 3 are structural duplicates —
 * they share the same shape names (e.g. the "Core Revenue Management" text
 * box has the same OOXML shapeName on both slides).
 */

import { test, expect, SEL, doUpload, selectSlide, tagElement } from './fixtures.js';

// Tag the same shape on slides 2 and 3 with DIFFERENT keys
async function setupDifferentKeys(page) {
  await doUpload(page);

  await selectSlide(page, 2);
  await tagElement(page, {
    originalText: 'Core Revenue Management',
    key:          'revenue_slide2',
    hint:         'Revenue management title',
    ai:           true
  });

  await selectSlide(page, 3);
  await tagElement(page, {
    originalText: 'Core Revenue Management',
    key:          'revenue_slide3',
    hint:         'Revenue management title',
    ai:           true
  });

  // Return to slide 2 where we'll initiate the merge
  await selectSlide(page, 2);
}

// ── Merge icon visibility ─────────────────────────────────────────────────────

test.describe('Merge icon visibility', () => {
  test('merge icon appears when same shape is tagged with different keys on another slide', async ({ page }) => {
    await setupDifferentKeys(page);
    await expect(
      page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]')
    ).toBeVisible();
  });

  test('merge icon does not appear when the key is already shared (same key on both slides)', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'revenue', hint: 'Revenue', ai: true });
    await selectSlide(page, 3);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'revenue', hint: 'Revenue', ai: true });
    await selectSlide(page, 2);

    // Keys already match — no merge needed, icon should not appear
    await expect(
      page.locator('.patch-row[data-key="revenue"] [data-testid="merge-icon"]')
    ).toHaveCount(0);
  });

  test('merge icon does not appear when the shape only exists on one slide', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'revenue', hint: 'Revenue', ai: true });

    // Only tagged on slide 2 — no candidates on other slides
    await expect(
      page.locator('.patch-row[data-key="revenue"] [data-testid="merge-icon"]')
    ).toHaveCount(0);
  });
});

// ── Merge modal ───────────────────────────────────────────────────────────────

test.describe('Merge modal', () => {
  test('clicking merge icon opens the merge modal', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await expect(page.locator('.merge-modal')).toBeVisible();
  });

  test('modal shows the candidate from the other slide', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');

    // Slide 3's key should appear as a candidate
    await expect(page.locator('.merge-modal')).toContainText('revenue_slide3');
    await expect(page.locator('.merge-modal')).toContainText('3');
  });

  test('candidate is pre-checked when original text matches', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');

    // Text is identical on both slides → candidate should be pre-checked
    const checkbox = page.locator('.merge-candidate-item input[type="checkbox"]').first();
    await expect(checkbox).toBeChecked();
  });

  test('cancel closes modal without changing keys', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');
    await page.locator('.merge-modal .btn-secondary').click();

    await expect(page.locator('.merge-modal')).not.toBeVisible();
    // Keys unchanged
    await expect(page.locator('.patch-row[data-key="revenue_slide2"]')).toBeVisible();
    await selectSlide(page, 3);
    await expect(page.locator('.patch-row[data-key="revenue_slide3"]')).toBeVisible();
  });
});

// ── Merge action ──────────────────────────────────────────────────────────────

test.describe('Merge action', () => {
  test('confirming merge renames the other slide tag to the source key', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');
    await page.locator('[data-testid="merge-confirm"]').click();
    await page.waitForTimeout(1500); // debounce

    // Slide 3 should now have the same key as slide 2
    await selectSlide(page, 3);
    await expect(page.locator('.patch-row[data-key="revenue_slide2"]')).toBeVisible();
    await expect(page.locator('.patch-row[data-key="revenue_slide3"]')).toHaveCount(0);
  });

  test('after merge the propagate icon appears (keys are now shared)', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');
    await page.locator('[data-testid="merge-confirm"]').click();
    await page.waitForTimeout(1500);

    // The propagate icon should now be visible for the unified key
    await expect(
      page.locator('.patch-row[data-key="revenue_slide2"] .propagate-icon')
    ).toBeVisible();
  });

  test('after merge the merge icon disappears (no more differing candidates)', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');
    await page.locator('[data-testid="merge-confirm"]').click();
    await page.waitForTimeout(1500);

    // No more differing candidates — merge icon should be gone
    await expect(
      page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]')
    ).toHaveCount(0);
  });

  test('merged key appears as contextual field in the recipe', async ({ page }) => {
    await setupDifferentKeys(page);
    await page.locator('.patch-row[data-key="revenue_slide2"] [data-testid="merge-icon"]').click();
    await page.waitForSelector('.merge-modal');
    await page.locator('[data-testid="merge-confirm"]').click();
    await page.waitForTimeout(1500);

    await page.locator(SEL.generateRecipe).click();
    await page.waitForSelector(SEL.recipeArea);
    const recipe = await page.locator(SEL.recipeArea).innerText();

    expect(recipe).toContain('"contextual"');
    expect(recipe).toContain('"revenue_slide2"');
    expect(recipe).toContain('"slide_index": 2');
    expect(recipe).toContain('"slide_index": 3');
  });
});
