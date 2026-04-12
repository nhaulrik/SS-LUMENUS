/**
 * Composable Playwright fixtures for the Solon E2E suite.
 *
 * Each fixture builds on the previous, bringing the app to a well-defined state:
 *
 *   page            — blank browser page (base Playwright fixture)
 *   uploadedPage    — sample.pptx uploaded, app is on the Tag step
 *   repeatablePage  — slide 2 selected, marked repeatable, structure type + prompt filled
 *   taggedPage      — both target elements on slide 2 tagged with correct keys/hints/AI on
 *   appliedPatchPage — taggedPage + full apply flow completed, back on Tag step
 */

import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_PPTX = path.resolve(__dirname, 'fixtures/sample.pptx');

// ─── JSON payloads used across the apply-patch tests ─────────────────────────

/**
 * JSON for the taggedPage fixture (slide 2 repeatable, structure "Initiatie Group").
 * Used for the first patch apply.
 */
export const REPEATABLE_JSON = {
  slides: {
    'Initiatie Group': [
      {
        structure_type:               'Initiatie Group',
        initiative_group:             'Test Initiative Group',
        initiative_group_subheader:   'Test Subheader'
      }
    ]
  }
}

/**
 * JSON for a second apply after repeatableSlides has been cleared.
 * initiative_group and initiative_group_subheader are now static fields.
 */
export const STATIC_JSON = {
  static: {
    initiative_group:           'Updated Group Round 2',
    initiative_group_subheader: 'Updated Subheader Round 2'
  }
}

// ─── Selectors (single source of truth for the whole suite) ──────────────────

export const SEL = {
  // Upload step
  fileInput:        'input[type="file"][accept=".pptx"]',

  // Tag step — slide carousel
  slideThumb:       (n) => `.tag-slide-btn:nth-child(${n})`,

  // Tag step — repeatable config
  repeatableToggle: '.tag-repeatable input[type="checkbox"]',
  structureType:    '.repeatable-config input[type="text"]',
  customPrompt:     '.repeatable-config textarea',

  // Tag step — slide overlay click targets (by original text, stable regardless of tag state)
  overlayByText:    (text) => `.overlay-element[data-text="${text}"]`,

  // Tag modal
  modal:            '.modal-content',
  modalKey:         '[data-testid="modal-key"]',
  modalHint:        '[data-testid="modal-hint"]',
  modalAI:          '[data-testid="modal-ai"]',
  modalMax:         '[data-testid="modal-maxchars"]',
  modalSave:        '[data-testid="modal-save"]',

  // Patch table — rows
  patchRows:        '.patch-table-body .patch-row',
  patchRowByKey:    (key) => `.patch-row[data-key="${key}"]`,

  // Patch table — inline inputs
  patchKeyInput:    '.patch-key-input',
  hintInput:        '.patch-hint-input',
  patchMaxInput:    '.patch-max-input',

  // Propagation
  propagateIcon:           '.propagate-icon',
  propagateIconActive:     '.propagate-icon--active',
  propagateModal:          '.propagate-modal',
  propagateModeNonUniq:    '[data-testid="mode-non-unique"]',
  propagateModeUnique:     '[data-testid="mode-unique"]',
  propagatePickPrompt:     '[data-testid="propagate-pick-prompt"]',
  propagatePickOverlay:    '.propagate-pick-overlay',
  propagateContextDisplay: '[data-testid="propagate-context-display"]',
  propagateUniqueSection:  '.propagate-unique-section',
  propagateSave:           '[data-testid="propagate-save"]',

  // Actions
  generateRecipe:   'button:has-text("Generate Recipe")',

  // Recipe step
  recipeArea:       '.recipe-area',
  jsonInput:        '.json-input',
  previewGenerate:  'button:has-text("Preview & Generate")',

  // Preview step
  previewLarge:     '.preview-large',
  applyPatchBtn:    'button:has-text("Apply Patch & Continue")',

  // Tag step — generated preview panel (UC6)
  tagStepPreview:       '.tag-step-preview',
  tagStepPreviewMain:   '.tag-step-preview-main',
  tagStepPreviewThumbs: '.tag-step-preview-thumbs',
  tagPreviewNavBtn:     '.tag-step-preview-nav-btn',
  tagPreviewNavLabel:   '.tag-step-preview-nav-label',

  // Patch history timeline (UC11–UC14)
  patchHistory:         '.patch-history',
  historyRound:         '.patch-history-round',
  historyCurrentRound:  '.patch-history-round.current',
  historyRoundName:     '.patch-history-name',
  historyBtn:           '.patch-history-btn',
  historyRestoreBtn:    '.patch-history-btn:has-text("Restore")',
  historyDownloadBtn:   'a.patch-history-btn[download]',
  historyRenameBtn:     '.patch-history-btn:has-text("✎")',
  historyNameInput:     '.patch-history-name-input',
};

// ─── Shared action helpers ────────────────────────────────────────────────────

/** Upload the fixture PPTX and wait for the Tag step to appear. */
export async function doUpload(page) {
  // Clear server-side patch and chain state so each test starts from a clean slate.
  await page.request.delete('http://localhost:3001/api/patches');
  await page.request.delete('http://localhost:3001/api/patch-chains');
  await page.goto('/');
  await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
  // Wait for slide thumbnails to appear — confirms we're in the Tag step
  await page.waitForSelector('.tag-slides .tag-slide-btn');
}

/** Select slide N (1-based) in the carousel. */
export async function selectSlide(page, n) {
  await page.locator(SEL.slideThumb(n)).click();
  // Wait for the overlay to reflect the new slide
  await page.waitForTimeout(150);
}

/** Toggle the current slide as repeatable and fill its config. */
export async function configureRepeatable(page, { structureType, customPrompt }) {
  await page.locator(SEL.repeatableToggle).check();
  await page.locator(SEL.structureType).fill(structureType);
  await page.locator(SEL.customPrompt).fill(customPrompt);
}

/**
 * Click a slide overlay element (by its original text), fill the modal,
 * and save. Enables AI generation by default.
 */
export async function tagElement(page, { originalText, key, hint, ai = true }) {
  await page.locator(SEL.overlayByText(originalText)).click();
  await page.waitForSelector(SEL.modal);

  // Select all and replace key
  await page.locator(SEL.modalKey).fill(key);

  // Set hint
  await page.locator(SEL.modalHint).fill(hint);

  // Toggle AI if needed
  const checkbox = page.locator(SEL.modalAI);
  const checked  = await checkbox.isChecked();
  if (ai && !checked) await checkbox.check();
  if (!ai && checked) await checkbox.uncheck();

  await page.locator(SEL.modalSave).click();
  await page.waitForSelector(SEL.modal, { state: 'detached' });
  // Debounce is 1000ms; wait for the save to flush before the test proceeds.
  await page.waitForTimeout(1500);
}

/**
 * Complete the full "Generate Recipe → fill JSON → Preview → Apply Patch & Continue" flow.
 * The caller must already be on the Tag step with tags configured.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} json  - The JSON object to paste into the JSON Response textarea
 * @returns {import('@playwright/test').Download} - The triggered download
 */
export async function doFullApply(page, json) {
  // 1. Generate recipe → Recipe step
  await page.locator(SEL.generateRecipe).click();
  await page.waitForSelector(SEL.recipeArea);

  // 2. Fill JSON
  await page.locator(SEL.jsonInput).fill(JSON.stringify(json));

  // 3. Wait for server-side validation to pass (debounce 300ms + round-trip)
  await expect(page.locator(SEL.previewGenerate)).toBeEnabled({ timeout: 8000 });

  // 4. Preview → Preview step
  await page.locator(SEL.previewGenerate).click();
  await page.waitForSelector(SEL.previewLarge);

  // 5. Apply Patch & Continue → triggers download + navigates back to Tag step
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(SEL.applyPatchBtn).click()
  ]);

  // Wait for Tag step carousel — the apply flow (chain create + PPTX build + parse) can
  // take several seconds, so use a generous timeout here.
  await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 90_000 });

  return download;
}

// ─── Fixture definitions ──────────────────────────────────────────────────

export const test = base.extend({
  /** App is on the Tag step with sample.pptx loaded. */
  uploadedPage: async ({ page }, use) => {
    await doUpload(page);
    await use(page);
  },

  /** Slide 2 is selected and configured as a repeatable slide. */
  repeatablePage: async ({ page }, use) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await configureRepeatable(page, {
      structureType: 'Initiatie Group',
      customPrompt:  'an instance for each initiative group'
    });
    await use(page);
  },

  /** Both target elements on slide 2 are tagged with keys, hints, and AI on. */
  taggedPage: async ({ page }, use) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await configureRepeatable(page, {
      structureType: 'Initiatie Group',
      customPrompt:  'an instance for each initiative group'
    });
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
    await use(page);
  },

  /**
   * "initiative_group" is tagged on slides 2 and 3.
   * Both are non-repeatable slides, so propagation icon appears.
   * Slide 3 is the duplicate of slide 2 in sample.pptx.
   */
  propagatedPage: async ({ page }, use) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'initiative_group', hint: 'Title of the initiative group', ai: true });
    await selectSlide(page, 3);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'initiative_group', hint: 'Title of the initiative group', ai: true });
    await use(page);
  },

  /**
   * Full apply flow completed once.
   * taggedPage + recipe generated + JSON filled + preview + Apply Patch & Continue.
   * App is back on the Tag step with previewData set and one round in chain history.
   */
  appliedPatchPage: async ({ page }, use) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await configureRepeatable(page, {
      structureType: 'Initiatie Group',
      customPrompt:  'an instance for each initiative group'
    });
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
    await doFullApply(page, REPEATABLE_JSON);
    await use(page);
  }
});

export { expect };
