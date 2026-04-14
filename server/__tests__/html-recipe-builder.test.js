/**
 * Tests for server/lib/html-recipe-builder.js
 *
 * Covers buildHtmlRecipe and validateHtmlJson for:
 *   - leaf zones (static, contextual)
 *   - block zones (static, repeatable)
 *   - mixed leaf + block
 *   - repeatable slides
 *   - global prompt
 *   - section numbering
 */

import { describe, it, expect } from 'vitest';
import { buildHtmlRecipe, validateHtmlJson } from '../lib/html-recipe-builder.js';

// ── Zone factories ─────────────────────────────────────────────────────────────

const leaf = (key, hint = '', slideIndex = 1, autoGenerate = true) => ({
  zoneType: 'leaf', key, hint, slideIndex, type: 'text', autoGenerate,
  isRepeatable: false, repeatableKey: null,
});

const block = (key, prompt = '', slideIndex = 1, exampleHtml = '') => ({
  zoneType: 'block', key, hint: prompt, prompt, exampleHtml, slideIndex,
  type: 'block', autoGenerate: true, isRepeatable: false, repeatableKey: null,
});

// Repeatable zones — unique (different per instance)
const repLeaf = (key, hint = '', slideIndex = 2, unique = true) => ({
  zoneType: 'leaf', key, hint, slideIndex, type: 'text', autoGenerate: true,
  isRepeatable: true, repeatableKey: null, unique,
});

const repBlock = (key, prompt = '', slideIndex = 2, exampleHtml = '', unique = true) => ({
  zoneType: 'block', key, hint: prompt, prompt, exampleHtml, slideIndex,
  type: 'block', autoGenerate: true, isRepeatable: true, repeatableKey: null, unique,
});

// ─────────────────────────────────────────────────────────────────────────────
// buildHtmlRecipe
// ─────────────────────────────────────────────────────────────────────────────

describe('buildHtmlRecipe', () => {
  it('contains INSTRUCTIONS header', () => {
    const recipe = buildHtmlRecipe([leaf('title')]);
    expect(recipe).toContain('INSTRUCTIONS');
    expect(recipe).toContain('Return ONLY valid JSON');
  });

  it('includes STATIC FIELDS section for leaf zones', () => {
    const recipe = buildHtmlRecipe([leaf('company_name', 'the company')]);
    expect(recipe).toContain('STATIC FIELDS');
    expect(recipe).toContain('"company_name"');
    expect(recipe).toContain('the company');
  });

  it('excludes non-autoGenerate leaf zones', () => {
    const zones  = [leaf('manual', 'hint', 1, false), leaf('auto', 'hint', 1, true)];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('"auto"');
    expect(recipe).not.toContain('"manual"');
  });

  it('deduplicates static keys that appear on multiple non-repeatable slides', () => {
    const zones  = [leaf('header', 'h', 1), leaf('header', 'h', 2)];
    // Both slides share the key → contextual, not static
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('CONTEXTUAL FIELDS');
    // Should appear twice in contextual (once per slide) but only once in static
    expect(recipe).not.toContain('STATIC FIELDS');
  });

  it('includes CONTEXTUAL FIELDS for shared keys across slides', () => {
    const zones  = [leaf('desc', 'slide 1 desc', 1), leaf('desc', 'slide 2 desc', 2)];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('CONTEXTUAL FIELDS');
    expect(recipe).toContain('"desc"');
    expect(recipe).toContain('slide_index');
    expect(recipe).toContain('"slide_index": 1');
    expect(recipe).toContain('"slide_index": 2');
  });

  it('includes BLOCK ZONES section for block zones', () => {
    const zones  = [block('initiatives_table', 'Populate with Q3 data')];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('BLOCK ZONES');
    expect(recipe).toContain('[HTML BLOCK]');
    expect(recipe).toContain('"initiatives_table"');
    expect(recipe).toContain('Populate with Q3 data');
  });

  it('includes example HTML in block zone entry when available', () => {
    const zones  = [block('my_table', 'fill it', 1, '<tr><td>Row</td></tr>')];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('<tr>');
  });

  it('includes REPEATABLE SLIDE section for repeatable leaf zones', () => {
    const repSlides = [{ slideIndex: 2, key: 'item', prompt: 'one per item' }];
    const zones     = [leaf('title', 'page title', 1), repLeaf('item_name', 'name', 2, true)];
    const recipe    = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('REPEATABLE SLIDE');
    expect(recipe).toContain('item');
    expect(recipe).toContain('"item_name"');
  });

  it('includes repeatable block zones inside REPEATABLE SLIDE section', () => {
    const repSlides = [{ slideIndex: 2, key: 'slide', prompt: 'one per slide' }];
    const zones     = [repBlock('table_block', 'generate rows', 2, '', true)];
    const recipe    = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('REPEATABLE SLIDE');
    expect(recipe).toContain('"table_block"');
    expect(recipe).toContain('HTML BLOCK');
  });

  it('prepends GLOBAL GUIDANCE when provided', () => {
    const recipe = buildHtmlRecipe([leaf('x')], 'Use formal language');
    expect(recipe).toContain('GLOBAL GUIDANCE');
    expect(recipe).toContain('Use formal language');
    expect(recipe.indexOf('GLOBAL GUIDANCE')).toBeLessThan(recipe.indexOf('GENERATE THE FOLLOWING DATA'));
  });

  it('omits GLOBAL GUIDANCE when not provided', () => {
    const recipe = buildHtmlRecipe([leaf('x')]);
    expect(recipe).not.toContain('GLOBAL GUIDANCE');
  });

  it('numbers sections sequentially: static=1, block=2', () => {
    const zones  = [leaf('title', '', 1), block('table', '', 1)];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('1. STATIC FIELDS');
    expect(recipe).toContain('2. BLOCK ZONES');
  });

  it('numbers sections sequentially: contextual=1, repeatable=2', () => {
    const repSlides = [{ slideIndex: 3, key: 'item', prompt: 'one per item' }];
    const zones     = [leaf('desc', '', 1), leaf('desc', '', 2), repLeaf('name', '', 3, true)];
    const recipe    = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('1. CONTEXTUAL FIELDS');
    expect(recipe).toContain('2. REPEATABLE SLIDE');
  });

  it('numbers sections: static=1, contextual=2, block=3, repeatable=4', () => {
    const repSlides = [{ slideIndex: 3, key: 'item', prompt: 'one per item' }];
    const zones = [
      leaf('header', '', 1),                       // static
      leaf('desc', '', 1), leaf('desc', '', 2),    // contextual
      block('table', '', 1),                        // block
      repLeaf('item_name', '', 3, true),            // repeatable
    ];
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('1. STATIC FIELDS');
    expect(recipe).toContain('2. CONTEXTUAL FIELDS');
    expect(recipe).toContain('3. BLOCK ZONES');
    expect(recipe).toContain('4. REPEATABLE SLIDE');
  });

  it('handles empty zone list without throwing', () => {
    expect(() => buildHtmlRecipe([])).not.toThrow();
  });

  it('includes IMPORTANT footer', () => {
    const recipe = buildHtmlRecipe([leaf('x')]);
    expect(recipe).toContain('IMPORTANT');
    expect(recipe).toContain('static');
    expect(recipe).toContain('blocks');
    expect(recipe).toContain('slides');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateHtmlJson
// ─────────────────────────────────────────────────────────────────────────────

describe('validateHtmlJson', () => {
  it('returns valid:false for invalid JSON syntax', () => {
    const result = validateHtmlJson('{bad json', [leaf('x')]);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/syntax/i);
  });

  it('validates a correct static-only JSON', () => {
    const zones  = [leaf('title', 'page title')];
    const json   = JSON.stringify({ static: { title: 'Hello' } });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
    expect(result.foundFields).toContain('title');
    expect(result.missingFields).toHaveLength(0);
  });

  it('accepts flat JSON without static wrapper for static fields', () => {
    const zones  = [leaf('title')];
    const json   = JSON.stringify({ title: 'Hello' });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
  });

  it('reports missing static fields', () => {
    const zones  = [leaf('title'), leaf('subtitle')];
    const json   = JSON.stringify({ static: { title: 'Hello' } });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('subtitle');
  });

  it('ignores non-autoGenerate leaf zones', () => {
    const zones  = [leaf('manual', '', 1, false), leaf('auto', '', 1, true)];
    const json   = JSON.stringify({ static: { auto: 'val' } });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
  });

  it('validates contextual fields for shared keys', () => {
    const zones = [leaf('desc', '', 1), leaf('desc', '', 2)];
    const json  = JSON.stringify({
      contextual: [
        { slide_index: 1, desc: 'slide 1' },
        { slide_index: 2, desc: 'slide 2' },
      ]
    });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
  });

  it('reports missing contextual entry for a slide', () => {
    const zones = [leaf('desc', '', 1), leaf('desc', '', 2)];
    const json  = JSON.stringify({
      contextual: [{ slide_index: 1, desc: 'slide 1' }]
    });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('slide 2'))).toBe(true);
  });

  it('validates a correct block zone', () => {
    const zones  = [block('my_table', 'fill it')];
    const json   = JSON.stringify({ blocks: { my_table: { value: '<tr><td>A</td></tr>' } } });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
    expect(result.foundFields.some(f => f.includes('my_table'))).toBe(true);
  });

  it('accepts a block zone value as a plain string (not wrapped in {value})', () => {
    const zones  = [block('my_table')];
    const json   = JSON.stringify({ blocks: { my_table: '<tr><td>A</td></tr>' } });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
  });

  it('reports missing block zone', () => {
    const zones  = [block('my_table')];
    const json   = JSON.stringify({ blocks: {} });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('my_table'))).toBe(true);
  });

  it('validates repeatable slides with correct instances', () => {
    const repSlides = [{ slideIndex: 2, key: 'item', prompt: 'one per item' }];
    const zones     = [repLeaf('item_name', '', 2, true), repLeaf('item_desc', '', 2, true)];
    const json      = JSON.stringify({
      slides: {
        item: {
          instances: [
            { item_name: 'Alpha', item_desc: 'desc A' },
            { item_name: 'Beta',  item_desc: 'desc B' },
          ]
        }
      }
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(true);
    expect(result.instanceCount).toBe(2);
  });

  it('reports missing repeatable instances', () => {
    const repSlides = [{ slideIndex: 2, key: 'item', prompt: 'one per item' }];
    const zones     = [repLeaf('item_name', '', 2, true)];
    const json      = JSON.stringify({ slides: {} });
    const result    = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('item'))).toBe(true);
  });

  it('reports missing unique key in repeatable instance', () => {
    const repSlides = [{ slideIndex: 2, key: 'item', prompt: 'one per item' }];
    const zones     = [repLeaf('item_name', '', 2, true), repLeaf('item_desc', '', 2, true)];
    const json      = JSON.stringify({
      slides: { item: { instances: [{ item_name: 'Alpha' }] } }  // missing item_desc
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('item_desc'))).toBe(true);
  });

  it('returns instanceCount = 0 when no repeatable instances', () => {
    const zones  = [leaf('title')];
    const json   = JSON.stringify({ static: { title: 'Hello' } });
    const result = validateHtmlJson(json, zones);
    expect(result.instanceCount).toBe(0);
  });

  it('validates mixed leaf + block + repeatable correctly', () => {
    const repSlides = [{ slideIndex: 2, key: 'item', prompt: 'one per item' }];
    const zones = [
      leaf('header', '', 1),
      block('table', '', 1),
      repLeaf('item_name', '', 2, true),
    ];
    const json = JSON.stringify({
      static:  { header: 'Q3 Report' },
      blocks:  { table: { value: '<tr><td>Row</td></tr>' } },
      slides:  { item: { instances: [{ item_name: 'Alpha' }] } },
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildHtmlRecipe — repeatableSlides with unique/non-unique zones
// ─────────────────────────────────────────────────────────────────────────────

describe('buildHtmlRecipe — repeatableSlides', () => {
  const repSlides = [{ slideIndex: 2, key: 'brand_slide', prompt: 'Generate one slide per car brand' }];

  const zones = [
    leaf('deck_title', 'presentation title', 1),
    repLeaf('brand_name',        'the car brand name',  2, true),
    repLeaf('brand_description', 'brand overview',      2, true),
    repBlock('model_table',      'fill with model data', 2, '<tbody><tr><td class="name">X</td></tr></tbody>', true),
    { ...repLeaf('slide_footer', 'confidential note', 2, false) },  // non-unique
  ];

  it('emits a REPEATABLE SLIDE section', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('REPEATABLE SLIDE');
  });

  it('embeds the generation prompt', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('Generate one slide per car brand');
  });

  it('emits a SHARED VALUES sub-section for non-unique zones', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('SHARED VALUES');
    expect(recipe).toContain('"slide_footer"');
  });

  it('emits an INSTANCE VALUES sub-section for unique zones', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('INSTANCE VALUES');
    expect(recipe).toContain('"brand_name"');
    expect(recipe).toContain('"brand_description"');
  });

  it('unique zones do NOT appear in shared sub-section', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    // Find shared section — brand_name should not be in it
    const sharedIdx  = recipe.indexOf('SHARED VALUES');
    const instanceIdx = recipe.indexOf('INSTANCE VALUES');
    const sharedSection = recipe.slice(sharedIdx, instanceIdx);
    expect(sharedSection).not.toContain('"brand_name"');
  });

  it('non-unique zones do NOT appear in the instance structure definition', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    // The instance structure block ("Each instance must follow this structure:")
    // should list only unique keys. Find that block specifically.
    const instanceIdx  = recipe.indexOf('Each instance must follow this structure exactly:');
    const returnIdx    = recipe.indexOf('Return the full structure as:');
    expect(instanceIdx).toBeGreaterThan(-1);
    const instanceStructure = recipe.slice(instanceIdx, returnIdx);
    expect(instanceStructure).not.toContain('"slide_footer"');
    expect(instanceStructure).toContain('"brand_name"');
  });

  it('includes full exampleHtml for block zones (no truncation)', () => {
    const longHtml = '<tbody>' + '<tr><td class="col">Data</td></tr>'.repeat(20) + '</tbody>';
    const zonesWithLong = [
      repBlock('big_table', 'fill it', 2, longHtml, true),
    ];
    const recipe = buildHtmlRecipe(zonesWithLong, '', repSlides);
    // Full HTML must appear — not truncated
    expect(recipe).toContain(longHtml);
  });

  it('emits the { shared, instances } JSON structure', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('"shared"');
    expect(recipe).toContain('"instances"');
  });

  it('static zones are unaffected by repeatableSlides', () => {
    const recipe = buildHtmlRecipe(zones, '', repSlides);
    expect(recipe).toContain('STATIC FIELDS');
    expect(recipe).toContain('"deck_title"');
  });

  it('handles a slide where all zones are unique (no shared sub-section)', () => {
    const allUnique = [
      repLeaf('brand_name', 'brand', 2, true),
      repLeaf('brand_desc', 'desc',  2, true),
    ];
    const recipe = buildHtmlRecipe(allUnique, '', repSlides);
    expect(recipe).not.toContain('SHARED VALUES');
    expect(recipe).toContain('INSTANCE VALUES');
  });

  it('handles a slide where all zones are non-unique (no instances sub-section)', () => {
    const allShared = [
      { ...repLeaf('footer', 'footer', 2, false) },
      { ...repLeaf('note',   'note',   2, false) },
    ];
    const recipe = buildHtmlRecipe(allShared, '', repSlides);
    expect(recipe).toContain('SHARED VALUES');
    expect(recipe).not.toContain('INSTANCE VALUES');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateHtmlJson — repeatableSlides with shared + instances
// ─────────────────────────────────────────────────────────────────────────────

describe('validateHtmlJson — repeatableSlides', () => {
  const repSlides = [{ slideIndex: 2, key: 'brand_slide', prompt: 'one per brand' }];

  const zones = [
    leaf('deck_title', '', 1),
    repLeaf('brand_name',  '', 2, true),
    repLeaf('brand_desc',  '', 2, true),
    { ...repLeaf('footer', '', 2, false) },  // non-unique
  ];

  const validJson = JSON.stringify({
    static: { deck_title: 'Deck' },
    slides: {
      brand_slide: {
        shared:    { footer: 'Confidential' },
        instances: [
          { brand_name: 'BMW',      brand_desc: 'German luxury' },
          { brand_name: 'Mercedes', brand_desc: 'Stuttgart icon' },
        ],
      },
    },
  });

  it('returns valid:true for correct shared + instances JSON', () => {
    const result = validateHtmlJson(validJson, zones, repSlides);
    expect(result.valid).toBe(true);
  });

  it('returns instanceCount = 2', () => {
    const result = validateHtmlJson(validJson, zones, repSlides);
    expect(result.instanceCount).toBe(2);
  });

  it('returns valid:false when slides[key] is missing', () => {
    const json = JSON.stringify({ static: { deck_title: 'D' }, slides: {} });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('brand_slide'))).toBe(true);
  });

  it('returns valid:false when shared is missing a non-unique key', () => {
    const json = JSON.stringify({
      static: { deck_title: 'D' },
      slides: {
        brand_slide: {
          shared:    {},  // missing footer
          instances: [{ brand_name: 'BMW', brand_desc: 'x' }],
        },
      },
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('footer'))).toBe(true);
  });

  it('returns valid:false when instances is missing', () => {
    const json = JSON.stringify({
      static: { deck_title: 'D' },
      slides: { brand_slide: { shared: { footer: 'x' } } },
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
  });

  it('returns valid:false when instances is empty', () => {
    const json = JSON.stringify({
      static: { deck_title: 'D' },
      slides: { brand_slide: { shared: { footer: 'x' }, instances: [] } },
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
  });

  it('returns valid:false when an instance is missing a unique key', () => {
    const json = JSON.stringify({
      static: { deck_title: 'D' },
      slides: {
        brand_slide: {
          shared:    { footer: 'x' },
          instances: [{ brand_name: 'BMW' }],  // missing brand_desc
        },
      },
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('brand_desc'))).toBe(true);
  });

  it('missingFields includes instance index for unique key errors', () => {
    const json = JSON.stringify({
      static: { deck_title: 'D' },
      slides: {
        brand_slide: {
          shared:    { footer: 'x' },
          instances: [
            { brand_name: 'BMW', brand_desc: 'x' },
            { brand_name: 'Mercedes' },  // missing brand_desc in instance 2
          ],
        },
      },
    });
    const result = validateHtmlJson(json, zones, repSlides);
    expect(result.valid).toBe(false);
    // Should reference instance index 2
    expect(result.missingFields.some(f => f.includes('[2]') || f.includes('2'))).toBe(true);
  });

  it('accepts missing shared when all zones are unique', () => {
    const allUnique = [
      leaf('deck_title', '', 1),
      repLeaf('brand_name', '', 2, true),
    ];
    const json = JSON.stringify({
      static: { deck_title: 'D' },
      slides: {
        brand_slide: {
          instances: [{ brand_name: 'BMW' }],
        },
      },
    });
    const result = validateHtmlJson(json, allUnique, repSlides);
    expect(result.valid).toBe(true);
  });

  it('backward compat: old slides array format still validates when no repSlides arg', () => {
    // Old format: data.slides[key] is an array directly (not { shared, instances })
    // This ensures existing tests/projects continue to work
    const oldZones = [
      { zoneType: 'leaf', key: 'item_name', slideIndex: 2, type: 'text',
        autoGenerate: true, isRepeatable: true, repeatableKey: null, structureType: 'item' },
    ];
    const json = JSON.stringify({
      slides: { item: [{ structure_type: 'item', item_name: 'Alpha' }] },
    });
    const result = validateHtmlJson(json, oldZones);
    expect(result.valid).toBe(true);
  });
});
