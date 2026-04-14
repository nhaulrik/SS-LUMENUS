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
 *     zoneType:     'leaf' | 'block',
 *     key:          string,   // snake_case zone key
 *     hint:         string,   // leaf hint or block prompt description
 *     prompt:       string,   // block zones: custom AI prompt
 *     autoGenerate: boolean,
 *     type:         string,   // 'text'|'number'|'chart'|'image'|'block'
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
 *   - Block selections always have autoGenerate:true and type:'block'
 *   - Leaf selections inherit autoGenerate and type from the selection
 *   - isRepeatable and repeatableKey are not supported via the tree UI
 *     (repeatable slides remain a PPTX-flow concept for now)
 *
 * @param {Object[]} selections
 * @returns {Object[]} zones
 */
export function selectionsToZones(selections) {
  return selections.map((sel, idx) => {
    const isBlock = sel.zoneType === 'block'

    return {
      // Discriminant
      zoneType:     sel.zoneType,

      // Identity
      key:          sel.key,
      nodeId:       sel.nodeId,         // retained so patcher can target by node id
      slideIndex:   sel.slideIndex,

      // Type metadata
      type:         isBlock ? 'block' : (sel.type || 'text'),
      hint:         sel.hint || '',
      autoGenerate: isBlock ? true : (sel.autoGenerate !== false),

      // Block-specific
      prompt:       isBlock ? (sel.prompt || '') : undefined,
      exampleHtml:  undefined,          // populated by patcher at patch time from live DOM

      // Repeatable — not supported via tree UI; always false
      isRepeatable:  false,
      repeatableKey: null,

      // Ordering
      elementOrder: idx,

      // originalText is not available at selection time (we don't have the DOM here)
      // the patcher reads it from the live template at apply time
      originalText: '',
    }
  })
}

/**
 * Resolve conflicts: if a parent block selection supersedes child selections,
 * remove the children from the selections array.
 *
 * A child selection is superseded when its nodeId starts with a parent
 * block selection's nodeId (i.e. it is a descendant in the CSS-path tree).
 *
 * Returns a new array with conflicting children removed.
 *
 * @param {Object[]} selections
 * @returns {{ resolved: Object[], removed: Object[] }}
 */
export function resolveConflicts(selections) {
  const blockIds = selections
    .filter(s => s.zoneType === 'block')
    .map(s => s.nodeId)

  const removed  = []
  const resolved = selections.filter(sel => {
    // Keep block zones themselves
    if (sel.zoneType === 'block') return true

    // Remove leaf zones whose nodeId is a descendant of any block zone
    const superseded = blockIds.some(
      blockId => sel.nodeId !== blockId && sel.nodeId.startsWith(blockId + '>')
    )
    if (superseded) removed.push(sel)
    return !superseded
  })

  return { resolved, removed }
}
