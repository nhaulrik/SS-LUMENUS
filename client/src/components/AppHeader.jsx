import { useState } from 'react'
import DebugContextModal from './DebugContextModal.jsx'

export default function AppHeader({ title, subtitle, debugContext }) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <header>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="header-actions">
          {debugContext && (
            <button
              className="debug-link"
              aria-label="Open debug context"
              onClick={() => setShowDebug(true)}
            >
              Debug
            </button>
          )}
          <a href="/docs.html" target="_blank" className="docs-link" aria-label="Open documentation">
            Docs
          </a>
        </div>
      </div>

      {showDebug && debugContext && (
        <DebugContextModal
          context={debugContext}
          onClose={() => setShowDebug(false)}
        />
      )}
    </header>
  )
}
