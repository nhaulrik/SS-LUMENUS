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

const repLeaf = (key, hint = '', slideIndex = 2, structureType = 'item') => ({
  zoneType: 'leaf', key, hint, slideIndex, type: 'text', autoGenerate: true,
  isRepeatable: true, repeatableKey: null, structureType,
});

const repBlock = (key, prompt = '', slideIndex = 2, structureType = 'item') => ({
  zoneType: 'block', key, hint: prompt, prompt, exampleHtml: '', slideIndex,
  type: 'block', autoGenerate: true, isRepeatable: true, repeatableKey: null, structureType,
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

  it('includes REPEATABLE SLIDES for repeatable leaf zones', () => {
    const zones  = [leaf('title', 'page title', 1), repLeaf('item_name', 'name', 2, 'item')];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('REPEATABLE SLIDES');
    expect(recipe).toContain('"item"');
    expect(recipe).toContain('structure_type');
    expect(recipe).toContain('"item_name"');
  });

  it('includes repeatable block zones inside REPEATABLE SLIDES', () => {
    const zones  = [repBlock('table_block', 'generate rows', 2, 'slide')];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('REPEATABLE SLIDES');
    expect(recipe).toContain('"table_block"');
    expect(recipe).toContain('generated HTML');
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
    const zones  = [leaf('desc', '', 1), leaf('desc', '', 2), repLeaf('name', '', 3, 'item')];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('1. CONTEXTUAL FIELDS');
    expect(recipe).toContain('2. REPEATABLE SLIDES');
  });

  it('numbers sections: static=1, contextual=2, block=3, repeatable=4', () => {
    const zones = [
      leaf('header', '', 1),                       // static
      leaf('desc', '', 1), leaf('desc', '', 2),    // contextual
      block('table', '', 1),                        // block
      repLeaf('item_name', '', 3, 'item'),          // repeatable
    ];
    const recipe = buildHtmlRecipe(zones);
    expect(recipe).toContain('1. STATIC FIELDS');
    expect(recipe).toContain('2. CONTEXTUAL FIELDS');
    expect(recipe).toContain('3. BLOCK ZONES');
    expect(recipe).toContain('4. REPEATABLE SLIDES');
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
    const zones = [repLeaf('item_name', '', 2, 'item'), repLeaf('item_desc', '', 2, 'item')];
    const json  = JSON.stringify({
      slides: {
        item: [
          { structure_type: 'item', item_name: 'Alpha', item_desc: 'desc A' },
          { structure_type: 'item', item_name: 'Beta',  item_desc: 'desc B' },
        ]
      }
    });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
    expect(result.instanceCount).toBe(2);
  });

  it('reports missing repeatable instances', () => {
    const zones  = [repLeaf('item_name', '', 2, 'item')];
    const json   = JSON.stringify({ slides: {} });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('item'))).toBe(true);
  });

  it('reports missing structure_type in repeatable instance', () => {
    const zones = [repLeaf('item_name', '', 2, 'item')];
    const json  = JSON.stringify({
      slides: { item: [{ item_name: 'Alpha' }] }
    });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(false);
    expect(result.missingFields.some(f => f.includes('structure_type'))).toBe(true);
  });

  it('returns instanceCount = 0 when no repeatable instances', () => {
    const zones  = [leaf('title')];
    const json   = JSON.stringify({ static: { title: 'Hello' } });
    const result = validateHtmlJson(json, zones);
    expect(result.instanceCount).toBe(0);
  });

  it('validates mixed leaf + block + repeatable correctly', () => {
    const zones = [
      leaf('header', '', 1),
      block('table', '', 1),
      repLeaf('item_name', '', 2, 'item'),
    ];
    const json = JSON.stringify({
      static:  { header: 'Q3 Report' },
      blocks:  { table: { value: '<tr><td>Row</td></tr>' } },
      slides:  { item: [{ structure_type: 'item', item_name: 'Alpha' }] },
    });
    const result = validateHtmlJson(json, zones);
    expect(result.valid).toBe(true);
  });
});
