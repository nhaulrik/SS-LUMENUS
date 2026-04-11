/**
 * Patch ordering spec.
 *
 * Tests that patch entries are ordered consistently based on their
 * element position in the PPTX, not alphabetically by key.
 */

import { test, expect, SEL, doUpload, selectSlide, tagElement } from './fixtures.js';

test.describe('Patch entry ordering', () => {
  test('tags are ordered by element position in PPTX, not alphabetically', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Verify we have at least one element to test with
    const rows = await page.locator('.patch-row').count();
    expect(rows).toBeGreaterThan(0);

    // Get all element IDs from the table
    const rowData = await page.locator('.patch-row').all();
    const elementIds = await Promise.all(rowData.map(async (row) => {
      const keyInput = row.locator('.patch-key-input');
      const elementId = await row.getAttribute('data-key') || await keyInput.inputValue();
      return elementId;
    }));

    // First tag should have elementId that comes first alphabetically (slide2-elem0, slide2-elem1, etc.)
    // The sample.pptx has elements with IDs starting from elem3, elem8, etc.
    // Sort a copy to check
    const sortedIds = [...elementIds].sort();
    
    // If they were sorted alphabetically, first element would match the sorted copy
    // We verify they're NOT sorted alphabetically by checking original order != sorted order
    const isAlphabetical = elementIds.every((id, idx) => id === sortedIds[idx]);
    expect(isAlphabetical).toBe(false);
  });

  test('tag order is consistent after reload', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Wait for save
    await page.waitForTimeout(1500);

    // Get order before reload
    const rowsBefore = await page.locator('.patch-row').all();
    const keysBefore = await Promise.all(rowsBefore.map(r => 
      r.locator('.patch-key-input').inputValue()
    ));

    // Reload and re-upload
    await page.reload();
    await doUpload(page);
    await selectSlide(page, 2);

    // Get order after reload
    const rowsAfter = await page.locator('.patch-row').all();
    const keysAfter = await Promise.all(rowsAfter.map(r => 
      r.locator('.patch-key-input').inputValue()
    ));

    // Order should be the same
    expect(keysAfter).toEqual(keysBefore);
  });

  test('tag order is consistent when switching slides', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Get keys on slide 2
    const slide2Rows = await page.locator('.patch-row').all();
    const slide2Keys = await Promise.all(slide2Rows.map(r => 
      r.locator('.patch-key-input').inputValue()
    ));

    // Go to slide 3 and back
    await selectSlide(page, 3);
    await selectSlide(page, 2);

    // Get keys on slide 2 again
    const slide2RowsAfter = await page.locator('.patch-row').all();
    const slide2KeysAfter = await Promise.all(slide2RowsAfter.map(r => 
      r.locator('.patch-key-input').inputValue()
    ));

    // Order should be the same
    expect(slide2KeysAfter).toEqual(slide2Keys);
  });
});