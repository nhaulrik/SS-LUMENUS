/**
 * Tests for client/src/components/SaveProjectDialog.jsx
 *
 * Covers dialog rendering, input validation, callbacks, and keyboard support.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SaveProjectDialog from '../SaveProjectDialog'

describe('SaveProjectDialog', () => {
  it('renders with default name', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test Project"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    expect(screen.getByText('Save Project')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument()
  })

  it('updates name when user types', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Initial"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const input = screen.getByDisplayValue('Initial')
    fireEvent.change(input, { target: { value: 'New Project' } })
    
    expect(input.value).toBe('New Project')
  })

  it('calls onConfirm with trimmed name when button clicked', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const input = screen.getByDisplayValue('Test')
    fireEvent.change(input, { target: { value: '  My Project  ' } })
    
    const saveButton = screen.getAllByText('Save Project')[1] // button, not header
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('My Project')
    })
  })

  it('calls onCancel when cancel button clicked', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows error for empty name', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName=""
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const saveButton = screen.getAllByText('Save Project')[1]
    fireEvent.click(saveButton)
    
    expect(screen.getByText('Please enter a project name')).toBeInTheDocument()
  })

  it('shows error for whitespace-only name', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="   "
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const saveButton = screen.getAllByText('Save Project')[1]
    fireEvent.click(saveButton)
    
    expect(screen.getByText('Please enter a project name')).toBeInTheDocument()
  })

  it('shows error for name exceeding 100 characters', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="a"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const input = screen.getByDisplayValue('a')
    const longName = 'a'.repeat(101)
    fireEvent.change(input, { target: { value: longName } })
    
    const saveButton = screen.getAllByText('Save Project')[1]
    fireEvent.click(saveButton)
    
    expect(screen.getByText('Project name must be 100 characters or less')).toBeInTheDocument()
  })

  it('supports Enter key to confirm', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const input = screen.getByDisplayValue('Test')
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('Test')
    })
  })

  it('supports Escape key to cancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const input = screen.getByDisplayValue('Test')
    fireEvent.keyPress(input, { key: 'Escape', code: 'Escape', charCode: 27 })
    
    expect(onCancel).toHaveBeenCalled()
  })

  it('disables buttons while loading', () => {
    const onConfirm = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const saveButton = screen.getAllByText('Save Project')[1]
    fireEvent.click(saveButton)
    
    expect(saveButton).toBeDisabled()
  })

  it('shows loading state while saving', async () => {
    const onConfirm = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const saveButton = screen.getAllByText('Save Project')[1]
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  it('closes dialog on overlay click', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const overlay = screen.getByRole('alert').parentElement.parentElement
    fireEvent.click(overlay)
    
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not close dialog when clicking inside dialog', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const dialog = screen.getByText('Save Project').closest('.dialog')
    fireEvent.click(dialog)
    
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('auto-focuses input field', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName="Test"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    const input = screen.getByDisplayValue('Test')
    expect(input).toHaveFocus()
  })

  it('clears error message when user starts typing', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    
    render(
      <SaveProjectDialog
        defaultName=""
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
    
    // Trigger error
    const saveButton = screen.getAllByText('Save Project')[1]
    fireEvent.click(saveButton)
    expect(screen.getByText('Please enter a project name')).toBeInTheDocument()
    
    // Start typing
    const input = screen.getByPlaceholderText('e.g., Car Manufacturers')
    fireEvent.change(input, { target: { value: 'a' } })
    
    // Error should be cleared
    expect(screen.queryByText('Please enter a project name')).not.toBeInTheDocument()
  })
})
