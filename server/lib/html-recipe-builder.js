/**
 * server/lib/html-recipe-builder.js
 *
 * Recipe generation and JSON validation for the HTML Visual Flow.
 *
 * Zone model:
 *   - leaf  (zoneType:'leaf')  : data-zone — AI fills a single value (text/number)
 *   - block (zoneType:'block') : data-block — AI fills the entire innerHTML
 *   - label (zoneType:'label') : data-label-for — paired label, treated as leaf
 *
 * Repeatable slides: zones where isRepeatable:true on the section trigger
 * multi-instance generation (one set of values per slide clone).
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when a zone contributes a value to the AI JSON. */
const isGenerated = (z) => z.autoGenerate !== false;

/**
 * Collect the set of slide indices that are repeatable.
 * A slide is repeatable when it contains at least one zone with isRepeatable:true.
 */
function repeatableSlideIndices(zones) {
  const set = new Set();
  zones.forEach(z => { if (z.isRepeatable) set.add(z.slideIndex); });
  return set;
}

/**
 * Detect keys that appear on more than one static slide (contextual fields).
 * Block zones are never contextual — they are always slide-specific.
 */
function detectContextualKeys(zones, repeatableSet) {
  const keyToSlides = {};
  zones
    .filter(z => !repeatableSet.has(z.slideIndex) && z.zoneType !== 'block' && isGenerated(z))
    .forEach(z => {
      if (!keyToSlides[z.key]) keyToSlides[z.key] = new Set();
      keyToSlides[z.key].add(z.slideIndex);
    });
  return new Set(
    Object.entries(keyToSlides)
      .filter(([, slides]) => slides.size > 1)
      .map(([k]) => k)
  );
}

// ── buildHtmlRecipe ───────────────────────────────────────────────────────────

/**
 * Build a recipe prompt string from a zone list.
 *
 * @param {Array}  zones         - Zone objects from parseTemplate / user edits
 * @param {string} globalPrompt  - Optional global guidance prepended to the recipe
 * @returns {string}             - Recipe prompt ready to copy-paste to the AI
 */
export function buildHtmlRecipe(zones, globalPrompt = '') {
  const repSet        = repeatableSlideIndices(zones);
  const contextualKeys = detectContextualKeys(zones, repSet);

  const globalSection = globalPrompt ? `GLOBAL GUIDANCE:\n${globalPrompt}\n\n` : '';

  // Partition zones
  const staticLeafZones = zones.filter(
    z => !repSet.has(z.slideIndex) && z.zoneType !== 'block' && isGenerated(z) && !contextualKeys.has(z.key)
  );
  const contextualZones = zones.filter(
    z => !repSet.has(z.slideIndex) && z.zoneType !== 'block' && isGenerated(z) && contextualKeys.has(z.key)
  );
  const staticBlockZones = zones.filter(
    z => !repSet.has(z.slideIndex) && z.zoneType === 'block' && isGenerated(z)
  );
  const repeatableZones = zones.filter(z => repSet.has(z.slideIndex) && isGenerated(z));

  // Deduplicate static leaf keys (same key may appear on multiple non-repeatable slides
  // only if it's NOT contextual — e.g. a non-unique shared key)
  const seenStatic = new Set();
  const dedupedStatic = staticLeafZones.filter(z => {
    if (seenStatic.has(z.key)) return false;
    seenStatic.add(z.key);
    return true;
  });

  let recipe = `INSTRUCTIONS:
- Return ONLY valid JSON, no explanations or markdown
- Use EXACT key names as provided - do NOT abbreviate or modify key names
- For block zones marked with [HTML BLOCK], return the full innerHTML string

${globalSection}GENERATE THE FOLLOWING DATA:\n`;

  let sectionNum = 1;

  // ── Static leaf fields ────────────────────────────────────────────────────
  if (dedupedStatic.length > 0) {
    recipe += `\n${sectionNum}. STATIC FIELDS (one value per field):\n{\n  "static": {\n`;
    dedupedStatic.forEach(z => {
      const hint        = z.hint || `value for ${z.key}`;
      const maxCharsStr = z.maxChars ? ` (max ${z.maxChars} chars)` : '';
      recipe += `    "${z.key}": "${hint}${maxCharsStr}",\n`;
    });
    recipe += `  },\n}\n`;
    sectionNum++;
  }

  // ── Contextual leaf fields ────────────────────────────────────────────────
  if (contextualZones.length > 0) {
    recipe += `\n${sectionNum}. CONTEXTUAL FIELDS (same field, slide-specific value — one entry per slide):\n"contextual": [\n`;
    const byKey = {};
    contextualZones.forEach(z => {
      if (!byKey[z.key]) byKey[z.key] = [];
      byKey[z.key].push(z);
    });
    Object.entries(byKey).forEach(([key, fieldZones]) => {
      fieldZones
        .sort((a, b) => a.slideIndex - b.slideIndex)
        .forEach(z => {
          const hint        = z.hint || `value for ${key} on slide ${z.slideIndex}`;
          const maxCharsStr = z.maxChars ? ` (max ${z.maxChars} chars)` : '';
          recipe += `  { "slide_index": ${z.slideIndex}, "${key}": "${hint}${maxCharsStr}" },\n`;
        });
    });
    recipe += `]\n`;
    sectionNum++;
  }

  // ── Static block zones ────────────────────────────────────────────────────
  if (staticBlockZones.length > 0) {
    recipe += `\n${sectionNum}. BLOCK ZONES [HTML BLOCK] (generate full innerHTML for each container):\n{\n  "blocks": {\n`;
    staticBlockZones.forEach(z => {
      const promptLine = z.prompt
        ? `      // Prompt: ${z.prompt}\n`
        : '';
      const exampleLine = z.exampleHtml
        ? `      // Example structure: ${z.exampleHtml.replace(/\n/g, ' ').slice(0, 200)}\n`
        : '';
      recipe += `    "${z.key}": {\n${promptLine}${exampleLine}      "value": "<!-- your generated HTML here -->"\n    },\n`;
    });
    recipe += `  }\n}\n`;
    sectionNum++;
  }

  // ── Repeatable slides ─────────────────────────────────────────────────────
  if (repeatableZones.length > 0) {
    // Group by slideIndex to build per-slide structure types
    const bySlide = {};
    repeatableZones.forEach(z => {
      if (!bySlide[z.slideIndex]) bySlide[z.slideIndex] = [];
      bySlide[z.slideIndex].push(z);
    });

    recipe += `\n${sectionNum}. REPEATABLE SLIDES (generate an array of instances — one object per slide clone):\n"slides": {\n`;

    Object.entries(bySlide).forEach(([slideIdx, slideZones]) => {
      // Derive a structure type from the slide's zones or fall back to slide_N
      const structureType = slideZones.find(z => z.structureType)?.structureType
        || `slide_${slideIdx}`;

      recipe += `  "${structureType}": [\n    {\n`;
      recipe += `      "structure_type": "${structureType}",\n`;

      slideZones.forEach(z => {
        const hint        = z.hint || `value for ${z.key}`;
        const maxCharsStr = z.maxChars ? ` (max ${z.maxChars} chars)` : '';
        if (z.zoneType === 'block') {
          const promptNote = z.prompt ? ` // ${z.prompt}` : '';
          recipe += `      "${z.key}": "<!-- generated HTML -->${promptNote}",\n`;
        } else {
          recipe += `      "${z.key}": "${hint}${maxCharsStr}",\n`;
        }
      });

      recipe += `    }\n  ],\n`;
    });

    recipe += `}\n`;
  }

  recipe += `\nIMPORTANT:
- static: one value per key
- contextual: one array entry per slide, each with "slide_index" and the field value
- blocks: innerHTML strings (valid HTML, no surrounding tags)
- slides: array of instances, each with "structure_type" field`;

  return recipe;
}

// ── validateHtmlJson ──────────────────────────────────────────────────────────

/**
 * Validate AI-generated JSON against the zone list.
 *
 * @param {string} jsonString - Raw JSON string from the AI
 * @param {Array}  zones      - Zone objects (same list used to build the recipe)
 * @returns {{ valid, error, foundFields, missingFields, instanceCount }}
 */
export function validateHtmlJson(jsonString, zones) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      error: 'Invalid JSON syntax',
      foundFields: [],
      missingFields: zones.filter(z => isGenerated(z)).map(z => z.key),
    };
  }

  const repSet         = repeatableSlideIndices(zones);
  const contextualKeys = detectContextualKeys(zones, repSet);

  const foundFields   = [];
  const missingFields = [];

  // ── Static leaf fields ────────────────────────────────────────────────────
  const staticData = data.static || data;
  const seenStatic = new Set();
  zones
    .filter(z => !repSet.has(z.slideIndex) && z.zoneType !== 'block' && isGenerated(z) && !contextualKeys.has(z.key))
    .forEach(z => {
      if (seenStatic.has(z.key)) return;
      seenStatic.add(z.key);
      if (staticData[z.key] !== undefined) foundFields.push(z.key);
      else missingFields.push(z.key);
    });

  // ── Contextual leaf fields ────────────────────────────────────────────────
  const contextualData = data.contextual || [];
  zones
    .filter(z => !repSet.has(z.slideIndex) && z.zoneType !== 'block' && isGenerated(z) && contextualKeys.has(z.key))
    .forEach(z => {
      const entry = contextualData.find(c => c.slide_index === z.slideIndex);
      if (entry && entry[z.key] !== undefined) foundFields.push(`${z.key} (slide ${z.slideIndex})`);
      else missingFields.push(`${z.key} (slide ${z.slideIndex})`);
    });

  // ── Static block zones ────────────────────────────────────────────────────
  const blocksData = data.blocks || {};
  zones
    .filter(z => !repSet.has(z.slideIndex) && z.zoneType === 'block' && isGenerated(z))
    .forEach(z => {
      const block = blocksData[z.key];
      if (block && (block.value !== undefined || typeof block === 'string')) foundFields.push(`${z.key} (block)`);
      else missingFields.push(`${z.key} (block)`);
    });

  // ── Repeatable slides ─────────────────────────────────────────────────────
  const slidesData = data.slides || {};
  let instanceCount = 0;

  const bySlide = {};
  zones.filter(z => repSet.has(z.slideIndex) && isGenerated(z)).forEach(z => {
    if (!bySlide[z.slideIndex]) bySlide[z.slideIndex] = [];
    bySlide[z.slideIndex].push(z);
  });

  Object.entries(bySlide).forEach(([slideIdx, slideZones]) => {
    const structureType = slideZones.find(z => z.structureType)?.structureType || `slide_${slideIdx}`;
    const instances     = slidesData[structureType];

    if (!Array.isArray(instances) || instances.length === 0) {
      missingFields.push(`${structureType} (no instances)`);
      return;
    }

    instanceCount += instances.length;
    instances.forEach((inst, idx) => {
      if (!inst.structure_type) missingFields.push(`structure_type (${structureType} instance ${idx + 1})`);
      slideZones.forEach(z => {
        if (inst[z.key] !== undefined) foundFields.push(`${z.key} (${structureType} instance ${idx + 1})`);
        else missingFields.push(`${z.key} (${structureType} instance ${idx + 1})`);
      });
    });
  });

  return {
    valid: missingFields.length === 0,
    error: null,
    foundFields,
    missingFields,
    instanceCount,
  };
}
