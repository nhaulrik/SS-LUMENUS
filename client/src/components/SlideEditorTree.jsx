import { useState } from 'react'
import styles from './SlideEditorTree.module.css'

/**
 * SlideEditorTree
 *
 * Navigation tree showing all exports and their slides.
 * Supports expand/collapse, slide selection, and batch checkboxes.
 */
export default function SlideEditorTree({
  exports,
  openSlide,
  selectedSlides,
  onSelectSlide,
  onToggleSlideSelection,
  isDirty,
}) {
  const [expandedExports, setExpandedExports] = useState(new Set())

  const toggleExport = (exportId) => {
    setExpandedExports((prev) => {
      const next = new Set(prev)
      if (next.has(exportId)) next.delete(exportId)
      else next.add(exportId)
      return next
    })
  }

  if (exports.length === 0) {
    return (
      <div className={styles.tree}>
        <div className={styles.emptyState}>
          <p>No exports available.</p>
          <p className={styles.hint}>Create an export in the Publish tab first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tree}>
      {exports.map((exp) => {
        const isExpanded = expandedExports.has(exp.exportId)
        const slides = exp.slides || []

        return (
          <div key={`${exp.flowId}::${exp.exportId}`} className={styles.exportNode}>
            <div className={styles.exportHeader}>
              <button
                className={styles.expandButton}
                onClick={() => toggleExport(exp.exportId)}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
              <div className={styles.exportInfo}>
                <div className={styles.exportTitle}>
                  Export #{exp.exportNumber}
                </div>
                <div className={styles.exportMeta}>
                  {exp.flowName} • {slides.length} slide{slides.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.slidesList}>
                {slides.map((slide, idx) => {
                  const slideFile = slide.file || `slide-${idx + 1}.html`
                  const slideKey = `${exp.flowId}::${exp.exportId}::${slideFile}`
                  const isOpen =
                    openSlide &&
                    openSlide.flowId === exp.flowId &&
                    openSlide.exportId === exp.exportId &&
                    openSlide.slideFile === slideFile
                  const isSelected = selectedSlides.has(slideKey)

                  return (
                    <div
                      key={slideKey}
                      className={`${styles.slideRow}${isOpen ? ` ${styles.active}` : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isSelected}
                        onChange={() =>
                          onToggleSlideSelection(exp.flowId, exp.exportId, slideFile)
                        }
                        aria-label={`Select ${slide.title || slideFile}`}
                      />
                      <button
                        className={styles.slideButton}
                        onClick={() =>
                          onSelectSlide(exp.flowId, exp.exportId, slideFile, idx)
                        }
                      >
                        <span className={styles.slideTitle}>
                          {slide.title || `Slide ${idx + 1}`}
                        </span>
                        {isDirty && isOpen && (
                          <span className={styles.dirtyIndicator} title="Unsaved changes">
                            ●
                          </span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
