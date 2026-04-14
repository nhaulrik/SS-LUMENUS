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
 *   - isRepeatable is set to true for zones whose slideIndex matches a
 *     repeatableSlides entry; unique is propagated from the selection
 *     (default true) for repeatable zones, undefined for static zones
 *
 * @param {Object[]} selections
 * @param {Object[]} repeatableSlides - [{ slideIndex, key, prompt }]
 * @returns {Object[]} zones
 */
export function selectionsToZones(selections, repeatableSlides = []) {
  // Build a fast lookup: slideIndex → repeatableSlide entry
  const repBySlide = new Map()
  repeatableSlides.forEach(rs => repBySlide.set(rs.slideIndex, rs))

  return selections.map((sel, idx) => {
    const isBlock      = sel.zoneType === 'block'
    const isRepeatable = repBySlide.has(sel.slideIndex)

    return {
      // Discriminant
      zoneType:     sel.zoneType,

      // Identity
      key:          sel.key,
      nodeId:       sel.nodeId,
      slideIndex:   sel.slideIndex,

      // Type metadata
      type:         isBlock ? 'block' : (sel.type || 'text'),
      hint:         sel.hint || '',
      autoGenerate: isBlock ? true : (sel.autoGenerate !== false),

      // Block-specific
      prompt:       isBlock ? (sel.prompt || '') : undefined,
      exampleHtml:  isBlock ? (sel.exampleHtml || undefined) : undefined,

      // Repeatable — derived from repeatableSlides argument
      isRepeatable,
      repeatableKey: null,

      // Uniqueness — only meaningful for zones on repeatable slides
      // defaults to true (unique per instance) when not explicitly set
      unique: isRepeatable ? (sel.unique !== false) : undefined,

      // Ordering
      elementOrder: idx,
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
