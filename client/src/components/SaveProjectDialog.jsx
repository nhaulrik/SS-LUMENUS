/**
 * SaveProjectDialog — Dialog for entering a project name before saving.
 *
 * Features:
 * - Text input for project name
 * - Input validation (required, max 100 chars)
 * - Error messages
 * - Loading state while saving
 * - Keyboard support (Enter to confirm, Escape to cancel)
 * - Accessible (labels, ARIA, etc.)
 */

import { useState, useCallback } from 'react'

export default function SaveProjectDialog({
  defaultName,
  onConfirm,
  onCancel,
}) {
  const [name, setName] = useState(defaultName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleConfirm = useCallback(async () => {
    setError(null)
    
    if (!name.trim()) {
      setError('Please enter a project name')
      return
    }

    if (name.trim().length > 100) {
      setError('Project name must be 100 characters or less')
      return
    }

    setLoading(true)
    await onConfirm(name.trim())
    setLoading(false)
  }, [name, onConfirm])

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !loading) {
      handleConfirm()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [handleConfirm, loading, onCancel])

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Save Project</h2>
        </div>
        
        <div className="dialog-body">
          <label htmlFor="projectName">Project Name</label>
          <input
            id="projectName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Car Manufacturers"
            disabled={loading}
            autoFocus
          />
          <small>This will be the folder name for your project</small>
          
          {error && (
            <div className="dialog-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="dialog-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
