/**
 * HTML Editor E2E Spec
 *
 * UC-HE-01  Edit HTML button appears after upload
 * UC-HE-02  Clicking Edit HTML opens the editor overlay
 * UC-HE-03  Editor shows the HTML source in a CodeMirror instance
 * UC-HE-04  Live preview is visible in the editor
 * UC-HE-05  Preview updates after editing (debounced)
 * UC-HE-06  Apply changes button is disabled when no edits made
 * UC-HE-07  Apply changes re-parses zones and returns to zone review
 * UC-HE-08  Reset button restores original HTML
 * UC-HE-09  Back to zones closes editor without applying
 * UC-HE-10  Dirty badge appears when edits are made
 * UC-HE-11  Inline warning shown for HTML without <section>
 * UC-HE-12  Apply button disabled when blocking error present
 * UC-HE-13  Zone edits (key rename) are preserved after Apply
 */

import { test, expect, FIXTURE_HTML, SEL, doHtmlUpload } from './fixtures.js';

const EDITOR_SEL = {
  editBtn:      'button:has-text("Edit HTML")',
  overlay:      '.html-editor-overlay',
  header:       '.html-editor-header',
  closeBtn:     'button:has-text("Back to zones")',
  resetBtn:     'button:has-text("Reset")',
  applyBtn:     'button:has-text("Apply changes")',
  dirtyBadge:   '.html-editor-dirty-badge',
  cmEditor:     '.cm-editor',
  cmContent:    '.cm-content',
  previewFrame: '.html-editor-pane--preview iframe',
  warnings:     '.html-editor-warnings',
  warningItem:  '.html-editor-warning',
};

test.describe('UC-HE-01/02 ? Edit HTML button opens editor', () => {
  test('Edit HTML button is visible after upload', async ({ page }) => {
    await doHtmlUpload(page);
    await expect(page.locator(EDITOR_SEL.editBtn)).toBeVisible();
  });

  test('clicking Edit HTML shows the editor overlay', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.overlay)).toBeVisible();
  });
});

test.describe('UC-HE-03/04 ? Editor content', () => {
  test('CodeMirror editor is mounted and visible', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.cmEditor)).toBeVisible();
  });

  test('editor contains the uploaded HTML source', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    // CodeMirror virtualises long documents; check for text near the top of the file
    await expect(page.locator(EDITOR_SEL.cmContent)).toContainText('<!DOCTYPE html>');
  });

  test('live preview iframe is visible in the editor', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.previewFrame)).toBeVisible();
  });

  test('preview iframe has a non-empty srcDoc', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    const srcDoc = await page.locator(EDITOR_SEL.previewFrame).getAttribute('srcdoc');
    expect(srcDoc).toBeTruthy();
    expect(srcDoc.length).toBeGreaterThan(100);
  });
});

test.describe('UC-HE-06/08/10 ? Apply, Reset, Dirty badge', () => {
  test('Apply button is disabled when no edits have been made', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeDisabled();
  });

  test('Reset button is disabled when no edits have been made', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.resetBtn)).toBeDisabled();
  });

  test('dirty badge appears after editing', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    // Click into the editor and type something
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(page.locator(EDITOR_SEL.dirtyBadge)).toBeVisible({ timeout: 3000 });
  });

  test('Apply button is enabled after editing', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeEnabled({ timeout: 3000 });
  });

  test('Reset restores the original content and disables Apply', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR_SEL.resetBtn).click();
    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeDisabled({ timeout: 3000 });
    await expect(page.locator(EDITOR_SEL.dirtyBadge)).not.toBeVisible();
  });
});

test.describe('UC-HE-09 ? Back to zones closes editor', () => {
  test('clicking Back to zones returns to zone review without applying', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.overlay)).toBeVisible();
    await page.locator(EDITOR_SEL.closeBtn).click();
    await expect(page.locator(EDITOR_SEL.overlay)).not.toBeVisible();
    // Zone review is now the tree panel
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible();
  });
});

test.describe('UC-HE-07 ? Apply changes re-parses and returns to zone review', () => {
  test('Apply changes closes editor and shows updated tree panel', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();

    // Make a trivial edit (add a comment) that does not change zones
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('Home');
    await page.keyboard.type('<!-- edited -->');

    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR_SEL.applyBtn).click();

    // Should return to zone review (tree panel)
    await expect(page.locator(EDITOR_SEL.overlay)).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible();
  });
});

test.describe('UC-HE-11/12 ? Validation warnings', () => {
  test('warning shown when section element is removed', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();

    // Select all and replace with HTML that has no <section>
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('<html><body><div data-zone="x">hi</div></body></html>');

    // Wait for validation debounce (500ms)
    await expect(page.locator(EDITOR_SEL.warnings)).toBeVisible({ timeout: 3000 });
    await expect(page.locator(EDITOR_SEL.warningItem).first()).toContainText('section');
  });

  test('Apply button is disabled when blocking error is present', async ({ page }) => {
    await doHtmlUpload(page);
    await page.locator(EDITOR_SEL.editBtn).click();
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('<html><body><p>no section no zone</p></body></html>');
    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeDisabled({ timeout: 3000 });
  });
});

test.describe('UC-HE-13 ? Zone edits preserved after Apply', () => {
  test('existing zone badges are still present after applying HTML edits', async ({ page }) => {
    await doHtmlUpload(page);

    // Expand tree to see badges, count pre-existing ones
    await page.locator(SEL.treeExpandAll).click();
    const initialBadgeCount = await page.locator(SEL.treeZoneBadges).count();
    expect(initialBadgeCount).toBeGreaterThan(0);

    // Open editor — lazy-loaded via Suspense; wait for CodeMirror to mount
    await page.locator(EDITOR_SEL.editBtn).click();
    await expect(page.locator(EDITOR_SEL.overlay)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(EDITOR_SEL.cmContent)).toBeVisible({ timeout: 15000 });
    await page.locator(EDITOR_SEL.cmContent).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(page.locator(EDITOR_SEL.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR_SEL.applyBtn).click();
    await expect(page.locator(EDITOR_SEL.overlay)).not.toBeVisible({ timeout: 10000 });

    // Tree panel should still be visible with badges
    await expect(page.locator(SEL.htmlTreePanel)).toBeVisible();
    await page.locator(SEL.treeExpandAll).click();
    await expect(page.locator(SEL.treeZoneBadges).first()).toBeVisible({ timeout: 3000 });
  });
});
