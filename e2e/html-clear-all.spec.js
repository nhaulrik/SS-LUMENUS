/**
 * E2E tests for "Clear all zones" — UC-CA-01 through UC-CA-08
 *
 * Tests the full clear-all flow:
 *   UC-CA-01  Button is hidden when no zones are assigned
 *   UC-CA-02  Button appears after zones are assigned
 *   UC-CA-03  Clicking shows a confirmation dialog
 *   UC-CA-04  Cancelling the dialog leaves zones intact
 *   UC-CA-05  Confirming removes all zone badges from the tree
 *   UC-CA-06  Zone count in the header drops to 0 after clear
 *   UC-CA-07  Button disappears again after clearing (no zones left)
 *   UC-CA-08  Repeatable slide settings are also cleared
 */

import { test, expect, SEL, doHtmlUpload } from './fixtures.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Expand the tree and return the count of zone badges currently visible. */
async function countBadges(page) {
  return page.locator(SEL.treeZoneBadges).count();
}

/**
 * Click the clear-all button and handle the confirm dialog.
 * @param {boolean} confirm — true to accept, false to dismiss
 */
async function clickClearAll(page, confirm = true) {
  // Two-click armed confirmation pattern (replaces window.confirm)
  await page.locator(SEL.treeClearAllBtn).click(); // arm
  if (confirm) {
    await page.locator('button:has-text("Confirm clear")').click(); // confirm
  } else {
    // Click elsewhere to disarm without confirming
    await page.locator('body').click({ position: { x: 10, y: 10 } });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-01: Button hidden when no zones assigned
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-01 — Clear all button hidden with no zones', () => {
  test('button is not visible immediately after upload when zones exist from data-zone attrs', async ({ page }) => {
    // test_slide.html has pre-existing data-zone attrs so zones are auto-detected.
    // The button should be visible in this case — verify the inverse with a blank template.
    await page.goto('/');
    await page.locator(SEL.flowCardVisual).click();

    // Upload a minimal template with no data-zone attributes
    const blankHtml = '<html><body><section><p>Hello</p></section></body></html>';
    const buffer    = Buffer.from(blankHtml);
    await page.locator(SEL.htmlFileInput).setInputFiles({
      name: 'blank.html', mimeType: 'text/html', buffer,
    });
    await page.waitForSelector(SEL.htmlTreePanel);

    await expect(page.locator(SEL.treeClearAllBtn)).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-02: Button appears when zones are assigned
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-02 — Clear all button visible when zones exist', () => {
  test('button is visible after uploading a template with pre-existing zones', async ({ page }) => {
    await doHtmlUpload(page);
    // test_slide.html has 8 pre-assigned zones — button should be visible immediately
    await expect(page.locator(SEL.treeClearAllBtn)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-03: Clicking shows a confirmation dialog
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-03 — Confirmation step is shown', () => {
  test('clicking clear all arms the button showing a confirm label', async ({ page }) => {
    await doHtmlUpload(page);
    // First click arms — no dialog, but button text changes to "Confirm clear"
    await page.locator(SEL.treeClearAllBtn).click();
    await expect(page.locator('button:has-text("Confirm clear")')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-04: Cancelling the dialog leaves zones intact
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-04 — Cancel preserves zones', () => {
  test('dismissing the dialog leaves all zone badges in place', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();

    const badgesBefore = await countBadges(page);
    expect(badgesBefore).toBeGreaterThan(0);

    await clickClearAll(page, false); // dismiss

    const badgesAfter = await countBadges(page);
    expect(badgesAfter).toBe(badgesBefore);
  });

  test('dismissing the dialog leaves the clear-all button visible', async ({ page }) => {
    await doHtmlUpload(page);
    await clickClearAll(page, false);
    await expect(page.locator(SEL.treeClearAllBtn)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-05: Confirming removes all zone badges
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-05 — Confirm removes all zone badges', () => {
  test('all zone badges are gone after confirming clear all', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(SEL.treeExpandAll).click();

    const badgesBefore = await countBadges(page);
    expect(badgesBefore).toBeGreaterThan(0);

    await clickClearAll(page, true); // accept

    // Expand again in case tree re-collapsed
    await page.locator(SEL.treeExpandAll).click();
    const badgesAfter = await countBadges(page);
    expect(badgesAfter).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-06: Zone count drops to 0
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-06 — Zone count in header drops to 0', () => {
  test('header shows "0 zones assigned" after clearing', async ({ page }) => {
    await doHtmlUpload(page);
    await clickClearAll(page, true);
    await expect(page.locator('.html-tree-count')).toContainText('0 zones');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-07: Button disappears after clearing
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-07 — Button hidden after clearing', () => {
  test('clear-all button is no longer visible once all zones are cleared', async ({ page }) => {
    await doHtmlUpload(page);
    await clickClearAll(page, true);
    await expect(page.locator(SEL.treeClearAllBtn)).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UC-CA-08: Repeatable slide settings are also cleared
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UC-CA-08 — Repeatable slide settings cleared', () => {
  test('repeatable badge is gone after clearing all', async ({ page }) => {
    await doHtmlUpload(page);

    // Enable repeatable on slide 1
    const toggle = page.locator('[data-testid="slide-repeatable-toggle-1"]');
    await expect(toggle).toBeVisible();
    await toggle.check();
    await expect(page.locator('[data-testid="slide-repeatable-badge-1"]')).toBeVisible();

    // Clear all — should also wipe repeatableSlides
    await clickClearAll(page, true);

    await expect(page.locator('[data-testid="slide-repeatable-badge-1"]')).not.toBeVisible();
  });

  test('repeatable key/prompt fields are hidden after clearing all', async ({ page }) => {
    await doHtmlUpload(page);

    const toggle = page.locator('[data-testid="slide-repeatable-toggle-1"]');
    await toggle.check();
    await expect(page.locator('[data-testid="slide-key-input-1"]')).toBeVisible();

    await clickClearAll(page, true);

    await expect(page.locator('[data-testid="slide-key-input-1"]')).not.toBeVisible();
  });
});
