import { useState } from 'react'
import styles from './SlideEditorTree.module.css'

export default function SlideEditorTree({
  exports,
  openSlide,
  selectedSlides,
  onSelectSlide,
  onToggleSlideSelection,
  isDirty,
  onRenameSlide = () => {},
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
                <div className={styles.exportTitle}>Export #{exp.exportNumber}</div>
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
                  const originalTitle = slide.title || `Slide ${idx + 1}`

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
                        aria-label={`Select ${originalTitle}`}
                      />

                      <button
                        className={styles.slideOpen}
                        onClick={() => onSelectSlide(exp.flowId, exp.exportId, slideFile, idx)}
                        title="Open slide"
                      >
                        ▷
                      </button>

                      <input
                        key={originalTitle}
                        type="text"
                        className={`${styles.titleInput}${isOpen ? ` ${styles.titleInputActive}` : ''}`}
                        defaultValue={originalTitle}
                        onBlur={(e) => {
                          const newTitle = e.target.value.trim()
                          if (newTitle && newTitle !== originalTitle) {
                            onRenameSlide(exp.flowId, exp.exportId, slideFile, newTitle)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur()
                          if (e.key === 'Escape') {
                            e.target.value = originalTitle
                            e.target.blur()
                          }
                        }}
                      />

                      {isDirty && isOpen && (
                        <span className={styles.dirtyIndicator} title="Unsaved changes">
                          ●
                        </span>
                      )}
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
