import { useState, useMemo } from 'react'
import styles from './ExportCatalog.module.css'

export default function ExportCatalog({ exports, loading, activeSlides, onAddSlides }) {
  const [expandedExports, setExpandedExports] = useState(new Set())
  const [selectedKeys, setSelectedKeys] = useState(new Set()) // "flowId::exportId::slideIndex"

  const activeSlideKeys = useMemo(() => {
    return new Set(activeSlides.map(s => `${s.flowId}::${s.exportId}::${s.slideIndex}`))
  }, [activeSlides])

  const toggleExport = (exportId) => {
    setExpandedExports(prev => {
      const next = new Set(prev)
      if (next.has(exportId)) next.delete(exportId)
      else next.add(exportId)
      return next
    })
  }

  const toggleSlide = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllInExport = (exp) => {
    const keys = exp.slides.map(s => `${exp.flowId}::${exp.exportId}::${s.slideIndex}`)
    const allSelected = keys.every(k => selectedKeys.has(k))
    setSelectedKeys(prev => {
      const next = new Set(prev)
      if (allSelected) keys.forEach(k => next.delete(k))
      else keys.forEach(k => next.add(k))
      return next
    })
  }

  const handleAddToTree = () => {
    if (selectedKeys.size === 0) return
    const slidesToAdd = []
    for (const key of selectedKeys) {
      const [flowId, exportId, slideIndexStr] = key.split('::')
      const slideIndex = parseInt(slideIndexStr, 10)
      const exp = exports.find(e => e.flowId === flowId && e.exportId === exportId)
      const slide = exp?.slides.find(s => s.slideIndex === slideIndex)
      if (slide && exp) {
        slidesToAdd.push({
          id: `sr-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`,
          flowId,
          exportId,
          slideIndex,
          title: slide.title,
        })
      }
    }
    onAddSlides(slidesToAdd)
    setSelectedKeys(new Set())
  }

  if (loading) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Export Catalog</span>
        </div>
        <div className={styles.loadingState}>Loading exports…</div>
      </div>
    )
  }

  if (exports.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Export Catalog</span>
        </div>
        <div className={styles.emptyState}>
          <p>No exports found. Generate and export slides in a flow first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Export Catalog</span>
        <span className={styles.exportCount}>{exports.length} export{exports.length !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.exportList}>
        {exports.map(exp => {
          const isExpanded = expandedExports.has(exp.exportId)
          const exportSlideKeys = (exp.slides || []).map(s => `${exp.flowId}::${exp.exportId}::${s.slideIndex}`)
          const selectedInExport = exportSlideKeys.filter(k => selectedKeys.has(k)).length
          const allInExportSelected = exportSlideKeys.length > 0 && exportSlideKeys.every(k => selectedKeys.has(k))

          return (
            <div key={`${exp.flowId}::${exp.exportId}`} className={styles.exportGroup}>
              {/* Export header row */}
              <div className={styles.exportHeader}>
                <label className={styles.exportCheckboxLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allInExportSelected}
                    onChange={() => toggleAllInExport(exp)}
                    aria-label={`Select all slides in ${exp.exportId}`}
                  />
                </label>
                <button
                  className={styles.exportToggle}
                  onClick={() => toggleExport(exp.exportId)}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${exp.exportId}`}
                >
                  <span className={styles.expandIcon}>{isExpanded ? '▾' : '▸'}</span>
                  <span className={styles.exportName}>{exp.flowName}</span>
                  <span className={styles.exportMeta}>
                    {exp.exportName || exp.exportId} · {(exp.slides || []).length} slides
                    {selectedInExport > 0 && (
                      <span className={styles.selectedBadge}>{selectedInExport} selected</span>
                    )}
                  </span>
                </button>
              </div>

              {/* Slide rows */}
              {isExpanded && (
                <div className={styles.slideList}>
                  {(exp.slides || []).map(slide => {
                    const key = `${exp.flowId}::${exp.exportId}::${slide.slideIndex}`
                    const isChecked = selectedKeys.has(key)
                    const isAlreadyAdded = activeSlideKeys.has(key)
                    return (
                      <label
                        key={key}
                        className={`${styles.slideRow} ${isChecked ? styles.slideRowChecked : ''} ${isAlreadyAdded ? styles.slideRowAdded : ''}`}
                      >
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={isChecked}
                          onChange={() => toggleSlide(key)}
                          disabled={isAlreadyAdded}
                          aria-label={`Select ${slide.title}`}
                        />
                        <span className={styles.slideIndex}>{slide.slideIndex}</span>
                        <span className={styles.slideTitle}>{slide.title}</span>
                        {isAlreadyAdded && <span className={styles.addedBadge}>Added</span>}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky action bar */}
      {selectedKeys.size > 0 && (
        <div className={styles.actionBar}>
          <span className={styles.actionBarCount}>{selectedKeys.size} slide{selectedKeys.size !== 1 ? 's' : ''} selected</span>
          <div className={styles.actionBarButtons}>
            <button className={styles.clearBtn} onClick={() => setSelectedKeys(new Set())}>
              Clear
            </button>
            <button className={styles.addToTreeBtn} onClick={handleAddToTree}>
              Add to Tree →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
