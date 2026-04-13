/**
 * PPTX validity spec.
 *
 * Verifies that generated PPTX files have no XML corruption,
 * no broken relationships, no duplicate slide IDs, and that
 * slide content is placed correctly.
 */

import { test, expect, SEL, doUpload, selectSlide, tagElement, doFullApply, REPEATABLE_JSON, STATIC_JSON } from "./fixtures.js";
import AdmZip from "adm-zip";
import path from "path";

// -- Validate a PPTX buffer ----------------------------------------------------

function validatePptxBuffer(buffer) {
  const issues = [];
  let zip;
  try { zip = new AdmZip(buffer); }
  catch (e) { return ["ZIP_ERROR: " + e.message]; }

  const entries = zip.getEntries().map(e => e.entryName);

  if (!entries.includes("[Content_Types].xml")) issues.push("MISSING [Content_Types].xml");
  if (!entries.includes("ppt/presentation.xml")) issues.push("MISSING ppt/presentation.xml");

  const slides = entries.filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e));
  if (slides.length === 0) issues.push("NO SLIDES");

  slides.forEach(slideEntry => {
    const xml = zip.getEntry(slideEntry).getData().toString("utf8");

    const multiline = xml.match(/<a:t>[^<]*\n[^<]*<\/a:t>/g);
    if (multiline) issues.push("MULTILINE_AT in " + slideEntry);

    const badAmp = xml.match(/<a:t>[^<]*&(?!(amp|lt|gt|quot|apos);)[^<]*<\/a:t>/g);
    if (badAmp) issues.push("BAD_AMP in " + slideEntry);

    for (let i = 0; i < xml.length; i++) {
      const c = xml.charCodeAt(i);
      if (c < 0x20 && c !== 0x09 && c !== 0x0A && c !== 0x0D) {
        issues.push("CTRL_CHAR in " + slideEntry);
        break;
      }
    }

    const unreplaced = xml.match(/\{\{[^}]+\}\}/g);
    if (unreplaced) issues.push("UNREPLACED in " + slideEntry + ": " + unreplaced[0]);

    const open  = (xml.match(/<a:t>/g)  || []).length;
    const close = (xml.match(/<\/a:t>/g) || []).length;
    if (open !== close) issues.push("MISMATCH_AT in " + slideEntry);

    const slideNum = slideEntry.match(/slide(\d+)\.xml/)[1];
    if (!entries.includes("ppt/slides/_rels/slide" + slideNum + ".xml.rels")) {
      issues.push("MISSING_RELS for " + slideEntry);
    }
  });

  // Duplicate slide IDs
  const presXml = zip.getEntry("ppt/presentation.xml")?.getData().toString("utf8") || "";
  const sldIds  = (presXml.match(/<p:sldId[^>]+id="(\d+)"/g) || []).map(m => m.match(/id="(\d+)"/)[1]);
  if (sldIds.length !== new Set(sldIds).size) issues.push("DUPLICATE_SLIDE_IDS");

  // Broken rels
  entries.filter(e => e.endsWith(".rels")).forEach(relsPath => {
    const relsXml = zip.getEntry(relsPath).getData().toString("utf8");
    const targetRe = /Target="([^"]+)"/g;
    let m;
    while ((m = targetRe.exec(relsXml)) !== null) {
      const target = m[1];
      if (target.startsWith("http") || target.startsWith("/") || !target) continue;
      const base     = relsPath.replace("_rels/", "").replace(/[^/]+$/, "");
      const resolved = path.posix.normalize(base + target).replace(/^\//, "");
      if (!entries.includes(resolved)) issues.push("BROKEN_REF: " + target + " in " + relsPath);
    }
  });

  return issues;
}

async function fetchPptxFromHistoryLink(page) {
  const link = page.locator(SEL.historyDownloadBtn).first();
  await expect(link).toBeVisible({ timeout: 5000 });
  const href = await link.getAttribute("href");
  const response = await page.request.get("http://localhost:3001" + href);
  expect(response.status()).toBe(200);
  return Buffer.from(await response.body());
}

// JSON with newlines -- simulates AI output that previously broke the PPTX
const NEWLINE_JSON = {
  slides: {
    "Initiatie Group": [
      {
        structure_type:             "Initiatie Group",
        initiative_group:           "Line one\n\nLine two\n- Bullet point",
        initiative_group_subheader: "Subheader with\nnewline"
      }
    ]
  }
};

test.describe("PPTX validity after patch apply", () => {

  test("no XML issues in generated PPTX (repeatable slides)", async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    const buffer = await fetchPptxFromHistoryLink(page);
    expect(validatePptxBuffer(buffer)).toEqual([]);
  });

  test("no multiline a:t when AI generates values with newlines", async ({ taggedPage: page }) => {
    await doFullApply(page, NEWLINE_JSON);
    const buffer = await fetchPptxFromHistoryLink(page);
    const issues = validatePptxBuffer(buffer);
    expect(issues.filter(i => i.includes("MULTILINE"))).toEqual([]);
    expect(issues.filter(i => i.includes("CTRL_CHAR"))).toEqual([]);
  });

  test("tagged element value appears in the correct slide", async ({ taggedPage: page }) => {
    const markerJson = {
      slides: {
        "Initiatie Group": [
          {
            structure_type:             "Initiatie Group",
            initiative_group:           "TEST_MARKER_XYZ",
            initiative_group_subheader: "Subheader"
          }
        ]
      }
    };
    await doFullApply(page, markerJson);
    const buffer = await fetchPptxFromHistoryLink(page);
    const zip = new AdmZip(buffer);

    // The repeatable slide (slide 2) becomes a generated slide in the output.
    // It should contain TEST_MARKER_XYZ somewhere.
    let found = false;
    zip.getEntries()
      .filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
      .forEach(entry => {
        if (entry.getData().toString("utf8").includes("TEST_MARKER_XYZ")) found = true;
      });
    expect(found).toBe(true);

    // Slide 1 (static) must NOT contain the marker
    const slide1 = zip.getEntry("ppt/slides/slide1.xml");
    expect(slide1.getData().toString("utf8")).not.toContain("TEST_MARKER_XYZ");
  });

  test("no broken rels and no duplicate slide IDs", async ({ taggedPage: page }) => {
    await doFullApply(page, REPEATABLE_JSON);
    const buffer = await fetchPptxFromHistoryLink(page);
    const issues = validatePptxBuffer(buffer);
    expect(issues.filter(i => i.includes("BROKEN_REF"))).toEqual([]);
    expect(issues.filter(i => i.includes("DUPLICATE"))).toEqual([]);
  });
});
