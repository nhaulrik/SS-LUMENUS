import { useState, useMemo } from 'react'

/**
 * Debug context modal -- shows a JSON snapshot of the current app state
 * so it can be copied and shared for remote debugging.
 *
 * Props:
 *   context  -- the raw state object from App.jsx
 *   onClose  -- dismiss callback
 */
export default function DebugContextModal({ context, onClose }) {
  const [copied, setCopied] = useState(false)

  const json = useMemo(() => {
    try {
      return JSON.stringify(context, null, 2)
    } catch {
      return '{ "error": "Could not serialise state" }'
    }
  }, [context])

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content debug-modal" onClick={e => e.stopPropagation()}>

        <div className="debug-modal-header">
          <div>
            <h3 className="debug-modal-title">Debug Context</h3>
            <p className="debug-modal-subtitle">
              Copy this JSON and share it to accelerate debugging.
            </p>
          </div>
          <button
            className={"btn btn-sm " + (copied ? 'btn-primary' : 'btn-secondary') + " debug-copy-btn"}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>

        <pre className="debug-json">{json}</pre>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
