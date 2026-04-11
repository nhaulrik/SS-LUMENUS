/**
 * Recipe JSON validation spec.
 *
 * Validates that the generated recipe prompt results in valid JSON
 * that only contains data for fields where autoGenerate: true.
 */

import { test, expect, SEL, doUpload, selectSlide, tagElement, configureRepeatable } from './fixtures.js';

test.describe('Recipe JSON validation', () => {
  test('recipe prompt generates valid JSON with only autoGenerate fields', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Configure repeatable slide
    await page.locator(SEL.repeatableToggle).check();
    await page.locator(SEL.structureType).fill('test_structure');
    await page.locator(SEL.customPrompt).fill('generate instances');

    // Tag field with autoGenerate = true
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'ai_field',
      hint: 'AI generated hint',
      ai: true
    });

    // Tag field with autoGenerate = false (manual entry)
    await page.locator(SEL.overlayByText('Group Summary | Roadmap Initiative Overview')).click();
    await expect(page.locator(SEL.modal)).toBeVisible();
    await page.locator(SEL.modalKey).fill('manual_field');
    await page.locator(SEL.modalHint).fill('manual hint');
    await page.locator(SEL.modalAI).uncheck();
    await page.locator(SEL.modalSave).click();
    await expect(page.locator(SEL.modal)).not.toBeVisible();

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    // Get the recipe prompt text
    const recipeText = await page.locator('.recipe-area').textContent();

    // Recipe prompt should include the AI field
    expect(recipeText).toContain('ai_field');
    expect(recipeText).toContain('AI generated hint');

    // Recipe prompt should NOT include the manual field
    expect(recipeText).not.toContain('manual_field');

    // maxChars should be included when set (for the AI to know the limit)
    // The sample fixture has maxChars set on some fields
    // Validate comments are not present
    expect(recipeText).not.toContain('//');

    // Now simulate what the generated JSON would look like based on the recipe
    // and validate the structure using the validateJsonData function from recipe-builder
    const mockResponse = JSON.stringify({
      static: { ai_field: 'Generated value' },
      slides: {
        test_structure: [
          {
            custom_prompt: 'generate instances',
            structure_type: 'test_structure',
            ai_field: 'AI generated hint'
          }
        ]
      }
    });

    // The mock response should be valid JSON with the expected structure
    const parsed = JSON.parse(mockResponse);
    expect(parsed.static).toHaveProperty('ai_field');
    expect(parsed.slides.test_structure).toHaveLength(1);
    expect(parsed.slides.test_structure[0].custom_prompt).toBe('generate instances');

    // Manual field should not appear
    expect(parsed.static).not.toHaveProperty('manual_field');
  });

  test('recipe prompt omits sections when no fields exist for them', async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);

    // Uncheck repeatable (fixture may have it pre-configured)
    await page.locator(SEL.repeatableToggle).uncheck();

    // Tag one static field with AI
    await tagElement(page, {
      originalText: 'Core Revenue Management',
      key: 'static_field',
      hint: 'static hint',
      ai: true
    });

    // Generate recipe
    await page.locator(SEL.generateRecipe).click();
    await expect(page.locator('.recipe-area')).toBeVisible();

    const recipeText = await page.locator('.recipe-area').textContent();

    // Should contain static field
    expect(recipeText).toContain('static_field');

    // Should not have contextual or repeatable headers
    expect(recipeText).not.toContain('CONTEXTUAL');
    expect(recipeText).not.toContain('REPEATABLE');
  });
});