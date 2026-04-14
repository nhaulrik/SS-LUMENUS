/**
 * Composable Playwright fixtures for the Solon E2E suite.
 *
 * Each fixture builds on the previous, bringing the app to a well-defined state:
 *
 *   page             — blank browser page (base Playwright fixture)
 *   uploadedPage     — sample.pptx uploaded via PowerPoint Native flow, on Tag step
 *   repeatablePage   — slide 2 selected, marked repeatable, structure type + prompt filled
 *   taggedPage       — both target elements on slide 2 tagged with correct keys/hints/AI on
 *   appliedPatchPage — taggedPage + full apply flow completed, back on Tag step
 *   htmlUploadedPage — test_slide.html uploaded via Visual flow, zones parsed, on zone review
 *   htmlProjectPage  — test_slide.html uploaded + project created, on confirmation screen
 */

import { test as base, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_PPTX = path.resolve(__dirname, 'fixtures/sample.pptx');
export const FIXTURE_HTML = path.resolve(__dirname, '../input/test_slide.html');

// ─── Expected zones in test_slide.html ───────────────────────────────────────
// Used by tests to assert zone detection correctness.
export const EXPECTED_ZONES = [
  { key: 'initiative_group_title', type: 'text',   slideIndex: 1 },
  { key: 'initiative_group_subtitle', type: 'text', slideIndex: 1 },
  { key: 'total_hours',           type: 'number',  slideIndex: 1 },
  { key: 'initiative_count',      type: 'number',  slideIndex: 1 },
  { key: 'feature_count',         type: 'number',  slideIndex: 1 },
  { key: 'completion_pct',        type: 'number',  slideIndex: 1 },
  { key: 'business_value',        type: 'text',    slideIndex: 1 },
  { key: 'market_relevance',      type: 'text',    slideIndex: 1 },
];

// ─── JSON payloads used across the apply-patch tests ─────────────────────────

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

export const STATIC_JSON = {
  static: {
    initiative_group:           'Updated Group Round 2',
    initiative_group_subheader: 'Updated Subheader Round 2'
  }
}

// ─── Selectors (single source of truth for the whole suite) ──────────────────

export const SEL = {
  // ── Flow selector ──────────────────────────────────────────────────────────
  flowSelectContainer: '.flow-select-container',
  flowCards:           '.flow-card',
  flowCardPptx:        '.flow-card:not(.flow-card--visual)',
  flowCardVisual:      '.flow-card--visual',

  // ── PPTX upload step ───────────────────────────────────────────────────────
  fileInput:        'input[type="file"][accept=".pptx"]',

  // ── HTML upload step ───────────────────────────────────────────────────────
  htmlFileInput:    'input[type="file"][accept=".html,.htm"]',
  htmlUploadZone:   '.html-upload-zone',
  htmlFileLoaded:   '.html-file-loaded',
  htmlFileName:     '.html-file-name',
  htmlFileMeta:     '.html-file-meta',
  htmlViolations:   '.html-violations',
  htmlViolationItems: '.html-violation-item',

  // Zone list
  zoneListSection:  '.zone-list-section',
  zoneRows:         '.zone-row',
  zoneRowByKey:     (key) => `.zone-row:has(.zone-key-badge:text("${key}"))`,
  zoneKeyBadge:     '.zone-key-badge',
  zoneTypeSelect:   '.zone-type-select',
  zoneAutoToggle:   '.zone-auto-toggle input[type="checkbox"]',
  zoneExpandBtn:    '.zone-expand-btn',
  zoneRemoveBtn:    '.zone-remove-btn',
  zoneHintInput:    '.zone-hint-input',
  zoneOriginalText: '.zone-original-text',
  zoneTagRepeatable: '.zone-tag--repeatable',
  zoneTagChild:     '.zone-tag--child',
  zoneListEmpty:    '.zone-list-empty',

  // Project footer
  projectNameInput: '.html-project-footer .form-input',
  createProjectBtn: 'button:has-text("Create Project")',

  // Preview panel
  htmlPreviewPanel: '.html-preview-panel',
  htmlPreviewFrame: '.html-preview-frame',

  // Project created confirmation
  htmlProjectCreated: '.html-project-created',
  projectCreatedName: '.html-project-created-name',
  projectCreatedMeta: '.html-project-created-meta',

  // Change flow link (shared)
  changeFlowBtn:    'button:has-text("Change flow")',

  // ── Tag step — slide carousel ───────────────────────────────────────────────
  slideThumb:       (n) => `.tag-slide-btn:nth-child(${n})`,

  // Tag step — repeatable config
  repeatableToggle: '.tag-repeatable input[type="checkbox"]',
  structureType:    '.repeatable-config input[type="text"]',
  customPrompt:     '.repeatable-config textarea',

  // Tag step — slide overlay click targets
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

  // Tag step — generated preview panel
  tagStepPreview:       '.tag-step-preview',
  tagStepPreviewMain:   '.tag-step-preview-main',
  tagStepPreviewThumbs: '.tag-step-preview-thumbs',
  tagPreviewNavBtn:     '.tag-step-preview-nav-btn',
  tagPreviewNavLabel:   '.tag-step-preview-nav-label',

  // Patch history timeline
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

/** Navigate to the app and select the PowerPoint Native flow. */
export async function selectPptxFlow(page) {
  await page.goto('/');
  await page.locator(SEL.flowCardPptx).click();
}

/** Navigate to the app and select the Visual (HTML) flow. */
export async function selectHtmlFlow(page) {
  await page.goto('/');
  await page.locator(SEL.flowCardVisual).click();
}

/** Upload the fixture PPTX and wait for the Tag step to appear. */
export async function doUpload(page) {
  await page.request.delete('http://localhost:3001/api/patches');
  await page.request.delete('http://localhost:3001/api/patch-chains');
  await selectPptxFlow(page);
  await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
  await page.waitForSelector('.tag-slides .tag-slide-btn');
}

/**
 * Upload the fixture HTML template and wait for the zone list to appear.
 * Returns after the server has parsed zones and the zone list is visible.
 */
export async function doHtmlUpload(page) {
  await page.request.delete('http://localhost:3001/api/patches');
  await page.request.delete('http://localhost:3001/api/patch-chains');
  await selectHtmlFlow(page);
  await page.setInputFiles(SEL.htmlFileInput, FIXTURE_HTML);
  await page.waitForSelector(SEL.zoneListSection);
}

/**
 * Upload the fixture HTML, fill the project name, and create the project.
 * Returns after the project-created confirmation screen is shown.
 */
export async function doHtmlCreateProject(page, projectName = 'test-project') {
  await doHtmlUpload(page);
  await page.locator(SEL.projectNameInput).fill(projectName);
  await page.locator(SEL.createProjectBtn).click();
  await page.waitForSelector(SEL.htmlProjectCreated);
}

/** Select slide N (1-based) in the carousel. */
export async function selectSlide(page, n) {
  await page.locator(SEL.slideThumb(n)).click();
  await page.waitForTimeout(150);
}

/** Toggle the current slide as repeatable and fill its config. */
export async function configureRepeatable(page, { structureType, customPrompt }) {
  await page.locator(SEL.repeatableToggle).check();
  await page.locator(SEL.structureType).fill(structureType);
  await page.locator(SEL.customPrompt).fill(customPrompt);
}

/** Click a slide overlay element, fill the modal, and save. */
export async function tagElement(page, { originalText, key, hint, ai = true }) {
  await page.locator(SEL.overlayByText(originalText)).click();
  await page.waitForSelector(SEL.modal);
  await page.locator(SEL.modalKey).fill(key);
  await page.locator(SEL.modalHint).fill(hint);
  const checkbox = page.locator(SEL.modalAI);
  const checked  = await checkbox.isChecked();
  if (ai && !checked) await checkbox.check();
  if (!ai && checked) await checkbox.uncheck();
  await page.locator(SEL.modalSave).click();
  await page.waitForSelector(SEL.modal, { state: 'detached' });
  await page.waitForTimeout(1500);
}

/** Complete the full "Generate Recipe → fill JSON → Preview → Apply Patch & Continue" flow. */
export async function doFullApply(page, json) {
  await page.locator(SEL.generateRecipe).click();
  await page.waitForSelector(SEL.recipeArea);
  await page.locator(SEL.jsonInput).fill(JSON.stringify(json));
  await expect(page.locator(SEL.previewGenerate)).toBeEnabled({ timeout: 8000 });
  await page.locator(SEL.previewGenerate).click();
  await page.waitForSelector(SEL.previewLarge);
  await page.locator(SEL.applyPatchBtn).click();
  await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 90000 });
}

// ─── Fixture definitions ──────────────────────────────────────────────────────

export const test = base.extend({
  /** App is on the Tag step with sample.pptx loaded (PPTX Native flow). */
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

  /** "initiative_group" is tagged on slides 2 and 3 — propagation icon appears. */
  propagatedPage: async ({ page }, use) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'initiative_group', hint: 'Title of the initiative group', ai: true });
    await selectSlide(page, 3);
    await tagElement(page, { originalText: 'Core Revenue Management', key: 'initiative_group', hint: 'Title of the initiative group', ai: true });
    await use(page);
  },

  /** Full apply flow completed once. Back on Tag step with history. */
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
  },

  /**
   * Visual flow: test_slide.html uploaded, zones parsed, zone list visible.
   * App is on the HTML upload step showing the zone review panel.
   */
  htmlUploadedPage: async ({ page }, use) => {
    await doHtmlUpload(page);
    await use(page);
  },

  /**
   * Visual flow: test_slide.html uploaded + project created.
   * App is on the project-created confirmation screen.
   */
  htmlProjectPage: async ({ page }, use) => {
    await doHtmlCreateProject(page, 'test-project');
    await use(page);
  },
});

export { expect };
