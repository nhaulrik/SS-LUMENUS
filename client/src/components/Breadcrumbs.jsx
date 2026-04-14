/**
 * Step-progress breadcrumb bar.
 *
 * Supports two flows via the `flow` prop:
 *   'pptx' (default) — Upload → Tag Elements → Recipe + JSON → Preview
 *   'html'           — Upload → Review Zones → Recipe + JSON → Preview
 *
 * Props:
 *   step          — current step string (e.g. 'html-upload', 'recipe')
 *   canNavigateTo — (stepName: string) => boolean
 *   navigateTo    — (stepName: string) => void
 *   flow          — 'pptx' | 'html'  (default: 'pptx')
 */

const FLOW_STEPS = {
  pptx: ['upload', 'tag', 'recipe', 'preview'],
  html: ['html-upload', 'html-recipe', 'html-preview'],
}

const FLOW_LABELS = {
  pptx: {
    upload:  'Upload',
    tag:     'Tag Elements',
    recipe:  'Recipe + JSON',
    preview: 'Preview',
  },
  html: {
    'html-upload':  'Template & Zones',
    'html-recipe':  'Recipe + JSON',
    'html-preview': 'Preview',
  },
}

export default function Breadcrumbs({ step, canNavigateTo, navigateTo, flow = 'pptx' }) {
  const steps   = FLOW_STEPS[flow]  ?? FLOW_STEPS.pptx
  const labels  = FLOW_LABELS[flow] ?? FLOW_LABELS.pptx
  const currIdx = steps.indexOf(step)

  return (
    <div className="breadcrumbs">
      {steps.map((s, idx) => {
        const isActive    = step === s
        const isCompleted = currIdx > idx
        const canNav      = canNavigateTo(s)

        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`breadcrumb-item${isActive ? ' active' : isCompleted ? ' completed' : ''}${canNav ? ' clickable' : ''}`}
              onClick={() => canNav && navigateTo(s)}
              role={canNav ? 'button' : undefined}
              aria-current={isActive ? 'step' : undefined}
              aria-label={labels[s]}
              tabIndex={canNav ? 0 : undefined}
              onKeyDown={e => e.key === 'Enter' && canNav && navigateTo(s)}
            >
              <span className="breadcrumb-number">{idx + 1}</span>
              <span>{labels[s]}</span>
            </div>
            {idx < steps.length - 1 && <span className="breadcrumb-divider" aria-hidden="true">›</span>}
          </div>
        )
      })}
    </div>
  )
}
