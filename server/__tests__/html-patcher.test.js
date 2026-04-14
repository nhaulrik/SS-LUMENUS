/**
 * Tests for server/lib/html-patcher.js
 *
 * Covers applyHtmlContent for:
 *   - leaf zone text replacement
 *   - block zone innerHTML replacement
 *   - label zone replacement
 *   - non-autoGenerate zones are left untouched
 *   - repeatable slides: cloned once per instance
 *   - data-zone / data-block / data-prompt attributes stripped from output
 *   - contextual (shared-key) fields applied per slide
 */

import { describe, it, expect } from 'vitest';
import { applyHtmlContent } from '../lib/html-patcher.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const leaf = (key, slideIndex = 1, autoGenerate = true) => ({
  zoneType: 'leaf', key, slideIndex, type: 'text', autoGenerate,
  isRepeatable: false, repeatableKey: null,
});

const block = (key, slideIndex = 1) => ({
  zoneType: 'block', key, slideIndex, type: 'block', autoGenerate: true,
  isRepeatable: false, repeatableKey: null,
});

const repLeaf = (key, slideIndex = 2, structureType = 'item') => ({
  zoneType: 'leaf', key, slideIndex, type: 'text', autoGenerate: true,
  isRepeatable: true, repeatableKey: null, structureType,
});

const repBlock = (key, slideIndex = 2, structureType = 'item') => ({
  zoneType: 'block', key, slideIndex, type: 'block', autoGenerate: true,
  isRepeatable: true, repeatableKey: null, structureType,
});

// ─────────────────────────────────────────────────────────────────────────────
// Leaf zones
// ─────────────────────────────────────────────────────────────────────────────

describe('applyHtmlContent — leaf zones', () => {
  it('replaces textContent of a data-zone element', () => {
    const html   = `<section><p data-zone="title">Placeholder</p></section>`;
    const data   = { static: { title: 'Q3 Report' } };
    const zones  = [leaf('title')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Q3 Report');
    expect(result).not.toContain('Placeholder');
  });

  it('accepts flat JSON (no static wrapper) for leaf zones', () => {
    const html   = `<section><p data-zone="title">Old</p></section>`;
    const data   = { title: 'New Title' };
    const zones  = [leaf('title')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('New Title');
  });

  it('leaves non-autoGenerate zones unchanged', () => {
    const html   = `<section><p data-zone="manual">Keep me</p></section>`;
    const data   = { static: { manual: 'Should not appear' } };
    const zones  = [leaf('manual', 1, false)];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Keep me');
    expect(result).not.toContain('Should not appear');
  });

  it('strips data-zone attributes from output', () => {
    const html   = `<section><p data-zone="title">Old</p></section>`;
    const data   = { static: { title: 'New' } };
    const zones  = [leaf('title')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).not.toContain('data-zone');
  });

  it('handles multiple leaf zones on the same slide', () => {
    const html = `<section>
      <h1 data-zone="header">H</h1>
      <p data-zone="body">B</p>
    </section>`;
    const data  = { static: { header: 'Title', body: 'Content' } };
    const zones = [leaf('header'), leaf('body')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Title');
    expect(result).toContain('Content');
  });

  it('applies contextual values per slide for shared keys', () => {
    const html = `
      <section><p data-zone="desc">A</p></section>
      <section><p data-zone="desc">B</p></section>`;
    const data = {
      contextual: [
        { slide_index: 1, desc: 'Slide one text' },
        { slide_index: 2, desc: 'Slide two text' },
      ]
    };
    const zones  = [leaf('desc', 1), leaf('desc', 2)];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Slide one text');
    expect(result).toContain('Slide two text');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Block zones
// ─────────────────────────────────────────────────────────────────────────────

describe('applyHtmlContent — block zones', () => {
  it('replaces innerHTML of a data-block element', () => {
    const html   = `<section><table data-block="my_table"><tr><td>Old row</td></tr></table></section>`;
    const data   = { blocks: { my_table: { value: '<tr><td>New row</td></tr>' } } };
    const zones  = [block('my_table')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('New row');
    expect(result).not.toContain('Old row');
  });

  it('accepts block value as a plain string', () => {
    const html   = `<section><div data-block="content">old</div></section>`;
    const data   = { blocks: { content: '<p>Fresh content</p>' } };
    const zones  = [block('content')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Fresh content');
  });

  it('strips data-block and data-prompt attributes', () => {
    const html   = `<section><table data-block="t" data-prompt="fill it"><tr><td>x</td></tr></table></section>`;
    const data   = { blocks: { t: { value: '<tr><td>y</td></tr>' } } };
    const zones  = [block('t')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).not.toContain('data-block');
    expect(result).not.toContain('data-prompt');
  });

  it('preserves surrounding HTML structure around the block element', () => {
    const html   = `<section><h1 data-zone="title">T</h1><table data-block="tbl">old</table></section>`;
    const data   = { static: { title: 'Report' }, blocks: { tbl: { value: '<tr><td>Row</td></tr>' } } };
    const zones  = [leaf('title'), block('tbl')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('<h1');
    expect(result).toContain('Report');
    expect(result).toContain('Row');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Label zones
// ─────────────────────────────────────────────────────────────────────────────

describe('applyHtmlContent — label zones', () => {
  it('replaces textContent of a data-label-for element', () => {
    const html  = `<section>
      <span data-zone="metric">100</span>
      <span data-label-for="metric">Old label</span>
    </section>`;
    const data  = { static: { metric: '250', metric__label: 'Total units' } };
    const zones = [
      leaf('metric'),
      { zoneType: 'label', key: 'metric__label', slideIndex: 1, type: 'text', autoGenerate: true, isRepeatable: false, labelFor: 'metric' },
    ];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Total units');
    expect(result).not.toContain('Old label');
  });

  it('strips data-label-for attributes', () => {
    const html  = `<section><span data-label-for="x">L</span></section>`;
    const data  = { static: { x__label: 'New' } };
    const zones = [
      { zoneType: 'label', key: 'x__label', slideIndex: 1, type: 'text', autoGenerate: true, isRepeatable: false, labelFor: 'x' },
    ];
    const result = applyHtmlContent(html, data, zones);
    expect(result).not.toContain('data-label-for');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Repeatable slides
// ─────────────────────────────────────────────────────────────────────────────

describe('applyHtmlContent — repeatable slides', () => {
  it('clones the repeatable section once per instance', () => {
    const html  = `<section><p data-zone="title">T</p></section><section data-zone="item"><p data-zone="item_name">N</p></section>`;
    const data  = {
      static: { title: 'Report' },
      slides: {
        item: [
          { structure_type: 'item', item_name: 'Alpha' },
          { structure_type: 'item', item_name: 'Beta'  },
        ]
      }
    };
    const zones = [
      leaf('title', 1),
      repLeaf('item_name', 2, 'item'),
    ];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Alpha');
    expect(result).toContain('Beta');
    // Two clones = two occurrences of the section
    const matches = result.match(/<section/g) || [];
    expect(matches.length).toBe(3); // 1 static + 2 clones
  });

  it('fills block zones inside repeatable slides per instance', () => {
    const html  = `<section><table data-block="rows">old</table></section>`;
    const data  = {
      slides: {
        item: [
          { structure_type: 'item', rows: '<tr><td>Alpha</td></tr>' },
          { structure_type: 'item', rows: '<tr><td>Beta</td></tr>'  },
        ]
      }
    };
    const zones = [repBlock('rows', 1, 'item')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Alpha');
    expect(result).toContain('Beta');
    expect(result).not.toContain('old');
  });

  it('removes data-zone from cloned repeatable sections', () => {
    const html  = `<section><p data-zone="item_name">N</p></section>`;
    const data  = { slides: { item: [{ structure_type: 'item', item_name: 'Alpha' }] } };
    const zones = [repLeaf('item_name', 1, 'item')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).not.toContain('data-zone');
  });

  it('produces zero clones and removes the section when instances array is empty', () => {
    const html  = `<section><p data-zone="title">T</p></section><section><p data-zone="item_name">N</p></section>`;
    const data  = { static: { title: 'Report' }, slides: { item: [] } };
    const zones = [leaf('title', 1), repLeaf('item_name', 2, 'item')];
    const result = applyHtmlContent(html, data, zones);
    expect(result).toContain('Report');
    expect(result).not.toContain('item_name');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Attribute stripping
// ─────────────────────────────────────────────────────────────────────────────

describe('applyHtmlContent — attribute stripping', () => {
  it('strips all authoring attributes from the output', () => {
    const html = `<section>
      <p data-zone="x" data-hint="h" data-auto="true" data-type="text">val</p>
      <div data-block="b" data-prompt="p">inner</div>
      <span data-label-for="x" data-repeatable="true">label</span>
    </section>`;
    const data  = { static: { x: 'val', x__label: 'lbl' }, blocks: { b: { value: 'new inner' } } };
    const zones = [
      leaf('x'),
      block('b'),
      { zoneType: 'label', key: 'x__label', slideIndex: 1, type: 'text', autoGenerate: true, isRepeatable: false, labelFor: 'x' },
    ];
    const result = applyHtmlContent(html, data, zones);
    const strippedAttrs = ['data-zone', 'data-block', 'data-prompt', 'data-hint',
                           'data-auto', 'data-label-for', 'data-repeatable', 'data-type'];
    strippedAttrs.forEach(attr => {
      expect(result).not.toContain(attr);
    });
  });
});
