import AppHeader from '../components/AppHeader.jsx'

export default function FlowSelectStep({ onSelectFlow, debugContext }) {
  return (
    <div className="app">
      <AppHeader
        title="Solon Slide Studio"
        subtitle="Choose how you want to work"
        debugContext={debugContext}
      />

      <div className="flow-select-container">
        <div className="flow-select-grid">

          {/* ── Visual Flow ───────────────────────────────────────── */}
          <button
            className="flow-card flow-card--visual"
            onClick={() => onSelectFlow('html')}
          >
            <div className="flow-card-icon">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="40" height="28" rx="3" fill="currentColor" opacity="0.15"/>
                <rect x="4" y="8" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2"/>
                <rect x="10" y="14" width="12" height="10" rx="2" fill="currentColor" opacity="0.5"/>
                <rect x="26" y="14" width="12" height="4" rx="1.5" fill="currentColor" opacity="0.6"/>
                <rect x="26" y="21" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.35"/>
                <rect x="10" y="28" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.25"/>
                <rect x="18" y="36" width="12" height="4" rx="2" fill="currentColor" opacity="0.4"/>
              </svg>
            </div>
            <div className="flow-card-body">
              <h2 className="flow-card-title">Visual</h2>
              <p className="flow-card-desc">
                Upload an HTML file you have designed.
                Output is a beautiful, presentation-ready <strong>PDF</strong>.
              </p>
              <ul className="flow-card-features">
                <li>Upload your own HTML template</li>
                <li>Define content zones visually</li>
                <li>Export pixel-perfect PDF</li>
              </ul>
              <div className="flow-card-best-for">
                Best for: polished decks, screen presentations, design-first workflows
              </div>
            </div>
            <div className="flow-card-cta">
              Select <span className="flow-card-arrow">→</span>
            </div>
          </button>

        </div>
      </div>
    </div>
  )
}
