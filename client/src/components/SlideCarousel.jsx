/**
 * SlideCarousel — Horizontal carousel for slide preview.
 *
 * Features:
 * - Displays all slides horizontally as scrollable thumbnails (200×112px, 16:9 aspect ratio)
 * - Smooth scroll-to-center animation (300-400ms) when slide is hovered or selected
 * - Synchronized with metadata table (hover → scroll, click → select)
 * - Keyboard navigation (Arrow keys, Tab, Enter)
 * - Responsive sizing: Desktop (160px height, 5-6 visible), Tablet (140px, 4-5), Mobile (120px, 2-3)
 * - Accessibility: ARIA labels, high contrast, screen reader support
 */

import { useCallback, useEffect, useRef } from 'react'

export default function SlideCarousel({
  slides,                    // Array of slide HTML strings
  selectedSlideIndex,        // Currently selected slide index
  hoveredSlideIndex,         // Currently hovered slide index
  onSlideSelect,            // (index) => void — user clicked a slide
  onSlideHover,             // (index) => void — user hovered a slide
}) {
  const carouselRef = useRef(null)
  const slideRefs = useRef([])

  // ── Scroll to center the selected/hovered slide ────────────────────────────
  const scrollToSlide = useCallback((index) => {
    if (!carouselRef.current || !slideRefs.current[index]) return

    const carousel = carouselRef.current
    const slide = slideRefs.current[index]

    // Calculate scroll position to center the slide
    const carouselRect = carousel.getBoundingClientRect()
    const slideRect = slide.getBoundingClientRect()
    const carouselCenter = carousel.clientWidth / 2
    const slideCenter = slideRect.left - carouselRect.left + slideRect.width / 2

    const scrollDelta = slideCenter - carouselCenter
    const targetScroll = carousel.scrollLeft + scrollDelta

    // Smooth scroll with easing
    carousel.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    })
  }, [])

  // ── Scroll when hovered or selected slide changes ──────────────────────────
  useEffect(() => {
    const displayIndex = hoveredSlideIndex !== null ? hoveredSlideIndex : selectedSlideIndex
    scrollToSlide(displayIndex)
  }, [selectedSlideIndex, hoveredSlideIndex, scrollToSlide])

  // ── Handle keyboard navigation ─────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (!slides) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (selectedSlideIndex > 0) {
            onSlideSelect(selectedSlideIndex - 1)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (selectedSlideIndex < slides.length - 1) {
            onSlideSelect(selectedSlideIndex + 1)
          }
          break
        case 'Home':
          e.preventDefault()
          onSlideSelect(0)
          break
        case 'End':
          e.preventDefault()
          onSlideSelect(slides.length - 1)
          break
        default:
          break
      }
    },
    [selectedSlideIndex, slides, onSlideSelect]
  )

  if (!slides || slides.length === 0) {
    return (
      <div className="slide-carousel-empty" role="status" aria-live="polite">
        <p>No slides to display</p>
      </div>
    )
  }

  return (
    <div className="slide-carousel-container">
      <div
        className="slide-carousel"
        ref={carouselRef}
        role="region"
        aria-label="Slide carousel"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {slides.map((slideHtml, index) => {
          const isSelected = index === selectedSlideIndex
          const isHovered = index === hoveredSlideIndex

          return (
            <div
              key={index}
              ref={(el) => {
                slideRefs.current[index] = el
              }}
              className={`slide-carousel-item ${isSelected ? 'selected' : ''} ${
                isHovered ? 'hovered' : ''
              }`}
              onClick={() => onSlideSelect(index)}
              onMouseEnter={() => onSlideHover(index)}
              onMouseLeave={() => onSlideHover(null)}
              role="button"
              tabIndex={isSelected ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={`Slide ${index + 1} of ${slides.length}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSlideSelect(index)
                }
              }}
            >
              {/* Slide thumbnail using iframe for rendering */}
              <iframe
                className="slide-carousel-iframe"
                srcDoc={slideHtml}
                sandbox="allow-same-origin allow-scripts"
                title={`Slide ${index + 1} preview`}
                aria-hidden="true"
              />
              
              {/* Slide number overlay */}
              <div className="slide-carousel-number" aria-hidden="true">
                {index + 1}
              </div>
            </div>
          )
        })}
      </div>

      {/* Carousel info */}
      <div className="slide-carousel-info" aria-live="polite" aria-atomic="true">
        <span className="slide-carousel-counter">
          {selectedSlideIndex + 1} / {slides.length}
        </span>
      </div>
    </div>
  )
}
