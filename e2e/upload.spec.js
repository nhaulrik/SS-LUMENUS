/**
 * Upload spec — tests that the flow selector is shown first, that the user
 * can choose the PowerPoint Native flow, and that sample.pptx can be loaded
 * and the app transitions correctly to the Tag step.
 *
 * Also verifies the flow selector itself renders both flow cards.
 *
 * Uses the base `page` fixture so there is no prior setup.
 * These are the entry-point smoke tests: if any of these fail,
 * all downstream fixtures will also fail.
 */

import { test, expect } from '@playwright/test';
import { FIXTURE_PPTX, SEL } from './fixtures.js';

test.describe('Flow selector', () => {
  test('page loads and shows the flow selector', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.flow-select-container')).toBeVisible();
  });

  test('both flow cards are visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.flow-card')).toHaveCount(2);
  });

  test('PowerPoint Native card is present with correct label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.flow-card').first()).toContainText('PowerPoint Native');
  });

  test('Visual card is present with correct label', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.flow-card').nth(1)).toContainText('Visual');
  });

  test('selecting PowerPoint Native shows the PPTX upload zone', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').first().click();
    await expect(page.locator('.upload-zone')).toBeVisible();
  });

  test('selecting Visual shows the HTML upload zone', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').nth(1).click();
    await expect(page.locator('.html-upload-zone')).toBeVisible();
  });

  test('Change flow link returns to flow selector from PPTX upload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').first().click();
    await page.locator('button:has-text("Change flow")').click();
    await expect(page.locator('.flow-select-container')).toBeVisible();
  });

  test('Change flow link returns to flow selector from HTML upload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').nth(1).click();
    await page.locator('button:has-text("Change flow")').click();
    await expect(page.locator('.flow-select-container')).toBeVisible();
  });
});

test.describe('PPTX upload step', () => {
  test('uploading a valid PPTX navigates to the Tag step', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').first().click();
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await expect(page.locator('.tag-slides')).toBeVisible();
  });

  test('slide thumbnails are rendered for each slide in the file', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').first().click();
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slide-btn');
    const thumbs = page.locator('.tag-slide-btn');
    // sample.pptx has 4 slides
    await expect(thumbs).toHaveCount(4);
  });

  test('breadcrumb advances to the Tag step after upload', async ({ page }) => {
    await page.goto('/');
    await page.locator('.flow-card').first().click();
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slides');
    const activeCrumb = page.locator('.breadcrumb-item.active');
    await expect(activeCrumb).toContainText('Tag Elements');
  });
});
