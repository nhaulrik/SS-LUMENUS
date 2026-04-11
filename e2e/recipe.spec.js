/**
 * Recipe generation spec.
 *
 * Starts from: both elements tagged (taggedPage fixture).
 * Each test clicks Generate Recipe itself — the fixture leaves us on the Tag step
 * so the button is available fresh each time.
 */

import { test, expect, SEL } from './fixtures.js';

async function generateRecipe(page) {
  await page.locator('button:has-text("Generate Recipe")').click();
  await page.waitForSelector(SEL.recipeArea);
}

test.describe('Recipe generation', () => {
  test('navigates to the Recipe step after generating', async ({ taggedPage: page }) => {
    await generateRecipe(page);
    await expect(page.locator('.breadcrumb-item.active')).toContainText('Recipe');
  });

  test('recipe contains the initiative_group key', async ({ taggedPage: page }) => {
    await generateRecipe(page);
    await expect(page.locator(SEL.recipeArea)).toContainText('"initiative_group"');
  });

  test('recipe contains the initiative_group_subheader key', async ({ taggedPage: page }) => {
    await generateRecipe(page);
    await expect(page.locator(SEL.recipeArea)).toContainText('"initiative_group_subheader"');
  });

  test('recipe contains the structure type "Initiatie Group"', async ({ taggedPage: page }) => {
    await generateRecipe(page);
    await expect(page.locator(SEL.recipeArea)).toContainText('Initiatie Group');
  });

  test('recipe contains the custom prompt text', async ({ taggedPage: page }) => {
    await generateRecipe(page);
    await expect(page.locator(SEL.recipeArea)).toContainText('an instance for each initiative group');
  });

  test('keys appear in the slides section, not in static', async ({ taggedPage: page }) => {
    await generateRecipe(page);
    const text = await page.locator(SEL.recipeArea).innerText();
    const slidesIdx   = text.indexOf('"slides"');
    const staticIdx   = text.indexOf('"static"');
    const groupKeyIdx = text.indexOf('"initiative_group"');
    expect(slidesIdx).toBeGreaterThan(-1);
    // The key must appear after the "slides" section header
    expect(groupKeyIdx).toBeGreaterThan(slidesIdx);
    // "static" section appears before "slides" section in the recipe
    expect(staticIdx).toBeLessThan(slidesIdx);
  });
});
