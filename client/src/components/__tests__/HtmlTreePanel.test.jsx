/**
 * Tests for client/src/components/HtmlTreePanel.jsx
 *
 * Covers ignore button functionality and ignored state handling.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HtmlTreePanel from '../HtmlTreePanel'

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockNode = (id, label = 'div', classes = []) => ({
  id,
  tag: 'div',
  label,
  classes,
  children: [],
  textPreview: '',
  interesting: false,
  chrome: false,
})

const mockSelection = (nodeId, key = 'zone1', ignored = false) => ({
  nodeId,
  slideIndex: 1,
  zoneType: 'leaf',
  key,
  hint: 'test hint',
  prompt: '',
  autoGenerate: true,
  type: 'text',
  ignored,
})

// ─────────────────────────────────────────────────────────────────────────────
// Ignore Button Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('HtmlTreePanel — Ignore Button Rendering', () => {
  it('should render ignore button on assigned zones', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title')]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    expect(ignoreBtn).toBeInTheDocument()
  })

  it('should not render ignore button on unassigned zones', () => {
    const tree = [mockNode('div.title')]
    const selections = []
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.queryByTestId('tree-ignore-btn-div.title')
    expect(ignoreBtn).not.toBeInTheDocument()
  })

  it('should show strikethrough icon when zone is ignored', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', true)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    expect(ignoreBtn).toHaveAttribute('aria-pressed', 'true')
    expect(ignoreBtn.textContent).toContain('🚫')
  })

  it('should show normal icon when zone is not ignored', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', false)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    expect(ignoreBtn).toHaveAttribute('aria-pressed', 'false')
    expect(ignoreBtn.textContent).toContain('⊘')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ignore Button Interaction
// ─────────────────────────────────────────────────────────────────────────────

describe('HtmlTreePanel — Ignore Button Interaction', () => {
  it('should toggle ignored state when ignore button is clicked', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', false)]
    const onSelections = vi.fn()

    const { rerender } = render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    fireEvent.click(ignoreBtn)

    expect(onSelections).toHaveBeenCalledWith([
      expect.objectContaining({
        nodeId: 'div.title',
        ignored: true,
      }),
    ])
  })

  it('should un-ignore zone when button is clicked on ignored zone', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', true)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    fireEvent.click(ignoreBtn)

    expect(onSelections).toHaveBeenCalledWith([
      expect.objectContaining({
        nodeId: 'div.title',
        ignored: false,
      }),
    ])
  })

  it('should preserve other selection properties when toggling ignore', () => {
    const tree = [mockNode('div.title')]
    const selections = [
      mockSelection('div.title', 'my_zone', false),
    ]
    selections[0].prompt = 'Custom prompt'
    selections[0].autoGenerate = false
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    fireEvent.click(ignoreBtn)

    expect(onSelections).toHaveBeenCalledWith([
      expect.objectContaining({
        nodeId: 'div.title',
        key: 'my_zone',
        prompt: 'Custom prompt',
        autoGenerate: false,
        ignored: true,
      }),
    ])
  })

  it('should handle multiple zones with different ignored states', () => {
    const tree = [
      mockNode('div.title'),
      mockNode('div.body'),
      mockNode('div.footer'),
    ]
    const selections = [
      mockSelection('div.title', 'title', false),
      mockSelection('div.body', 'body', true),
      mockSelection('div.footer', 'footer', false),
    ]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtns = screen.getAllByTestId(/tree-ignore-btn-/)
    expect(ignoreBtns).toHaveLength(3)

    // Verify initial states
    expect(ignoreBtns[0]).toHaveAttribute('aria-pressed', 'false')
    expect(ignoreBtns[1]).toHaveAttribute('aria-pressed', 'true')
    expect(ignoreBtns[2]).toHaveAttribute('aria-pressed', 'false')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Visual Indicators
// ─────────────────────────────────────────────────────────────────────────────

describe('HtmlTreePanel — Ignored State Visual Indicators', () => {
  it('should apply tree-node--ignored class to ignored zones', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', true)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const node = screen.getByTestId('tree-node-div.title')
    expect(node).toHaveClass('tree-node--ignored')
  })

  it('should not apply tree-node--ignored class to non-ignored zones', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', false)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const node = screen.getByTestId('tree-node-div.title')
    expect(node).not.toHaveClass('tree-node--ignored')
  })

  it('should have proper aria-label on ignore button', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', false)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    expect(ignoreBtn).toHaveAttribute('aria-label', 'Ignore zone')
  })

  it('should update aria-label when zone is ignored', () => {
    const tree = [mockNode('div.title')]
    const selections = [mockSelection('div.title', 'zone1', true)]
    const onSelections = vi.fn()

    render(
      <HtmlTreePanel
        trees={[tree]}
        selections={selections}
        onSelections={onSelections}
        onClearAll={vi.fn()}
        repeatableSlides={[]}
        onRepeatableSlides={vi.fn()}
        slideCount={1}
        highlightNodeId={null}
        onHighlight={vi.fn()}
      />
    )

    const ignoreBtn = screen.getByTestId('tree-ignore-btn-div.title')
    expect(ignoreBtn).toHaveAttribute('aria-label', 'Un-ignore zone')
  })
})
