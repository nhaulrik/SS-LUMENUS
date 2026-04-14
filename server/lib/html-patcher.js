/**
 * server/lib/html-patcher.js
 *
 * Applies AI-generated JSON content to an HTML template.
 *
 * Patching rules:
 *   - Leaf zones  (data-zone="key")  : replace element's textContent with the value
 *   - Block zones (data-block="key") : replace element's innerHTML with the value
 *   - Label zones (data-label-for)   : treated as leaf zones (key = labelFor + '__label')
 *   - Repeatable slides              : clone the <section>, one per instance, fill each
 *   - data-zone / data-block / data-prompt attributes are stripped from the output
 */

import { parse } from 'node-html-parser';

/**
 * Apply AI JSON to an HTML template string.
 *
 * @param {string} templateHtml  - The original HTML template
 * @param {object} data          - Parsed AI JSON (from validateHtmlJson)
 * @param {Array}  zones         - Zone list (same as used to build the recipe)
 * @returns {string}             - Patched HTML string ready to serve / export
 */
export function applyHtmlContent(templateHtml, data, zones) {
  const root = parse(templateHtml, { comment: true });

  // Determine which slide indices are repeatable
  const repSlideIndices = new Set();
  zones.forEach(z => { if (z.isRepeatable) repSlideIndices.add(z.slideIndex); });

  // Build lookup maps from the JSON data
  const staticData     = data.static || data;
  const contextualData = data.contextual || [];
  const blocksData     = data.blocks    || {};
  const slidesData     = data.slides    || {};

  const sections = root.querySelectorAll('section');

  sections.forEach((section, idx) => {
    const slideIndex = idx + 1;

    if (repSlideIndices.has(slideIndex)) {
      // ── Repeatable slide: clone once per instance ─────────────────────────
      const slideZones = zones.filter(z => z.slideIndex === slideIndex);
      const structureType = slideZones.find(z => z.structureType)?.structureType
        || `slide_${slideIndex}`;
      const instances = slidesData[structureType] || [];

      // Build one patched clone per instance
      const clones = instances.map(inst => {
        const clone = parse(section.outerHTML).querySelector('section');
        patchSection(clone, slideZones, inst, inst, blocksData);
        stripDataAttrs(clone);
        return clone.outerHTML;
      });

      // Replace the original section with all clones
      section.replaceWith(clones.join('\n'));

    } else {
      // ── Static slide ──────────────────────────────────────────────────────
      const slideZones = zones.filter(z => z.slideIndex === slideIndex);

      // Build a per-zone value map for this slide
      const valueMap = {};
      slideZones.forEach(z => {
        if (!z.autoGenerate) return;

        if (z.zoneType === 'block') {
          const block = blocksData[z.key];
          valueMap[z.key] = block?.value ?? (typeof block === 'string' ? block : null);
        } else {
          // Contextual or static leaf
          const ctxEntry = contextualData.find(c => c.slide_index === slideIndex);
          if (ctxEntry && ctxEntry[z.key] !== undefined) {
            valueMap[z.key] = ctxEntry[z.key];
          } else if (staticData[z.key] !== undefined) {
            valueMap[z.key] = staticData[z.key];
          }
        }
      });

      patchSection(section, slideZones, valueMap, null, blocksData);
      stripDataAttrs(section);
    }
  });

  return root.toString();
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Patch all zones within a section element.
 *
 * @param {Node}   section   - The section node to patch (mutated in place)
 * @param {Array}  zones     - Zones belonging to this slide
 * @param {object} valueMap  - { key: value } map for leaf zones
 * @param {object} inst      - Repeatable instance object (null for static slides)
 * @param {object} blocksData - Top-level blocks data from the AI JSON
 */
function patchSection(section, zones, valueMap, inst, blocksData) {
  // Leaf zones: data-zone
  section.querySelectorAll('[data-zone]').forEach(node => {
    const key = node.getAttribute('data-zone');
    if (!key) return;
    const zone = zones.find(z => z.key === key);
    if (!zone || !zone.autoGenerate) return;

    const value = inst ? inst[key] : valueMap[key];
    if (value !== undefined && value !== null) {
      // Preserve the element's tag; replace only text content
      node.set_content(String(value));
    }
  });

  // Label zones: data-label-for
  section.querySelectorAll('[data-label-for]').forEach(node => {
    const labelFor = node.getAttribute('data-label-for');
    if (!labelFor) return;
    const labelKey = labelFor + '__label';
    const zone     = zones.find(z => z.key === labelKey);
    if (!zone || !zone.autoGenerate) return;

    const value = inst ? inst[labelKey] : valueMap[labelKey];
    if (value !== undefined && value !== null) {
      node.set_content(String(value));
    }
  });

  // Block zones: data-block
  section.querySelectorAll('[data-block]').forEach(node => {
    const key = node.getAttribute('data-block');
    if (!key) return;
    const zone = zones.find(z => z.key === key);
    if (!zone || !zone.autoGenerate) return;

    let html;
    if (inst) {
      html = inst[key];
    } else {
      const block = blocksData[key];
      html = block?.value ?? (typeof block === 'string' ? block : null);
    }

    if (html !== undefined && html !== null) {
      node.set_content(String(html));
    }
  });
}

/**
 * Strip all data-zone, data-block, data-prompt, data-hint, data-auto,
 * data-label-for, and data-repeatable attributes from the output HTML.
 * These are authoring-time attributes and must not appear in the final document.
 */
function stripDataAttrs(root) {
  const attrs = ['data-zone', 'data-block', 'data-prompt', 'data-hint',
                 'data-auto', 'data-label-for', 'data-repeatable', 'data-type'];
  attrs.forEach(attr => {
    root.querySelectorAll(`[${attr}]`).forEach(node => node.removeAttribute(attr));
  });
}
