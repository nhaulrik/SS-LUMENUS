import { useState, useMemo, useEffect, useRef } from 'react'

/**
 * Debug context modal — shows a JSON snapshot of the current app state
 * so it can be copied and shared for remote debugging.
 *
 * Props:
 *   context  — the raw state object from App.jsx
 *   onClose  — dismiss callback
 */
export default function DebugContextModal({ context, onClose }) {
  const [copied,         setCopied]         = useState(false)
  const [includeHtml,    setIncludeHtml]    = useState(false)
  const [includeRecipe,  setIncludeRecipe]  = useState(true)
  const [includeOutput,  setIncludeOutput]  = useState(false)
  const firstFocusRef = useRef(null)

  // Focus first interactive element on mount; close on Escape
  useEffect(() => {
    firstFocusRef.current?.focus()
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const hasHtml    = !!(context?.uploadSession?.rawHtml)
  const hasRecipe  = !!(context?.recipe)
  const hasOutput  = !!(context?.applied?.outputHtml)

  const filtered = useMemo(() => {
    if (!context) return context
    const out = { ...context }

    // Strip or keep rawHtml inside uploadSession
    if (out.uploadSession) {
      const { rawHtml, ...rest } = out.uploadSession
      out.uploadSession = includeHtml && hasHtml ? { ...rest, rawHtml } : rest
    }

    // Strip or keep recipe
    if (!includeRecipe || !hasRecipe) {
      out.recipe = null
    }

    // Strip or keep output HTML inside applied
    if (out.applied) {
      const { outputHtml, ...rest } = out.applied
      out.applied = includeOutput && hasOutput ? { ...rest, outputHtml } : rest
    }

    return out
  }, [context, includeHtml, includeRecipe, includeOutput, hasHtml, hasRecipe, hasOutput])

  const json = useMemo(() => {
    try {
      return JSON.stringify(filtered, null, 2)
    } catch {
      return '{ "error": "Could not serialise state" }'
    }
  }, [filtered])

  const handleCopy = () => {
    const payload = '```json\n' + json + '\n```'
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const charCount = json.length

  return (
    <div className="modal-overlay" onClick={onClose} aria-hidden="true">
      <div
        className="modal-content debug-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debug-modal-title"
        onClick={e => e.stopPropagation()}
      >

        <div className="debug-modal-header">
          <div>
            <h3 className="debug-modal-title" id="debug-modal-title">Debug Context</h3>
            <p className="debug-modal-subtitle">
              Copy and paste into chat to share your current state for debugging.
              {' '}<span style={{ opacity: 0.6 }}>({charCount.toLocaleString()} chars)</span>
            </p>
          </div>
          <button
            ref={firstFocusRef}
            className={"btn btn-sm " + (copied ? 'btn-primary' : 'btn-secondary') + " debug-copy-btn"}
            onClick={handleCopy}
            aria-live="polite"
            aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* ── Include toggles ── */}
        <div className="debug-include-row">
          <label className={`debug-include-option${!hasHtml ? ' debug-include-option--disabled' : ''}`}>
            <input
              type="checkbox"
              checked={includeHtml && hasHtml}
              disabled={!hasHtml}
              onChange={e => setIncludeHtml(e.target.checked)}
            />
            <span>Raw HTML</span>
            {!hasHtml && <span className="debug-include-na">— not available</span>}
          </label>

          <label className={`debug-include-option${!hasRecipe ? ' debug-include-option--disabled' : ''}`}>
            <input
              type="checkbox"
              checked={includeRecipe && hasRecipe}
              disabled={!hasRecipe}
              onChange={e => setIncludeRecipe(e.target.checked)}
            />
            <span>Recipe</span>
            {!hasRecipe && <span className="debug-include-na">— not available</span>}
          </label>

          <label className={`debug-include-option${!hasOutput ? ' debug-include-option--disabled' : ''}`}>
            <input
              type="checkbox"
              checked={includeOutput && hasOutput}
              disabled={!hasOutput}
              onChange={e => setIncludeOutput(e.target.checked)}
            />
            <span>Output HTML</span>
            {!hasOutput && <span className="debug-include-na">— not available</span>}
          </label>
        </div>

        <pre className="debug-json">{json}</pre>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
