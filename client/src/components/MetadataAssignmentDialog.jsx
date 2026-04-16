/**
 * MetadataAssignmentDialog — Dialog for assigning metadata to individual slides.
 *
 * Features:
 * - Multi-step form for slide-by-slide metadata assignment
 * - Fields: slideId, name, type
 * - Input validation
 * - Navigation between slides
 * - Summary view before final save
 * - Loading state while saving
 */

import { useState, useCallback, useMemo } from 'react'
import MetadataForm from './MetadataForm.jsx'

export default function MetadataAssignmentDialog({
  slideCount,
  defaultMetadata,
  onConfirm,
  onCancel,
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [metadata, setMetadata] = useState(
    defaultMetadata || Array.from({ length: slideCount }, (_, i) => ({
      slideId: `slide-${i + 1}`,
      name: `Slide ${i + 1}`,
      type: 'content',
    }))
  )
  const [loading, setLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [errors, setErrors] = useState({})

  const currentSlide = metadata[currentSlideIndex]
  const slideNumber = currentSlideIndex + 1

  const validateMetadata = useCallback((meta) => {
    const newErrors = {}

    if (!meta.slideId || !meta.slideId.trim()) {
      newErrors.slideId = 'Slide ID is required'
    } else if (!/^[\w-]+$/.test(meta.slideId)) {
      newErrors.slideId = 'Slide ID can only contain letters, numbers, hyphens, and underscores'
    } else if (meta.slideId.length > 50) {
      newErrors.slideId = 'Slide ID must be 50 characters or less'
    }

    if (!meta.name || !meta.name.trim()) {
      newErrors.name = 'Slide name is required'
    } else if (meta.name.length > 100) {
      newErrors.name = 'Slide name must be 100 characters or less'
    }

    if (!meta.type || !meta.type.trim()) {
      newErrors.type = 'Slide type is required'
    } else if (!['content', 'title', 'conclusion', 'other'].includes(meta.type)) {
      newErrors.type = 'Invalid slide type'
    }

    return newErrors
  }, [])

  const handleMetadataChange = useCallback((field, value) => {
    const updated = [...metadata]
    updated[currentSlideIndex] = {
      ...updated[currentSlideIndex],
      [field]: value,
    }
    setMetadata(updated)
    // Clear error for this field when user starts editing
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [currentSlideIndex, metadata])

  const handleNext = useCallback(() => {
    const newErrors = validateMetadata(currentSlide)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (currentSlideIndex < slideCount - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
      setErrors({})
    } else {
      // All slides validated, show summary
      setShowSummary(true)
    }
  }, [currentSlideIndex, slideCount, currentSlide, validateMetadata])

  const handlePrevious = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
      setErrors({})
    }
  }, [currentSlideIndex])

  const handleConfirmSave = useCallback(async () => {
    // Validate all metadata before saving
    let hasErrors = false
    const allErrors = {}

    for (let i = 0; i < metadata.length; i++) {
      const errs = validateMetadata(metadata[i])
      if (Object.keys(errs).length > 0) {
        hasErrors = true
        allErrors[i] = errs
      }
    }

    if (hasErrors) {
      setErrors(allErrors[currentSlideIndex] || {})
      return
    }

    setLoading(true)
    try {
      await onConfirm(metadata)
    } finally {
      setLoading(false)
    }
  }, [metadata, currentSlideIndex, validateMetadata, onConfirm])

  const progressPercentage = ((currentSlideIndex + 1) / slideCount) * 100

  if (showSummary) {
    return (
      <div className="dialog-overlay" onClick={onCancel}>
        <div className="dialog dialog-large" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-header">
            <h2>Review Metadata</h2>
            <p className="dialog-subtitle">Please review the metadata for all slides</p>
          </div>

          <div className="dialog-body">
            <div className="metadata-summary">
              {metadata.map((meta, idx) => (
                <div key={idx} className="metadata-summary-item">
                  <div className="metadata-summary-header">
                    <span className="metadata-summary-slide">Slide {idx + 1}</span>
                    <button
                      className="btn btn-link btn-small"
                      onClick={() => {
                        setCurrentSlideIndex(idx)
                        setShowSummary(false)
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="metadata-summary-content">
                    <div className="metadata-summary-row">
                      <span className="metadata-summary-label">ID:</span>
                      <span className="metadata-summary-value">{meta.slideId}</span>
                    </div>
                    <div className="metadata-summary-row">
                      <span className="metadata-summary-label">Name:</span>
                      <span className="metadata-summary-value">{meta.name}</span>
                    </div>
                    <div className="metadata-summary-row">
                      <span className="metadata-summary-label">Type:</span>
                      <span className="metadata-summary-value">{meta.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dialog-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowSummary(false)}
              disabled={loading}
            >
              Back to Editing
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save with Metadata'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Assign Metadata</h2>
          <p className="dialog-subtitle">
            Slide {slideNumber} of {slideCount}
          </p>
        </div>

        <div className="dialog-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="dialog-body">
          <MetadataForm
            slide={currentSlide}
            slideNumber={slideNumber}
            onChange={handleMetadataChange}
            errors={errors}
          />
        </div>

        <div className="dialog-actions">
          <button
            className="btn btn-secondary"
            onClick={handlePrevious}
            disabled={currentSlideIndex === 0 || loading}
          >
            Previous
          </button>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading}
          >
            {currentSlideIndex === slideCount - 1 ? 'Review' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
