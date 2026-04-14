/**
 * server/lib/html-patcher.js
 *
 * Applies AI-generated JSON content to an HTML template.
 *
 * Patching rules:
 *   - Leaf zones  (data-zone="key")  : replace element's textContent
 *   - Block zones (data-block="key") : replace element's innerHTML
 *   - Label zones (data-label-for)   : treated as leaf zones (key = labelFor + '__label')
 *   - Repeatable slides              : clone the <section>, one per instance
 *     - unique zones  (zone.unique !== false) : filled from instances[i]
 *     - non-unique zones (zone.unique === false) : filled from shared object (same on every clone)
 *   - data-zone / data-block / data-prompt / etc. stripped from output
 *
 * Supports both the new { shared, instances } format and the legacy array format.
 */

import { parse } from 'node-html-parser';

/**
 * Apply AI JSON to an HTML template string.
 *
 * @param {string}   templateHtml     - The original HTML template
 * @param {object}   data             - Parsed AI JSON
 * @param {Array}    zones            - Zone list
 * @param {Array}    repeatableSlides - [{ slideIndex, key, prompt }] (optional)
 * @returns {string}                  - Patched HTML string
 */
export function applyHtmlContent(templateHtml, data, zones, repeatableSlides = []) {
  const root = parse(templateHtml, { comment: true });

  // Build a lookup: slideIndex → repeatableSlide entry
  const repBySlide = new Map();
  repeatableSlides.forEach(rs => repBySlide.set(rs.slideIndex, rs));

  // Determine which slide indices are repeatable
  const repSlideIndices = new Set();
  if (repeatableSlides.length > 0) {
    repeatableSlides.forEach(rs => repSlideIndices.add(rs.slideIndex));
  } else {
    // Backward compat: derive from zone.isRepeatable flag
    zones.forEach(z => { if (z.isRepeatable) repSlideIndices.add(z.slideIndex); });
  }

  const staticData     = data.static || data;
  const contextualData = data.contextual || [];
  const blocksData     = data.blocks    || {};
  const slidesData     = data.slides    || {};

  const sections = root.querySelectorAll('section');

  sections.forEach((section, idx) => {
    const slideIndex = idx + 1;

    if (repSlideIndices.has(slideIndex)) {
      // ── Repeatable slide ───────────────────────────────────────────────────
      const slideZones = zones.filter(z => z.slideIndex === slideIndex);
      const repSlide   = repBySlide.get(slideIndex);
      const slideKey   = repSlide?.key || slideZones.find(z => z.structureType)?.structureType || `slide_${slideIndex}`;
      const slideData  = slidesData[slideKey];

      // Detect format
      const isNewFormat = slideData && !Array.isArray(slideData) &&
        (slideData.instances !== undefined || slideData.shared !== undefined);

      let instances;
      let sharedValues = {};

      if (isNewFormat) {
        instances    = slideData.instances || [];
        sharedValues = slideData.shared    || {};
      } else {
        // Legacy array format
        instances = Array.isArray(slideData) ? slideData : [];
      }

      // Partition zones into unique and non-unique
      const uniqueZones    = slideZones.filter(z => z.unique !== false);
      const nonUniqueZones = slideZones.filter(z => z.unique === false);

      // Build one patched clone per instance
      const clones = instances.map(inst => {
        const clone = parse(section.outerHTML).querySelector('section');
        // Fill unique zones from this instance
        patchSection(clone, uniqueZones, inst, inst, {});
        // Fill non-unique zones from shared values (same on every clone)
        patchSection(clone, nonUniqueZones, sharedValues, null, {});
        // Legacy: fill all zones from instance directly (when no unique/non-unique split)
        if (!isNewFormat) {
          patchSection(clone, slideZones, inst, inst, {});
        }
        stripDataAttrs(clone);
        return clone.outerHTML;
      });

      section.replaceWith(clones.join('\n'));

    } else {
      // ── Static slide ───────────────────────────────────────────────────────
      const slideZones = zones.filter(z => z.slideIndex === slideIndex);

      const valueMap = {};
      slideZones.forEach(z => {
        if (!z.autoGenerate) return;
        if (z.zoneType === 'block') {
          const block = blocksData[z.key];
          valueMap[z.key] = block?.value ?? (typeof block === 'string' ? block : null);
        } else {
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

function patchSection(section, zones, valueMap, inst, blocksData) {
  // Leaf zones: data-zone
  section.querySelectorAll('[data-zone]').forEach(node => {
    const key  = node.getAttribute('data-zone');
    if (!key) return;
    const zone = zones.find(z => z.key === key);
    if (!zone || !zone.autoGenerate) return;
    const value = inst ? inst[key] : valueMap[key];
    if (value !== undefined && value !== null) node.set_content(String(value));
  });

  // Label zones: data-label-for
  section.querySelectorAll('[data-label-for]').forEach(node => {
    const labelFor = node.getAttribute('data-label-for');
    if (!labelFor) return;
    const labelKey = labelFor + '__label';
    const zone     = zones.find(z => z.key === labelKey);
    if (!zone || !zone.autoGenerate) return;
    const value = inst ? inst[labelKey] : valueMap[labelKey];
    if (value !== undefined && value !== null) node.set_content(String(value));
  });

  // Block zones: data-block
  section.querySelectorAll('[data-block]').forEach(node => {
    const key  = node.getAttribute('data-block');
    if (!key) return;
    const zone = zones.find(z => z.key === key);
    if (!zone || !zone.autoGenerate) return;
    let html;
    if (inst) {
      html = inst[key];
    } else {
      const block = blocksData[key] ?? valueMap[key];
      html = block?.value ?? (typeof block === 'string' ? block : null);
    }
    if (html !== undefined && html !== null) node.set_content(String(html));
  });
}

function stripDataAttrs(root) {
  const attrs = ['data-zone', 'data-block', 'data-prompt', 'data-hint',
                 'data-auto', 'data-label-for', 'data-repeatable', 'data-type'];
  attrs.forEach(attr => {
    root.querySelectorAll(`[${attr}]`).forEach(node => node.removeAttribute(attr));
  });
}
