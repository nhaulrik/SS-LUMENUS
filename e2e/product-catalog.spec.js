import { test, expect, SEL, selectSlide } from './fixtures.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCT_CATALOG_PPTX = path.resolve(__dirname, 'fixtures/product_catalog.pptx');

test.describe('Product catalog PPTX - slide parsing and rendering', () => {

  test('all slides load without errors', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    const slideCount = await page.locator('.tag-slide-btn').count();
    expect(slideCount).toBeGreaterThan(0);
  });

  test('slide 1 has chart element in server data', async ({ page }) => {
    const base64 = fs.readFileSync(PRODUCT_CATALOG_PPTX).toString('base64');

    const response = await page.request.post('http://localhost:3001/api/upload-pptx', {
      data: { file: base64, fileName: 'product_catalog.pptx' }
    });

    const json = await response.json();
    if (!json.slides) throw new Error('No slides in response');

    const chartElements = json.slides[0].elements.filter(el => el.type === 'chart');
    expect(chartElements.length).toBeGreaterThan(0);
    expect(chartElements[0].chartData).toBeDefined();
  });

  test('slide 1 shows chart in preview', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const content = await page.locator('.slide-preview .slide-preview-canvas').textContent();
    expect(content.includes('Chart') || content.includes('Category')).toBe(true);
  });

  test('slide 1 preview has text content', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const content = await page.locator('.slide-preview .slide-preview-canvas').textContent();
    expect(content.length).toBeGreaterThan(10);
  });

  test('slide preview uses correct aspect ratio from PPTX dimensions', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(300);

    // product_catalog.pptx is 13.333" x 7.5" — aspect ratio ~1.78, not 16/9
    const canvas = page.locator('.slide-preview .slide-preview-canvas');
    const box = await canvas.boundingBox();
    const ratio = box.width / box.height;
    expect(ratio).toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(1.9);
  });

  test('elements span full canvas height', async ({ page }) => {
    await page.goto('/');
    await page.setInputFiles(SEL.fileInput, PRODUCT_CATALOG_PPTX);
    await page.waitForSelector('.tag-slides .tag-slide-btn', { timeout: 10000 });

    await selectSlide(page, 1);
    await page.waitForTimeout(500);

    const canvas    = page.locator('.slide-preview .slide-preview-canvas');
    const canvasBox = await canvas.boundingBox();
    const elements  = canvas.locator('> div');
    const count     = await elements.count();

    const positions = [];
    for (let i = 0; i < count; i++) {
      const box = await elements.nth(i).boundingBox();
      if (box) positions.push({
        top:    (box.y - canvasBox.y) / canvasBox.height,
        bottom: (box.y - canvasBox.y + box.height) / canvasBox.height,
      });
    }

    expect(Math.min(...positions.map(p => p.top))).toBeLessThan(0.1);
    expect(Math.max(...positions.map(p => p.bottom))).toBeGreaterThan(0.9);
  });
});
