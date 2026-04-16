/**
 * SlideCarousel.test.jsx — Unit tests for SlideCarousel component
 *
 * Test coverage:
 * - Rendering: slides display, empty state, counter
 * - Interaction: click, hover, keyboard navigation
 * - Scrolling: scroll-to-center on selection/hover
 * - Accessibility: ARIA labels, keyboard support, focus management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SlideCarousel from './SlideCarousel'

describe('SlideCarousel', () => {
  const mockSlides = [
    '<html><body><div class="slide">Slide 1</div></body></html>',
    '<html><body><div class="slide">Slide 2</div></body></html>',
    '<html><body><div class="slide">Slide 3</div></body></html>',
  ]

  const defaultProps = {
    slides: mockSlides,
    selectedSlideIndex: 0,
    hoveredSlideIndex: null,
    onSlideSelect: vi.fn(),
    onSlideHover: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('should render all slides as carousel items', () => {
      render(<SlideCarousel {...defaultProps} />)
      const items = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      expect(items).toHaveLength(3)
    })

    it('should display slide counter', () => {
      render(<SlideCarousel {...defaultProps} />)
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('should render empty state when no slides', () => {
      render(<SlideCarousel {...defaultProps} slides={[]} />)
      expect(screen.getByText('No slides to display')).toBeInTheDocument()
    })

    it('should render empty state when slides is null', () => {
      render(<SlideCarousel {...defaultProps} slides={null} />)
      expect(screen.getByText('No slides to display')).toBeInTheDocument()
    })

    it('should render iframes for each slide', () => {
      render(<SlideCarousel {...defaultProps} />)
      const iframes = screen.getAllByTitle(/Slide \d+ preview/)
      expect(iframes).toHaveLength(3)
    })

    it('should render slide numbers as overlays', () => {
      const { container } = render(<SlideCarousel {...defaultProps} />)
      const numbers = container.querySelectorAll('.slide-carousel-number')
      expect(numbers).toHaveLength(3)
      expect(numbers[0]).toHaveTextContent('1')
      expect(numbers[1]).toHaveTextContent('2')
      expect(numbers[2]).toHaveTextContent('3')
    })
  })

  // ── Interaction: Click ─────────────────────────────────────────────────────
  describe('Click interaction', () => {
    it('should call onSlideSelect when slide is clicked', () => {
      const onSlideSelect = vi.fn()
      render(<SlideCarousel {...defaultProps} onSlideSelect={onSlideSelect} />)
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      fireEvent.click(slides[1])
      
      expect(onSlideSelect).toHaveBeenCalledWith(1)
    })

    it('should call onSlideSelect for each clicked slide', () => {
      const onSlideSelect = vi.fn()
      render(<SlideCarousel {...defaultProps} onSlideSelect={onSlideSelect} />)
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      fireEvent.click(slides[0])
      fireEvent.click(slides[2])
      
      expect(onSlideSelect).toHaveBeenCalledTimes(2)
      expect(onSlideSelect).toHaveBeenNthCalledWith(1, 0)
      expect(onSlideSelect).toHaveBeenNthCalledWith(2, 2)
    })
  })

  // ── Interaction: Hover ─────────────────────────────────────────────────────
  describe('Hover interaction', () => {
    it('should call onSlideHover when mouse enters slide', () => {
      const onSlideHover = vi.fn()
      render(<SlideCarousel {...defaultProps} onSlideHover={onSlideHover} />)
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      fireEvent.mouseEnter(slides[1])
      
      expect(onSlideHover).toHaveBeenCalledWith(1)
    })

    it('should call onSlideHover(null) when mouse leaves slide', () => {
      const onSlideHover = vi.fn()
      render(<SlideCarousel {...defaultProps} onSlideHover={onSlideHover} />)
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      fireEvent.mouseLeave(slides[1])
      
      expect(onSlideHover).toHaveBeenCalledWith(null)
    })

    it('should update hovered state visually', () => {
      const { container } = render(
        <SlideCarousel {...defaultProps} hoveredSlideIndex={1} />
      )
      
      const items = container.querySelectorAll('.slide-carousel-item')
      expect(items[1]).toHaveClass('hovered')
      expect(items[0]).not.toHaveClass('hovered')
      expect(items[2]).not.toHaveClass('hovered')
    })
  })

  // ── Selection State ────────────────────────────────────────────────────────
  describe('Selection state', () => {
    it('should mark selected slide with selected class', () => {
      const { container } = render(
        <SlideCarousel {...defaultProps} selectedSlideIndex={1} />
      )
      
      const items = container.querySelectorAll('.slide-carousel-item')
      expect(items[1]).toHaveClass('selected')
      expect(items[0]).not.toHaveClass('selected')
      expect(items[2]).not.toHaveClass('selected')
    })

    it('should update counter when selected slide changes', () => {
      const { rerender } = render(
        <SlideCarousel {...defaultProps} selectedSlideIndex={0} />
      )
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
      
      rerender(<SlideCarousel {...defaultProps} selectedSlideIndex={2} />)
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })

    it('should set aria-pressed on selected slide', () => {
      render(<SlideCarousel {...defaultProps} selectedSlideIndex={1} />)
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      expect(slides[1]).toHaveAttribute('aria-pressed', 'true')
      expect(slides[0]).toHaveAttribute('aria-pressed', 'false')
      expect(slides[2]).toHaveAttribute('aria-pressed', 'false')
    })
  })

  // ── Keyboard Navigation ────────────────────────────────────────────────────
  describe('Keyboard navigation', () => {
    it('should navigate left with ArrowLeft key', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={1}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      fireEvent.keyDown(carousel, { key: 'ArrowLeft' })
      
      expect(onSlideSelect).toHaveBeenCalledWith(0)
    })

    it('should navigate right with ArrowRight key', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={1}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      fireEvent.keyDown(carousel, { key: 'ArrowRight' })
      
      expect(onSlideSelect).toHaveBeenCalledWith(2)
    })

    it('should not go below first slide with ArrowLeft', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={0}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      fireEvent.keyDown(carousel, { key: 'ArrowLeft' })
      
      expect(onSlideSelect).not.toHaveBeenCalled()
    })

    it('should not go beyond last slide with ArrowRight', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={2}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      fireEvent.keyDown(carousel, { key: 'ArrowRight' })
      
      expect(onSlideSelect).not.toHaveBeenCalled()
    })

    it('should go to first slide with Home key', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={2}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      fireEvent.keyDown(carousel, { key: 'Home' })
      
      expect(onSlideSelect).toHaveBeenCalledWith(0)
    })

    it('should go to last slide with End key', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={0}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      fireEvent.keyDown(carousel, { key: 'End' })
      
      expect(onSlideSelect).toHaveBeenCalledWith(2)
    })

    it('should select slide on Enter key', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel {...defaultProps} onSlideSelect={onSlideSelect} />
      )
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      fireEvent.keyDown(slides[1], { key: 'Enter' })
      
      expect(onSlideSelect).toHaveBeenCalledWith(1)
    })

    it('should select slide on Space key', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel {...defaultProps} onSlideSelect={onSlideSelect} />
      )
      
      const slides = screen.getAllByRole('button', { name: /Slide \d+ of 3/ })
      fireEvent.keyDown(slides[1], { key: ' ' })
      
      expect(onSlideSelect).toHaveBeenCalledWith(1)
    })

    it('should prevent default behavior on arrow keys', () => {
      const onSlideSelect = vi.fn()
      render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={1}
          onSlideSelect={onSlideSelect}
        />
      )
      
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      vi.spyOn(event, 'preventDefault')
      
      fireEvent.keyDown(carousel, event)
      
      expect(event.preventDefault).toHaveBeenCalled()
    })
  })

  // ── Accessibility ─────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('should have carousel region with label', () => {
      render(<SlideCarousel {...defaultProps} />)
      expect(screen.getByRole('region', { name: 'Slide carousel' })).toBeInTheDocument()
    })

    it('should have aria labels for each slide', () => {
      render(<SlideCarousel {...defaultProps} />)
      
      const slides = screen.getAllByRole('button')
      expect(slides[0]).toHaveAttribute('aria-label', 'Slide 1 of 3')
      expect(slides[1]).toHaveAttribute('aria-label', 'Slide 2 of 3')
      expect(slides[2]).toHaveAttribute('aria-label', 'Slide 3 of 3')
    })

    it('should have counter with live region', () => {
      render(<SlideCarousel {...defaultProps} />)
      const counter = screen.getByText('1 / 3').parentElement
      expect(counter).toHaveAttribute('aria-live', 'polite')
      expect(counter).toHaveAttribute('aria-atomic', 'true')
    })

    it('should hide iframes from screen readers', () => {
      render(<SlideCarousel {...defaultProps} />)
      const iframes = screen.getAllByTitle(/Slide \d+ preview/)
      iframes.forEach((iframe) => {
        expect(iframe).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('should have carousel as focusable element', () => {
      render(<SlideCarousel {...defaultProps} />)
      const carousel = screen.getByRole('region', { name: 'Slide carousel' })
      expect(carousel).toHaveAttribute('tabIndex', '0')
    })

    it('should manage focus on selected slide', () => {
      const { container } = render(
        <SlideCarousel {...defaultProps} selectedSlideIndex={1} />
      )
      
      const items = container.querySelectorAll('.slide-carousel-item')
      expect(items[1]).toHaveAttribute('tabIndex', '0')
      expect(items[0]).toHaveAttribute('tabIndex', '-1')
      expect(items[2]).toHaveAttribute('tabIndex', '-1')
    })
  })

  // ── Hover and Selection Combined ────────────────────────────────────────────
  describe('Hover and selection interaction', () => {
    it('should show hovered state even when different slide is selected', () => {
      const { container } = render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={0}
          hoveredSlideIndex={2}
        />
      )
      
      const items = container.querySelectorAll('.slide-carousel-item')
      expect(items[0]).toHaveClass('selected')
      expect(items[2]).toHaveClass('hovered')
    })

    it('should update counter based on hovered slide when present', () => {
      const { rerender } = render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={0}
          hoveredSlideIndex={null}
        />
      )
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
      
      rerender(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={0}
          hoveredSlideIndex={2}
        />
      )
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })
  })

  // ── Edge Cases ─────────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('should handle single slide', () => {
      render(
        <SlideCarousel
          {...defaultProps}
          slides={[mockSlides[0]]}
          selectedSlideIndex={0}
        />
      )
      
      expect(screen.getByText('1 / 1')).toBeInTheDocument()
      const slide = screen.getByRole('button', { name: 'Slide 1 of 1' })
      expect(slide).toBeInTheDocument()
    })

    it('should handle very large slide count', () => {
      const largeSlideSet = Array.from({ length: 100 }, (_, i) =>
        `<html><body><div class="slide">Slide ${i + 1}</div></body></html>`
      )
      
      render(
        <SlideCarousel
          {...defaultProps}
          slides={largeSlideSet}
          selectedSlideIndex={50}
        />
      )
      
      expect(screen.getByText('51 / 100')).toBeInTheDocument()
    })

    it('should handle rapid selection changes', () => {
      const onSlideSelect = jest.fn()
      const { rerender } = render(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={0}
          onSlideSelect={onSlideSelect}
        />
      )
      
      rerender(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={1}
          onSlideSelect={onSlideSelect}
        />
      )
      rerender(
        <SlideCarousel
          {...defaultProps}
          selectedSlideIndex={2}
          onSlideSelect={onSlideSelect}
        />
      )
      
      expect(screen.getByText('3 / 3')).toBeInTheDocument()
    })
  })
})
