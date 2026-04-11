/**
 * Patch table spec — fully inline editing.
 *
 * Starts from: both elements tagged (taggedPage fixture).
 * Columns: AI toggle | Key (input) | Hint (input, AI only) | Max (number input)
 * No modal is opened from the table — all changes happen inline.
 */

import { test, expect, SEL } from './fixtures.js';

// ── Visibility ────────────────────────────────────────────────────────────────

test.describe('Patch table — visibility', () => {
  test('initiative_group key is visible in the key input', async ({ taggedPage: page }) => {
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-key-input')).toHaveValue('initiative_group');
  });

  test('initiative_group_subheader key is visible in the key input', async ({ taggedPage: page }) => {
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-key-input')).toHaveValue('initiative_group_subheader');
  });
});

// ── AI toggle ─────────────────────────────────────────────────────────────────

test.describe('Patch table — AI toggle', () => {
  test('both rows start with AI enabled', async ({ taggedPage: page }) => {
    await expect(page.locator('.patch-row[data-key="initiative_group"] input[type="checkbox"]')).toBeChecked();
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] input[type="checkbox"]')).toBeChecked();
  });

  test('disabling AI on a row hides the hint input for that row', async ({ taggedPage: page }) => {
    await page.locator('.patch-row[data-key="initiative_group"] .toggle-switch').click();
    // Only second row still has a hint input
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-hint-input')).toHaveCount(1);
  });

  test('re-enabling AI on a row shows the hint input again', async ({ taggedPage: page }) => {
    const toggle = page.locator('.patch-row[data-key="initiative_group"] .toggle-switch');
    await toggle.click();
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-hint-input')).toHaveCount(1);
    await toggle.click();
    await expect(page.locator('.patch-row .patch-hint-input')).toHaveCount(2);
  });
});

// ── Inline key editing ────────────────────────────────────────────────────────

test.describe('Patch table — inline key editing', () => {
  test('key inputs are pre-filled with the tag keys', async ({ taggedPage: page }) => {
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-key-input')).toHaveValue('initiative_group');
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-key-input')).toHaveValue('initiative_group_subheader');
  });

  test('changing the key inline updates the input value immediately', async ({ taggedPage: page }) => {
    const keyInput = page.locator(SEL.patchKeyInput).first();
    await keyInput.fill('renamed_key');
    await expect(keyInput).toHaveValue('renamed_key');
  });

  test('changed key is reflected in the row data-key attribute', async ({ taggedPage: page }) => {
    const keyInput = page.locator(SEL.patchKeyInput).first();
    await keyInput.fill('renamed_key');
    const row = page.locator(SEL.patchRows).first();
    await expect(row).toHaveAttribute('data-key', 'renamed_key');
  });

  test('changing key inline does not open a modal', async ({ taggedPage: page }) => {
    await page.locator(SEL.patchKeyInput).first().fill('no_modal_key');
    await expect(page.locator(SEL.modal)).not.toBeVisible();
  });

  test('changed key persists after switching slides and returning', async ({ taggedPage: page }) => {
    await page.locator(SEL.patchKeyInput).first().fill('persistent_key');
    await page.locator(SEL.slideThumb(1)).click();
    await page.locator(SEL.slideThumb(2)).click();
    await expect(page.locator(SEL.patchKeyInput).first()).toHaveValue('persistent_key');
  });
});

// ── Inline hint editing ───────────────────────────────────────────────────────

test.describe('Patch table — inline hint editing', () => {
  test('hint inputs are pre-filled when AI is on', async ({ taggedPage: page }) => {
    await expect(page.locator(SEL.hintInput).first()).toHaveValue('Title of the initiative group');
    await expect(page.locator(SEL.hintInput).nth(1)).toHaveValue('subheader of initiative group');
  });

  test('editing the hint inline updates the value without opening a modal', async ({ taggedPage: page }) => {
    await page.locator(SEL.hintInput).first().fill('Updated hint');
    await expect(page.locator(SEL.hintInput).first()).toHaveValue('Updated hint');
    await expect(page.locator(SEL.modal)).not.toBeVisible();
  });

  test('hint persists after switching slides and returning', async ({ taggedPage: page }) => {
    await page.locator(SEL.hintInput).first().fill('Persistent hint');
    await page.locator(SEL.slideThumb(1)).click();
    await page.locator(SEL.slideThumb(2)).click();
    await expect(page.locator(SEL.hintInput).first()).toHaveValue('Persistent hint');
  });
});

// ── Inline max chars editing ──────────────────────────────────────────────────

test.describe('Patch table — inline max chars editing', () => {
  test('max inputs are visible for both rows', async ({ taggedPage: page }) => {
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-max-input')).toBeVisible();
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-max-input')).toBeVisible();
  });

  test('setting max chars inline is reflected immediately in the input', async ({ taggedPage: page }) => {
    const maxInput = page.locator('.patch-row[data-key="initiative_group"] .patch-max-input');
    await maxInput.fill('80');
    await expect(maxInput).toHaveValue('80');
  });

  test('setting max chars inline does not open a modal', async ({ taggedPage: page }) => {
    await page.locator('.patch-row[data-key="initiative_group"] .patch-max-input').fill('60');
    await expect(page.locator(SEL.modal)).not.toBeVisible();
  });

  test('max chars persist after switching slides and returning', async ({ taggedPage: page }) => {
    await page.locator('.patch-row[data-key="initiative_group"] .patch-max-input').fill('120');
    await page.locator(SEL.slideThumb(1)).click();
    await page.locator(SEL.slideThumb(2)).click();
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-max-input')).toHaveValue('120');
  });
});
