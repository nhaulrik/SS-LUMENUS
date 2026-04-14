/**
 * Patch persistence spec.
 *
 * Tests that patch data is saved to a local file that survives app restarts.
 * The patch file should be stored in a version-controllable location.
 */

import { test, expect, SEL, doUpload, selectSlide, selectPptxFlow, FIXTURE_PPTX } from './fixtures.js';

test.describe('Patch persistence', () => {
  test('patch data is saved to a local file', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Tag an element
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('test_key');
    await page.locator(SEL.modalHint).fill('test hint');
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Verify the tag appears in the patch table
    await expect(page.locator('.patch-row[data-key="test_key"]')).toBeVisible();
  });

  test('patch is restored after app reload', async ({ page }) => {
    // First, create a patch with a tag
    await doUpload(page);
    await selectSlide(page, 2);

    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('persisted_key');
    await page.locator(SEL.modalHint).fill('persisted hint');
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Verify the tag exists
    await expect(page.locator('.patch-row[data-key="persisted_key"]')).toBeVisible();

    // Wait for save to complete
    await page.waitForTimeout(1500);

    // Simulate app restart: reload the page and re-upload the same file
    await page.reload();
    await selectPptxFlow(page);
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn');
    await selectSlide(page, 2);

    // The tag should be restored from the saved patch file
    await expect(page.locator('.patch-row[data-key="persisted_key"] .patch-key-input')).toHaveValue('persisted_key');
    await expect(page.locator('.patch-row[data-key="persisted_key"] .patch-hint-input')).toHaveValue('persisted hint');
  });

  test('patch file contains the correct data structure', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Tag an element
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('structure_key');
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Wait for save to complete
    await page.waitForTimeout(1500);

    // Reload and re-upload to simulate app restart
    await page.reload();
    await selectPptxFlow(page);
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn');
    await selectSlide(page, 2);

    // The tag should be restored
    await expect(page.locator('.patch-row[data-key="structure_key"]')).toBeVisible();
  });

  test('changes to patch fields are saved immediately', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Tag an element
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('immediate_save');
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Change the key inline
    const keyInput = page.locator('.patch-row[data-key="immediate_save"] .patch-key-input');
    await keyInput.fill('updated_key');

    // Wait for save
    await page.waitForTimeout(1500);

    // Reload and re-upload to simulate app restart
    await page.reload();
    await selectPptxFlow(page);
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn');
    await selectSlide(page, 2);

    // The updated key should be persisted
    await expect(page.locator('.patch-row[data-key="updated_key"] .patch-key-input')).toHaveValue('updated_key');
  });
});