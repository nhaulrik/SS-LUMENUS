import { useRef } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'

export default function UploadStep({
  templateFile,
  stepAnimClass,
  step,
  canNavigateTo,
  navigateTo,
  handleFileUpload,
  debugContext,
  onBack,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className="app">
      <AppHeader
        title="Solon Slide Studio"
        subtitle="PowerPoint Native — Upload your PPTX template"
        debugContext={debugContext}
      />

      {onBack && (
        <div className="html-upload-back">
          <button className="btn btn-link" onClick={onBack}>
            ← Change flow
          </button>
        </div>
      )}

      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} />

      <div className={stepAnimClass}>
        <div
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFileUpload(e) }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <p>Drop your PPTX here</p>
          <p>or click to browse</p>
        </div>

        {templateFile && (
          <div className="actions" style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => navigateTo('tag')}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
