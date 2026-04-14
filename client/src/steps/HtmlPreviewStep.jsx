/**
 * HtmlPreviewStep — Stage 3 of the HTML Visual Flow.
 *
 * Shows a live preview of the patched HTML output and provides
 * download + "start new project" actions.
 */

import { useCallback } from 'react'
import AppHeader   from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'

export default function HtmlPreviewStep({
  project,      // { chainId, projectName, zones }
  applied,      // { outputFile, previewHtml, roundId }
  step,
  canNavigateTo,
  navigateTo,
  onBack,       // () => void — back to recipe step
  onStartNew,   // () => void — back to flow selector
  setToast,
  debugContext,
}) {
  const { chainId, projectName } = project
  const { outputFile, previewHtml } = applied

  const handleDownload = useCallback(() => {
    const url = `/api/html-flow/download/${chainId}/${outputFile}`
    const a   = document.createElement('a')
    a.href     = url
    a.download = outputFile
    a.click()
  }, [chainId, outputFile])

  return (
    <div className="app">
      <AppHeader
        title={projectName}
        subtitle="Content applied — review and download"
        debugContext={debugContext}
      />
      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} flow="html" />

      <div className="html-preview-step-layout">
        {/* ── Preview ─────────────────────────────────────────────── */}
        <div className="html-preview-step-frame-wrap">
          <iframe
            className="html-preview-step-frame"
            srcDoc={previewHtml}
            sandbox="allow-same-origin"
            title="Output preview"
          />
        </div>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <div className="html-preview-step-actions">
          <button className="btn btn-link" onClick={onBack}>
            ← Back to recipe
          </button>
          <div className="html-preview-step-right-actions">
            <button className="btn btn-secondary" onClick={handleDownload}>
              Download HTML
            </button>
            <button className="btn btn-primary" onClick={onStartNew}>
              Start new project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
