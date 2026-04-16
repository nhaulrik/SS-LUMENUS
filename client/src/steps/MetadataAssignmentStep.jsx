/**
 * MetadataAssignmentStep — Stage 4 of the HTML Visual Flow.
 *
 * Allows users to assign metadata (slideId, name, type) to each slide
 * with a live preview of the selected slide.
 *
 * Features:
 * - Interactive table for metadata assignment
 * - Live preview of hovered/selected slide
 * - Direct inline editing of metadata
 * - Full validation before save
 * - Keyboard navigation support
 */

import { useCallback, useState, useMemo } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import MetadataTable from '../components/MetadataTable.jsx'
import SlideCarousel from '../components/SlideCarousel.jsx'
import { generateMultiSlidePreviewHtmlArray } from '../utils/slidePreview.js'

export default function MetadataAssignmentStep({
  project,      // { chainId, projectName, zones }
  applied,      // { outputFile, previewHtml, roundId, slideCount }
  step,
  canNavigateTo,
  navigateTo,
  onBack,       // () => void — back to preview step
  onNext,       // (metadata) => void — save metadata and proceed
  setToast,
  debugContext,
}) {
  const { projectName } = project
  const { previewHtml, slideCount = 1 } = applied

  // ── Metadata state ────────────────────────────────────────────────────────
  const [metadata, setMetadata] = useState(
    Array.from({ length: slideCount }, (_, i) => ({
      slideId: `slide-${i + 1}`,
      name: `Slide ${i + 1}`,
      type: 'content',
    }))
  )

  // ── Preview state ─────────────────────────────────────────────────────────
  const [hoveredSlideIndex, setHoveredSlideIndex] = useState(0)
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)

  // ── Errors state ──────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({})

  // ── Validation ────────────────────────────────────────────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMetadataChange = useCallback((slideIndex, field, value) => {
    const updated = [...metadata]
    updated[slideIndex] = {
      ...updated[slideIndex],
      [field]: value,
    }
    setMetadata(updated)

    // Clear error for this field when user edits
    setErrors((prev) => {
      const newErrors = { ...prev }
      if (newErrors[slideIndex]) {
        delete newErrors[slideIndex][field]
        if (Object.keys(newErrors[slideIndex]).length === 0) {
          delete newErrors[slideIndex]
        }
      }
      return newErrors
    })
  }, [metadata])

  const handleRowHover = useCallback((slideIndex) => {
    setHoveredSlideIndex(slideIndex)
  }, [])

  const handleRowClick = useCallback((slideIndex) => {
    setSelectedSlideIndex(slideIndex)
  }, [])

  const handleNext = useCallback(async () => {
    // Validate all metadata
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
      setErrors(allErrors)
      setToast({
        type: 'error',
        message: 'Please fix validation errors before proceeding',
      })
      return
    }

    // All valid, proceed to save
    try {
      await onNext(metadata)
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    }
  }, [metadata, validateMetadata, onNext, setToast])

  // ── Create scaled preview HTML for each slide ────────────────────────────────
  // We generate carousel item previews using the shared utility function.
  // For carousel items, we use a fixed scale (not responsive) to prevent
  // flickering as the carousel scrolls.
  const carouselItemPreviews = useMemo(() => {
    const carouselScale = 0.1796875  // 230px / 1280px width (15% larger)
    return generateMultiSlidePreviewHtmlArray(previewHtml, slideCount, carouselScale)
  }, [previewHtml, slideCount])

  return (
    <div className="app">
      <AppHeader
        title={projectName}
        subtitle="Assign metadata to each slide"
        debugContext={debugContext}
      />
      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} flow="html" />

      <div className="metadata-assignment-step-layout">
        {/* ── Top: Carousel Preview ────────────────────────────────────────── */}
        <div className="metadata-assignment-carousel-panel">
          <SlideCarousel
            slides={carouselItemPreviews}
            selectedSlideIndex={selectedSlideIndex}
            hoveredSlideIndex={hoveredSlideIndex}
            onSlideSelect={handleRowClick}
            onSlideHover={handleRowHover}
          />
        </div>

        {/* ── Bottom: Metadata Table ───────────────────────────────────────── */}
        <div className="metadata-assignment-table-panel">
          <MetadataTable
            metadata={metadata}
            errors={errors}
            selectedSlideIndex={selectedSlideIndex}
            hoveredSlideIndex={hoveredSlideIndex}
            onMetadataChange={handleMetadataChange}
            onRowHover={handleRowHover}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="metadata-assignment-actions">
        <button className="btn btn-link" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to preview
        </button>
        <div className="metadata-assignment-right-actions">
          <button
            className="btn btn-primary"
            onClick={handleNext}
            data-testid="btn-assign-metadata-next"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
