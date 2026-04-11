/**
 * Upload spec — tests that sample.pptx can be loaded and the app
 * transitions correctly to the Tag step.
 *
 * Uses the base `page` fixture so there is no prior setup.
 * These are the entry-point smoke tests: if any of these fail,
 * all downstream fixtures will also fail.
 */

import { test, expect } from '@playwright/test';
import { FIXTURE_PPTX, SEL } from './fixtures.js';

test.describe('Upload step', () => {
  test('page loads and shows the upload zone', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.upload-zone')).toBeVisible();
    await expect(page.locator('.breadcrumbs')).toBeVisible();
  });

  test('uploading a valid PPTX navigates to the Tag step', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    // Slide thumbnails are the reliable indicator of the Tag step
    await expect(page.locator('.tag-slides')).toBeVisible();
  });

  test('slide thumbnails are rendered for each slide in the file', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slide-btn');
    const thumbs = page.locator('.tag-slide-btn');
    // sample.pptx has 3 slides
    await expect(thumbs).toHaveCount(3);
  });

  test('breadcrumb advances to the Tag step after upload', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, FIXTURE_PPTX);
    await page.waitForSelector('.tag-slides');
    const activeCrumb = page.locator('.breadcrumb-item.active');
    await expect(activeCrumb).toContainText('Tag Elements');
  });
});
