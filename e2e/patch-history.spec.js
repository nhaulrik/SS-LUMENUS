/**
 * Patch History Timeline spec — UC11, UC13, UC14.
 *
 * Tests the patch history timeline that appears in the Tag step after at least
 * one patch has been applied in a chain.
 *
 * Use-case coverage:
 *   UC11 — Timeline appears after apply; rounds are listed; restore works
 *   UC13 — Each round has a download link
 *   UC14 — Rounds can be renamed inline
 */

import {
  test, expect,
  SEL,
  doUpload, selectSlide, tagElement, doFullApply,
  REPEATABLE_JSON, STATIC_JSON,
  FIXTURE_PPTX
} from './fixtures.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Set up a simple static tag on slide 2 (no repeatable). */
async function setupStaticTag(page, key = 'my_key', hint = 'My hint') {
  await doUpload(page);
  await selectSlide(page, 2);
  await tagElement(page, {
    originalText: 'Core Revenue Management',
    key,
    hint,
    ai: true
  });
}

// ─── UC11: Timeline appears and shows correct rounds ─────────────────────────

test.describe('UC11 — Patch history timeline', () => {
  test('history panel is NOT visible before any patch is applied', async ({ uploadedPage: page }) => {
    await expect(page.locator(SEL.patchHistory)).not.toBeVisible();
  });

  test('history panel appears after first apply', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await expect(page.locator(SEL.patchHistory)).toBeVisible();
  });

  test('one round card is shown after first apply', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await expect(page.locator(SEL.historyRound)).toHaveCount(1);
  });

  test('first round is marked as current', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await expect(page.locator(SEL.historyCurrentRound)).toBeVisible();
  });

  test('current badge is shown on the active round', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await expect(page.locator('.patch-history-current-badge')).toBeVisible();
  });

  test('two rounds are shown after two applies', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    // Slide 2 is no longer repeatable — apply again with static JSON
    await doFullApply(page, STATIC_JSON);
    await expect(page.locator(SEL.historyRound)).toHaveCount(2);
  });

  test('history badge count matches the number of rounds', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await doFullApply(page, STATIC_JSON);
    const badge = page.locator('.patch-history-badge');
    await expect(badge).toHaveText('2');
  });

  test('timeline dot strip shows one dot per round', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await doFullApply(page, STATIC_JSON);
    const dots = page.locator('.patch-history-dot');
    await expect(dots).toHaveCount(2);
  });
});

// ─── UC11: Restore from a previous round ─────────────────────────────────────

test.describe('UC11 — Restore state from previous patch', () => {
  test('Restore button appears on non-current rounds', async ({ taggedPage: page }) => {
    // Apply first patch
    await doFullApply(page, REPEATABLE_JSON);
    // Apply second patch (now round 1 is no longer current)
    await doFullApply(page, STATIC_JSON);

    // The older round (last-child in newest-first list) should have a Restore button
    await expect(
      page.locator(`${SEL.historyRound}:last-child ${SEL.historyRestoreBtn}`)
    ).toBeVisible();
  });

  test('Restore button is NOT shown on the current round', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    // Only one round — it is current, no Restore button
    await expect(page.locator(SEL.historyRestoreBtn)).not.toBeVisible();
  });

  test('clicking Restore loads tags from the restored round', async ({ page }) => {
    // Setup: tag element with specific hint, apply twice with different hints
    await setupStaticTag(page, 'restore_key', 'Original hint');

    // First apply — round 1 stores hint "Original hint"
    await doFullApply(page, { static: { restore_key: 'Value 1' } });

    // Modify hint before second apply
    await selectSlide(page, 2);
    await page.locator(SEL.patchRowByKey('restore_key')).locator(SEL.hintInput).fill('Modified hint');
    await page.waitForTimeout(200);

    // Second apply — round 2 stores hint "Modified hint"
    await doFullApply(page, { static: { restore_key: 'Value 2' } });

    // Confirm we see "Modified hint" (round 2 is current)
    await selectSlide(page, 2);
    await expect(
      page.locator(SEL.patchRowByKey('restore_key')).locator(SEL.hintInput)
    ).toHaveValue('Modified hint');

    // Restore round 1 (oldest = last-child in the newest-first list)
    await page.locator(`${SEL.historyRound}:last-child ${SEL.historyRestoreBtn}`).click();
    // Wait for Tag step to re-settle
    await page.waitForSelector('.tag-slides .tag-slide-btn');
    await page.waitForTimeout(300);

    // After restore, hint should revert to "Original hint"
    await selectSlide(page, 2);
    await expect(
      page.locator(SEL.patchRowByKey('restore_key')).locator(SEL.hintInput)
    ).toHaveValue('Original hint');
  });

  test('restored round becomes the current round in the timeline', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await doFullApply(page, STATIC_JSON);

    // Restore round 1 (last-child = oldest)
    await page.locator(`${SEL.historyRound}:last-child ${SEL.historyRestoreBtn}`).click();
    await page.waitForSelector('.tag-slides .tag-slide-btn');
    await page.waitForTimeout(300);

    // The last-child round should now be current
    await expect(
      page.locator(`${SEL.historyRound}:last-child`)
    ).toHaveClass(/current/);
  });

  test('restored state shows preview of the round PPTX', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await doFullApply(page, STATIC_JSON);

    await page.locator(`${SEL.historyRound}:last-child ${SEL.historyRestoreBtn}`).click();
    await page.waitForSelector('.tag-slides .tag-slide-btn');
    await page.waitForTimeout(300);

    // Preview panel should show slides from the restored round
    await expect(page.locator(SEL.tagStepPreview)).toBeVisible();
  });

  test('a toast confirms the restore operation', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await doFullApply(page, STATIC_JSON);

    await page.locator(`${SEL.historyRound}:last-child ${SEL.historyRestoreBtn}`).click();

    // Toast should mention "Restored"
    await expect(page.locator('.toast')).toContainText('Restored');
  });
});

// ─── UC13: Download any patch version ────────────────────────────────────────

test.describe('UC13 — Download any patch version from history', () => {
  test('each round card has a download link', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await expect(page.locator(SEL.historyDownloadBtn)).toBeVisible();
  });

  test('download link points to the correct patch file', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    const href = await page.locator(SEL.historyDownloadBtn).getAttribute('href');
    expect(href).toMatch(/\/api\/patch-chains\/.+\/download\/sample-patch-1\.pptx$/);
  });

  test('download link has the download attribute for direct file download', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    const download = page.locator(SEL.historyDownloadBtn);
    await expect(download).toHaveAttribute('download');
  });

  test('second round has a separate download link for its file', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await doFullApply(page, STATIC_JSON);

    const links = page.locator(SEL.historyDownloadBtn);
    await expect(links).toHaveCount(2);

    // First link in DOM (newest = round 2) should point to patch-2
    const firstHref = await links.first().getAttribute('href');
    expect(firstHref).toMatch(/sample-patch-2\.pptx$/);

    // Second link (oldest = round 1) should point to patch-1
    const secondHref = await links.nth(1).getAttribute('href');
    expect(secondHref).toMatch(/sample-patch-1\.pptx$/);
  });
});

// ─── UC14: Rename patch ───────────────────────────────────────────────────────

test.describe('UC14 — Rename a patch in the timeline', () => {
  test('rename button (✎) is visible on each round card', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await expect(page.locator(SEL.historyRenameBtn)).toBeVisible();
  });

  test('clicking rename button shows an inline text input', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await page.locator(SEL.historyRenameBtn).click();
    await expect(page.locator(SEL.historyNameInput)).toBeVisible();
  });

  test('typing a new name and pressing Enter updates the displayed name', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    await page.locator(SEL.historyRenameBtn).click();
    const input = page.locator(SEL.historyNameInput);
    await input.fill('My custom patch name');
    await input.press('Enter');

    // Input should be gone, name displayed
    await expect(input).not.toBeVisible();
    await expect(page.locator(SEL.historyRound).first().locator(SEL.historyRoundName))
      .toContainText('My custom patch name');
  });

  test('pressing Escape cancels the rename without changing the name', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);

    // Capture original name before editing
    const originalName = await page.locator(SEL.historyRoundName).first().innerText();

    await page.locator(SEL.historyRenameBtn).click();
    const input = page.locator(SEL.historyNameInput);
    await input.fill('This should not be saved');
    await input.press('Escape');

    await expect(input).not.toBeVisible();
    // The displayed name should still be the original
    await expect(
      page.locator(SEL.historyRound).first().locator(SEL.historyRoundName)
    ).toContainText(originalName.replace('Current', '').trim());
  });

  test('renamed round persists after navigating away and back', async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);

    // Rename the round
    await page.locator(SEL.historyRenameBtn).click();
    const input = page.locator(SEL.historyNameInput);
    await input.fill('Persistent name');
    await input.press('Enter');

    // Apply a second patch (navigates away from history view briefly)
    await doFullApply(page, STATIC_JSON);

    // Round 1 (last-child in newest-first list) should still have "Persistent name"
    await expect(
      page.locator(`${SEL.historyRound}:last-child`).locator(SEL.historyRoundName)
    ).toContainText('Persistent name');
  });
});
