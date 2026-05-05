/**
 * server/lib/selections-to-zones.js
 *
 * Derives the flat zones array (consumed by buildHtmlRecipe and html-patcher)
 * from the user's selections on the tree.
 *
 * A selection is:
 *   {
 *     nodeId:       string,   // tree node fingerprint
 *     slideIndex:   number,   // 1-based
 *     zoneType:     'block',  // all zones are now block zones
 *     key:          string,   // snake_case zone key
 *     hint:         string,   // description or prompt
 *     prompt:       string,   // custom AI prompt
 *     autoGenerate: boolean,
 *     type:         string,   // 'block'
 *   }
 *
 * Group selections (multiple nodeIds mapped to one key) are represented as
 * separate selection objects sharing the same key — each gets its own zone
 * entry so the patcher can target each node independently.
 *
 * Exports:
 *   selectionsToZones(selections) → Zone[]
 */

/**
 * Convert a selections array into the zones array format expected by
 * buildHtmlRecipe, validateHtmlJson, and applyHtmlContent.
 *
 * Rules:
 *   - Each selection becomes one zone
 *   - elementOrder is the selection's position in the array (stable)
 *   - All zones have autoGenerate:true and type:'block'
  *   - isRepeatable is set to true for zones whose slideIndex matches a
  *     repeatableSlides entry; unique is propagated from the selection
  *     (default true) for repeatable zones, undefined for non-repeatable zones
 *
 * @param {Object[]} selections
 * @param {Object[]} repeatableSlides - [{ slideIndex, key, prompt }]
 * @returns {Object[]} zones
 */
export function selectionsToZones(selections, repeatableSlides = []) {
  // Build a fast lookup: slideIndex → repeatableSlide entry
  const repeatableBySlide = new Map()
  repeatableSlides.forEach(rs => repeatableBySlide.set(rs.slideIndex, rs))

   return selections.map((sel, idx) => {
      const isRepeatable = repeatableBySlide.has(sel.slideIndex)

      return {
        // Discriminant
        zoneType:     'block',

        // Identity
        key:          sel.key,
        nodeId:       sel.nodeId,
        slideIndex:   sel.slideIndex,

        // Type metadata
        type:         'block',
        hint:         sel.hint || '',
        autoGenerate: true,

        // Block-specific
        prompt:       sel.prompt || '',
        exampleHtml:  sel.exampleHtml || undefined,

        // Repeatable — derived from repeatableSlides argument
        isRepeatable,
        repeatableKey: null,

        // Uniqueness — only meaningful for zones on repeatable slides
        // defaults to true (unique per instance) when not explicitly set
        unique: isRepeatable ? (sel.unique !== false) : undefined,

        // Ignored — zones marked as ignored are excluded from recipe generation
        // and skipped during HTML patching
        ignored: sel.ignored || false,

        // Ordering
        elementOrder: idx,
        originalText: '',
      }
    })
}

/**
 * Resolve conflicts: if a parent zone supersedes child zones,
 * remove the children from the selections array.
 *
 * A child selection is superseded when its nodeId starts with a parent
 * zone's nodeId (i.e. it is a descendant in the CSS-path tree).
 *
 * Returns a new array with conflicting children removed.
 *
 * @param {Object[]} selections
 * @returns {{ resolved: Object[], removed: Object[] }}
 */
export function resolveConflicts(selections) {
  const parentIds = selections.map(s => s.nodeId)

  const removed  = []
  const resolved = selections.filter(sel => {
    // Remove zones whose nodeId is a descendant of any parent zone
    // BUT: preserve ignored child zones even if parent is non-ignored
    // (ignored zones should be kept as-is in the recipe)
    const superseded = parentIds.some(parentId => {
      if (sel.nodeId === parentId) return false
      if (!sel.nodeId.startsWith(parentId + '>')) return false

      // Never supersede a zone the user explicitly assigned (only auto-discovered zones
      // are removed when a parent zone also exists)
      if (!sel.autoDiscovered) return false

      // If this child is ignored, don't supersede it
      if (sel.ignored) return false

      return true
    })
    if (superseded) removed.push(sel)
    return !superseded
  })

  return { resolved, removed }
}

/**
 * Auto-discover zones for full-slide generation.
 *
 * When a slide is marked for full-slide generation, automatically create zones
 * for all interesting, non-leaf nodes that aren't already assigned a zone.
 * This enables content generation for the entire slide structure without
 * requiring explicit manual zone definition.
 *
 * If templateHtml is provided, scans for elements with data-block attributes
 * and creates zones from those instead of using tree-walking logic.
 *
 * @param {Object[]} trees - DOM tree nodes
 * @param {number[]} fullSlideGeneration - slide indices marked for full generation
 * @param {Object[]} existingSelections - existing zone selections
 * @param {string} [templateHtml] - optional template HTML to scan for data-block elements
 * @returns {Object[]} updated selections array
 */
export function autoDiscoverZonesForFullSlide(trees, fullSlideGeneration, existingSelections, templateHtml) {
  if (!Array.isArray(fullSlideGeneration) || fullSlideGeneration.length === 0) {
    return existingSelections;
  }

  const result = [...existingSelections];
  const existingNodeIds = new Set(existingSelections.map(s => s.nodeId));

  // If templateHtml is provided, scan for data-block elements
  if (templateHtml && typeof templateHtml === 'string') {
    try {
      const { parse } = require('node-html-parser');
      const root = parse(templateHtml);
      const dataBlockElements = root.querySelectorAll('[data-block]');

      if (dataBlockElements && dataBlockElements.length > 0) {
        // Process each data-block element
        for (const element of dataBlockElements) {
          const blockKey = element.getAttribute('data-block');
          if (!blockKey) continue;

          // Use element's ID if available, otherwise generate a unique one
          let nodeId = element.getAttribute('id');
          if (!nodeId) {
            nodeId = `generated_${blockKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          // Skip if this nodeId already exists
          if (existingNodeIds.has(nodeId)) continue;

          const exampleHtml = element.innerHTML || '';

          // Add zone for each slide in fullSlideGeneration
          for (const slideIdx of fullSlideGeneration) {
            result.push({
              nodeId,
              slideIndex:    slideIdx,
              zoneType:      'block',
              key:           blockKey,
              prompt:        '',
              autoGenerate:  true,
              autoDiscovered: true,
              type:          'block',
              exampleHtml,
            });
            existingNodeIds.add(nodeId);
          }
        }

        // If data-block elements were found, return early (skip tree-walking)
        if (dataBlockElements.length > 0) {
          return result;
        }
      }
    } catch (err) {
      // If parsing fails, fall through to tree-walking logic
      console.warn('Failed to parse templateHtml for data-block elements:', err.message);
    }
  }

  // Fallback: tree-walking logic for templates without data-block marks
  function flattenTree(nodes) {
    const flat = [];
    function visit(arr) {
      for (const n of arr) {
        flat.push(n);
        if (n.children?.length) visit(n.children);
      }
    }
    visit(nodes);
    return flat;
  }

  for (const slideIdx of fullSlideGeneration) {
    const treeIdx = slideIdx - 1;
    if (treeIdx < 0 || treeIdx >= trees.length) continue;

    const allNodes = flattenTree(trees[treeIdx]);

    for (const node of allNodes) {
      if (existingNodeIds.has(node.id)) continue;
      if (node.leaf) continue;

      if (node.interesting || node.children?.length > 0) {
        const key = `auto_${node.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
        result.push({
          nodeId:        node.id,
          slideIndex:    slideIdx,
          zoneType:      'block',
          key,
          prompt:        '',
          autoGenerate:  true,
          autoDiscovered: true,
          type:          'block',
          ...(node.innerHTML ? { exampleHtml: node.innerHTML } : {}),
        });
        existingNodeIds.add(node.id);
      }
    }
  }

  return result;
}
