/**
 * Key collision detection spec.
 *
 * Tests that the app warns users when they rename a tag key to one that
 * already exists on a different element, and blocks same-slide duplicates.
 */

import { test, expect, SEL, doUpload, selectSlide, tagElement } from "./fixtures.js";

// Helper: tag two elements on different slides with different keys
async function setupTwoKeys(page) {
  await doUpload(page);
  await selectSlide(page, 2);
  await tagElement(page, {
    originalText: "Core Revenue Management",
    key:          "title",
    hint:         "Title",
    ai:           true
  });
  await selectSlide(page, 3);
  await tagElement(page, {
    originalText: "Core Revenue Management",
    key:          "subtitle",
    hint:         "Subtitle",
    ai:           true
  });
  await selectSlide(page, 3);
}

// Helper: tag two elements on the SAME slide with different keys
async function setupSameSlide(page) {
  await doUpload(page);
  await selectSlide(page, 2);
  await tagElement(page, {
    originalText: "Core Revenue Management",
    key:          "title",
    hint:         "Title",
    ai:           true
  });
  await tagElement(page, {
    originalText: "Group Summary | Roadmap Initiative Overview",
    key:          "subtitle",
    hint:         "Subtitle",
    ai:           true
  });
}

// -- Same-slide collision (hard block) -----------------------------------------

test.describe("Same-slide key collision", () => {
  test("inline error appears when renaming to a key already used on the same slide", async ({ page }) => {
    await setupSameSlide(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await input.press("Tab");

    await expect(page.locator("[data-testid='key-collision-same-slide']")).toBeVisible();
  });

  test("error disappears when the key is changed to something unique", async ({ page }) => {
    await setupSameSlide(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await page.waitForTimeout(200);
    await input.fill("unique_key");
    await input.press("Tab");

    await expect(page.locator("[data-testid='key-collision-same-slide']")).toHaveCount(0);
  });

  test("collision warning modal does NOT appear for same-slide collision", async ({ page }) => {
    await setupSameSlide(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await input.press("Tab");

    // The modal is for cross-slide collisions only
    await expect(page.locator(".key-collision-modal")).toHaveCount(0);
  });
});

// -- Cross-slide collision (warning with choice) -------------------------------

test.describe("Cross-slide key collision", () => {
  test("collision warning modal appears when renaming to a key used on another slide", async ({ page }) => {
    await setupTwoKeys(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await input.press("Tab");

    await expect(page.locator(".key-collision-modal")).toBeVisible();
  });

  test("modal shows the colliding element details", async ({ page }) => {
    await setupTwoKeys(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await input.press("Tab");

    await page.waitForSelector(".key-collision-modal");
    await expect(page.locator(".key-collision-modal")).toContainText("Slide 2");
    await expect(page.locator(".key-collision-modal")).toContainText("Core Revenue Management");
  });

  test("Revert restores the original key", async ({ page }) => {
    await setupTwoKeys(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await input.press("Tab");

    await page.waitForSelector(".key-collision-modal");
    await page.locator("[data-testid='collision-revert']").click();
    await page.waitForTimeout(1200);

    // Modal gone, key restored
    await expect(page.locator(".key-collision-modal")).toHaveCount(0);
    await expect(page.locator(SEL.patchRowByKey("subtitle"))).toBeVisible();
  });

  test("Keep anyway dismisses modal and preserves the new key", async ({ page }) => {
    await setupTwoKeys(page);

    const input = page.locator(SEL.patchRowByKey("subtitle")).locator(SEL.patchKeyInput);
    await input.click();
    await input.fill("title");
    await input.press("Tab");

    await page.waitForSelector(".key-collision-modal");
    await page.locator("[data-testid='collision-keep']").click();
    await page.waitForTimeout(1200);

    // Modal gone, key kept, propagate icon appears (now shared)
    await expect(page.locator(".key-collision-modal")).toHaveCount(0);
    await expect(page.locator(SEL.patchRowByKey("title")).first()).toBeVisible();
    await expect(page.locator(".propagate-icon").first()).toBeVisible();
  });

  test("modal does NOT appear when renaming to the same key as a propagated clone", async ({ page }) => {
    await doUpload(page);
    await selectSlide(page, 2);
    await tagElement(page, { originalText: "Core Revenue Management", key: "title", hint: "Title", ai: true });
    await selectSlide(page, 3);
    await tagElement(page, { originalText: "Core Revenue Management", key: "title", hint: "Title", ai: true });
    await selectSlide(page, 3);

    // Both already share the same key — editing the key and typing the same value
    // should not trigger the modal (key === originalKey, no change)
    const input = page.locator(SEL.patchRowByKey("title")).locator(SEL.patchKeyInput);
    await input.click();
    await input.press("End");
    await input.press("Tab");

    await expect(page.locator(".key-collision-modal")).toHaveCount(0);
  });
});
