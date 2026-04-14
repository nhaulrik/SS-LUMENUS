/**
 * Click-to-zone E2E Spec
 *
 * Tests the full flow of:
 *   1. Uploading test_slide.html
 *   2. Opening the HTML editor
 *   3. Simulating a click on a static element (no data-zone)
 *   4. Configuring it as a zone via the modal
 *   5. Applying and verifying the zone list
 *
 * The preview iframe is sandboxed so we simulate the postMessage
 * that the injected script fires -- same mechanism as production.
 *
 * Primary test element: Business Value (div.value-col-title)
 */

import { test, expect, SEL, doHtmlUpload } from './fixtures.js';

const EDITOR = {
  editBtn:    'button:has-text("Edit HTML")',
  overlay:    '.html-editor-overlay',
  applyBtn:   'button:has-text("Apply changes")',
  dirtyBadge: '.html-editor-dirty-badge',
  cmContent:  '.cm-content',
};

const MODAL = {
  modal:       '.zone-assign-modal',
  title:       '.zone-assign-title',
  elementText: '.zone-assign-text',
  modeZone:    'input[type="radio"][value="zone"]',
  modeLabel:   'input[type="radio"][value="label"]',
  keyInput:    '.zone-assign-input[placeholder="snake_case_key"]',
  labelSelect: '.zone-assign-modal select.zone-assign-input',
  addBtn:      'button:has-text("Add zone")',
  cancelBtn:   'button:has-text("Cancel")',
};

async function openEditor(page) {
  await doHtmlUpload(page);
  await page.locator(EDITOR.editBtn).click();
  await expect(page.locator(EDITOR.overlay)).toBeVisible();
  // Wait for the lazy-loaded CodeMirror editor to fully mount
  await expect(page.locator(EDITOR.cmContent)).toBeVisible({ timeout: 15000 });
  // Wait for the iframe srcDoc to be populated
  await page.waitForFunction(() => {
    const f = document.querySelector('.html-editor-pane--preview iframe');
    return f && f.srcdoc && f.srcdoc.length > 100;
  }, { timeout: 10000 });
  // Allow React's useEffect message listener to register
  await page.waitForTimeout(500);
}

async function simulateElementClick(page, opts) {
  const { tag, className, textContent, existingZone = null, existingLabelFor = null } = opts;
  // Use page.dispatchEvent on the window to fire a real MessageEvent
  // that React's useEffect listener will receive synchronously.
  await page.evaluate((args) => {
    const event = new MessageEvent('message', {
      data: { type: 'element-click', ...args },
      origin: window.location.origin,
      source: window,
    });
    window.dispatchEvent(event);
  }, { tag, className, textContent, existingZone, existingLabelFor });
  // Wait for React to flush state updates
  await page.waitForTimeout(300);
}

async function clickBusinessValue(page) {
  await simulateElementClick(page, {
    tag: 'div', className: 'value-col-title', textContent: 'Business Value',
  });
}

// ── UC-CZ-01: Modal opens on static element click ─────────────────────────────

test.describe('UC-CZ-01 -- Modal opens when clicking a static element', () => {
  test('modal appears after clicking an unzoned element', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
  });

  test('modal shows the clicked element text', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL.elementText)).toContainText('Business Value');
  });

  test('modal title is Make element dynamic', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(MODAL.title)).toContainText('Make element dynamic');
  });

  test('modal auto-suggests a snake_case key', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    const val = await page.locator(MODAL.keyInput).inputValue();
    expect(val).toMatch(/^[a-z][a-z0-9_]*$/);
    expect(val.length).toBeGreaterThan(0);
  });

  test('Cancel closes modal without marking editor dirty', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.cancelBtn).click();
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
    await expect(page.locator(EDITOR.dirtyBadge)).not.toBeVisible();
  });

  test('Add zone button is disabled when key field is empty', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('');
    await expect(page.locator(MODAL.addBtn)).toBeDisabled();
  });
});

// ── UC-CZ-02: Existing zoned element does not open modal ──────────────────────

test.describe('UC-CZ-02 -- Clicking an existing zone does not open modal', () => {
  test('postMessage with existingZone set does not open the modal', async ({ page }) => {
    await openEditor(page);
    await simulateElementClick(page, {
      tag: 'div', className: 'header-title',
      textContent: 'Core Revenue Management Capabilities',
      existingZone: 'initiative_group_title',
    });
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
  });
});

// ── UC-CZ-03: Full flow -- content zone ───────────────────────────────────────

test.describe('UC-CZ-03 -- Full flow: add static element as content zone', () => {
  test('confirming the modal marks the editor dirty', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('business_value_header');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
    await expect(page.locator(EDITOR.dirtyBadge)).toBeVisible({ timeout: 3000 });
  });

  test('the HTML source contains the new data-zone attribute', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('business_value_header');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
    // CodeMirror virtualises long documents — check the underlying doc string
    // via the editor's dirty state and the preview iframe srcDoc instead.
    await expect(page.locator(EDITOR.dirtyBadge)).toBeVisible({ timeout: 3000 });
    // The preview iframe srcDoc is updated from draftHtml asynchronously after
    // React re-renders. Poll until the attribute appears rather than reading once.
    const iframe = page.locator('.html-editor-pane--preview iframe');
    await expect(async () => {
      const srcDoc = await iframe.getAttribute('srcdoc');
      expect(srcDoc).toContain('business_value_header');
    }).toPass({ timeout: 5000 });
  });

  test('pressing Enter in the key field confirms the modal', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('bv_enter_test');
    await page.locator(MODAL.keyInput).press('Enter');
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
    await expect(page.locator(EDITOR.dirtyBadge)).toBeVisible({ timeout: 3000 });
  });

  test('Apply changes returns to zone review with new zone in list', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('business_value_header');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
    await expect(page.locator(EDITOR.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR.applyBtn).click();
    await expect(page.locator(EDITOR.overlay)).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(SEL.zoneListSection)).toBeVisible();
    await expect(page.locator(SEL.zoneRowByKey('business_value_header'))).toBeVisible();
  });

  test('zone count increases by one after adding a new zone', async ({ page }) => {
    await doHtmlUpload(page);
    const before = await page.locator(SEL.zoneRows).count();
    await page.locator(EDITOR.editBtn).click();
    await expect(page.locator(EDITOR.overlay)).toBeVisible();
    await page.waitForFunction(() => {
      const f = document.querySelector('.html-editor-pane--preview iframe');
      return f && f.srcdoc && f.srcdoc.length > 100;
    }, { timeout: 10000 });
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('business_value_header');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(EDITOR.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR.applyBtn).click();
    await expect(page.locator(EDITOR.overlay)).not.toBeVisible({ timeout: 10000 });
    const after = await page.locator(SEL.zoneRows).count();
    expect(after).toBe(before + 1);
  });
});

// ── UC-CZ-04: Label-for mode ──────────────────────────────────────────────────

test.describe('UC-CZ-04 -- Label-for mode assigns data-label-for', () => {
  test('switching to label mode shows the zone dropdown', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.modeLabel).check();
    await expect(page.locator(MODAL.labelSelect)).toBeVisible();
  });

  test('label-for injection writes data-label-for into the source', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.modeLabel).check();
    await page.locator(MODAL.labelSelect).selectOption('business_value');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
    // Verify via the preview srcDoc (updated from draftHtml)
    await expect(page.locator(EDITOR.dirtyBadge)).toBeVisible({ timeout: 3000 });
    const srcDoc = await page.locator('.html-editor-pane--preview iframe').getAttribute('srcdoc');
    expect(srcDoc).toContain('data-label-for');
  });

  test('after Apply the label zone appears in the zone list', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.modeLabel).check();
    await page.locator(MODAL.labelSelect).selectOption('business_value');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(EDITOR.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR.applyBtn).click();
    await expect(page.locator(EDITOR.overlay)).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(SEL.zoneRowByKey('business_value__label'))).toBeVisible();
  });

  test('label zone row has the label tag badge', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.modeLabel).check();
    await page.locator(MODAL.labelSelect).selectOption('business_value');
    await page.locator(MODAL.addBtn).click();
    await expect(page.locator(EDITOR.applyBtn)).toBeEnabled({ timeout: 3000 });
    await page.locator(EDITOR.applyBtn).click();
    await expect(page.locator(EDITOR.overlay)).not.toBeVisible({ timeout: 10000 });
    const row = page.locator(SEL.zoneRowByKey('business_value__label'));
    await expect(row.locator('.zone-tag--label')).toBeVisible();
  });
});

// ── UC-CZ-05: Guard rails ─────────────────────────────────────────────────────

test.describe('UC-CZ-05 -- Guard rails: no modal for empty or trivial text', () => {
  test('empty textContent does not open modal', async ({ page }) => {
    await openEditor(page);
    await simulateElementClick(page, { tag: 'div', className: 'foo', textContent: '' });
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
  });

  test('single-char textContent does not open modal', async ({ page }) => {
    await openEditor(page);
    await simulateElementClick(page, { tag: 'span', className: '', textContent: 'x' });
    await expect(page.locator(MODAL.modal)).not.toBeVisible();
  });
});

// ── UC-CZ-06: Key sanitisation ────────────────────────────────────────────────

test.describe('UC-CZ-06 -- Key input sanitised to snake_case', () => {
  test('spaces become underscores', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('my key name');
    expect(await page.locator(MODAL.keyInput).inputValue()).toBe('my_key_name');
  });

  test('uppercase letters are lowercased', async ({ page }) => {
    await openEditor(page);
    await clickBusinessValue(page);
    await expect(page.locator(MODAL.modal)).toBeVisible({ timeout: 5000 });
    await page.locator(MODAL.keyInput).fill('MyKey');
    expect(await page.locator(MODAL.keyInput).inputValue()).toBe('mykey');
  });
});
