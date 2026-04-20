/**
 * HtmlMetadataStep — Stage 4 of the HTML Visual Flow.
 *
 * Assign per-slide metadata (name), export slides with metadata,
 * and finish back to the project dashboard.
 */

import { useState, useCallback, useEffect } from 'react'
import AppHeader   from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'

export default function HtmlMetadataStep({
  projectName,
  flowId,
  applied,        // { outputFile, previewHtml, roundId, slideCount }
  slideNames,     // [{ index, name, keyMissing }, ...]
  step,
  canNavigateTo,
  navigateTo,
  onBack,
  onFinish,
  setToast,
  debugContext,
}) {
  const { outputFile, roundId, slideCount = 1 } = applied

  const [exportName, setExportName] = useState('')

  const [metadata, setMetadata] = useState(
    Array.from({ length: slideCount }, (_, i) => ({
      name: `Slide ${i + 1}`,
      keyMissing: false,
    }))
  )

  const [isExporting, setIsExporting] = useState(false)

  // Pre-fill metadata from slideNames prop
  useEffect(() => {
    if (slideNames?.length) {
      setMetadata(
        Array.from({ length: slideCount }, (_, i) => {
          const found = slideNames.find(s => s.index === i + 1)
          return {
            name: found?.name ?? `Slide ${i + 1}`,
            keyMissing: found?.keyMissing ?? false,
          }
        })
      )
    }
  }, [slideNames, slideCount])

  const handleMetadataChange = useCallback((index, value) => {
    setMetadata(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], name: value }
      return updated
    })
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const slideMetadata = metadata.map((m, i) => ({
        slideId: `slide-${i + 1}`,
        name: m.name,
        type: 'content',
      }))

      const res = await fetch(`/api/projects/${projectName}/flows/${flowId}/exports`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ 
          roundId, 
          outputFile, 
          exportName: exportName.trim(),
          slideMetadata 
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Export failed')
      setToast({ type: 'success', message: `Exported ${data.slideCount} slide${data.slideCount !== 1 ? 's' : ''}` })
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setIsExporting(false)
    }
  }, [projectName, flowId, roundId, outputFile, metadata, exportName, setToast])



  return (
    <div className="app">
      <AppHeader
        title={projectName}
        subtitle="Assign slide metadata and export"
        debugContext={debugContext}
      />
      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} flow="html" />

      <div className="html-metadata-panel">
        {/* Export Name Field */}
        <div className="html-metadata-export-name">
          <label htmlFor="export-name">Export Name</label>
          <input
            id="export-name"
            type="text"
            value={exportName}
            onChange={e => setExportName(e.target.value)}
            placeholder="e.g., Q2 Product Launch"
            disabled={isExporting}
          />
        </div>

        {/* Slide List */}
        <div className="html-metadata-slide-list">
          {metadata.map((slide, i) => (
            <div key={i} className="html-metadata-slide-row">
              <span className="html-metadata-index">{i + 1}</span>
              <input
                className="html-metadata-input"
                value={slide.name}
                onChange={e => handleMetadataChange(i, e.target.value)}
                placeholder={`Slide ${i + 1}`}
                disabled={isExporting}
              />
              {slide.keyMissing && (
                <span
                  className="html-metadata-warning"
                  title="Key element not found — name was auto-generated"
                >
                  ⚠
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="html-metadata-actions">
          <button className="btn btn-link" onClick={onBack}>
            <span aria-hidden="true">←</span> Back
          </button>
          <div className="html-metadata-right-actions">
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={isExporting || exportName.trim() === ''}
              data-testid="btn-export-slides"
            >
              {isExporting ? 'Packaging…' : 'Package'}
            </button>
            <button
              className="btn btn-primary"
              onClick={onFinish}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
