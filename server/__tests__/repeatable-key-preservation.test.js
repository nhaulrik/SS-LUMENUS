import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";
import { buildPptxZip } from "../lib/pptx-builder.js";
import { parseSlides } from "../lib/slide-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PPTX = path.resolve(__dirname, "./fixtures/sample.pptx");

let testDir, outputPath, previewData, parsedSlides, templateSlide2Elements, round1Tags;

const repeatableSlides = [{ slideIndex: 2, structureType: "initiative", customPrompt: "" }];
const jsonData = {
  slides: {
    initiative: [
      { structure_type: "initiative", initiative_group: "Alpha Group", initiative_group_subheader: "Alpha Subheader" },
      { structure_type: "initiative", initiative_group: "Beta Group",  initiative_group_subheader: "Beta Subheader"  }
    ]
  }
};

beforeAll(() => {
  testDir    = fs.mkdtempSync(path.join(os.tmpdir(), "solon-repkey-"));
  outputPath = path.join(testDir, "output.pptx");

  const templateZip    = new AdmZip(FIXTURE_PPTX);
  const templateSlides = parseSlides(templateZip);
  templateSlide2Elements = templateSlides.find(s => s.index === 2).elements;

  const titleElem = templateSlide2Elements.find(e => e.type === "text" && e.text === "Core Revenue Management");
  const subElem   = templateSlide2Elements.find(e => e.type === "text" && e.text && e.text.includes("Group Summary"));
  if (!titleElem || !subElem) throw new Error("Expected elements not found on slide 2");

  // Pass tags with autoGenerate:true so the output PPTX contains AI values (Alpha/Beta Group)
  // This simulates what round-1 output looks like
  round1Tags = [
    { elementId: titleElem.id, key: "initiative_group",           hint: "Title",     slideIndex: 2, originalText: titleElem.text, shapeName: titleElem.shapeName, maxChars: 30, autoGenerate: true, elementOrder: 1 },
    { elementId: subElem.id,   key: "initiative_group_subheader", hint: "Subheader", slideIndex: 2, originalText: subElem.text,   shapeName: subElem.shapeName,   maxChars: 80, autoGenerate: true, elementOrder: 2 }
  ];

  const result = buildPptxZip(FIXTURE_PPTX, round1Tags, jsonData, repeatableSlides);
  previewData  = result.previewData;
  result.zip.writeZip(outputPath);
  parsedSlides = parseSlides(new AdmZip(outputPath));
});

afterAll(() => { fs.rmSync(testDir, { recursive: true, force: true }); });

function makeRound1Tags() { return round1Tags; }

function mergeTagsPreservingClones(existingTags, slides, preview) {
  const byShapeName = {};
  existingTags.forEach(t => { if (t.shapeName) byShapeName[t.shapeName] = t; });
  const cloneMap = {};
  preview.forEach(p => { if (p.templateSlideIndex && p.instanceIndex !== null) cloneMap[p.slideNumber] = p.templateSlideIndex; });
  const synthetic = [];
  const covered   = new Set();
  slides.forEach(slide => {
    const tplIdx = cloneMap[slide.index];
    if (!tplIdx) return;
    slide.elements.forEach((elem, elemIdx) => {
      const src = elem.shapeName && byShapeName[elem.shapeName];
      if (!src || src.slideIndex !== tplIdx) return;
      // Use elem.text (current output PPTX text) as originalText, not src.originalText (template placeholder)
      synthetic.push({ ...src, elementId: elem.id, slideIndex: slide.index, autoGenerate: false, originalText: elem.text ?? src.originalText });
      covered.add(elem.id);
    });
  });
  const existingIds = new Set(existingTags.map(t => t.elementId));
  let order = existingTags.reduce((m, t) => Math.max(m, t.elementOrder || 0), 0) + 1;
  const stubs = [];
  slides.forEach(slide => {
    slide.elements.forEach(elem => {
      if (!covered.has(elem.id) && !existingIds.has(elem.id) && elem.text && elem.text.trim()) {
        stubs.push({ elementId: elem.id, key: elem.text.toLowerCase().replace(/\W+/g, "_").substring(0, 40),
          hint: elem.text.trim(), slideIndex: slide.index, originalText: elem.text,
          shapeName: elem.shapeName, maxChars: elem.maxChars, autoGenerate: false, elementOrder: order++ });
      }
    });
  });
  return [...existingTags.map(t => ({ ...t, autoGenerate: false })), ...stubs, ...synthetic];
}

describe("shapeName on template elements", () => {
  it("text elements have shapeName", () => {
    templateSlide2Elements.filter(e => e.type === "text").forEach(e => {
      expect(e.shapeName).toBeDefined();
      expect(typeof e.shapeName).toBe("string");
    });
  });
  it("rect elements have shapeName", () => {
    templateSlide2Elements.filter(e => e.type === "rect").forEach(e => {
      expect(e.shapeName).toBeDefined();
    });
  });
});

describe("shapeName stability across clones", () => {
  it("every template shapeName appears on each cloned slide", () => {
    const templateNames = new Set(templateSlide2Elements.map(e => e.shapeName));
    const cloneNums = previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber);
    expect(cloneNums.length).toBe(2);
    cloneNums.forEach(num => {
      const slide = parsedSlides.find(s => s.index === num);
      const cloneNames = new Set(slide.elements.map(e => e.shapeName));
      templateNames.forEach(name => expect(cloneNames.has(name)).toBe(true));
    });
  });
});

describe("previewData.templateSlideIndex", () => {
  it("is present on every entry", () => {
    previewData.forEach(p => expect(typeof p.templateSlideIndex).toBe("number"));
  });
  it("clones carry template index 2, not their output position", () => {
    previewData.filter(p => p.instanceIndex !== null).forEach(p => {
      expect(p.templateSlideIndex).toBe(2);
    });
  });
});

describe("mergeTagsPreservingClones", () => {
  it("initiative_group key is preserved on all cloned slides", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber).forEach(num => {
      expect(merged.find(t => t.slideIndex === num && t.key === "initiative_group")).toBeDefined();
    });
  });

  it("initiative_group_subheader key is preserved on all cloned slides", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber).forEach(num => {
      expect(merged.find(t => t.slideIndex === num && t.key === "initiative_group_subheader")).toBeDefined();
    });
  });

  it("cloned slide tags have the correct slideIndex (output position)", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber).forEach(num => {
      merged.filter(t => t.slideIndex === num).forEach(t => expect(t.slideIndex).toBe(num));
    });
  });

  it("cloned slide tags have elementIds matching the output slide", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber).forEach(num => {
      const tag = merged.find(t => t.slideIndex === num && t.key === "initiative_group");
      expect(tag).toBeDefined();
      expect(tag.elementId).toMatch(new RegExp("^slide" + num + "-"));
    });
  });

  it("autoGenerate is false on all merged tags", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    merged.forEach(t => expect(t.autoGenerate).toBe(false));
  });

  it("original template tags are still present", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    expect(merged.find(t => t.slideIndex === 2 && t.key === "initiative_group")).toBeDefined();
  });

  it("REGRESSION: produces zero synthetic tags when tags have no shapeName (documents the pre-fix bug)", () => {
    const tagsNoShape = makeRound1Tags().map(t => { const c = Object.assign({}, t); delete c.shapeName; return c; });
    const merged = mergeTagsPreservingClones(tagsNoShape, parsedSlides, previewData);
    const cloneNums = previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber);
    cloneNums.forEach(num => {
      const tag = merged.find(t => t.slideIndex === num && t.key === "initiative_group");
      expect(tag).toBeUndefined();
    });
  });

  it("tags from makeRound1Tags have shapeName (simulates handleSaveTag after fix)", () => {
    makeRound1Tags().forEach(t => {
      expect(t.shapeName).toBeDefined();
      expect(typeof t.shapeName).toBe("string");
      expect(t.shapeName.length).toBeGreaterThan(0);
    });
  });
});

describe("originalText update on synthetic tags", () => {
  it("synthetic tags carry the current element text from the output PPTX, not the template placeholder", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    const cloneNums = previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber);

    cloneNums.forEach(num => {
      const slide = parsedSlides.find(s => s.index === num);
      const tag = merged.find(t => t.slideIndex === num && t.key === "initiative_group");
      expect(tag).toBeDefined();
      const elem = slide.elements.find(e => e.id === tag.elementId);
      expect(elem).toBeDefined();
      // originalText must reflect the AI-generated value in the output PPTX
      expect(tag.originalText).toBe(elem.text);
      expect(tag.originalText).not.toBe(round1Tags[0].originalText);
    });
  });

  it("recipe-builder receives correct context value (AI output, not template placeholder)", () => {
    const merged = mergeTagsPreservingClones(makeRound1Tags(), parsedSlides, previewData);
    const cloneNums = previewData.filter(p => p.instanceIndex !== null).map(p => p.slideNumber);

    const values = cloneNums.map(num => {
      const tag = merged.find(t => t.slideIndex === num && t.key === "initiative_group");
      return tag?.originalText;
    });

    // Values should differ per slide (Alpha Group vs Beta Group)
    const unique = new Set(values);
    expect(unique.size).toBeGreaterThan(1);

    // None should be the original template placeholder
    values.forEach(v => {
      expect(v).not.toBe("Core Revenue Management");
    });
  });
});
