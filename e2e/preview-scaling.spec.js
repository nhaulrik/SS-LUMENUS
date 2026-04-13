/**
 * Slide preview scaling spec.
 *
 * Tests that the preview canvas uses actual PPTX slide dimensions
 * for both aspect ratio and element positioning.
 */

import { test, expect, SEL, selectSlide } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCT_CATALOG_PPTX = path.resolve(__dirname, 'fixtures/product_catalog.pptx');

test.describe('Slide preview scaling', () => {
  test('canvas uses PPTX aspect ratio', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const canvas = page.locator('.slide-preview .slide-preview-canvas');
    const box = await canvas.boundingBox();

    // product_catalog.pptx is 13.33" x 7.5" → ratio ≈ 1.78
    const aspectRatio = box.width / box.height;
    expect(aspectRatio).toBeGreaterThan(1.7);
    expect(aspectRatio).toBeLessThan(1.9);
  });

  test('elements fill the canvas coordinate space', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const canvas = page.locator('.slide-preview .slide-preview-canvas');
    const canvasBox = await canvas.boundingBox();

    const elements = canvas.locator('> div');
    const count = await elements.count();
    expect(count).toBeGreaterThan(0);

    const positions = [];
    for (let i = 0; i < count; i++) {
      const box = await elements.nth(i).boundingBox();
      if (box) {
        positions.push({
          rightPct:  ((box.x - canvasBox.x + box.width)  / canvasBox.width)  * 100,
          bottomPct: ((box.y - canvasBox.y + box.height) / canvasBox.height) * 100,
        });
      }
    }

    // Content should span most of the canvas
    expect(Math.max(...positions.map(p => p.rightPct))).toBeGreaterThan(80);
    expect(Math.max(...positions.map(p => p.bottomPct))).toBeGreaterThan(80);
  });

  test('overlay covers the same area as the canvas', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const canvas  = page.locator('.slide-preview .slide-preview-canvas');
    const overlay = page.locator('.slide-overlay');

    const canvasBox  = await canvas.boundingBox();
    const overlayBox = await overlay.boundingBox();

    // Overlay must match canvas dimensions within 2px
    expect(Math.abs(overlayBox.width  - canvasBox.width)).toBeLessThan(2);
    expect(Math.abs(overlayBox.height - canvasBox.height)).toBeLessThan(2);
  });

  test('chart element is positioned within canvas bounds', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const canvas    = page.locator('.slide-preview .slide-preview-canvas');
    const canvasBox = await canvas.boundingBox();

    const chartDivs = canvas.locator('div').filter({ has: page.locator('text=Category') });
    const chartCount = await chartDivs.count();

    if (chartCount > 0) {
      const chartBox = await chartDivs.first().boundingBox();
      const leftPct  = ((chartBox.x - canvasBox.x) / canvasBox.width)  * 100;
      const topPct   = ((chartBox.y - canvasBox.y) / canvasBox.height) * 100;

      expect(leftPct).toBeGreaterThan(0);
      expect(topPct).toBeGreaterThan(0);
    }
  });
});
