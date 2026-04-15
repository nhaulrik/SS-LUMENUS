/**
 * HtmlEditorPanel — split-pane HTML editor with live preview.
 *
 * Features:
 *   - CodeMirror 6 editor with HTML + embedded CSS syntax highlighting
 *   - Resizable divider (drag to split)
 *   - Live preview debounced at 200ms (srcDoc iframe, same postMessage hover)
 *   - Zone-aware cursor sync: cursor on data-zone line → highlight in preview;
 *     click element in preview → scroll editor to that data-zone attribute
 *   - Reset to uploaded version (no server call)
 *   - Apply changes → re-parses zones via server, smart-merges user edits
 *   - Inline validation warnings (non-blocking)
 *   - App-theme CodeMirror styling
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { EditorView, lineNumbers, keymap, highlightActiveLine, drawSelection, dropCursor } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { html }           from '@codemirror/lang-html'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap }   from '@codemirror/search'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { autocompletion, completionKeymap } from '@codemirror/autocomplete'

// ── App-theme CodeMirror extension ────────────────────────────────────────────
// Mirrors the app's CSS variables: --bg-secondary, --bg-elevated, --accent-primary, etc.
// Hard-coded hex values because CodeMirror themes run outside React's CSS context.

const appTheme = EditorView.theme({
  '&': {
    backgroundColor:  '#1a1f1e',
    color:            '#d4d8d6',
    height:           '100%',
    fontSize:         '13px',
    fontFamily:       "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  '.cm-content': { caretColor: '#4CAF80', padding: '8px 0' },
  '.cm-cursor':  { borderLeftColor: '#4CAF80' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(76,175,128,0.2)',
  },
  '.cm-activeLine':       { backgroundColor: 'rgba(76,175,128,0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(76,175,128,0.08)' },
  '.cm-gutters': {
    backgroundColor: '#151a19',
    color:           '#4a5450',
    border:          'none',
    borderRight:     '1px solid #1e2724',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px', minWidth: '32px' },
  '.cm-foldGutter .cm-gutterElement':  { padding: '0 4px' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(76,175,128,0.25)', outline: 'none' },
  '.cm-tooltip': {
    backgroundColor: '#1e2724',
    border:          '1px solid #2a3330',
    color:           '#d4d8d6',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'rgba(76,175,128,0.2)',
    color:           '#d4d8d6',
  },
  // Syntax colours
  '.tok-comment':   { color: '#4a6050', fontStyle: 'italic' },
  '.tok-string':    { color: '#a8cc88' },
  '.tok-keyword':   { color: '#4CAF80' },
  '.tok-typeName':  { color: '#7dbfff' },
  '.tok-attributeName': { color: '#FF9C6B' },
  '.tok-attributeValue':{ color: '#a8cc88' },
  '.tok-number':    { color: '#d4a0ff' },
  '.tok-operator':  { color: '#4CAF80' },
  '.tok-punctuation':{ color: '#6a8070' },
  '.tok-tagName':   { color: '#7dbfff' },
  '.tok-angleBracket': { color: '#4a6050' },
  // data-zone highlight decoration
  '.cm-zone-highlight': {
    backgroundColor: 'rgba(76,175,128,0.18)',
    borderRadius:    '2px',
    outline:         '1px solid rgba(76,175,128,0.5)',
  },
}, { dark: true })

// ── CodeMirror extensions ─────────────────────────────────────────────────────

function buildExtensions() {
  return [
    lineNumbers(),
    foldGutter(),
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    highlightActiveLine(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    html({ matchClosingTags: true, autoCloseTags: true }),
    autocompletion({
      override: [
        // Suggest data-zone, data-type, data-hint when typing data-
        (ctx) => {
          const word = ctx.matchBefore(/data-\w*/)
          if (!word) return null
          return {
            from: word.from,
            options: [
              { label: 'data-zone',       type: 'property', info: 'Zone key for AI content injection' },
              { label: 'data-type',       type: 'property', info: 'text | number | chart | image | repeatable' },
              { label: 'data-hint',       type: 'property', info: 'Hint shown to the AI for this zone' },
              { label: 'data-repeatable', type: 'property', info: 'true — marks this block as repeatable' },
              { label: 'data-auto',       type: 'property', info: 'false — exclude from AI generation' },
            ]
          }
        }
      ]
    }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...searchKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
    appTheme,
    EditorView.lineWrapping,
  ]
}

// ── Zone line index ───────────────────────────────────────────────────────────
// Returns a map: zoneKey → { line (1-based), from, to (character offsets) }
function buildZoneLineIndex(doc) {
  const index = {}
  const text  = doc.toString()
  const re    = /data-zone="([^"]+)"/g
  let m
  while ((m = re.exec(text)) !== null) {
    const key  = m[1]
    const line = doc.lineAt(m.index)
    if (!index[key]) {
      index[key] = { lineNo: line.number, from: m.index, to: m.index + m[0].length }
    }
  }
  return index
}

// ── Inline validation ─────────────────────────────────────────────────────────
function validateHtml(html) {
  const warnings = []
  if (!/<section[\s>]/i.test(html)) {
    warnings.push({ rule: 'NO_SECTIONS', message: 'No <section> element found — wrap each slide in <section>' })
  }
  if (!(/data-zone="[^"]+"/).test(html)) {
    warnings.push({ rule: 'NO_ZONES', message: 'No data-zone attributes found — add data-zone="key" to content elements' })
  }
  // Duplicate zone keys
  const keys = [...html.matchAll(/data-zone="([^"]+)"/g)].map(m => m[1])
  const seen  = new Set()
  const dupes = new Set()
  keys.forEach(k => { if (seen.has(k)) dupes.add(k); seen.add(k) })
  dupes.forEach(k => warnings.push({ rule: 'DUPLICATE_KEY', message: `Duplicate zone key "${k}"` }))
  return warnings
}

// ── HtmlEditorPanel ───────────────────────────────────────────────────────────

export default function HtmlEditorPanel({
  uploadedHtml,       // the committed HTML (from last upload or last apply)
  onApply,            // (newHtml, newSelections) => void — called when user applies
  onClose,            // () => void — close the editor, return to zone review
}) {
  // ── Editor state ────────────────────────────────────────────────────────────
  const editorHostRef  = useRef(null)   // DOM node for CodeMirror mount
  const editorViewRef  = useRef(null)   // EditorView instance
  const iframeRef      = useRef(null)   // preview iframe element
  const [draftHtml,    setDraftHtml]    = useState(uploadedHtml)
  const [previewHtml,  setPreviewHtml]  = useState(uploadedHtml)
  const [warnings,     setWarnings]     = useState([])
  const [applying,     setApplying]     = useState(false)
  const [highlightedKey, setHighlightedKey] = useState(null)

  // ── Resizable divider ────────────────────────────────────────────────────────
  const [splitPct,   setSplitPct]   = useState(50)
  const dragging     = useRef(false)
  const containerRef = useRef(null)

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    const onMove = (ev) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct  = Math.min(80, Math.max(20, ((ev.clientX - rect.left) / rect.width) * 100))
      setSplitPct(pct)
    }
    const onUp = () => { dragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',  onUp)
  }, [])

  // ── Preview debounce ─────────────────────────────────────────────────────────
  const previewTimerRef = useRef(null)
  const schedulePreview = useCallback((html) => {
    clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => setPreviewHtml(html), 200)
  }, [])

  // ── Validation debounce ──────────────────────────────────────────────────────
  const validationTimerRef = useRef(null)
  const scheduleValidation = useCallback((html) => {
    clearTimeout(validationTimerRef.current)
    validationTimerRef.current = setTimeout(() => setWarnings(validateHtml(html)), 500)
  }, [])

  // ── postMessage listener (preview → editor cursor sync) ──────────────────────

  // Register a stable window message handler using the ref-forwarding pattern.
  // dispatchRef.current always points to the latest handler function, so
  // StrictMode double-invocation only registers/removes the outer stable wrapper
  // once — the inner logic always reads current state via refs and setters.
  const dispatchRef = useRef(null)
  dispatchRef.current = (e) => {
    if (e.data?.type === 'zone-hover') {
      const key = e.data.key || null
      setHighlightedKey(key)
      if (key && editorViewRef.current) {
        const idx   = buildZoneLineIndex(editorViewRef.current.state.doc)
        const entry = idx[key]
        if (entry) {
          editorViewRef.current.dispatch({
            selection: { anchor: entry.from },
            effects:   EditorView.scrollIntoView(entry.from, { y: 'center' }),
          })
        }
      }
    }
  }

  useEffect(() => {
    // Stable wrapper — always delegates to dispatchRef.current.
    // Registering this once means StrictMode cleanup/remount is harmless.
    const stableHandler = (e) => dispatchRef.current?.(e)
    window.addEventListener('message', stableHandler)
    return () => window.removeEventListener('message', stableHandler)
  }, [])

  // ── Preview scale — measured from the wrapper div via callback ref ───────────
  // The wrapper uses aspect-ratio:16/9 so its width drives the scale.
  const previewPaneRef = useRef(null)   // kept for the pane element reference
  const [previewScale, setPreviewScale] = useState(0.46)
  const previewRoRef   = useRef(null)
  const previewWrapperCallbackRef = useCallback((el) => {
    if (previewRoRef.current) { previewRoRef.current.disconnect(); previewRoRef.current = null }
    if (!el) return
    const measure = () => {
      const { width } = el.getBoundingClientRect()
      if (width > 0) setPreviewScale(width / 1280)
    }
    measure()
    previewRoRef.current = new ResizeObserver(measure)
    previewRoRef.current.observe(el)
  }, [])

  // ── Build preview srcDoc ──────────────────────────────────────────────────────
  // Wraps the first <section> in #solon-slide-shell (position:absolute; top:0;
  // left:0; transform-origin:top left) and injects a scale style so the 1280×720
  // slide fills the iframe viewport — same technique as the upload step preview.
  // Also injects zone-hover postMessage script and highlight CSS.
  const previewSrcDoc = useMemo(() => {
    if (!previewHtml) return ''

    const highlightCss = highlightedKey ? `
[data-zone="${highlightedKey}"] {
  outline: 3px solid var(--accent-primary, #4CAF80) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(76,175,128,0.4) !important;
  background: rgba(115,170,135,0.2) !important;
  position: relative !important;
  z-index: 9999 !important;
}` : ''

    const shellScale = previewScale < 1 ? previewScale : 0.46

    const injection = `<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: oklch(8% 0.015 160); display: block; }
#solon-slide-shell {
  position: absolute; top: 0; left: 0;
  width: 1280px; height: 720px;
  overflow: hidden; display: block;
  transform-origin: top left;
  transform: scale(${shellScale});
}
[data-zone], [data-label-for], [data-block] { outline: 1px dashed rgba(76,175,128,0.3); }
${highlightCss}
</style>
<script>
(function() {
  function notifyHover(key) { window.parent.postMessage({ type: 'zone-hover', key: key }, '*'); }
  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest('[data-zone]');
    notifyHover(el ? el.getAttribute('data-zone') : null);
  });
  document.addEventListener('mouseout', function(e) {
    if (!e.relatedTarget || !e.relatedTarget.closest('[data-zone]')) notifyHover(null);
  });
})();
</script>`

    // Wrap the first <section> in #solon-slide-shell if not already wrapped
    let html = previewHtml
    if (!html.includes('id="solon-slide-shell"')) {
      html = html.replace(/<section(\s|>)/i, '<div id="solon-slide-shell"><section$1')
      // Close the shell after the first </section>
      html = html.replace(/<\/section>/, '</section></div>')
    }

    return html.includes('</head>')
      ? html.replace('</head>', injection + '</head>')
      : injection + html
  }, [previewHtml, highlightedKey, previewScale])

  // ── Mount CodeMirror ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current) return

    const view = new EditorView({
      state: EditorState.create({
        doc:        uploadedHtml,
        extensions: [
          ...buildExtensions(),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return
            const html = update.state.doc.toString()
            setDraftHtml(html)
            schedulePreview(html)
            scheduleValidation(html)
            // Phase B: highlight zone under cursor
            const pos   = update.state.selection.main.head
            const line  = update.state.doc.lineAt(pos)
            const match = line.text.match(/data-zone="([^"]+)"/)
            setHighlightedKey(match ? match[1] : null)
          }),
          // Phase B: cursor movement (no doc change)
          EditorView.updateListener.of((update) => {
            if (update.docChanged) return
            if (!update.selectionSet) return
            const pos   = update.state.selection.main.head
            const line  = update.state.doc.lineAt(pos)
            const match = line.text.match(/data-zone="([^"]+)"/)
            setHighlightedKey(match ? match[1] : null)
          }),
        ],
      }),
      parent: editorHostRef.current,
    })
    editorViewRef.current = view

    // Initial validation
    setWarnings(validateHtml(uploadedHtml))

    return () => { view.destroy(); editorViewRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount once

  // ── Reset to uploaded ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (!editorViewRef.current) return
    editorViewRef.current.dispatch({
      changes: { from: 0, to: editorViewRef.current.state.doc.length, insert: uploadedHtml }
    })
    setDraftHtml(uploadedHtml)
    schedulePreview(uploadedHtml)
    setWarnings(validateHtml(uploadedHtml))
  }, [uploadedHtml, schedulePreview])

  // ── Apply changes ────────────────────────────────────────────────────────────
  const hasBlockingError = warnings.some(w => w.rule === 'NO_SECTIONS' || w.rule === 'NO_ZONES')
  const isDirty          = draftHtml !== uploadedHtml

  const handleApply = useCallback(async () => {
    if (hasBlockingError || applying) return
    setApplying(true)
    try {
      const res  = await fetch('/api/html-flow/upload-template', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ html: draftHtml, fileName: 'template.html' }),
      })
      const data = await res.json()
      // Fatal violations (NO_SECTIONS) block apply
      if (!res.ok || data.violations?.some(v => v.rule === 'NO_SECTIONS')) {
        if (data.violations?.length) setWarnings(data.violations)
        return
      }
      // Pass the new HTML and fresh selections (from the re-parsed template)
      // back to the parent. Non-fatal violations (NO_ZONES) are allowed through.
      onApply(draftHtml, data.selections ?? [])
    } catch (err) {
      setWarnings([{ rule: 'APPLY_ERROR', message: 'Apply failed: ' + err.message }])
    } finally {
      setApplying(false)
    }
  }, [draftHtml, hasBlockingError, applying, onApply])



  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="html-editor-overlay">
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="html-editor-header">
        <div className="html-editor-header-left">
          <button className="btn btn-link html-editor-close" onClick={onClose}>
            ← Back to zones
          </button>
          <span className="html-editor-title">Edit HTML</span>
          {isDirty && <span className="html-editor-dirty-badge">unsaved changes</span>}
        </div>
        <div className="html-editor-header-right">
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={!isDirty}
            title="Discard all edits and restore the uploaded file"
          >
            Reset
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={hasBlockingError || applying || !isDirty}
            title="Re-parse zones and apply changes to the project"
          >
            {applying ? 'Applying…' : 'Apply changes →'}
          </button>
        </div>
      </div>

      {/* ── Inline warnings ─────────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="html-editor-warnings">
          {warnings.map((w, i) => (
            <span key={i} className={`html-editor-warning${w.rule === 'DUPLICATE_KEY' ? '' : ' html-editor-warning--error'}`}>
              {w.rule === 'DUPLICATE_KEY' ? '⚠' : '✕'} {w.message}
            </span>
          ))}
        </div>
      )}

      {/* ── Split pane ──────────────────────────────────────────────────────── */}
      <div className="html-editor-split" ref={containerRef}>
        {/* Left: CodeMirror */}
        <div className="html-editor-pane html-editor-pane--code" style={{ width: splitPct + '%' }}>
          <div className="html-editor-pane-label">HTML source</div>
          <div className="html-editor-cm-host" ref={editorHostRef} />
        </div>

        {/* Divider */}
        <div
          className="html-editor-divider"
          onMouseDown={onDividerMouseDown}
          title="Drag to resize"
        >
          <div className="html-editor-divider-handle" />
        </div>

        {/* Right: Preview */}
        <div
          className="html-editor-pane html-editor-pane--preview"
          style={{ width: (100 - splitPct) + '%' }}
          ref={previewPaneRef}
        >
          <div className="html-editor-pane-label">
            Live preview
            {highlightedKey && (
              <span className="html-preview-highlight-label">
                · <code>{highlightedKey}</code>
              </span>
            )}
          </div>
          <div className="html-editor-preview-wrapper" ref={previewWrapperCallbackRef}>
            <iframe
              ref={iframeRef}
              className="html-preview-frame"
              srcDoc={previewSrcDoc}
              sandbox="allow-same-origin allow-scripts"
              title="Live preview"
            />
          </div>
          <p className="html-preview-note">
            Hover to highlight. Use the tree panel to assign zones.
          </p>
        </div>
      </div>
    </div>
  )
}