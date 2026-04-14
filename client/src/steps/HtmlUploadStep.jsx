import { useState, useRef, useCallback, useEffect } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import { lazy, Suspense } from 'react'
const HtmlEditorPanel = lazy(() => import('../components/HtmlEditorPanel.jsx'))
import { mergeZoneEdits } from '../utils/mergeZoneEdits.js'

const TYPE_LABELS   = { text: 'Text', number: 'Number', chart: 'Chart', image: 'Image', repeatable: 'Repeatable Block' }
const TYPE_OPTIONS  = ['text', 'number', 'chart', 'image', 'repeatable']

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a zone key to a valid snake_case identifier as the user types. */
function sanitizeKey(raw) {
  return raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

// ── ZoneRow ───────────────────────────────────────────────────────────────────

function ZoneRow({ zone, onChange, onRemove, highlighted, onMouseEnter, onMouseLeave }) {
  const [expanded,  setExpanded]  = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const [keyDraft,   setKeyDraft]   = useState(zone.key)
  const keyInputRef = useRef(null)

  // Keep draft in sync if parent changes the key externally
  useEffect(() => { if (!editingKey) setKeyDraft(zone.key) }, [zone.key, editingKey])

  const commitKey = () => {
    const cleaned = sanitizeKey(keyDraft).trim()
    const final   = cleaned || zone.key // don't allow empty
    setKeyDraft(final)
    setEditingKey(false)
    if (final !== zone.key) onChange({ ...zone, key: final })
  }

  return (
    <div
      className={`zone-row${highlighted ? ' zone-row--highlighted' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="zone-row-main">
        <div className="zone-row-key">

          {/* ── Editable key badge ─────────────────────────────── */}
          {editingKey ? (
            <input
              ref={keyInputRef}
              className="zone-key-input"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onBlur={commitKey}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitKey() }
                if (e.key === 'Escape') { setKeyDraft(zone.key); setEditingKey(false) }
              }}
              spellCheck={false}
              autoFocus
            />
          ) : (
            <code
              className="zone-key-badge zone-key-badge--editable"
              title="Click to edit zone ID"
              onClick={() => { setEditingKey(true); setTimeout(() => keyInputRef.current?.select(), 0) }}
            >
              {zone.key}
              <span className="zone-key-edit-icon">✎</span>
            </code>
          )}

          <span className="zone-slide-label">Slide {zone.slideIndex}</span>
          {zone.isRepeatable && <span className="zone-tag zone-tag--repeatable">Repeatable</span>}
          {zone.repeatableKey && <span className="zone-tag zone-tag--child">inside {zone.repeatableKey}</span>}
        </div>

        <div className="zone-row-controls">
          <select
            className="zone-type-select"
            value={zone.type}
            onChange={e => onChange({ ...zone, type: e.target.value })}
          >
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>

          <label className="zone-auto-toggle" title="AI generates this value">
            <input
              type="checkbox"
              checked={zone.autoGenerate}
              onChange={e => onChange({ ...zone, autoGenerate: e.target.checked })}
            />
            <span>AI</span>
          </label>

          <button className="zone-expand-btn" onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Edit hint'}>
            {expanded ? '▲' : '▼'}
          </button>

          <button className="zone-remove-btn" onClick={onRemove} title="Exclude this zone from the recipe">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="zone-row-detail">
          <label className="zone-hint-label">
            Hint
            <span className="zone-hint-sub">Shown to the AI as guidance for what content belongs here</span>
          </label>
          <input
            className="zone-hint-input"
            type="text"
            value={zone.hint}
            maxLength={120}
            onChange={e => onChange({ ...zone, hint: e.target.value })}
            placeholder="Describe what content goes in this zone…"
          />
          {zone.originalText && (
            <p className="zone-original-text">
              Original text: <em>{zone.originalText.slice(0, 80)}{zone.originalText.length > 80 ? '…' : ''}</em>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── HtmlUploadStep ────────────────────────────────────────────────────────────

export default function HtmlUploadStep({ stepAnimClass, debugContext, onProjectCreated, onBack, setToast }) {
  const fileInputRef = useRef(null)
  const wrapperRef   = useRef(null)

  // Preview scale (driven by ResizeObserver)
  const [previewScale, setPreviewScale] = useState(0.46)

  // Hover cross-highlight: stores the zone key currently highlighted
  const [highlightedKey, setHighlightedKey] = useState(null)

  // Stage A: file selection
  const [fileName,   setFileName]   = useState('')
  const [uploading,  setUploading]  = useState(false)

  // Stage B: zone review
  const [templateId,  setTemplateId]  = useState(null)
  const [slideCount,  setSlideCount]  = useState(0)
  const [zones,       setZones]       = useState([])
  const [previewHtml, setPreviewHtml] = useState('')
  const [violations,  setViolations]  = useState([])

  // Stage C: create project
  const [creating,    setCreating]    = useState(false)
  const [projectName, setProjectName] = useState('')

  // Editor (opt-in)
  const [rawHtml,    setRawHtml]    = useState('')   // committed HTML text for the editor
  const [editorOpen, setEditorOpen] = useState(false)

  // ── Responsive preview scale ──────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => { const w = el.getBoundingClientRect().width; if (w > 0) setPreviewScale(w / 1280) }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [previewHtml])

  // ── postMessage listener: preview → list highlight ───────────────────────
  // The sandboxed iframe posts { type:'zone-hover', key } messages when the
  // user hovers a [data-zone] element. We update highlightedKey from here so
  // both directions (list→preview and preview→list) share the same state.
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'zone-hover') {
        setHighlightedKey(e.data.key || null)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setToast({ message: 'Please upload an .html file', type: 'error' }); return
    }
    setFileName(file.name); setUploading(true); setViolations([])
    setTemplateId(null); setZones([]); setPreviewHtml('')
    try {
      const html = await file.text()
      const res  = await fetch('/api/html-flow/upload-template', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, fileName: file.name })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        if (data.violations?.length) setViolations(data.violations)
        else setToast({ message: data.error || 'Upload failed', type: 'error' })
        return
      }
      setTemplateId(data.templateId); setSlideCount(data.slideCount)
      setZones(data.zones.map(z => ({ ...z, htmlKey: z.key }))); setPreviewHtml(data.previewHtml)
      setRawHtml(html)
      setProjectName(file.name.replace(/\.html?$/, ''))
    } catch (err) {
      setToast({ message: 'Upload error: ' + err.message, type: 'error' })
    } finally {
      setUploading(false)
    }
  }, [setToast])

  const handleDrop        = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer?.files?.[0]) }, [handleFile])
  const handleInputChange = useCallback((e) => { handleFile(e.target.files?.[0]) }, [handleFile])

  // ── Zone editing ──────────────────────────────────────────────────────────
  const handleZoneChange = useCallback((idx, updated) => setZones(prev => prev.map((z, i) => i === idx ? updated : z)), [])
  const handleZoneRemove = useCallback((idx) => setZones(prev => prev.filter((_, i) => i !== idx)), [])

  // ── Save zones + create project ───────────────────────────────────────────
  const handleSaveZones = useCallback(async () => {
    if (!templateId) return
    try {
      await fetch('/api/html-flow/update-zones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, zones })
      })
    } catch { /* best-effort */ }
  }, [templateId, zones])

  const handleCreateProject = useCallback(async () => {
    if (!templateId) return
    setCreating(true)
    try {
      await handleSaveZones()
      const res  = await fetch('/api/html-flow/create-project', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, zones, projectName })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create project')
      onProjectCreated({ chainId: data.chainId, projectName: data.projectName, zones: data.zones, templatePath: data.templatePath })
    } catch (err) {
      setToast({ message: 'Create project failed: ' + err.message, type: 'error' })
    } finally {
      setCreating(false)
    }
  }, [templateId, zones, projectName, handleSaveZones, onProjectCreated, setToast])

  // ── Editor apply ───────────────────────────────────────────────
  const handleEditorApply = useCallback((newHtml, newZones) => {
    setRawHtml(newHtml)
    setPreviewHtml(newHtml)
    setZones(newZones)
    setEditorOpen(false)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const zonesBySlide = zones.reduce((acc, z) => { (acc[z.slideIndex] ??= []).push(z); return acc }, {})
  const canProceed   = templateId && zones.length > 0 && projectName.trim().length > 0

  // Build a map from zone key → bounding box selector for preview highlighting.
  // The previewHtml is rendered in a sandboxed iframe so we can't query its DOM
  // directly. Instead we inject a <style> block into previewHtml that uses the
  // data-zone attribute to highlight the hovered element.
  // Always inject into the iframe:
  //   1. A <script> that posts zone key on mouseover/mouseout to the parent
  //      (preview → list direction). Requires sandbox="allow-scripts".
  //   2. A <style> that highlights the currently hovered zone key
  //      (list → preview direction, driven by highlightedKey state).
  const highlightedPreviewHtml = !previewHtml ? '' : (() => {
    const highlightCss = highlightedKey ? `
[data-zone="${highlightedKey}"] {
  outline: 3px solid #4CAF80 !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px #4CAF80, 0 4px 12px rgba(115,170,135,0.4) !important;
  background: rgba(115,170,135,0.2) !important;
  position: relative !important;
  z-index: 9999 !important;
}` : ''

    const injection = `<style>
[data-zone] { cursor: pointer; }
${highlightCss}
</style>
<script>
(function() {
  function notify(key) {
    window.parent.postMessage({ type: 'zone-hover', key: key }, '*');
  }
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest('[data-zone]');
    notify(el ? el.getAttribute('data-zone') : null);
  });
  document.addEventListener('mouseout', function(e) {
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-zone]')) {
      notify(null);
    }
  });
})();
</script>`

    return previewHtml.includes('</head>')
      ? previewHtml.replace('</head>', injection + '</head>')
      : injection + previewHtml
  })()

  // ── Editor overlay (opt-in) ───────────────────────────────────────────────
  if (editorOpen && rawHtml) {
    return (
      <Suspense fallback={<div className="html-editor-overlay" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)'}}>Loading editor?</div>}>
        <HtmlEditorPanel
          uploadedHtml={rawHtml}
          zones={zones}
          onApply={handleEditorApply}
          onClose={() => setEditorOpen(false)}
        />
      </Suspense>
    )
  }

  return (
    <div className="app">
      <AppHeader title="Solon Slide Studio" subtitle="Visual Flow — Upload HTML Template" debugContext={debugContext} />

      <div className="html-upload-back">
        <button className="btn btn-link" onClick={onBack}>← Change flow</button>
        <div className="html-upload-breadcrumb">
          <span className="breadcrumb-item active"><span className="breadcrumb-number">1</span>Upload Template</span>
          <span className="breadcrumb-divider">›</span>
          <span className="breadcrumb-item"><span className="breadcrumb-number">2</span>Review Zones</span>
          <span className="breadcrumb-divider">›</span>
          <span className="breadcrumb-item"><span className="breadcrumb-number">3</span>Generate Content</span>
        </div>
      </div>

      <div className={stepAnimClass}>
        <div className="html-upload-layout">

          {/* ── Left: upload + zone list ──────────────────────────── */}
          <div className="html-upload-left">

            {/* Upload zone */}
            {!templateId ? (
              <div
                className={`upload-zone html-upload-zone${uploading ? ' upload-zone--loading' : ''}`}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input ref={fileInputRef} type="file" accept=".html,.htm" style={{ display: 'none' }} onChange={handleInputChange} />
                {uploading ? (
                  <><div className="upload-spinner" /><p>Parsing {fileName}…</p></>
                ) : (
                  <>
                    <div className="html-upload-icon">
                      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 40V8h22l10 10v22H8z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4"/>
                        <path d="M30 8v10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16 24l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 20v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="upload-zone-primary">Drop your HTML file here</p>
                    <p className="upload-zone-secondary">or click to browse — .html files only</p>
                  </>
                )}
              </div>
            ) : (
              <div className="html-file-loaded">
                <div className="html-file-loaded-info">
                  <span className="html-file-icon">📄</span>
                  <div>
                    <p className="html-file-name">{fileName}</p>
                    <p className="html-file-meta">{slideCount} slide{slideCount !== 1 ? 's' : ''} · {zones.length} zone{zones.length !== 1 ? 's' : ''} detected</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditorOpen(true)}
                    title="Open HTML editor to tweak layout and content"
                  >
                    ✎ Edit HTML
                  </button>
                  <button className="btn btn-link" onClick={() => { setTemplateId(null); setZones([]); setPreviewHtml(''); setRawHtml(''); setFileName(''); setViolations([]) }}>
                    Replace file
                  </button>
                </div>
              </div>
            )}

            {/* Validation errors */}
            {violations.length > 0 && (
              <div className="html-violations">
                <p className="html-violations-title">Template issues found:</p>
                <ul>
                  {violations.map((v, i) => (
                    <li key={i} className="html-violation-item">
                      <span className="html-violation-rule">{v.rule}</span>
                      {v.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Zone list */}
            {templateId && (
              <div className="zone-list-section">
                <div className="zone-list-header">
                  <h3>Content Zones</h3>
                  <p className="zone-list-sub">
                    Click a zone ID to rename it. Hover a row to highlight it in the preview.
                    Click ▼ to edit the AI hint. Remove zones you do not want the AI to fill.
                  </p>
                </div>

                {Object.entries(zonesBySlide).map(([slideIdx, slideZones]) => (
                  <div key={slideIdx} className="zone-slide-group">
                    <div className="zone-slide-label-header">Slide {slideIdx}</div>
                    {slideZones.map((zone) => {
                      const globalIdx = zones.indexOf(zone)
                      return (
                        <ZoneRow
                          key={zone.key + '-' + slideIdx + '-' + globalIdx}
                          zone={zone}
                          highlighted={highlightedKey === zone.key}
                          onMouseEnter={() => setHighlightedKey(zone.key)}
                          onMouseLeave={() => setHighlightedKey(null)}
                          onChange={updated => handleZoneChange(globalIdx, updated)}
                          onRemove={() => handleZoneRemove(globalIdx)}
                        />
                      )
                    })}
                  </div>
                ))}

                {zones.length === 0 && (
                  <p className="zone-list-empty">All zones removed. Add data-zone attributes to your HTML and re-upload.</p>
                )}

                <div className="html-project-footer">
                  <div className="form-group">
                    <label className="form-label">Project name</label>
                    <input className="form-input" type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="my-presentation" />
                  </div>
                  <button className="btn btn-primary" disabled={!canProceed || creating} onClick={handleCreateProject}>
                    {creating ? 'Creating…' : 'Create Project →'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: slide preview ──────────────────────────────── */}
          {previewHtml && (
            <div className="html-preview-panel" ref={wrapperRef}>
              <div className="html-preview-label">
                Slide 1 preview
                {highlightedKey && <span className="html-preview-highlight-label">· highlighting <code>{highlightedKey}</code></span>}
              </div>
              <div
                className="html-preview-frame-wrapper"
                style={{ height: Math.round(1280 * 0.5625 * previewScale) + 'px' }}
              >
                <iframe
                  className="html-preview-frame"
                  srcDoc={highlightedPreviewHtml}
                  sandbox="allow-same-origin allow-scripts"
                  title="Slide preview"
                  style={{ transform: `scale(${previewScale})` }}
                />
              </div>
              <p className="html-preview-note">
                Hover a zone row to highlight it here. Click a zone ID to rename it.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
