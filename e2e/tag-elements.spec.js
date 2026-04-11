/**
 * Element tagging spec.
 *
 * Starts from: slide 2 selected and configured as repeatable (repeatablePage fixture).
 * Tests: clicking overlay elements opens the modal, modal values are saved correctly,
 *        the overlay element reflects the tagged state after saving.
 *
 * Selectors use data-text (stable) not title (changes to key after tagging).
 */

import { test, expect, SEL, tagElement } from './fixtures.js';

test.describe('Tagging elements via overlay modal', () => {
  test('clicking a slide element opens the tag modal', async ({ repeatablePage: page }) => {
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await expect(page.locator(SEL.modal)).toContainText('Core Revenue Management');
  });

  test('modal cancel closes without tagging the element', async ({ repeatablePage: page }) => {
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await page.locator(SEL.modal).locator('button:has-text("Cancel")').click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();
    await expect(page.locator(SEL.overlayByText('Core Revenue Management'))).not.toHaveClass(/tagged/);
  });

  test('tagging "Core Revenue Management" marks the overlay as tagged', async ({ repeatablePage: page }) => {
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key:          'initiative_group',
      hint:         'Title of the initiative group'
    });
    await expect(page.locator(SEL.overlayByText('Core Revenue Management'))).toHaveClass(/tagged/);
  });

  test('tagging "Group Summary…" marks that overlay as tagged', async ({ repeatablePage: page }) => {
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key:          'initiative_group',
      hint:         'Title of the initiative group'
    });
    await tagElement(page, {
      originalText: 'Group Summary | Roadmap Initiative Overview',
      key:          'initiative_group_subheader',
      hint:         'subheader of initiative group'
    });
    await expect(page.locator(SEL.overlayByText('Group Summary | Roadmap Initiative Overview'))).toHaveClass(/tagged/);
  });

  test('re-opening a tagged element pre-fills the modal with saved values', async ({ repeatablePage: page }) => {
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key:          'initiative_group',
      hint:         'Title of the initiative group'
    });
    // data-text stays as original text even after tagging
    await page.locator(SEL.overlayByText('Core Revenue Management')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await expect(page.locator(SEL.modalKey)).toHaveValue('initiative_group');
    await expect(page.locator(SEL.modalHint)).toHaveValue('Title of the initiative group');
    await expect(page.locator(SEL.modalAI)).toBeChecked();
  });
});
