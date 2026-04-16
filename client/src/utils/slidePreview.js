/**
 * slidePreview.js — Shared utilities for slide preview scaling and HTML generation
 *
 * Centralizes the logic for:
 * - Generating scaled preview HTML with proper transforms
 * - Calculating offsets for multi-slide presentations
 * - Maintaining consistent 16:9 aspect ratio across all preview contexts
 */

/**
 * Generates scaled preview HTML for a single slide
 *
 * @param {string} previewHtml - The full multi-slide preview HTML
 * @param {number} slideIndex - The slide index (0-based)
 * @param {number} scale - The scale factor (e.g., 1 for full size, 0.15625 for carousel)
 * @returns {string} The scaled HTML with CSS transforms injected
 *
 * @example
 * const carouselHtml = generateScaledPreviewHtml(fullHtml, 0, 0.15625)
 * const previewHtml = generateScaledPreviewHtml(fullHtml, 0, 1)
 */
export function generateScaledPreviewHtml(previewHtml, slideIndex, scale) {
  if (!previewHtml) return ''

  // Each slide is 720px tall in the original HTML
  // To show slide N, we translate up by (N-1) * 720 * scale pixels
  const offsetY = slideIndex * 720 * scale

  // Inject CSS transforms into the HTML
  const injection = `<style>
#solon-slide-shell { transform: translateY(-${offsetY}px) scale(${scale}); overflow: hidden; }
</style>`

  return previewHtml.includes('</head>')
    ? previewHtml.replace('</head>', injection + '</head>')
    : injection + previewHtml
}

/**
 * Generates an array of scaled preview HTML strings, one per slide
 *
 * @param {string} previewHtml - The full multi-slide preview HTML
 * @param {number} slideCount - Total number of slides
 * @param {number} scale - The scale factor for all slides
 * @returns {Array<string>} Array of scaled HTML strings
 *
 * @example
 * const carouselPreviews = generateMultiSlidePreviewHtmlArray(fullHtml, 5, 0.15625)
 */
export function generateMultiSlidePreviewHtmlArray(previewHtml, slideCount, scale) {
  if (!previewHtml) return []

  const previews = []
  for (let i = 0; i < slideCount; i++) {
    previews.push(generateScaledPreviewHtml(previewHtml, i, scale))
  }
  return previews
}

/**
 * Calculates the offset in pixels for displaying a specific slide at the top of the viewport
 *
 * @param {number} slideIndex - The slide index (0-based)
 * @param {number} scale - The scale factor
 * @returns {number} The translateY offset in pixels
 *
 * @example
 * const offset = calculateSlideOffset(2, 0.5) // Shows slide 3 at top
 */
export function calculateSlideOffset(slideIndex, scale) {
  return slideIndex * 720 * scale
}
