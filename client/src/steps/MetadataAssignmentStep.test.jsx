/**
 * Tests for client/src/steps/MetadataAssignmentStep.jsx
 *
 * Use cases covered:
 * UC1: Basic Happy Path - User assigns metadata to 3 slides
 * UC2: Error Handling - User makes mistakes and sees validation errors
 * UC3: Keyboard Navigation - User navigates using Tab, Shift+Tab, Arrow keys
 * UC4: Preview Interactions - Hover updates preview, click persists selection
 * UC5: Large Projects - Scrolling table with 10+ slides
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MetadataAssignmentStep from './MetadataAssignmentStep'

describe('MetadataAssignmentStep', () => {
  const defaultProps = {
    project: {
      chainId: 'test-chain-123',
      projectName: 'Test Project',
      zones: [],
    },
    applied: {
      outputFile: 'output.html',
      previewHtml: '<html><body><section>Slide 1</section><section>Slide 2</section><section>Slide 3</section></body></html>',
      slideCount: 3,
      roundId: 'round-1',
    },
    step: 'html-metadata',
    canNavigateTo: vi.fn(() => true),
    navigateTo: vi.fn(),
    onBack: vi.fn(),
    onNext: vi.fn(),
    setToast: vi.fn(),
    debugContext: {},
  }

  // ── UC1: Basic Happy Path ────────────────────────────────────────────

  describe('UC1: Basic Happy Path - 3-slide project', () => {
    it('renders metadata table with 3 rows', () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      // Header + 3 data rows = 4 rows
      expect(rows).toHaveLength(4)
    })

    it('initializes metadata with default values', () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      expect(screen.getByDisplayValue('slide-1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Slide 1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('slide-2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Slide 2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('slide-3')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Slide 3')).toBeInTheDocument()
    })

    it('shows breadcrumb with "Assign Metadata" step', () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      expect(screen.getByText('Assign metadata to each slide')).toBeInTheDocument()
    })

    it('displays preview panel with slide counter', () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      expect(screen.getByText('Slide Preview')).toBeInTheDocument()
      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('user can edit Slide 1 metadata', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      const nameInput = screen.getByDisplayValue('Slide 1')

      await userEvent.clear(slideIdInput)
      await userEvent.type(slideIdInput, 'product-launch-intro')

      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Product Launch Overview')

      expect(slideIdInput).toHaveValue('product-launch-intro')
      expect(nameInput).toHaveValue('Product Launch Overview')
    })

    it('user can change slide type', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const typeSelects = screen.getAllByRole('combobox')
      await userEvent.selectOption(typeSelects[0], 'title')

      expect(typeSelects[0]).toHaveValue('title')
    })

    it('user can save with valid metadata', async () => {
      const onNext = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} onNext={onNext} />)

      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onNext).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              slideId: 'slide-1',
              name: 'Slide 1',
              type: 'content',
            }),
          ])
        )
      })
    })

    it('shows Back button to return to preview', () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const backButton = screen.getByText(/Back to preview/)
      expect(backButton).toBeInTheDocument()
    })

    it('calls onBack when Back button clicked', () => {
      const onBack = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} onBack={onBack} />)

      const backButton = screen.getByText(/Back to preview/)
      fireEvent.click(backButton)

      expect(onBack).toHaveBeenCalled()
    })
  })

  // ── UC2: Error Handling ──────────────────────────────────────────────

  describe('UC2: Error Handling - Validation errors', () => {
    it('shows error when slideId contains special characters', async () => {
      const setToast = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} setToast={setToast} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      await userEvent.clear(slideIdInput)
      await userEvent.type(slideIdInput, 'slide@#$%123')

      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(setToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
            message: expect.stringContaining('fix validation errors'),
          })
        )
      })
    })

    it('shows error when name is empty', async () => {
      const setToast = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} setToast={setToast} />)

      const nameInput = screen.getByDisplayValue('Slide 1')
      await userEvent.clear(nameInput)

      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(setToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
          })
        )
      })
    })

    it('shows error when type is not selected', async () => {
      const setToast = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} setToast={setToast} />)

      const typeSelects = screen.getAllByRole('combobox')
      await userEvent.selectOption(typeSelects[0], '')

      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(setToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'error',
          })
        )
      })
    })

    it('error icons appear in table for invalid fields', async () => {
      const setToast = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} setToast={setToast} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      await userEvent.clear(slideIdInput)
      await userEvent.type(slideIdInput, 'invalid@#$')

      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('⚠')).toBeInTheDocument()
      })
    })

    it('error clears when user fixes the field', async () => {
      const setToast = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} setToast={setToast} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      
      // Make invalid
      await userEvent.clear(slideIdInput)
      await userEvent.type(slideIdInput, 'invalid@#$')

      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('⚠')).toBeInTheDocument()
      })

      // Fix the error
      await userEvent.clear(slideIdInput)
      await userEvent.type(slideIdInput, 'valid-id')

      // Error should be cleared
      const warnings = screen.queryAllByText('⚠')
      expect(warnings).toHaveLength(0)
    })
  })

  // ── UC3: Keyboard Navigation ─────────────────────────────────────────

  describe('UC3: Keyboard Navigation - Tab, Shift+Tab, Arrow keys', () => {
    it('Tab key moves to next field', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      slideIdInput.focus()

      await userEvent.keyboard('{Tab}')

      const nameInput = screen.getByDisplayValue('Slide 1')
      expect(nameInput).toHaveFocus()
    })

    it('Shift+Tab moves to previous field', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const typeSelects = screen.getAllByRole('combobox')
      typeSelects[0].focus()

      await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

      const nameInput = screen.getByDisplayValue('Slide 1')
      expect(nameInput).toHaveFocus()
    })

    it('Arrow Down moves to same field in next row', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[0].focus()

      await userEvent.keyboard('{ArrowDown}')

      expect(slideIdInputs[1]).toHaveFocus()
    })

    it('Arrow Up moves to same field in previous row', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[1].focus()

      await userEvent.keyboard('{ArrowUp}')

      expect(slideIdInputs[0]).toHaveFocus()
    })

    it('user can complete all rows with keyboard only', async () => {
      const onNext = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} onNext={onNext} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)

      // Edit row 1
      slideIdInputs[0].focus()
      await userEvent.type(slideIdInputs[0], '{selectall}intro')
      await userEvent.keyboard('{Tab}')
      const nameInputs = screen.getAllByDisplayValue(/Slide /)
      await userEvent.type(nameInputs[0], '{selectall}Introduction')
      await userEvent.keyboard('{Tab}')
      const typeSelects = screen.getAllByRole('combobox')
      await userEvent.selectOption(typeSelects[0], 'title')

      // Navigate to Save button and click
      const saveButton = screen.getByText('Save & Continue')
      saveButton.focus()
      await userEvent.keyboard('{Enter}')

      await waitFor(() => {
        expect(onNext).toHaveBeenCalled()
      })
    })
  })

  // ── UC4: Preview Interactions ────────────────────────────────────────

  describe('UC4: Preview Interactions - Hover and Click', () => {
    it('hovering row updates preview counter', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      const row2 = rows[2] // Data row 2 (index 2)

      fireEvent.mouseEnter(row2)

      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })
    })

    it('clicking row selects it', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      const row2 = rows[2]

      fireEvent.click(row2)

      expect(row2).toHaveClass('selected')
    })

    it('selected row persists when moving mouse away', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      const row2 = rows[2]
      const row3 = rows[3]

      // Select row 2
      fireEvent.click(row2)
      expect(row2).toHaveClass('selected')

      // Move to row 3
      fireEvent.mouseEnter(row3)
      fireEvent.mouseLeave(row3)

      // Row 2 should still be selected
      expect(row2).toHaveClass('selected')
    })

    it('hovering different row updates preview while selection persists', async () => {
      render(<MetadataAssignmentStep {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      const row2 = rows[2]
      const row3 = rows[3]

      // Select row 2
      fireEvent.click(row2)
      expect(row2).toHaveClass('selected')

      // Hover row 3
      fireEvent.mouseEnter(row3)

      await waitFor(() => {
        expect(screen.getByText('3 / 3')).toBeInTheDocument()
      })

      // Row 2 still selected
      expect(row2).toHaveClass('selected')

      // Move away from row 3
      fireEvent.mouseLeave(row3)

      // Preview returns to row 2
      await waitFor(() => {
        expect(screen.getByText('2 / 3')).toBeInTheDocument()
      })
    })
  })

  // ── UC5: Large Projects ──────────────────────────────────────────────

  describe('UC5: Large Projects - 10 slides', () => {
    it('renders table with 10 slides', () => {
      const largeProps = {
        ...defaultProps,
        applied: {
          ...defaultProps.applied,
          slideCount: 10,
          previewHtml: '<html><body>' + 
            Array.from({ length: 10 }, (_, i) => `<section>Slide ${i + 1}</section>`).join('') +
            '</body></html>',
        },
      }

      render(<MetadataAssignmentStep {...largeProps} />)

      const rows = screen.getAllByRole('row')
      // Header + 10 data rows = 11 rows
      expect(rows).toHaveLength(11)
    })

    it('can edit slides throughout the table', async () => {
      const largeProps = {
        ...defaultProps,
        applied: {
          ...defaultProps.applied,
          slideCount: 10,
          previewHtml: '<html><body>' + 
            Array.from({ length: 10 }, (_, i) => `<section>Slide ${i + 1}</section>`).join('') +
            '</body></html>',
        },
      }

      render(<MetadataAssignmentStep {...largeProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      
      // Edit first slide
      await userEvent.clear(slideIdInputs[0])
      await userEvent.type(slideIdInputs[0], 'intro')

      // Edit last slide
      await userEvent.clear(slideIdInputs[9])
      await userEvent.type(slideIdInputs[9], 'conclusion')

      expect(slideIdInputs[0]).toHaveValue('intro')
      expect(slideIdInputs[9]).toHaveValue('conclusion')
    })

    it('preview shows correct slide when hovering row 8', async () => {
      const largeProps = {
        ...defaultProps,
        applied: {
          ...defaultProps.applied,
          slideCount: 10,
          previewHtml: '<html><body>' + 
            Array.from({ length: 10 }, (_, i) => `<section>Slide ${i + 1}</section>`).join('') +
            '</body></html>',
        },
      }

      render(<MetadataAssignmentStep {...largeProps} />)

      const rows = screen.getAllByRole('row')
      const row8 = rows[8] // Data row 8 (index 8)

      fireEvent.mouseEnter(row8)

      await waitFor(() => {
        expect(screen.getByText('8 / 10')).toBeInTheDocument()
      })
    })
  })

  // ── Additional Integration Tests ─────────────────────────────────────

  describe('Integration: Complete workflow', () => {
    it('user completes all steps and saves successfully', async () => {
      const onNext = vi.fn()
      render(<MetadataAssignmentStep {...defaultProps} onNext={onNext} />)

      // Edit all 3 slides
      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      const nameInputs = screen.getAllByDisplayValue(/Slide /)
      const typeSelects = screen.getAllByRole('combobox')

      // Slide 1
      await userEvent.clear(slideIdInputs[0])
      await userEvent.type(slideIdInputs[0], 'intro')
      await userEvent.clear(nameInputs[0])
      await userEvent.type(nameInputs[0], 'Introduction')
      await userEvent.selectOption(typeSelects[0], 'title')

      // Slide 2
      await userEvent.clear(slideIdInputs[1])
      await userEvent.type(slideIdInputs[1], 'features')
      await userEvent.clear(nameInputs[1])
      await userEvent.type(nameInputs[1], 'Features')
      await userEvent.selectOption(typeSelects[1], 'content')

      // Slide 3
      await userEvent.clear(slideIdInputs[2])
      await userEvent.type(slideIdInputs[2], 'conclusion')
      await userEvent.clear(nameInputs[2])
      await userEvent.type(nameInputs[2], 'Thank You')
      await userEvent.selectOption(typeSelects[2], 'conclusion')

      // Save
      const saveButton = screen.getByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onNext).toHaveBeenCalledWith([
          { slideId: 'intro', name: 'Introduction', type: 'title' },
          { slideId: 'features', name: 'Features', type: 'content' },
          { slideId: 'conclusion', name: 'Thank You', type: 'conclusion' },
        ])
      })
    })
  })
})
