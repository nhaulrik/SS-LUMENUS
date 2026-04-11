/**
 * Repeatable slide configuration spec.
 *
 * Starts from: app on Tag step with sample.pptx loaded (uploadedPage fixture).
 * Tests: selecting slide 2, marking it repeatable, filling structure type + prompt.
 */

import { test, expect, SEL, selectSlide, configureRepeatable } from './fixtures.js';

test.describe('Repeatable slide configuration', () => {
  test('clicking slide 2 thumbnail makes it the active slide', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    const thumb = page.locator(SEL.slideThumb(2));
    await expect(thumb).toHaveClass(/active/);
  });

  test('the slide 2 header reflects the selected slide number', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    // The workspace panel heading reads "Slide 2"
    await expect(page.locator('.panel-section h3').first()).toContainText('Slide 2');
  });

  test('checking the Repeatable toggle reveals the config section', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    // Toggle twice to reset state if coming from previous test
    const isChecked = await page.locator(SEL.repeatableToggle).isChecked();
    if (isChecked) {
      await page.locator(SEL.repeatableToggle).uncheck();
    }
    await expect(page.locator('.repeatable-config')).not.toBeVisible();
    await page.locator(SEL.repeatableToggle).check();
    await expect(page.locator('.repeatable-config')).toBeVisible();
  });

  test('structure type is saved as entered', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    await configureRepeatable(page, {
      structureType: 'Initiatie Group',
      customPrompt:  'an instance for each initiative group'
    });
    await expect(page.locator(SEL.structureType)).toHaveValue('Initiatie Group');
  });

  test('custom prompt is saved as entered', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    await configureRepeatable(page, {
      structureType: 'Initiatie Group',
      customPrompt:  'an instance for each initiative group'
    });
    await expect(page.locator(SEL.customPrompt)).toHaveValue('an instance for each initiative group');
  });

  test('repeatable badge appears on slide 2 thumbnail after marking', async ({ uploadedPage: page }) => {
    await selectSlide(page, 2);
    await page.locator(SEL.repeatableToggle).check();
    // The slide thumbnail should carry the "record" style or active badge
    const thumb = page.locator(SEL.slideThumb(2));
    await expect(thumb).toHaveClass(/record/);
  });
});
