/**
 * Tests for DebugContextModal expansion to include AI JSON response
 * 
 * This test suite verifies that the debug modal can display:
 * 1. The AI JSON response pasted by the user
 * 2. A toggle to include/exclude the AI response
 * 3. Proper serialization and copying of the expanded debug context
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DebugContextModal from '../components/DebugContextModal'

describe('DebugContextModal — AI Response Integration', () => {
  let mockOnClose
  let mockContext

  beforeEach(() => {
    mockOnClose = vi.fn()
    
    // Base context matching the current App.jsx structure
    mockContext = {
      timestamp: '2026-04-16T08:44:45.000Z',
      step: 'html-recipe',
      activeFlow: 'html',
      uploadSession: {
        templateId: 'template-123',
        fileName: 'test.html',
        slideCount: 1,
        projectName: 'test-project',
        selectionCount: 3,
        selections: [],
        repeatableSlides: [{ slideIndex: 1, key: 'slide_1' }],
        hasPreview: true,
        rawHtml: '<html>...</html>'
      },
      project: {
        chainId: 'chain-456',
        projectName: 'test-project',
        zoneCount: 3,
        zones: [],
        selections: [],
        repeatableSlides: []
      },
      recipe: 'GENERATE THE FOLLOWING DATA:...',
      applied: null,
      aiResponse: null // New field for AI JSON response
    }
  })

  describe('AI Response Toggle', () => {
    it('should render "AI Response" toggle when aiResponse is available', () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"..."}]}}}',
        validated: true,
        validationResult: {
          valid: true,
          foundFields: ['header'],
          missingFields: [],
          instanceCount: 1
        }
      }

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const aiResponseLabel = screen.getByText('AI Response')
      expect(aiResponseLabel).toBeInTheDocument()
    })

    it('should not render "AI Response" toggle when aiResponse is null', () => {
      mockContext.aiResponse = null

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const aiResponseLabels = screen.queryAllByText('AI Response')
      expect(aiResponseLabels.length).toBe(0)
    })

    it('should show "not available" text when aiResponse is null', () => {
      mockContext.aiResponse = null

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const notAvailable = screen.queryByText(/— not available/)
      // Should not show AI Response section at all if null
      expect(notAvailable).not.toBeInTheDocument()
    })
  })

  describe('AI Response Toggle Functionality', () => {
    beforeEach(() => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test Header"}]}}}',
        validated: true,
        validationResult: {
          valid: true,
          foundFields: ['header'],
          missingFields: [],
          instanceCount: 1
        }
      }
    })

    it('should include aiResponse in JSON when toggle is checked', async () => {
      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })
      expect(aiResponseCheckbox).not.toBeChecked()

      // Check the AI Response toggle
      fireEvent.click(aiResponseCheckbox)
      await waitFor(() => {
        expect(aiResponseCheckbox).toBeChecked()
      })

      // Verify the JSON now includes aiResponse
      const jsonOutput = screen.getByText(/Test Header/, { selector: 'pre' })
      expect(jsonOutput.textContent).toContain('aiResponse')
      expect(jsonOutput.textContent).toContain('Test Header')
    })

    it('should exclude aiResponse from JSON when toggle is unchecked', async () => {
      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })
      
      // Check the AI Response toggle first
      fireEvent.click(aiResponseCheckbox)
      await waitFor(() => {
        expect(aiResponseCheckbox).toBeChecked()
      })

      // Uncheck it
      fireEvent.click(aiResponseCheckbox)
      await waitFor(() => {
        expect(aiResponseCheckbox).not.toBeChecked()
      })

      // Verify the JSON no longer includes aiResponse
      const jsonOutput = screen.getByText(/recipe/, { selector: 'pre' })
      expect(jsonOutput.textContent).not.toContain('Test Header')
    })
  })

  describe('AI Response Data Structure', () => {
    it('should handle aiResponse with raw JSON string', () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: { valid: true }
      }

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })
      fireEvent.click(aiResponseCheckbox)

      expect(aiResponseCheckbox).toBeChecked()
    })

    it('should handle aiResponse with validation results', () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: {
          valid: true,
          foundFields: ['header', 'body'],
          missingFields: [],
          instanceCount: 1
        }
      }

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })
      fireEvent.click(aiResponseCheckbox)

      const jsonOutput = screen.getByText(/header/, { selector: 'pre' })
      expect(jsonOutput.textContent).toContain('validationResult')
      expect(jsonOutput.textContent).toContain('foundFields')
    })
  })

  describe('Copy Functionality with AI Response', () => {
    beforeEach(() => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test Header"}]}}}',
        validated: true,
        validationResult: {
          valid: true,
          foundFields: ['header'],
          missingFields: [],
          instanceCount: 1
        }
      }

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn(() => Promise.resolve())
        }
      })
    })

    it('should include aiResponse in copied JSON when toggle is enabled', async () => {
      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      // Enable AI Response toggle
      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })
      fireEvent.click(aiResponseCheckbox)

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /Copy/ })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
        const copiedText = navigator.clipboard.writeText.mock.calls[0][0]
        expect(copiedText).toContain('```json')
        expect(copiedText).toContain('aiResponse')
        expect(copiedText).toContain('Test Header')
      })
    })

    it('should exclude aiResponse from copied JSON when toggle is disabled', async () => {
      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      // AI Response toggle is disabled by default
      // Click copy button
      const copyButton = screen.getByRole('button', { name: /Copy/ })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
        const copiedText = navigator.clipboard.writeText.mock.calls[0][0]
        expect(copiedText).toContain('```json')
        expect(copiedText).not.toContain('Test Header')
      })
    })
  })

  describe('Toggle State Persistence', () => {
    it('should remember toggle state when switching between toggles', async () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: { valid: true }
      }

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      // Enable Recipe toggle (enabled by default)
      const recipeCheckbox = screen.getByRole('checkbox', { name: /Recipe/ })
      expect(recipeCheckbox).toBeChecked()

      // Enable AI Response toggle
      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })
      fireEvent.click(aiResponseCheckbox)

      await waitFor(() => {
        expect(aiResponseCheckbox).toBeChecked()
      })

      // Recipe should still be checked
      expect(recipeCheckbox).toBeChecked()
    })
  })

  describe('Alignment with Existing Implementation', () => {
    it('should follow the same toggle pattern as Raw HTML, Recipe, and Output HTML', () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: { valid: true }
      }
      mockContext.uploadSession.rawHtml = '<html>...</html>'
      mockContext.recipe = 'GENERATE...'
      mockContext.applied = { outputHtml: '<html>...</html>' }

      render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      // All four toggles should exist
      const rawHtmlCheckbox = screen.getByRole('checkbox', { name: /Raw HTML/ })
      const recipeCheckbox = screen.getByRole('checkbox', { name: /Recipe/ })
      const outputCheckbox = screen.getByRole('checkbox', { name: /Output HTML/ })
      const aiResponseCheckbox = screen.getByRole('checkbox', { name: /AI Response/ })

      expect(rawHtmlCheckbox).toBeInTheDocument()
      expect(recipeCheckbox).toBeInTheDocument()
      expect(outputCheckbox).toBeInTheDocument()
      expect(aiResponseCheckbox).toBeInTheDocument()
    })

    it('should use the same CSS class naming convention', () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: { valid: true }
      }

      const { container } = render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      // Should use debug-include-option class like other toggles
      const labels = container.querySelectorAll('.debug-include-option')
      expect(labels.length).toBeGreaterThan(0)
    })

    it('should maintain the debug-include-row layout', () => {
      mockContext.aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: { valid: true }
      }

      const { container } = render(
        <DebugContextModal context={mockContext} onClose={mockOnClose} />
      )

      const row = container.querySelector('.debug-include-row')
      expect(row).toBeInTheDocument()

      // Should have multiple options in the row
      const options = row.querySelectorAll('.debug-include-option')
      expect(options.length).toBeGreaterThan(1)
    })
  })
})
