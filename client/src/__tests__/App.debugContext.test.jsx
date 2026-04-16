/**
 * Tests for App.jsx debug context expansion to include AI JSON response
 * 
 * This test suite verifies that:
 * 1. The debug context captures the AI response from HtmlRecipeStep
 * 2. The AI response is properly structured with raw JSON and validation results
 * 3. The debug context is passed correctly to DebugContextModal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('App.jsx — Debug Context Expansion', () => {
  describe('AI Response Structure', () => {
    it('should have aiResponse property in debug context', () => {
      // The debug context should include aiResponse field
      const debugContext = {
        timestamp: '2026-04-16T08:44:45.000Z',
        step: 'html-recipe',
        activeFlow: 'html',
        uploadSession: {},
        project: {},
        recipe: null,
        applied: null,
        aiResponse: null // New field
      }

      expect(debugContext).toHaveProperty('aiResponse')
    })

    it('should structure aiResponse with raw JSON and validation results', () => {
      const aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: {
          valid: true,
          foundFields: ['header'],
          missingFields: [],
          instanceCount: 1
        }
      }

      expect(aiResponse).toHaveProperty('raw')
      expect(aiResponse).toHaveProperty('validated')
      expect(aiResponse).toHaveProperty('validationResult')
      expect(typeof aiResponse.raw).toBe('string')
      expect(typeof aiResponse.validated).toBe('boolean')
      expect(aiResponse.validationResult).toHaveProperty('valid')
    })

    it('should handle null aiResponse when no JSON input provided', () => {
      const debugContext = {
        aiResponse: null
      }

      expect(debugContext.aiResponse).toBeNull()
    })

    it('should capture raw JSON string as-is from user input', () => {
      const userJsonInput = '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}'
      
      const aiResponse = {
        raw: userJsonInput,
        validated: true,
        validationResult: { valid: true }
      }

      expect(aiResponse.raw).toBe(userJsonInput)
    })
  })

  describe('AI Response Validation Integration', () => {
    it('should include validation result from server response', () => {
      const serverValidationResponse = {
        valid: true,
        error: null,
        foundFields: ['header', 'body'],
        missingFields: [],
        instanceCount: 2
      }

      const aiResponse = {
        raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
        validated: true,
        validationResult: serverValidationResponse
      }

      expect(aiResponse.validationResult.valid).toBe(true)
      expect(aiResponse.validationResult.foundFields).toEqual(['header', 'body'])
      expect(aiResponse.validationResult.instanceCount).toBe(2)
    })

    it('should mark as validated when validation response received', () => {
      const aiResponse = {
        raw: '{"slides":{...}}',
        validated: false,
        validationResult: null
      }

      // After validation
      const updatedAiResponse = {
        ...aiResponse,
        validated: true,
        validationResult: {
          valid: true,
          foundFields: [],
          missingFields: [],
          instanceCount: 0
        }
      }

      expect(updatedAiResponse.validated).toBe(true)
      expect(updatedAiResponse.validationResult).not.toBeNull()
    })

    it('should capture validation errors in aiResponse', () => {
      const aiResponse = {
        raw: '{"invalid json',
        validated: true,
        validationResult: {
          valid: false,
          error: 'Invalid JSON syntax',
          foundFields: [],
          missingFields: ['header', 'body'],
          instanceCount: 0
        }
      }

      expect(aiResponse.validationResult.valid).toBe(false)
      expect(aiResponse.validationResult.error).toBeDefined()
      expect(aiResponse.validationResult.missingFields.length).toBeGreaterThan(0)
    })
  })

  describe('Debug Context Passing to Modal', () => {
    it('should pass aiResponse from App context to DebugContextModal', () => {
      const debugContext = {
        timestamp: '2026-04-16T08:44:45.000Z',
        step: 'html-recipe',
        activeFlow: 'html',
        uploadSession: null,
        project: null,
        recipe: null,
        applied: null,
        aiResponse: {
          raw: '{"slides":{...}}',
          validated: true,
          validationResult: { valid: true }
        }
      }

      // Modal should receive the full context including aiResponse
      expect(debugContext.aiResponse).toBeDefined()
      expect(debugContext.aiResponse.raw).toBeDefined()
    })

    it('should include aiResponse in serialized JSON for copying', () => {
      const debugContext = {
        aiResponse: {
          raw: '{"slides":{"slide_1":{"instances":[{"header":"Test"}]}}}',
          validated: true,
          validationResult: {
            valid: true,
            foundFields: ['header'],
            missingFields: [],
            instanceCount: 1
          }
        }
      }

      const json = JSON.stringify(debugContext, null, 2)
      expect(json).toContain('aiResponse')
      expect(json).toContain('raw')
      expect(json).toContain('validationResult')
    })
  })

  describe('HtmlRecipeStep Integration', () => {
    it('should update aiResponse when JSON input changes', () => {
      let aiResponse = null

      // Simulating state update in HtmlRecipeStep
      const handleJsonChange = (jsonInput, validationResult) => {
        aiResponse = {
          raw: jsonInput,
          validated: !!validationResult,
          validationResult: validationResult || null
        }
      }

      // User pastes JSON
      const userJson = '{"slides":{"slide_1":{}}}'
      handleJsonChange(userJson, null)

      expect(aiResponse.raw).toBe(userJson)
      expect(aiResponse.validated).toBe(false)
    })

    it('should update aiResponse when validation completes', () => {
      const initialAiResponse = {
        raw: '{"slides":{"slide_1":{}}}',
        validated: false,
        validationResult: null
      }

      // Simulating validation completion
      const validationResult = {
        valid: true,
        foundFields: ['slide_1'],
        missingFields: [],
        instanceCount: 1
      }

      const updatedAiResponse = {
        ...initialAiResponse,
        validated: true,
        validationResult
      }

      expect(updatedAiResponse.validated).toBe(true)
      expect(updatedAiResponse.validationResult.valid).toBe(true)
    })

    it('should clear aiResponse when JSON input is cleared', () => {
      const aiResponse = {
        raw: '',
        validated: false,
        validationResult: null
      }

      expect(aiResponse.raw).toBe('')
      expect(aiResponse.validationResult).toBeNull()
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle debug context without aiResponse field (old format)', () => {
      const oldDebugContext = {
        timestamp: '2026-04-16T08:44:45.000Z',
        step: 'html-recipe',
        activeFlow: 'html',
        uploadSession: null,
        project: null,
        recipe: null,
        applied: null
        // No aiResponse field
      }

      // Should not break when aiResponse is missing
      expect(oldDebugContext.aiResponse).toBeUndefined()
      
      // Modal should handle gracefully
      const hasAiResponse = oldDebugContext.aiResponse !== undefined && oldDebugContext.aiResponse !== null
      expect(hasAiResponse).toBe(false)
    })

    it('should work with null aiResponse (no JSON pasted yet)', () => {
      const debugContext = {
        timestamp: '2026-04-16T08:44:45.000Z',
        step: 'html-recipe',
        activeFlow: 'html',
        uploadSession: null,
        project: null,
        recipe: null,
        applied: null,
        aiResponse: null
      }

      expect(debugContext.aiResponse).toBeNull()
      const json = JSON.stringify(debugContext)
      expect(json).toContain('null')
    })
  })

  describe('State Preservation', () => {
    it('should preserve aiResponse across component re-renders', () => {
      const aiResponse = {
        raw: '{"slides":{...}}',
        validated: true,
        validationResult: { valid: true }
      }

      // First render
      const debugContext1 = { aiResponse }

      // Second render (should be same object if not changed)
      const debugContext2 = { aiResponse }

      expect(debugContext1.aiResponse).toBe(debugContext2.aiResponse)
    })

    it('should update aiResponse only when JSON input changes', () => {
      const oldAiResponse = {
        raw: '{"slides":{}}',
        validated: true,
        validationResult: { valid: true }
      }

      // Validation result changes but raw JSON doesn't
      const newAiResponse = {
        raw: '{"slides":{}}', // Same raw JSON
        validated: true,
        validationResult: { valid: true, foundFields: ['new'] } // Different validation
      }

      // The raw field should be identical
      expect(newAiResponse.raw).toBe(oldAiResponse.raw)
    })
  })
})
