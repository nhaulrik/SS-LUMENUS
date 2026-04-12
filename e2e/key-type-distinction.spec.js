/**
 * Test suite for key type distinction in patch table.
 * Distinguishes between auto-generated (original) keys and user-defined keys.
 */

import { test, expect, SEL, selectSlide } from './fixtures.js';

test.describe('Patch table — key type distinction', () => {
  
  test('original keys have grey styling when key matches keyGen(originalText)', async ({ uploadedPage: page }) => {
    // Select slide 2 which has "Core Revenue Management"
    await selectSlide(page, 2);
    
    // Tag element - using key that matches keyGen(originalText)
    // originalText "Core Revenue Management" -> keyGen -> "core_revenue_management"
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.waitForSelector(SEL.modal);
    await page.locator(SEL.modalKey).fill('core_revenue_management'); // matches keyGen!
    await page.locator(SEL.modalHint).fill('test hint');
    await page.locator(SEL.modalSave).click();
    await page.waitForSelector(SEL.modal, { state: 'detached' });
    await page.waitForTimeout(500);

    // Should be original (grey) - check the specific row by key
    const row = page.locator('.patch-row[data-key="core_revenue_management"]');
    await expect(row).toHaveClass(/key-original/);
  });

  test('user-defined keys have green styling when key differs from keyGen(originalText)', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    
    // Tag with a custom key that doesn't match keyGen
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.waitForSelector(SEL.modal);
    await page.locator(SEL.modalKey).fill('custom_initiative_key'); // different from auto-generated
    await page.locator(SEL.modalHint).fill('test hint');
    await page.locator(SEL.modalSave).click();
    await page.waitForSelector(SEL.modal, { state: 'detached' });
    await page.waitForTimeout(500);

    // Should be user-defined (green) - check the specific row by key
    const row = page.locator('.patch-row[data-key="custom_initiative_key"]');
    await expect(row).toHaveClass(/key-user-defined/);
  });

  test('changing key to match keyGen makes it original (grey)', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    
    // Tag with user-defined key
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.waitForSelector(SEL.modal);
    await page.locator(SEL.modalKey).fill('core_revenue_management'); // start with auto-generated key (will be original)
    await page.locator(SEL.modalHint).fill('test hint');
    await page.locator(SEL.modalSave).click();
    await page.waitForSelector(SEL.modal, { state: 'detached' });
    await page.waitForTimeout(500);

    // Verify it's original (grey) - key matches keyGen(originalText)
    let row = page.locator('.patch-row[data-key="core_revenue_management"]');
    await expect(row).toBeVisible();
    await expect(row).toHaveClass(/key-original/);
    
    // Now test the reverse: edit via modal and use a different key (will be user-defined)
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.waitForSelector(SEL.modal);
    await page.locator(SEL.modalKey).fill('changed_key');
    await page.locator(SEL.modalSave).click();
    await page.waitForSelector(SEL.modal, { state: 'detached' });
    await page.waitForTimeout(500);

    // Should now be user-defined (green)
    row = page.locator('.patch-row[data-key="changed_key"]');
    await expect(row).toHaveClass(/key-user-defined/);
  });

  test('changing key away from original makes it user-defined (green)', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    
    // Tag with matching key (original)
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.waitForSelector(SEL.modal);
    await page.locator(SEL.modalKey).fill('core_revenue_management');
    await page.locator(SEL.modalHint).fill('test hint');
    await page.locator(SEL.modalSave).click();
    await page.waitForSelector(SEL.modal, { state: 'detached' });
    await page.waitForTimeout(500);

    // Verify it's original
    let firstRow = page.locator('.patch-row').first();
    await expect(firstRow).toHaveClass(/key-original/);

    // Change to user-defined
    await firstRow.locator(SEL.patchKeyInput).fill('changed_key');
    await firstRow.locator(SEL.patchKeyInput).press('Enter');
    await page.waitForTimeout(500);

    // Re-get the first row - it should now be user-defined
    firstRow = page.locator('.patch-row').first();
    await expect(firstRow).toHaveClass(/key-user-defined/);
  });

  test('key type persists after slide navigation', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    
    // Tag with user-defined key
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.waitForSelector(SEL.modal);
    await page.locator(SEL.modalKey).fill('persistent_key');
    await page.locator(SEL.modalHint).fill('test hint');
    await page.locator(SEL.modalSave).click();
    await page.waitForSelector(SEL.modal, { state: 'detached' });
    await page.waitForTimeout(500);

    // Verify it's user-defined - check by specific key
    let row = page.locator('.patch-row[data-key="persistent_key"]');
    await expect(row).toHaveClass(/key-user-defined/);

    // Navigate away and back
    await selectSlide(page, 1);
    await page.waitForTimeout(300);
    await selectSlide(page, 2);
    await page.waitForTimeout(300);

    // Should still be user-defined - check by specific key
    row = page.locator('.patch-row[data-key="persistent_key"]');
    await expect(row).toHaveClass(/key-user-defined/);
  });
});