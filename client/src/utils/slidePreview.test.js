/**
 * slidePreview.test.js — Tests for shared slide preview utilities
 */

import { describe, it, expect } from 'vitest'
import {
  generateScaledPreviewHtml,
  generateMultiSlidePreviewHtmlArray,
  calculateSlideOffset,
} from './slidePreview.js'

describe('slidePreview utilities', () => {
  const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <div id="solon-slide-shell">
    <div class="slide">Slide 1</div>
    <div class="slide">Slide 2</div>
  </div>
</body>
</html>`

  describe('generateScaledPreviewHtml', () => {
    it('should inject CSS transforms for slide 0 with scale 1', () => {
      const result = generateScaledPreviewHtml(mockHtml, 0, 1)
      expect(result).toContain('transform: translateY(-0px) scale(1)')
      expect(result).toContain('overflow: hidden')
    })

    it('should inject CSS transforms for slide 1 with scale 1', () => {
      const result = generateScaledPreviewHtml(mockHtml, 1, 1)
      expect(result).toContain('transform: translateY(-720px) scale(1)')
    })

    it('should inject CSS transforms for slide 2 with scale 0.5', () => {
      const result = generateScaledPreviewHtml(mockHtml, 2, 0.5)
      expect(result).toContain('transform: translateY(-720px) scale(0.5)')
    })

    it('should inject CSS transforms for carousel scale (0.15625)', () => {
      const result = generateScaledPreviewHtml(mockHtml, 1, 0.15625)
      expect(result).toContain('transform: translateY(-112.5px) scale(0.15625)')
    })

    it('should inject CSS into </head> tag if present', () => {
      const result = generateScaledPreviewHtml(mockHtml, 0, 1)
      expect(result).toContain('</head>')
      expect(result.indexOf('<style>') < result.indexOf('</head>')).toBe(true)
    })

    it('should prepend CSS if </head> tag is not present', () => {
      const htmlWithoutHead = '<div id="solon-slide-shell">content</div>'
      const result = generateScaledPreviewHtml(htmlWithoutHead, 0, 1)
      expect(result.startsWith('<style>')).toBe(true)
      expect(result).toContain('transform: translateY(-0px) scale(1)')
    })

    it('should return empty string for empty input', () => {
      const result = generateScaledPreviewHtml('', 0, 1)
      expect(result).toBe('')
    })

    it('should return empty string for null input', () => {
      const result = generateScaledPreviewHtml(null, 0, 1)
      expect(result).toBe('')
    })

    it('should handle large slide indices', () => {
      const result = generateScaledPreviewHtml(mockHtml, 10, 1)
      expect(result).toContain('transform: translateY(-7200px) scale(1)')
    })

    it('should preserve original HTML content', () => {
      const result = generateScaledPreviewHtml(mockHtml, 0, 1)
      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<div class="slide">Slide 1</div>')
      expect(result).toContain('<div class="slide">Slide 2</div>')
    })
  })

  describe('generateMultiSlidePreviewHtmlArray', () => {
    it('should generate array with correct number of previews', () => {
      const result = generateMultiSlidePreviewHtmlArray(mockHtml, 5, 0.15625)
      expect(result).toHaveLength(5)
    })

    it('should generate previews for all slides with correct offsets', () => {
      const scale = 0.15625
      const result = generateMultiSlidePreviewHtmlArray(mockHtml, 3, scale)

      expect(result[0]).toContain('transform: translateY(-0px) scale(0.15625)')
      expect(result[1]).toContain('transform: translateY(-112.5px) scale(0.15625)')
      expect(result[2]).toContain('transform: translateY(-225px) scale(0.15625)')
    })

    it('should return empty array for empty HTML', () => {
      const result = generateMultiSlidePreviewHtmlArray('', 5, 0.15625)
      expect(result).toEqual([])
    })

    it('should return empty array for null HTML', () => {
      const result = generateMultiSlidePreviewHtmlArray(null, 5, 0.15625)
      expect(result).toEqual([])
    })

    it('should return empty array for zero slides', () => {
      const result = generateMultiSlidePreviewHtmlArray(mockHtml, 0, 0.15625)
      expect(result).toEqual([])
    })

    it('should handle single slide', () => {
      const result = generateMultiSlidePreviewHtmlArray(mockHtml, 1, 1)
      expect(result).toHaveLength(1)
      expect(result[0]).toContain('transform: translateY(-0px) scale(1)')
    })

    it('should work with responsive scale', () => {
      const result = generateMultiSlidePreviewHtmlArray(mockHtml, 3, 0.8)
      expect(result[0]).toContain('transform: translateY(-0px) scale(0.8)')
      expect(result[1]).toContain('transform: translateY(-576px) scale(0.8)')
      expect(result[2]).toContain('transform: translateY(-1152px) scale(0.8)')
    })
  })

  describe('calculateSlideOffset', () => {
    it('should calculate offset for slide 0', () => {
      const result = calculateSlideOffset(0, 1)
      expect(result).toBe(0)
    })

    it('should calculate offset for slide 1 with scale 1', () => {
      const result = calculateSlideOffset(1, 1)
      expect(result).toBe(720)
    })

    it('should calculate offset for slide 2 with scale 1', () => {
      const result = calculateSlideOffset(2, 1)
      expect(result).toBe(1440)
    })

    it('should calculate offset for carousel scale', () => {
      const result = calculateSlideOffset(1, 0.15625)
      expect(result).toBe(112.5)
    })

    it('should calculate offset for responsive scale', () => {
      const result = calculateSlideOffset(3, 0.5)
      expect(result).toBe(1080)
    })

    it('should handle fractional scales', () => {
      const result = calculateSlideOffset(1, 0.33333)
      expect(result).toBeCloseTo(239.9976, 3)
    })
  })
})
