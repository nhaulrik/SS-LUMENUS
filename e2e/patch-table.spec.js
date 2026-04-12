/**
 * Patch table spec — fully inline editing.
 *
 * Starts from: both elements tagged (taggedPage fixture).
 * Columns: AI toggle | Key (input) | Hint (input, AI only) | Max (number input)
 * No modal is opened from the table — all changes happen inline.
 */

import { test, expect, SEL, selectSlide } from './fixtures.js';

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

  test('disabling AI on a row dims the hint for that row', async ({ taggedPage: page }) => {
    await page.locator('.patch-row[data-key="initiative_group"] .toggle-switch').click();
    // Hint row becomes inactive (dimmed) when AI is off
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-row-hint')).toHaveClass(/patch-row-hint--inactive/);
    // The other row is unaffected
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-row-hint')).not.toHaveClass(/patch-row-hint--inactive/);
  });

  test('re-enabling AI on a row restores the hint for that row', async ({ taggedPage: page }) => {
    const toggle = page.locator('.patch-row[data-key="initiative_group"] .toggle-switch');
    await toggle.click();
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-row-hint')).toHaveClass(/patch-row-hint--inactive/);
    await toggle.click();
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-row-hint')).not.toHaveClass(/patch-row-hint--inactive/);
  });

  test('toggling AI on a shared key propagates to all slides', async ({ propagatedPage: page }) => {
    await selectSlide(page, 2);
    await expect(page.locator('.patch-row[data-key="initiative_group"] input[type="checkbox"]')).toBeChecked();
    await selectSlide(page, 3);
    await expect(page.locator('.patch-row[data-key="initiative_group"] input[type="checkbox"]')).toBeChecked();

    await selectSlide(page, 2);
    await page.locator('.patch-row[data-key="initiative_group"] .toggle-switch').click();
    await page.waitForTimeout(100);

    await selectSlide(page, 3);
    await expect(page.locator('.patch-row[data-key="initiative_group"] input[type="checkbox"]')).not.toBeChecked();
  });

  test('propagate icon is hidden when AI toggle is off', async ({ propagatedPage: page }) => {
    await selectSlide(page, 2);
    // Verify propagate icon is visible when AI is on
    await expect(page.locator('.patch-row[data-key="initiative_group"] .propagate-icon')).toBeVisible();

    // Turn AI off
    await page.locator('.patch-row[data-key="initiative_group"] .toggle-switch').click();
    await page.waitForTimeout(100);

    // Propagate icon should be hidden
    await expect(page.locator('.patch-row[data-key="initiative_group"] .propagate-icon')).not.toBeVisible();
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
    await expect(page.locator('.patch-row[data-key="initiative_group"] .patch-hint-input')).toHaveValue('Title of the initiative group');
    await expect(page.locator('.patch-row[data-key="initiative_group_subheader"] .patch-hint-input')).toHaveValue('subheader of initiative group');
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
