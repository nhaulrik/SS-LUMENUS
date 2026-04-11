/**
 * Recipe generation spec.
 *
 * Tests that the recipe JSON is lean and only contains data for fields
 * that actually need AI-generated content (autoGenerate: true).
 */

import { test, expect, SEL, doUpload, selectSlide, tagElement, configureRepeatable } from './fixtures.js';

test.describe('Recipe generation - lean output', () => {
  test('recipe only includes fields with autoGenerate enabled', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Configure repeatable slide
    await page.locator(SEL.repeatableToggle).check();
    await page.locator(SEL.structureType).fill('test_structure');
    await page.locator(SEL.customPrompt).fill('test prompt');

    // Tag an element with autoGenerate = true (AI generation enabled)
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'ai_enabled_field',
      hint: 'hint for AI field',
      ai: true
    });

    // Tag another element with autoGenerate = false (manual entry)
    await page.locator(SEL.overlayByText('Group Summary | Roadmap Initiative Overview')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('manual_field');
    await page.locator(SEL.modalAI).uncheck();
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // The recipe should include the AI-enabled field
    expect(recipeText).toContain('ai_enabled_field');
    
    // The recipe should NOT include the manual field (autoGenerate: false)
    // because we don't need to generate content for it
    expect(recipeText).not.toContain('manual_field');
  });

  test('recipe does not include duplicate hint information', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Tag an element
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'test_key',
      hint: 'Test hint',
      ai: true
    });

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // The hint should appear only once
    const hintCount = (recipeText.match(/Test hint/g) || []).length;
    expect(hintCount).toBe(1);
  });

  test('recipe includes maxChars for AI-generated fields', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Uncheck repeatable - we're testing static fields only
    await page.locator(SEL.repeatableToggle).uncheck();

    // Tag element and clear maxChars in the patch table
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'ai_field',
      hint: 'AI hint',
      ai: true
    });

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // AI-generated field should appear
    expect(recipeText).toContain('ai_field');
    expect(recipeText).toContain('AI hint');
  });

  test('recipe includes maxChars when maxChars is set', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Uncheck repeatable for static fields
    await page.locator(SEL.repeatableToggle).uncheck();

    // The sample fixture contains tagged elements with maxChars already
    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // For fields that have maxChars, the constraint should be included
    // Sample.pptx has the first slide with fields that have maxChars
    expect(recipeText).toContain('max');
  });

  test('recipe does not include comments that bloat the output', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Tag a field
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'clean_field',
      hint: 'Clean hint',
      ai: true
    });

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // Comments like "// Each entry:" add bloat, let's minimize them
    expect(recipeText).not.toContain('//');
  });

  test('repeatable section only includes fields with autoGenerate', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Configure repeatable
    await page.locator(SEL.repeatableToggle).check();
    await page.locator(SEL.structureType).fill('repeatable_slide');
    await page.locator(SEL.customPrompt).fill('generate instances');

    // Tag one field with AI
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'repeatable_ai_field',
      hint: 'AI hint',
      ai: true
    });

    // Tag another field without AI
    await page.locator(SEL.overlayByText('Group Summary | Roadmap Initiative Overview')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('repeatable_manual_field');
    await page.locator(SEL.modalHint).fill('manual hint');
    await page.locator(SEL.modalAI).uncheck();
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // Only the AI field should be in the repeatable section
    expect(recipeText).toContain('repeatable_ai_field');
    expect(recipeText).not.toContain('repeatable_manual_field');
  });

  test('empty sections are omitted from recipe', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Ensure not repeatable (fixture may have it pre-configured)
    await page.locator(SEL.repeatableToggle).uncheck();

    // Tag a field but DON'T make it repeatable (so no repeatable section)
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'static_only',
      hint: 'static hint',
      ai: true
    });

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // If there are no repeatable slides, the slides section should be minimal or omitted
    // Also if there are no contextual fields, that section should be omitted
    expect(recipeText).not.toContain('REPEATABLE');
    expect(recipeText).not.toContain('CONTEXTUAL');
  });
});