/**
 * Tests for client/src/components/MetadataTable.jsx
 *
 * Use cases covered:
 * UC1: Table rendering and basic interactions
 * UC2: Inline editing of metadata
 * UC3: Row selection and hover states
 * UC4: Error display and clearing
 * UC5: Keyboard navigation
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MetadataTable from './MetadataTable'

describe('MetadataTable', () => {
  const defaultMetadata = [
    { slideId: 'slide-1', name: 'Slide 1', type: 'content' },
    { slideId: 'slide-2', name: 'Slide 2', type: 'content' },
    { slideId: 'slide-3', name: 'Slide 3', type: 'content' },
  ]

  const defaultProps = {
    metadata: defaultMetadata,
    errors: {},
    selectedSlideIndex: 0,
    hoveredSlideIndex: null,
    onMetadataChange: vi.fn(),
    onRowHover: vi.fn(),
    onRowClick: vi.fn(),
  }

  // ── UC1: Table Rendering ─────────────────────────────────────────────

  describe('UC1: Table rendering and structure', () => {
    it('renders table with correct headers', () => {
      render(<MetadataTable {...defaultProps} />)

      expect(screen.getByText('#')).toBeInTheDocument()
      expect(screen.getByText('Slide ID')).toBeInTheDocument()
      expect(screen.getByText('Slide Name')).toBeInTheDocument()
      expect(screen.getByText('Type')).toBeInTheDocument()
    })

    it('renders one row per slide', () => {
      render(<MetadataTable {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      // Header + 3 data rows = 4 rows
      expect(rows).toHaveLength(4)
    })

    it('displays slide numbers in first column', () => {
      render(<MetadataTable {...defaultProps} />)

      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('displays metadata values in input fields', () => {
      render(<MetadataTable {...defaultProps} />)

      expect(screen.getByDisplayValue('slide-1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Slide 1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('slide-2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Slide 2')).toBeInTheDocument()
    })

    it('displays slide types in dropdown', () => {
      render(<MetadataTable {...defaultProps} />)

      const selects = screen.getAllByRole('combobox')
      expect(selects[0]).toHaveValue('content')
      expect(selects[1]).toHaveValue('content')
      expect(selects[2]).toHaveValue('content')
    })
  })

  // ── UC2: Inline Editing ──────────────────────────────────────────────

  describe('UC2: Inline editing of metadata', () => {
    it('user can edit slideId', async () => {
      const onMetadataChange = vi.fn()
      render(
        <MetadataTable {...defaultProps} onMetadataChange={onMetadataChange} />
      )

      const slideIdInput = screen.getByDisplayValue('slide-1')
      await userEvent.clear(slideIdInput)
      await userEvent.type(slideIdInput, 'intro')

      expect(onMetadataChange).toHaveBeenCalledWith(0, 'slideId', 'intro')
    })

    it('user can edit name', async () => {
      const onMetadataChange = vi.fn()
      render(
        <MetadataTable {...defaultProps} onMetadataChange={onMetadataChange} />
      )

      const nameInput = screen.getByDisplayValue('Slide 1')
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'Introduction')

      expect(onMetadataChange).toHaveBeenCalledWith(0, 'name', 'Introduction')
    })

    it('user can change type', async () => {
      const onMetadataChange = vi.fn()
      render(
        <MetadataTable {...defaultProps} onMetadataChange={onMetadataChange} />
      )

      const typeSelects = screen.getAllByRole('combobox')
      await userEvent.selectOption(typeSelects[0], 'title')

      expect(onMetadataChange).toHaveBeenCalledWith(0, 'type', 'title')
    })

    it('all slide type options are available', () => {
      render(<MetadataTable {...defaultProps} />)

      const typeSelects = screen.getAllByRole('combobox')
      const options = typeSelects[0].querySelectorAll('option')

      const optionValues = Array.from(options).map(opt => opt.value)
      expect(optionValues).toContain('content')
      expect(optionValues).toContain('title')
      expect(optionValues).toContain('conclusion')
      expect(optionValues).toContain('other')
    })

    it('multiple rows can be edited independently', async () => {
      const onMetadataChange = vi.fn()
      render(
        <MetadataTable {...defaultProps} onMetadataChange={onMetadataChange} />
      )

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)

      // Edit row 1
      await userEvent.clear(slideIdInputs[0])
      await userEvent.type(slideIdInputs[0], 'intro')

      // Edit row 2
      await userEvent.clear(slideIdInputs[1])
      await userEvent.type(slideIdInputs[1], 'features')

      expect(onMetadataChange).toHaveBeenCalledWith(0, 'slideId', 'intro')
      expect(onMetadataChange).toHaveBeenCalledWith(1, 'slideId', 'features')
    })
  })

  // ── UC3: Row Selection and Hover ──────────────────────────────────────

  describe('UC3: Row selection and hover states', () => {
    it('selected row has selected class', () => {
      render(
        <MetadataTable {...defaultProps} selectedSlideIndex={0} />
      )

      const rows = screen.getAllByRole('row')
      const dataRow1 = rows[1] // First data row

      expect(dataRow1).toHaveClass('selected')
    })

    it('hovered row has hovered class', () => {
      render(
        <MetadataTable {...defaultProps} hoveredSlideIndex={1} />
      )

      const rows = screen.getAllByRole('row')
      const dataRow2 = rows[2] // Second data row

      expect(dataRow2).toHaveClass('hovered')
    })

    it('clicking row calls onRowClick', () => {
      const onRowClick = vi.fn()
      render(
        <MetadataTable {...defaultProps} onRowClick={onRowClick} />
      )

      const rows = screen.getAllByRole('row')
      const dataRow2 = rows[2]

      fireEvent.click(dataRow2)

      expect(onRowClick).toHaveBeenCalledWith(1)
    })

    it('hovering row calls onRowHover', () => {
      const onRowHover = vi.fn()
      render(
        <MetadataTable {...defaultProps} onRowHover={onRowHover} />
      )

      const rows = screen.getAllByRole('row')
      const dataRow2 = rows[2]

      fireEvent.mouseEnter(dataRow2)

      expect(onRowHover).toHaveBeenCalledWith(1)
    })

    it('leaving row calls onRowHover with null', () => {
      const onRowHover = vi.fn()
      render(
        <MetadataTable {...defaultProps} onRowHover={onRowHover} />
      )

      const rows = screen.getAllByRole('row')
      const dataRow2 = rows[2]

      fireEvent.mouseLeave(dataRow2)

      expect(onRowHover).toHaveBeenCalledWith(null)
    })

    it('row with errors has has-errors class', () => {
      const propsWithErrors = {
        ...defaultProps,
        errors: {
          0: { slideId: 'Invalid ID' },
        },
      }

      render(<MetadataTable {...propsWithErrors} />)

      const rows = screen.getAllByRole('row')
      const dataRow1 = rows[1]

      expect(dataRow1).toHaveClass('has-errors')
    })
  })

  // ── UC4: Error Display and Clearing ──────────────────────────────────

  describe('UC4: Error display and clearing', () => {
    it('displays error icon when field has error', () => {
      const propsWithErrors = {
        ...defaultProps,
        errors: {
          0: { slideId: 'Invalid format' },
        },
      }

      render(<MetadataTable {...propsWithErrors} />)

      expect(screen.getByText('⚠')).toBeInTheDocument()
    })

    it('error icon has tooltip with error message', () => {
      const propsWithErrors = {
        ...defaultProps,
        errors: {
          0: { slideId: 'Invalid format' },
        },
      }

      render(<MetadataTable {...propsWithErrors} />)

      const errorIcon = screen.getByText('⚠')
      expect(errorIcon).toHaveAttribute('title', 'Invalid format')
    })

    it('multiple error icons for multiple fields', () => {
      const propsWithErrors = {
        ...defaultProps,
        errors: {
          0: {
            slideId: 'Invalid ID',
            name: 'Name too long',
          },
        },
      }

      render(<MetadataTable {...propsWithErrors} />)

      const errorIcons = screen.getAllByText('⚠')
      expect(errorIcons).toHaveLength(2)
    })

    it('error input has error class', () => {
      const propsWithErrors = {
        ...defaultProps,
        errors: {
          0: { slideId: 'Invalid' },
        },
      }

      render(<MetadataTable {...propsWithErrors} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      expect(slideIdInput).toHaveClass('error')
    })

    it('error select has error class', () => {
      const propsWithErrors = {
        ...defaultProps,
        errors: {
          0: { type: 'Invalid type' },
        },
      }

      render(<MetadataTable {...propsWithErrors} />)

      const typeSelects = screen.getAllByRole('combobox')
      expect(typeSelects[0]).toHaveClass('error')
    })
  })

  // ── UC5: Keyboard Navigation ─────────────────────────────────────────

  describe('UC5: Keyboard navigation', () => {
    it('Tab moves to next field in same row', async () => {
      render(<MetadataTable {...defaultProps} />)

      const slideIdInput = screen.getByDisplayValue('slide-1')
      slideIdInput.focus()

      await userEvent.keyboard('{Tab}')

      const nameInput = screen.getByDisplayValue('Slide 1')
      expect(nameInput).toHaveFocus()
    })

    it('Tab from last field moves to first field of next row', async () => {
      render(<MetadataTable {...defaultProps} />)

      const typeSelects = screen.getAllByRole('combobox')
      typeSelects[0].focus()

      await userEvent.keyboard('{Tab}')

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      expect(slideIdInputs[1]).toHaveFocus()
    })

    it('Shift+Tab moves to previous field', async () => {
      render(<MetadataTable {...defaultProps} />)

      const nameInputs = screen.getAllByDisplayValue(/Slide /)
      nameInputs[0].focus()

      await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

      const slideIdInput = screen.getByDisplayValue('slide-1')
      expect(slideIdInput).toHaveFocus()
    })

    it('Shift+Tab from first field moves to last field of previous row', async () => {
      render(<MetadataTable {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[1].focus()

      await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

      const typeSelects = screen.getAllByRole('combobox')
      expect(typeSelects[0]).toHaveFocus()
    })

    it('ArrowDown moves to same field in next row', async () => {
      render(<MetadataTable {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[0].focus()

      await userEvent.keyboard('{ArrowDown}')

      expect(slideIdInputs[1]).toHaveFocus()
    })

    it('ArrowUp moves to same field in previous row', async () => {
      render(<MetadataTable {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[1].focus()

      await userEvent.keyboard('{ArrowUp}')

      expect(slideIdInputs[0]).toHaveFocus()
    })

    it('ArrowDown at last row does nothing', async () => {
      render(<MetadataTable {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[2].focus()

      await userEvent.keyboard('{ArrowDown}')

      expect(slideIdInputs[2]).toHaveFocus()
    })

    it('ArrowUp at first row does nothing', async () => {
      render(<MetadataTable {...defaultProps} />)

      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      slideIdInputs[0].focus()

      await userEvent.keyboard('{ArrowUp}')

      expect(slideIdInputs[0]).toHaveFocus()
    })
  })

  // ── Integration Tests ────────────────────────────────────────────────

  describe('Integration: Complete table workflow', () => {
    it('user edits all rows with keyboard and mouse', async () => {
      const onMetadataChange = vi.fn()
      render(
        <MetadataTable {...defaultProps} onMetadataChange={onMetadataChange} />
      )

      // Edit row 1 with mouse
      const slideIdInputs = screen.getAllByDisplayValue(/slide-/)
      await userEvent.clear(slideIdInputs[0])
      await userEvent.type(slideIdInputs[0], 'intro')

      // Edit row 2 with keyboard
      slideIdInputs[0].focus()
      await userEvent.keyboard('{ArrowDown}')
      await userEvent.clear(slideIdInputs[1])
      await userEvent.type(slideIdInputs[1], 'features')

      expect(onMetadataChange).toHaveBeenCalledWith(0, 'slideId', 'intro')
      expect(onMetadataChange).toHaveBeenCalledWith(1, 'slideId', 'features')
    })

    it('user hovers rows to preview and clicks to select', () => {
      const onRowHover = vi.fn()
      const onRowClick = vi.fn()

      render(
        <MetadataTable
          {...defaultProps}
          onRowHover={onRowHover}
          onRowClick={onRowClick}
        />
      )

      const rows = screen.getAllByRole('row')
      const dataRow2 = rows[2]
      const dataRow3 = rows[3]

      // Hover row 2
      fireEvent.mouseEnter(dataRow2)
      expect(onRowHover).toHaveBeenCalledWith(1)

      // Click row 3
      fireEvent.click(dataRow3)
      expect(onRowClick).toHaveBeenCalledWith(2)

      // Leave row 2
      fireEvent.mouseLeave(dataRow2)
      expect(onRowHover).toHaveBeenCalledWith(null)
    })
  })
})
