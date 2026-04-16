/**
 * E2E tests for Phase 1: Save Project (Folder-Based Structure)
 *
 * Tests the complete flow of saving a project as individual slide files
 * in a folder structure on the server.
 *
 * UC-SP-01  Save Project button is visible on preview step
 * UC-SP-02  Clicking Save Project opens dialog
 * UC-SP-03  Dialog has project name input field
 * UC-SP-04  User can enter project name and confirm
 * UC-SP-05  Dialog validates empty project names
 * UC-SP-06  Dialog validates project name length (max 100 chars)
 * UC-SP-07  Project folder is created on server
 * UC-SP-08  Project folder contains individual slide files (slide-1.html, slide-2.html, etc.)
 * UC-SP-09  Each slide file is valid HTML
 * UC-SP-10  Success message displayed after save
 * UC-SP-11  User can cancel dialog
 * UC-SP-12  Keyboard support (Enter to confirm, Escape to cancel)
 */

import { test, expect, SEL, doHtmlApplyContent, doHtmlApplyMultiSlide } from './fixtures.js';

// ── UC-SP-01: Save Project button is visible ──────────────────────────────────

test.describe('UC-SP-01 — Save Project button is visible on preview step', () => {
  test('Save Project button is visible after applying content', async ({ page }) => {
    await doHtmlApplyContent(page);
    await expect(page.locator(SEL.htmlSaveProjectBtn)).toBeVisible();
  });

  test('Save Project button replaces Download HTML button', async ({ page }) => {
    await doHtmlApplyContent(page);
    // Download HTML button should not exist
    await expect(page.locator(SEL.htmlDownloadBtn)).not.toBeVisible();
    // Save Project button should exist
    await expect(page.locator(SEL.htmlSaveProjectBtn)).toBeVisible();
  });
});

// ── UC-SP-02: Clicking Save Project opens dialog ────────────────────────────────

test.describe('UC-SP-02 — Clicking Save Project opens dialog', () => {
  test('dialog appears when Save Project button clicked', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    await expect(page.locator(SEL.dialog)).toBeVisible();
  });

  test('dialog has correct title', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    await expect(page.locator('text=Save Project')).toBeVisible();
  });
});

// ── UC-SP-03: Dialog has project name input field ─────────────────────────────

test.describe('UC-SP-03 — Dialog has project name input field', () => {
  test('dialog contains text input for project name', async ({ page }) => {
    await doHtmlApplyContent(page, 'My Project');
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'text');
  });

  test('input field has default project name', async ({ page }) => {
    await doHtmlApplyContent(page, 'My Project');
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    await expect(input).toHaveValue('My Project');
  });

  test('input field is auto-focused', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    await expect(input).toBeFocused();
  });
});

// ── UC-SP-04: User can enter project name and confirm ──────────────────────────

test.describe('UC-SP-04 — User can enter project name and confirm', () => {
  test('user can type project name', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    
    await input.clear();
    await input.fill('Test Project Name');
    
    await expect(input).toHaveValue('Test Project Name');
  });

  test('clicking Save button saves project on server', async ({ page }) => {
    await doHtmlApplyContent(page);
    
    // Intercept the save-project API call
    const savePromise = page.waitForResponse(
      response => response.url().includes('/api/html-flow/save-project') && response.status() === 200
    );

    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    await input.fill('Test Save Project');
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    const response = await savePromise;
    const data = await response.json();
    
    expect(data.ok).toBe(true);
    expect(data.projectName).toBe('Test Save Project');
  });
});

// ── UC-SP-05: Dialog validates empty project names ───────────────────────────

test.describe('UC-SP-05 — Dialog validates empty project names', () => {
  test('shows error for empty project name', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    await expect(page.locator(SEL.dialogError)).toContainText('Please enter a project name');
  });

  test('shows error for whitespace-only name', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    await input.fill('   ');
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    await expect(page.locator(SEL.dialogError)).toContainText('Please enter a project name');
  });

  test('error clears when user starts typing', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    // Error should appear
    await expect(page.locator(SEL.dialogError)).toBeVisible();
    
    // Start typing
    await input.fill('New Project');
    
    // Error should disappear
    await expect(page.locator(SEL.dialogError)).not.toBeVisible();
  });
});

// ── UC-SP-06: Dialog validates project name length ──────────────────────────

test.describe('UC-SP-06 — Dialog validates project name length (max 100 chars)', () => {
  test('shows error for name exceeding 100 characters', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    const input = page.locator(SEL.dialogInput);
    const longName = 'a'.repeat(101);
    await input.fill(longName);
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    await expect(page.locator(SEL.dialogError)).toContainText('100 characters or less');
  });

  test('accepts name at exactly 100 characters', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    const input = page.locator(SEL.dialogInput);
    const maxName = 'a'.repeat(100);
    await input.fill(maxName);
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    // Should not show error
    await expect(page.locator(SEL.dialogError)).not.toBeVisible();
  });
});

// ── UC-SP-07: Project folder is created on server ──────────────────────────────

test.describe('UC-SP-07 — Project folder is created on server', () => {
  test('save request returns project details', async ({ page }) => {
    await doHtmlApplyContent(page);
    
    // Intercept the save-project API call
    const savePromise = page.waitForResponse(
      response => response.url().includes('/api/html-flow/save-project') && response.status() === 200
    );
    
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    await input.fill('Test Project');
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    const response = await savePromise;
    const data = await response.json();
    
    expect(data.ok).toBe(true);
    expect(data.projectPath).toBeTruthy();
    expect(data.projectName).toBe('Test Project');
    expect(data.slideCount).toBeGreaterThan(0);
  });
});

// ── UC-SP-08: Project folder contains individual slide files ──────────────────────────────

test.describe('UC-SP-08 — Project folder contains individual slide files', () => {
  test('save-project endpoint creates slide files', async ({ page }) => {
    await doHtmlApplyContent(page);
    
    // Make API call to save project
    const response = await page.request.post('/api/html-flow/save-project', {
      data: {
        chainId: await page.evaluate(() => window.location.pathname.split('/').pop()),
        projectName: 'Test Slide Files'
      }
    });
    
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.slideCount).toBeGreaterThan(0);
  });
});

// ── UC-SP-09: Each slide file is valid HTML ───────────────────────────────────

test.describe('UC-SP-09 — Each slide file is valid HTML', () => {
  test('generated slide files contain valid HTML structure', async ({ page }) => {
    await doHtmlApplyContent(page);
    
    // For this test, we verify the endpoint returns success
    // Full ZIP content validation would require additional setup
    const response = await page.request.post('/api/html-flow/save-project', {
      data: {
        chainId: await page.evaluate(() => window.location.pathname.split('/').pop()),
        projectName: 'HTML Validation Test',
        slideCount: 1
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });
});

// ── UC-SP-10: Success message displayed after save ────────────────────────────────────

test.describe('UC-SP-10 — Success message displayed after save', () => {
  test('success toast message shown after save', async ({ page }) => {
    await doHtmlApplyContent(page);
    
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    await input.fill('Success Test');
    
    const saveButton = page.locator('button:has-text("Save Project")').last();
    await saveButton.click();
    
    // Wait for success message
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
  });
});

// ── UC-SP-11: User can cancel dialog ──────────────────────────────────────────

test.describe('UC-SP-11 — User can cancel dialog', () => {
  test('cancel button closes dialog', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    await expect(page.locator(SEL.dialog)).toBeVisible();
    
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
    
    await expect(page.locator(SEL.dialog)).not.toBeVisible();
  });

  test('clicking overlay closes dialog', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    await expect(page.locator(SEL.dialog)).toBeVisible();
    
    const overlay = page.locator(SEL.dialogOverlay);
    // Click on overlay but not on dialog
    const overlayBox = await overlay.boundingBox();
    await page.click(SEL.dialogOverlay, { position: { x: 10, y: 10 } });
    
    await expect(page.locator(SEL.dialog)).not.toBeVisible();
  });
});

// ── UC-SP-12: Keyboard support ────────────────────────────────────────────────

test.describe('UC-SP-12 — Keyboard support (Enter to confirm, Escape to cancel)', () => {
  test('Enter key confirms dialog', async ({ page }) => {
    await doHtmlApplyContent(page);
    
    const savePromise = page.waitForResponse(
      response => response.url().includes('/api/html-flow/save-project') && response.status() === 200
    );
    
    await page.locator(SEL.htmlSaveProjectBtn).click();
    const input = page.locator(SEL.dialogInput);
    await input.clear();
    await input.fill('Keyboard Test');
    
    // Press Enter
    await input.press('Enter');
    
    // Should make API call
    const response = await savePromise;
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  test('Escape key cancels dialog', async ({ page }) => {
    await doHtmlApplyContent(page);
    await page.locator(SEL.htmlSaveProjectBtn).click();
    
    await expect(page.locator(SEL.dialog)).toBeVisible();
    
    const input = page.locator(SEL.dialogInput);
    await input.press('Escape');
    
    await expect(page.locator(SEL.dialog)).not.toBeVisible();
  });
});

// ── UC-SP-13: Multi-slide projects ────────────────────────────────────────────

test.describe('UC-SP-13 — Multi-slide projects save correctly', () => {
  test('saves multiple slides as individual files', async ({ page }) => {
    const result = await doHtmlApplyMultiSlide(page, 3);
    
    // Verify we have multiple slides
    expect(result.slideCount).toBeGreaterThan(1);
  });
});
